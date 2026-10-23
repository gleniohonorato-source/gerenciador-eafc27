import { createPrng } from './prng';

/** Version of the calendar rules. Stored with every generated history to explain results later. */
export const CALENDAR_RULES_VERSION = 1;
export const SEASON_WEEKS = 40;

export interface CalendarClub {
  readonly id: string;
  readonly competitionId: string;
}

export interface CalendarFixture {
  readonly id: string;
  readonly competitionId: string;
  readonly homeClubId: string;
  readonly awayClubId: string;
  /** Zero-based simulation day on which the fixture is played. */
  readonly day: number;
  readonly round: number;
}

export interface CalendarEvent {
  readonly day: number;
  readonly kind: 'FIXTURE_SCHEDULED';
  readonly fixtureId: string;
  readonly causeRuleVersion: number;
}

export interface SeasonCalendar {
  readonly rulesVersion: number;
  readonly seed: string;
  readonly fixtures: readonly CalendarFixture[];
  readonly totalDays: number;
}

/**
 * Builds a single round-robin league season for one competition, in a deterministic order.
 * Each round is placed on a weekly slot; within a round pairings are fixed by a seeded shuffle of the
 * club order so the same seed always yields the same calendar.
 */
export function generateLeagueSeason(input: {
  readonly seed: string;
  readonly competitionId: string;
  readonly clubIds: readonly string[];
}): SeasonCalendar {
  const clubs = [...new Set(input.clubIds)];
  if (clubs.length < 2 || clubs.length % 2 !== 0) {
    throw new RangeError('A league season needs an even number of distinct clubs (at least two).');
  }
  const prng = createPrng(`${input.seed}|calendar|${input.competitionId}`);
  const order = shuffle(clubs, prng);
  const rounds = roundRobinRounds(order);
  const fixtures: CalendarFixture[] = [];
  rounds.forEach((pairings, roundIndex) => {
    pairings.forEach(([home, away], slot) => {
      fixtures.push({
        id: `${input.competitionId}-r${roundIndex + 1}-${slot + 1}`,
        competitionId: input.competitionId,
        homeClubId: roundIndex % 2 === 0 ? home : away,
        awayClubId: roundIndex % 2 === 0 ? away : home,
        day: roundIndex * 7,
        round: roundIndex + 1,
      });
    });
  });
  const totalDays = fixtures.length === 0 ? 0 : Math.max(...fixtures.map((fixture) => fixture.day)) + 1;
  return Object.freeze({
    rulesVersion: CALENDAR_RULES_VERSION,
    seed: input.seed,
    fixtures: Object.freeze(fixtures),
    totalDays,
  });
}

/** Circle method: every club meets every other club exactly once in n-1 rounds (n even). */
function roundRobinRounds(clubs: readonly string[]): Array<Array<[string, string]>> {
  const n = clubs.length;
  const fixed = clubs[0];
  const rotating = clubs.slice(1);
  const rounds: Array<Array<[string, string]>> = [];
  for (let round = 0; round < n - 1; round += 1) {
    const ring = [fixed, ...rotating];
    const pairings: Array<[string, string]> = [];
    for (let index = 0; index < n / 2; index += 1) {
      pairings.push([ring[index], ring[n - 1 - index]]);
    }
    rounds.push(pairings);
    rotating.unshift(rotating.pop() as string);
  }
  return rounds;
}

function shuffle<T>(items: readonly T[], prng: { nextInt(bound: number): number }): T[] {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swap = prng.nextInt(index + 1);
    [copy[index], copy[swap]] = [copy[swap], copy[index]];
  }
  return copy;
}

/**
 * Advances the simulation one day at a time, emitting a causal event for each fixture scheduled on that day.
 * The result depends only on the calendar input, so it is repeatable for the same seed and rules version.
 */
export function advanceSeason(calendar: SeasonCalendar): { readonly events: readonly CalendarEvent[]; readonly lastDay: number } {
  const events: CalendarEvent[] = [];
  const byDay = new Map<number, CalendarFixture[]>();
  for (const fixture of calendar.fixtures) {
    const list = byDay.get(fixture.day) ?? [];
    list.push(fixture);
    byDay.set(fixture.day, list);
  }
  for (let day = 0; day < calendar.totalDays; day += 1) {
    for (const fixture of byDay.get(day) ?? []) {
      events.push(Object.freeze({
        day,
        kind: 'FIXTURE_SCHEDULED',
        fixtureId: fixture.id,
        causeRuleVersion: calendar.rulesVersion,
      }));
    }
  }
  return Object.freeze({ events: Object.freeze(events), lastDay: Math.max(0, calendar.totalDays - 1) });
}
