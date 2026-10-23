import { ipcMain } from 'electron';
import { randomUUID, randomBytes } from 'node:crypto';
import { createCareerService, type CareerService } from '@gerenciador/application';
import { updatePlayerProfile, type CareerStore, type PlayerProfileInput } from '@gerenciador/database';

/** The only channels the renderer may invoke. Anything else is rejected by the main process. */
export const CAREER_CHANNELS = Object.freeze({
  create: 'career:create',
  list: 'career:list',
  open: 'career:open',
  listFixtures: 'calendar:list',
  listPlayers: 'squad:list',
  updatePlayer: 'squad:update',
} as const);


export function registerCareerIpc(store: CareerStore): CareerService {
  const service = createCareerService({
    repository: store.careers,
    listAll: async () => {
      const rows = await store.prisma.career.findMany({ orderBy: { createdAt: 'asc' } });
      return rows.map((row: CareerRow) => ({
        id: row.id,
        name: row.name,
        currentSeason: row.currentSeason,
        controlledClubId: row.controlledClubId,
        randomSeed: row.randomSeed,
        createdAt: row.createdAt.toISOString(),
      }));
    },
    newId: () => randomUUID(),
    newSeed: () => randomBytes(16).toString('hex'),
    now: () => new Date(),
  });

  // Inputs arrive as untrusted data. The service re-validates them; here we only ensure a plain object.
  ipcMain.removeHandler(CAREER_CHANNELS.create);
  ipcMain.handle(CAREER_CHANNELS.create, (_event, payload: unknown) => {
    const input = requirePlainObject(payload);
    return service.createCareer({
      name: input['name'] as string,
      currentSeason: input['currentSeason'] as string,
    });
  });

  ipcMain.removeHandler(CAREER_CHANNELS.list);
  ipcMain.handle(CAREER_CHANNELS.list, () => service.listCareers());

  ipcMain.removeHandler(CAREER_CHANNELS.open);
  ipcMain.handle(CAREER_CHANNELS.open, (_event, payload: unknown) => {
    const input = requirePlainObject(payload);
    return service.openCareer(input['id'] as string);
  });

  ipcMain.removeHandler(CAREER_CHANNELS.listFixtures);
  ipcMain.handle(CAREER_CHANNELS.listFixtures, async (_event, payload: unknown) => {
    const input = requirePlainObject(payload);
    const careerId = input['careerId'];
    if (typeof careerId !== 'string' || careerId.trim() === '') {
      throw new TypeError('careerId must be a non-empty string.');
    }
    const rows = await store.prisma.fixture.findMany({
      where: { careerId },
      orderBy: [{ kickoffAt: 'asc' }, { id: 'asc' }],
      include: { homeClub: { select: { name: true } }, awayClub: { select: { name: true } } },
    });
    return rows.map(mapFixtureSummary);
  });

  ipcMain.removeHandler(CAREER_CHANNELS.updatePlayer);
  ipcMain.handle(CAREER_CHANNELS.updatePlayer, async (_event, payload: unknown) => {
    const input = requirePlainObject(payload);
    const careerId = requireString(input['careerId'], 'careerId');
    const playerId = requireString(input['playerId'], 'playerId');
    const rawProfile = requirePlainObject(input['profile']);
    assertExactKeys(rawProfile, ['name', 'birthDate', 'overall', 'potential', 'heightCm', 'weightKg']);
    const profile: PlayerProfileInput = {
      name: requireString(rawProfile['name'], 'name'),
      birthDate: requireOptionalDate(rawProfile['birthDate'], 'birthDate'),
      overall: requireOptionalInteger(rawProfile['overall'], 'overall'),
      potential: requireOptionalInteger(rawProfile['potential'], 'potential'),
      heightCm: requireOptionalInteger(rawProfile['heightCm'], 'heightCm'),
      weightKg: requireOptionalInteger(rawProfile['weightKg'], 'weightKg'),
    };
    await updatePlayerProfile(store.prisma, careerId, playerId, profile);
    const updated = await store.prisma.player.findFirst({
      where: { id: playerId, careerId },
      include: { currentClub: { select: { name: true } } },
    });
    if (!updated) throw new Error('Jogador atualizado não encontrado.');
    return mapPlayerSummary(updated);
  });

  ipcMain.removeHandler(CAREER_CHANNELS.listPlayers);
  ipcMain.handle(CAREER_CHANNELS.listPlayers, async (_event, payload: unknown) => {
    const input = requirePlainObject(payload);
    const careerId = input['careerId'];
    if (typeof careerId !== 'string' || careerId.trim() === '') {
      throw new TypeError('careerId must be a non-empty string.');
    }
    const rows = await store.prisma.player.findMany({
      where: { careerId },
      orderBy: [{ name: 'asc' }, { id: 'asc' }],
      include: { currentClub: { select: { name: true } } },
    });
    return rows.map(mapPlayerSummary);
  });

  return service;
}

interface FixtureRow {
  readonly id: string;
  readonly careerId: string;
  readonly competitionId: string;
  readonly season: string;
  readonly homeClub: { readonly name: string };
  readonly awayClub: { readonly name: string };
  readonly kickoffAt: Date;
  readonly timeZone: string;
  readonly status: string;
  readonly homeScore: number | null;
  readonly awayScore: number | null;
}

interface PlayerRow {
  readonly id: string;
  readonly careerId: string;
  readonly name: string;
  readonly currentClubId: string | null;
  readonly birthDate: Date | null;
  readonly overall: number | null;
  readonly potential: number | null;
  readonly heightCm: number | null;
  readonly weightKg: number | null;
  readonly provenanceKind: string;
  readonly provenanceSource: string;
  readonly provenanceRecordedAt: Date;
  readonly originalProvenanceKind: string | null;
  readonly originalProvenanceSource: string | null;
  readonly originalProvenanceRecordedAt: Date | null;
  readonly currentClub: { readonly name: string } | null;
}

interface CareerRow {
  readonly id: string;
  readonly name: string;
  readonly currentSeason: string;
  readonly controlledClubId: string | null;
  readonly randomSeed: string;
  readonly createdAt: Date;
}

function mapFixtureSummary(row: FixtureRow) {
  return {
    id: row.id,
    careerId: row.careerId,
    competitionId: row.competitionId,
    season: row.season,
    homeClubName: row.homeClub.name,
    awayClubName: row.awayClub.name,
    kickoffAt: row.kickoffAt.toISOString(),
    timeZone: row.timeZone,
    status: toFixtureStatus(row.status),
    homeScore: row.homeScore,
    awayScore: row.awayScore,
  };
}

function toFixtureStatus(value: string): FixtureRow['status'] {
  if (value === 'SCHEDULED' || value === 'COMPLETED' || value === 'POSTPONED' || value === 'CANCELLED') return value;
  return 'SCHEDULED';
}

function mapPlayerSummary(row: PlayerRow) {
  const now = new Date();
  const birthDate = row.birthDate?.toISOString().slice(0, 10) ?? null;
  let age: number | null = null;
  if (row.birthDate !== null) {
    age = now.getUTCFullYear() - row.birthDate.getUTCFullYear();
    const birthdayPending = now.getUTCMonth() < row.birthDate.getUTCMonth()
      || (now.getUTCMonth() === row.birthDate.getUTCMonth() && now.getUTCDate() < row.birthDate.getUTCDate());
    if (birthdayPending) age -= 1;
    age = Math.max(0, age);
  }
  return {
    id: row.id,
    name: row.name,
    clubName: row.currentClub === null ? null : row.currentClub.name,
    overall: row.overall,
    potential: row.potential,
    age,
    birthDate,
    heightCm: row.heightCm,
    weightKg: row.weightKg,
    provenanceKind: row.provenanceKind,
    provenanceSource: row.provenanceSource,
    provenanceRecordedAt: row.provenanceRecordedAt.toISOString(),
    originalProvenanceKind: row.originalProvenanceKind,
    originalProvenanceSource: row.originalProvenanceSource,
    originalProvenanceRecordedAt: row.originalProvenanceRecordedAt?.toISOString() ?? null,
  };
}

function assertExactKeys(value: Record<string, unknown>, allowedKeys: readonly string[]): void {
  const allowed = new Set(allowedKeys);
  const unexpected = Object.keys(value).find((key) => !allowed.has(key));
  if (unexpected) throw new TypeError(`Unexpected input field: ${unexpected}.`);
}

function requireString(value: unknown, field: string): string {
  if (typeof value !== 'string' || value.trim() === '') throw new TypeError(`${field} must be a non-empty string.`);
  return value;
}

function requireOptionalInteger(value: unknown, field: string): number | null {
  if (value === null) return null;
  if (typeof value !== 'number' || !Number.isSafeInteger(value)) throw new TypeError(`${field} must be an integer or null.`);
  return value;
}

function requireOptionalDate(value: unknown, field: string): string | null {
  if (value === null) return null;
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new TypeError(`${field} must be YYYY-MM-DD or null.`);
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) {
    throw new TypeError(`${field} must be a real calendar date.`);
  }
  return value;
}

function requirePlainObject(value: unknown): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new TypeError('IPC payload must be a plain object.');
  }
  return value as Record<string, unknown>;
}
