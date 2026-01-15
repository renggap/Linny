import DOMPurify from 'isomorphic-dompurify';
import { Request, Response, NextFunction } from 'express';

/**
 * Input Sanitization Middleware
 * 
 * DEEP REASONING CHAIN:
 * Input sanitization is critical for preventing XSS attacks and ensuring data integrity.
 * This middleware:
 * 1. Sanitizes HTML content in request bodies to prevent XSS
 * 2. Removes malicious scripts and event handlers
 * 3. Preserves safe HTML formatting
 * 4. Handles nested objects and arrays recursively
 * 
 * EDGE CASE ANALYSIS:
 * - Handles null/undefined values gracefully
 * - Preserves non-string values (numbers, booleans)
 * - Sanitizes nested objects and arrays
 * - Configurable sanitization levels (strict vs permissive)
 * - Does not modify request headers or query params (handled separately)
 */

interface SanitizeOptions {
    allowedTags?: string[];
    allowedAttributes?: Record<string, string[]>;
    strict?: boolean;
}

const DEFAULT_ALLOWED_TAGS = [
    'p', 'br', 'strong', 'em', 'u', 's', 'code', 'pre',
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'ul', 'ol', 'li', 'blockquote', 'a', 'span'
];

/**
 * Sanitize a string value
 */
function sanitizeString(value: string, options: SanitizeOptions): string {
    return DOMPurify.sanitize(value, {
        ALLOWED_TAGS: options.allowedTags || DEFAULT_ALLOWED_TAGS,
        ALLOWED_ATTR: options.allowedAttributes ? Object.values(options.allowedAttributes).flat() : ['href', 'title', 'class'],
        KEEP_CONTENT: true
    });
}

/**
 * Recursively sanitize an object
 */
function sanitizeObject(obj: any, options: SanitizeOptions): any {
    if (obj === null || obj === undefined) {
        return obj;
    }

    if (typeof obj === 'string') {
        return sanitizeString(obj, options);
    }

    if (Array.isArray(obj)) {
        return obj.map(item => sanitizeObject(item, options));
    }

    if (typeof obj === 'object') {
        const sanitized: any = {};
        for (const key in obj) {
            if (Object.prototype.hasOwnProperty.call(obj, key)) {
                sanitized[key] = sanitizeObject(obj[key], options);
            }
        }
        return sanitized;
    }

    // Return primitive values as-is
    return obj;
}

/**
 * Middleware to sanitize request body
 */
export function sanitizeBody(options: SanitizeOptions = {}) {
    return (req: Request, _res: Response, next: NextFunction) => {
        if (req.body) {
            req.body = sanitizeObject(req.body, options);
        }
        next();
    };
}

/**
 * Middleware to sanitize specific fields
 */
export function sanitizeFields(fields: string[], options: SanitizeOptions = {}) {
    return (req: Request, _res: Response, next: NextFunction) => {
        if (req.body) {
            for (const field of fields) {
                if (req.body[field] && typeof req.body[field] === 'string') {
                    req.body[field] = sanitizeString(req.body[field], options);
                }
            }
        }
        next();
    };
}

/**
 * Strict sanitization for user-generated content
 * Removes all HTML except basic formatting
 */
export function strictSanitizeBody(req: Request, _res: Response, next: NextFunction) {
    if (req.body) {
        req.body = sanitizeObject(req.body, {
            allowedTags: ['p', 'br', 'strong', 'em', 'u', 'code'],
            allowedAttributes: {},
            strict: true
        });
    }
    next();
}
