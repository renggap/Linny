import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

function read(rel: string): string {
  return fs.readFileSync(path.resolve(__dirname, '../..', rel), 'utf8');
}

describe('comment section font size matches description', () => {
  it('IssueModal comment display uses text-[15px] (matches description)', () => {
    // Bug: comment display was text-[13px], description was text-[15px],
    // comment input was text-sm (14px). Three different sizes made the
    // comment section look like it used a different font.
    const src = read('components/IssueModal.tsx');
    const commentBlock = src.match(/\{comments\.map\([\s\S]*?\}\)\}/)?.[0] ?? '';
    expect(commentBlock).toMatch(/text-\[15px\]/);
    expect(commentBlock).not.toMatch(/text-\[13px\]/);
  });

  it('MentionInput uses text-[15px] to match surrounding text', () => {
    const src = read('components/MentionInput.tsx');
    const textarea = src.match(/<textarea[\s\S]*?\/>/)?.[0] ?? '';
    expect(textarea).toMatch(/text-\[15px\]/);
    expect(textarea).not.toMatch(/text-sm(?![-_])/);
  });
});
