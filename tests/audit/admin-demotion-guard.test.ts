import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

const src = fs.readFileSync(
  path.resolve(__dirname, '../../server/routes/users.fastify.ts'),
  'utf8'
);

function extractRoleHandler(): string {
  const startIdx = src.indexOf(`fastify.patch('/:id/role'`);
  if (startIdx === -1) return '';
  const after = src.slice(startIdx);
  const next = after.match(/\n\s*fastify\.(post|get|put|patch|delete)\(/);
  return after.slice(0, next ? next.index : after.length);
}

describe('admin demotion guard', () => {
  it('looks up the target user before changing role', () => {
    const block = extractRoleHandler();
    expect(block).toMatch(/prisma\.user\.findUnique\(\s*{\s*where:\s*{\s*id\s*}\s*}\s*\)/);
  });

  it('rejects when target is Administrator and caller is not Administrator', () => {
    const block = extractRoleHandler();
    expect(block).toMatch(/targetUser\.role\s*===\s*['"]Administrator['"]/);
    expect(block).toMatch(/request\.userRole\s*!==\s*['"]Administrator['"]/);
    expect(block).toMatch(/Forbidden|cannot.*demote.*Administrator/i);
  });

  it('returns 404 when target user does not exist', () => {
    const block = extractRoleHandler();
    expect(block).toMatch(/404/);
    expect(block).toMatch(/User not found/);
  });
});
