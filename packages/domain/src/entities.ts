import { DomainValidationError, assertNonEmpty } from './errors';
import {
  boundedRating,
  entityId,
  money,
  nonNegativeInteger,
  positiveInteger,
  provenance,
  type Money,
  type Provenance,
  type ProvenanceKind,
} from './value-objects';

export interface Career {
  readonly id: string;
  readonly name: string;
  readonly currentSeason: string;
  readonly controlledClubId: string | null;
  readonly randomSeed: string;
  readonly createdAt: string;
}

export function createCareer(input: Career): Career {
  return Object.freeze({
    id: entityId(input.id),
    name: assertNonEmpty(input.name, 'name'),
    currentSeason: assertNonEmpty(input.currentSeason, 'currentSeason'),
    controlledClubId: input.controlledClubId === null ? null : entityId(input.controlledClubId, 'controlledClubId'),
    randomSeed: assertNonEmpty(input.randomSeed, 'randomSeed'),
    createdAt: validTimestamp(input.createdAt, 'createdAt'),
  });
}

export interface Club {
  readonly id: string;
  readonly careerId: string;
  readonly name: string;
  readonly countryCode: string;
  readonly competitionId: string;
  readonly reputation: number;
  readonly createdAt: string;
}

export function createClub(input: Club): Club {
  const countryCode = input.countryCode.trim().toUpperCase();
  if (!/^[A-Z]{2,3}$/.test(countryCode)) {
    throw new DomainValidationError('INVALID_COUNTRY_CODE', 'countryCode must contain 2 or 3 letters.');
  }
  return Object.freeze({
    id: entityId(input.id),
    careerId: entityId(input.careerId, 'careerId'),
    name: assertNonEmpty(input.name, 'name'),
    countryCode,
    competitionId: entityId(input.competitionId, 'competitionId'),
    reputation: boundedRating(input.reputation, 'reputation'),
    createdAt: validTimestamp(input.createdAt, 'createdAt'),
  });
}

export interface Player {
  readonly id: string;
  readonly careerId: string;
  readonly currentClubId: string | null;
  readonly name: string;
  readonly birthDate: string | null;
  readonly overall: number | null;
  readonly potential: number | null;
  readonly heightCm: number | null;
  readonly weightKg: number | null;
  readonly provenanceKind: ProvenanceKind;
  readonly provenanceSource: string;
  readonly provenanceRecordedAt: string;
  readonly originalProvenanceKind?: ProvenanceKind | null;
  readonly originalProvenanceSource?: string | null;
  readonly originalProvenanceRecordedAt?: string | null;
}

export function createPlayer(input: Player): Player {
  if (input.birthDate !== null) {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(input.birthDate);
    if (!match) throw new DomainValidationError('INVALID_BIRTH_DATE', 'birthDate must use YYYY-MM-DD.');
    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);
    const candidate = new Date(Date.UTC(year, month - 1, day));
    if (candidate.getUTCFullYear() !== year || candidate.getUTCMonth() !== month - 1 || candidate.getUTCDate() !== day) {
      throw new DomainValidationError('INVALID_BIRTH_DATE', 'birthDate must be a real calendar date.');
    }
  }
  if (input.heightCm !== null) positiveInteger(input.heightCm, 'heightCm');
  if (input.weightKg !== null) positiveInteger(input.weightKg, 'weightKg');
  const validatedProvenance = provenance(input.provenanceKind, input.provenanceSource, input.provenanceRecordedAt);
  const originalProvenanceKind = input.originalProvenanceKind ?? null;
  const originalProvenanceSource = input.originalProvenanceSource ?? null;
  const originalProvenanceRecordedAt = input.originalProvenanceRecordedAt ?? null;
  const hasOriginalProvenance = originalProvenanceKind !== null
    || originalProvenanceSource !== null
    || originalProvenanceRecordedAt !== null;
  if (hasOriginalProvenance && (
    originalProvenanceKind === null
    || originalProvenanceSource === null
    || originalProvenanceRecordedAt === null
  )) {
    throw new DomainValidationError('INCOMPLETE_ORIGINAL_PROVENANCE', 'Original provenance fields must be all set or all null.');
  }
  if (originalProvenanceKind !== null) {
    provenance(originalProvenanceKind, originalProvenanceSource!, originalProvenanceRecordedAt!);
  }
  return Object.freeze({
    id: entityId(input.id),
    careerId: entityId(input.careerId, 'careerId'),
    currentClubId: input.currentClubId === null ? null : entityId(input.currentClubId, 'currentClubId'),
    name: assertNonEmpty(input.name, 'name'),
    birthDate: input.birthDate,
    overall: input.overall === null ? null : boundedRating(input.overall, 'overall'),
    potential: input.potential === null ? null : boundedRating(input.potential, 'potential'),
    heightCm: input.heightCm,
    weightKg: input.weightKg,
    provenanceKind: validatedProvenance.kind,
    provenanceSource: validatedProvenance.source,
    provenanceRecordedAt: validatedProvenance.recordedAt,
    originalProvenanceKind,
    originalProvenanceSource: originalProvenanceSource === null
      ? null
      : assertNonEmpty(originalProvenanceSource, 'originalProvenanceSource'),
    originalProvenanceRecordedAt: originalProvenanceRecordedAt === null
      ? null
      : validTimestamp(originalProvenanceRecordedAt, 'originalProvenanceRecordedAt'),
  });
}

export type FixtureStatus = 'SCHEDULED' | 'COMPLETED' | 'POSTPONED' | 'CANCELLED';

export interface Fixture {
  readonly id: string;
  readonly careerId: string;
  readonly competitionId: string;
  readonly season: string;
  readonly homeClubId: string;
  readonly awayClubId: string;
  readonly kickoffAt: string;
  readonly timeZone: string;
  readonly status: FixtureStatus;
  readonly homeScore: number | null;
  readonly awayScore: number | null;
  readonly provenanceKind: ProvenanceKind | null;
  readonly provenanceSource: string | null;
  readonly provenanceRecordedAt: string | null;
}

export function createFixture(input: Fixture): Fixture {
  if (input.homeClubId === input.awayClubId) {
    throw new DomainValidationError('SAME_FIXTURE_CLUB', 'Home and away clubs must differ.');
  }
  const hasScore = input.homeScore !== null || input.awayScore !== null;
  if ((input.status === 'COMPLETED') !== hasScore || (hasScore && (input.homeScore === null || input.awayScore === null))) {
    throw new DomainValidationError('FIXTURE_RESULT_STATUS_MISMATCH', 'A result is required only for completed fixtures.');
  }
  if (hasScore) {
    nonNegativeInteger(input.homeScore as number, 'homeScore');
    nonNegativeInteger(input.awayScore as number, 'awayScore');
    if (input.provenanceKind === null || input.provenanceSource === null || input.provenanceRecordedAt === null) {
      throw new DomainValidationError('RESULT_PROVENANCE_REQUIRED', 'Completed fixture results require provenance.');
    }
  }
  if (input.provenanceKind !== null && input.provenanceSource !== null && input.provenanceRecordedAt !== null) {
    provenance(input.provenanceKind, input.provenanceSource, input.provenanceRecordedAt);
  }
  if (![ 'SCHEDULED', 'COMPLETED', 'POSTPONED', 'CANCELLED' ].includes(input.status)) {
    throw new DomainValidationError('INVALID_FIXTURE_STATUS', 'Fixture status is not supported.');
  }
  try {
    new Intl.DateTimeFormat('en', { timeZone: input.timeZone });
  } catch {
    throw new DomainValidationError('INVALID_TIME_ZONE', 'timeZone must be a valid IANA time zone.');
  }
  return Object.freeze({
    id: entityId(input.id),
    careerId: entityId(input.careerId, 'careerId'),
    competitionId: entityId(input.competitionId, 'competitionId'),
    season: assertNonEmpty(input.season, 'season'),
    homeClubId: entityId(input.homeClubId, 'homeClubId'),
    awayClubId: entityId(input.awayClubId, 'awayClubId'),
    kickoffAt: validTimestamp(input.kickoffAt, 'kickoffAt'),
    timeZone: input.timeZone,
    status: input.status,
    homeScore: input.homeScore,
    awayScore: input.awayScore,
    provenanceKind: input.provenanceKind,
    provenanceSource: input.provenanceSource,
    provenanceRecordedAt: input.provenanceRecordedAt,
  });
}

export type FinanceDirection = 'INCOME' | 'EXPENSE';

export interface FinanceEntry {
  readonly id: string;
  readonly careerId: string;
  readonly clubId: string;
  readonly direction: FinanceDirection;
  readonly category: string;
  readonly amount: Money;
  readonly occurredAt: string;
  readonly reference: string | null;
  readonly provenance: Provenance;
}

export function createFinanceEntry(input: {
  id: string;
  careerId: string;
  clubId: string;
  direction: FinanceDirection;
  category: string;
  minorUnits: bigint;
  currency: string;
  occurredAt: string;
  reference?: string | null;
  provenanceKind: ProvenanceKind;
  provenanceSource: string;
  provenanceRecordedAt: string;
}): FinanceEntry {
  if (input.minorUnits <= 0n) {
    throw new DomainValidationError('INVALID_FINANCE_AMOUNT', 'Finance entry amount must be positive.');
  }
  if (input.direction !== 'INCOME' && input.direction !== 'EXPENSE') {
    throw new DomainValidationError('INVALID_FINANCE_DIRECTION', 'Finance direction is not supported.');
  }
  return Object.freeze({
    id: entityId(input.id),
    careerId: entityId(input.careerId, 'careerId'),
    clubId: entityId(input.clubId, 'clubId'),
    direction: input.direction,
    category: assertNonEmpty(input.category, 'category'),
    amount: money(input.minorUnits, input.currency),
    occurredAt: validTimestamp(input.occurredAt, 'occurredAt'),
    reference: input.reference == null ? null : assertNonEmpty(input.reference, 'reference'),
    provenance: provenance(input.provenanceKind, input.provenanceSource, input.provenanceRecordedAt),
  });
}

export function calculateBalance(entries: readonly FinanceEntry[], currency: string): Money {
  const normalizedCurrency = money(0n, currency).currency;
  let balance = 0n;
  for (const entry of entries) {
    if (entry.amount.currency !== normalizedCurrency) {
      throw new DomainValidationError('CURRENCY_MISMATCH', 'Balance entries must use one currency.');
    }
    balance += entry.direction === 'INCOME' ? entry.amount.minorUnits : -entry.amount.minorUnits;
  }
  return money(balance, normalizedCurrency);
}

function validTimestamp(value: string, field: string): string {
  if (!Number.isFinite(Date.parse(value))) {
    throw new DomainValidationError('INVALID_TIMESTAMP', `${field} must be an ISO-compatible timestamp.`);
  }
  return new Date(value).toISOString();
}
