import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

const src = fs.readFileSync(
  path.resolve(__dirname, '../../server/index.ts'),
  'utf8'
);

describe('CSP FRONTEND_URL production guard', () => {
  it('co-locates NODE_ENV=production, FRONTEND_URL, and process.exit(1) within one guard block', () => {
    // Tight window — guard must be a small contiguous block, not scattered across the file.
    // If someone removes the guard, this regex no longer matches.
    const re = /process\.env\.NODE_ENV\s*===\s*['"]production['"][\s\S]{0,400}?FRONTEND_URL[\s\S]{0,400}?process\.exit\(1\)/;
    expect(src).toMatch(re);
  });

  it('logs a FATAL message that mentions FRONTEND_URL within the guard block', () => {
    // FATAL + FRONTEND_URL + exit(1) must all sit inside the same small block.
    const re = /FATAL:[\s\S]{0,300}?FRONTEND_URL[\s\S]{0,300}?process\.exit\(1\)/;
    expect(src).toMatch(re);
  });
});
