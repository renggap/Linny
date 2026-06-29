import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

const src = fs.readFileSync(
  path.resolve(__dirname, '../../server/routes/activities.fastify.ts'),
  'utf8'
);

function extractGetHandler(): string {
  const startIdx = src.indexOf(`fastify.get('/'`);
  if (startIdx === -1) return '';
  const after = src.slice(startIdx);
  const next = after.match(/\n\s*fastify\.(post|get|put|patch|delete)\(/);
  return after.slice(0, next ? next.index : after.length);
}

describe('GET /activities membership gate', () => {
  it('checks team membership for the requested teamId', () => {
    const block = extractGetHandler();
    expect(block).toMatch(/request\.userId/);
    expect(block).toMatch(/request\.userRole/);
    expect(block).toMatch(/teamMember\.findUnique/);
    expect(block).toMatch(/Forbidden|403/);
  });

  it('bypasses for Administrators', () => {
    const block = extractGetHandler();
    expect(block).toMatch(/request\.userRole\s*!==\s*['"]Administrator['"]/);
  });

  it('requires teamId (400 when missing for non-admins)', () => {
    const block = extractGetHandler();
    expect(block).toMatch(/teamId is required|400/);
  });
});
