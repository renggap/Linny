import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

const src = fs.readFileSync(
  path.resolve(__dirname, '../../server/index.ts'),
  'utf8'
);

describe('Helmet CSP production config', () => {
  it('does NOT disable CSP via : false in the isDevelopment ternary', () => {
    expect(src).not.toMatch(/contentSecurityPolicy:\s*isDevelopment\s*\?[^:]+:\s*false/);
  });

  it('declares CSP directives used in both dev and prod', () => {
    const block = src.match(/async function securityPlugin[\s\S]*?^\}/m)?.[0] ?? '';
    expect(block).toMatch(/contentSecurityPolicy/);
    expect(block).toMatch(/defaultSrc/);
    expect(block).toMatch(/scriptSrc/);
    expect(block).toMatch(/frameSrc/);
  });

  it('uses FRONTEND_URL in connectSrc so production UI is allowed', () => {
    const block = src.match(/async function securityPlugin[\s\S]*?^\}/m)?.[0] ?? '';
    expect(block).toMatch(/FRONTEND_URL/);
  });

  it('derives wss:// URLs from FRONTEND_URL for production WebSocket', () => {
    const block = src.match(/async function securityPlugin[\s\S]*?^\}/m)?.[0] ?? '';
    expect(block).toMatch(/wss:/);
    expect(block).toMatch(/FRONTEND_URL[\s\S]*replace\(\s*\/\^https:/);
  });
});
