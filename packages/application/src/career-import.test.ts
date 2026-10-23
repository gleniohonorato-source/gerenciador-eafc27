import { describe, expect, it } from 'vitest';
import { createCareer, createClub, type Career, type Club, type Player } from '@gerenciador/domain';
import {
  CAREER_PACKAGE_FORMAT,
  CAREER_PACKAGE_VERSION,
  configureImportDigest,
  confirmCareerImport,
  exportCareerPackage,
  parseCareerPackageText,
  previewCareerImport,
  type CareerImportRepositories,
} from './career-import';

// Deterministic, non-cryptographic digest for tests only; production uses SHA-256 via the adapter.
configureImportDigest(async (value) => {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  return hash.toString(16).padStart(64, '0');
});

const stamp = '2026-10-10T12:00:00.000Z';
function packageValue() {
  const career = createCareer({ id: 'career-1', name: 'Career One', currentSeason: '2026/27', controlledClubId: 'club-1', randomSeed: 'seed-1', createdAt: stamp });
  const clubs = [
    createClub({ id: 'club-1', careerId: career.id, name: 'Northside', countryCode: 'GB', competitionId: 'league-1', reputation: 60, createdAt: stamp }),
    createClub({ id: 'club-2', careerId: career.id, name: 'Southside', countryCode: 'GB', competitionId: 'league-1', reputation: 55, createdAt: stamp }),
  ];
  const players = [{
    id: 'player-1', careerId: career.id, currentClubId: 'club-1', name: 'Alex Forward', birthDate: '2004-03-12',
    overall: 75, potential: 88, heightCm: 180, weightKg: 75, provenanceKind: 'USER_ENTERED' as const,
    provenanceSource: 'manual', provenanceRecordedAt: stamp,
  }];
  const fixtures = [{
    id: 'fixture-1', careerId: career.id, competitionId: 'league-1', season: '2026/27', homeClubId: 'club-1',
    awayClubId: 'club-2', kickoffAt: stamp, timeZone: 'Europe/London', status: 'SCHEDULED' as const,
    homeScore: null, awayScore: null, provenanceKind: null, provenanceSource: null, provenanceRecordedAt: null,
  }];
  return { career, clubs, players, fixtures, exportedAt: stamp };
}

function createFakeRepositories(existing: { career?: Career | null; clubs?: readonly Club[]; players?: readonly Player[] } = {}) {
  const saved = { careers: [] as Career[], clubs: [] as Club[], players: [] as Player[], fixtures: [] as unknown[], transactionCalls: 0 };
  const stores = { career: existing.career ?? null, clubs: [...(existing.clubs ?? [])], players: [...(existing.players ?? [])], fixtures: [] as import('@gerenciador/domain').Fixture[] };
  let repositories: CareerImportRepositories;
  repositories = {
    career: {
      findById: async (id) => stores.career?.id === id ? stores.career : null,
      save: async (item) => { saved.careers.push(item); stores.career = item; },
    },
    clubs: {
      listByCareer: async () => stores.clubs,
      save: async (item) => { saved.clubs.push(item); stores.clubs.push(item); },
    },
    players: {
      listByCareer: async () => stores.players,
      save: async (item) => { saved.players.push(item); stores.players.push(item); },
    },
    fixtures: {
      listByCareer: async () => stores.fixtures,
      save: async (item) => { saved.fixtures.push(item); stores.fixtures.push(item); },
    },
    transaction: async (operation) => { saved.transactionCalls += 1; return operation(repositories); },
  };
  return { repositories, saved };
}

describe('controlled career import/export', () => {
  it('exports and parses its own versioned package format', async () => {
    const pkg = packageValue();
    const exported = await exportCareerPackage(pkg);
    const parsed = parseCareerPackageText(exported.text);
    expect(parsed.format).toBe(CAREER_PACKAGE_FORMAT);
    expect(parsed.version).toBe(CAREER_PACKAGE_VERSION);
    expect(parsed.career.id).toBe(pkg.career.id);
    expect(parsed.players).toHaveLength(1);
    expect(exported.digest).toMatch(/^[0-9a-f]{64}$/);
  });

  it('rejects oversized, malformed, unsupported, duplicate and dangling data', () => {
    expect(() => parseCareerPackageText('{')).toThrow(/valid JSON/);
    expect(() => parseCareerPackageText(' '.repeat(5 * 1024 * 1024 + 1))).toThrow(/must not exceed/);
    expect(() => parseCareerPackageText(JSON.stringify({ format: 'other', version: 99 }))).toThrow(/not supported/);
    const pkg = packageValue();
    const duplicate = { ...pkg, clubs: [...pkg.clubs, pkg.clubs[0]] };
    expect(() => parseCareerPackageText(JSON.stringify({ format: CAREER_PACKAGE_FORMAT, version: 1, ...duplicate }))).toThrow(/duplicate club IDs/);
    const dangling = { ...pkg, players: [{ ...pkg.players[0], currentClubId: 'missing-club' }] };
    expect(() => parseCareerPackageText(JSON.stringify({ format: CAREER_PACKAGE_FORMAT, version: 1, exportedAt: pkg.exportedAt, career: pkg.career, clubs: pkg.clubs, players: dangling.players, fixtures: pkg.fixtures }))).toThrow(/references a missing club/);
  });

  it('previews a clean import and applies it only after explicit confirmation', async () => {
    const pkg = await exportCareerPackage(packageValue());
    const { repositories, saved } = createFakeRepositories();
    const preview = await previewCareerImport(pkg.text, repositories);
    expect(preview.conflicts).toHaveLength(0);
    expect(preview.counts).toEqual({ clubs: 2, players: 1, fixtures: 1 });
    await expect(confirmCareerImport(preview, { confirmed: false, expectedDigest: preview.digest, importId: 'import-1' }, repositories)).rejects.toThrow(/explicitly confirmed/);
    expect(saved.transactionCalls).toBe(0);
    await confirmCareerImport(preview, { confirmed: true, expectedDigest: preview.digest, importId: 'import-1' }, repositories);
    expect(saved.careers).toEqual([{ ...preview.package.career, controlledClubId: null }, preview.package.career]);
    expect(saved.clubs).toEqual(preview.package.clubs);
    expect(saved.players).toEqual(preview.package.players);
    expect(saved.fixtures).toEqual(preview.package.fixtures);
    expect(saved.transactionCalls).toBe(1);
  });

  it('blocks unresolved natural-key conflicts and stale previews', async () => {
    const pkg = await exportCareerPackage(packageValue());
    const conflictingClub = { ...packageValue().clubs[0], id: 'club-existing' };
    const { repositories } = createFakeRepositories({ clubs: [conflictingClub] });
    const preview = await previewCareerImport(pkg.text, repositories);
    expect(preview.conflicts.length).toBeGreaterThan(0);
    await expect(confirmCareerImport(preview, { confirmed: true, expectedDigest: preview.digest, importId: 'import-2' }, repositories)).rejects.toThrow(/Resolve all conflicts/);
    const clean = createFakeRepositories();
    const cleanPreview = await previewCareerImport(pkg.text, clean.repositories);
    await expect(confirmCareerImport(cleanPreview, { confirmed: true, expectedDigest: 'stale', importId: 'import-3' }, clean.repositories)).rejects.toThrow(/preview changed/);
  });
});
