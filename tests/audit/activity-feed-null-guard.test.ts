import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

const src = fs.readFileSync(
  path.resolve(__dirname, '../../components/ActivityFeed.tsx'),
  'utf8'
);

describe('ActivityFeed null guard on payload', () => {
  it('uses optional chaining when reading payload.userId / payload.actorId', () => {
    const line = src.match(/const actor = users\.find[^;]+;/)?.[0] ?? '';
    expect(line).toMatch(/\?\.userId/);
    expect(line).toMatch(/\?\.actorId/);
  });

  it('skips rendering when payload is null/undefined (returns null at top of map)', () => {
    const mapBlock = src.match(/\.map\(\(activity,[\s\S]*?\}\)/g)?.[0] ?? '';
    expect(mapBlock).toMatch(/if\s*\(!activity\.payload\)\s*return\s+null/);
  });

  it('does NOT use bare activity.payload.userId (would throw on undefined payload)', () => {
    expect(src).not.toMatch(/activity\.payload\.userId/);
    expect(src).not.toMatch(/activity\.payload\.actorId/);
  });
});
