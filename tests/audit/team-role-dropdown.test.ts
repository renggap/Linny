import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

const roleUtilsSrc = fs.readFileSync(
  path.resolve(__dirname, '../../lib/roleUtils.ts'),
  'utf8'
);
const modalSrc = fs.readFileSync(
  path.resolve(__dirname, '../../components/UserManagementModal.tsx'),
  'utf8'
);

describe('team role dropdown shows team-specific role (not global)', () => {
  // Bug: dropdown used getEffectiveRole for the <select> value, but
  // onUpdateRole writes the team-scoped role. Global Administrators
  // always have effective role = Administrator, so the dropdown
  // appeared permanently stuck on ADMINISTRATOR — selecting Member
  // saved fine but the dropdown never showed the change. Users
  // reported "cannot demote" because they thought the save failed.

  it('roleUtils exports getTeamRole (separate from getEffectiveRole)', () => {
    expect(roleUtilsSrc).toMatch(/export function getTeamRole/);
    // Must NOT short-circuit on global Administrator role
    const fn = roleUtilsSrc.match(/export function getTeamRole[\s\S]*?^\}/m)?.[0] ?? '';
    expect(fn).not.toMatch(/if \(user\.role === UserRole\.Administrator\) return/);
    expect(fn).toMatch(/membersWithRoles\.find/);
  });

  it('UserManagementModal <select> uses getTeamRole for its value', () => {
    const selectBlock = modalSrc.match(/<select[\s\S]*?<\/select>/)?.[0] ?? '';
    expect(selectBlock).toMatch(/value=\{getTeamRole\(user, currentTeam\)\}/);
    expect(selectBlock).not.toMatch(/value=\{getEffectiveRole/);
  });

  it('read-only role badge also uses getTeamRole', () => {
    expect(modalSrc).toMatch(/import.*getTeamRole.*from.*roleUtils/);
  });
});
