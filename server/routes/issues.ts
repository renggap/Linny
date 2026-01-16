import { Router, Response } from 'express';
import { z } from 'zod';
import { getDatabase } from '../database.js';
import { AuthRequest, authenticate, requireCanCreateContent, requireAdmin, requireIssueTeamMember } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/error.js';
import { readRateLimit, apiRateLimit } from '../middleware/rateLimit.js';
import { cacheMiddleware, invalidateCache } from '../middleware/cache.js';
import { createIssueSchema, statusSchema, createSubtaskSchema } from '../validation/schemas.js';
import { validateBody, validateParams, validateQuery } from '../middleware/validation.js';
import { broadcastIssueUpdate, broadcastNewIssue } from '../websocket/websocketServer.js';

const router = Router();

/**
 * GET /api/v1/issues
 * Get issues with filters (authenticated, with caching)
 */
router.get('/', authenticate, readRateLimit, cacheMiddleware('issues', 60), validateQuery(z.object({
  teamId: z.string().optional(),
  projectId: z.string().optional(),
  status: statusSchema.optional(),
  assigneeId: z.string().optional(),
  search: z.string().optional(),
  page: z.coerce.number().min(1).default(1).optional(),
  limit: z.coerce.number().min(1).max(100).default(50).optional()
})), asyncHandler(async (req: AuthRequest, res: Response) => {
  const db = await getDatabase();
  const { teamId, projectId, status, assigneeId, search, page = 1, limit = 50 } = req.query;
  const pageNum = Number(page);
  const limitNum = Number(limit);

  let issues: Awaited<ReturnType<typeof db.getAllIssues>>;

  // Filter by team first
  if (teamId && typeof teamId === 'string') {
    issues = await db.getIssuesByTeam(teamId);
  } else {
    issues = await db.getAllIssues();
  }

  // Further filter by project
  if (projectId && typeof projectId === 'string') {
    issues = issues.filter(i => i.project_id === projectId);
  }

  // Filter by status
  if (status && typeof status === 'string') {
    issues = issues.filter(i => i.status === status);
  }

  // Filter by assignee - use batch loading instead of N+1 queries
  if (assigneeId && typeof assigneeId === 'string') {
    // Get all issue IDs with this assignee in a single query
    const assigneeIssues = await db.all(`
      SELECT DISTINCT ia.issue_id
      FROM issue_assignees ia
      WHERE ia.user_id = ?
    `, [assigneeId]);

    const assigneeIssueIds = new Set(assigneeIssues.map((row: any) => row.issue_id));
    issues = issues.filter(i => assigneeIssueIds.has(i.id));
  }

  // Search in title, description, identifier
  if (search && typeof search === 'string') {
    const query = search.toLowerCase();
    issues = issues.filter(i =>
      i.title.toLowerCase().includes(query) ||
      (i.description && i.description.toLowerCase().includes(query)) ||
      i.identifier.toLowerCase().includes(query)
    );
  }

  // Apply pagination
  const total = issues.length;
  const startIndex = (pageNum - 1) * limitNum;
  const endIndex = startIndex + limitNum;
  const paginatedIssues = issues.slice(startIndex, endIndex);

  // Batch load assignees for paginated issues
  const issueIds = paginatedIssues.map(i => i.id);

  // Get all assignees in a single query
  const allAssignees = await db.all(`
    SELECT ia.issue_id, u.id, u.name, u.email, u.avatar_url, u.role, u.created_at, u.updated_at
    FROM issue_assignees ia
    JOIN users u ON ia.user_id = u.id
    WHERE ia.issue_id IN (${issueIds.map(() => '?').join(',')})
  `, issueIds);

  // Group assignees by issue ID
  const assigneesMap = new Map<string, any[]>();

  allAssignees.forEach((row: any) => {
    if (!assigneesMap.has(row.issue_id)) {
      assigneesMap.set(row.issue_id, []);
    }
    assigneesMap.get(row.issue_id)!.push({
      id: row.id,
      name: row.name,
      email: row.email,
      avatar_url: row.avatar_url,
      role: row.role,
      created_at: row.created_at,
      updated_at: row.updated_at
    });
  });

  // Combine data
  const issuesWithAssignees = paginatedIssues.map(issue => ({
    ...issue,
    assignees: assigneesMap.get(issue.id) || []
  }));

  res.json({
    issues: issuesWithAssignees,
    pagination: {
      page: pageNum,
      limit: limitNum,
      total,
      totalPages: Math.ceil(total / limitNum),
      hasNext: endIndex < total
    }
  });
}));

/**
 * GET /api/v1/issues/:id
 * Get issue by ID (authenticated, with caching)
 */
router.get('/:id', authenticate, readRateLimit, cacheMiddleware('issue', 300), validateParams(z.object({ id: z.string().min(1) })), asyncHandler(async (req: AuthRequest, res: Response) => {
  const db = await getDatabase();
  const { id } = req.params;
  const issue = await db.getIssueById(id!);

  if (!issue) {
    return res.status(404).json({ error: 'Issue not found' });
  }

  const assignees = (await db.getIssueAssignees(issue.id)).map(({ password_hash: _, ...u }) => u);

  res.json({
    issue: {
      ...issue,
      assignees
    }
  });
}));

/**
 * POST /api/v1/issues
 * Create a new issue (non-viewer, invalidates cache)
 */
router.post('/', authenticate, requireCanCreateContent, validateBody(createIssueSchema.partial()), asyncHandler(async (req: AuthRequest, res: Response) => {
  const db = await getDatabase();
  const { title, description, status, priority, assigneeIds, projectId, startDate, dueDate, parentId } = req.body;

  // Get project to generate identifier
  const project = await db.getProjectById(projectId);
  if (!project) {
    return res.status(404).json({ error: 'Project not found' });
  }

  // Get next issue number
  const existingIssues = await db.getIssuesByProject(projectId);
  const nextNumber = existingIssues.length + 101; // Start at LIN-101

  const newIssue = await db.createIssue({
    identifier: `${project.identifier}-${nextNumber}`,
    title: title || 'Untitled',
    description: description || null,
    status: status || 'Backlog',
    priority: priority || 'No Priority',
    project_id: projectId,
    parent_id: parentId || null,
    start_date: startDate || null,
    due_date: dueDate || null
  });

  // Set assignees
  if (assigneeIds && Array.isArray(assigneeIds) && assigneeIds.length > 0) {
    await db.setIssueAssignees(newIssue.id, assigneeIds);
  }

  // Log activity
  if (req.userId) {
    await db.createActivity({
      user_id: req.userId,
      type: 'issue_created',
      project_id: projectId,
      issue_id: newIssue.id,
      entity_title: newIssue.title,
      description: 'created the issue'
    });
  }

  // Invalidate cache
  invalidateCache('issues');

  const assignees = (await db.getIssueAssignees(newIssue.id)).map(({ password_hash: _, ...u }) => u);

  // Broadcast new issue via WebSocket
  const wsManager = (global as any).wsManager;
  if (wsManager) {
    broadcastNewIssue(wsManager, projectId, {
      ...newIssue,
      assignees
    }, req.userId);
  }

  res.status(201).json({
    issue: {
      ...newIssue,
      assignees
    }
  });
}));

/**
 * PATCH /api/v1/issues/:id
 * Update issue (non-viewer, team member, invalidates cache)
 */
router.patch('/:id', authenticate, requireCanCreateContent, requireIssueTeamMember('id'), validateParams(z.object({ id: z.string().min(1) })), validateBody(createIssueSchema.partial()), asyncHandler(async (req: AuthRequest, res: Response) => {
  const db = await getDatabase();
  const { id } = req.params;
  const { title, description, status, priority, assigneeIds, startDate, dueDate } = req.body;

  const issue = await db.getIssueById(id!);
  if (!issue) {
    return res.status(404).json({ error: 'Issue not found' });
  }

  // Log activity if description changed (before update)
  if (description !== undefined && description !== issue.description) {
    if (req.userId) {
      await db.createActivity({
        user_id: req.userId,
        type: 'issue_update',
        project_id: issue.project_id,
        issue_id: id!,
        entity_title: issue.title,
        description: 'updated the description'
      });
    }
  }

  await db.updateIssue(id!, {
    ...(title !== undefined && { title }),
    ...(description !== undefined && { description }),
    ...(status !== undefined && { status }),
    ...(priority !== undefined && { priority }),
    ...(startDate !== undefined && { start_date: startDate }),
    ...(dueDate !== undefined && { due_date: dueDate })
  });

  // Update assignees if provided
  if (assigneeIds !== undefined) {
    await db.setIssueAssignees(id!, assigneeIds);
  }

  // Invalidate cache
  invalidateCache('issues');
  invalidateCache(`issue:${id!}`);

  // Return updated issue by merging original with updates (avoids second DB call)
  const updatedIssue = {
    ...issue,
    ...(title !== undefined && { title }),
    ...(description !== undefined && { description }),
    ...(status !== undefined && { status }),
    ...(priority !== undefined && { priority }),
    ...(startDate !== undefined && { start_date: startDate }),
    ...(dueDate !== undefined && { due_date: dueDate }),
    updated_at: db.now()
  };

  // Get assignees
  const assignees = await db.getIssueAssignees(id!).then(assignees => assignees.map(({ password_hash: _, ...u }) => u));

  // Broadcast issue update via WebSocket
  const wsManager = (global as any).wsManager;
  if (wsManager) {
    broadcastIssueUpdate(wsManager, id!, {
      ...updatedIssue,
      assignees
    }, req.userId);
  }

  res.json({
    issue: {
      ...updatedIssue,
      assignees
    }
  });
}));

/**
 * POST /api/v1/issues/:id/status
 * Change issue status (non-viewer, team member, invalidates cache)
 */
router.post('/:id/status', authenticate, requireCanCreateContent, requireIssueTeamMember('id'), validateParams(z.object({ id: z.string().min(1) })), validateBody(z.object({ status: statusSchema })), asyncHandler(async (req: AuthRequest, res: Response) => {
  const db = await getDatabase();
  const { id } = req.params;
  const { status } = req.body;

  const issue = await db.getIssueById(id!);
  if (!issue) {
    return res.status(404).json({ error: 'Issue not found' });
  }

  // Log activity before update
  if (req.userId) {
    await db.createActivity({
      user_id: req.userId,
      type: 'status_change',
      project_id: issue.project_id,
      issue_id: id!,
      entity_title: issue.title,
      description: `changed status to ${status}`
    });
  }

  await db.updateIssue(id!, { status });

  // Invalidate cache
  invalidateCache('issues');
  invalidateCache(`issue:${id!}`);

  // Return updated issue by merging (avoids second DB call)
  const updatedIssue = {
    ...issue,
    status,
    updated_at: db.now()
  };

  // Broadcast status change via WebSocket
  const wsManager = (global as any).wsManager;
  if (wsManager) {
    broadcastIssueUpdate(wsManager, id!, { status: updatedIssue.status }, req.userId);
  }

  res.json({ issue: updatedIssue });
}));

/**
 * POST /api/v1/issues/:id/subtasks
 * Create a subtask (non-viewer, team member, invalidates cache)
 */
router.post('/:id/subtasks', authenticate, requireCanCreateContent, requireIssueTeamMember('id'), validateParams(z.object({ id: z.string().min(1) })), validateBody(createSubtaskSchema), asyncHandler(async (req: AuthRequest, res: Response) => {
  const db = await getDatabase();
  const { id: parentId } = req.params;
  const { title } = req.body;

  const parentIssue = await db.getIssueById(parentId!);
  if (!parentIssue) {
    return res.status(404).json({ error: 'Parent issue not found' });
  }

  // Prevent creating subtasks on subtasks (only parent issues can have subtasks)
  if (parentIssue.parent_id) {
    return res.status(400).json({ error: 'Cannot create subtasks on a subtask. Only parent issues can have subtasks.' });
  }

  const project = await db.getProjectById(parentIssue.project_id);
  if (!project) {
    return res.status(404).json({ error: 'Project not found' });
  }

  // Get next issue number
  const existingIssues = await db.getIssuesByProject(project.id);
  const nextNumber = existingIssues.length + 101;

  const newIssue = await db.createIssue({
    identifier: `${project.identifier}-${nextNumber}`,
    title,
    description: null,
    status: 'Todo',
    priority: 'No Priority',
    project_id: parentIssue.project_id,
    parent_id: parentId!,
    start_date: null,
    due_date: null
  });

  // Invalidate cache
  invalidateCache('issues');

  res.status(201).json({ issue: newIssue });
}));

/**
 * DELETE /api/v1/issues/:id
 * Delete issue (admin only, invalidates cache)
 */
router.delete('/:id', authenticate, requireAdmin, validateParams(z.object({ id: z.string().min(1) })), asyncHandler(async (req: AuthRequest, res: Response) => {
  const db = await getDatabase();
  const { id } = req.params;

  const issue = await db.getIssueById(id!);
  if (!issue) {
    return res.status(404).json({ error: 'Issue not found' });
  }

  await db.deleteIssue(id!);

  // Invalidate cache
  invalidateCache('issues');
  invalidateCache(`issue:${id}`);

  // Broadcast issue deletion via WebSocket
  const wsManager = (global as any).wsManager;
  if (wsManager) {
    wsManager.broadcastToRoom(`issue:${id}`, {
      type: 'issue_deleted',
      data: { issueId: id, projectId: issue.project_id }
    });
  }

  res.json({ message: 'Issue deleted successfully' });
}));

/**
 * GET /api/v1/issues/:issueId/comments
 * Get comments for an issue (authenticated)
 */
router.get('/:issueId/comments', authenticate, apiRateLimit, asyncHandler(async (req: AuthRequest, res: Response) => {
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
}));

/**
 * POST /api/v1/comments
 * Create a comment (authenticated)
 */
router.post('/comments', authenticate, validateBody(z.object({ content: z.string().min(1), issueId: z.string() })), asyncHandler(async (req: AuthRequest, res: Response) => {
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
}));

export default router;
