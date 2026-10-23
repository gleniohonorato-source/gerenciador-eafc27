import { cp, mkdir, readdir, rm } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const pnpmStore = resolve(repoRoot, 'node_modules/.pnpm');
const packages = await readdir(pnpmStore);
const prismaPackage = packages.find((name) => name.startsWith('@prisma+client@6.19.3_prisma@6.19.3_'));
if (!prismaPackage) throw new Error('Prisma 6.19.3 package not found. Run pnpm install first.');
const packageNodeModules = resolve(pnpmStore, prismaPackage, 'node_modules');
const generatedClient = resolve(packageNodeModules, '.prisma/client');
const prismaRuntime = resolve(packageNodeModules, '@prisma/client/runtime');
const destination = resolve(repoRoot, 'apps/desktop/.package-resources/prisma-client');
const runtimePackageDestination = resolve(repoRoot, 'apps/desktop/.package-resources/prisma-runtime/@prisma/client');
const runtimeDestination = resolve(runtimePackageDestination, 'runtime');
await rm(destination, { recursive: true, force: true });
await rm(resolve(repoRoot, 'apps/desktop/.package-resources/prisma-runtime'), { recursive: true, force: true });
await mkdir(destination, { recursive: true });
await cp(generatedClient, destination, { recursive: true });
// electron-builder filters nested node_modules out of extraResources. Ship Prisma's runtime as a
// package-shaped tree without a node_modules segment and add resourcesPath to Node's module paths.
await mkdir(runtimePackageDestination, { recursive: true });
await cp(prismaRuntime, runtimeDestination, { recursive: true });
console.log(`Copied generated Prisma client from ${packageNodeModules} to ${destination}`);
console.log(`Copied Prisma runtime package to ${runtimePackageDestination}`);
