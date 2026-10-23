import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { createDatabaseClient } from './prisma-client';
import { PrismaCareerRepository } from './prisma-repositories';
import type { PrismaClient } from '@prisma/client';
import type { CareerRepository } from '@gerenciador/domain';

export interface CareerStore {
  readonly prisma: PrismaClient;
  readonly careers: CareerRepository;
  close(): Promise<void>;
}

/**
 * Opens the application's own SQLite file at an absolute path supplied by the main process
 * (typically inside app.getPath('userData')). The path must be absolute; relative paths are rejected
 * so the database location never depends on the working directory.
 *
 * Schema creation is delegated to the versioned migration already in the package; this function only
 * checks that the file is reachable and that the Career table exists after opening.
 */
export async function openCareerStore(absoluteFilePath: string): Promise<CareerStore> {
  if (!isAbsolutePath(absoluteFilePath)) {
    throw new RangeError('Database path must be absolute.');
  }
  mkdirSync(dirname(absoluteFilePath), { recursive: true });
  const prisma = createDatabaseClient({ databaseUrl: `file:${absoluteFilePath}` });
  await prisma.$connect();
  const tables = await prisma.$queryRawUnsafe<{ name: string }[]>(
    "SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'Career'",
  );
  if (tables.length === 0) {
    await prisma.$disconnect();
    throw new Error('Application database is not migrated: run the versioned migration before opening.');
  }
  return {
    prisma,
    careers: new PrismaCareerRepository(prisma),
    close: () => prisma.$disconnect(),
  };
}

function isAbsolutePath(path: string): boolean {
  return /^([a-zA-Z]:[\\/]|\/)/.test(path);
}
