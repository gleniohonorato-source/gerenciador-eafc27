import {
  createCareer,
  createClub,
  createFixture,
  createFinanceEntry,
  createPlayer,
  type Career,
  type Club,
  type Fixture,
  type FinanceEntry,
  type Player,
  type CareerRepository,
  type ClubRepository,
  type FixtureRepository,
  type FinanceEntryRepository,
  type PlayerRepository,
} from '@gerenciador/domain';
import type { PrismaClient } from '@prisma/client';

export class PrismaCareerRepository implements CareerRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findById(id: string): Promise<Career | null> {
    const row = await this.prisma.career.findUnique({ where: { id } });
    return row ? mapCareer(row) : null;
  }

  async findByName(name: string): Promise<Career | null> {
    const row = await this.prisma.career.findFirst({ where: { name } });
    return row ? mapCareer(row) : null;
  }

  async save(entity: Career): Promise<void> {
    const career = createCareer(entity);
    await this.prisma.career.upsert({
      where: { id: career.id },
      create: { ...career, createdAt: new Date(career.createdAt) },
      update: { ...career, createdAt: new Date(career.createdAt) },
    });
  }
}

export class PrismaClubRepository implements ClubRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findById(id: string): Promise<Club | null> {
    const row = await this.prisma.club.findUnique({ where: { id } });
    return row ? mapClub(row) : null;
  }

  async listByCareer(careerId: string): Promise<readonly Club[]> {
    const rows = await this.prisma.club.findMany({ where: { careerId }, orderBy: { name: 'asc' } });
    return rows.map(mapClub);
  }

  async save(entity: Club): Promise<void> {
    const club = createClub(entity);
    const data = { ...club, createdAt: new Date(club.createdAt) };
    await this.prisma.club.upsert({ where: { id: club.id }, create: data, update: data });
  }
}

export class PrismaPlayerRepository implements PlayerRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findById(id: string): Promise<Player | null> {
    const row = await this.prisma.player.findUnique({ where: { id } });
    return row ? mapPlayer(row) : null;
  }

  async listByCareer(careerId: string): Promise<readonly Player[]> {
    const rows = await this.prisma.player.findMany({ where: { careerId }, orderBy: { name: 'asc' } });
    return rows.map(mapPlayer);
  }

  async save(entity: Player): Promise<void> {
    const player = createPlayer(entity);
    const originalProvenanceRecordedAt = player.originalProvenanceRecordedAt ?? null;
    const data = {
      ...player,
      birthDate: player.birthDate === null ? null : new Date(`${player.birthDate}T00:00:00.000Z`),
      provenanceRecordedAt: new Date(player.provenanceRecordedAt),
      originalProvenanceRecordedAt: originalProvenanceRecordedAt === null
        ? null
        : new Date(originalProvenanceRecordedAt),
    };
    await this.prisma.player.upsert({ where: { id: player.id }, create: data, update: data });
  }
}

export class PrismaFixtureRepository implements FixtureRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findById(id: string): Promise<Fixture | null> {
    const row = await this.prisma.fixture.findUnique({ where: { id } });
    return row ? mapFixture(row) : null;
  }

  async listByCareer(careerId: string): Promise<readonly Fixture[]> {
    const rows = await this.prisma.fixture.findMany({ where: { careerId }, orderBy: { kickoffAt: 'asc' } });
    return rows.map(mapFixture);
  }

  async save(entity: Fixture): Promise<void> {
    const fixture = createFixture(entity);
    const data = {
      ...fixture,
      kickoffAt: new Date(fixture.kickoffAt),
      provenanceRecordedAt: fixture.provenanceRecordedAt === null ? null : new Date(fixture.provenanceRecordedAt),
    };
    await this.prisma.fixture.upsert({ where: { id: fixture.id }, create: data, update: data });
  }
}

export class PrismaFinanceEntryRepository implements FinanceEntryRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findById(id: string): Promise<FinanceEntry | null> {
    const row = await this.prisma.financeEntry.findUnique({ where: { id } });
    return row ? mapFinanceEntry(row) : null;
  }

  async listByClub(clubId: string): Promise<readonly FinanceEntry[]> {
    const rows = await this.prisma.financeEntry.findMany({ where: { clubId }, orderBy: { occurredAt: 'asc' } });
    return rows.map(mapFinanceEntry);
  }

  async save(entity: FinanceEntry): Promise<void> {
    const entry = createFinanceEntry({
      id: entity.id,
      careerId: entity.careerId,
      clubId: entity.clubId,
      direction: entity.direction,
      category: entity.category,
      minorUnits: entity.amount.minorUnits,
      currency: entity.amount.currency,
      occurredAt: entity.occurredAt,
      reference: entity.reference,
      provenanceKind: entity.provenance.kind,
      provenanceSource: entity.provenance.source,
      provenanceRecordedAt: entity.provenance.recordedAt,
    });
    const data = {
      id: entry.id,
      careerId: entry.careerId,
      clubId: entry.clubId,
      direction: entry.direction as 'INCOME' | 'EXPENSE',
      category: entry.category,
      minorUnits: entry.amount.minorUnits,
      currency: entry.amount.currency,
      occurredAt: new Date(entry.occurredAt),
      reference: entry.reference,
      provenanceKind: entry.provenance.kind,
      provenanceSource: entry.provenance.source,
      provenanceRecordedAt: new Date(entry.provenance.recordedAt),
    };
    await this.prisma.financeEntry.upsert({ where: { id: entry.id }, create: data, update: data });
  }
}

type DbCareer = {
  id: string; name: string; currentSeason: string; controlledClubId: string | null;
  randomSeed: string; createdAt: Date;
};
type DbClub = {
  id: string; careerId: string; name: string; countryCode: string; competitionId: string;
  reputation: number; createdAt: Date;
};
type DbPlayer = {
  id: string; careerId: string; currentClubId: string | null; name: string; birthDate: Date | null;
  overall: number | null; potential: number | null; heightCm: number | null; weightKg: number | null;
  provenanceKind: string; provenanceSource: string; provenanceRecordedAt: Date;
  originalProvenanceKind: string | null; originalProvenanceSource: string | null;
  originalProvenanceRecordedAt: Date | null;
};
type DbFixture = {
  id: string; careerId: string; competitionId: string; season: string; homeClubId: string;
  awayClubId: string; kickoffAt: Date; timeZone: string; status: string; homeScore: number | null;
  awayScore: number | null; provenanceKind: string | null; provenanceSource: string | null;
  provenanceRecordedAt: Date | null;
};
type DbFinanceEntry = {
  id: string; careerId: string; clubId: string; direction: string; category: string;
  minorUnits: bigint; currency: string; occurredAt: Date; reference: string | null;
  provenanceKind: string; provenanceSource: string; provenanceRecordedAt: Date;
};

function mapCareer(row: DbCareer): Career {
  return createCareer({ ...row, createdAt: row.createdAt.toISOString() });
}
function mapClub(row: DbClub): Club {
  return createClub({ ...row, createdAt: row.createdAt.toISOString() });
}
function mapPlayer(row: DbPlayer): Player {
  return createPlayer({
    ...row,
    birthDate: row.birthDate?.toISOString().slice(0, 10) ?? null,
    provenanceKind: row.provenanceKind as Player['provenanceKind'],
    provenanceRecordedAt: row.provenanceRecordedAt.toISOString(),
    originalProvenanceKind: row.originalProvenanceKind as Player['originalProvenanceKind'],
    originalProvenanceSource: row.originalProvenanceSource,
    originalProvenanceRecordedAt: row.originalProvenanceRecordedAt?.toISOString() ?? null,
  });
}
function mapFixture(row: DbFixture): Fixture {
  return createFixture({
    ...row,
    kickoffAt: row.kickoffAt.toISOString(),
    status: row.status as Fixture['status'],
    provenanceKind: row.provenanceKind as Fixture['provenanceKind'],
    provenanceRecordedAt: row.provenanceRecordedAt?.toISOString() ?? null,
  });
}
function mapFinanceEntry(row: DbFinanceEntry): FinanceEntry {
  if (row.direction !== 'INCOME' && row.direction !== 'EXPENSE') {
    throw new Error(`Unsupported persisted finance direction: ${row.direction}`);
  }
  return createFinanceEntry({
    ...row,
    direction: row.direction,
    occurredAt: row.occurredAt.toISOString(),
    provenanceKind: row.provenanceKind as FinanceEntry['provenance']['kind'],
    provenanceRecordedAt: row.provenanceRecordedAt.toISOString(),
  });
}
