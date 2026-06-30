import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

const appSrc = fs.readFileSync(
  path.resolve(__dirname, '../../App.tsx'),
  'utf8'
);
const modalSrc = fs.readFileSync(
  path.resolve(__dirname, '../../components/UserManagementModal.tsx'),
  'utf8'
);

describe('remove-from-team preserves the user account', () => {
  // CRITICAL bug: handleRemoveUser previously called api.users.remove(id)
  // which hits DELETE /users/:id and permanently destroys the user record
  // across ALL teams. The correct call is api.teams.removeMember(teamId,
  // userId) which only deletes the TeamMember junction row.

  it('App.tsx handleRemoveUser calls api.teams.removeMember, NOT api.users.remove', () => {
    const block = appSrc.match(/handleRemoveUser=\{[\s\S]*?\}\}/)?.[0] ?? '';
    expect(block).toMatch(/api\.teams\.removeMember\(teamId,\s*id\)/);
    expect(block).not.toMatch(/api\.users\.remove/);
  });

  it('optimistic update targets the teams query (not users)', () => {
    // Old code did setQueryData(['users'], filter) which removed the user
    // from the global list entirely. New code removes only from the team's
    // members array in the teams cache.
    const block = appSrc.match(/handleRemoveUser=\{[\s\S]*?\}\}/)?.[0] ?? '';
    expect(block).toMatch(/setQueryData\(\['teams'\]/);
    expect(block).not.toMatch(/setQueryData\(\['users'\]/);
  });

  it('requires currentTeam before doing anything', () => {
    const block = appSrc.match(/handleRemoveUser=\{[\s\S]*?\}\}/)?.[0] ?? '';
    expect(block).toMatch(/if \(!currentTeam\) return/);
  });

  it('UserManagementModal uses confirm() + UserMinus icon (no silent Trash2 delete)', () => {
    expect(modalSrc).toMatch(/window\.confirm/);
    expect(modalSrc).toMatch(/UserMinus/);
    // The destructive Trash2 icon should not be used for what is now a
    // reversible team-membership removal.
    expect(modalSrc).not.toMatch(/<Trash2/);
  });
});
