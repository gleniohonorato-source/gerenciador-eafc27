import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, describe, expect, it, vi } from 'vitest';
import { createCareer } from '@gerenciador/domain';
import { createDatabaseClient } from './prisma-client';
import { createDatabaseBackup, restoreDatabaseBackup } from './backup-restore';

const scratchDir = mkdtempSync(join(tmpdir(), 'gerenciador-backup-test-'));
const normalizedCwd = process.cwd().split(String.fromCharCode(92)).join('/').toLowerCase();
const projectRoot = normalizedCwd.endsWith('/packages/database') ? join(process.cwd(), '../..') : process.cwd();
const migrationSql = [
  '20261009000000_initial/migration.sql',
  '20261014000000_player_original_provenance/migration.sql',
].map((migration) => readFileSync(
  join(projectRoot, 'packages/database/prisma/migrations', migration), 'utf8',
).replace(/^--.*$/gm, '')).join('\n');

async function migrate(path: string): Promise<void> {
  const client = createDatabaseClient({ databaseUrl: `file:${path}` });
  await client.$connect();
  await client.$executeRawUnsafe('PRAGMA foreign_keys=OFF');
  for (const statement of migrationSql.split(';').map((part) => part.trim()).filter(Boolean)) {
    await client.$executeRawUnsafe(statement);
  }
  await client.$disconnect();
}

async function addCareer(path: string, id: string, name: string): Promise<void> {
  const client = createDatabaseClient({ databaseUrl: `file:${path}` });
  await client.$connect();
  const career = createCareer({ id, name, currentSeason: '2026/27', controlledClubId: null, randomSeed: 'seed', createdAt: '2026-10-10T12:00:00.000Z' });
  await client.career.create({ data: { ...career, createdAt: new Date(career.createdAt) } });
  await client.$disconnect();
}

async function listCareerIds(path: string): Promise<string[]> {
  const client = createDatabaseClient({ databaseUrl: `file:${path}` });
  await client.$connect();
  const rows = await client.career.findMany({ orderBy: { id: 'asc' }, select: { id: true } });
  await client.$disconnect();
  return rows.map((row) => row.id);
}

afterAll(() => rmSync(scratchDir, { recursive: true, force: true }));

describe('database backup and restore', () => {
  it('creates a consistent versioned snapshot and checksum manifest', async () => {
    const db = join(scratchDir, 'backup-source.db');
    await migrate(db);
    await addCareer(db, 'career-one', 'One');
    const result = await createDatabaseBackup({ databasePath: db, backupPath: join(scratchDir, 'snapshot.db'), now: () => new Date('2026-10-10T12:00:00.000Z') });
    expect(result.manifest.version).toBe(1);
    expect(result.manifest.sha256).toMatch(/^[a-f0-9]{64}$/);
    expect(result.manifest.sizeBytes).toBeGreaterThan(0);
    expect(await listCareerIds(result.backupPath)).toEqual(['career-one']);
  });

  it('refuses to overwrite an existing backup file', async () => {
    const db = join(scratchDir, 'no-overwrite.db');
    const backup = join(scratchDir, 'existing-backup.db');
    await migrate(db);
    writeFileSync(backup, 'keep');
    await expect(createDatabaseBackup({ databasePath: db, backupPath: backup })).rejects.toThrow(/Refusing to overwrite/);
    expect(readFileSync(backup, 'utf8')).toBe('keep');
  });

  it('rejects corrupt backup data before touching the live database', async () => {
    const db = join(scratchDir, 'corrupt-live.db');
    await migrate(db);
    await addCareer(db, 'live', 'Live');
    const backup = await createDatabaseBackup({ databasePath: db, backupPath: join(scratchDir, 'corrupt-source.db') });
    writeFileSync(backup.backupPath, 'tampered');
    const close = vi.fn(async () => {});
    await expect(restoreDatabaseBackup({ backupPath: backup.backupPath, databasePath: db, confirmed: true, closeCurrentConnections: close })).rejects.toThrow(/integrity check failed/);
    expect(close).not.toHaveBeenCalled();
    expect(await listCareerIds(db)).toEqual(['live']);
  });

  it('requires explicit confirmation and a close-connection callback before restore', async () => {
    const db = join(scratchDir, 'confirm-live.db');
    await migrate(db);
    const backup = await createDatabaseBackup({ databasePath: db, backupPath: join(scratchDir, 'confirm-source.db') });
    const close = vi.fn(async () => {});
    await expect(restoreDatabaseBackup({ backupPath: backup.backupPath, databasePath: db, confirmed: false, closeCurrentConnections: close })).rejects.toThrow(/explicit confirmation/);
    expect(close).not.toHaveBeenCalled();
  });

  it('restores verified data while preserving the pre-restore database as a rollback file', async () => {
    const live = join(scratchDir, 'restore-live.db');
    const source = join(scratchDir, 'restore-source.db');
    await migrate(live);
    await addCareer(live, 'before', 'Before');
    await migrate(source);
    await addCareer(source, 'from-backup', 'From backup');
    const backup = await createDatabaseBackup({ databasePath: source, backupPath: join(scratchDir, 'restore-backup.db') });
    let closed = false;
    const result = await restoreDatabaseBackup({
      backupPath: backup.backupPath,
      databasePath: live,
      confirmed: true,
      closeCurrentConnections: async () => { closed = true; },
    });
    expect(closed).toBe(true);
    expect(result.previousDatabasePreserved).toBe(true);
    expect(await listCareerIds(live)).toEqual(['from-backup']);
    const rollbackFiles = (await import('node:fs')).readdirSync(scratchDir).filter((name) => name.startsWith('restore-live.db.pre-restore-'));
    expect(rollbackFiles).toHaveLength(1);
    expect(await listCareerIds(join(scratchDir, rollbackFiles[0]))).toEqual(['before']);
  });
});
