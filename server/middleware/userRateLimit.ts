/**
 * @fileoverview User-based rate limiting middleware
 * @description Implements rate limiting per user ID for authenticated requests
 * @module userRateLimit
 */

import rateLimit from 'express-rate-limit';
import { Request, Response } from 'express';
import { config } from '../config/index.js';
import { logRateLimitEvent } from '../utils/logger.js';

/**
 * User-based rate limiter
 * Limits requests per user ID instead of per IP
 * Falls back to IP-based for unauthenticated requests
 */
export const userRateLimit = rateLimit({
    windowMs: config.apiRateLimitWindowMs,
    max: config.apiRateLimitMax,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req: Request): string => {
        // Use user ID for authenticated requests
        const userId = (req as any).userId;
        if (userId) {
            return `user:${userId}`;
        }

        // Fall back to IP for unauthenticated requests
        const ip = req.ip || req.connection.remoteAddress || 'unknown';
        return `ip:${ip}`;
    },
    handler: (req: Request, res: Response): void => {
        const userId = (req as any).userId;
        const ip = req.ip || req.connection.remoteAddress || 'unknown';

        // Log rate limit event
        logRateLimitEvent(ip, req.path, userId);

        // Send rate limit error
        res.status(429).json({
            error: 'Rate limit exceeded',
            code: 'RATE_LIMIT_EXCEEDED',
            statusCode: 429,
            retryAfter: Math.ceil(config.apiRateLimitWindowMs / 1000),
        });
    },
    skip: (req: Request): boolean => {
        // Skip rate limiting for health check endpoint
        return req.path === '/api/health';
    },
});

/**
 * User-based rate limiter for read operations
 * More permissive for read-only endpoints
 */
export const userReadRateLimit = rateLimit({
    windowMs: config.readRateLimitWindowMs,
    max: config.readRateLimitMax,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req: Request): string => {
        const userId = (req as any).userId;
        if (userId) {
            return `user:${userId}`;
        }

        const ip = req.ip || req.connection.remoteAddress || 'unknown';
        return `ip:${ip}`;
    },
    handler: (req: Request, res: Response): void => {
        const userId = (req as any).userId;
        const ip = req.ip || req.connection.remoteAddress || 'unknown';

        logRateLimitEvent(ip, req.path, userId);

        res.status(429).json({
            error: 'Rate limit exceeded',
            code: 'RATE_LIMIT_EXCEEDED',
            statusCode: 429,
            retryAfter: Math.ceil(config.readRateLimitWindowMs / 1000),
        });
    },
    skip: (req: Request): boolean => {
        return req.path === '/api/health';
    },
});

/**
 * User-based rate limiter for authentication endpoints
 * More restrictive for auth operations
 */
export const userAuthRateLimit = rateLimit({
    windowMs: config.authRateLimitWindowMs,
    max: config.authRateLimitMax,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req: Request): string => {
        // Auth endpoints are always IP-based (no user ID yet)
        const ip = req.ip || req.connection.remoteAddress || 'unknown';
        return `ip:${ip}`;
    },
    handler: (req: Request, res: Response): void => {
        const ip = req.ip || req.connection.remoteAddress || 'unknown';

        logRateLimitEvent(ip, req.path);

        res.status(429).json({
            error: 'Too many authentication attempts',
            code: 'RATE_LIMIT_EXCEEDED',
            statusCode: 429,
            retryAfter: Math.ceil(config.authRateLimitWindowMs / 1000),
        });
    },
});

export default userRateLimit;
