import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';

// Store CSRF tokens in memory (in production, use Redis or database)
const csrfTokens = new Map<string, { token: string; expires: number }>();

const TOKEN_EXPIRY_MS = 30 * 60 * 1000; // 30 minutes
const TOKEN_LENGTH = 32;

/**
 * Generate a random CSRF token
 */
function generateCsrfToken(): string {
    return crypto.randomBytes(TOKEN_LENGTH).toString('hex');
}

/**
 * Get or generate CSRF token for a session
 * Uses IP address consistently to avoid token mismatches when userId becomes available
 */
function getOrCreateCsrfToken(sessionId: string): string {
    const now = Date.now();
    const existing = csrfTokens.get(sessionId);

    // Reuse existing token if valid
    if (existing && existing.expires > now) {
        return existing.token;
    }

    // Generate new token
    const token = generateCsrfToken();
    csrfTokens.set(sessionId, {
        token,
        expires: now + TOKEN_EXPIRY_MS
    });

    return token;
}

/**
 * Clean up expired CSRF tokens
 */
function cleanupExpiredTokens(): void {
    const now = Date.now();
    for (const [sessionId, data] of csrfTokens.entries()) {
        if (data.expires <= now) {
            csrfTokens.delete(sessionId);
        }
    }
}

// Run cleanup every 5 minutes
setInterval(cleanupExpiredTokens, 5 * 60 * 1000);

/**
 * CSRF Protection Middleware
 *
 * Generates CSRF token and adds it to response headers
 * Validates CSRF token on state-changing requests
 *
 * IMPORTANT: Uses IP address consistently for session ID to avoid token mismatches
 * when authentication status changes (before/after login).
 */
export function csrfProtection(req: Request, res: Response, next: NextFunction) {
    // Use IP address consistently to avoid token mismatches when userId becomes available
    // If we used userId, tokens generated before login (IP-based) would fail after login (userId-based)
    const sessionId = req.ip || 'anonymous';

    // Add CSRF token to response headers for all requests
    const csrfToken = getOrCreateCsrfToken(sessionId);
    res.setHeader('X-CSRF-Token', csrfToken);

    // Skip CSRF validation for safe methods
    const safeMethods = ['GET', 'HEAD', 'OPTIONS'];
    if (safeMethods.includes(req.method)) {
        return next();
    }

    // Validate CSRF token for state-changing methods
    const tokenFromHeader = req.headers['x-csrf-token'] as string;
    const tokenFromBody = req.body?.csrfToken as string;

    const providedToken = tokenFromHeader || tokenFromBody;

    if (!providedToken) {
        return res.status(403).json({
            error: 'Forbidden: CSRF token required for this request'
        });
    }

    const stored = csrfTokens.get(sessionId);
    if (!stored || stored.token !== providedToken) {
        return res.status(403).json({
            error: 'Forbidden: Invalid CSRF token'
        });
    }

    if (stored.expires <= Date.now()) {
        csrfTokens.delete(sessionId);
        return res.status(403).json({
            error: 'Forbidden: CSRF token expired'
        });
    }

    // Don't rotate token immediately - let it be used for concurrent requests
    // The token will be rotated on the next request if needed
    // This prevents CSRF token invalidation during concurrent requests

    next();
}

/**
 * Optional: Get CSRF token endpoint
 * Uses IP address consistently to match csrfProtection middleware
 * Rotates token when explicitly requested to ensure fresh tokens
 */
export function getCsrfToken(req: Request, res: Response) {
    const sessionId = req.ip || 'anonymous';

    // Force token rotation for explicit requests
    const token = generateCsrfToken();
    csrfTokens.set(sessionId, {
        token,
        expires: Date.now() + TOKEN_EXPIRY_MS
    });

    res.json({ csrfToken: token });
}
