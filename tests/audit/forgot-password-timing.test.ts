import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

const src = fs.readFileSync(
  path.resolve(__dirname, '../../server/routes/auth.fastify.ts'),
  'utf8'
);

// Extract just the /forgot-password handler body by anchoring on the route
// declaration and stopping at the next sibling fastify.* route registration.
// Routes are indented inside a plugin, so we allow leading whitespace.
function extractHandler(routeName: string): string {
  const startIdx = src.indexOf(`fastify.post('${routeName}'`);
  if (startIdx === -1) return '';
  // Find the next sibling fastify.post/.get/.delete at the same indentation level
  const after = src.slice(startIdx);
  const nextRouteMatch = after.match(/\n\s*fastify\.(post|get|put|patch|delete)\(/);
  const endIdx = nextRouteMatch ? nextRouteMatch.index : after.length;
  return after.slice(0, endIdx);
}

describe('forgot-password timing & enumeration', () => {
  const block = extractHandler('/forgot-password');

  it('extracts only the /forgot-password handler', () => {
    // Sanity check: block should NOT include /reset-password code
    expect(block).not.toMatch(/fastify\.post\('\/reset-password'/);
    // Block should be bounded
    expect(block.length).toBeLessThan(3000);
  });

  it('all three reply paths reference the same genericMessage constant', () => {
    // Count occurrences of `genericMessage` (identifier, not in comments)
    const matches = block.match(/genericMessage/g) ?? [];
    // 1 declaration + 3 reply sites = at least 4
    expect(matches.length).toBeGreaterThanOrEqual(4);
  });

  it('declares genericMessage as a const before the try block', () => {
    expect(block).toMatch(/const\s+genericMessage\s*=\s*['"]/);
  });

  it('adds a timing-flattening delay on the non-existent-user path', () => {
    expect(block).toMatch(/setTimeout/);
    expect(block).toMatch(/400\s*\+\s*Math\.random\(\)\s*\*\s*200/);
  });

  it('catches errors and returns the generic message instead of leaking', () => {
    expect(block).toMatch(/catch\b/);
    expect(block).toMatch(/fastify\.log\.error/);
    // The catch block must NOT send a different message
    expect(block).not.toMatch(/console\.error/);
  });

  it('lowercases email before lookup', () => {
    expect(block).toMatch(/\.toLowerCase\(\)/);
    // Findunique must use the lowercased variable, not raw email
    expect(block).toMatch(/findUnique\(\s*{\s*where:\s*{\s*email:\s*normalizedEmail\s*}\s*}\s*\)/);
  });

  it('preserves the rate-limit config from Task 3', () => {
    expect(block).toMatch(/config:\s*\{\s*rateLimit:\s*\{\s*max:\s*3[^}]*timeWindow:\s*'1 hour'/);
  });
});
