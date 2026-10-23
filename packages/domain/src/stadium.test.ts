import { describe, expect, it } from 'vitest';
import { calculateMatchAttendance, STADIUM_PARAMETERS_V1, STADIUM_RULES_VERSION } from './index';

const base = { capacity: 40_000, demandPercent: 100, roll: 0.5, currency: 'EUR' };

describe('match attendance', () => {
  it('never exceeds capacity, even with very high demand', () => {
    const result = calculateMatchAttendance({ ...base, demandPercent: 150, roll: 0.99 });
    expect(result.attendance).toBe(40_000);
    expect(result.atCapacity).toBe(true);
  });

  it('is deterministic for the same explicit inputs', () => {
    expect(calculateMatchAttendance(base)).toEqual(calculateMatchAttendance(base));
  });

  it('applies symmetric variation around demand, bounded by the documented points', () => {
    const v = STADIUM_PARAMETERS_V1.variationPercentPoints;
    const low = calculateMatchAttendance({ ...base, roll: 0 });
    const high = calculateMatchAttendance({ ...base, roll: 0.9999 });
    expect(low.attendance).toBe(Math.floor((40_000 * (100 - v)) / 100));
    expect(high.attendance).toBe(Math.min(40_000, Math.floor((40_000 * (100 + v)) / 100)));
  });

  it('floors attendance rather than rounding up', () => {
    const result = calculateMatchAttendance({ capacity: 3, demandPercent: 50, roll: 0.5, currency: 'EUR' });
    expect(result.attendance).toBe(Math.floor((3 * 50) / 100));
  });

  it('gives zero attendance and zero revenue for zero capacity', () => {
    const result = calculateMatchAttendance({ ...base, capacity: 0 });
    expect(result.attendance).toBe(0);
    expect(result.atCapacity).toBe(false);
    expect(result.revenue.minorUnits).toBe(0n);
  });

  it('computes revenue exactly in minor units with a currency-tagged amount', () => {
    const result = calculateMatchAttendance({ ...base, capacity: 1_000, demandPercent: 100, roll: 0.5 });
    expect(result.revenue.minorUnits).toBe(STADIUM_PARAMETERS_V1.ticketPriceMinorUnits * BigInt(result.attendance));
    expect(result.revenue.currency).toBe('EUR');
    expect(result.rulesVersion).toBe(STADIUM_RULES_VERSION);
  });

  it('rejects invalid capacity, demand, roll and currency', () => {
    expect(() => calculateMatchAttendance({ ...base, capacity: -1 })).toThrow(/non-negative/);
    expect(() => calculateMatchAttendance({ ...base, capacity: 10.5 })).toThrow(/non-negative/);
    expect(() => calculateMatchAttendance({ ...base, demandPercent: 151 })).toThrow(/between 0 and 150/);
    expect(() => calculateMatchAttendance({ ...base, roll: 1 })).toThrow(RangeError);
    expect(() => calculateMatchAttendance({ ...base, currency: 'EURO' })).toThrow(/3-letter/);
  });
});
