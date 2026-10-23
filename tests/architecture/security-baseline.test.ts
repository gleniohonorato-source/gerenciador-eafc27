import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const projectRoot = resolve(import.meta.dirname, '../..');
const mainSource = readFileSync(resolve(projectRoot, 'apps/desktop/electron/main.ts'), 'utf8');
const calendarImportIpcSource = readFileSync(resolve(projectRoot, 'apps/desktop/electron/calendar-import-ipc.ts'), 'utf8');
const careerIpcSource = readFileSync(resolve(projectRoot, 'apps/desktop/electron/career-ipc.ts'), 'utf8');
const preloadSource = readFileSync(resolve(projectRoot, 'apps/desktop/electron/preload.ts'), 'utf8');

describe('Phase 1 Electron security baseline', () => {
  it('keeps renderer isolation and sandbox enabled', () => {
    expect(mainSource).toContain('contextIsolation: true');
    expect(mainSource).toContain('sandbox: true');
    expect(mainSource).toContain('nodeIntegration: false');
  });

  it('blocks new windows and untrusted top-level navigation', () => {
    expect(mainSource).toContain('setWindowOpenHandler');
    expect(mainSource).toContain('will-navigate');
    expect(mainSource).toContain("action: 'deny'");
  });

  it('exposes no privileged bridge methods in the preload', () => {
    expect(preloadSource).toContain('bridgeVersion: 3');
    expect(preloadSource).not.toContain('readFile');
    expect(preloadSource).not.toContain('writeFile');
  });

  it('applies additive player provenance migration to the existing app database', () => {
    expect(mainSource).toContain('applyPlayerProvenanceMigrationIfNeeded(databasePath)');
    expect(mainSource).toContain("PRAGMA table_info('Player')");
    expect(mainSource).toContain('playerProvenanceMigrationSql');
  });

  it('reads calendar files only through the main-process picker and enforces bounded input', () => {
    expect(calendarImportIpcSource).toContain("dialog.showOpenDialog");
    expect(calendarImportIpcSource).toContain("open(selectedPath, 'r')");
    expect(calendarImportIpcSource).toContain('MAX_IMPORT_BYTES');
    expect(calendarImportIpcSource).toContain("new TextDecoder('utf-8', { fatal: true })");
    expect(calendarImportIpcSource).not.toMatch(/fetch\s*\(|https?:\/\//i);
    expect(calendarImportIpcSource).not.toMatch(/readFileSync|writeFile|child_process|\.exe/i);
  });

  it('validates player edits in main, rejects unknown profile fields, and scopes updates to the career', () => {
    expect(careerIpcSource).toContain("'squad:update'");
    expect(careerIpcSource).toContain("assertExactKeys(rawProfile, ['name', 'birthDate', 'overall', 'potential', 'heightCm', 'weightKg'])");
    expect(careerIpcSource).toContain('requireOptionalInteger');
    expect(careerIpcSource).toContain('requireOptionalDate');
    expect(careerIpcSource).toContain('updatePlayerProfile(store.prisma, careerId, playerId, profile)');
  });

  it('exposes only the approved fixed IPC channel wrappers including player updates and calendar import', () => {
    // The renderer must not receive the raw ipcRenderer object or choose the channel name.
    expect(preloadSource).not.toMatch(/exposeInMainWorld\([^,]+,\s*ipcRenderer\b/);
    expect(preloadSource).not.toMatch(/ipcRenderer\.invoke\(\s*[a-zA-Z_]+\s*[,)]/);
    const channels = [...preloadSource.matchAll(/ipcRenderer\.invoke\('([^']+)'/g)].map((match) => match[1]);
    expect(channels.sort()).toEqual([
      'app:version', 'backup:confirm-restore', 'backup:create', 'backup:select-restore',
      'calendar:cancel-import', 'calendar:confirm-import', 'calendar:list', 'calendar:preview-import',
      'calendar:select-import-file', 'career:create', 'career:list', 'career:open', 'squad:list', 'squad:update',
    ]);
  });
});
