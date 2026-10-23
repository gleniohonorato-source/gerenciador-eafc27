import type { Career, Club, Fixture, FinanceEntry, Player } from './entities';

export interface Repository<T, TId extends string = string> {
  findById(id: TId): Promise<T | null>;
  save(entity: T): Promise<void>;
}

export interface CareerRepository extends Repository<Career> {
  findByName(name: string): Promise<Career | null>;
}

export interface ClubRepository extends Repository<Club> {
  listByCareer(careerId: string): Promise<readonly Club[]>;
}

export interface PlayerRepository extends Repository<Player> {
  listByCareer(careerId: string): Promise<readonly Player[]>;
}

export interface FixtureRepository extends Repository<Fixture> {
  listByCareer(careerId: string): Promise<readonly Fixture[]>;
}

export interface FinanceEntryRepository extends Repository<FinanceEntry> {
  listByClub(clubId: string): Promise<readonly FinanceEntry[]>;
}
