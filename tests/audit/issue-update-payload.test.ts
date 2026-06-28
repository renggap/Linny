import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

const wsSrc = fs.readFileSync(
  path.resolve(__dirname, '../../server/websocket/fastifyWebSocketRoutes.ts'),
  'utf8'
);
const issuesSrc = fs.readFileSync(
  path.resolve(__dirname, '../../server/routes/issues.fastify.ts'),
  'utf8'
);

describe('issue_updated payload shape', () => {
  it('broadcastIssueUpdate wraps the issue under data.issue', () => {
    const block = wsSrc.match(/export function broadcastIssueUpdate[\s\S]*?^}/m)?.[0] ?? '';
    expect(block).toMatch(/data:\s*\{\s*issueId,\s*issue\s*\}/);
    // Must NOT spread arbitrary data
    expect(block).not.toMatch(/\.\.\.data/);
  });

  it('status-change callsite passes the full updated issue object', () => {
    // Find the /:id/status handler
    const block = issuesSrc.match(/fastify\.post\('\/:id\/status'[\s\S]*?\n  \}\);/m)?.[0] ?? '';
    expect(block).toMatch(/broadcastIssueUpdate\(\s*id,\s*sanitizedIssue|broadcastIssueUpdate\(\s*id,\s*\{[^}]*issue:\s*sanitizedIssue/);
  });

  it('PATCH /:id callsite still passes a sanitized issue', () => {
    // Existing callsite at line 255 already passes sanitizedIssue — should keep working
    const matches = issuesSrc.match(/broadcastIssueUpdate\([^)]+\)/g) ?? [];
    // 2 callsites expected (PATCH and status-change)
    expect(matches.length).toBe(2);
    // Both should pass a sanitized or full issue, not a partial like { status }
    matches.forEach(call => {
      expect(call).not.toMatch(/\{\s*status:\s*updatedIssue\.status\s*\}/);
    });
  });
});
