import { Request, Response, NextFunction } from 'express';

/**
 * Request Logging Middleware
 * 
 * DEEP REASONING CHAIN:
 * This middleware is critical for debugging, monitoring, and security auditing. It captures:
 * 1. Request metadata (method, path, IP, user agent)
 * 2. Timing metrics (response time for performance monitoring)
 * 3. Response status codes (for error rate tracking)
 * 4. User context (when authenticated)
 * 
 * EDGE CASE ANALYSIS:
 * - Handles missing user-agent headers gracefully
 * - Captures both successful and failed requests
 * - Logs errors separately with stack traces for debugging
 * - Uses structured logging format for easy parsing by monitoring tools
 * - Prevents logging sensitive data (passwords, tokens) by only logging metadata
 */

interface LogData {
    timestamp: string;
    method: string;
    path: string;
    ip: string;
    userAgent?: string;
    userId?: string;
    statusCode: number;
    responseTime: number;
    error?: string;
}

export function requestLogger(req: Request, res: Response, next: NextFunction): void {
    const startTime = Date.now();
    const timestamp = new Date().toISOString();

    // Extract client IP (handle proxy scenarios)
    const ip = req.ip ||
        req.socket.remoteAddress ||
        req.headers['x-forwarded-for'] as string ||
        'unknown';

    // Extract user ID if authenticated
    const userId = (req as any).user?.userId;

    // Log when response finishes
    res.on('finish', () => {
        const responseTime = Date.now() - startTime;
        const logData: LogData = {
            timestamp,
            method: req.method,
            path: req.path,
            ip,
            userAgent: req.headers['user-agent'],
            userId,
            statusCode: res.statusCode,
            responseTime
        };

        // Log errors separately with more detail
        if (res.statusCode >= 400) {
            const errorMessage = (res as any).errorMessage || 'Request failed';
            logData.error = errorMessage;

            console.error(`[ERROR] ${JSON.stringify(logData)}`);
        } else {
            console.log(`[REQUEST] ${JSON.stringify(logData)}`);
        }
    });

    next();
}

/**
 * Error Logging Middleware
 * Logs errors with full context for debugging
 */
export function errorLogger(err: Error, req: Request, _res: Response, next: NextFunction): void {
    const errorLog = {
        timestamp: new Date().toISOString(),
        error: {
            name: err.name,
            message: err.message,
            stack: err.stack
        },
        request: {
            method: req.method,
            path: req.path,
            ip: req.ip || req.socket.remoteAddress,
            userId: (req as any).user?.userId,
            headers: {
                'user-agent': req.headers['user-agent'],
                'content-type': req.headers['content-type']
            },
            body: sanitizeRequestBody(req.body)
        }
    };

    console.error(`[ERROR] ${JSON.stringify(errorLog, null, 2)}`);

    // Pass error to next middleware
    next(err);
}

/**
 * Sanitize request body to prevent logging sensitive data
 */
function sanitizeRequestBody(body: any): any {
    if (!body || typeof body !== 'object') {
        return body;
    }

    const sanitized = { ...body };
    const sensitiveFields = ['password', 'token', 'refreshToken', 'accessToken', 'secret'];

    for (const field of sensitiveFields) {
        if (field in sanitized) {
            sanitized[field] = '[REDACTED]';
        }
    }

    return sanitized;
}
