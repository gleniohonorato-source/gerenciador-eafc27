import { app, dialog, ipcMain } from 'electron';
import { basename, join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { handleTrustedIpc } from './ipc-security';
import { createDatabaseBackup, inspectDatabaseBackup, restoreDatabaseBackup, type CareerStore, openCareerStore } from '@gerenciador/database';

export const BACKUP_CHANNELS = Object.freeze({ create: 'backup:create', selectRestore: 'backup:select-restore', confirmRestore: 'backup:confirm-restore' });

const pendingRestores = new Map<string, { backupPath: string; manifest: Awaited<ReturnType<typeof inspectDatabaseBackup>> }>();

export function registerBackupIpc(input: {
  readonly databasePath: string;
  readonly getStore: () => CareerStore;
  readonly setStore: (store: CareerStore) => void;
}): void {
  ipcMain.removeHandler(BACKUP_CHANNELS.create);
  handleTrustedIpc(BACKUP_CHANNELS.create, async () => {
    const choice = await dialog.showSaveDialog({
      title: 'Salvar backup do Gerenciador',
      defaultPath: join(app.getPath('documents'), `gerenciador-backup-${new Date().toISOString().slice(0, 10)}.db`),
      filters: [{ name: 'Backup do Gerenciador', extensions: ['db'] }],
    });
    if (choice.canceled || !choice.filePath) return { canceled: true as const };
    const result = await createDatabaseBackup({ databasePath: input.databasePath, backupPath: choice.filePath });
    return { canceled: false as const, fileName: basename(result.backupPath), manifest: result.manifest };
  });

  ipcMain.removeHandler(BACKUP_CHANNELS.selectRestore);
  handleTrustedIpc(BACKUP_CHANNELS.selectRestore, async () => {
    const choice = await dialog.showOpenDialog({
      title: 'Selecionar backup do Gerenciador',
      properties: ['openFile'],
      filters: [{ name: 'Backup do Gerenciador', extensions: ['db'] }],
    });
    if (choice.canceled || !choice.filePaths[0]) return { canceled: true as const };
    const backupPath = choice.filePaths[0];
    const manifest = await inspectDatabaseBackup(backupPath);
    const token = randomUUID();
    pendingRestores.set(token, { backupPath, manifest });
    return { canceled: false as const, token, fileName: basename(backupPath), createdAt: manifest.createdAt, sizeBytes: manifest.sizeBytes };
  });

  ipcMain.removeHandler(BACKUP_CHANNELS.confirmRestore);
  handleTrustedIpc(BACKUP_CHANNELS.confirmRestore, async (_event, payload: unknown) => {
    if (!isRecord(payload) || typeof payload['token'] !== 'string' || payload['confirmed'] !== true) {
      throw new TypeError('Restore requires an explicit confirmation token.');
    }
    const pending = pendingRestores.get(payload['token']);
    if (!pending) throw new Error('Restore selection expired or was already used.');
    pendingRestores.delete(payload['token']);
    const currentStore = input.getStore();
    try {
      await restoreDatabaseBackup({
        backupPath: pending.backupPath,
        databasePath: input.databasePath,
        confirmed: true,
        closeCurrentConnections: () => currentStore.close(),
      });
    } catch (error) {
      // The restore may have closed the current client before failing; reconnect to whichever DB is live.
      input.setStore(await openCareerStore(input.databasePath));
      throw error;
    }
    input.setStore(await openCareerStore(input.databasePath));
    return { restored: true as const };
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
