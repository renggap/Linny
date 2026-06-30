import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

function read(rel: string): string {
  return fs.readFileSync(path.resolve(__dirname, '../..', rel), 'utf8');
}

describe('select dropdown positioning (Priority + User)', () => {
  // Bug: dropdowns used position:absolute with window.scrollY/scrollX math,
  // which is fragile when the modal content scrolls independently of body
  // (IssueModal is overflow-y-auto). The dropdown also initially rendered at
  // the default empty style {} before the useEffect ran, causing a visible
  // jump from top-left of body to the correct position.

  it('PrioritySelect uses position:fixed (no scroll math)', () => {
    const src = read('components/PrioritySelect.tsx');
    expect(src).toMatch(/position:\s*['"]fixed['"]/);
    expect(src).not.toMatch(/window\.scrollY/);
    expect(src).not.toMatch(/window\.scrollX/);
  });

  it('PrioritySelect computes position in useLayoutEffect (no flicker)', () => {
    const src = read('components/PrioritySelect.tsx');
    expect(src).toMatch(/useLayoutEffect/);
    expect(src).toMatch(/updatePosition/);
  });

  it('PrioritySelect flips above trigger when insufficient space below', () => {
    const src = read('components/PrioritySelect.tsx');
    expect(src).toMatch(/openAbove/);
    expect(src).toMatch(/spaceBelow/);
  });

  it('UserSelect uses position:fixed (no scroll math)', () => {
    const src = read('components/UserSelect.tsx');
    expect(src).toMatch(/position:\s*['"]fixed['"]/);
    expect(src).not.toMatch(/window\.scrollY/);
    expect(src).not.toMatch(/window\.scrollX/);
  });

  it('UserSelect computes position in useLayoutEffect', () => {
    const src = read('components/UserSelect.tsx');
    expect(src).toMatch(/useLayoutEffect/);
  });

  it('UserSelect flips above trigger when insufficient space below', () => {
    const src = read('components/UserSelect.tsx');
    expect(src).toMatch(/openAbove/);
  });
});
