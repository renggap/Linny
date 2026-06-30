import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

const src = fs.readFileSync(
  path.resolve(__dirname, '../../components/IssueModal.tsx'),
  'utf8'
);

describe('sub-issue comments visibility', () => {
  it('lifts comments section out of the parentId conditional', () => {
    // Bug: previously both subtasks AND comments were inside the same
    // `{!existingIssue.parentId && (...)}` block. Opening a sub-issue hid
    // the comment list, so users could type and submit but never see the
    // comment (or existing comments).
    //
    // Fix: outer gate is hasExistingIssueId; parentId only wraps subtasks.
    //
    // Structural check: the Communications section header must appear
    // AFTER the subtasks section's closing `</section>` AND after the
    // closing `)}` of the parentId conditional.

    const commsIdx = src.indexOf('Communications');
    expect(commsIdx).toBeGreaterThan(-1);

    const subtasksHeaderIdx = src.indexOf('Sub-objectives');
    expect(subtasksHeaderIdx).toBeGreaterThan(-1);
    expect(commsIdx).toBeGreaterThan(subtasksHeaderIdx);

    // Find the FIRST `)}` after the subtasks header — that's where the
    // parentId conditional ends. Communications must come after it.
    const subtasksHeaderLine = src.indexOf('>', subtasksHeaderIdx);
    const sectionClose = src.indexOf('</section>', subtasksHeaderLine);
    expect(sectionClose).toBeGreaterThan(-1);
    const conditionalClose = src.indexOf(')}', sectionClose);
    expect(conditionalClose).toBeGreaterThan(-1);
    expect(commsIdx).toBeGreaterThan(conditionalClose);
  });

  it('still gates Sub-objectives with !parentId (parent issues only)', () => {
    // Find the subtasks section start, walk back to find the parentId gate.
    const subtasksIdx = src.indexOf('Sub-objectives');
    expect(subtasksIdx).toBeGreaterThan(-1);
    const preceding = src.slice(Math.max(0, subtasksIdx - 700), subtasksIdx);
    expect(preceding).toMatch(/\?\.parentId/);
  });
});
