import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

const wsSrc = fs.readFileSync(
  path.resolve(__dirname, '../../services/websocket.ts'),
  'utf8'
);
const authSrc = fs.readFileSync(
  path.resolve(__dirname, '../../components/Auth.tsx'),
  'utf8'
);

describe('production URL fallback (no hardcoded localhost)', () => {
  it('websocket.ts does NOT hardcode ws://localhost:3001 fallback', () => {
    // Fallback must derive from window.location.origin so production
    // builds connect to the host that served the bundle.
    expect(wsSrc).not.toMatch(/'http:\/\/localhost:3001'/);
  });

  it('websocket.ts derives apiUrl from window.location.origin when no VITE_API_URL', () => {
    expect(wsSrc).toMatch(/window\.location\.origin/);
  });

  it('Auth.tsx invitation accept does not hardcode localhost fallback', () => {
    // Empty string fallback yields a relative URL which works on the same origin.
    expect(authSrc).not.toMatch(/'http:\/\/localhost:3001'\/api\/v1\/invitations\/accept/);
  });
});
