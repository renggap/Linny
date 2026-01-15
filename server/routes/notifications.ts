import { Router, Response } from 'express';
import { z } from 'zod';
import { getDatabase } from '../database.js';
import { AuthRequest, authenticate } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/error.js';
import { apiRateLimit } from '../middleware/rateLimit.js';
import { validateParams } from '../middleware/validation.js';

const router = Router();

/**
 * GET /api/notifications
 * Get notifications for current user (authenticated)
 */
router.get('/', authenticate, apiRateLimit, asyncHandler(async (req: AuthRequest, res: Response) => {
  const db = await getDatabase();
  const { unread } = req.query;

  let notifications;
  if (unread === 'true') {
    notifications = await db.getUnreadNotificationsByUser(req.userId!);
  } else {
    notifications = await db.getNotificationsByUser(req.userId!);
  }

  // Batch load actor info for all notifications
  const actorIds = notifications
    .map(n => n.actor_id)
    .filter((id): id is string => id !== null);

  const uniqueActorIds = [...new Set(actorIds)];

  const actors = uniqueActorIds.length > 0
    ? await db.all(`
        SELECT id, name, avatar_url
        FROM users
        WHERE id IN (${uniqueActorIds.map(() => '?').join(',')})
      `, uniqueActorIds)
    : [];

  const actorMap = new Map(actors.map((actor: any) => [actor.id, actor]));

  // Combine data
  const notificationsWithActor = notifications.map(notification => ({
    ...notification,
    is_read: !!notification.is_read,
    actor: notification.actor_id ? actorMap.get(notification.actor_id) || null : null
  }));

  res.json({ notifications: notificationsWithActor });
}));

/**
 * PATCH /api/notifications/:id/read
 * Mark notification as read (authenticated)
 */
router.patch('/:id/read', authenticate, validateParams(z.object({ id: z.string().min(1) })), asyncHandler(async (req: AuthRequest, res: Response) => {
  const db = await getDatabase();
  const { id } = req.params;

  const notifications = await db.getNotificationsByUser(req.userId!);
  const notification = notifications.find(n => n.id === id);

  if (!notification) {
    return res.status(404).json({ error: 'Notification not found' });
  }

  await db.markNotificationRead(id!);

  res.json({ message: 'Notification marked as read' });
  return;
}));

/**
 * PATCH /api/notifications/read-all
 * Mark all notifications as read for current user (authenticated)
 */
router.patch('/read-all', authenticate, asyncHandler(async (req: AuthRequest, res: Response) => {
  const db = await getDatabase();
  await db.markAllNotificationsRead(req.userId!);
  res.json({ message: 'All notifications marked as read' });
  return;
}));

export default router;
