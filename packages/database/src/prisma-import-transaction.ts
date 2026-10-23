import { createHash } from 'node:crypto';
import { configureImportDigest, type CareerImportRepositories } from '@gerenciador/application';
import type { PrismaClient } from '@prisma/client';
import {
  PrismaCareerRepository,
  PrismaClubRepository,
  PrismaFixtureRepository,
  PrismaPlayerRepository,
} from './prisma-repositories';

type TransactionRepositories = Omit<CareerImportRepositories, 'transaction'>;

configureImportDigest(async (value) => createHash('sha256').update(value, 'utf8').digest('hex'));

/** Wires import use cases to repositories scoped to one atomic SQLite transaction. */
export function createCareerImportRepositories(prisma: PrismaClient): CareerImportRepositories {
  const buildRepositories = (client: PrismaClient): TransactionRepositories => ({
    career: new PrismaCareerRepository(client),
    clubs: new PrismaClubRepository(client),
    players: new PrismaPlayerRepository(client),
    fixtures: new PrismaFixtureRepository(client),
  });

  return {
    ...buildRepositories(prisma),
    transaction: async <T>(operation: (repositories: TransactionRepositories) => Promise<T>): Promise<T> =>
      prisma.$transaction(async (transactionClient) =>
        operation(buildRepositories(transactionClient as unknown as PrismaClient)),
      ),
  };
}
