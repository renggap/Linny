import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

const cssSrc = fs.readFileSync(
  path.resolve(__dirname, '../../index.css'),
  'utf8'
);

describe('input autofill / caret / selection theme overrides', () => {
  it('forces dark background on -webkit-autofill to prevent white blip', () => {
    // Bug: when a browser (especially Chrome) autofills saved credentials,
    // it paints a pale yellow / white background over the input, ignoring
    // Tailwind bg classes. The override uses -webkit-box-shadow trick to
    // paint the input's background with the theme's bg-secondary.
    expect(cssSrc).toMatch(/input:-webkit-autofill/);
    expect(cssSrc).toMatch(/-webkit-box-shadow:\s*0 0 0px 1000px var\(--bg-secondary\) inset/);
    expect(cssSrc).toMatch(/-webkit-text-fill-color:\s*var\(--text-primary\)/);
  });

  it('sets caret-color globally so cursor is visible on dark inputs', () => {
    expect(cssSrc).toMatch(/input,\s*\n\s*textarea,\s*\n\s*select\s*\{[\s\S]*?caret-color:\s*var\(--text-primary\)/);
  });

  it('removes :focus-visible outline/ring on form elements', () => {
    // Tailwind's focus:outline-none only handles :focus. Chrome/Safari/Edge
    // still paint a default ring on :focus-visible (keyboard nav, click on
    // some elements). Explicit override is needed.
    expect(cssSrc).toMatch(/input:focus-visible/);
    expect(cssSrc).toMatch(/outline:\s*none !important/);
  });

  it('uses themed text selection (not default pale blue)', () => {
    expect(cssSrc).toMatch(/::selection\s*\{/);
    expect(cssSrc).toMatch(/background:\s*var\(--accent-subtle\)/);
  });
});
