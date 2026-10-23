import { DomainValidationError, type Fixture } from '@gerenciador/domain';

/** Version of the local result-sync rules. Stored with every decision to explain it later. */
export const RESULT_SYNC_RULES_VERSION = 1;

/** One result as supplied by a local file. Identity is (sourceId, sourceVersion). */
export interface SourceResult {
  readonly sourceId: string;
  readonly sourceVersion: number;
  readonly fixtureId: string;
  readonly homeScore: number;
  readonly awayScore: number;
  /** Kickoff in UTC; used to detect schedule changes. */
  readonly kickoffAt: string;
}

/** Record of what was last applied for a fixture, kept outside the Fixture entity. */
export interface AppliedResult {
  readonly fixtureId: string;
  readonly sourceId: string;
  readonly sourceVersion: number;
  readonly homeScore: number;
  readonly awayScore: number;
}

export type SyncDecision =
  | { readonly kind: 'APPLY'; readonly fixtureId: string; readonly sourceId: string; readonly sourceVersion: number }
  | { readonly kind: 'UNCHANGED'; readonly fixtureId: string; readonly sourceId: string; readonly sourceVersion: number }
  | { readonly kind: 'CONFLICT'; readonly fixtureId: string; readonly reason: 'DIFFERENT_RESULT_SAME_VERSION' | 'FIXTURE_MISSING' | 'SCHEDULE_CHANGED' | 'OLDER_VERSION' };

export interface SyncPlan {
  readonly rulesVersion: number;
  readonly decisions: readonly SyncDecision[];
  readonly applicable: boolean;
}

/**
 * Plans a local sync without writing anything. Each decision is explained by its kind and reason, so the
 * user can review conflicts before confirming. Nothing is overwritten silently.
 *
 * - Same source, same version, same score: UNCHANGED (idempotent re-import).
 * - Same source, same version, different score: CONFLICT (a corrected result needs a new version).
 * - Newer version of the same source: APPLY, replacing the previous score.
 * - Older version than already applied: CONFLICT.
 * - Fixture unknown: CONFLICT.
 * - Kickoff differs from the fixture's schedule: CONFLICT (postponements are not applied automatically).
 */
export function planResultSync(input: {
  readonly results: readonly SourceResult[];
  readonly fixtures: readonly Fixture[];
  readonly applied: readonly AppliedResult[];
}): SyncPlan {
  const fixturesById = new Map(input.fixtures.map((fixture) => [fixture.id, fixture]));
  const appliedByFixture = new Map(input.applied.map((record) => [record.fixtureId, record]));
  const decisions: SyncDecision[] = [];

  for (const result of input.results) {
    validateResult(result);
    const fixture = fixturesById.get(result.fixtureId);
    if (!fixture) {
      decisions.push({ kind: 'CONFLICT', fixtureId: result.fixtureId, reason: 'FIXTURE_MISSING' });
      continue;
    }
    if (normalizeInstant(fixture.kickoffAt) !== normalizeInstant(result.kickoffAt)) {
      decisions.push({ kind: 'CONFLICT', fixtureId: result.fixtureId, reason: 'SCHEDULE_CHANGED' });
      continue;
    }
    const current = appliedByFixture.get(result.fixtureId);
    if (!current) {
      decisions.push(apply(result));
      continue;
    }
    if (current.sourceId === result.sourceId) {
      if (result.sourceVersion === current.sourceVersion) {
        const same = result.homeScore === current.homeScore && result.awayScore === current.awayScore;
        decisions.push(same
          ? { kind: 'UNCHANGED', fixtureId: result.fixtureId, sourceId: result.sourceId, sourceVersion: result.sourceVersion }
          : { kind: 'CONFLICT', fixtureId: result.fixtureId, reason: 'DIFFERENT_RESULT_SAME_VERSION' });
        continue;
      }
      if (result.sourceVersion < current.sourceVersion) {
        decisions.push({ kind: 'CONFLICT', fixtureId: result.fixtureId, reason: 'OLDER_VERSION' });
        continue;
      }
      decisions.push(apply(result));
      continue;
    }
    // A different source already set this fixture: never replace it silently.
    decisions.push({ kind: 'CONFLICT', fixtureId: result.fixtureId, reason: 'DIFFERENT_RESULT_SAME_VERSION' });
  }

  return Object.freeze({
    rulesVersion: RESULT_SYNC_RULES_VERSION,
    decisions: Object.freeze(decisions),
    applicable: decisions.every((decision) => decision.kind !== 'CONFLICT'),
  });
}

/** Reverts a batch: removes only the applied records that the batch introduced, returning the previous state. */
export function revertSyncBatch(input: {
  readonly applied: readonly AppliedResult[];
  readonly batchSourceId: string;
  readonly batchSourceVersion: number;
  readonly previous: readonly AppliedResult[];
}): readonly AppliedResult[] {
  const previousByFixture = new Map(input.previous.map((record) => [record.fixtureId, record]));
  return Object.freeze(input.applied.map((record) => {
    if (record.sourceId === input.batchSourceId && record.sourceVersion === input.batchSourceVersion) {
      return previousByFixture.get(record.fixtureId) ?? null;
    }
    return record;
  }).filter((record): record is AppliedResult => record !== null));
}

function apply(result: SourceResult): SyncDecision {
  return { kind: 'APPLY', fixtureId: result.fixtureId, sourceId: result.sourceId, sourceVersion: result.sourceVersion };
}

function validateResult(result: SourceResult): void {
  if (!result.sourceId.trim() || !result.fixtureId.trim()) {
    throw new DomainValidationError('INVALID_SYNC_IDENTITY', 'sourceId and fixtureId must not be empty.');
  }
  if (!Number.isInteger(result.sourceVersion) || result.sourceVersion < 1) {
    throw new DomainValidationError('INVALID_SYNC_VERSION', 'sourceVersion must be a positive integer.');
  }
  for (const score of [result.homeScore, result.awayScore]) {
    if (!Number.isInteger(score) || score < 0) {
      throw new DomainValidationError('INVALID_SYNC_SCORE', 'Scores must be non-negative integers.');
    }
  }
  if (!Number.isFinite(Date.parse(result.kickoffAt))) {
    throw new DomainValidationError('INVALID_SYNC_TIMESTAMP', 'kickoffAt must be an ISO-compatible timestamp.');
  }
}

/** Compares instants in UTC so the same moment written in different offsets matches. */
function normalizeInstant(value: string): string {
  return new Date(value).toISOString();
}
