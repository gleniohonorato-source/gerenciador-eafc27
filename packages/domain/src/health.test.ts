import { describe, expect, it } from 'vitest';
import {
  CONDITION_MAX,
  CONDITION_RECOVERY_PER_DAY,
  HEALTH_RULES_VERSION,
  advanceHealthOneDay,
  createPlayerHealth,
  maybeStartInjury,
  type PlayerHealth,
} from './index';

function fit(overrides: Partial<PlayerHealth> = {}): PlayerHealth {
  return createPlayerHealth({
    playerId: 'p-1', condition: 80, injuryDaysRemaining: 0, injuryKind: null, ...overrides,
  });
}

describe('player health validation', () => {
  it('rejects condition outside the integer 0–100 range', () => {
    expect(() => fit({ condition: 101 })).toThrow(/between 0 and 100/);
    expect(() => fit({ condition: -1 })).toThrow(/between 0 and 100/);
    expect(() => fit({ condition: 50.5 })).toThrow(/integer/);
  });

  it('requires a kind for an active injury and forbids one when fit', () => {
    expect(() => fit({ injuryDaysRemaining: 3, injuryKind: null })).toThrow(/must have a kind/);
    expect(() => fit({ injuryDaysRemaining: 0, injuryKind: 'hamstring' })).toThrow(/must not carry/);
  });

  it('rejects negative or fractional injury days', () => {
    expect(() => fit({ injuryDaysRemaining: -1 })).toThrow(/non-negative integer/);
    expect(() => fit({ injuryDaysRemaining: 1.5, injuryKind: 'x' })).toThrow(/non-negative integer/);
  });
});

describe('daily advance', () => {
  it('recovers condition toward the maximum and never exceeds it', () => {
    const tired = fit({ condition: 40 });
    expect(advanceHealthOneDay(tired, 0).health.condition).toBe(40 + CONDITION_RECOVERY_PER_DAY);
    const nearMax = fit({ condition: CONDITION_MAX - 1 });
    expect(advanceHealthOneDay(nearMax, 0).health.condition).toBe(CONDITION_MAX);
  });

  it('counts down an active injury and emits a recovery event on the last day', () => {
    const injured = fit({ injuryDaysRemaining: 2, injuryKind: 'hamstring' });
    const first = advanceHealthOneDay(injured, 10);
    expect(first.health.injuryDaysRemaining).toBe(1);
    expect(first.health.injuryKind).toBe('hamstring');
    expect(first.events).toHaveLength(0);

    const recovered = advanceHealthOneDay(first.health, 11);
    expect(recovered.health.injuryDaysRemaining).toBe(0);
    expect(recovered.health.injuryKind).toBeNull();
    expect(recovered.events).toEqual([
      { day: 11, playerId: 'p-1', kind: 'INJURY_RECOVERED', causeRuleVersion: HEALTH_RULES_VERSION },
    ]);
  });

  it('is deterministic: the same input yields the same output', () => {
    const start = fit({ condition: 60, injuryDaysRemaining: 4, injuryKind: 'knee' });
    expect(advanceHealthOneDay(start, 5)).toEqual(advanceHealthOneDay(start, 5));
  });
});

describe('injury start', () => {
  const base = { day: 3, injuryKind: 'ankle', durationDays: 5, threshold: 0.1 };

  it('starts an injury when the explicit roll is under the threshold', () => {
    const result = maybeStartInjury({ ...base, health: fit(), roll: 0.05 });
    expect(result.health.injuryDaysRemaining).toBe(5);
    expect(result.health.injuryKind).toBe('ankle');
    expect(result.events).toEqual([
      { day: 3, playerId: 'p-1', kind: 'INJURY_STARTED', causeRuleVersion: HEALTH_RULES_VERSION },
    ]);
  });

  it('does not start an injury at or above the threshold', () => {
    const result = maybeStartInjury({ ...base, health: fit(), roll: 0.1 });
    expect(result.health.injuryDaysRemaining).toBe(0);
    expect(result.events).toHaveLength(0);
  });

  it('does not stack a second injury on an injured player', () => {
    const injured = fit({ injuryDaysRemaining: 2, injuryKind: 'knee' });
    const result = maybeStartInjury({ ...base, health: injured, roll: 0 });
    expect(result.health).toBe(injured);
    expect(result.events).toHaveLength(0);
  });

  it('rejects a roll outside [0, 1) and an invalid threshold or duration', () => {
    expect(() => maybeStartInjury({ ...base, health: fit(), roll: 1 })).toThrow(RangeError);
    expect(() => maybeStartInjury({ ...base, health: fit(), roll: 0.1, threshold: 1.5 })).toThrow(RangeError);
    expect(() => maybeStartInjury({ ...base, health: fit(), roll: 0.1, durationDays: 0 })).toThrow(RangeError);
  });
});
