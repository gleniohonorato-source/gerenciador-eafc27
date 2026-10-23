import {
  createCareer,
  createClub,
  createFixture,
  createPlayer,
  DomainValidationError,
  type Career,
  type Club,
  type Fixture,
  type Player,
  type ProvenanceKind,
} from '@gerenciador/domain';

export const CAREER_PACKAGE_FORMAT = 'gerenciador-eafc-career';
export const CAREER_PACKAGE_VERSION = 1;
export const MAX_IMPORT_BYTES = 5 * 1024 * 1024;

export interface ImportIssue {
  readonly code: string;
  readonly path: string;
  readonly message: string;
  readonly severity: 'ERROR' | 'WARNING';
}

export interface ImportConflict {
  readonly entityType: 'CAREER' | 'CLUB' | 'PLAYER' | 'FIXTURE';
  readonly identity: string;
  readonly message: string;
  readonly existingId?: string;
  readonly incomingId: string;
}

export interface CareerPackageV1 {
  readonly format: typeof CAREER_PACKAGE_FORMAT;
  readonly version: typeof CAREER_PACKAGE_VERSION;
  readonly exportedAt: string;
  readonly career: Career;
  readonly clubs: readonly Club[];
  readonly players: readonly Player[];
  readonly fixtures: readonly Fixture[];
}

export interface CareerImportRepositories {
  readonly career: {
    findById(id: string): Promise<Career | null>;
    save(entity: Career): Promise<void>;
  };
  readonly clubs: {
    listByCareer(careerId: string): Promise<readonly Club[]>;
    save(entity: Club): Promise<void>;
  };
  readonly players: {
    listByCareer(careerId: string): Promise<readonly Player[]>;
    save(entity: Player): Promise<void>;
  };
  readonly fixtures: {
    listByCareer(careerId: string): Promise<readonly Fixture[]>;
    save(entity: Fixture): Promise<void>;
  };
  /** Executes operations against transaction-scoped repositories atomically in the application database. */
  readonly transaction: <T>(operation: (repositories: Omit<CareerImportRepositories, 'transaction'>) => Promise<T>) => Promise<T>;
}

export interface ImportPreview {
  readonly package: CareerPackageV1;
  readonly counts: {
    readonly clubs: number;
    readonly players: number;
    readonly fixtures: number;
  };
  readonly issues: readonly ImportIssue[];
  readonly conflicts: readonly ImportConflict[];
  readonly digest: string;
}

export interface ImportResult {
  readonly importId: string;
  readonly careerId: string;
  readonly saved: {
    readonly clubs: number;
    readonly players: number;
    readonly fixtures: number;
  };
}

export function parseCareerPackageText(text: string): CareerPackageV1 {
  // UTF-16 code units; each takes at most 3 UTF-8 bytes, so this bound is conservative.
  if (text.length * 3 > MAX_IMPORT_BYTES) {
    throw new DomainValidationError('IMPORT_TOO_LARGE', `Import files must not exceed ${MAX_IMPORT_BYTES} bytes.`);
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(text) as unknown;
  } catch {
    throw new DomainValidationError('IMPORT_INVALID_JSON', 'Import file is not valid JSON.');
  }
  return validateCareerPackage(parsed);
}

export function validateCareerPackage(value: unknown): CareerPackageV1 {
  if (!isRecord(value)) throw new DomainValidationError('IMPORT_INVALID_ROOT', 'Import root must be an object.');
  if (value['format'] !== CAREER_PACKAGE_FORMAT || value['version'] !== CAREER_PACKAGE_VERSION) {
    throw new DomainValidationError('IMPORT_UNSUPPORTED_FORMAT', 'Import format or version is not supported.');
  }
  const exportedAt = isoTimestamp(value['exportedAt'], 'exportedAt');
  if (!isRecord(value['career']) || !Array.isArray(value['clubs']) || !Array.isArray(value['players']) || !Array.isArray(value['fixtures'])) {
    throw new DomainValidationError('IMPORT_INVALID_COLLECTIONS', 'Career package must include career, clubs, players and fixtures.');
  }

  const career = normalizeCareer(value['career']);
  const clubs = value['clubs'].map(normalizeClub);
  const players = value['players'].map(normalizePlayer);
  const fixtures = value['fixtures'].map(normalizeFixture);
  if (clubs.some((club) => club.careerId !== career.id) || players.some((player) => player.careerId !== career.id) || fixtures.some((fixture) => fixture.careerId !== career.id)) {
    throw new DomainValidationError('IMPORT_CAREER_MISMATCH', 'Every entity in the package must belong to the imported career.');
  }
  assertUnique(clubs.map((item) => item.id), 'club IDs');
  assertUnique(players.map((item) => item.id), 'player IDs');
  assertUnique(fixtures.map((item) => item.id), 'fixture IDs');
  const clubIds = new Set(clubs.map((club) => club.id));
  if (career.controlledClubId !== null && !clubIds.has(career.controlledClubId)) {
    throw new DomainValidationError('IMPORT_CONTROLLED_CLUB_MISSING', 'Controlled club must exist in the package.');
  }
  for (const player of players) {
    if (player.currentClubId !== null && !clubIds.has(player.currentClubId)) {
      throw new DomainValidationError('IMPORT_PLAYER_CLUB_MISSING', `Player ${player.id} references a missing club.`);
    }
  }
  for (const fixture of fixtures) {
    if (!clubIds.has(fixture.homeClubId) || !clubIds.has(fixture.awayClubId)) {
      throw new DomainValidationError('IMPORT_FIXTURE_CLUB_MISSING', `Fixture ${fixture.id} references a missing club.`);
    }
  }

  return Object.freeze({
    format: CAREER_PACKAGE_FORMAT,
    version: CAREER_PACKAGE_VERSION,
    exportedAt,
    career,
    clubs: Object.freeze(clubs),
    players: Object.freeze(players),
    fixtures: Object.freeze(fixtures),
  });
}

export async function previewCareerImport(text: string, repositories: CareerImportRepositories): Promise<ImportPreview> {
  const careerPackage = parseCareerPackageText(text);
  const [existingCareer, existingClubs, existingPlayers, existingFixtures] = await Promise.all([
    repositories.career.findById(careerPackage.career.id),
    repositories.clubs.listByCareer(careerPackage.career.id),
    repositories.players.listByCareer(careerPackage.career.id),
    repositories.fixtures.listByCareer(careerPackage.career.id),
  ]);
  const issues: ImportIssue[] = [];
  const conflicts: ImportConflict[] = [];
  if (existingCareer && stableJson(existingCareer) !== stableJson(careerPackage.career)) {
    conflicts.push({ entityType: 'CAREER', identity: careerPackage.career.id, existingId: existingCareer.id, incomingId: careerPackage.career.id, message: 'A career with this ID already exists and differs from the import.' });
  }
  collectConflicts('CLUB', existingClubs, careerPackage.clubs, (item) => item.id, (item) => `${item.careerId}:${item.name}`, conflicts);
  collectConflicts('PLAYER', existingPlayers, careerPackage.players, (item) => item.id, (item) => item.id, conflicts);
  collectConflicts('FIXTURE', existingFixtures, careerPackage.fixtures, (item) => item.id, fixtureIdentity, conflicts);
  if (conflicts.length > 0) {
    issues.push({ code: 'IMPORT_CONFLICTS_PRESENT', path: '$', severity: 'WARNING', message: 'Import has conflicts; resolve them before confirming.' });
  }
  return Object.freeze({
    package: careerPackage,
    counts: Object.freeze({ clubs: careerPackage.clubs.length, players: careerPackage.players.length, fixtures: careerPackage.fixtures.length }),
    issues: Object.freeze(issues),
    conflicts: Object.freeze(conflicts),
    digest: await sha256(stableJson({
      package: careerPackage,
      existing: { career: existingCareer, clubs: existingClubs, players: existingPlayers, fixtures: existingFixtures },
    })),
  });
}

export async function confirmCareerImport(
  preview: ImportPreview,
  confirmation: { readonly confirmed: boolean; readonly expectedDigest: string; readonly importId: string },
  repositories: CareerImportRepositories,
): Promise<ImportResult> {
  if (!confirmation.confirmed) throw new DomainValidationError('IMPORT_NOT_CONFIRMED', 'Import must be explicitly confirmed.');
  if (confirmation.expectedDigest !== preview.digest) throw new DomainValidationError('IMPORT_PREVIEW_STALE', 'Import preview changed; review it again before confirming.');
  const latestPreview = await previewCareerImport(JSON.stringify({
    format: CAREER_PACKAGE_FORMAT,
    version: CAREER_PACKAGE_VERSION,
    exportedAt: preview.package.exportedAt,
    career: preview.package.career,
    clubs: preview.package.clubs,
    players: preview.package.players,
    fixtures: preview.package.fixtures,
  }), repositories);
  if (preview.conflicts.length > 0) throw new DomainValidationError('IMPORT_CONFLICTS_UNRESOLVED', 'Resolve all conflicts before confirming the import.');
  if (latestPreview.digest !== preview.digest) throw new DomainValidationError('IMPORT_PREVIEW_STALE', 'Career data changed after preview; review it again before confirming.');
  const importId = nonEmpty(confirmation.importId, 'importId');
  await repositories.transaction(async (transactionRepositories) => {
    const career = preview.package.career;
    await transactionRepositories.career.save({ ...career, controlledClubId: null });
    for (const club of preview.package.clubs) await transactionRepositories.clubs.save(club);
    await transactionRepositories.career.save(career);
    for (const player of preview.package.players) await transactionRepositories.players.save(player);
    for (const fixture of preview.package.fixtures) await transactionRepositories.fixtures.save(fixture);
  });
  return Object.freeze({
    importId,
    careerId: preview.package.career.id,
    saved: Object.freeze({ clubs: preview.counts.clubs, players: preview.counts.players, fixtures: preview.counts.fixtures }),
  });
}

export async function exportCareerPackage(input: {
  readonly career: Career;
  readonly clubs: readonly Club[];
  readonly players: readonly Player[];
  readonly fixtures: readonly Fixture[];
  readonly exportedAt: string;
}): Promise<{ readonly text: string; readonly digest: string }> {
  const pkg = validateCareerPackage({
    format: CAREER_PACKAGE_FORMAT,
    version: CAREER_PACKAGE_VERSION,
    exportedAt: input.exportedAt,
    career: input.career,
    clubs: input.clubs,
    players: input.players,
    fixtures: input.fixtures,
  });
  const text = `${JSON.stringify(pkg, null, 2)}\n`;
  return Object.freeze({ text, digest: await sha256(stableJson(pkg)) });
}

function normalizeCareer(value: unknown): Career {
  if (!isRecord(value)) throw new DomainValidationError('IMPORT_INVALID_CAREER', 'Career must be an object.');
  return createCareer({
    id: stringField(value, 'id'), name: stringField(value, 'name'), currentSeason: stringField(value, 'currentSeason'),
    controlledClubId: nullableStringField(value, 'controlledClubId'), randomSeed: stringField(value, 'randomSeed'),
    createdAt: isoTimestamp(value['createdAt'], 'career.createdAt'),
  });
}

function normalizeClub(value: unknown): Club {
  if (!isRecord(value)) throw new DomainValidationError('IMPORT_INVALID_CLUB', 'Club must be an object.');
  const reputation = value['reputation'];
  if (typeof reputation !== 'number') throw new DomainValidationError('IMPORT_INVALID_CLUB', 'Club reputation must be numeric.');
  return createClub({
    id: stringField(value, 'id'), careerId: stringField(value, 'careerId'), name: stringField(value, 'name'),
    countryCode: stringField(value, 'countryCode'), competitionId: stringField(value, 'competitionId'),
    reputation, createdAt: isoTimestamp(value['createdAt'], 'club.createdAt'),
  });
}

function normalizePlayer(value: unknown): Player {
  if (!isRecord(value)) throw new DomainValidationError('IMPORT_INVALID_PLAYER', 'Player must be an object.');
  const optionalNumber = (field: string): number | null => {
    const candidate = value[field];
    if (candidate === null) return null;
    if (typeof candidate !== 'number') throw new DomainValidationError('IMPORT_INVALID_PLAYER', `Player ${field} must be numeric or null.`);
    return candidate;
  };
  return createPlayer({
    id: stringField(value, 'id'), careerId: stringField(value, 'careerId'), currentClubId: nullableStringField(value, 'currentClubId'),
    name: stringField(value, 'name'), birthDate: nullableStringField(value, 'birthDate'),
    overall: optionalNumber('overall'), potential: optionalNumber('potential'),
    heightCm: optionalNumber('heightCm'), weightKg: optionalNumber('weightKg'),
    provenanceKind: provenanceKindField(value, 'provenanceKind'), provenanceSource: stringField(value, 'provenanceSource'),
    provenanceRecordedAt: isoTimestamp(value['provenanceRecordedAt'], 'player.provenanceRecordedAt'),
    originalProvenanceKind: value['originalProvenanceKind'] === null || value['originalProvenanceKind'] === undefined
      ? null
      : provenanceKindField(value, 'originalProvenanceKind'),
    originalProvenanceSource: value['originalProvenanceSource'] === null || value['originalProvenanceSource'] === undefined
      ? null
      : stringField(value, 'originalProvenanceSource'),
    originalProvenanceRecordedAt: value['originalProvenanceRecordedAt'] === null || value['originalProvenanceRecordedAt'] === undefined
      ? null
      : isoTimestamp(value['originalProvenanceRecordedAt'], 'player.originalProvenanceRecordedAt'),
  });
}

function normalizeFixture(value: unknown): Fixture {
  if (!isRecord(value)) throw new DomainValidationError('IMPORT_INVALID_FIXTURE', 'Fixture must be an object.');
  const score = (field: string): number | null => {
    const candidate = value[field];
    if (candidate === null) return null;
    if (typeof candidate !== 'number') throw new DomainValidationError('IMPORT_INVALID_FIXTURE', `${field} must be numeric or null.`);
    return candidate;
  };
  const status = value['status'];
  if (status !== 'SCHEDULED' && status !== 'COMPLETED' && status !== 'POSTPONED' && status !== 'CANCELLED') {
    throw new DomainValidationError('IMPORT_INVALID_FIXTURE', 'Fixture status is unsupported.');
  }
  return createFixture({
    id: stringField(value, 'id'), careerId: stringField(value, 'careerId'), competitionId: stringField(value, 'competitionId'),
    season: stringField(value, 'season'), homeClubId: stringField(value, 'homeClubId'), awayClubId: stringField(value, 'awayClubId'),
    kickoffAt: isoTimestamp(value['kickoffAt'], 'fixture.kickoffAt'), timeZone: stringField(value, 'timeZone'), status,
    homeScore: score('homeScore'), awayScore: score('awayScore'),
    provenanceKind: value['provenanceKind'] === null ? null : provenanceKindField(value, 'provenanceKind'),
    provenanceSource: nullableStringField(value, 'provenanceSource'),
    provenanceRecordedAt: value['provenanceRecordedAt'] === null ? null : isoTimestamp(value['provenanceRecordedAt'], 'fixture.provenanceRecordedAt'),
  });
}

function collectConflicts<T>(
  entityType: ImportConflict['entityType'],
  existing: readonly T[],
  incoming: readonly T[],
  getId: (value: T) => string,
  getIdentity: (value: T) => string,
  conflicts: ImportConflict[],
): void {
  const existingById = new Map(existing.map((value) => [getId(value), value]));
  const existingByIdentity = new Map(existing.map((value) => [getIdentity(value).toLocaleLowerCase(), value]));
  for (const value of incoming) {
    const id = getId(value);
    const sameId = existingById.get(id);
    const identity = getIdentity(value);
    const sameIdentity = existingByIdentity.get(identity.toLocaleLowerCase());
    if (sameId && stableJson(sameId) !== stableJson(value)) {
      conflicts.push({ entityType, identity, existingId: id, incomingId: id, message: 'Entity ID exists with different content.' });
    } else if (sameIdentity && getId(sameIdentity) !== id) {
      conflicts.push({ entityType, identity, existingId: getId(sameIdentity), incomingId: id, message: 'A different entity already uses this natural identity.' });
    }
  }
}

function fixtureIdentity(fixture: Fixture): string {
  return [fixture.competitionId, fixture.season, fixture.kickoffAt, fixture.homeClubId, fixture.awayClubId].join('|');
}

function assertUnique(values: readonly string[], label: string): void {
  if (new Set(values).size !== values.length) throw new DomainValidationError('IMPORT_DUPLICATE_IDS', `Package contains duplicate ${label}.`);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function stringField(record: Record<string, unknown>, field: string): string {
  const value = record[field];
  if (typeof value !== 'string') throw new DomainValidationError('IMPORT_INVALID_FIELD', `${field} must be a string.`);
  return value;
}

function nullableStringField(record: Record<string, unknown>, field: string): string | null {
  const value = record[field];
  if (value === null) return null;
  if (typeof value !== 'string') throw new DomainValidationError('IMPORT_INVALID_FIELD', `${field} must be a string or null.`);
  return value;
}

function provenanceKindField(record: Record<string, unknown>, field: string): ProvenanceKind {
  const value = record[field];
  const allowed: readonly ProvenanceKind[] = ['USER_ENTERED', 'IMPORTED_EXTERNAL', 'READ_FROM_GAME', 'SIMULATED', 'DERIVED'];
  if (typeof value !== 'string' || !allowed.includes(value as ProvenanceKind)) {
    throw new DomainValidationError('IMPORT_INVALID_PROVENANCE', `${field} is not supported.`);
  }
  return value as ProvenanceKind;
}

function isoTimestamp(value: unknown, field: string): string {
  if (typeof value !== 'string' || !Number.isFinite(Date.parse(value))) {
    throw new DomainValidationError('IMPORT_INVALID_TIMESTAMP', `${field} must be an ISO-compatible timestamp.`);
  }
  return new Date(value).toISOString();
}

function nonEmpty(value: string, field: string): string {
  const normalized = value.trim();
  if (!normalized) throw new DomainValidationError('IMPORT_INVALID_FIELD', `${field} must not be empty.`);
  return normalized;
}

function stableJson(value: unknown): string {
  return JSON.stringify(sortRecursively(value));
}

function sortRecursively(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortRecursively);
  if (!isRecord(value)) return typeof value === 'bigint' ? value.toString() : value;
  return Object.fromEntries(Object.keys(value).sort().map((key) => [key, sortRecursively(value[key])]));
}

/** SHA-256 hex digest. Injected by the platform adapter so this package stays platform independent. */
export type DigestFunction = (value: string) => Promise<string>;

let activeDigest: DigestFunction | null = null;

/** Registers the platform digest implementation once at startup (adapter responsibility). */
export function configureImportDigest(digest: DigestFunction): void {
  activeDigest = digest;
}

async function sha256(value: string): Promise<string> {
  if (!activeDigest) throw new DomainValidationError('IMPORT_DIGEST_NOT_CONFIGURED', 'Import digest function was not configured.');
  return activeDigest(value);
}
