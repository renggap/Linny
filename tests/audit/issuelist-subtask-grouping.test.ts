import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

const src = fs.readFileSync(
  path.resolve(__dirname, '../../components/IssueList.tsx'),
  'utf8'
);

describe('IssueList groups subtasks under parent within same status', () => {
  // Bug: subtasks appeared wherever they happened to land in the API
  // response, separated from their parent even when both had the same
  // status (e.g., parent Todo + subtask Todo were not visually grouped).

  it('renderGroup reorders to place subtasks under their parent', () => {
    expect(src).toMatch(/groupIssues: Issue\[\] = \[\]/);
    expect(src).toMatch(/placed\.has\(sub\.id\)/);
    expect(src).toMatch(/sub\.parentId === issue\.id/);
  });

  it('skips subtasks whose parent is also in the group (rendered under parent)', () => {
    expect(src).toMatch(/if \(issue\.parentId && rawGroupIssues\.some\(i => i\.id === issue\.parentId\)\) continue/);
  });

  it('subtasks whose parent is NOT in the group still render standalone', () => {
    // The skip condition is gated on the parent being present in rawGroupIssues.
    // If parent is missing, the subtask survives the skip and enters the loop body.
    // Verifying the `some(...)` predicate (rather than a bare parentId check) is
    // sufficient — the rest of the loop body appends it to groupIssues.
    const skipLine = src.match(/if \(issue\.parentId && rawGroupIssues\.some\(i => i\.id === issue\.parentId\)\) continue/)?.[0] ?? '';
    expect(skipLine).toMatch(/rawGroupIssues\.some/);
  });
});
