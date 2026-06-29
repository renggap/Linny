import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

const src = fs.readFileSync(
  path.resolve(__dirname, '../../components/UserAvatar.tsx'),
  'utf8'
);

describe('UserAvatar geometric identicon', () => {
  it('renders an SVG identicon (no text/initials)', () => {
    expect(src).toMatch(/<svg[\s\S]*viewBox="0 0 5 5"/);
    expect(src).not.toMatch(/getInitials/);
    expect(src).not.toMatch(/>\{initials\}</);
  });

  it('uses a deterministic hash function (5x5 = 15 cells, mirrored)', () => {
    const gridFn = src.match(/function identiconGrid[\s\S]*?^}/m)?.[0] ?? '';
    expect(gridFn).toMatch(/row\s*<\s*5/);
    expect(gridFn).toMatch(/col\s*<\s*5/);
    expect(gridFn).toMatch(/sourceCol\s*=\s*col\s*<\s*3\s*\?\s*col\s*:\s*4\s*-\s*col/);
  });

  it('renders a rect per active cell', () => {
    expect(src).toMatch(/<rect/);
    expect(src).toMatch(/fill=\{color\}/);
  });

  it('accepts an optional avatarUrl and renders an img when provided', () => {
    expect(src).toMatch(/avatarUrl\?:\s*string/);
    expect(src).toMatch(/<img[\s\S]*?src=\{avatarUrl\}/);
  });

  it('size classes no longer carry text-[Npx] (identicon scales via SVG)', () => {
    const sizeBlock = src.match(/sizeClasses\s*=\s*\{[\s\S]*?\}/)?.[0] ?? '';
    expect(sizeBlock).not.toMatch(/text-\[/);
  });
});
