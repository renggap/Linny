import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

const issuesSrc = fs.readFileSync(
  path.resolve(__dirname, '../../server/routes/issues.fastify.ts'),
  'utf8'
);
const projectsSrc = fs.readFileSync(
  path.resolve(__dirname, '../../server/routes/projects.fastify.ts'),
  'utf8'
);

function extractFirstRoute(src: string, routePath: string): string {
  const startIdx = src.indexOf(`fastify.get('${routePath}'`);
  if (startIdx === -1) return '';
  const after = src.slice(startIdx);
  const next = after.match(/\n\s*fastify\.(post|get|put|patch|delete)\(/);
  return after.slice(0, next ? next.index : after.length);
}

describe('GET /issues membership gate', () => {
  it('verifies team membership for the requested teamId', () => {
    const block = extractFirstRoute(issuesSrc, '/');
    expect(block).toMatch(/request\.userId/);
    expect(block).toMatch(/request\.userRole/);
    expect(block).toMatch(/teamMember\.findUnique|teamMember\.findMany/);
    expect(block).toMatch(/Forbidden|403|visibleTeamIds|membership/);
  });
});

describe('GET /projects membership gate', () => {
  it('verifies team membership for the requested teamId', () => {
    const block = extractFirstRoute(projectsSrc, '/');
    expect(block).toMatch(/request\.userId/);
    expect(block).toMatch(/request\.userRole/);
    expect(block).toMatch(/teamMember\.findUnique|teamMember\.findMany/);
    expect(block).toMatch(/Forbidden|403|membership/);
  });
});
