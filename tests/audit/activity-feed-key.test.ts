import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

const src = fs.readFileSync(
  path.resolve(__dirname, '../../services/useActivityFeed.ts'),
  'utf8'
);

describe('useActivityFeed scoped query key', () => {
  it('imports activityKeys and useUIStore', () => {
    expect(src).toMatch(/import\s+\{\s*activityKeys\s*\}\s+from\s+['"][^'"]*queryKeys/);
    expect(src).toMatch(/import\s+\{\s*useUIStore\s*\}\s+from\s+['"][^'"]*uiStore/);
  });

  it('reads currentTeamId from useUIStore', () => {
    expect(src).toMatch(/useUIStore\(/);
    expect(src).toMatch(/currentTeamId/);
  });

  it('uses activityKeys.all(currentTeamId) as the query key', () => {
    expect(src).toMatch(/queryKey:\s*currentTeamId\s*\?\s*activityKeys\.all\(currentTeamId\)/);
  });

  it('disables the query when currentTeamId is missing', () => {
    expect(src).toMatch(/enabled:\s*!!currentTeamId/);
  });

  it('does NOT use the legacy unscoped [\'activity\'] key', () => {
    expect(src).not.toMatch(/queryKey:\s*\['activity'\]/);
  });
});
