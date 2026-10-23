import { describe, expect, it } from 'vitest';
import { advanceSeason, createPrng, generateLeagueSeason, SEASON_WEEKS } from './index';

const clubs = Array.from({ length: 20 }, (_, index) => `club-${index + 1}`);

describe('seeded PRNG', () => {
  it('produces identical sequences for the same seed and different ones otherwise', () => {
    const a = createPrng('seed-a');
    const b = createPrng('seed-a');
    const c = createPrng('seed-b');
    const first = Array.from({ length: 20 }, () => a.next());
    expect(Array.from({ length: 20 }, () => b.next())).toEqual(first);
    expect(Array.from({ length: 20 }, () => c.next())).not.toEqual(first);
    for (const value of first) expect(value >= 0 && value < 1).toBe(true);
  });

  it('rejects invalid bounds', () => {
    expect(() => createPrng('s').nextInt(0)).toThrow(RangeError);
    expect(() => createPrng('s').nextInt(1.5)).toThrow(RangeError);
  });
});

describe('league calendar', () => {
  it('is repeatable for the same seed and rules version', () => {
    const first = generateLeagueSeason({ seed: 'same', competitionId: 'league', clubIds: clubs });
    const second = generateLeagueSeason({ seed: 'same', competitionId: 'league', clubIds: clubs });
    expect(second).toEqual(first);
  });

  it('changes the calendar order when the seed changes', () => {
    const a = generateLeagueSeason({ seed: 'one', competitionId: 'league', clubIds: clubs });
    const b = generateLeagueSeason({ seed: 'two', competitionId: 'league', clubIds: clubs });
    expect(a.fixtures.map((fixture) => fixture.homeClubId)).not.toEqual(b.fixtures.map((fixture) => fixture.homeClubId));
  });

  it('pairs every club against every other exactly once (double round robin is not required)', () => {
    const season = generateLeagueSeason({ seed: 'pairs', competitionId: 'league', clubIds: clubs });
    const seen = new Set<string>();
    for (const fixture of season.fixtures) {
      expect(fixture.homeClubId).not.toBe(fixture.awayClubId);
      const key = [fixture.homeClubId, fixture.awayClubId].sort().join('|');
      expect(seen.has(key)).toBe(false);
      seen.add(key);
    }
    expect(seen.size).toBe((clubs.length * (clubs.length - 1)) / 2);
  });

  it('keeps each club to one fixture per round', () => {
    const season = generateLeagueSeason({ seed: 'rounds', competitionId: 'league', clubIds: clubs });
    const byRound = new Map<number, string[]>();
    for (const fixture of season.fixtures) {
      const participants = byRound.get(fixture.round) ?? [];
      participants.push(fixture.homeClubId, fixture.awayClubId);
      byRound.set(fixture.round, participants);
    }
    for (const participants of byRound.values()) {
      expect(new Set(participants).size).toBe(participants.length);
    }
  });

  it('fits a single season of the documented horizon', () => {
    const season = generateLeagueSeason({ seed: 'horizon', competitionId: 'league', clubIds: clubs });
    expect(season.totalDays).toBeLessThanOrEqual(SEASON_WEEKS * 7);
  });

  it('rejects odd or tiny club sets', () => {
    expect(() => generateLeagueSeason({ seed: 's', competitionId: 'l', clubIds: ['a'] })).toThrow(RangeError);
    expect(() => generateLeagueSeason({ seed: 's', competitionId: 'l', clubIds: ['a', 'b', 'c'] })).toThrow(RangeError);
  });
});

describe('advancing the season', () => {
  it('emits one causal event per fixture, ordered by day, with the rules version', () => {
    const season = generateLeagueSeason({ seed: 'advance', competitionId: 'league', clubIds: clubs });
    const { events, lastDay } = advanceSeason(season);
    expect(events).toHaveLength(season.fixtures.length);
    for (let index = 1; index < events.length; index += 1) {
      expect(events[index].day >= events[index - 1].day).toBe(true);
    }
    for (const event of events) {
      expect(event.causeRuleVersion).toBe(season.rulesVersion);
      expect(event.kind).toBe('FIXTURE_SCHEDULED');
    }
    expect(lastDay).toBe(season.totalDays - 1);
  });

  it('produces identical event logs when advanced twice from the same seed', () => {
    const a = advanceSeason(generateLeagueSeason({ seed: 'log', competitionId: 'league', clubIds: clubs }));
    const b = advanceSeason(generateLeagueSeason({ seed: 'log', competitionId: 'league', clubIds: clubs }));
    expect(b).toEqual(a);
  });
});
