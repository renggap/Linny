import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

function walk(dir: string, ext: string): string[] {
  const out: string[] = [];
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full, ext));
    else if (entry.isFile() && full.endsWith(ext)) out.push(full);
  }
  return out;
}

describe('motion library migration', () => {
  it('no source file imports from framer-motion', () => {
    const files = [...walk('components', '.tsx'), ...walk('contexts', '.tsx'), ...walk('hooks', '.ts')];
    const offenders: string[] = [];
    for (const f of files) {
      const src = fs.readFileSync(f, 'utf8');
      if (/from\s+['"]framer-motion['"]/.test(src)) offenders.push(f);
    }
    expect(offenders).toEqual([]);
  });

  it('motion package is in package.json dependencies', () => {
    const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    expect(pkg.dependencies).toHaveProperty('motion');
  });

  it('framer-motion is NOT in package.json dependencies', () => {
    const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    expect(pkg.dependencies).not.toHaveProperty('framer-motion');
  });
});
