import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

const src = fs.readFileSync(
  path.resolve(__dirname, '../../server/websocket/fastifyWebSocketRoutes.ts'),
  'utf8'
);

function extractHandler(routePath: string): string {
  const startIdx = src.indexOf(`fastify.get('${routePath}'`);
  if (startIdx === -1) return '';
  const after = src.slice(startIdx);
  const nextRouteMatch = after.match(/\n\s*fastify\.(post|get|put|patch|delete)\(/);
  const endIdx = nextRouteMatch ? nextRouteMatch.index : after.length;
  return after.slice(0, endIdx);
}

describe('WebSocket team-membership gate', () => {
  it('/ws/issue handler fetches issue with team and checks TeamMember', () => {
    const block = extractHandler('/ws/issue/:issueId');
    expect(block).toMatch(/prisma\.issue\.findUnique/);
    expect(block).toMatch(/project:\s*\{\s*select:\s*\{\s*teamId/);
    expect(block).toMatch(/teamMember\.findUnique/);
  });

  it('/ws/issue handler closes connection when issue not found', () => {
    const block = extractHandler('/ws/issue/:issueId');
    expect(block).toMatch(/ws\.close\(1008, ['"]Issue not found['"]\)/);
  });

  it('/ws/issue handler closes connection when team is stealth and user is not a member', () => {
    const block = extractHandler('/ws/issue/:issueId');
    expect(block).toMatch(/isStealth/);
    expect(block).toMatch(/ws\.close\(1008, ['"]Not authorized/);
  });

  it('/ws/project handler fetches project with team and checks TeamMember', () => {
    const block = extractHandler('/ws/project/:projectId');
    expect(block).toMatch(/prisma\.project\.findUnique/);
    expect(block).toMatch(/teamId/);
    expect(block).toMatch(/teamMember\.findUnique/);
  });

  it('/ws/project handler closes connection when project not found', () => {
    const block = extractHandler('/ws/project/:projectId');
    expect(block).toMatch(/ws\.close\(1008, ['"]Project not found['"]\)/);
  });

  it('does not require membership for non-stealth teams', () => {
    // Both handlers must check isStealth before requiring membership.
    const issueBlock = extractHandler('/ws/issue/:issueId');
    const projectBlock = extractHandler('/ws/project/:projectId');
    expect(issueBlock).toMatch(/isStealth/);
    expect(projectBlock).toMatch(/isStealth/);
  });
});
