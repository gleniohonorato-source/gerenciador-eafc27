import { describe, expect, it } from 'vitest';
import { createFixture, type Fixture } from '@gerenciador/domain';
import {
  planResultSync,
  revertSyncBatch,
  RESULT_SYNC_RULES_VERSION,
  type AppliedResult,
  type SourceResult,
} from './result-sync';

const kickoff = '2026-10-17T19:00:00.000Z';

function fixture(id: string, overrides: Partial<Fixture> = {}): Fixture {
  return createFixture({
    id, careerId: 'c-1', competitionId: 'league', season: '2026/27', homeClubId: 'club-1', awayClubId: 'club-2',
    kickoffAt: kickoff, timeZone: 'Europe/London', status: 'SCHEDULED', homeScore: null, awayScore: null,
    provenanceKind: null, provenanceSource: null, provenanceRecordedAt: null, ...overrides,
  });
}

function result(overrides: Partial<SourceResult> = {}): SourceResult {
  return { sourceId: 'file-a', sourceVersion: 1, fixtureId: 'f-1', homeScore: 2, awayScore: 1, kickoffAt: kickoff, ...overrides };
}

describe('planning a local result sync', () => {
  it('applies a new result for a scheduled fixture', () => {
    const plan = planResultSync({ results: [result()], fixtures: [fixture('f-1')], applied: [] });
    expect(plan.applicable).toBe(true);
    expect(plan.decisions).toEqual([{ kind: 'APPLY', fixtureId: 'f-1', sourceId: 'file-a', sourceVersion: 1 }]);
    expect(plan.rulesVersion).toBe(RESULT_SYNC_RULES_VERSION);
  });

  it('is idempotent: re-importing the same source version and score is unchanged', () => {
    const applied: AppliedResult[] = [{ fixtureId: 'f-1', sourceId: 'file-a', sourceVersion: 1, homeScore: 2, awayScore: 1 }];
    const plan = planResultSync({ results: [result()], fixtures: [fixture('f-1')], applied });
    expect(plan.decisions[0].kind).toBe('UNCHANGED');
    expect(plan.applicable).toBe(true);
  });

  it('flags a different score under the same version as a conflict instead of overwriting', () => {
    const applied: AppliedResult[] = [{ fixtureId: 'f-1', sourceId: 'file-a', sourceVersion: 1, homeScore: 2, awayScore: 1 }];
    const plan = planResultSync({ results: [result({ homeScore: 3 })], fixtures: [fixture('f-1')], applied });
    expect(plan.decisions[0]).toMatchObject({ kind: 'CONFLICT', reason: 'DIFFERENT_RESULT_SAME_VERSION' });
    expect(plan.applicable).toBe(false);
  });

  it('applies a newer version of the same source as a correction', () => {
    const applied: AppliedResult[] = [{ fixtureId: 'f-1', sourceId: 'file-a', sourceVersion: 1, homeScore: 2, awayScore: 1 }];
    const plan = planResultSync({ results: [result({ sourceVersion: 2, homeScore: 3 })], fixtures: [fixture('f-1')], applied });
    expect(plan.decisions[0]).toMatchObject({ kind: 'APPLY', sourceVersion: 2 });
  });

  it('rejects an older version than the one already applied', () => {
    const applied: AppliedResult[] = [{ fixtureId: 'f-1', sourceId: 'file-a', sourceVersion: 3, homeScore: 2, awayScore: 1 }];
    const plan = planResultSync({ results: [result({ sourceVersion: 2 })], fixtures: [fixture('f-1')], applied });
    expect(plan.decisions[0]).toMatchObject({ kind: 'CONFLICT', reason: 'OLDER_VERSION' });
  });

  it('never silently replaces a result set by a different source', () => {
    const applied: AppliedResult[] = [{ fixtureId: 'f-1', sourceId: 'file-a', sourceVersion: 1, homeScore: 2, awayScore: 1 }];
    const plan = planResultSync({ results: [result({ sourceId: 'file-b', sourceVersion: 5, homeScore: 0 })], fixtures: [fixture('f-1')], applied });
    expect(plan.decisions[0].kind).toBe('CONFLICT');
    expect(plan.applicable).toBe(false);
  });

  it('reports a conflict when the fixture does not exist', () => {
    const plan = planResultSync({ results: [result({ fixtureId: 'missing' })], fixtures: [fixture('f-1')], applied: [] });
    expect(plan.decisions[0]).toMatchObject({ kind: 'CONFLICT', reason: 'FIXTURE_MISSING' });
  });

  it('flags a schedule change instead of applying a result to a moved fixture', () => {
    const plan = planResultSync({ results: [result({ kickoffAt: '2026-10-18T19:00:00.000Z' })], fixtures: [fixture('f-1')], applied: [] });
    expect(plan.decisions[0]).toMatchObject({ kind: 'CONFLICT', reason: 'SCHEDULE_CHANGED' });
  });

  it('compares kickoff instants across time zone offsets', () => {
    const sameInstant = '2026-10-17T20:00:00.000+01:00';
    const plan = planResultSync({ results: [result({ kickoffAt: sameInstant })], fixtures: [fixture('f-1')], applied: [] });
    expect(plan.decisions[0].kind).toBe('APPLY');
  });

  it('rejects the whole input when a row is malformed', () => {
    expect(() => planResultSync({ results: [result({ sourceVersion: 0 })], fixtures: [fixture('f-1')], applied: [] })).toThrow(/sourceVersion/);
    expect(() => planResultSync({ results: [result({ homeScore: -1 })], fixtures: [fixture('f-1')], applied: [] })).toThrow(/non-negative/);
    expect(() => planResultSync({ results: [result({ kickoffAt: 'not a date' })], fixtures: [fixture('f-1')], applied: [] })).toThrow(/ISO/);
  });

  it('does not mutate the applied records or the fixtures', () => {
    const applied: AppliedResult[] = [{ fixtureId: 'f-1', sourceId: 'file-a', sourceVersion: 1, homeScore: 2, awayScore: 1 }];
    const snapshot = JSON.stringify(applied);
    planResultSync({ results: [result({ homeScore: 9 })], fixtures: [fixture('f-1')], applied });
    expect(JSON.stringify(applied)).toBe(snapshot);
  });
});

describe('reverting a sync batch', () => {
  it('restores the previous record for fixtures the batch changed and keeps unrelated records', () => {
    const previous: AppliedResult[] = [{ fixtureId: 'f-1', sourceId: 'file-a', sourceVersion: 1, homeScore: 2, awayScore: 1 }];
    const applied: AppliedResult[] = [
      { fixtureId: 'f-1', sourceId: 'file-a', sourceVersion: 2, homeScore: 3, awayScore: 1 },
      { fixtureId: 'f-9', sourceId: 'file-b', sourceVersion: 1, homeScore: 0, awayScore: 0 },
    ];
    const reverted = revertSyncBatch({ applied, batchSourceId: 'file-a', batchSourceVersion: 2, previous });
    expect(reverted).toEqual([
      { fixtureId: 'f-1', sourceId: 'file-a', sourceVersion: 1, homeScore: 2, awayScore: 1 },
      { fixtureId: 'f-9', sourceId: 'file-b', sourceVersion: 1, homeScore: 0, awayScore: 0 },
    ]);
  });

  it('removes records the batch introduced when there was no previous record', () => {
    const applied: AppliedResult[] = [{ fixtureId: 'f-2', sourceId: 'file-a', sourceVersion: 1, homeScore: 1, awayScore: 1 }];
    expect(revertSyncBatch({ applied, batchSourceId: 'file-a', batchSourceVersion: 1, previous: [] })).toEqual([]);
  });

  it('does not mutate its inputs', () => {
    const applied: AppliedResult[] = [{ fixtureId: 'f-2', sourceId: 'file-a', sourceVersion: 1, homeScore: 1, awayScore: 1 }];
    const snapshot = JSON.stringify(applied);
    revertSyncBatch({ applied, batchSourceId: 'file-a', batchSourceVersion: 1, previous: [] });
    expect(JSON.stringify(applied)).toBe(snapshot);
  });
});
