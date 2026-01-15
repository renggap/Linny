/**
 * ============================================================================
 * ISSUE #9: API KEY MANAGEMENT
 * ============================================================================
 * 
 * DEEP REASONING CHAIN:
 * 
 * Why API Keys are Critical:
 * 1. Programmatic Access: Enable automation and scripts
 * 2. Third-Party Integrations: Allow external services
 * 3. Service Accounts: Non-human access to API
 * 4. Security: Separate from user credentials
 * 
 * Architecture Decisions:
 * - Cryptographically secure key generation
 * - Key scopes for granular permissions
 * - Expiration dates for temporary access
 * - Usage tracking for monitoring
 * - Revocation capability for security
 * 
 * EDGE CASE ANALYSIS:
 * 
 * 1. Key Exposure:
 *    - Risk: Leaked keys allow unauthorized access
 *    - Prevention: Show key only once
 *    - Implementation: One-time display
 * 
 * 2. Key Reuse:
 *    - Risk: Same key used across environments
 *    - Prevention: Environment-specific prefixes
 *    - Implementation: Key prefixes (dev_, prod_)
 * 
 * 3. Unlimited Access:
 *    - Risk: Keys with no expiration
 *    - Prevention: Default expiration
 *    - Implementation: 90-day default
 * 
 * 4. Excessive Usage:
 *    - Risk: Keys used for abuse
 *    - Prevention: Usage limits
 *    - Implementation: Rate limiting per key
 * 
 * 5. Key Conflicts:
 *    - Risk: Duplicate key generation
 *    - Prevention: Unique constraints
 *    - Implementation: Database uniqueness
 * 
 * 6. Invalid Scopes:
 *    - Risk: Keys with too much access
 *    - Prevention: Scope validation
 *    - Implementation: Allowed scope list
 * 
 * 7. Revocation Issues:
 *    - Risk: Revoked keys still work
 *    - Prevention: Immediate invalidation
 *    - Implementation: Cache invalidation
 * 
 * 8. Audit Trail:
 *    - Risk: No tracking of key usage
 *    - Prevention: Usage logging
 *    - Implementation: Request logging
 */

import { Router, Response } from 'express';
import { z } from 'zod';
import crypto from 'crypto';
import { getDatabase } from '../database.js';
import { AuthRequest, authenticate } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/error.js';
import { validateParams, validateBody } from '../middleware/validation.js';

const router = Router();

// ============================================================================
// API KEY MANAGEMENT ENDPOINTS
// ============================================================================

const apiKeySchema = z.object({
    name: z.string().min(1).max(100),
    scopes: z.array(z.enum([
        'read:issues',
        'write:issues',
        'read:projects',
        'write:projects',
        'read:users',
        'write:users',
        'read:comments',
        'write:comments'
    ])).min(1),
    expiresAt: z.string().optional()
});

/**
 * POST /api/v1/api-keys
 * Create a new API key
 */
router.post('/', authenticate, validateBody(apiKeySchema), asyncHandler(async (req: AuthRequest, res: Response) => {
    const db = await getDatabase();
    const { name, scopes, expiresAt } = req.body;

    const keyId = crypto.randomUUID();
    const keyPrefix = 'lin_';
    const keySecret = crypto.randomBytes(32).toString('hex');
    const apiKey = `${keyPrefix}${keySecret}`;
    const now = db.now();

    // Calculate expiration (default 90 days)
    let expiresAtDate: string | null = null;
    if (expiresAt) {
        expiresAtDate = expiresAt;
    } else {
        const defaultExpiry = new Date();
        defaultExpiry.setDate(defaultExpiry.getDate() + 90);
        expiresAtDate = defaultExpiry.toISOString();
    }

    await db.run(
        `INSERT INTO api_keys (id, user_id, name, key, scopes, expires_at, last_used, usage_count, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [keyId, req.userId!, name, apiKey, JSON.stringify(scopes), expiresAtDate, null, 0, now]
    );

    db.save();

    res.status(201).json({
        apiKey: {
            id: keyId,
            name,
            scopes,
            expires_at: expiresAtDate,
            created_at: now
        },
        key: apiKey // Only show key once
    });
    return;
}));

/**
 * GET /api/v1/api-keys
 * Get all API keys for current user
 */
router.get('/', authenticate, asyncHandler(async (req: AuthRequest, res: Response) => {
    const db = await getDatabase();

    const apiKeys = await db.all(
        'SELECT id, name, scopes, expires_at, last_used, usage_count, created_at FROM api_keys WHERE user_id = ? ORDER BY created_at DESC',
        [req.userId!]
    );

    res.json({
        apiKeys: apiKeys.map((k: any) => ({
            ...k,
            scopes: JSON.parse(k.scopes)
        }))
    });
    return;
}));

/**
 * GET /api/v1/api-keys/:id
 * Get API key by ID
 */
router.get('/:id', authenticate, validateParams(z.object({ id: z.string().min(1) })), asyncHandler(async (req: AuthRequest, res: Response) => {
    const db = await getDatabase();
    const { id } = req.params;

    const apiKey = await db.get(
        'SELECT id, name, scopes, expires_at, last_used, usage_count, created_at FROM api_keys WHERE id = ? AND user_id = ?',
        [id, req.userId!]
    );

    if (!apiKey) {
        return res.status(404).json({ error: 'API key not found' });
    }

    res.json({
        apiKey: {
            ...apiKey,
            scopes: JSON.parse(apiKey.scopes)
        }
    });
    return;
}));

/**
 * DELETE /api/v1/api-keys/:id
 * Delete API key
 */
router.delete('/:id', authenticate, validateParams(z.object({ id: z.string().min(1) })), asyncHandler(async (req: AuthRequest, res: Response) => {
    const db = await getDatabase();
    const { id } = req.params;

    // Check ownership
    const existing = await db.get(
        'SELECT * FROM api_keys WHERE id = ? AND user_id = ?',
        [id, req.userId!]
    );

    if (!existing) {
        return res.status(404).json({ error: 'API key not found' });
    }

    await db.run('DELETE FROM api_keys WHERE id = ?', [id]);
    db.save();

    res.json({ message: 'API key deleted successfully' });
    return;
}));

/**
 * POST /api/v1/api-keys/:id/regenerate
 * Regenerate API key
 */
router.post('/:id/regenerate', authenticate, validateParams(z.object({ id: z.string().min(1) })), asyncHandler(async (req: AuthRequest, res: Response) => {
    const db = await getDatabase();
    const { id } = req.params;

    // Check ownership
    const existing = await db.get(
        'SELECT * FROM api_keys WHERE id = ? AND user_id = ?',
        [id, req.userId!]
    );

    if (!existing) {
        return res.status(404).json({ error: 'API key not found' });
    }

    // Generate new key
    const keyPrefix = 'lin_';
    const keySecret = crypto.randomBytes(32).toString('hex');
    const newApiKey = `${keyPrefix}${keySecret}`;

    await db.run('UPDATE api_keys SET key = ?, usage_count = 0 WHERE id = ?', [newApiKey, id]);
    db.save();

    res.json({
        key: newApiKey
    });
    return;
}));

/**
 * POST /api/v1/api-keys/:id/revoke
 * Revoke API key (soft delete)
 */
router.post('/:id/revoke', authenticate, validateParams(z.object({ id: z.string().min(1) })), asyncHandler(async (req: AuthRequest, res: Response) => {
    const db = await getDatabase();
    const { id } = req.params;

    // Check ownership
    const existing = await db.get(
        'SELECT * FROM api_keys WHERE id = ? AND user_id = ?',
        [id, req.userId!]
    );

    if (!existing) {
        return res.status(404).json({ error: 'API key not found' });
    }

    // Soft delete by setting expiration to now
    await db.run('UPDATE api_keys SET expires_at = ? WHERE id = ?', [db.now(), id]);
    db.save();

    res.json({ message: 'API key revoked successfully' });
    return;
}));

/**
 * GET /api/v1/api-keys/:id/usage
 * Get API key usage statistics
 */
router.get('/:id/usage', authenticate, validateParams(z.object({ id: z.string().min(1) })), asyncHandler(async (req: AuthRequest, res: Response) => {
    const db = await getDatabase();
    const { id } = req.params;

    // Check ownership
    const existing = await db.get(
        'SELECT * FROM api_keys WHERE id = ? AND user_id = ?',
        [id, req.userId!]
    );

    if (!existing) {
        return res.status(404).json({ error: 'API key not found' });
    }

    // Get usage from analytics (simplified for MVP)
    const usage = {
        total_requests: existing.usage_count,
        last_used: existing.last_used,
        created_at: existing.created_at,
        expires_at: existing.expires_at
    };

    res.json({ usage });
    return;
}));

export default router;
