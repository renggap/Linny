/**
 * @fileoverview Centralized logging with winston
 * @description Provides structured logging with different log levels
 * @module logger
 */

import winston from 'winston';
import { Request } from 'express';

/**
 * Log levels
 * @enum {string}
 */
export enum LogLevel {
    ERROR = 'error',
    WARN = 'warn',
    INFO = 'info',
    DEBUG = 'debug',
}

/**
 * Logger configuration
 */
const logFormat = winston.format.combine(
    winston.format.timestamp({ format: 'iso8601' }),
    winston.format.errors({ stack: true }),
    winston.format.splat(),
    winston.format.json()
);

/**
 * Console format for development
 */
const consoleFormat = winston.format.combine(
    winston.format.colorize(),
    winston.format.timestamp({ format: 'iso8601' }),
    winston.format.printf(({ timestamp, level, message, ...meta }: any) => {
        let msg = `${timestamp} [${level}]: ${message}`;

        if (Object.keys(meta).length > 0) {
            msg += ` ${JSON.stringify(meta)}`;
        }

        return msg;
    })
);

/**
 * Create logger instance
 */
export const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || LogLevel.INFO,
    format: logFormat,
    defaultMeta: { service: 'neo-linear-api' },
    transports: [
        // Write all logs to console
        new winston.transports.Console({
            format: process.env.NODE_ENV === 'production' ? logFormat : consoleFormat,
        }),
    ],
    // Add file transport in production
    ...(process.env.NODE_ENV === 'production'
        ? [
            new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
            new winston.transports.File({ filename: 'logs/combined.log' }),
        ]
        : []),
});

/**
 * Request logger middleware
 * Logs all incoming requests with timing information
 */
export function requestLogger(req: Request, res: any, next: () => void): void {
    const start = Date.now();
    const requestId = req.headers['x-request-id'] as string || generateRequestId();

    // Attach request ID to request object
    req.headers['x-request-id'] = requestId;

    // Log request
    logger.info('Incoming request', {
        requestId,
        method: req.method,
        path: req.path,
        query: req.query,
        ip: req.ip,
        userAgent: req.get('user-agent'),
    });

    // Log response when finished
    res.on('finish', () => {
        const duration = Date.now() - start;
        const logData: any = {
            requestId,
            method: req.method,
            path: req.path,
            statusCode: res.statusCode,
            duration: `${duration}ms`,
        };

        if (res.statusCode >= 400) {
            logger.warn('Request completed with error', logData);
        } else {
            logger.info('Request completed', logData);
        }
    });

    next();
}

/**
 * Error logger middleware
 * Logs all errors with full context
 */
export function errorLogger(err: Error, req: Request, _res: any, next: (err?: Error) => void): void {
    const requestId = req.headers['x-request-id'] as string;

    logger.error('Error occurred', {
        requestId,
        error: {
            name: err.name,
            message: err.message,
            stack: err.stack,
        },
        request: {
            method: req.method,
            path: req.path,
            query: req.query,
            body: req.body,
            ip: req.ip,
        },
    });

    next(err);
}

/**
 * Generate unique request ID
 */
function generateRequestId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Create child logger with additional context
 */
export function createChildLogger(context: Record<string, any>): winston.Logger {
    return logger.child(context);
}

/**
 * Log database query
 */
export function logQuery(sql: string, params: any[], duration: number): void {
    logger.debug('Database query', {
        sql,
        params,
        duration: `${duration}ms`,
    });
}

/**
 * Log authentication event
 */
export function logAuthEvent(event: string, userId?: string, metadata?: any): void {
    logger.info('Authentication event', {
        event,
        userId,
        ...metadata,
    });
}

/**
 * Log rate limit event
 */
export function logRateLimitEvent(ip: string, endpoint: string, userId?: string): void {
    logger.warn('Rate limit exceeded', {
        ip,
        userId,
        endpoint,
    });
}

/**
 * Log security event
 */
export function logSecurityEvent(event: string, metadata: any): void {
    logger.warn('Security event', {
        event,
        ...metadata,
    });
}

export default logger;
