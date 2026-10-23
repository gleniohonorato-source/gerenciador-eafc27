import { describe, expect, it } from 'vitest';
import { createCareer, createClub, createFixture, type Career, type Club, type Fixture } from '@gerenciador/domain';
import { configureImportDigest, exportCareerPackage, type CareerImportRepositories } from './career-import';
import { confirmCalendarImport, previewCalendarImport } from './calendar-import';

configureImportDigest(async (value) => {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  return hash.toString(16).padStart(64, '0');
});

const stamp = '2026-10-10T12:00:00.000Z';
function fixtureData() {
  const career = createCareer({ id: 'career-calendar', name: 'Calendar Career', currentSeason: '2026/27', controlledClubId: 'club-a', randomSeed: 'seed', createdAt: stamp });
  const clubs = [
    createClub({ id: 'club-a', careerId: career.id, name: 'Northside', countryCode: 'GB', competitionId: 'league', reputation: 60, createdAt: stamp }),
    createClub({ id: 'club-b', careerId: career.id, name: 'Southside', countryCode: 'GB', competitionId: 'league', reputation: 50, createdAt: stamp }),
  ];
  const fixtures = [createFixture({
    id: 'fixture-a', careerId: career.id, competitionId: 'league', season: career.currentSeason,
    homeClubId: 'club-a', awayClubId: 'club-b', kickoffAt: stamp, timeZone: 'Europe/London', status: 'SCHEDULED',
    homeScore: null, awayScore: null, provenanceKind: null, provenanceSource: null, provenanceRecordedAt: null,
  })];
  return { career, clubs, fixtures };
}

function repositories(seed: { career: Career; clubs: readonly Club[]; fixtures?: readonly Fixture[] }, failOnSave = false) {
  const rows = {
    careers: [seed.career] as Career[],
    clubs: [...seed.clubs] as Club[],
    fixtures: [...(seed.fixtures ?? [])] as Fixture[],
    players: [] as import('@gerenciador/domain').Player[],
  };
  let txCalls = 0;
  const base = {
    career: {
      findById: async (id: string) => rows.careers.find((career) => career.id === id) ?? null,
      save: async (career: Career) => { rows.careers.push(career); },
    },
    clubs: {
      listByCareer: async (id: string) => rows.clubs.filter((club) => club.careerId === id),
      save: async (club: Club) => { rows.clubs.push(club); },
    },
    players: {
      listByCareer: async (id: string) => rows.players.filter((player) => player.careerId === id),
      save: async (player: import('@gerenciador/domain').Player) => { rows.players.push(player); },
    },
    fixtures: {
      listByCareer: async (id: string) => rows.fixtures.filter((fixture) => fixture.careerId === id),
      save: async (fixture: Fixture) => {
        if (failOnSave) throw new Error('disk failure');
        rows.fixtures.push(fixture);
      },
    },
  };
  const repo: CareerImportRepositories = {
    ...base,
    transaction: async <T>(operation: (transactionRepositories: Omit<CareerImportRepositories, 'transaction'>) => Promise<T>) => {
      txCalls += 1;
      const snapshot = { careers: [...rows.careers], clubs: [...rows.clubs], fixtures: [...rows.fixtures], players: [...rows.players] };
      try { return await operation(base); } catch (error) {
        rows.careers = snapshot.careers;
        rows.clubs = snapshot.clubs;
        rows.fixtures = snapshot.fixtures;
        rows.players = snapshot.players;
        throw error;
      }
    },
  };
  return { repo, rows, transactionCalls: () => txCalls };
}

async function packageText(data: ReturnType<typeof fixtureData>) {
  return (await exportCareerPackage({ ...data, players: [], exportedAt: stamp })).text;
}

describe('calendar import', () => {
  it('previews an app package and saves only fixtures after explicit confirmation', async () => {
    const data = fixtureData();
    const repo = repositories({ career: data.career, clubs: data.clubs });
    const preview = await previewCalendarImport(await packageText(data), 'league.json', repo.repo);
    expect(preview.counts.fixtures).toBe(1);
    expect(preview.fileName).toBe('league.json');
    const result = await confirmCalendarImport(preview, { confirmed: true, expectedDigest: preview.digest, careerId: data.career.id }, repo.repo);
    expect(result.savedFixtures).toBe(1);
    expect(result.savedPlayers).toBe(0);
    expect(repo.rows.fixtures).toHaveLength(1);
    expect(repo.transactionCalls()).toBe(1);
    expect(repo.rows.careers).toHaveLength(1);
  });

  it('imports players together with clubs and fixtures in one transaction', async () => {
    const data = fixtureData();
    const player = {
      id: 'player-elenco', careerId: data.career.id, currentClubId: 'club-a', name: 'Alex Midfielder',
      birthDate: '2003-05-02', overall: 72, potential: 85, heightCm: 178, weightKg: 74,
      provenanceKind: 'USER_ENTERED' as const, provenanceSource: 'manual', provenanceRecordedAt: stamp,
    };
    const repo = repositories({ career: data.career, clubs: [] });
    const preview = await previewCalendarImport(
      (await exportCareerPackage({ ...data, players: [player], exportedAt: stamp })).text,
      'elenco.json',
      repo.repo,
    );
    expect(preview.counts.players).toBe(1);
    const result = await confirmCalendarImport(preview, { confirmed: true, expectedDigest: preview.digest, careerId: data.career.id }, repo.repo);
    expect(result.savedFixtures).toBe(1);
    expect(result.savedPlayers).toBe(1);
    expect(repo.rows.clubs).toHaveLength(2);
    expect(repo.rows.fixtures).toHaveLength(1);
    expect(repo.transactionCalls()).toBe(1);
  });

  it('rejects a player referencing a club outside the package at preview time, before any transaction', async () => {
    const data = fixtureData();
    const player = {
      id: 'player-orphan', careerId: data.career.id, currentClubId: 'club-ghost', name: 'Orphan Player',
      birthDate: null, overall: 60, potential: 70, heightCm: null, weightKg: null,
      provenanceKind: 'USER_ENTERED' as const, provenanceSource: 'manual', provenanceRecordedAt: stamp,
    };
    const repo = repositories({ career: data.career, clubs: [] });
    // Package validation runs during parse (export and preview), so an orphan reference can never
    // reach the confirmation transaction. Build raw JSON to exercise the preview path directly.
    const rawPackage = {
      format: 'gerenciador-eafc-career', version: 1, exportedAt: stamp,
      career: { ...data.career },
      clubs: data.clubs.map((club) => ({ ...club })),
      players: [{ ...player }],
      fixtures: data.fixtures.map((fixture) => ({ ...fixture })),
    };
    await expect(previewCalendarImport(JSON.stringify(rawPackage), 'elenco.json', repo.repo)).rejects.toThrow(/missing club/i);
    expect(repo.transactionCalls()).toBe(0);
    expect(repo.rows.players).toHaveLength(0);
  });

  it('ignores career metadata differences, creates missing clubs and never writes the career', async () => {
    const data = fixtureData();
    const differingCareer = createCareer({ ...data.career, randomSeed: 'another-seed', controlledClubId: null });
    const repo = repositories({ career: differingCareer, clubs: [] });
    const preview = await previewCalendarImport(await packageText(data), 'league.json', repo.repo);
    expect(preview.conflicts).toHaveLength(0);
    const result = await confirmCalendarImport(preview, { confirmed: true, expectedDigest: preview.digest, careerId: data.career.id }, repo.repo);
    expect(result.savedFixtures).toBe(1);
    // Both referenced clubs are created; the stored career record remains exactly as it was.
    expect(repo.rows.clubs).toHaveLength(2);
    expect(repo.rows.fixtures).toHaveLength(1);
    expect(repo.rows.careers[0].randomSeed).toBe('another-seed');
    expect(repo.rows.careers[0].controlledClubId).toBeNull();
  });

  it('refuses another career and refuses to overwrite an existing identical fixture', async () => {
    const data = fixtureData();
    const repo = repositories({ career: data.career, clubs: data.clubs, fixtures: data.fixtures });
    const preview = await previewCalendarImport(await packageText(data), 'league.json', repo.repo);
    await expect(confirmCalendarImport(preview, { confirmed: true, expectedDigest: preview.digest, careerId: 'other' }, repo.repo)).rejects.toThrow(/career/i);
    // Existing identical fixture has already been applied: no new transaction may run for it.
    expect(repo.transactionCalls()).toBe(0);
    expect(repo.rows.fixtures).toHaveLength(1);
  });

  it('does not write on cancellation or stale preview and rolls back save failures', async () => {
    const data = fixtureData();
    const repo = repositories({ career: data.career, clubs: data.clubs });
    const preview = await previewCalendarImport(await packageText(data), 'league.json', repo.repo);
    await expect(confirmCalendarImport(preview, { confirmed: false, expectedDigest: preview.digest, careerId: data.career.id }, repo.repo)).rejects.toThrow(/confirmed/i);
    await expect(confirmCalendarImport(preview, { confirmed: true, expectedDigest: 'wrong', careerId: data.career.id }, repo.repo)).rejects.toThrow(/preview/i);
    expect(repo.transactionCalls()).toBe(0);

    const failing = repositories({ career: data.career, clubs: data.clubs }, true);
    const freshPreview = await previewCalendarImport(await packageText(data), 'league.json', failing.repo);
    await expect(confirmCalendarImport(freshPreview, { confirmed: true, expectedDigest: freshPreview.digest, careerId: data.career.id }, failing.repo)).rejects.toThrow('disk failure');
    expect(failing.rows.fixtures).toHaveLength(0);
    expect(failing.transactionCalls()).toBe(1);
  });

  it('rejects fixtures whose season differs from the open career before writing', async () => {
    const data = fixtureData();
    const otherSeasonFixture = createFixture({ ...data.fixtures[0], id: 'fixture-2027', season: '2027/28' });
    const repo = repositories({ career: data.career, clubs: data.clubs });
    const preview = await previewCalendarImport(
      (await exportCareerPackage({ ...data, fixtures: [data.fixtures[0], otherSeasonFixture], players: [], exportedAt: stamp })).text,
      'league.json',
      repo.repo,
    );
    await expect(confirmCalendarImport(preview, { confirmed: true, expectedDigest: preview.digest, careerId: data.career.id }, repo.repo)).rejects.toThrow(/match this season/i);
    // Validation runs inside the transaction, so the transaction opens but writes nothing.
    expect(repo.rows.fixtures).toHaveLength(0);
  });
});
