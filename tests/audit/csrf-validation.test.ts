import { describe, it, expect } from 'vitest';
import Fastify from 'fastify';
import fastifyCookie from '@fastify/cookie';
import crypto from 'crypto';

// Re-implement a minimal version of csrfPlugin inline to test the
// validation logic in isolation. The actual plugin in server/index.ts
// reads from the same kind of Map but is encapsulated inside the
// fastify register scope, so we mirror the logic here to exercise the
// preHandler rules end-to-end via fastify.inject().

const csrfTokens = new Map<string, { token: string; expires: number }>();
const TOKEN_EXPIRY_MS = 30 * 60 * 1000;
const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

function generateCsrfToken(): string {
  // Mirror production: crypto.randomBytes(32).toString('base64url')
  return crypto.randomBytes(32).toString('base64url');
}

async function buildApp() {
  const app = Fastify();
  await app.register(fastifyCookie);

  app.get('/api/csrf-token', async (request: any, reply: any) => {
    const sessionId = (request.ip as string) || 'anonymous';
    const now = Date.now();
    const existing = csrfTokens.get(sessionId);
    // Mirror production: get-or-create with reuse for multi-tab safety
    const token = (existing && existing.expires > now) ? existing.token : generateCsrfToken();
    if (!existing || existing.expires <= now) {
      csrfTokens.set(sessionId, { token, expires: now + TOKEN_EXPIRY_MS });
    }
    reply.setCookie('csrfToken', token, {
      httpOnly: false,
      secure: false,
      sameSite: 'lax',
      maxAge: TOKEN_EXPIRY_MS / 1000,
      path: '/',
    });
    return reply.send({ csrfToken: token });
  });

  app.addHook('preHandler', async (request: any, reply: any) => {
    if (SAFE_METHODS.has(request.method)) return;
    const urlPath = request.url.split('?')[0];
    if (
      urlPath === '/api/v1/auth/login' ||
      urlPath === '/api/v1/auth/register' ||
      urlPath === '/api/v1/auth/forgot-password' ||
      urlPath === '/api/v1/auth/reset-password' ||
      urlPath === '/api/csrf-token'
    ) {
      return;
    }
    const headerToken = request.headers['x-csrf-token'];
    const cookieToken = request.cookies?.csrfToken;
    const sessionId = (request.ip as string) || 'anonymous';
    const stored = csrfTokens.get(sessionId);
    const isValid =
      !!headerToken &&
      !!cookieToken &&
      headerToken === cookieToken &&
      !!stored &&
      stored.token === headerToken &&
      stored.expires > Date.now();
    if (!isValid) {
      return reply.code(403).send({ error: 'CSRF token invalid or missing' });
    }
  });

  app.post('/test', async () => ({ ok: true }));

  return app;
}

describe('CSRF validation preHandler', () => {
  it('rejects POST without X-CSRF-Token header', async () => {
    const app = await buildApp();
    const res = await app.inject({ method: 'POST', url: '/test' });
    expect(res.statusCode).toBe(403);
    const body = JSON.parse(res.body);
    expect(body.error).toMatch(/CSRF/);
    await app.close();
  });

  it('accepts POST with valid token fetched from /api/csrf-token', async () => {
    const app = await buildApp();
    const tokenRes = await app.inject({ method: 'GET', url: '/api/csrf-token' });
    const { csrfToken } = JSON.parse(tokenRes.body);
    const cookie = tokenRes.cookies.find((c: any) => c.name === 'csrfToken')?.value;

    const res = await app.inject({
      method: 'POST',
      url: '/test',
      headers: { 'x-csrf-token': csrfToken, cookie: `csrfToken=${cookie}` },
    });
    expect(res.statusCode).toBe(200);
    await app.close();
  });

  it('rejects POST when token does not match cookie', async () => {
    const app = await buildApp();
    const tokenRes = await app.inject({ method: 'GET', url: '/api/csrf-token' });
    const cookie = tokenRes.cookies.find((c: any) => c.name === 'csrfToken')?.value;
    const res = await app.inject({
      method: 'POST',
      url: '/test',
      headers: { 'x-csrf-token': 'wrong-token', cookie: `csrfToken=${cookie}` },
    });
    expect(res.statusCode).toBe(403);
    await app.close();
  });

  it('allows GET requests without CSRF token', async () => {
    const app = await buildApp();
    const res = await app.inject({ method: 'GET', url: '/api/csrf-token' });
    expect(res.statusCode).toBe(200);
    await app.close();
  });

  it('reuses valid token instead of rotating (multi-tab safety)', async () => {
    const app = await buildApp();
    // Mirror the production logic: get-or-create with reuse
    const first = await app.inject({ method: 'GET', url: '/api/csrf-token' });
    const firstToken = JSON.parse(first.body).csrfToken;
    const second = await app.inject({ method: 'GET', url: '/api/csrf-token' });
    const secondToken = JSON.parse(second.body).csrfToken;
    expect(secondToken).toBe(firstToken);
    await app.close();
  });
});
