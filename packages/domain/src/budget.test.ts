import { describe, expect, it } from 'vitest';
import {
  BUDGET_RULES_VERSION,
  createBudgetLimit,
  createFinanceEntry,
  evaluateBudget,
  type FinanceEntry,
} from './index';

const stamp = '2026-10-10T12:00:00.000Z';

function entry(overrides: Partial<Parameters<typeof createFinanceEntry>[0]> & { id: string }): FinanceEntry {
  return createFinanceEntry({
    careerId: 'c-1', clubId: 'club-1', direction: 'EXPENSE', category: 'wages',
    minorUnits: 10_000n, currency: 'EUR', occurredAt: '2026-10-05T10:00:00.000Z',
    provenanceKind: 'USER_ENTERED', provenanceSource: 'manual', provenanceRecordedAt: stamp,
    ...overrides,
  });
}

function limitOf(minorUnits: bigint, overrides: Partial<Parameters<typeof createBudgetLimit>[0]> = {}) {
  return createBudgetLimit({
    careerId: 'c-1', clubId: 'club-1', category: 'wages', month: '2026-10',
    minorUnits, currency: 'EUR', ...overrides,
  });
}

describe('budget limits', () => {
  it('rejects malformed months and negative limits', () => {
    expect(() => limitOf(100n, { month: '2026-13' })).toThrow(/YYYY-MM/);
    expect(() => limitOf(100n, { month: '10-2026' })).toThrow(/YYYY-MM/);
    expect(() => limitOf(-1n)).toThrow(/must not be negative/);
  });

  it('rejects an unknown or malformed currency', () => {
    expect(() => limitOf(100n, { currency: 'EURO' })).toThrow(/3-letter/);
  });

  it('rejects an empty category', () => {
    expect(() => limitOf(100n, { category: '  ' })).toThrow();
  });
});

describe('budget evaluation', () => {
  it('sums only matching expenses for the club, category and month', () => {
    const limit = limitOf(50_000n);
    const entries = [
      entry({ id: 'e1', minorUnits: 10_000n }),
      entry({ id: 'e2', minorUnits: 5_000n, occurredAt: '2026-10-20T00:00:00.000Z' }),
      entry({ id: 'other-month', minorUnits: 99_000n, occurredAt: '2026-09-30T23:00:00.000Z' }),
      entry({ id: 'other-category', minorUnits: 99_000n, category: 'transfers' }),
      entry({ id: 'other-club', minorUnits: 99_000n, clubId: 'club-2' }),
      entry({ id: 'income', minorUnits: 99_000n, direction: 'INCOME' }),
    ];
    const result = evaluateBudget(limit, entries);
    expect(result.spent.minorUnits).toBe(15_000n);
    expect(result.remaining.minorUnits).toBe(35_000n);
    expect(result.status).toBe('WITHIN_LIMIT');
    expect(result.rulesVersion).toBe(BUDGET_RULES_VERSION);
  });

  it('warns at the 80% threshold using exact integer arithmetic', () => {
    const limit = limitOf(10_000n);
    expect(evaluateBudget(limit, [entry({ id: 'a', minorUnits: 7_999n })]).status).toBe('WITHIN_LIMIT');
    expect(evaluateBudget(limit, [entry({ id: 'a', minorUnits: 8_000n })]).status).toBe('WARNING');
  });

  it('is over limit only when spending strictly exceeds the limit', () => {
    const limit = limitOf(10_000n);
    expect(evaluateBudget(limit, [entry({ id: 'a', minorUnits: 10_000n })]).status).toBe('WARNING');
    const over = evaluateBudget(limit, [entry({ id: 'a', minorUnits: 10_001n })]);
    expect(over.status).toBe('OVER_LIMIT');
    expect(over.remaining.minorUnits).toBe(-1n);
  });

  it('treats a zero limit as over limit as soon as anything is spent', () => {
    expect(evaluateBudget(limitOf(0n), []).status).toBe('WITHIN_LIMIT');
    expect(evaluateBudget(limitOf(0n), [entry({ id: 'a', minorUnits: 1n })]).status).toBe('OVER_LIMIT');
  });

  it('rejects matching entries in a different currency instead of converting them', () => {
    const usd = entry({ id: 'usd', currency: 'USD' });
    expect(() => evaluateBudget(limitOf(10_000n), [usd])).toThrow(/budget currency/);
  });

  it('ignores differing-currency entries that do not match the budget scope', () => {
    const usdOtherCategory = entry({ id: 'usd', currency: 'USD', category: 'transfers' });
    expect(evaluateBudget(limitOf(10_000n), [usdOtherCategory]).spent.minorUnits).toBe(0n);
  });

  it('is deterministic and independent of entry order', () => {
    const limit = limitOf(50_000n);
    const a = entry({ id: 'a', minorUnits: 1_000n });
    const b = entry({ id: 'b', minorUnits: 2_500n });
    expect(evaluateBudget(limit, [a, b])).toEqual(evaluateBudget(limit, [b, a]));
  });
});
