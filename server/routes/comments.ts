import { Router, Response } from 'express';
import { z } from 'zod';
import { getDatabase } from '../database.js';
import { AuthRequest, authenticate } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/error.js';
import { apiRateLimit } from '../middleware/rateLimit.js';
import { createCommentSchema } from '../validation/schemas.js';
import { validateBody, validateParams } from '../middleware/validation.js';

const router = Router();

/**
 * GET /api/issues/:issueId/comments
 * Get comments for an issue (authenticated)
 */
router.get('/issues/:issueId/comments', authenticate, apiRateLimit, validateParams(z.object({ issueId: z.string().min(1) })), asyncHandler(async (req: AuthRequest, res: Response) => {
  const db = await getDatabase();
  const { issueId } = req.params;

  // Get comments with user info in a single query
  const comments = await db.all(`
    SELECT c.id, c.content, c.issue_id, c.user_id, c.created_at,
           u.id as user_id, u.name as user_name, u.avatar_url as user_avatar_url
    FROM comments c
    JOIN users u ON c.user_id = u.id
    WHERE c.issue_id = ?
    ORDER BY c.created_at ASC
  `, [issueId]);

  // Transform to match expected format
  const commentsWithUsers = comments.map((comment: any) => ({
    id: comment.id,
    content: comment.content,
    issue_id: comment.issue_id,
    user_id: comment.user_id,
    created_at: comment.created_at,
    user: {
      id: comment.user_id,
      name: comment.user_name,
      avatar_url: comment.user_avatar_url
    }
  }));

  res.json({ comments: commentsWithUsers });
  return;
}));

/**
 * POST /api/comments
 * Create a comment (authenticated)
 */
router.post('/', authenticate, validateBody(createCommentSchema), asyncHandler(async (req: AuthRequest, res: Response) => {
  const db = await getDatabase();
  const { content, issueId } = req.body;

  const issue = await db.getIssueById(issueId);
  if (!issue) {
    return res.status(404).json({ error: 'Issue not found' });
  }

  const newComment = await db.createComment({
    content,
    issue_id: issueId,
    user_id: req.userId!
  });

  // Log activity
  await db.createActivity({
    user_id: req.userId!,
    type: 'comment',
    project_id: issue.project_id,
    issue_id: issueId,
    entity_title: issue.title,
    description: 'commented on the issue'
  });

  // Process mentions (simple @Name detection) - batch load users
  const users = await db.getAllUsers();
  const mentionedUsers = users.filter(user =>
    user.id !== req.userId && content.includes(`@${user.name}`)
  );

  // Batch create notifications for mentions
  if (mentionedUsers.length > 0) {
    const notificationValues = mentionedUsers.map(user => [
      db.generateId(),
      user.id,
      'mention',
      'mentioned you in a comment',
      issueId,
      0,
      req.userId,
      db.now()
    ]);

    for (const values of notificationValues) {
      await db.run(
        `INSERT INTO notifications (id, user_id, type, message, issue_id, is_read, actor_id, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        values
      );
    }
    db.save();
  }

  const user = await db.getUserById(req.userId!);

  res.status(201).json({
    comment: {
      ...newComment,
      user: user ? { id: user.id, name: user.name, avatar_url: user.avatar_url } : null
    }
  });
  return;
}));

export default router;
