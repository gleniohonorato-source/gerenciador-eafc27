import { DomainValidationError, type Fixture } from '@gerenciador/domain';
import {
  CAREER_PACKAGE_FORMAT,
  CAREER_PACKAGE_VERSION,
  previewCareerImport,
  type CareerImportRepositories,
  type ImportConflict,
  type ImportIssue,
} from './career-import';

export interface CalendarImportPreview {
  readonly career: { readonly id: string; readonly name: string; readonly currentSeason: string };
  readonly fileName: string;
  readonly counts: { readonly clubs: number; readonly players: number; readonly fixtures: number };
  readonly issues: readonly ImportIssue[];
  readonly conflicts: readonly ImportConflict[];
  readonly digest: string;
  readonly package: {
    readonly format: typeof CAREER_PACKAGE_FORMAT;
    readonly version: typeof CAREER_PACKAGE_VERSION;
    readonly exportedAt: string;
    readonly career: import('./career-import').CareerPackageV1['career'];
    readonly clubs: readonly import('@gerenciador/domain').Club[];
    readonly players: readonly import('@gerenciador/domain').Player[];
    readonly fixtures: readonly Fixture[];
  };
}

export async function previewCalendarImport(
  text: string,
  fileName: string,
  repositories: CareerImportRepositories,
): Promise<CalendarImportPreview> {
  const preview = await previewCareerImport(text, repositories);
  // Career metadata in the file is only an identity label here: calendar import never writes the
  // career, so a differing career record is not a blocker for this flow.
  const blockingConflicts = preview.conflicts.filter((conflict) => conflict.entityType !== 'CAREER');
  const relevantIssues = preview.issues.filter((issue) => issue.code !== 'IMPORT_CONFLICTS_PRESENT' || blockingConflicts.length > 0);
  return Object.freeze({
    career: Object.freeze({
      id: preview.package.career.id,
      name: preview.package.career.name,
      currentSeason: preview.package.career.currentSeason,
    }),
    fileName: safeFileName(fileName),
    counts: preview.counts,
    issues: Object.freeze(relevantIssues),
    conflicts: Object.freeze(blockingConflicts),
    digest: preview.digest,
    package: preview.package,
  });
}

export async function confirmCalendarImport(
  preview: CalendarImportPreview,
  confirmation: { readonly confirmed: boolean; readonly expectedDigest: string; readonly careerId: string },
  repositories: CareerImportRepositories,
): Promise<{ readonly careerId: string; readonly savedFixtures: number; readonly savedPlayers: number }> {
  if (!confirmation.confirmed) throw new DomainValidationError('IMPORT_NOT_CONFIRMED', 'Import must be explicitly confirmed.');
  if (confirmation.careerId !== preview.career.id) throw new DomainValidationError('IMPORT_CAREER_MISMATCH', 'Open the career named in the import preview before confirming.');
  if (confirmation.expectedDigest !== preview.digest) throw new DomainValidationError('IMPORT_PREVIEW_STALE', 'Import preview changed; review it again before confirming.');
  if (preview.conflicts.length > 0) throw new DomainValidationError('IMPORT_CONFLICTS_UNRESOLVED', 'Resolve all conflicts before confirming the calendar import.');
  if (preview.issues.some((issue) => issue.severity === 'ERROR')) throw new DomainValidationError('IMPORT_HAS_ERRORS', 'Fix import errors before confirming.');

  await repositories.transaction(async (transactionRepositories) => {
    const latest = await previewCareerImport(JSON.stringify(preview.package), {
      ...transactionRepositories,
      transaction: async (operation) => operation(transactionRepositories),
    });
    if (latest.digest !== preview.digest) throw new DomainValidationError('IMPORT_PREVIEW_STALE', 'Career data changed after preview; review it again before confirming.');

    const existingCareer = await transactionRepositories.career.findById(preview.career.id);
    if (!existingCareer) throw new DomainValidationError('IMPORT_CAREER_NOT_FOUND', 'The target career no longer exists.');
    const existingClubs = await transactionRepositories.clubs.listByCareer(preview.career.id);
    const existingClubIds = new Set(existingClubs.map((club) => club.id));

    // Fixtures require their clubs to exist (FK restriction), so clubs referenced by the calendar
    // are created before the fixtures. Existing clubs are never modified: a differing club would
    // have been reported as a blocking conflict in the preview.
    for (const club of preview.package.clubs) {
      if (!existingClubIds.has(club.id)) await transactionRepositories.clubs.save(club);
    }
    const validClubIds = new Set([...existingClubIds, ...preview.package.clubs.map((club) => club.id)]);

    for (const player of preview.package.players) {
      if (player.currentClubId !== null && !validClubIds.has(player.currentClubId)) {
        throw new DomainValidationError('IMPORT_PLAYER_CLUB_MISSING', `Player ${player.id} references a club outside this import.`);
      }
    }

    for (const fixture of preview.package.fixtures) {
      if (fixture.careerId !== preview.career.id || fixture.season !== existingCareer.currentSeason || !validClubIds.has(fixture.homeClubId) || !validClubIds.has(fixture.awayClubId)) {
        throw new DomainValidationError('IMPORT_FIXTURE_REFERENCE_MISSING', 'Each imported match must match this season, belong to this career and reference clubs saved in this import.');
      }
      if (fixture.status === 'COMPLETED' || fixture.homeScore !== null || fixture.awayScore !== null) {
        throw new DomainValidationError('IMPORT_RESULTS_OUT_OF_SCOPE', 'Calendar import accepts scheduled fixtures only; match results cannot be imported here.');
      }
    }

    // Players come after clubs (FK on currentClubId) and before fixtures in dependency order.
    for (const player of preview.package.players) await transactionRepositories.players.save(player);
    for (const fixture of preview.package.fixtures) await transactionRepositories.fixtures.save(fixture);
  });

  return Object.freeze({
    careerId: preview.career.id,
    savedFixtures: preview.package.fixtures.length,
    savedPlayers: preview.package.players.length,
  });
}

function safeFileName(value: string): string {
  const name = value.split(/[\\/]/).pop() ?? '';
  const sanitized = [...name].map((character) => (character < ' ' || character === '\u007f' ? '_' : character)).join('').trim().slice(0, 180);
  return sanitized || 'calendar.json';
}
