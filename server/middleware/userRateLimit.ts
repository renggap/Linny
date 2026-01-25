/**
 * User-based Rate Limiting Middleware (No-op for Fastify compatibility)
 *
 * Note: User-based rate limiting is now handled by Fastify's rate limit plugin.
 * This file exports no-op middleware for backward compatibility.
 */

/**
 * No-op middleware for Express compatibility.
 * Rate limiting is handled by Fastify at the server level.
 */
export function userRateLimit(_req: any, _res: any, next?: any): any {
  if (next) return next();
}

export function userReadRateLimit(_req: any, _res: any, next?: any): any {
  if (next) return next();
}

export function userAuthRateLimit(_req: any, _res: any, next?: any): any {
  if (next) return next();
}

export default userRateLimit;
