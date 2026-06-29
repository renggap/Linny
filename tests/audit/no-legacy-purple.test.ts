import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

function walkTsx(dir: string): string[] {
  const out: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walkTsx(full));
    else if (entry.isFile() && full.endsWith('.tsx')) out.push(full);
  }
  return out;
}

describe('no legacy #5E6AD2 purple in UI source', () => {
  it('components/**/*.tsx contains zero #5E6AD2 literals', () => {
    const files = walkTsx('components');
    const offenders: string[] = [];
    for (const f of files) {
      const src = fs.readFileSync(f, 'utf8');
      if (/#5E6AD2/i.test(src)) offenders.push(f);
    }
    expect(offenders).toEqual([]);
  });

  it('App.tsx contains zero #5E6AD2 literals', () => {
    const src = fs.readFileSync('App.tsx', 'utf8');
    expect(src).not.toMatch(/#5E6AD2/i);
  });
});
