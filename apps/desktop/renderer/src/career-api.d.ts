export interface CareerSummary {
  readonly id: string;
  readonly name: string;
  readonly currentSeason: string;
  readonly controlledClubId: string | null;
  readonly randomSeed: string;
  readonly createdAt: string;
}

export interface FixtureSummary {
  readonly id: string;
  readonly careerId: string;
  readonly competitionId: string;
  readonly season: string;
  readonly homeClubName: string;
  readonly awayClubName: string;
  readonly kickoffAt: string;
  readonly timeZone: string;
  readonly status: 'SCHEDULED' | 'COMPLETED' | 'POSTPONED' | 'CANCELLED';
  readonly homeScore: number | null;
  readonly awayScore: number | null;
}

export interface CalendarImportPreview {
  readonly token: string;
  readonly fileName: string;
  readonly career: { readonly id: string; readonly name: string; readonly currentSeason: string };
  readonly counts: { readonly clubs: number; readonly players: number; readonly fixtures: number };
  readonly issues: readonly { readonly code: string; readonly path: string; readonly message: string; readonly severity: 'ERROR' | 'WARNING' }[];
  readonly conflicts: readonly { readonly entityType: string; readonly identity: string; readonly message: string }[];
  readonly digest: string;
}

export interface PlayerProfileInput {
  readonly name: string;
  readonly birthDate: string | null;
  readonly overall: number | null;
  readonly potential: number | null;
  readonly heightCm: number | null;
  readonly weightKg: number | null;
}

export interface PlayerSummary {
  readonly id: string;
  readonly name: string;
  readonly clubName: string | null;
  readonly overall: number | null;
  readonly potential: number | null;
  readonly age: number | null;
  readonly birthDate: string | null;
  readonly heightCm: number | null;
  readonly weightKg: number | null;
  readonly provenanceKind: string;
  readonly provenanceSource: string;
  readonly provenanceRecordedAt: string;
  readonly originalProvenanceKind: string | null;
  readonly originalProvenanceSource: string | null;
  readonly originalProvenanceRecordedAt: string | null;
}

export interface CareerDesktopApi {
  readonly runtime: 'electron';
  readonly bridgeVersion: number;
  appVersion(): Promise<string>;
  createCareer(input: { name: string; currentSeason: string }): Promise<CareerSummary>;
  listCareers(): Promise<readonly CareerSummary[]>;
  openCareer(id: string): Promise<CareerSummary>;
  listFixtures(careerId: string): Promise<readonly FixtureSummary[]>;
  listPlayers(careerId: string): Promise<readonly PlayerSummary[]>;
  updatePlayer(careerId: string, playerId: string, profile: PlayerProfileInput): Promise<PlayerSummary>;
  selectCalendarImportFile(): Promise<{ readonly canceled: true } | { readonly canceled: false; readonly token: string; readonly fileName: string }>;
  previewCalendarImport(selectionToken: string): Promise<CalendarImportPreview>;
  confirmCalendarImport(token: string, careerId: string): Promise<{ readonly fixtures: readonly FixtureSummary[] }>;
  cancelCalendarImport(token: string, kind: 'preview' | 'selection'): Promise<{ readonly canceled: true }>;
  createBackup(): Promise<{ readonly canceled: true } | { readonly canceled: false; readonly fileName: string; readonly manifest: { readonly createdAt: string; readonly sha256: string; readonly sizeBytes: number } }>;
  selectBackupRestore(): Promise<{ readonly canceled: true } | { readonly canceled: false; readonly token: string; readonly fileName: string; readonly createdAt: string; readonly sizeBytes: number }>;
  confirmBackupRestore(token: string, confirmed: boolean): Promise<{ readonly restored: true }>;
}

declare global {
  interface Window {
    careerDesktop: CareerDesktopApi;
  }
}
