import { describe, expect, it } from 'vitest';
import {
  calculateBalance,
  createCareer,
  createClub,
  createFinanceEntry,
  createFixture,
  createPlayer,
} from './index';

const stamp = '2026-10-09T12:00:00.000Z';
const basePlayer = {
  id: 'p-1', careerId: 'c-1', currentClubId: 'club-1', name: 'Player One',
  birthDate: '2004-03-12', overall: 75, potential: 88, heightCm: 180, weightKg: 75,
  provenanceKind: 'USER_ENTERED' as const, provenanceSource: 'manual', provenanceRecordedAt: stamp,
};

function financeEntry(direction: 'INCOME' | 'EXPENSE', minorUnits: bigint, id: string) {
  return createFinanceEntry({
    id, careerId: 'c-1', clubId: 'club-1', direction, category: 'transfer', minorUnits,
    currency: 'EUR', occurredAt: stamp, provenanceKind: 'USER_ENTERED',
    provenanceSource: 'manual', provenanceRecordedAt: stamp,
  });
}

describe('domain factories and invariants', () => {
  it('normalizes career and validates required identity', () => {
    expect(createCareer({
      id: 'career-1', name: '  My Career ', currentSeason: '2026/27', controlledClubId: 'club-1',
      randomSeed: 'seed-a', createdAt: stamp,
    }).name).toBe('My Career');
    expect(() => createCareer({
      id: 'career-1', name: ' ', currentSeason: '2026/27', controlledClubId: 'club-1',
      randomSeed: 'seed-a', createdAt: stamp,
    })).toThrow(/name must not be empty/);
  });

  it('rejects a player rating outside the supported range', () => {
    expect(() => createPlayer({ ...basePlayer, overall: 101 })).toThrow(/overall must be between/);
  });

  it('preserves optional original player provenance and requires it to be complete', () => {
    const imported = createPlayer({
      ...basePlayer,
      originalProvenanceKind: 'IMPORTED_EXTERNAL',
      originalProvenanceSource: 'dataset-v1',
      originalProvenanceRecordedAt: stamp,
    });
    expect(imported.originalProvenanceKind).toBe('IMPORTED_EXTERNAL');
    expect(imported.originalProvenanceSource).toBe('dataset-v1');
    expect(() => createPlayer({ ...basePlayer, originalProvenanceSource: 'dataset-v1' }))
      .toThrow(/Original provenance fields must be all set or all null/);
  });

  it('rejects impossible birth dates rather than normalizing them', () => {
    expect(() => createPlayer({ ...basePlayer, birthDate: '2001-02-29' })).toThrow(/real calendar date/);
  });

  it('requires distinct clubs and provenance for completed fixture results', () => {
    expect(() => createFixture({
      id: 'f-1', careerId: 'c-1', competitionId: 'comp-1', season: '2026/27',
      homeClubId: 'club-1', awayClubId: 'club-1', kickoffAt: stamp, timeZone: 'Europe/London',
      status: 'SCHEDULED', homeScore: null, awayScore: null,
      provenanceKind: null, provenanceSource: null, provenanceRecordedAt: null,
    })).toThrow(/Home and away clubs must differ/);
    expect(() => createFixture({
      id: 'f-2', careerId: 'c-1', competitionId: 'comp-1', season: '2026/27',
      homeClubId: 'club-1', awayClubId: 'club-2', kickoffAt: stamp, timeZone: 'Europe/London',
      status: 'COMPLETED', homeScore: 1, awayScore: 0,
      provenanceKind: null, provenanceSource: null, provenanceRecordedAt: null,
    })).toThrow(/require provenance/);
  });

  it('calculates the balance from immutable ledger entries', () => {
    const entries = [financeEntry('INCOME', 100_000n, 'entry-1'), financeEntry('EXPENSE', 25_500n, 'entry-2')];
    expect(calculateBalance(entries, 'EUR')).toEqual({ minorUnits: 74_500n, currency: 'EUR' });
    expect(() => calculateBalance(entries, 'USD')).toThrow(/one currency/);
  });

  it('validates club identity and reputation', () => {
    expect(createClub({
      id: 'club-1', careerId: 'c-1', name: '  Northside FC', countryCode: 'gb',
      competitionId: 'league-1', reputation: 70, createdAt: stamp,
    })).toMatchObject({ name: 'Northside FC', countryCode: 'GB' });
    expect(() => createClub({
      id: 'club-1', careerId: 'c-1', name: 'Northside', countryCode: 'GB',
      competitionId: 'league-1', reputation: -1, createdAt: stamp,
    })).toThrow(/reputation must be between/);
  });
});
