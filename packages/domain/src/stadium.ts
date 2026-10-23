import { DomainValidationError, assertNonEmpty } from './errors';
import { money, type Money } from './value-objects';

/** Version of the stadium rules. Stored with every match result so history can be explained later. */
export const STADIUM_RULES_VERSION = 1;

/**
 * Fixed, documented parameters for version 1 of the rules.
 * Values are in minor units of the career currency (e.g. cents). They are not derived from the game.
 */
export const STADIUM_PARAMETERS_V1 = Object.freeze({
  /** Base ticket price in minor units. */
  ticketPriceMinorUnits: 3_000n,
  /** Demand is a percentage of capacity, bounded to this range. */
  demandPercentMin: 0,
  demandPercentMax: 150,
  /** Random attendance variation, in whole percentage points, applied symmetrically. */
  variationPercentPoints: 5,
});

export interface StadiumMatchInput {
  readonly capacity: number;
  /** Demand as a percentage of capacity (100 means demand equals capacity). */
  readonly demandPercent: number;
  /**
   * Explicit random value in [0, 1) supplied by the caller from the seeded generator.
   * This module never draws randomness itself.
   */
  readonly roll: number;
  readonly currency: string;
}

export interface MatchAttendance {
  readonly rulesVersion: number;
  readonly capacity: number;
  readonly attendance: number;
  readonly atCapacity: boolean;
  readonly ticketPrice: Money;
  readonly revenue: Money;
}

export function calculateMatchAttendance(input: StadiumMatchInput): MatchAttendance {
  if (!Number.isInteger(input.capacity) || input.capacity < 0) {
    throw new DomainValidationError('INVALID_CAPACITY', 'capacity must be a non-negative integer.');
  }
  const { demandPercentMin, demandPercentMax, variationPercentPoints, ticketPriceMinorUnits } = STADIUM_PARAMETERS_V1;
  if (!Number.isInteger(input.demandPercent) || input.demandPercent < demandPercentMin || input.demandPercent > demandPercentMax) {
    throw new DomainValidationError('INVALID_DEMAND', `demandPercent must be an integer between ${demandPercentMin} and ${demandPercentMax}.`);
  }
  if (!(input.roll >= 0 && input.roll < 1)) {
    throw new RangeError('roll must be in [0, 1).');
  }
  const currency = assertNonEmpty(input.currency, 'currency');

  // Whole-point variation in [-variation, +variation]; integer arithmetic only.
  const span = variationPercentPoints * 2 + 1;
  const variation = Math.floor(input.roll * span) - variationPercentPoints;
  const effectivePercent = Math.max(demandPercentMin, input.demandPercent + variation);

  // attendance = capacity * effectivePercent / 100, floored, then capped at capacity.
  const rawAttendance = Math.floor((input.capacity * effectivePercent) / 100);
  const attendance = Math.min(input.capacity, rawAttendance);

  return Object.freeze({
    rulesVersion: STADIUM_RULES_VERSION,
    capacity: input.capacity,
    attendance,
    atCapacity: attendance === input.capacity && input.capacity > 0,
    ticketPrice: money(ticketPriceMinorUnits, currency),
    revenue: money(ticketPriceMinorUnits * BigInt(attendance), currency),
  });
}
