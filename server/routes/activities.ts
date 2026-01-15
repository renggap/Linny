import { Router, Response } from 'express';
import { z } from 'zod';
import { getDatabase } from '../database.js';
import { AuthRequest, authenticate } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/error.js';
import { readRateLimit } from '../middleware/rateLimit.js';
import { validateQuery } from '../middleware/validation.js';

const router = Router();

/**
 * GET /api/activities
 * Get activities with optional filters (authenticated)
 */
router.get('/', authenticate, readRateLimit, validateQuery(z.object({
  projectId: z.string().optional(),
  limit: z.coerce.number().min(1).max(500).optional()
})), asyncHandler(async (req: AuthRequest, res: Response) => {
  const db = await getDatabase();
  const { projectId, limit = 100 } = req.query;

  let activities;

  if (projectId && typeof projectId === 'string') {
    activities = await db.getActivitiesByProject(projectId, Number(limit));
  } else {
    activities = await db.getRecentActivities(Number(limit));
  }

  // Batch load user info for all activities
  const userIds = [...new Set(activities.map(a => a.user_id))];

  const users = userIds.length > 0
    ? await db.all(`
        SELECT id, name, avatar_url
        FROM users
        WHERE id IN (${userIds.map(() => '?').join(',')})
      `, userIds)
    : [];

  const userMap = new Map(users.map((user: any) => [user.id, user]));

  // Combine data
  const activitiesWithUsers = activities.map(activity => ({
    ...activity,
    user: activity.user_id ? userMap.get(activity.user_id) || null : null
  }));

  res.json({ activities: activitiesWithUsers });
}));

export default router;
