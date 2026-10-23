import { app, dialog, ipcMain } from 'electron';
import { randomUUID } from 'node:crypto';
import { open } from 'node:fs/promises';
import { basename, extname } from 'node:path';
import {
  confirmCalendarImport as confirmCalendarImportUseCase,
  previewCalendarImport as previewCalendarImportUseCase,
  type CalendarImportPreview,
} from '@gerenciador/application';
import { createCareerImportRepositories, type CareerStore } from '@gerenciador/database';
import { Buffer as NodeBuffer } from 'node:buffer';
import { TextDecoder } from 'node:util';

export const CALENDAR_IMPORT_CHANNELS = Object.freeze({
  selectFile: 'calendar:select-import-file',
  preview: 'calendar:preview-import',
  confirm: 'calendar:confirm-import',
  cancel: 'calendar:cancel-import',
} as const);

const pendingPreviews = new Map<string, { readonly preview: CalendarImportPreview; readonly expiresAt: number }>();
const selectedFiles = new Map<string, { readonly text: string; readonly fileName: string; readonly expiresAt: number }>();
const TOKEN_TTL_MS = 5 * 60 * 1000;
const MAX_PENDING = 8;
const MAX_IMPORT_BYTES = 5 * 1024 * 1024;

export function registerCalendarImportIpc(store: CareerStore): void {
  const repositories = createCareerImportRepositories(store.prisma);

  ipcMain.removeHandler(CALENDAR_IMPORT_CHANNELS.selectFile);
  ipcMain.handle(CALENDAR_IMPORT_CHANNELS.selectFile, async () => {
    const choice = await dialog.showOpenDialog({
      title: 'Selecionar calendário do Gerenciador',
      defaultPath: app.getPath('documents'),
      properties: ['openFile'],
      filters: [{ name: 'Arquivo de carreira do Gerenciador', extensions: ['json'] }],
    });
    const selectedPath = choice.filePaths[0];
    if (choice.canceled || !selectedPath) return { canceled: true as const };
    if (extname(selectedPath).toLowerCase() !== '.json') throw new TypeError('Selecione um arquivo JSON do Gerenciador.');

    const fileHandle = await open(selectedPath, 'r');
    let bytes: NodeBuffer;
    try {
      const fileInfo = await fileHandle.stat();
      if (!fileInfo.isFile()) throw new TypeError('O caminho selecionado não é um arquivo regular.');
      if (fileInfo.size > MAX_IMPORT_BYTES) throw new RangeError('O arquivo excede o limite de 5 MB.');
      const boundedBuffer = NodeBuffer.allocUnsafe(MAX_IMPORT_BYTES + 1);
      const { bytesRead } = await fileHandle.read(boundedBuffer, 0, boundedBuffer.byteLength, 0);
      if (bytesRead > MAX_IMPORT_BYTES) throw new RangeError('O arquivo excede o limite de 5 MB.');
      bytes = boundedBuffer.subarray(0, bytesRead);
    } finally {
      await fileHandle.close();
    }

    const text = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
    if (text.includes('\u0000')) throw new TypeError('O arquivo selecionado não é um JSON de texto válido.');
    const now = Date.now();
    pruneExpired(now);
    const fileName = basename(selectedPath).slice(0, 180);
    const token = randomUUID();
    selectedFiles.set(token, { text, fileName, expiresAt: now + TOKEN_TTL_MS });
    enforceCapacity(selectedFiles);
    return { canceled: false as const, token, fileName };
  });

  ipcMain.removeHandler(CALENDAR_IMPORT_CHANNELS.preview);
  ipcMain.handle(CALENDAR_IMPORT_CHANNELS.preview, async (_event, payload: unknown) => {
    const input = plainObject(payload);
    const selectionToken = input['selectionToken'];
    if (typeof selectionToken !== 'string') throw new TypeError('A selected file token is required.');
    const selected = selectedFiles.get(selectionToken);
    selectedFiles.delete(selectionToken);
    if (!selected || selected.expiresAt <= Date.now()) throw new Error('A seleção do arquivo expirou. Selecione-o novamente.');

    const preview = await previewCalendarImportUseCase(selected.text, selected.fileName, repositories);
    const token = randomUUID();
    const now = Date.now();
    pruneExpired(now);
    pendingPreviews.set(token, { preview, expiresAt: now + TOKEN_TTL_MS });
    enforceCapacity(pendingPreviews);
    return {
      token,
      fileName: preview.fileName,
      career: preview.career,
      counts: preview.counts,
      issues: preview.issues,
      conflicts: preview.conflicts,
      digest: preview.digest,
    };
  });

  ipcMain.removeHandler(CALENDAR_IMPORT_CHANNELS.confirm);
  ipcMain.handle(CALENDAR_IMPORT_CHANNELS.confirm, async (_event, payload: unknown) => {
    const input = plainObject(payload);
    const token = input['token'];
    const careerId = input['careerId'];
    if (typeof token !== 'string' || typeof careerId !== 'string' || input['confirmed'] !== true) {
      throw new TypeError('Import confirmation is invalid.');
    }
    const pending = pendingPreviews.get(token);
    pendingPreviews.delete(token);
    if (!pending || pending.expiresAt <= Date.now()) throw new Error('A prévia expirou. Selecione e revise o arquivo novamente.');
    if (pending.preview.career.id !== careerId) throw new Error('A carreira da prévia não corresponde à carreira selecionada.');
    if (pending.preview.conflicts.length > 0) throw new Error('Resolva os conflitos do arquivo antes de importar.');

    await confirmCalendarImportUseCase(pending.preview, {
      confirmed: true,
      expectedDigest: pending.preview.digest,
      careerId,
    }, repositories);

    const rows = await store.prisma.fixture.findMany({
      where: { careerId },
      orderBy: [{ kickoffAt: 'asc' }, { id: 'asc' }],
      include: { homeClub: { select: { name: true } }, awayClub: { select: { name: true } } },
    });
    return { fixtures: rows.map((row) => ({
      id: row.id,
      careerId: row.careerId,
      competitionId: row.competitionId,
      season: row.season,
      homeClubName: row.homeClub.name,
      awayClubName: row.awayClub.name,
      kickoffAt: row.kickoffAt.toISOString(),
      timeZone: row.timeZone,
      status: allowedFixtureStatus(row.status),
      homeScore: row.homeScore,
      awayScore: row.awayScore,
    })) };
  });

  ipcMain.removeHandler(CALENDAR_IMPORT_CHANNELS.cancel);
  ipcMain.handle(CALENDAR_IMPORT_CHANNELS.cancel, (_event, payload: unknown) => {
    const input = plainObject(payload);
    if (typeof input['token'] === 'string' && input['kind'] === 'selection') selectedFiles.delete(input['token']);
    if (typeof input['token'] === 'string' && input['kind'] === 'preview') pendingPreviews.delete(input['token']);
    return { canceled: true as const };
  });
}

function pruneExpired(now: number): void {
  for (const [token, entry] of selectedFiles) if (entry.expiresAt <= now) selectedFiles.delete(token);
  for (const [token, entry] of pendingPreviews) if (entry.expiresAt <= now) pendingPreviews.delete(token);
}

function enforceCapacity<T>(map: Map<string, T>): void {
  while (map.size > MAX_PENDING) {
    const oldest = map.keys().next().value as string | undefined;
    if (!oldest) return;
    map.delete(oldest);
  }
}

function plainObject(value: unknown): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) throw new TypeError('IPC payload must be a plain object.');
  return value as Record<string, unknown>;
}

function allowedFixtureStatus(value: string): 'SCHEDULED' | 'COMPLETED' | 'POSTPONED' | 'CANCELLED' {
  if (value === 'SCHEDULED' || value === 'COMPLETED' || value === 'POSTPONED' || value === 'CANCELLED') return value;
  return 'SCHEDULED';
}
