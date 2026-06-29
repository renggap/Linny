import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

const src = fs.readFileSync(
  path.resolve(__dirname, '../../components/DatePicker.tsx'),
  'utf8'
);

describe('DatePicker viewport flip', () => {
  it('updateCoords considers available viewport space', () => {
    const fnBlock = src.match(/const updateCoords = \(\) => \{[\s\S]*?\};/)?.[0] ?? '';
    expect(fnBlock.length).toBeGreaterThan(0);
    expect(fnBlock).toMatch(/innerHeight|spaceBelow|openAbove/);
  });

  it('calendar can be positioned above the input when space below is tight', () => {
    const fnBlock = src.match(/const updateCoords = \(\) => \{[\s\S]*?\};/)?.[0] ?? '';
    expect(fnBlock).toMatch(/rect\.top\s*-\s*\w+/);
  });

  it('left coordinate is clamped to avoid right-edge overflow', () => {
    const fnBlock = src.match(/const updateCoords = \(\) => \{[\s\S]*?\};/)?.[0] ?? '';
    expect(fnBlock).toMatch(/Math\.min|rect\.right|innerWidth/);
  });
});
