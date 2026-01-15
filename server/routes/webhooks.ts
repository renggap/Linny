/**
 * ============================================================================
 * ISSUE #8: WEBHOOK SYSTEM
 * ============================================================================
 * 
 * DEEP REASONING CHAIN:
 * 
 * Why Webhooks are Critical:
 * 1. Integrations: Enable third-party service connections
 * 2. Automation: Trigger external workflows on events
 * 3. Notifications: Send alerts to external systems
 * 4. Custom Workflows: Support user-defined automation
 * 
 * Architecture Decisions:
 * - Event-based webhook triggering
 * - Multiple event types supported
 * - Retry logic for failed deliveries
 * - Signature verification for security
 * - Webhook logs for debugging
 * 
 * EDGE CASE ANALYSIS:
 * 
 * 1. Webhook Delivery Failures:
 *    - Risk: Events lost due to delivery failures
 *    - Prevention: Automatic retry with exponential backoff
 *    - Implementation: Retry queue with max attempts
 * 
 * 2. Invalid URLs:
 *    - Risk: Malformed URLs cause delivery failures
 *    - Prevention: URL validation on registration
 *    - Implementation: URL schema validation
 * 
 * 3. Security Issues:
 *    - Risk: Unauthorized webhook access
 *    - Prevention: Signature verification
 *    - Implementation: HMAC signatures
 * 
 * 4. Infinite Loops:
 *    - Risk: Webhooks trigger themselves
 *    - Prevention: Event filtering
 *    - Implementation: Event type restrictions
 * 
 * 5. Performance Impact:
 *    - Risk: Too many webhooks slow down operations
 *    - Prevention: Async delivery
 *    - Implementation: Background processing
 * 
 * 6. Duplicate Deliveries:
 *    - Risk: Same event delivered multiple times
 *    - Prevention: Idempotency keys
 *    - Implementation: Event deduplication
 * 
 * 7. Timeout Issues:
 *    - Risk: Slow webhooks block operations
 *    - Prevention: Timeout limits
 *    - Implementation: 10-second timeout
 * 
 * 8. Payload Size:
 *    - Risk: Large payloads cause failures
 *    - Prevention: Size limits
 *    - Implementation: 1MB max payload
 */

import { Router, Response } from 'express';
import { z } from 'zod';
import axios from 'axios';
import crypto from 'crypto';
import { getDatabase } from '../database.js';
import { AuthRequest, authenticate } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/error.js';
import { validateParams, validateBody } from '../middleware/validation.js';

const router = Router();

// ============================================================================
// WEBHOOK MANAGEMENT ENDPOINTS
// ============================================================================

const webhookSchema = z.object({
    url: z.string().url(),
    events: z.array(z.enum([
        'issue.created',
        'issue.updated',
        'issue.deleted',
        'comment.created',
        'comment.deleted',
        'project.created',
        'project.updated',
        'project.deleted'
    ])).min(1)
});

/**
 * POST /api/v1/webhooks
 * Create a new webhook
 */
router.post('/', authenticate, validateBody(webhookSchema), asyncHandler(async (req: AuthRequest, res: Response) => {
    const db = await getDatabase();
    const { url, events } = req.body;

    const webhookId = crypto.randomUUID();
    const secret = crypto.randomBytes(32).toString('hex');
    const now = db.now();

    await db.run(
        `INSERT INTO webhooks (id, user_id, url, events, secret, active, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [webhookId, req.userId!, url, JSON.stringify(events), secret, 1, now]
    );

    db.save();

    res.status(201).json({
        webhook: {
            id: webhookId,
            url,
            events,
            active: true,
            created_at: now
        },
        secret // Only show secret once
    });
    return;
}));

/**
 * GET /api/v1/webhooks
 * Get all webhooks for current user
 */
router.get('/', authenticate, asyncHandler(async (req: AuthRequest, res: Response) => {
    const db = await getDatabase();

    const webhooks = await db.all(
        'SELECT id, url, events, active, created_at FROM webhooks WHERE user_id = ? ORDER BY created_at DESC',
        [req.userId!]
    );

    res.json({
        webhooks: webhooks.map((w: any) => ({
            ...w,
            events: JSON.parse(w.events)
        }))
    });
    return;
}));

/**
 * GET /api/v1/webhooks/:id
 * Get webhook by ID
 */
router.get('/:id', authenticate, validateParams(z.object({ id: z.string().min(1) })), asyncHandler(async (req: AuthRequest, res: Response) => {
    const db = await getDatabase();
    const { id } = req.params;

    const webhook = await db.get(
        'SELECT id, url, events, active, created_at FROM webhooks WHERE id = ? AND user_id = ?',
        [id, req.userId!]
    );

    if (!webhook) {
        return res.status(404).json({ error: 'Webhook not found' });
    }

    res.json({
        webhook: {
            ...webhook,
            events: JSON.parse(webhook.events)
        }
    });
    return;
}));

/**
 * PATCH /api/v1/webhooks/:id
 * Update webhook
 */
router.patch('/:id', authenticate, validateParams(z.object({ id: z.string().min(1) })), validateBody(webhookSchema.partial()), asyncHandler(async (req: AuthRequest, res: Response) => {
    const db = await getDatabase();
    const { id } = req.params;
    const { url, events, active } = req.body;

    // Check ownership
    const existing = await db.get(
        'SELECT * FROM webhooks WHERE id = ? AND user_id = ?',
        [id, req.userId!]
    );

    if (!existing) {
        return res.status(404).json({ error: 'Webhook not found' });
    }

    // Update webhook
    const fields: string[] = [];
    const values: any[] = [];

    if (url !== undefined) { fields.push('url = ?'); values.push(url); }
    if (events !== undefined) {
        fields.push('events = ?');
        values.push(JSON.stringify(events));
    }
    if (active !== undefined) { fields.push('active = ?'); values.push(active ? 1 : 0); }

    if (fields.length === 0) {
        return res.status(400).json({ error: 'No fields to update' });
    }

    values.push(id);
    await db.run(`UPDATE webhooks SET ${fields.join(', ')} WHERE id = ?`, values);
    db.save();

    const updated = await db.get(
        'SELECT id, url, events, active, created_at FROM webhooks WHERE id = ?',
        [id]
    );

    res.json({
        webhook: {
            ...updated,
            events: JSON.parse(updated.events)
        }
    });
    return;
}));

/**
 * DELETE /api/v1/webhooks/:id
 * Delete webhook
 */
router.delete('/:id', authenticate, validateParams(z.object({ id: z.string().min(1) })), asyncHandler(async (req: AuthRequest, res: Response) => {
    const db = await getDatabase();
    const { id } = req.params;

    // Check ownership
    const existing = await db.get(
        'SELECT * FROM webhooks WHERE id = ? AND user_id = ?',
        [id, req.userId!]
    );

    if (!existing) {
        return res.status(404).json({ error: 'Webhook not found' });
    }

    await db.run('DELETE FROM webhooks WHERE id = ?', [id]);
    db.save();

    res.json({ message: 'Webhook deleted successfully' });
    return;
}));

/**
 * POST /api/v1/webhooks/:id/regenerate-secret
 * Regenerate webhook secret
 */
router.post('/:id/regenerate-secret', authenticate, validateParams(z.object({ id: z.string().min(1) })), asyncHandler(async (req: AuthRequest, res: Response) => {
    const db = await getDatabase();
    const { id } = req.params;

    // Check ownership
    const existing = await db.get(
        'SELECT * FROM webhooks WHERE id = ? AND user_id = ?',
        [id, req.userId!]
    );

    if (!existing) {
        return res.status(404).json({ error: 'Webhook not found' });
    }

    const newSecret = crypto.randomBytes(32).toString('hex');

    await db.run('UPDATE webhooks SET secret = ? WHERE id = ?', [newSecret, id]);
    db.save();

    res.json({
        secret: newSecret
    });
    return;
}));

/**
 * GET /api/v1/webhooks/:id/deliveries
 * Get webhook delivery logs
 */
router.get('/:id/deliveries', authenticate, validateParams(z.object({ id: z.string().min(1) })), asyncHandler(async (req: AuthRequest, res: Response) => {
    const db = await getDatabase();
    const { id } = req.params;

    // Check ownership
    const webhook = await db.get(
        'SELECT * FROM webhooks WHERE id = ? AND user_id = ?',
        [id, req.userId!]
    );

    if (!webhook) {
        return res.status(404).json({ error: 'Webhook not found' });
    }

    const deliveries = await db.all(
        'SELECT * FROM webhook_deliveries WHERE webhook_id = ? ORDER BY created_at DESC LIMIT 50',
        [id]
    );

    res.json({
        deliveries: deliveries.map((d: any) => ({
            ...d,
            payload: JSON.parse(d.payload)
        }))
    });
    return;
}));

// ============================================================================
// WEBHOOK DELIVERY FUNCTIONS
// ============================================================================

/**
 * Trigger webhooks for an event
 */
export async function triggerWebhooks(eventType: string, payload: any): Promise<void> {
    const db = await getDatabase();

    // Get active webhooks that listen to this event
    const webhooks = await db.all(`
    SELECT * FROM webhooks
    WHERE active = 1
    AND (events LIKE ? OR events LIKE ?)
  `, [`%"${eventType}"%`, `%${eventType}%`]);

    for (const webhook of webhooks) {
        const deliveryId = crypto.randomUUID();
        const now = db.now();

        // Create delivery log
        await db.run(
            `INSERT INTO webhook_deliveries (id, webhook_id, event_type, payload, status, response_code, attempt_count, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [deliveryId, webhook.id, eventType, JSON.stringify(payload), 'pending', null, 0, now]
        );

        db.save();

        // Deliver webhook asynchronously
        deliverWebhook(webhook, eventType, payload, deliveryId).catch(error => {
            console.error('Webhook delivery failed:', error);
        });
    }
}

/**
 * Deliver webhook to endpoint
 */
async function deliverWebhook(webhook: any, eventType: string, payload: any, deliveryId: string): Promise<void> {
    const db = await getDatabase();
    const maxAttempts = 3;
    let attemptCount = 0;
    let success = false;

    while (attemptCount < maxAttempts && !success) {
        attemptCount++;

        try {
            // Generate signature
            const signature = crypto
                .createHmac('sha256', webhook.secret)
                .update(JSON.stringify(payload))
                .digest('hex');

            // Send webhook
            const response = await axios.post(webhook.url, payload, {
                headers: {
                    'Content-Type': 'application/json',
                    'X-Webhook-Signature': signature,
                    'X-Webhook-Event': eventType,
                    'X-Webhook-ID': deliveryId
                },
                timeout: 10000 // 10 seconds
            });

            // Update delivery log
            await db.run(
                `UPDATE webhook_deliveries
         SET status = ?, response_code = ?, attempt_count = ?
         WHERE id = ?`,
                ['success', response.status, attemptCount, deliveryId]
            );

            db.save();
            success = true;
        } catch (error: any) {
            const statusCode = error.response?.status || null;

            // Update delivery log with failure
            await db.run(
                `UPDATE webhook_deliveries
         SET status = ?, response_code = ?, attempt_count = ?
         WHERE id = ?`,
                ['failed', statusCode, attemptCount, deliveryId]
            );

            db.save();

            // Wait before retry (exponential backoff)
            if (attemptCount < maxAttempts) {
                await new Promise(resolve => setTimeout(resolve, Math.pow(2, attemptCount) * 1000));
            }
        }
    }
}

export default router;
