import { DomainValidationError, assertNonEmpty } from './errors';

export type CurrencyCode = string & { readonly __brand: 'CurrencyCode' };

export interface Money {
  readonly minorUnits: bigint;
  readonly currency: CurrencyCode;
}

export function currencyCode(value: string): CurrencyCode {
  const normalized = value.trim().toUpperCase();
  if (!/^[A-Z]{3}$/.test(normalized)) {
    throw new DomainValidationError('INVALID_CURRENCY', 'Currency must be a 3-letter code.');
  }
  return normalized as CurrencyCode;
}

export function money(minorUnits: bigint, currency: string): Money {
  return Object.freeze({ minorUnits, currency: currencyCode(currency) });
}

export function addMoney(left: Money, right: Money): Money {
  if (left.currency !== right.currency) {
    throw new DomainValidationError('CURRENCY_MISMATCH', 'Cannot add values in different currencies.');
  }
  return money(left.minorUnits + right.minorUnits, left.currency);
}

export type ProvenanceKind =
  | 'USER_ENTERED'
  | 'IMPORTED_EXTERNAL'
  | 'READ_FROM_GAME'
  | 'SIMULATED'
  | 'DERIVED';

export interface Provenance {
  readonly kind: ProvenanceKind;
  readonly source: string;
  readonly recordedAt: string;
}

export function provenance(kind: ProvenanceKind, source: string, recordedAt: string): Provenance {
  const normalizedSource = assertNonEmpty(source, 'source');
  if (!Number.isFinite(Date.parse(recordedAt))) {
    throw new DomainValidationError('INVALID_TIMESTAMP', 'recordedAt must be an ISO-compatible timestamp.');
  }
  return Object.freeze({ kind, source: normalizedSource, recordedAt });
}

export function boundedRating(value: number, field = 'rating'): number {
  if (!Number.isFinite(value) || value < 0 || value > 100) {
    throw new DomainValidationError('RATING_OUT_OF_RANGE', `${field} must be between 0 and 100.`);
  }
  return value;
}

export function positiveInteger(value: number, field: string): number {
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new DomainValidationError('INVALID_POSITIVE_INTEGER', `${field} must be a positive integer.`);
  }
  return value;
}

export function nonNegativeInteger(value: number, field: string): number {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new DomainValidationError('INVALID_NON_NEGATIVE_INTEGER', `${field} must be a non-negative integer.`);
  }
  return value;
}

export function entityId(value: string, field = 'id'): string {
  return assertNonEmpty(value, field);
}
