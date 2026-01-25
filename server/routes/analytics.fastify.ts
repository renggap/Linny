import { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { authenticate } from '../middleware/authHooks.js';
import {
    getAnalytics,
    getEndpointAnalytics,
    getTopEndpoints,
    getSlowestEndpoints,
    getHighestErrorRates,
    resetAnalytics,
    getAnalyticsSummary
} from '../middleware/analytics.js';
import { requireAdmin } from '../middleware/authHooks.js';

const analyticsRoutes: FastifyPluginAsyncZod = async (fastify) => {
  // GET /api/v1/analytics/summary - Get analytics summary
  fastify.get('/summary', {
    onRequest: [authenticate]
  }, async () => {
    try {
      return getAnalyticsSummary();
    } catch (error) {
      throw new Error('Failed to get analytics summary');
    }
  });

  // GET /api/v1/analytics - Get all analytics data
  fastify.get('/', {
    onRequest: [authenticate]
  }, async () => {
    try {
      const analyticsData = getAnalytics();
      // Convert Map to Array for JSON serialization
      const endpoints = Array.from(analyticsData.endpoints.values());
      return {
        ...analyticsData,
        endpoints
      };
    } catch (error) {
      throw new Error('Failed to get analytics data');
    }
  });

  // GET /api/v1/analytics/endpoint - Get analytics for a specific endpoint
  fastify.get('/endpoint', {
    onRequest: [authenticate],
    schema: {
      querystring: z.object({
        path: z.string(),
        method: z.string()
      })
    }
  }, async (request: any) => {
    const { path, method } = request.query;

    if (!path || !method) {
      throw new Error('path and method are required');
    }

    const analytics = getEndpointAnalytics(path, method);

    if (!analytics) {
      throw new Error('Endpoint not found');
    }

    return analytics;
  });

  // GET /api/v1/analytics/top - Get top endpoints by request count
  fastify.get('/top', {
    onRequest: [authenticate],
    schema: {
      querystring: z.object({
        limit: z.coerce.number().int().min(1).max(100).default(10)
      })
    }
  }, async (request: any) => {
    const limit = request.query.limit;
    const topEndpoints = getTopEndpoints(limit);
    return topEndpoints;
  });

  // GET /api/v1/analytics/slowest - Get slowest endpoints by average response time
  fastify.get('/slowest', {
    onRequest: [authenticate],
    schema: {
      querystring: z.object({
        limit: z.coerce.number().int().min(1).max(100).default(10)
      })
    }
  }, async (request: any) => {
    const limit = request.query.limit;
    const slowestEndpoints = getSlowestEndpoints(limit);
    return slowestEndpoints;
  });

  // GET /api/v1/analytics/errors - Get endpoints with highest error rates
  fastify.get('/errors', {
    onRequest: [authenticate],
    schema: {
      querystring: z.object({
        limit: z.coerce.number().int().min(1).max(100).default(10)
      })
    }
  }, async (request: any) => {
    const limit = request.query.limit;
    const errorEndpoints = getHighestErrorRates(limit);
    return errorEndpoints;
  });

  // DELETE /api/v1/analytics - Reset analytics data (Admin only)
  fastify.delete('/', {
    onRequest: [authenticate, requireAdmin]
  }, async () => {
    try {
      resetAnalytics();
      return { message: 'Analytics data reset successfully' };
    } catch (error) {
      throw new Error('Failed to reset analytics');
    }
  });
};

export default analyticsRoutes;
