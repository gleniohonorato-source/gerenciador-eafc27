// Lists career IDs from an application database so the test import file can be filled in.
// Usage: node scripts/print-career-ids.mjs "C:\path\to\gerenciador.db"
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';

const databasePath = process.argv[2];
if (!databasePath || databasePath.trim() === '') {
  console.error('Informe o caminho do banco: node scripts/print-career-ids.mjs "C:\\...\\gerenciador.db"');
  process.exit(1);
}

const require = createRequire(pathToFileURL(resolve('apps/desktop/package.json')));
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({ datasources: { db: { url: `file:${databasePath}` } } });

try {
  const careers = await prisma.career.findMany({ select: { id: true, name: true, currentSeason: true }, orderBy: { createdAt: 'asc' } });
  if (careers.length === 0) {
    console.log('Nenhuma carreira encontrada neste banco.');
  }
  for (const career of careers) {
    console.log(`${career.id}  |  ${career.name}  |  ${career.currentSeason}`);
  }
} finally {
  await prisma.$disconnect();
}
