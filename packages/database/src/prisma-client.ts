import { createRequire } from 'node:module';
import type { PrismaClient as PrismaClientType } from '@prisma/client';

export interface DatabaseOptions {
  readonly databaseUrl?: string;
  readonly logQueries?: boolean;
}

function loadPrismaModule(modulePath: string): Partial<PrismaRuntimeModule> {
  // Created on demand so the packaged runtime's NODE_PATH can be configured before resolution.
  return createRequire(import.meta.url)(modulePath) as Partial<PrismaRuntimeModule>;
}

interface PrismaRuntimeModule { readonly PrismaClient: new (options: Record<string, unknown>) => PrismaClientType }

/** Creates Prisma Client through require(), since Prisma 6 publishes CommonJS, not named ESM exports. */
function loadPrismaClient(): PrismaRuntimeModule['PrismaClient'] {
  const generatedEntry = process.env['GERENCIADOR_PRISMA_CLIENT_PATH'];
  const loaded = loadPrismaModule(generatedEntry || '@prisma/client');
  if (typeof loaded.PrismaClient !== 'function') {
    throw new Error(`PrismaClient export was not found in ${generatedEntry || '@prisma/client'}.`);
  }
  return loaded.PrismaClient;
}

/** Creates a client for the application's own SQLite database, never an EA FC save. */
export function createDatabaseClient(options: DatabaseOptions = {}): PrismaClientType {
  const PrismaClient = loadPrismaClient();
  return new PrismaClient({
    ...(options.databaseUrl ? { datasources: { db: { url: options.databaseUrl } } } : {}),
    log: options.logQueries ? ['warn', 'error', 'query'] : ['warn', 'error'],
  });
}
