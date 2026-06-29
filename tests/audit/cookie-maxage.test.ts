import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

const src = fs.readFileSync(
  path.resolve(__dirname, '../../server/routes/auth.fastify.ts'),
  'utf8'
);

describe('refresh token cookie maxAge', () => {
  it('does NOT multiply by 1000 (would mean milliseconds-seconds confusion)', () => {
    const block = src.match(/setRefreshTokenCookie[\s\S]*?path:\s*['"]\/['"]/)?.[0] ?? '';
    expect(block.length).toBeGreaterThan(0);
    const maxAgeLine = block.match(/maxAge:\s*([^,]+)/)?.[0] ?? '';
    expect(maxAgeLine).not.toMatch(/\*\s*1000/);
  });

  it('maxAge evaluates to 7 days in seconds (604800)', () => {
    const block = src.match(/setRefreshTokenCookie[\s\S]*?path:\s*['"]\/['"]/)?.[0] ?? '';
    const maxAgeLine = block.match(/maxAge:\s*([^,]+)/)?.[0] ?? '';
    expect(maxAgeLine).toMatch(/7\s*\*\s*24\s*\*\s*60\s*\*\s*60(?!\s*\*\s*1000)/);
  });
});
