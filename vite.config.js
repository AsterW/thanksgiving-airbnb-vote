import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// The frontend lives in web/ and builds to dist/, which the worker serves via
// [assets]. In dev, `npm run dev` serves the page with hot reload and proxies
// /api (including the Blackjack WebSocket) to `npm run dev:api` on :8787.
export default defineConfig({
  root: 'web',
  plugins: [react()],
  build: { outDir: '../dist', emptyOutDir: true },
  server: { proxy: { '/api': { target: 'http://localhost:8787', ws: true } } },
});
