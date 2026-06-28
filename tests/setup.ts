// Fallback for tests that import server modules transitively
// (server/config/index.ts calls process.exit(1) if JWT_SECRET is missing)
if (!process.env.JWT_SECRET) {
  process.env.JWT_SECRET = 'test-jwt-secret-min-32-chars-aaaaaaaaaaaaaaa';
}

import '@testing-library/jest-dom';
import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

afterEach(() => cleanup());
