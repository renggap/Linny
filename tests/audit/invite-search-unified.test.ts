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

  it('top button is labeled "Invite by Email" (not the confusing "Invite User")', () => {
    // Bug: the original "Invite User" button just switched to the invite tab.
    // With non-members now surfaced inline with Add buttons, the top button's
    // purpose needed clarification — users thought it would invite the
    // currently-searched user directly.
    expect(src).toMatch(/Invite by Email/);
    expect(src).not.toMatch(/>Invite User</);
  });

  it('email tab does not use justify-center (which clips button past scroll boundary)', () => {
    // Bug: <div className="p-10 flex flex-col justify-center"> centered form
    // vertically. When form height exceeded container, justify-center pushed
    // the submit button below the scrollable area, making it unreachable.
    expect(src).not.toMatch(/p-10 flex flex-col justify-center/);
  });
});

describe('team cache refresh after invite', () => {
  it('App.tsx invalidates teams + users queries after handleInviteUser', () => {
    const appSrc = fs.readFileSync(
      path.resolve(__dirname, '../../App.tsx'),
      'utf8'
    );
    // Find the handleInviteUser prop wiring
    const block = appSrc.match(/handleInviteUser=\{[\s\S]*?\}\}/)?.[0] ?? '';
    expect(block).toMatch(/invalidateQueries\(\{ queryKey: \['teams'\] \}\)/);
    expect(block).toMatch(/invalidateQueries\(\{ queryKey: \['users'\] \}\)/);
    expect(block).not.toMatch(/alert\(/);
  });
});

describe('modal state resets on close', () => {
  it('UserManagementModal resets view state when isOpen becomes false', () => {
    // Bug: when !isOpen the component returned null but its local state
    // (view, inviteMethod, searchQuery, etc.) persisted. Reopening the
    // modal resumed the previous invite-by-email view instead of the
    // member list.
    const src = fs.readFileSync(
      path.resolve(__dirname, '../../components/UserManagementModal.tsx'),
      'utf8'
    );
    expect(src).toMatch(/useEffect\(\(\) => \{[\s\S]*?if \(!isOpen\)/);
    // Must reset view, inviteMethod, searchQuery, inviteSearchQuery
    expect(src).toMatch(/setView\('list'\)/);
    expect(src).toMatch(/setInviteMethod\('existing'\)/);
    expect(src).toMatch(/setSearchQuery\(''\)/);
    expect(src).toMatch(/setInviteSearchQuery\(''\)/);
  });
});

describe('project icon picker has expanded icon set', () => {
  it('ProjectModal offers more icons than the original 24', () => {
    const src = fs.readFileSync(
      path.resolve(__dirname, '../../components/ProjectModal.tsx'),
      'utf8'
    );
    // Count single-quoted emoji literals in the icon array. Emojis are
    // non-ASCII; matching any non-ASCII char inside single quotes.
    const iconBlock = src.match(/\[\s*\/\/ Tech[\s\S]*?\]/)?.[0] ?? '';
    const emojiCount = (iconBlock.match(/'[^']{1,4}'/g) || []).length;
    expect(emojiCount).toBeGreaterThanOrEqual(48);
  });
});
