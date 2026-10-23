import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, afterEach, describe, expect, it } from 'vitest';
import { createCareer } from '@gerenciador/domain';
import { createDatabaseClient } from './prisma-client';
import { openCareerStore, type CareerStore } from './career-store';

const scratchDir = mkdtempSync(join(tmpdir(), 'gerenciador-store-test-'));
const normalizedCwd = process.cwd().split(String.fromCharCode(92)).join('/').toLowerCase();
const projectRoot = normalizedCwd.endsWith('/packages/database') ? join(process.cwd(), '../..') : process.cwd();
const migrationSql = [
  '20261009000000_initial/migration.sql',
  '20261014000000_player_original_provenance/migration.sql',
].map((migration) => readFileSync(
  join(projectRoot, 'packages/database/prisma/migrations', migration), 'utf8',
).replace(/^--.*$/gm, '')).join('\n');

const opened: CareerStore[] = [];

async function migrate(filePath: string): Promise<void> {
  const client = createDatabaseClient({ databaseUrl: `file:${filePath}` });
  await client.$connect();
  await client.$executeRawUnsafe('PRAGMA foreign_keys=OFF');
  for (const statement of migrationSql.split(';').map((part) => part.trim()).filter(Boolean)) {
    await client.$executeRawUnsafe(statement);
  }
  await client.$disconnect();
}

function fileIn(name: string): string {
  return join(scratchDir, name);
}

afterEach(async () => {
  await Promise.all(opened.splice(0).map((store) => store.close()));
});

describe('career store', () => {
  it('rejects a relative database path', async () => {
    await expect(openCareerStore('relative/app.db')).rejects.toThrow(/must be absolute/);
  });

  it('refuses to open a database that has not been migrated', async () => {
    const path = fileIn('not-migrated.db');
    await expect(openCareerStore(path)).rejects.toThrow(/not migrated/);
  });

  it('persists a career and reads it back through a new connection (reopen)', async () => {
    const path = fileIn('reopen.db');
    await migrate(path);

    const first = await openCareerStore(path);
    opened.push(first);
    const career = createCareer({
      id: 'career-reopen',
      name: 'Reabrir',
      currentSeason: '2026/27',
      controlledClubId: null,
      randomSeed: 'seed-1',
      createdAt: '2026-10-10T12:00:00.000Z',
    });
    await first.careers.save(career);
    await first.close();
    opened.splice(opened.indexOf(first), 1);

    const second = await openCareerStore(path);
    opened.push(second);
    expect(await second.careers.findById('career-reopen')).toEqual(career);
  });

});

afterAll(() => {
  rmSync(scratchDir, { recursive: true, force: true });
});
