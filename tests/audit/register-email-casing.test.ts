import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

const src = fs.readFileSync(
  path.resolve(__dirname, '../../server/routes/auth.fastify.ts'),
  'utf8'
);

function extractRegisterHandler(): string {
  const startIdx = src.indexOf(`fastify.post('/register'`);
  if (startIdx === -1) return '';
  const after = src.slice(startIdx);
  const next = after.match(/\n\s*fastify\.(post|get|put|patch|delete)\(/);
  return after.slice(0, next ? next.index : after.length);
}

describe('register email casing', () => {
  it('lowercases email before storing and before duplicate check', () => {
    const block = extractRegisterHandler();
    expect(block).toMatch(/const normalizedEmail\s*=\s*email\.toLowerCase\(\)/);
    expect(block).toMatch(/findUnique\(\s*{\s*where:\s*{\s*email:\s*normalizedEmail\s*}\s*}\s*\)/);
    expect(block).toMatch(/data:\s*\{[\s\S]*?email:\s*normalizedEmail[\s\S]*?\}/);
  });
});
