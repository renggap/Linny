import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

const src = fs.readFileSync(
  path.resolve(__dirname, '../../server/routes/auth.fastify.ts'),
  'utf8'
);

function extractHandler(routeName: string): string {
  const startIdx = src.indexOf(`fastify.post('${routeName}'`);
  if (startIdx === -1) return '';
  const after = src.slice(startIdx);
  const next = after.match(/\n\s*fastify\.(post|get|put|patch|delete)\(/);
  return after.slice(0, next ? next.index : after.length);
}

describe('debug log strip', () => {
  it('/refresh handler has zero console.log statements', () => {
    const block = extractHandler('/refresh');
    expect(block).not.toMatch(/console\.log/);
  });

  it('/refresh handler still uses structured fastify.log.error in catch', () => {
    const block = extractHandler('/refresh');
    expect(block).toMatch(/fastify\.log\.error/);
  });

  it('/login handler has zero console.log statements', () => {
    const block = extractHandler('/login');
    expect(block).not.toMatch(/console\.log/);
  });
});
