import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

// Seed env BEFORE any test imports. ESM hoists test-file imports above
// setupFiles execution, so tests/setup.ts is too late for modules that
// read env at import time (e.g. server/config/index.ts calls process.exit
// when JWT_SECRET is missing).
if (!process.env.JWT_SECRET) {
  process.env.JWT_SECRET = 'test-jwt-secret-min-32-chars-aaaaaaaaaaaaaaa';
}

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    globals: true,
    include: ['**/*.{test,spec}.{ts,tsx}'],
    exclude: [
      'node_modules/**',
      'dist/**',
      '.claude/**',
      'server/node_modules/**',
      'server/dist/**'
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: ['node_modules/', 'dist/', 'coverage/']
    }
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, '.'),
      // Server-only deps used by tests/audit/* — root has no node_modules
      // install, so point bare imports at server's install.
      fastify: resolve(__dirname, 'server/node_modules/fastify'),
      '@fastify/cookie': resolve(__dirname, 'server/node_modules/@fastify/cookie'),
      'fastify-plugin': resolve(__dirname, 'server/node_modules/fastify-plugin'),
      jsonwebtoken: resolve(__dirname, 'server/node_modules/jsonwebtoken')
    }
  }
});
