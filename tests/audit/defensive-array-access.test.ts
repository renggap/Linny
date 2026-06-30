import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

function read(rel: string): string {
  return fs.readFileSync(path.resolve(__dirname, '../..', rel), 'utf8');
}

describe('defensive array access on entities that may have undefined fields', () => {
  // Bug: clicking team switcher threw "Cannot read properties of undefined
  // (reading 'includes')" because issue.assigneeIds / team.members can be
  // undefined when data arrives from websocket updates, optimistic updates,
  // or stale cache during team switch. transformIssue defaults to [] but
  // does not cover every code path.

  it('IssueList uses optional chaining on issue.assigneeIds.includes', () => {
    const src = read('components/IssueList.tsx');
    expect(src).toMatch(/issue\.assigneeIds\?\.includes/);
    expect(src).not.toMatch(/issue\.assigneeIds\.includes/);
  });

  it('BoardView uses optional chaining on issue.assigneeIds.includes', () => {
    const src = read('components/BoardView.tsx');
    expect(src).toMatch(/issue\.assigneeIds\?\.includes/);
    expect(src).not.toMatch(/issue\.assigneeIds\.includes/);
  });

  it('TeamDashboard uses optional chaining on i.assigneeIds.includes', () => {
    const src = read('components/TeamDashboard.tsx');
    expect(src).toMatch(/i\.assigneeIds\?\.includes/);
    expect(src).not.toMatch(/i\.assigneeIds\.includes/);
  });

  it('TimelineView uses optional chaining on issue.assigneeIds.length + .includes', () => {
    const src = read('components/TimelineView.tsx');
    expect(src).toMatch(/issue\.assigneeIds\?\.length/);
    expect(src).toMatch(/issue\.assigneeIds\?\.includes/);
  });

  it('ProjectRightSidebar uses optional chaining on issue.assigneeIds.forEach', () => {
    const src = read('components/ProjectRightSidebar.tsx');
    expect(src).toMatch(/issue\.assigneeIds\?\.forEach/);
  });

  it('MainView guards currentTeam.members access', () => {
    const src = read('components/MainView.tsx');
    // Either optional chaining or explicit || [] fallback
    expect(src).toMatch(/currentTeam\.members \|\| \[\]|currentTeam\?\.members\?\.includes/);
  });

  it('useInitialData guards team.members.includes', () => {
    const src = read('hooks/useInitialData.ts');
    expect(src).toMatch(/team\.members \|\| \[\]/);
  });
});
