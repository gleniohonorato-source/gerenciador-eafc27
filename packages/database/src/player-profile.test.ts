import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createCareer, createClub, createPlayer } from '@gerenciador/domain';
import { createDatabaseClient } from './prisma-client';
import { updatePlayerProfile } from './player-profile';

const scratch = mkdtempSync(join(tmpdir(), 'player-profile-'));
const dbPath = join(scratch, 'profile.db');
const client = createDatabaseClient({ databaseUrl: `file:${dbPath}` });
const cwd = process.cwd().split(String.fromCharCode(92)).join('/').toLowerCase();
const root = cwd.endsWith('/packages/database') ? join(process.cwd(), '../..') : process.cwd();
const migrations = [
  '20261009000000_initial/migration.sql',
  '20261014000000_player_original_provenance/migration.sql',
].map((migration) => readFileSync(join(root, 'packages/database/prisma/migrations', migration), 'utf8'));

beforeAll(async () => {
  await client.$connect();
  for (const sql of migrations) {
    for (const statement of sql.replace(/^--.*$/gm, '').split(';').map((part) => part.trim()).filter(Boolean)) {
      await client.$executeRawUnsafe(statement);
    }
  }
  const now = new Date('2026-10-15T12:00:00.000Z');
  await client.career.create({ data: { ...createCareer({ id: 'career-profile', name: 'Test Career', currentSeason: '2026/27', controlledClubId: null, randomSeed: 'seed', createdAt: now.toISOString() }), createdAt: now } });
  await client.club.create({ data: { ...createClub({ id: 'club-profile', careerId: 'career-profile', name: 'Test FC', countryCode: 'GB', competitionId: 'league', reputation: 40, createdAt: now.toISOString() }), createdAt: now } });
  const player = createPlayer({
    id: 'player-profile', careerId: 'career-profile', currentClubId: 'club-profile', name: 'Before Edit',
    birthDate: '2000-02-29', overall: 65, potential: 75, heightCm: 180, weightKg: 72,
    provenanceKind: 'IMPORTED_EXTERNAL', provenanceSource: 'test-source', provenanceRecordedAt: now.toISOString(),
  });
  await client.player.create({ data: { ...player, birthDate: new Date('2000-02-29T00:00:00.000Z'), provenanceRecordedAt: now } });
});

afterAll(async () => {
  await client.$disconnect();
  rmSync(scratch, { recursive: true, force: true });
});

describe('controlled player profile editing', () => {
  it('updates editable fields and preserves the first/original provenance across later edits', async () => {
    const firstNow = new Date('2026-10-16T10:00:00.000Z');
    await updatePlayerProfile(client, 'career-profile', 'player-profile', {
      name: 'First Edit', birthDate: '2001-03-01', overall: 70, potential: 81, heightCm: 181, weightKg: 73,
    }, firstNow);
    const first = await client.player.findUniqueOrThrow({ where: { id: 'player-profile' } });
    expect(first.name).toBe('First Edit');
    expect(first.provenanceKind).toBe('USER_ENTERED');
    expect(first.originalProvenanceKind).toBe('IMPORTED_EXTERNAL');
    expect(first.originalProvenanceSource).toBe('test-source');
    expect(first.originalProvenanceRecordedAt).toEqual(new Date('2026-10-15T12:00:00.000Z'));

    await updatePlayerProfile(client, 'career-profile', 'player-profile', {
      name: 'Second Edit', birthDate: '2001-03-01', overall: 71, potential: 82, heightCm: 181, weightKg: 73,
    }, new Date('2026-10-17T10:00:00.000Z'));
    const second = await client.player.findUniqueOrThrow({ where: { id: 'player-profile' } });
    expect(second.name).toBe('Second Edit');
    expect(second.originalProvenanceKind).toBe('IMPORTED_EXTERNAL');
    expect(second.originalProvenanceSource).toBe('test-source');
  });

  it('does not update a player outside the requested career', async () => {
    await expect(updatePlayerProfile(client, 'other-career', 'player-profile', {
      name: 'Unauthorized Career Edit', birthDate: null, overall: null, potential: null, heightCm: null, weightKg: null,
    })).rejects.toThrow(/não encontrado nesta carreira/);
    const player = await client.player.findUniqueOrThrow({ where: { id: 'player-profile' } });
    expect(player.name).toBe('Second Edit');
  });

  it('can be used within an existing transaction without losing the career boundary', async () => {
    const before = await client.player.findUniqueOrThrow({ where: { id: 'player-profile' } });
    await client.$transaction(async (transaction) => {
      await updatePlayerProfile(transaction, 'career-profile', 'player-profile', {
        name: 'Transaction Edit', birthDate: '2001-03-01', overall: 72, potential: 83, heightCm: 182, weightKg: 74,
      });
    });
    const after = await client.player.findUniqueOrThrow({ where: { id: 'player-profile' } });
    expect(after.name).toBe('Transaction Edit');
    expect(after.originalProvenanceSource).toBe(before.originalProvenanceSource);
  });

  it('validates profile values before persistence', async () => {
    const before = await client.player.findUniqueOrThrow({ where: { id: 'player-profile' } });
    await expect(updatePlayerProfile(client, 'career-profile', 'player-profile', {
      name: 'Invalid Rating', birthDate: '2001-03-01', overall: 101, potential: 82, heightCm: 181, weightKg: 73,
    })).rejects.toThrow();
    await expect(updatePlayerProfile(client, 'career-profile', 'player-profile', {
      name: 'Invalid Date', birthDate: '2001-02-29', overall: 71, potential: 82, heightCm: 181, weightKg: 73,
    })).rejects.toThrow();
    const player = await client.player.findUniqueOrThrow({ where: { id: 'player-profile' } });
    expect(player.name).toBe(before.name);
  });
});
