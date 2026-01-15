/**
 * ============================================================================
 * ADMIN ROUTES
 * ============================================================================
 * 
 * Provides admin endpoints for:
 * - Job queue management
 * - Rate limiting dashboard
 * - Cache management
 */

import { Router, Response } from 'express';
import { AuthRequest, authenticate, requireAdmin } from '../middleware/auth.js';
import { getQueueStats } from '../jobs/jobQueue.js';
import { getAnalytics, getAnalyticsSummary, resetAnalytics } from '../middleware/analytics.js';
import { invalidateCacheKey, clearAllCache, getCacheStats } from '../middleware/cache.js';
import { asyncHandler } from '../middleware/error.js';

const router = Router();

/**
 * GET /api/v1/admin/jobs/stats
 * Get job queue statistics
 */
router.get('/jobs/stats', authenticate, requireAdmin, asyncHandler(async (_req: AuthRequest, res: Response) => {
    const stats = await getQueueStats();
    res.json(stats);
    return;
}));

/**
 * DELETE /api/v1/admin/analytics
 * Reset analytics data
 */
router.delete('/analytics', authenticate, requireAdmin, asyncHandler(async (_req: AuthRequest, res: Response) => {
    resetAnalytics();
    res.json({ message: 'Analytics data reset successfully' });
    return;
}));

/**
 * GET /api/v1/admin/analytics/summary
 * Get analytics summary
 */
router.get('/analytics/summary', authenticate, requireAdmin, asyncHandler(async (_req: AuthRequest, res: Response) => {
    const summary = getAnalyticsSummary();
    res.json(summary);
    return;
}));

/**
 * GET /api/v1/admin/analytics
 * Get all analytics data
 */
router.get('/analytics', authenticate, requireAdmin, asyncHandler(async (_req: AuthRequest, res: Response) => {
    const analyticsData = getAnalytics();
    const endpoints = Array.from(analyticsData.endpoints.values());
    res.json({
        ...analyticsData,
        endpoints
    });
    return;
}));

/**
 * GET /api/v1/admin/cache/stats
 * Get cache statistics
 */
router.get('/cache/stats', authenticate, requireAdmin, asyncHandler(async (_req: AuthRequest, res: Response) => {
    const stats = getCacheStats();
    res.json(stats);
    return;
}));

/**
 * DELETE /api/v1/admin/cache
 * Clear all cache
 */
router.delete('/cache', authenticate, requireAdmin, asyncHandler(async (_req: AuthRequest, res: Response) => {
    clearAllCache();
    res.json({ message: 'Cache cleared successfully' });
    return;
}));

/**
 * DELETE /api/v1/admin/cache/:key
 * Clear specific cache key
 */
router.delete('/cache/:key', authenticate, requireAdmin, asyncHandler(async (req: AuthRequest, res: Response) => {
    const { key } = req.params;
    if (!key) {
        return res.status(400).json({ error: 'Key is required' });
    }
    invalidateCacheKey(key);
    res.json({ message: `Cache key '${key}' cleared successfully` });
    return;
}));

export default router;
