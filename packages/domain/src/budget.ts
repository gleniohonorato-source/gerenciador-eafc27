import { DomainValidationError, assertNonEmpty } from './errors';
import type { FinanceEntry } from './entities';
import { money, type Money } from './value-objects';

/** Version of the budget rules. Stored with every evaluation to explain results later. */
export const BUDGET_RULES_VERSION = 1;

export interface BudgetLimit {
  readonly careerId: string;
  readonly clubId: string;
  readonly category: string;
  /** Calendar month in YYYY-MM form. */
  readonly month: string;
  readonly limit: Money;
}

export type BudgetStatus = 'WITHIN_LIMIT' | 'WARNING' | 'OVER_LIMIT';

export interface BudgetEvaluation {
  readonly rulesVersion: number;
  readonly careerId: string;
  readonly clubId: string;
  readonly category: string;
  readonly month: string;
  readonly spent: Money;
  readonly limit: Money;
  readonly remaining: Money;
  readonly status: BudgetStatus;
}

/** Share of the limit at which a warning is raised, expressed in basis points (8000 = 80%). */
export const BUDGET_WARNING_BASIS_POINTS = 8000n;

export function createBudgetLimit(input: {
  careerId: string;
  clubId: string;
  category: string;
  month: string;
  minorUnits: bigint;
  currency: string;
}): BudgetLimit {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(input.month)) {
    throw new DomainValidationError('INVALID_BUDGET_MONTH', 'Budget month must be in YYYY-MM form.');
  }
  if (input.minorUnits < 0n) {
    throw new DomainValidationError('INVALID_BUDGET_LIMIT', 'Budget limit must not be negative.');
  }
  return Object.freeze({
    careerId: assertNonEmpty(input.careerId, 'careerId'),
    clubId: assertNonEmpty(input.clubId, 'clubId'),
    category: assertNonEmpty(input.category, 'category'),
    month: input.month,
    limit: money(input.minorUnits, input.currency),
  });
}

/**
 * Evaluates spending against a limit for one club, category and month.
 * Only EXPENSE entries count against the budget; INCOME entries are ignored here.
 * Every entry must share the limit's currency; a different currency is rejected rather than converted.
 */
export function evaluateBudget(limit: BudgetLimit, entries: readonly FinanceEntry[]): BudgetEvaluation {
  let spentUnits = 0n;
  for (const entry of entries) {
    if (entry.careerId !== limit.careerId || entry.clubId !== limit.clubId) continue;
    if (entry.category !== limit.category) continue;
    if (!entry.occurredAt.startsWith(limit.month)) continue;
    if (entry.direction !== 'EXPENSE') continue;
    if (entry.amount.currency !== limit.limit.currency) {
      throw new DomainValidationError('CURRENCY_MISMATCH', 'Budget entries must use the budget currency.');
    }
    spentUnits += entry.amount.minorUnits;
  }

  const spent = money(spentUnits, limit.limit.currency);
  const remainingUnits = limit.limit.minorUnits - spentUnits;
  const status = statusFor(spentUnits, limit.limit.minorUnits);

  return Object.freeze({
    rulesVersion: BUDGET_RULES_VERSION,
    careerId: limit.careerId,
    clubId: limit.clubId,
    category: limit.category,
    month: limit.month,
    spent,
    limit: limit.limit,
    remaining: money(remainingUnits, limit.limit.currency),
    status,
  });
}

function statusFor(spent: bigint, limit: bigint): BudgetStatus {
  if (spent > limit) return 'OVER_LIMIT';
  if (limit === 0n) return spent > 0n ? 'OVER_LIMIT' : 'WITHIN_LIMIT';
  // Integer comparison avoids floating point: spent * 10000 >= limit * warningBasisPoints.
  if (spent * 10000n >= limit * BUDGET_WARNING_BASIS_POINTS) return 'WARNING';
  return 'WITHIN_LIMIT';
}
