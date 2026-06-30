import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

function read(rel: string): string {
  return fs.readFileSync(path.resolve(__dirname, '../..', rel), 'utf8');
}

describe('professional wording (no cyberpunk/creative terms)', () => {
  it('Auth.tsx uses professional labels and placeholders', () => {
    const src = read('components/Auth.tsx');
    expect(src).toMatch(/Full Name/);
    expect(src).toMatch(/placeholder="Enter your full name"/);
    expect(src).toMatch(/>Email</);
    expect(src).toMatch(/>Password</);
    expect(src).toMatch(/placeholder="you@example.com"/);
    // Banned creative terms
    expect(src).not.toMatch(/Identity Name/);
    expect(src).not.toMatch(/Access Email/);
    expect(src).not.toMatch(/Pass-Key/);
    expect(src).not.toMatch(/Specify identity/);
    expect(src).not.toMatch(/Secure Initializing/);
    expect(src).not.toMatch(/address@nodex/);
  });

  it('IssueModal uses Priority / Assignees / Subtasks / Comments / Saving / Saved', () => {
    const src = read('components/IssueModal.tsx');
    expect(src).toMatch(/> Priority/);
    expect(src).toMatch(/> Assignees/);
    expect(src).toMatch(/> Subtasks/);
    expect(src).toMatch(/Add subtask/);
    expect(src).toMatch(/> Comments/);
    expect(src).toMatch(/'Saving'/);
    expect(src).toMatch(/'Saved'/);
    // Banned creative terms
    expect(src).not.toMatch(/Criticality/);
    expect(src).not.toMatch(/Personnel/);
    expect(src).not.toMatch(/Sub-objectives/);
    expect(src).not.toMatch(/Add sub-objective/);
    expect(src).not.toMatch(/Communications/);
    expect(src).not.toMatch(/Syncing/);
    expect(src).not.toMatch(/Synced/);
  });

  it('NotificationPopover uses "No new notifications" + "Notifications"', () => {
    const src = read('components/NotificationPopover.tsx');
    expect(src).toMatch(/No new notifications/);
    expect(src).toMatch(/>Notifications</);
    expect(src).not.toMatch(/Signal Clear/);
    expect(src).not.toMatch(/Notification Registry/);
  });

  it('PublicProjectView uses "Back to Home" + "Public Project" + "Read Only"', () => {
    const src = read('components/PublicProjectView.tsx');
    expect(src).toMatch(/Back to Home/);
    expect(src).toMatch(/Public Project/);
    expect(src).toMatch(/Read Only\b/);
    expect(src).not.toMatch(/Return to Terminal/);
    expect(src).not.toMatch(/Public Registry/);
    expect(src).not.toMatch(/Object not found/);
  });

  it('TeamModal uses "Workspace Slug" instead of "Terminal Handle"', () => {
    const src = read('components/TeamModal.tsx');
    expect(src).toMatch(/Workspace Slug/);
    expect(src).not.toMatch(/Terminal Handle/);
  });

  it('PasswordResetModal uses professional email placeholder', () => {
    const src = read('components/PasswordResetModal.tsx');
    expect(src).toMatch(/you@example.com/);
    expect(src).not.toMatch(/address@nodex/);
  });

  it('no Indonesian wording remains (Lupa Password, Halo Kak, etc.)', () => {
    const files = [
      'components/Auth.tsx',
      'components/PasswordResetModal.tsx',
      'components/ResetPasswordPage.tsx',
      'server/auth/email.ts',
      'server/test-email.ts'
    ];
    for (const rel of files) {
      const src = read(rel);
      expect(src).not.toMatch(/Lupa Password/);
      expect(src).not.toMatch(/Halo Kak/);
      expect(src).not.toMatch(/Ini adalah/);
      expect(src).not.toMatch(/Kalau kakak/);
    }
  });

  it('app is branded "Linny" — no Neo Linear or Linear mentions in user-facing text', () => {
    const files = [
      'components/Auth.tsx',
      'components/PublicProjectView.tsx',
      'components/PasswordResetModal.tsx',
      'components/ResetPasswordPage.tsx',
      'index.html',
      'utils/consoleBanner.ts',
      'server/auth/email.ts',
      'server/test-email.ts'
    ];
    for (const rel of files) {
      const src = read(rel);
      // "Neo Linear" must not appear
      expect(src).not.toMatch(/Neo Linear/);
      // ">Linear<" catches the old h1 "Linear" heading
      expect(src).not.toMatch(/>Linear</);
    }

    // Positive: index title is Linny, console banner says Linny
    expect(read('index.html')).toMatch(/<title>Linny</);
    expect(read('utils/consoleBanner.ts')).toMatch(/Linny/);
  });
});
