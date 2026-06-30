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

describe('Sidebar crown uses team-scoped role, not global', () => {
  // Bug: after demoting a global Administrator to team Member, the sidebar
  // still showed a crown next to their name. Sidebar.tsx used
  // getEffectiveRole which short-circuits on global admin role.

  it('Sidebar no longer uses getEffectiveRole for badge + sort', () => {
    const sidebarSrc = fs.readFileSync(
      path.resolve(__dirname, '../../components/Sidebar.tsx'),
      'utf8'
    );
    // Badge display + sort comparator should both use getTeamRole now.
    const badgeLine = sidebarSrc.match(/const effectiveRole = getTeamRole\(user, currentTeam\)/);
    expect(badgeLine).toBeTruthy();
    const sortALine = sidebarSrc.match(/const roleA = getTeamRole\(a, currentTeam\)/);
    const sortBLine = sidebarSrc.match(/const roleB = getTeamRole\(b, currentTeam\)/);
    expect(sortALine).toBeTruthy();
    expect(sortBLine).toBeTruthy();
    // No remaining getEffectiveRole function CALLS in Sidebar (mentions
    // in comments are fine — they document the old behavior).
    const callPattern = /[^/\s]\s*getEffectiveRole\(|=\s*getEffectiveRole\(/;
    expect(sidebarSrc).not.toMatch(callPattern);
  });
});
