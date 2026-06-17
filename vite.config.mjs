import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = fileURLToPath(new URL('./frontend', import.meta.url));

export default defineConfig({
  root,
  appType: 'custom',
  server: {
    ws: false
  },
  build: {
    outDir: path.resolve(root, '../dist'),
    emptyOutDir: true,
    rollupOptions: {
      input: path.resolve(root, 'index.js'),
      output: {
        entryFileNames: 'index.js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash][extname]'
      }
    }
  }
});
