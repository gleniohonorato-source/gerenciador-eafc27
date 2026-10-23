import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { exportCareerPackage, previewCareerImport, confirmCareerImport, type CareerImportRepositories } from '@gerenciador/application';
import { createCareer, createClub } from '@gerenciador/domain';
import { createDatabaseClient } from './prisma-client';
import { createCareerImportRepositories } from './prisma-import-transaction';

const scratch = mkdtempSync(join(tmpdir(), 'career-import-tx-'));
const client = createDatabaseClient({ databaseUrl: `file:${join(scratch, 'career.db')}` });
const cwd = process.cwd().split(String.fromCharCode(92)).join('/').toLowerCase();
const root = cwd.endsWith('/packages/database') ? join(process.cwd(), '../..') : process.cwd();
const migrationPaths = [
  join(root, 'packages/database/prisma/migrations/20261009000000_initial/migration.sql'),
  join(root, 'packages/database/prisma/migrations/20261014000000_player_original_provenance/migration.sql'),
];
const migrationSql = migrationPaths.map((path) => readFileSync(path, 'utf8').replace(/^--.*$/gm, '')).join('\n');

beforeAll(async () => {
  await client.$connect();
  for (const statement of migrationSql.split(';').map((part) => part.trim()).filter(Boolean)) {
    await client.$executeRawUnsafe(statement);
  }
});

afterAll(async () => {
  await client.$disconnect();
  rmSync(scratch, { recursive: true, force: true });
});

describe('SQLite career import transaction', () => {
  it('commits a validated package atomically', async () => {
    const now = '2026-10-10T12:00:00.000Z';
    const career = createCareer({ id: 'import-career', name: 'Imported', currentSeason: '2026/27', controlledClubId: 'import-club', randomSeed: 'seed', createdAt: now });
    const club = createClub({ id: 'import-club', careerId: career.id, name: 'Imported FC', countryCode: 'GB', competitionId: 'league', reputation: 50, createdAt: now });
    const pkg = await exportCareerPackage({ career, clubs: [club], players: [], fixtures: [], exportedAt: now });
    const repositories = createCareerImportRepositories(client);
    const preview = await previewCareerImport(pkg.text, repositories);
    const result = await confirmCareerImport(preview, { confirmed: true, expectedDigest: preview.digest, importId: 'batch-1' }, repositories);
    expect(result.saved.clubs).toBe(1);
    expect(await repositories.career.findById(career.id)).toMatchObject({ name: 'Imported' });
    expect(await repositories.clubs.listByCareer(career.id)).toHaveLength(1);
  });

  it('rolls back all writes if a later repository write fails', async () => {
    const now = '2026-10-10T12:00:00.000Z';
    const career = createCareer({ id: 'rollback-career', name: 'Rollback', currentSeason: '2026/27', controlledClubId: 'rollback-club', randomSeed: 'seed', createdAt: now });
    const club = createClub({ id: 'rollback-club', careerId: career.id, name: 'Rollback FC', countryCode: 'GB', competitionId: 'league', reputation: 50, createdAt: now });
    const player = {
      id: 'rollback-player', careerId: career.id, currentClubId: 'rollback-club', name: 'Rollback Player',
      birthDate: null, overall: 60, potential: 70, heightCm: null, weightKg: null,
      provenanceKind: 'USER_ENTERED' as const, provenanceSource: 'test', provenanceRecordedAt: now,
    };
    const pkg = await exportCareerPackage({ career, clubs: [club], players: [player], fixtures: [], exportedAt: now });
    const repositories = createCareerImportRepositories(client);
    const preview = await previewCareerImport(pkg.text, repositories);
    type TransactionScope = Omit<CareerImportRepositories, 'transaction'>;
    const failingRepositories: CareerImportRepositories = {
      ...repositories,
      transaction: <T,>(operation: (scope: TransactionScope) => Promise<T>): Promise<T> =>
        repositories.transaction<T>(async (tx) => {
          const wrapped: TransactionScope = { ...tx, players: { ...tx.players, save: async () => { throw new Error('simulated storage failure'); } } };
          return operation(wrapped);
        }),
    };
    await expect(confirmCareerImport(preview, { confirmed: true, expectedDigest: preview.digest, importId: 'batch-fail' }, failingRepositories)).rejects.toThrow('simulated storage failure');
    expect(await repositories.career.findById(career.id)).toBeNull();
    expect(await repositories.clubs.listByCareer(career.id)).toHaveLength(0);
  });
});
