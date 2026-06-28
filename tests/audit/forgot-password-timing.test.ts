import { describe, it, expect } from 'vitest';
import fs from 'fs';

describe('forgot-password timing & enumeration', () => {
  it('returns the same message regardless of whether user exists', () => {
    const src = fs.readFileSync('./server/routes/auth.fastify.ts', 'utf8');
    const block = src.match(/fastify\.post\('\/forgot-password'[\s\S]*?^\};/m)?.[0] ?? '';
    // Count occurrences of the generic success message — should appear at both
    // the non-existent path and the success path
    const matches = block.match(/udah dikirim/g) ?? [];
    expect(matches.length).toBeGreaterThanOrEqual(2);
  });

  it('adds a timing-flattening delay on the non-existent-user path', () => {
    const src = fs.readFileSync('./server/routes/auth.fastify.ts', 'utf8');
    const block = src.match(/fastify\.post\('\/forgot-password'[\s\S]*?^\};/m)?.[0] ?? '';
    expect(block).toMatch(/setTimeout/);
  });

  it('catches errors and returns the generic message instead of leaking', () => {
    const src = fs.readFileSync('./server/routes/auth.fastify.ts', 'utf8');
    const block = src.match(/fastify\.post\('\/forgot-password'[\s\S]*?^\};/m)?.[0] ?? '';
    // The catch block must reply with the generic message, not the error
    expect(block).toMatch(/catch[^{]*\{[\s\S]*reply\.send\(\s*\{\s*message:\s*genericMessage\s*\}/);
  });

  it('lowercases email before lookup', () => {
    const src = fs.readFileSync('./server/routes/auth.fastify.ts', 'utf8');
    const block = src.match(/fastify\.post\('\/forgot-password'[\s\S]*?^\};/m)?.[0] ?? '';
    expect(block).toMatch(/\.toLowerCase\(\)/);
  });
});
