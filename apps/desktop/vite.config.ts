import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig, externalizeDepsPlugin } from 'electron-vite';
import react from '@vitejs/plugin-react';

const desktopRoot = dirname(fileURLToPath(import.meta.url));
const rendererRoot = resolve(desktopRoot, 'renderer');
const outputRoot = resolve(desktopRoot, 'out');

export default defineConfig({
  main: {
    // Workspace packages are bundled: their compiled dist uses extensionless ESM imports that Node cannot
    // resolve at runtime. npm dependencies such as @prisma/client stay external (native engine).
    plugins: [
      externalizeDepsPlugin({
        exclude: ['@gerenciador/application', '@gerenciador/database', '@gerenciador/domain'],
      }),
    ],
    build: {
      outDir: resolve(outputRoot, 'main'),
      rollupOptions: { input: resolve(desktopRoot, 'electron/main.ts') },
    },
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    build: {
      outDir: resolve(outputRoot, 'preload'),
      rollupOptions: {
        input: resolve(desktopRoot, 'electron/preload.ts'),
        // Sandboxed preloads (sandbox: true) must be CommonJS. An ESM preload is ignored silently.
        output: { format: 'cjs', entryFileNames: 'preload.js' },
      },
    },
  },
  renderer: {
    root: rendererRoot,
    plugins: [react()],
    build: {
      rollupOptions: { input: resolve(rendererRoot, 'index.html') },
      outDir: resolve(outputRoot, 'renderer'),
      emptyOutDir: true,
    },
  },
});
