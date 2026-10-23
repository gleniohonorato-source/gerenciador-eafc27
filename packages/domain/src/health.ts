import { DomainValidationError, assertNonEmpty } from './errors';

/** Version of the health rules. Stored with every evaluation to explain results later. */
export const HEALTH_RULES_VERSION = 1;

/** Fitness condition on a 0–100 scale. */
export const CONDITION_MIN = 0;
export const CONDITION_MAX = 100;

/** Condition points regained per day. */
export const CONDITION_RECOVERY_PER_DAY = 5;

export interface PlayerHealth {
  readonly playerId: string;
  readonly condition: number;
  /** Days left until the player is available again; 0 means fit to play. */
  readonly injuryDaysRemaining: number;
  readonly injuryKind: string | null;
}

export interface HealthEvent {
  readonly day: number;
  readonly playerId: string;
  readonly kind: 'INJURY_STARTED' | 'INJURY_RECOVERED';
  readonly causeRuleVersion: number;
}

export function createPlayerHealth(input: {
  playerId: string;
  condition: number;
  injuryDaysRemaining: number;
  injuryKind: string | null;
}): PlayerHealth {
  if (!Number.isInteger(input.condition) || input.condition < CONDITION_MIN || input.condition > CONDITION_MAX) {
    throw new DomainValidationError('INVALID_CONDITION', `condition must be an integer between ${CONDITION_MIN} and ${CONDITION_MAX}.`);
  }
  if (!Number.isInteger(input.injuryDaysRemaining) || input.injuryDaysRemaining < 0) {
    throw new DomainValidationError('INVALID_INJURY_DAYS', 'injuryDaysRemaining must be a non-negative integer.');
  }
  if (input.injuryDaysRemaining > 0 && (input.injuryKind === null || input.injuryKind.trim() === '')) {
    throw new DomainValidationError('INJURY_KIND_REQUIRED', 'An active injury must have a kind.');
  }
  if (input.injuryDaysRemaining === 0 && input.injuryKind !== null) {
    throw new DomainValidationError('INJURY_KIND_UNEXPECTED', 'A recovered player must not carry an injury kind.');
  }
  return Object.freeze({
    playerId: assertNonEmpty(input.playerId, 'playerId'),
    condition: input.condition,
    injuryDaysRemaining: input.injuryDaysRemaining,
    injuryKind: input.injuryKind === null ? null : assertNonEmpty(input.injuryKind, 'injuryKind'),
  });
}

/**
 * Advances one player's health by a number of days.
 * Condition recovers toward the maximum by a fixed step per day. An active injury counts down.
 * `injuryRoll` is an explicit, caller-supplied value in [0, 1) (from the seeded generator); this
 * function never draws randomness itself, so the same inputs always produce the same result.
 */
export function advanceHealthOneDay(health: PlayerHealth, day: number): { readonly health: PlayerHealth; readonly events: readonly HealthEvent[] } {
  const events: HealthEvent[] = [];
  const nextCondition = Math.min(CONDITION_MAX, health.condition + CONDITION_RECOVERY_PER_DAY);
  if (health.injuryDaysRemaining > 0) {
    const remaining = health.injuryDaysRemaining - 1;
    if (remaining === 0) {
      events.push(Object.freeze({ day, playerId: health.playerId, kind: 'INJURY_RECOVERED', causeRuleVersion: HEALTH_RULES_VERSION }));
      return Object.freeze({
        health: createPlayerHealth({ playerId: health.playerId, condition: nextCondition, injuryDaysRemaining: 0, injuryKind: null }),
        events: Object.freeze(events),
      });
    }
    return Object.freeze({
      health: createPlayerHealth({ playerId: health.playerId, condition: nextCondition, injuryDaysRemaining: remaining, injuryKind: health.injuryKind }),
      events: Object.freeze(events),
    });
  }
  return Object.freeze({
    health: createPlayerHealth({ playerId: health.playerId, condition: nextCondition, injuryDaysRemaining: 0, injuryKind: null }),
    events: Object.freeze(events),
  });
}

/**
 * Starts an injury when the explicit roll falls under the threshold.
 * Threshold is a probability per day in [0, 1]. Nothing here draws randomness; callers pass `roll`.
 */
export function maybeStartInjury(input: {
  health: PlayerHealth;
  day: number;
  roll: number;
  threshold: number;
  injuryKind: string;
  durationDays: number;
}): { readonly health: PlayerHealth; readonly events: readonly HealthEvent[] } {
  if (input.roll < 0 || input.roll >= 1) throw new RangeError('roll must be in [0, 1).');
  if (input.threshold < 0 || input.threshold > 1) throw new RangeError('threshold must be in [0, 1].');
  if (!Number.isInteger(input.durationDays) || input.durationDays <= 0) {
    throw new RangeError('durationDays must be a positive integer.');
  }
  if (input.health.injuryDaysRemaining > 0 || input.roll >= input.threshold) {
    return Object.freeze({ health: input.health, events: Object.freeze([]) });
  }
  return Object.freeze({
    health: createPlayerHealth({
      playerId: input.health.playerId,
      condition: input.health.condition,
      injuryDaysRemaining: input.durationDays,
      injuryKind: input.injuryKind,
    }),
    events: Object.freeze([
      Object.freeze({ day: input.day, playerId: input.health.playerId, kind: 'INJURY_STARTED', causeRuleVersion: HEALTH_RULES_VERSION }),
    ]),
  });
}
