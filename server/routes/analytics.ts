/**
 * ============================================================================
 * ANALYTICS ROUTES
 * ============================================================================
 * 
 * Provides API endpoints to access analytics data
 */

import { Router, Response } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import {
    getAnalytics,
    getEndpointAnalytics,
    getTopEndpoints,
    getSlowestEndpoints,
    getHighestErrorRates,
    resetAnalytics,
    getAnalyticsSummary
} from '../middleware/analytics.js';

const router = Router();

/**
 * GET /api/v1/analytics/summary
 * Get analytics summary
 */
router.get('/summary', authenticate, (_req: AuthRequest, res: Response) => {
    try {
        const summary = getAnalyticsSummary();
        res.json(summary);
    } catch (error) {
        res.status(500).json({ error: 'Failed to get analytics summary' });
    }
    return;
});

/**
 * GET /api/v1/analytics
 * Get all analytics data
 */
router.get('/', authenticate, (_req: AuthRequest, res: Response) => {
    try {
        const analyticsData = getAnalytics();
        // Convert Map to Array for JSON serialization
        const endpoints = Array.from(analyticsData.endpoints.values());
        res.json({
            ...analyticsData,
            endpoints
        });
    } catch (error) {
        res.status(500).json({ error: 'Failed to get analytics data' });
    }
    return;
});

/**
 * GET /api/v1/analytics/endpoint
 * Get analytics for a specific endpoint
 */
router.get('/endpoint', authenticate, (req: AuthRequest, res: Response) => {
    try {
        const { path, method } = req.query;

        if (!path || !method) {
            return res.status(400).json({ error: 'path and method are required' });
        }

        const analytics = getEndpointAnalytics(path as string, method as string);

        if (!analytics) {
            return res.status(404).json({ error: 'Endpoint not found' });
        }

        res.json(analytics);
    } catch (error) {
        res.status(500).json({ error: 'Failed to get endpoint analytics' });
    }
    return;
});

/**
 * GET /api/v1/analytics/top
 * Get top endpoints by request count
 */
router.get('/top', authenticate, (req: AuthRequest, res: Response) => {
    try {
        const limit = parseInt(req.query.limit as string) || 10;
        const topEndpoints = getTopEndpoints(limit);
        res.json(topEndpoints);
    } catch (error) {
        res.status(500).json({ error: 'Failed to get top endpoints' });
    }
    return;
});

/**
 * GET /api/v1/analytics/slowest
 * Get slowest endpoints by average response time
 */
router.get('/slowest', authenticate, (req: AuthRequest, res: Response) => {
    try {
        const limit = parseInt(req.query.limit as string) || 10;
        const slowestEndpoints = getSlowestEndpoints(limit);
        res.json(slowestEndpoints);
    } catch (error) {
        res.status(500).json({ error: 'Failed to get slowest endpoints' });
    }
    return;
});

/**
 * GET /api/v1/analytics/errors
 * Get endpoints with highest error rates
 */
router.get('/errors', authenticate, (req: AuthRequest, res: Response) => {
    try {
        const limit = parseInt(req.query.limit as string) || 10;
        const errorEndpoints = getHighestErrorRates(limit);
        res.json(errorEndpoints);
    } catch (error) {
        res.status(500).json({ error: 'Failed to get error rates' });
    }
    return;
});

/**
 * DELETE /api/v1/analytics
 * Reset analytics data (Admin only)
 */
router.delete('/', authenticate, (req: AuthRequest, res: Response) => {
    try {
        // Check if user is admin
        if (req.userRole !== 'Admin') {
            return res.status(403).json({ error: 'Admin access required' });
        }

        resetAnalytics();
        res.json({ message: 'Analytics data reset successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to reset analytics' });
    }
    return;
});

export default router;
