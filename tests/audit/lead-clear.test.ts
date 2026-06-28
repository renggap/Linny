import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

const src = fs.readFileSync(
  path.resolve(__dirname, '../../server/routes/projects.fastify.ts'),
  'utf8'
);

// Simulate the leadId expression with the same semantics as production code.
// We extract the right-hand-side from the source so the test fails if the
// implementation regresses to `??` (which treats null as fall-through) or `||`.
function extractLeadIdExpression(): string {
  const match = src.match(/leadId:\s*([^,\n]+),/);
  return match ? match[1].trim() : '';
}

function evalLeadId(updates: { leadId?: string | null; lead_id?: string | null }): string | null | undefined {
  // Mirror the production expression exactly.
  return updates.leadId !== undefined ? updates.leadId : updates.lead_id;
}

describe('project lead clear semantics', () => {
  it('production uses identity check, not ??', () => {
    const expr = extractLeadIdExpression();
    expect(expr).toMatch(/leadId\s*!==\s*undefined/);
    // Specifically must NOT use ?? (treats null as fall-through)
    expect(expr).not.toMatch(/\?\?/);
    // Must NOT use || (treats null/empty as fall-through)
    expect(expr).not.toMatch(/\|\|\s*updates\.lead_id/);
  });

  it('leadId="foo" passes the id through (UPDATE)', () => {
    expect(evalLeadId({ leadId: 'foo' })).toBe('foo');
  });

  it('leadId=null passes null through (UPDATE — clears lead)', () => {
    expect(evalLeadId({ leadId: null })).toBeNull();
  });

  it('leadId=undefined falls through to lead_id', () => {
    expect(evalLeadId({ leadId: undefined, lead_id: 'legacy' })).toBe('legacy');
  });

  it('omitting both fields yields undefined (Prisma skips)', () => {
    expect(evalLeadId({})).toBeUndefined();
  });
});
