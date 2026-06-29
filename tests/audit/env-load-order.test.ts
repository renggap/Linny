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

  it('server/index.ts does NOT capture JWT_SECRET at module scope', () => {
    // The capture must live inside the jwtPlugin function so it reads env at
    // registration time, not module-load time.
    expect(indexSrc).not.toMatch(/^const\s+JWT_SECRET\s*=\s*process\.env\.JWT_SECRET/m);
    expect(indexSrc).not.toMatch(/^const\s+JWT_SECRET_VALIDATED\s*=\s*/m);
  });

  it('jwtPlugin reads JWT_SECRET inside the function body', () => {
    const block = indexSrc.match(/async function jwtPlugin\([\s\S]*?^\}/m)?.[0] ?? '';
    expect(block).toMatch(/process\.env\.JWT_SECRET/);
  });

  it('server/config/index.ts does NOT auto-call validateConfig at module import', () => {
    // Modules should not call process.exit on import. Validation belongs at startup.
    expect(configSrc).not.toMatch(/^validateConfig\(\)/m);
    expect(configSrc).not.toMatch(/try\s*\{\s*validateConfig\(\)/);
  });

  it('server/index.ts calls validateConfig from startServer', () => {
    // Find startServer function body
    const block = indexSrc.match(/async function startServer\([\s\S]*?^\}/m)?.[0] ?? '';
    expect(block).toMatch(/validateConfig\(\)/);
  });

  it('server/routes/auth.fastify.ts /refresh uses verifyToken, not fastify.jwt.verify', () => {
    const fs = require('fs');
    const path = require('path');
    const src = fs.readFileSync(
      path.resolve(__dirname, '../../server/routes/auth.fastify.ts'),
      'utf8'
    );
    // Find the /refresh handler block
    const block = src.match(/fastify\.post\('\/refresh'[\s\S]*?\n  \}\);/m)?.[0] ?? '';
    expect(block).toMatch(/verifyToken\(/);
    expect(block).not.toMatch(/fastify\.jwt\.verify/);
  });
});
