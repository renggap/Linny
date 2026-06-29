import { describe, it, expect } from 'vitest';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';

const SECRET = 'test-secret-at-least-32-characters-long-aaaaaaaa';

describe('refresh token uniqueness', () => {
  it('two refresh tokens issued in the same second are NOT identical (jti differs)', () => {
    const payload = { userId: 'u1', email: 'a@b.com', role: 'Member' };
    const sign = (p: object) =>
      jwt.sign({ ...p, jti: crypto.randomUUID() }, SECRET, { expiresIn: '7d' });

    const t1 = sign(payload);
    const t2 = sign(payload);

    expect(t1).not.toBe(t2);

    const d1 = jwt.verify(t1, SECRET) as any;
    const d2 = jwt.verify(t2, SECRET) as any;
    expect(d1.jti).not.toBe(d2.jti);
    expect(d1.jti.length).toBeGreaterThan(0);
  });

  it('refresh token includes jti claim', () => {
    const payload = { userId: 'u1', email: 'a@b.com', role: 'Member' };
    const token = jwt.sign({ ...payload, jti: crypto.randomUUID() }, SECRET, { expiresIn: '7d' });
    const decoded = jwt.verify(token, SECRET) as any;
    expect(decoded.jti).toBeTruthy();
    expect(decoded.jti).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
  });
});

describe('auth.fastify signs refresh token with jti', () => {
  it('source includes jti: crypto.randomUUID() in refresh token payload', () => {
    const fs = require('fs');
    const path = require('path');
    const src = fs.readFileSync(
      path.resolve(__dirname, '../../server/routes/auth.fastify.ts'),
      'utf8'
    );
    expect(src).toMatch(/jti:\s*crypto\.randomUUID\(\)/);
    const refreshBlock = src.match(/refreshToken\s*=\s*fastify\.jwt\.sign\([\s\S]*?\)\s*;/)?.[0] ?? '';
    expect(refreshBlock).toMatch(/jti:\s*crypto\.randomUUID\(\)/);
    expect(refreshBlock).toMatch(/expiresIn:\s*['"]7d['"]/);
  });

  it('imports crypto module', () => {
    const fs = require('fs');
    const path = require('path');
    const src = fs.readFileSync(
      path.resolve(__dirname, '../../server/routes/auth.fastify.ts'),
      'utf8'
    );
    expect(src).toMatch(/import\s+crypto\s+from\s+['"]crypto['"]/);
  });
});
