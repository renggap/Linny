import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

const cssSrc = fs.readFileSync(path.resolve(__dirname, '../../index.css'), 'utf8');
const tailwindSrc = fs.readFileSync(path.resolve(__dirname, '../../tailwind.config.js'), 'utf8');
const pkgSrc = fs.readFileSync(path.resolve(__dirname, '../../package.json'), 'utf8');

describe('design tokens', () => {
  it('index.css defines --accent-color: #0066FF', () => {
    expect(cssSrc).toMatch(/--accent-color:\s*#0066FF/i);
  });

  it('index.css defines accent-hover and accent-pressed shades', () => {
    expect(cssSrc).toMatch(/--accent-hover:\s*#0052CC/i);
    expect(cssSrc).toMatch(/--accent-pressed:\s*#003D99/i);
  });

  it('index.css dark mode bg-primary is the new charcoal (#0E0F12)', () => {
    const darkBlock = cssSrc.match(/\.dark\s*\{[\s\S]*?\}/)?.[0] ?? '';
    expect(darkBlock).toMatch(/--bg-primary:\s*#0E0F12/i);
  });

  it('tailwind.config.js maps accent colors', () => {
    expect(tailwindSrc).toMatch(/accent:/);
    expect(tailwindSrc).toMatch(/DEFAULT:\s*['"]var\(--accent-color\)['"]/);
  });

  it('tailwind.config.js sets Inter Tight as sans font', () => {
    expect(tailwindSrc).toMatch(/Inter Tight/);
  });

  it('tailwind.config.js sets default border radius to 0', () => {
    expect(tailwindSrc).toMatch(/borderRadius:\s*\{[\s\S]*?DEFAULT:\s*['"]0px?['"]/);
  });

  it('package.json includes @fontsource-variable/inter-tight', () => {
    expect(pkgSrc).toMatch(/@fontsource-variable\/inter-tight/);
  });
});
