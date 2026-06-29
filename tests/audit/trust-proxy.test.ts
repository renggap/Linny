import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

const src = fs.readFileSync(
  path.resolve(__dirname, '../../server/index.ts'),
  'utf8'
);

describe('Fastify trustProxy', () => {
  it('declares trustProxy: true in the Fastify constructor', () => {
    const block = src.match(/const\s+fastify\s*=\s*Fastify\(\s*\{[\s\S]*?\}\s*\)/)?.[0] ?? '';
    expect(block).toMatch(/trustProxy:\s*true/);
  });
});
