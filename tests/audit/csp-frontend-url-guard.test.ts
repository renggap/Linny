import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

const src = fs.readFileSync(
  path.resolve(__dirname, '../../server/index.ts'),
  'utf8'
);

describe('CSP FRONTEND_URL production guard', () => {
  it('checks FRONTEND_URL when NODE_ENV is production', () => {
    expect(src).toMatch(/process\.env\.NODE_ENV\s*===\s*['"]production['"]/);
    expect(src).toMatch(/FRONTEND_URL/);
    expect(src).toMatch(/process\.exit\(1\)/);
  });

  it('logs a clear FATAL message mentioning FRONTEND_URL and CSP', () => {
    const guardBlock = src.match(/process\.env\.NODE_ENV\s*===\s*['"]production['"][\s\S]*?process\.exit\(1\)/)?.[0] ?? '';
    expect(guardBlock).toMatch(/FRONTEND_URL/);
    expect(guardBlock).toMatch(/FATAL|required|CSP/i);
  });
});
