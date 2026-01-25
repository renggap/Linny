/**
 * Rate Limiting Configuration
 *
 * Note: Rate limiting is now configured in server/index.ts using @fastify/rate-limit.
 * This file exports middleware functions for backward compatibility with Express routes.
 *
 * @fastify/rate-limit configuration:
 * - Auth endpoints: 5/15min (production), 20/15min (development)
 * - API endpoints: 100/15min (production), 1000/15min (development)
 * - Read-only: 200/15min (production), 2000/15min (development)
 */

const isDevelopment = process.env.NODE_ENV !== 'production';

/**
 * Rate limit configuration for authentication endpoints
 * 5 attempts per 15 minutes per IP (production)
 * 20 attempts per 15 minutes per IP (development)
 */
export const authRateLimitConfig = {
  max: isDevelopment ? 20 : 5,
  timeWindow: '15 minutes',
  skipOnError: false
};

/**
 * Rate limit configuration for API endpoints
 * 100 requests per 15 minutes per IP (production)
 * 1000 requests per 15 minutes per IP (development)
 */
export const apiRateLimitConfig = {
  max: isDevelopment ? 1000 : 100,
  timeWindow: '15 minutes'
};

/**
 * Rate limit configuration for read-only endpoints
 * 200 requests per 15 minutes per IP (production)
 * 2000 requests per 15 minutes per IP (development)
 */
export const readRateLimitConfig = {
  max: isDevelopment ? 2000 : 200,
  timeWindow: '15 minutes'
};

/**
 * No-op middleware for Express compatibility.
 * Rate limiting is handled by Fastify at the server level.
 * These middleware functions exist for backward compatibility.
 */
export function authRateLimit(_req: any, _res: any, next?: any): any {
  if (next) return next();
}

export function apiRateLimit(_req: any, _res: any, next?: any): any {
  if (next) return next();
}

export function readRateLimit(_req: any, _res: any, next?: any): any {
  if (next) return next();
}

export function writeRateLimit(_req: any, _res: any, next?: any): any {
  if (next) return next();
}
