import { createHash, randomUUID } from 'node:crypto';
import { copyFile, mkdir, readFile, rename, rm, stat, writeFile } from 'node:fs/promises';
import { dirname, isAbsolute, resolve } from 'node:path';
import { createDatabaseClient } from './prisma-client';

export const BACKUP_FORMAT = 'gerenciador-sqlite-backup';
export const BACKUP_FORMAT_VERSION = 1;
const MANIFEST_SUFFIX = '.manifest.json';

export interface BackupManifest {
  readonly format: typeof BACKUP_FORMAT;
  readonly version: typeof BACKUP_FORMAT_VERSION;
  readonly createdAt: string;
  readonly sha256: string;
  readonly fileName: string;
  readonly sizeBytes: number;
}

export interface BackupResult {
  readonly backupPath: string;
  readonly manifestPath: string;
  readonly manifest: BackupManifest;
}

export interface RestoreResult {
  readonly restoredFrom: string;
  readonly previousDatabasePreserved: boolean;
}

export interface InspectedBackup extends BackupManifest {
  readonly backupPath: string;
}

/**
 * Creates a consistent SQLite snapshot using VACUUM INTO (not a raw copy of a live database).
 * The backup file and sidecar manifest are created exclusively; existing destinations are never
 * overwritten. This is for the application's own database only, never an EA FC save.
 */
export async function createDatabaseBackup(input: {
  readonly databasePath: string;
  readonly backupPath: string;
  readonly now?: () => Date;
}): Promise<BackupResult> {
  const databasePath = requireAbsolute(input.databasePath, 'databasePath');
  const backupPath = requireAbsolute(input.backupPath, 'backupPath');
  if (samePath(databasePath, backupPath)) throw new RangeError('Backup path must differ from the live database path.');
  const manifestPath = `${backupPath}${MANIFEST_SUFFIX}`;
  await mkdir(dirname(backupPath), { recursive: true });
  await assertMissing(backupPath);
  await assertMissing(manifestPath);

  const client = createDatabaseClient({ databaseUrl: `file:${databasePath}` });
  try {
    await client.$connect();
    const escaped = backupPath.replace(/'/g, "''");
    await client.$executeRawUnsafe(`VACUUM INTO '${escaped}'`);
  } finally {
    await client.$disconnect();
  }

  try {
    const backupStat = await stat(backupPath);
    const manifest: BackupManifest = Object.freeze({
      format: BACKUP_FORMAT,
      version: BACKUP_FORMAT_VERSION,
      createdAt: (input.now ?? (() => new Date()))().toISOString(),
      sha256: await sha256File(backupPath),
      fileName: backupPath.split(/[\\/]/).pop() ?? 'backup.db',
      sizeBytes: backupStat.size,
    });
    await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, { flag: 'wx' });
    return Object.freeze({ backupPath, manifestPath, manifest });
  } catch (error) {
    await rm(backupPath, { force: true });
    await rm(manifestPath, { force: true });
    throw error;
  }
}

/**
 * Restores a verified backup to the application's database file. Requires explicit confirmation and
 * a callback that closes every live connection first. The current DB is atomically renamed to a
 * rollback file and retained if restore succeeds; on failure it is restored to its original path.
 */
export async function inspectDatabaseBackup(backupPathInput: string): Promise<InspectedBackup> {
  const backupPath = requireAbsolute(backupPathInput, 'backupPath');
  const manifest = parseManifest(await readFile(`${backupPath}${MANIFEST_SUFFIX}`, 'utf8'));
  const backupStat = await stat(backupPath);
  if (backupStat.size !== manifest.sizeBytes || await sha256File(backupPath) !== manifest.sha256) {
    throw new Error('Backup integrity check failed: size or SHA-256 checksum does not match.');
  }
  await validateSqliteDatabase(backupPath);
  return Object.freeze({ ...manifest, backupPath });
}

export async function restoreDatabaseBackup(input: {
  readonly backupPath: string;
  readonly databasePath: string;
  readonly confirmed: boolean;
  readonly closeCurrentConnections: () => Promise<void>;
}): Promise<RestoreResult> {
  if (input.confirmed !== true) throw new Error('Restore requires explicit confirmation.');
  const backupPath = requireAbsolute(input.backupPath, 'backupPath');
  const databasePath = requireAbsolute(input.databasePath, 'databasePath');
  if (samePath(backupPath, databasePath)) throw new RangeError('Backup path must differ from the live database path.');

  await inspectDatabaseBackup(backupPath);

  const directory = dirname(databasePath);
  await mkdir(directory, { recursive: true });
  const token = randomUUID();
  const stagedPath = `${databasePath}.restore-${token}.tmp`;
  const rollbackPath = `${databasePath}.pre-restore-${token}.bak`;
  await copyFile(backupPath, stagedPath);
  try {
    await validateSqliteDatabase(stagedPath);
    await input.closeCurrentConnections();
    await removeSqliteSidecars(databasePath);

    let movedCurrent = false;
    try {
      await rename(databasePath, rollbackPath);
      movedCurrent = true;
      await rename(stagedPath, databasePath);
    } catch (error) {
      if (movedCurrent) await rename(rollbackPath, databasePath);
      throw error;
    }
    return Object.freeze({ restoredFrom: backupPath, previousDatabasePreserved: movedCurrent });
  } catch (error) {
    await rm(stagedPath, { force: true });
    throw error;
  }
}

function parseManifest(text: string): BackupManifest {
  let value: unknown;
  try {
    value = JSON.parse(text) as unknown;
  } catch {
    throw new Error('Backup manifest is invalid JSON.');
  }
  if (typeof value !== 'object' || value === null || Array.isArray(value)) throw new Error('Backup manifest is invalid.');
  const record = value as Record<string, unknown>;
  if (record['format'] !== BACKUP_FORMAT || record['version'] !== BACKUP_FORMAT_VERSION ||
      typeof record['createdAt'] !== 'string' || !Number.isFinite(Date.parse(record['createdAt'])) ||
      typeof record['sha256'] !== 'string' || !/^[a-f0-9]{64}$/.test(record['sha256']) ||
      typeof record['fileName'] !== 'string' || typeof record['sizeBytes'] !== 'number' ||
      !Number.isSafeInteger(record['sizeBytes']) || record['sizeBytes'] <= 0) {
    throw new Error('Backup manifest fields are invalid or unsupported.');
  }
  return record as unknown as BackupManifest;
}

async function validateSqliteDatabase(path: string): Promise<void> {
  const client = createDatabaseClient({ databaseUrl: `file:${path}` });
  try {
    await client.$connect();
    const check = await client.$queryRawUnsafe<{ integrity_check: string }[]>('PRAGMA integrity_check');
    if (check.length !== 1 || check[0]?.integrity_check !== 'ok') throw new Error('SQLite integrity check failed.');
    const careerTable = await client.$queryRawUnsafe<{ name: string }[]>(
      "SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'Career'",
    );
    if (careerTable.length !== 1) throw new Error('Database does not contain the expected Career table.');
  } finally {
    await client.$disconnect();
  }
}

async function removeSqliteSidecars(databasePath: string): Promise<void> {
  await rm(`${databasePath}-wal`, { force: true });
  await rm(`${databasePath}-shm`, { force: true });
}

async function assertMissing(path: string): Promise<void> {
  try {
    await stat(path);
    throw new Error(`Refusing to overwrite existing file: ${path}`);
  } catch (error) {
    if (isNodeError(error) && error.code === 'ENOENT') return;
    throw error;
  }
}

function requireAbsolute(path: string, label: string): string {
  if (typeof path !== 'string' || path.trim() === '' || !isAbsolute(path)) {
    throw new RangeError(`${label} must be an absolute path.`);
  }
  return resolve(path);
}

function samePath(left: string, right: string): boolean {
  return resolve(left).toLocaleLowerCase() === resolve(right).toLocaleLowerCase();
}

async function sha256File(path: string): Promise<string> {
  const bytes = await readFile(path);
  return createHash('sha256').update(bytes).digest('hex');
}

function isNodeError(error: unknown): error is Error & { readonly code?: string } {
  return error instanceof Error && 'code' in error;
}
