import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

/**
 * Dev:  vite on :5173, API/WS on :3000 (proxied).
 * Prod: `vite build` -> dist/, served by the Fastify server on $PORT.
 */
export default defineConfig({
  plugins: [react()],
  build: {
    target: 'es2022',
    sourcemap: false,
    outDir: 'dist',
    rollupOptions: {
      output: {
        manualChunks: { react: ['react', 'react-dom'] },
      },
    },
  },
  server: {
    port: 5173,
    host: true,
    allowedHosts: true,
    proxy: {
      '/api': { target: 'http://127.0.0.1:3000', changeOrigin: true },
      '/ws': { target: 'ws://127.0.0.1:3000', ws: true },
    },
  },
});
