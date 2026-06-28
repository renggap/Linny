import { describe, it, expect } from 'vitest';
import fs from 'fs';

describe('rate limiting', () => {
  it('rateLimitConfig.global is true', () => {
    const src = fs.readFileSync('./server/index.ts', 'utf8');
    // Find the rateLimitConfig object and check global: true
    const block = src.match(/const rateLimitConfig = \{[\s\S]*?\};/)?.[0] ?? '';
    expect(block).toMatch(/global:\s*true/);
  });

  it('auth routes declare per-route rate limits', () => {
    const src = fs.readFileSync('./server/routes/auth.fastify.ts', 'utf8');
    // /login: 5 per 15 minutes
    expect(src).toMatch(/fastify\.post\('\/login'[\s\S]*?config:\s*\{\s*rateLimit:\s*\{[^}]*max:\s*5[^}]*timeWindow:\s*'15 minutes'/);
    // /register: 5 per 1 hour
    expect(src).toMatch(/fastify\.post\('\/register'[\s\S]*?config:\s*\{\s*rateLimit:\s*\{[^}]*max:\s*5[^}]*timeWindow:\s*'1 hour'/);
    // /forgot-password: 3 per 1 hour
    expect(src).toMatch(/fastify\.post\('\/forgot-password'[\s\S]*?config:\s*\{\s*rateLimit:\s*\{[^}]*max:\s*3[^}]*timeWindow:\s*'1 hour'/);
    // /reset-password: 5 per 15 minutes
    expect(src).toMatch(/fastify\.post\('\/reset-password'[\s\S]*?config:\s*\{\s*rateLimit:\s*\{[^}]*max:\s*5[^}]*timeWindow:\s*'15 minutes'/);
  });

  it('WebSocket routes bypass rate limit', () => {
    const src = fs.readFileSync('./server/websocket/fastifyWebSocketRoutes.ts', 'utf8');
    // Each of the 3 ws routes must declare rateLimit: false
    const wsRouteCount = (src.match(/fastify\.get\('\/ws\//g) || []).length;
    expect(wsRouteCount).toBe(3);
    const bypassCount = (src.match(/rateLimit:\s*false/g) || []).length;
    expect(bypassCount).toBe(3);
  });
});
