import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

const cssSrc = fs.readFileSync(
  path.resolve(__dirname, '../../index.css'),
  'utf8'
);

describe('input autofill / caret / selection theme overrides', () => {
  it('forces dark background on -webkit-autofill to prevent white blip', () => {
    expect(cssSrc).toMatch(/input:-webkit-autofill/);
    expect(cssSrc).toMatch(/-webkit-box-shadow:\s*0 0 0px 1000px #16181D inset/);
    expect(cssSrc).toMatch(/-webkit-text-fill-color:\s*#F5F6F8/);
  });

  it('caret-color is hardcoded light (app is dark-themed, no .dark class)', () => {
    // Bug: previously caret-color used var(--text-primary). The app uses
    // Tailwind bg-[#0F1014] directly without toggling .dark on <html>, so
    // the variable resolved to its light-mode value (#0E0F12) and the
    // caret was invisible on dark inputs.
    expect(cssSrc).toMatch(/caret-color:\s*#F5F6F8/);
    expect(cssSrc).not.toMatch(/caret-color:\s*var\(--text-primary\)/);
  });

  it('removes :focus-visible outline/ring on form elements', () => {
    expect(cssSrc).toMatch(/input:focus-visible/);
    expect(cssSrc).toMatch(/outline:\s*none !important/);
  });

  it('uses fixed dark-themed selection colors (not CSS variables)', () => {
    expect(cssSrc).toMatch(/::selection\s*\{/);
    expect(cssSrc).toMatch(/background:\s*rgba\(0,\s*102,\s*255,\s*0\.25\)/);
    expect(cssSrc).toMatch(/color:\s*#F5F6F8/);
  });
});
