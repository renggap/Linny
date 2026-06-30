import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

const src = fs.readFileSync(
  path.resolve(__dirname, '../../components/IssueModal.tsx'),
  'utf8'
);

describe('comment timeline avatar', () => {
  it('uses UserAvatar instead of the blue accent dot', () => {
    // The old timeline marker was a static blue dot (border-accent + glow shadow).
    // User asked to replace with the comment author's profile picture/icon.
    expect(src).toMatch(/import \{ UserAvatar \}/);
    // Find the comment map block and verify UserAvatar is rendered inside.
    const commentBlock = src.match(/\{comments\.map\([\s\S]*?\}\)\}/)?.[0] ?? '';
    expect(commentBlock).toMatch(/<UserAvatar/);
    expect(commentBlock).toMatch(/avatarUrl=\{u\?\.avatarUrl\}/);
    // The blue dot (border-accent + shadow) must be gone from the comment block.
    expect(commentBlock).not.toMatch(/border-accent shadow-\[0_0_8px/);
  });
});
