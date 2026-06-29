import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

const indexSrc = fs.readFileSync(
  path.resolve(__dirname, '../../server/index.ts'),
  'utf8'
);
const configSrc = fs.readFileSync(
  path.resolve(__dirname, '../../server/config/index.ts'),
  'utf8'
);
const jwtSrc = fs.readFileSync(
  path.resolve(__dirname, '../../server/auth/jwt.ts'),
  'utf8'
);

describe('env load order', () => {
  it('server/index.ts has env preload as the first import', () => {
    const lines = indexSrc.split('\n');
    const firstImport = lines.find(l => l.startsWith('import '));
    expect(firstImport).toMatch(/['"]\.\/env\.js['"]/);
  });

  it('server/env.ts exists and runs dotenv.config()', () => {
    const envPath = path.resolve(__dirname, '../../server/env.ts');
    expect(fs.existsSync(envPath)).toBe(true);
    const envSrc = fs.readFileSync(envPath, 'utf8');
    expect(envSrc).toMatch(/dotenv\.config\(/);
  });

  it('server/config/index.ts no longer calls dotenv.config() itself', () => {
    expect(configSrc).not.toMatch(/^dotenv\.config\(\)/m);
    expect(configSrc).not.toMatch(/^import\s+dotenv\s+from\s+['"]dotenv['"];?\s*$/m);
  });

  it('server/auth/jwt.ts does NOT read JWT_SECRET at module top-level', () => {
    const topLines = jwtSrc.split('\n').slice(0, 30).join('\n');
    expect(topLines).not.toMatch(/^const\s+SECRET\s*=\s*process\.env\.JWT_SECRET/m);
    expect(topLines).not.toMatch(/^const\s+JWT_SECRET\s*=\s*process\.env\.JWT_SECRET/m);
  });
});
