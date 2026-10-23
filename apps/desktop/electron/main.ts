import { app, BrowserWindow, dialog, ipcMain, session } from 'electron';
import { delimiter, join } from 'node:path';
import { pathToFileURL, URL } from 'node:url';
import { Module } from 'node:module';
import { appendFileSync, existsSync, mkdirSync } from 'node:fs';
import { createDatabaseClient, openCareerStore, type CareerStore } from '@gerenciador/database';
import initialMigrationSql from '../../../packages/database/prisma/migrations/20261009000000_initial/migration.sql?raw';
import playerProvenanceMigrationSql from '../../../packages/database/prisma/migrations/20261014000000_player_original_provenance/migration.sql?raw';
import { registerCareerIpc } from './career-ipc';
import { registerCalendarImportIpc } from './calendar-import-ipc';
import { registerBackupIpc } from './backup-ipc';
import { handleTrustedIpc, trustMainRenderer } from './ipc-security';

const developmentOrigin = process.env['ELECTRON_RENDERER_URL'];
let databasePath = '';
let store: CareerStore | null = null;

const startupLogPath = join(app.getPath('userData'), 'startup.log');
function logStartup(message: string, error?: unknown): void {
  try {
    mkdirSync(app.getPath('userData'), { recursive: true });
    const details = error instanceof Error ? `${error.name}: ${error.message}\n${error.stack ?? ''}` : String(error ?? '');
    appendFileSync(startupLogPath, `${new Date().toISOString()} ${message}${details ? `\n${details}` : ''}\n`, 'utf8');
  } catch { /* startup logging must never mask the original error */ }
}

function showStartupFailure(error: unknown): void {
  logStartup('Fatal startup failure', error);
  const message = error instanceof Error ? error.message : String(error);
  void dialog.showMessageBox({
    type: 'error',
    title: 'Gerenciador EA FC 27 — falha ao iniciar',
    message: 'O aplicativo não conseguiu iniciar.',
    detail: `${message}\n\nLog: ${startupLogPath}`,
  });
}

function configurePrismaRuntime(): void {
  if (!app.isPackaged) return;
  const clientPath = join(process.resourcesPath, 'prisma-client');
  const enginePath = join(clientPath, 'query_engine-windows.dll.node');
  const clientEntry = join(clientPath, 'index.js');
  const runtimePackagePath = join(process.resourcesPath, 'prisma-runtime');
  const runtimeLibrary = join(runtimePackagePath, '@prisma', 'client', 'runtime', 'library.js');
  if (!existsSync(enginePath)) throw new Error(`Packaged Prisma query engine is missing: ${enginePath}`);
  if (!existsSync(clientEntry)) throw new Error(`Packaged Prisma client is missing: ${clientEntry}`);
  if (!existsSync(runtimeLibrary)) throw new Error(`Packaged Prisma runtime library is missing: ${runtimeLibrary}`);
  // electron-builder excludes nested node_modules from extraResources. Add the separately packaged
  // Prisma runtime root so createRequire in the database adapter can resolve @prisma/client/runtime.
  const currentNodePath = process.env['NODE_PATH'];
  process.env['NODE_PATH'] = currentNodePath ? `${runtimePackagePath}${delimiter}${currentNodePath}` : runtimePackagePath;
  (Module as unknown as { _initPaths: () => void })._initPaths();
  process.env['GERENCIADOR_PRISMA_CLIENT_PATH'] = clientEntry;
  process.env['PRISMA_QUERY_ENGINE_LIBRARY'] = enginePath;
}

function isTrustedRendererUrl(targetUrl: string): boolean {
  try {
    const target = new URL(targetUrl);
    if (developmentOrigin) {
      const expected = new URL(developmentOrigin);
      return target.origin === expected.origin;
    }
    const rendererPath = join(import.meta.dirname, '../renderer/index.html');
    const expectedUrl = pathToFileURL(rendererPath);
    return target.protocol === 'file:' && target.href === expectedUrl.href;
  } catch {
    return false;
  }
}

function applyContentSecurityPolicy(): void {
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    const scriptPolicy = developmentOrigin
      ? "'self' 'unsafe-inline' http://localhost:*"
      : "'self'";
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [
          `default-src 'self'; script-src ${scriptPolicy}; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'${developmentOrigin ? ' ws://localhost:* http://localhost:*' : ''}; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'none'`,
        ],
      },
    });
  });
}

/** The application database lives in userData, never next to a game save. */
async function openApplicationDatabase(): Promise<CareerStore> {
  databasePath = join(app.getPath('userData'), 'gerenciador.db');
  console.info(`[career] application database: ${databasePath}`);
  await applyInitialMigrationIfNeeded(databasePath);
  await applyPlayerProvenanceMigrationIfNeeded(databasePath);
  return openCareerStore(databasePath);
}

/** Apply the versioned initial migration only when the app's own database is empty. */
async function applyPlayerProvenanceMigrationIfNeeded(path: string): Promise<void> {
  const client = createDatabaseClient({ databaseUrl: `file:${path}` });
  try {
    await client.$connect();
    const columns = await client.$queryRawUnsafe<{ name: string }[]>("PRAGMA table_info('Player')");
    if (columns.some((column) => column.name === 'originalProvenanceKind')) return;
    const statements = playerProvenanceMigrationSql.split(';').map((part) => part.trim()).filter(Boolean);
    await client.$transaction(async (tx) => {
      for (const statement of statements) await tx.$executeRawUnsafe(statement);
    });
  } finally {
    await client.$disconnect();
  }
}

async function applyInitialMigrationIfNeeded(path: string): Promise<void> {
  const client = createDatabaseClient({ databaseUrl: `file:${path}` });
  try {
    await client.$connect();
    const tables = await client.$queryRawUnsafe<{ name: string }[]>(
      "SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'Career'",
    );
    if (tables.length > 0) return;
    const statements = initialMigrationSql
      .replace(/^--.*$/gm, '')
      .split(';')
      .map((part) => part.trim())
      .filter(Boolean);
    await client.$transaction(async (tx) => {
      for (const statement of statements) await tx.$executeRawUnsafe(statement);
    });
  } finally {
    await client.$disconnect();
  }
}

async function createMainWindow(): Promise<void> {
  const mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 960,
    minHeight: 640,
    show: false,
    webPreferences: {
      preload: join(import.meta.dirname, '../preload/preload.js'),
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false,
      webSecurity: true,
      webviewTag: false,
    },
  });

  mainWindow.webContents.once('did-finish-load', () => {
    trustMainRenderer(mainWindow.webContents.id, mainWindow.webContents.getURL());
  });
  mainWindow.webContents.on('will-navigate', (event, targetUrl) => {
    if (!isTrustedRendererUrl(targetUrl)) event.preventDefault();
  });
  mainWindow.webContents.on('did-start-navigation', (_event, _url, isInPlace, isMainFrame) => {
    if (isMainFrame && !isInPlace) trustMainRenderer(mainWindow.webContents.id, '');
  });
  mainWindow.once('ready-to-show', () => mainWindow.show());
  mainWindow.webContents.on('preload-error', (_event, preloadPath, error) => {
    logStartup(`Preload failed to load (${preloadPath})`, error);
  });
  mainWindow.webContents.on('did-fail-load', (_event, errorCode, errorDescription, validatedURL) => {
    logStartup(`Renderer failed to load (${errorCode}): ${errorDescription}; URL=${validatedURL}`);
  });
  mainWindow.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  if (developmentOrigin) await mainWindow.loadURL(developmentOrigin);
  else await mainWindow.loadFile(join(import.meta.dirname, '../renderer/index.html'));
}

app.on('render-process-gone', (_event, webContents, details) => {
  logStartup(`Renderer exited (${details.reason}, code ${details.exitCode})`, new Error(webContents.getURL()));
});
app.on('child-process-gone', (_event, details) => logStartup(`Child process exited (${details.type}, ${details.reason}, code ${details.exitCode})`));
process.on('uncaughtException', (error) => logStartup('Uncaught main-process exception', error));
process.on('unhandledRejection', (reason) => logStartup('Unhandled main-process rejection', reason));

app.whenReady().then(async () => {
  logStartup('Application ready; initializing packaged runtime');
  try {
    configurePrismaRuntime();
    applyContentSecurityPolicy();
    store = await openApplicationDatabase();
    logStartup('Database opened successfully');
    registerCareerIpc(store);
    registerCalendarImportIpc(store);
    const appVersion = app.getVersion();
    ipcMain.removeHandler('app:version');
    handleTrustedIpc('app:version', () => appVersion);
    registerBackupIpc({
      databasePath,
      getStore: () => {
        if (!store) throw new Error('Career store is not ready.');
        return store;
      },
      setStore: (nextStore) => { store = nextStore; },
    });
    await createMainWindow();
    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) void createMainWindow();
    });
  } catch (error) {
    showStartupFailure(error);
  }
});

app.on('before-quit', () => { void store?.close(); });
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
