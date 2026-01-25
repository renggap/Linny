import { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { authenticate, requireAdmin } from '../middleware/authHooks.js';
import { getQueueStats } from '../jobs/jobQueue.js';
import { getAnalytics, getAnalyticsSummary, resetAnalytics } from '../middleware/analytics.js';
import { invalidateCacheKey, clearAllCache, getCacheStats } from '../middleware/cache.js';
import { getDatabase } from '../database.js';

const adminRoutes: FastifyPluginAsyncZod = async (fastify) => {
  // GET /api/v1/admin/jobs/stats - Get job queue statistics
  fastify.get('/jobs/stats', {
    onRequest: [authenticate, requireAdmin]
  }, async () => {
    const stats = await getQueueStats();
    return stats;
  });

  // DELETE /api/v1/admin/analytics - Reset analytics data
  fastify.delete('/analytics', {
    onRequest: [authenticate, requireAdmin]
  }, async () => {
    resetAnalytics();
    return { message: 'Analytics data reset successfully' };
  });

  // GET /api/v1/admin/analytics/summary - Get analytics summary
  fastify.get('/analytics/summary', {
    onRequest: [authenticate, requireAdmin]
  }, async () => {
    const summary = getAnalyticsSummary();
    return summary;
  });

  // GET /api/v1/admin/analytics - Get all analytics data
  fastify.get('/analytics', {
    onRequest: [authenticate, requireAdmin]
  }, async () => {
    const analyticsData = getAnalytics();
    const endpoints = Array.from(analyticsData.endpoints.values());
    return {
      ...analyticsData,
      endpoints
    };
  });

  // GET /api/v1/admin/cache/stats - Get cache statistics
  fastify.get('/cache/stats', {
    onRequest: [authenticate, requireAdmin]
  }, async () => {
    const stats = getCacheStats();
    return stats;
  });

  // DELETE /api/v1/admin/cache - Clear all cache
  fastify.delete('/cache', {
    onRequest: [authenticate, requireAdmin]
  }, async () => {
    clearAllCache();
    return { message: 'Cache cleared successfully' };
  });

  // DELETE /api/v1/admin/cache/:key - Clear specific cache key
  fastify.delete('/cache/:key', {
    onRequest: [authenticate, requireAdmin],
    schema: {
      params: z.object({
        key: z.string()
      })
    }
  }, async (request: any) => {
    const { key } = request.params;
    if (!key) {
      throw new Error('Key is required');
    }
    invalidateCacheKey(key);
    return { message: `Cache key '${key}' cleared successfully` };
  });

  // DELETE /api/v1/admin/workspace - Delete entire workspace (Administrator only)
  fastify.delete('/workspace', {
    onRequest: [authenticate, requireAdmin]
  }, async () => {
    const db = await getDatabase();

    // Clear all workspace data
    await db.clearWorkspace();

    // Clear all caches
    clearAllCache();

    return { message: 'Workspace deleted successfully' };
  });
};

export default adminRoutes;
