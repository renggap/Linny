/**
 * @fileoverview Graceful shutdown handler
 * @description Handles SIGTERM and SIGINT signals for clean shutdown
 * @module shutdown
 */

import { Server } from 'http';
import { getDatabase } from '../database.js';
import { logger } from './logger.js';

/**
 * Shutdown timeout in milliseconds
 */
const SHUTDOWN_TIMEOUT = 10000; // 10 seconds

/**
 * Track in-flight requests
 */
let inFlightRequests = 0;

/**
 * Track server instance
 */
let serverInstance: Server | null = null;

/**
 * Track shutdown state
 */
let isShuttingDown = false;

/**
 * Set server instance
 */
export function setServer(server: Server): void {
    serverInstance = server;

    // Track in-flight requests
    server.on('request', (_req, _res) => {
        inFlightRequests++;
    });

    server.on('close', () => {
        logger.info('Server closed');
    });
}

/**
 * Track response completion
 */
export function trackRequestComplete(): void {
    inFlightRequests--;
}

/**
 * Handle graceful shutdown
 */
async function handleShutdown(signal: string): Promise<void> {
    if (isShuttingDown) {
        logger.warn('Shutdown already in progress, ignoring signal');
        return;
    }

    isShuttingDown = true;
    logger.info(`Received ${signal} signal, starting graceful shutdown...`);

    // Set timeout for forced shutdown
    const timeout = setTimeout(() => {
        logger.error('Shutdown timeout reached, forcing exit');
        process.exit(1);
    }, SHUTDOWN_TIMEOUT);

    try {
        // Stop accepting new connections
        if (serverInstance) {
            logger.info('Closing HTTP server...');
            await new Promise<void>((resolve) => {
                serverInstance!.close(() => {
                    logger.info('HTTP server closed');
                    resolve();
                });
            });
        }

        // Wait for in-flight requests to complete
        if (inFlightRequests > 0) {
            logger.info(`Waiting for ${inFlightRequests} in-flight requests to complete...`);
            await waitForRequestsToComplete();
        }

        // Close database connection
        logger.info('Closing database connection...');
        const db = await getDatabase();
        db.close();
        logger.info('Database connection closed');

        // Clear timeout
        clearTimeout(timeout);

        logger.info('Graceful shutdown completed');
        process.exit(0);
    } catch (error) {
        logger.error('Error during shutdown:', error);
        clearTimeout(timeout);
        process.exit(1);
    }
}

/**
 * Wait for in-flight requests to complete
 */
function waitForRequestsToComplete(): Promise<void> {
    return new Promise((resolve) => {
        const checkInterval = setInterval(() => {
            if (inFlightRequests === 0) {
                clearInterval(checkInterval);
                resolve();
            }
        }, 100);
    });
}

/**
 * Register shutdown handlers
 */
export function registerShutdownHandlers(): void {
    // Handle SIGTERM (common in production)
    process.on('SIGTERM', () => {
        handleShutdown('SIGTERM');
    });

    // Handle SIGINT (Ctrl+C)
    process.on('SIGINT', () => {
        handleShutdown('SIGINT');
    });

    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
        logger.error('Uncaught exception:', error);
        handleShutdown('uncaughtException');
    });

    // Handle unhandled promise rejections
    process.on('unhandledRejection', (reason, promise) => {
        logger.error('Unhandled promise rejection:', {
            reason,
            promise,
        });
        handleShutdown('unhandledRejection');
    });
}

/**
 * Middleware to track request completion
 */
export function requestTrackingMiddleware(_req: any, res: any, next: () => void): void {
    const originalEnd = res.end;

    res.end = function (...args: any[]) {
        trackRequestComplete();
        originalEnd.apply(this, args);
    };

    next();
}

export default {
    setServer,
    registerShutdownHandlers,
    requestTrackingMiddleware,
};
