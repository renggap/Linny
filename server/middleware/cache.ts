/**
 * Redis Cache Middleware
 *
 * DEEP REASONING CHAIN:
 * Caching frequently accessed data reduces database load and improves response times.
 * This implementation uses Redis for:
 * 1. Distributed caching across multiple server instances
 * 2. Persistent cache storage (survives server restarts)
 * 3. Automatic cache expiration with TTL
 * 4. Cache invalidation on data mutations
 * 5. Graceful degradation when Redis is unavailable
 *
 * EDGE CASE ANALYSIS:
 * - Handles cache misses gracefully by falling through to database
 * - Prevents caching of error responses
 * - Supports cache invalidation by pattern for bulk updates
 * - Configurable TTL per endpoint type
 * - Redis connection failures don't break the application
 */

import { getCacheManager, TTL } from '../cache/cacheManager.js';

const cacheManager = getCacheManager();

/**
 * Cache middleware factory
 * Creates middleware that caches GET requests based on cache key
 * Compatible with both Fastify and Express
 */
export function cacheMiddleware(keyPrefix: string, ttl: number = TTL.DEFAULT) {
  return async (req: any, res: any, next?: any) => {
    // Only cache GET requests
    if (req.method !== 'GET') {
      if (next) return next();
      return;
    }

    // Generate cache key from URL and query params
    const cacheKey = `${keyPrefix}:${req.originalUrl || req.url}`;

    // Check cache
    const cachedData = await cacheManager.get(cacheKey);
    if (cachedData !== null) {
      // Add cache hit header
      if (res.header) {
        res.header('X-Cache', 'HIT');
      }
      if (res.code) {
        return res.send(cachedData);
      }
      return res.json(cachedData);
    }

    // Store original send/json method
    const originalSend = res.send ? res.send.bind(res) : null;
    const originalJson = res.json ? res.json.bind(res) : null;

    // Override send/json methods to cache response
    const cacheResponse = (data: any) => {
      // Only cache successful responses
      const statusCode = res.statusCode || 200;
      if (statusCode === 200 || statusCode === 304) {
        cacheManager.set(cacheKey, data, ttl).catch((err) => {
          console.error('Cache set error:', err);
        });
      }

      // Add cache miss header
      if (res.header) {
        res.header('X-Cache', 'MISS');
      }

      // Call original method
      if (originalSend) {
        return originalSend(data);
      }
      if (originalJson) {
        return originalJson(data);
      }
      if (next) return next();
      return data;
    };

    if (res.send) {
      res.send = cacheResponse;
    }
    if (res.json) {
      res.json = cacheResponse;
    }

    if (next) return next();
  };
}

/**
 * Invalidate cache by key pattern
 * Useful for bulk updates (e.g., when a project is updated)
 */
export async function invalidateCache(pattern: string): Promise<number> {
  return await cacheManager.deletePattern(pattern);
}

/**
 * Invalidate cache by specific key
 */
export async function invalidateCacheKey(key: string): Promise<void> {
  await cacheManager.delete(key);
}

/**
 * Clear all cache
 * Use sparingly - typically only on major schema changes
 */
export async function clearAllCache(): Promise<void> {
  await cacheManager.clear();
}

/**
 * Get cache statistics
 */
export function getCacheStats() {
  return cacheManager.getMetrics();
}

export default cacheManager;
