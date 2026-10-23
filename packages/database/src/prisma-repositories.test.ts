import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { currencyCode } from '@gerenciador/domain';
import { createDatabaseClient } from './prisma-client';
import {
  PrismaCareerRepository,
  PrismaClubRepository,
  PrismaFinanceEntryRepository,
  PrismaFixtureRepository,
  PrismaPlayerRepository,
} from './prisma-repositories';

const clients: ReturnType<typeof createDatabaseClient>[] = [];
const scratchDir = mkdtempSync(join(tmpdir(), 'gerenciador-db-test-'));
const normalizedCwd = process.cwd().split(String.fromCharCode(92)).join('/').toLowerCase();
const projectRoot = normalizedCwd.endsWith('/packages/database') ? join(process.cwd(), '../..') : process.cwd();
const migrationPath = join(projectRoot, 'packages/database/prisma/migrations/20261009000000_initial/migration.sql');
const provenanceMigrationPath = join(projectRoot, 'packages/database/prisma/migrations/20261014000000_player_original_provenance/migration.sql');
const migrationSql = [migrationPath, provenanceMigrationPath]
  .map((path) => readFileSync(path, 'utf8').replace(/^--.*$/gm, ''))
  .join('\n');

function database(name: string) {
  const client = createDatabaseClient({ databaseUrl: `file:${join(scratchDir, name)}` });
  clients.push(client);
  return client;
}

beforeAll(async () => {
  const setup = database('migration-check.db');
  await setup.$connect();
  await setup.$executeRawUnsafe('PRAGMA foreign_keys=OFF');
  for (const statement of migrationSql.split(';').map((part) => part.trim()).filter(Boolean)) {
    await setup.$executeRawUnsafe(statement);
  }
  const violations = await setup.$queryRawUnsafe<readonly unknown[]>('PRAGMA foreign_key_check');
  expect(violations).toHaveLength(0);
});

afterEach(async () => {
  const setup = clients[0];
  await Promise.all(clients.slice(1).map((client) => client.$disconnect()));
  clients.splice(1);
  if (setup) {
    await setup.$executeRawUnsafe('UPDATE "Career" SET "controlledClubId" = NULL');
    await setup.$executeRawUnsafe('DELETE FROM "FinanceEntry"');
    await setup.$executeRawUnsafe('DELETE FROM "Fixture"');
    await setup.$executeRawUnsafe('DELETE FROM "Player"');
    await setup.$executeRawUnsafe('DELETE FROM "Club"');
    await setup.$executeRawUnsafe('DELETE FROM "Career"');
  }
});

afterAll(async () => {
  await Promise.all(clients.splice(0).map((client) => client.$disconnect()));
  rmSync(scratchDir, { recursive: true, force: true });
});

describe('Prisma repositories against temporary SQLite', () => {
  it('persists and reloads career, club, player, fixture and ledger entries', async () => {
    const prisma = clients[0];
    if (!prisma) throw new Error('SQLite test database was not initialized.');
    const careers = new PrismaCareerRepository(prisma);
    const clubs = new PrismaClubRepository(prisma);
    const players = new PrismaPlayerRepository(prisma);
    const fixtures = new PrismaFixtureRepository(prisma);
    const finances = new PrismaFinanceEntryRepository(prisma);
    const now = '2026-10-09T12:00:00.000Z';

    await careers.save({ id: 'career-1', name: 'Career', currentSeason: '2026/27', controlledClubId: null, randomSeed: 'seed', createdAt: now });
    await clubs.save({ id: 'club-1', careerId: 'career-1', name: 'Northside', countryCode: 'GB', competitionId: 'league-1', reputation: 60, createdAt: now });
    await clubs.save({ id: 'club-2', careerId: 'career-1', name: 'Southside', countryCode: 'GB', competitionId: 'league-1', reputation: 55, createdAt: now });
    await careers.save({ id: 'career-1', name: 'Career', currentSeason: '2026/27', controlledClubId: 'club-1', randomSeed: 'seed', createdAt: now });
    await players.save({
      id: 'player-1', careerId: 'career-1', currentClubId: 'club-1', name: 'Alex Forward',
      birthDate: '2004-03-12', overall: 75, potential: 88, heightCm: 180, weightKg: 75,
      provenanceKind: 'USER_ENTERED', provenanceSource: 'manual', provenanceRecordedAt: now,
      originalProvenanceKind: null, originalProvenanceSource: null, originalProvenanceRecordedAt: null,
    });
    await fixtures.save({
      id: 'fixture-1', careerId: 'career-1', competitionId: 'league-1', season: '2026/27',
      homeClubId: 'club-1', awayClubId: 'club-2', kickoffAt: now, timeZone: 'Europe/London',
      status: 'COMPLETED', homeScore: 2, awayScore: 0, provenanceKind: 'USER_ENTERED',
      provenanceSource: 'manual', provenanceRecordedAt: now,
    });
    await finances.save({
      id: 'finance-1', careerId: 'career-1', clubId: 'club-1', direction: 'INCOME',
      category: 'ticketing', amount: { minorUnits: 250000n, currency: currencyCode('GBP') }, occurredAt: now,
      reference: 'match-1', provenance: { kind: 'USER_ENTERED', source: 'manual', recordedAt: now },
    });

    expect((await careers.findById('career-1'))?.controlledClubId).toBe('club-1');
    expect((await careers.findByName('Career'))?.id).toBe('career-1');
    expect((await clubs.listByCareer('career-1')).map((club) => club.id)).toEqual(['club-1', 'club-2']);
    expect((await players.findById('player-1'))?.overall).toBe(75);
    expect((await fixtures.listByCareer('career-1'))[0]?.homeScore).toBe(2);
    expect((await finances.listByClub('club-1'))[0]?.amount.minorUnits).toBe(250000n);
  });
});
