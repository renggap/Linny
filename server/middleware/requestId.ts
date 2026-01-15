/**
 * @fileoverview Request ID tracking middleware
 * @description Generates and propagates unique request IDs for tracing
 * @module requestId
 */

import { Request, Response, NextFunction } from 'express';

/**
 * Extended Request interface with request ID
 */
export interface RequestWithId extends Request {
    id?: string;
}

/**
 * Request ID tracking middleware
 * Generates unique request ID if not present and adds it to request headers
 * Also adds request ID to response headers for client-side tracking
 */
export function requestIdMiddleware(req: RequestWithId, res: Response, next: NextFunction): void {
    // Get existing request ID from header or generate new one
    const requestId = (req.headers['x-request-id'] as string) || generateRequestId();

    // Attach to request object
    req.id = requestId;

    // Add to request headers for downstream use
    req.headers['x-request-id'] = requestId;

    // Add to response headers for client-side tracking
    res.setHeader('x-request-id', requestId);

    next();
}

/**
 * Generate unique request ID
 * Format: timestamp-randomstring
 */
function generateRequestId(): string {
    const timestamp = Date.now().toString(36);
    const randomPart = Math.random().toString(36).substring(2, 11);
    return `${timestamp}-${randomPart}`;
}

export default requestIdMiddleware;
