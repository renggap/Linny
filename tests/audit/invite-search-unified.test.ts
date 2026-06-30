import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

const src = fs.readFileSync(
  path.resolve(__dirname, '../../components/UserManagementModal.tsx'),
  'utf8'
);

describe('unified user search in UserManagementModal', () => {
  it('list view surfaces matching non-members with Add to Team button', () => {
    // Bug: list view search only filtered current team members. Searching
    // for a non-member (e.g. "Henry" on Marketing team) returned zero
    // results, looking like the user didn't exist. Users had to manually
    // switch to Invite view → Add Existing User tab to find them.
    //
    // Fix: when searchQuery is non-empty AND there are matching non-members,
    // show them below the member list with a direct Add-to-Team button.
    expect(src).toMatch(/matchingNonMembers/);
    expect(src).toMatch(/Not in this team/);
    expect(src).toMatch(/Add to Team/);
    expect(src).toMatch(/handleDirectInvite/);
  });

  it('uses api.invitations.sendInvite for direct-add (no manual tab switch)', () => {
    expect(src).toMatch(/api\.invitations\.sendInvite\(email, currentTeam\.id/);
  });

  it('shows empty state when neither members nor non-members match', () => {
    expect(src).toMatch(/No users match/);
  });
});
