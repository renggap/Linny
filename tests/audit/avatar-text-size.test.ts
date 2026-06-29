import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

const src = fs.readFileSync(
  path.resolve(__dirname, '../../components/UserAvatar.tsx'),
  'utf8'
);

describe('UserAvatar text sizes', () => {
  it('sm size uses 6px text (not 8px)', () => {
    const sizeClassesBlock = src.match(/sizeClasses\s*=\s*\{[\s\S]*?\}/)?.[0] ?? '';
    const smLine = sizeClassesBlock.match(/sm:\s*['"]([^'"]+)['"]/)?.[1] ?? '';
    expect(smLine).toMatch(/text-\[6px\]/);
    expect(smLine).not.toMatch(/text-\[8px\]/);
  });

  it('md size uses 9px text (not 10px)', () => {
    const sizeClassesBlock = src.match(/sizeClasses\s*=\s*\{[\s\S]*?\}/)?.[0] ?? '';
    const mdLine = sizeClassesBlock.match(/md:\s*['"]([^'"]+)['"]/)?.[1] ?? '';
    expect(mdLine).toMatch(/text-\[9px\]/);
  });

  it('lg size uses 11px text (not 12px)', () => {
    const sizeClassesBlock = src.match(/sizeClasses\s*=\s*\{[\s\S]*?\}/)?.[0] ?? '';
    const lgLine = sizeClassesBlock.match(/lg:\s*['"]([^'"]+)['"]/)?.[1] ?? '';
    expect(lgLine).toMatch(/text-\[11px\]/);
  });

  it('xl size uses 14px text (not 16px)', () => {
    const sizeClassesBlock = src.match(/sizeClasses\s*=\s*\{[\s\S]*?\}/)?.[0] ?? '';
    const xlLine = sizeClassesBlock.match(/xl:\s*['"]([^'"]+)['"]/)?.[1] ?? '';
    expect(xlLine).toMatch(/text-\[14px\]/);
  });
});
