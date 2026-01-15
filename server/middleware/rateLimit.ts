import rateLimit from 'express-rate-limit';

const isDevelopment = process.env.NODE_ENV !== 'production';

/**
 * Strict rate limit for authentication endpoints
 * 5 attempts per 15 minutes per IP (production)
 * 20 attempts per 15 minutes per IP (development)
 */
export const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: isDevelopment ? 20 : 5, // More lenient in development
  message: { error: 'Too many attempts, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false
});

/**
 * Standard rate limit for API endpoints
 * 100 requests per 15 minutes per IP (production)
 * 1000 requests per 15 minutes per IP (development)
 */
export const apiRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: isDevelopment ? 1000 : 100, // More lenient in development
  message: { error: 'Too many requests, please try again later' },
  standardHeaders: true,
  legacyHeaders: false
});

/**
 * Lenient rate limit for read-only endpoints
 * 200 requests per 15 minutes per IP (production)
 * 2000 requests per 15 minutes per IP (development)
 */
export const readRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: isDevelopment ? 2000 : 200, // More lenient in development
  message: { error: 'Too many requests, please try again later' },
  standardHeaders: true,
  legacyHeaders: false
});
