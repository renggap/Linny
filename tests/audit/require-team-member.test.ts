import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

const src = fs.readFileSync(
  path.resolve(__dirname, '../../server/middleware/authHooks.ts'),
  'utf8'
);

describe('requireTeamMember strict semantics', () => {
  it('is no longer aliased to requireTeamAccess', () => {
    expect(src).not.toMatch(/export const requireTeamMember\s*=\s*requireTeamAccess/);
  });

  it('declares requireTeamMember as its own function', () => {
    expect(src).toMatch(/export async function requireTeamMember\s*\(request:\s*FastifyRequest,\s*reply:\s*FastifyReply\)/);
  });

  it('denies non-members for BOTH stealth and non-stealth teams', () => {
    const block = src.match(/export async function requireTeamMember[\s\S]*?^}/m)?.[0] ?? '';
    expect(block).toMatch(/await authenticate/);
    expect(block).toMatch(/teamMember\.findUnique/);
    // Strict: deny if no membership AND not Administrator
    expect(block).toMatch(/if\s*\(\s*!membership\s*\)/);
    expect(block).toMatch(/Forbidden:\s*Team membership required/);
    // Must NOT consult isStealth (permissive)
    expect(block).not.toMatch(/isStealth/);
  });

  it('still exports requireTeamAccess for backward-compatibility reads', () => {
    expect(src).toMatch(/export async function requireTeamAccess/);
  });
});
