import NodeCache from 'node-cache';

/**
 * In-Memory Cache Middleware
 * 
 * DEEP REASONING CHAIN:
 * Caching frequently accessed data reduces database load and improves response times.
 * This implementation uses NodeCache for:
 * 1. Simple key-value storage with TTL (time-to-live)
 * 2. Automatic cache expiration to prevent stale data
 * 3. Cache invalidation on data mutations
 * 4. Thread-safe operations for concurrent requests
 * 
 * EDGE CASE ANALYSIS:
 * - Handles cache misses gracefully by falling through to database
 * - Prevents caching of error responses
 * - Supports cache invalidation by pattern for bulk updates
 * - Configurable TTL per endpoint type
 * - Memory-efficient with automatic cleanup
 */

const cache = new NodeCache({
    stdTTL: 300, // Default TTL: 5 minutes
    checkperiod: 60, // Check for expired keys every 60 seconds
    useClones: false // Performance optimization
});

/**
 * Cache middleware factory
 * Creates middleware that caches GET requests based on cache key
 */
export function cacheMiddleware(keyPrefix: string, ttl: number = 300) {
    return (req: any, res: any, next: any) => {
        // Only cache GET requests
        if (req.method !== 'GET') {
            return next();
        }

        // Generate cache key from URL and query params
        const cacheKey = `${keyPrefix}:${req.originalUrl}`;

        // Check cache
        const cachedData = cache.get(cacheKey);
        if (cachedData) {
            return res.json(cachedData);
        }

        // Store original json method
        const originalJson = res.json.bind(res);

        // Override json method to cache response
        res.json = function (data: any) {
            // Only cache successful responses
            if (res.statusCode === 200) {
                cache.set(cacheKey, data, ttl);
            }
            return originalJson(data);
        };

        next();
    };
}

/**
 * Invalidate cache by key pattern
 * Useful for bulk updates (e.g., when a project is updated)
 */
export function invalidateCache(pattern: string): void {
    const keys = cache.keys();
    const keysToDelete = keys.filter(key => key.startsWith(pattern));

    if (keysToDelete.length > 0) {
        cache.del(keysToDelete);
    }
}

/**
 * Invalidate cache by specific key
 */
export function invalidateCacheKey(key: string): void {
    cache.del(key);
}

/**
 * Clear all cache
 * Use sparingly - typically only on major schema changes
 */
export function clearAllCache(): void {
    cache.flushAll();
}

/**
 * Get cache statistics
 */
export function getCacheStats() {
    return cache.getStats();
}

export default cache;
