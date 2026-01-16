import { Router, Response } from 'express';
import { getDatabase } from '../database.js';
import { createProjectSchema, updateProjectSchema } from '../validation/schemas.js';
import { validateBody } from '../middleware/validation.js';
import { authenticate, requireAdminOrTeamLead } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/error.js';
import { cacheMiddleware, invalidateCache } from '../middleware/cache.js';
import { AuthRequest } from '../middleware/auth.js';
import { z } from 'zod';
import { validateParams } from '../middleware/validation.js';

const router = Router();

// Public route for fetching projects by slug (no authentication required)
router.get('/public/:slug', asyncHandler(async (req: AuthRequest, res: Response) => {
  const db = await getDatabase();
  const slug = req.params.slug;

  if (!slug) {
    return res.status(400).json({ error: 'Slug is required' });
  }

  const project = await db.getProjectBySlug(slug);
  if (!project) {
    return res.status(404).json({ error: 'Project not found' });
  }

  // Get full team members objects
  const teamMembers = await db.getTeamMembers(project.team_id);

  // Get project issues
  const issues = await db.getIssuesByProject(project.id);
  const issueIds = issues.map(i => i.id);

  // Get all assignees for these issues in one query
  let issuesWithAssignees = issues.map(i => ({ ...i, assigneeIds: [] as string[] }));

  if (issueIds.length > 0) {
    const allAssignees = await db.all(`
      SELECT ia.issue_id, ia.user_id
      FROM issue_assignees ia
      WHERE ia.issue_id IN (${issueIds.map(() => '?').join(',')})
    `, issueIds);

    // Map assignees to issues
    const assigneeMap = new Map<string, string[]>();
    allAssignees.forEach((row: any) => {
      if (!assigneeMap.has(row.issue_id)) {
        assigneeMap.set(row.issue_id, []);
      }
      assigneeMap.get(row.issue_id)!.push(row.user_id);
    });

    issuesWithAssignees = issues.map(i => ({
      ...i,
      assigneeIds: assigneeMap.get(i.id) || []
    }));
  }

  // Get all unique user IDs from comments on these issues
  let commentAuthorIds: string[] = [];
  if (issueIds.length > 0) {
    const commentAuthors = await db.all(`
      SELECT DISTINCT user_id
      FROM comments
      WHERE issue_id IN (${issueIds.map(() => '?').join(',')})
    `, issueIds);
    commentAuthorIds = commentAuthors.map((row: any) => row.user_id);
  }

  // Combine team members and comment authors, removing duplicates
  const allUserIds = new Set([
    ...teamMembers.map(m => m.id),
    ...commentAuthorIds
  ]);

  // Fetch all users
  const allUsers = await Promise.all(
    Array.from(allUserIds).map(userId => db.getUserById(userId))
  );
  const validUsers = allUsers.filter(Boolean);

  res.json({
    project: {
      ...project,
      members: teamMembers.map(m => m.id)
    },
    issues: issuesWithAssignees,
    users: validUsers.map(({ id, name, email, avatar_url, role, created_at, updated_at }) => ({
      id,
      name,
      email,
      avatarUrl: avatar_url,
      role,
      createdAt: created_at,
      updatedAt: updated_at
    }))
  });
  return;
}));

/**
 * GET /api/v1/projects
 * Get all projects (with caching) - requires authentication
 */
router.get('/', authenticate, cacheMiddleware('projects', 300), asyncHandler(async (req: AuthRequest, res: Response) => {
  const db = await getDatabase();
  const teamId = req.query.teamId as string;

  let projects;
  if (teamId) {
    projects = await db.getProjectsByTeam(teamId);
  } else {
    projects = await db.getAllProjects();
  }

  // Add members to each project
  const projectsWithMembers = await Promise.all(
    projects.map(async (project) => {
      const teamMembers = await db.getTeamMembers(project.team_id);
      return {
        ...project,
        members: teamMembers.map(m => m.id)
      };
    })
  );

  res.json({ projects: projectsWithMembers });
  return;
}));

/**
 * GET /api/v1/projects/:id
 * Get project by ID (with caching) - requires authentication
 */
router.get('/:id', authenticate, cacheMiddleware('project', 300), asyncHandler(async (req: AuthRequest, res: Response) => {
  const db = await getDatabase();
  const projectId = req.params.id;

  if (!projectId) {
    return res.status(400).json({ error: 'Project ID is required' });
  }

  const project = await db.getProjectById(projectId);

  if (!project) {
    return res.status(404).json({ error: 'Project not found' });
  }

  // Get team members
  const teamMembers = await db.getTeamMembers(project.team_id);

  // Get project links
  const links = await db.getProjectLinks(projectId);

  res.json({
    project: {
      ...project,
      members: teamMembers.map(m => m.id)
    },
    links
  });
  return;
}));

/**
 * GET /api/v1/projects/:id/with-links
 * Get project with all links included (for frontend convenience)
 */
router.get('/:id/with-links', authenticate, asyncHandler(async (req: AuthRequest, res: Response) => {
  const db = await getDatabase();
  const projectId = req.params.id;

  if (!projectId) {
    return res.status(400).json({ error: 'Project ID is required' });
  }

  const project = await db.getProjectById(projectId);

  if (!project) {
    return res.status(404).json({ error: 'Project not found' });
  }

  // Get team members
  const teamMembers = await db.getTeamMembers(project.team_id);

  // Get project links
  const links = await db.getProjectLinks(projectId);

  res.json({
    project: {
      ...project,
      members: teamMembers.map(m => m.id),
      links: links.map(l => ({
        id: l.id,
        title: l.title,
        url: l.url
      }))
    }
  });
  return;
}));

/**
 * POST /api/v1/projects
 * Create new project (invalidates cache) - requires authentication
 */
router.post('/', authenticate, validateBody(createProjectSchema), asyncHandler(async (req: AuthRequest, res: Response) => {
  const db = await getDatabase();
  const { name, identifier, icon, teamId, description, isPublic, publicSlug, startDate, targetDate } = req.body;

  if (!teamId) {
    return res.status(400).json({ error: 'Team ID is required' });
  }

  const project = await db.createProject({
    name,
    identifier,
    icon: icon || '📁',
    team_id: teamId,
    description,
    is_public: isPublic || false,
    public_slug: publicSlug || null,
    lead_id: null,
    start_date: startDate || null,
    target_date: targetDate || null
  });

  // Invalidate cache
  invalidateCache('projects');

  res.status(201).json({ project });
  return;
}));

/**
 * PATCH /api/v1/projects/:id
 * Update project (invalidates cache) - requires authentication
 */
router.patch('/:id', authenticate, validateBody(updateProjectSchema), asyncHandler(async (req: AuthRequest, res: Response) => {
  const db = await getDatabase();
  const { id } = req.params;
  const updates = req.body;

  // DIAGNOSTIC: Log what we're receiving
  console.log('[PATCH /projects/:id] Received update for project:', id);
  console.log('[PATCH /projects/:id] Request body:', JSON.stringify(updates));

  if (!id) {
    return res.status(400).json({ error: 'Project ID is required' });
  }

  await db.updateProject(id, updates);

  // Invalidate cache
  invalidateCache('projects');
  invalidateCache(`project:${id}`);

  const project = await db.getProjectById(id);
  res.json({ project });
  return;
}));

/**
 * DELETE /api/v1/projects/:id
 * Delete project (invalidates cache) - requires Administrator or Team Lead
 */
router.delete('/:id', authenticate, requireAdminOrTeamLead, validateParams(z.object({ id: z.string().min(1) })), asyncHandler(async (req: AuthRequest, res: Response) => {
  const db = await getDatabase();
  const projectId = req.params.id;

  if (!projectId) {
    return res.status(400).json({ error: 'Project ID is required' });
  }

  await db.deleteProject(projectId);

  // Invalidate cache
  invalidateCache('projects');
  invalidateCache(`project:${projectId}`);

  res.json({ message: 'Project deleted' });
  return;
}));

/**
 * GET /api/v1/projects/:id/links
 * Get all links for a project
 */
router.get('/:id/links', authenticate, asyncHandler(async (req: AuthRequest, res: Response) => {
  const db = await getDatabase();
  const projectId = req.params.id;

  if (!projectId) {
    return res.status(400).json({ error: 'Project ID is required' });
  }

  const links = await db.getProjectLinks(projectId);
  res.json({ links });
  return;
}));

/**
 * POST /api/v1/projects/:id/links
 * Add a new link to a project
 */
router.post('/:id/links', authenticate, asyncHandler(async (req: AuthRequest, res: Response) => {
  const db = await getDatabase();
  const projectId = req.params.id;
  const { title, url } = req.body;

  if (!projectId) {
    return res.status(400).json({ error: 'Project ID is required' });
  }

  if (!title || !url) {
    return res.status(400).json({ error: 'Title and URL are required' });
  }

  const link = await db.createProjectLink({
    project_id: projectId,
    title,
    url
  });

  // Invalidate cache
  invalidateCache(`project:${projectId}`);

  res.status(201).json({ link });
  return;
}));

/**
 * PATCH /api/v1/projects/:id/links/:linkId
 * Update a project link
 */
router.patch('/:id/links/:linkId', authenticate, asyncHandler(async (req: AuthRequest, res: Response) => {
  const db = await getDatabase();
  const { id: projectId, linkId } = req.params;
  const { title, url } = req.body;

  if (!projectId || !linkId) {
    return res.status(400).json({ error: 'Project ID and Link ID are required' });
  }

  const updates: any = {};
  if (title !== undefined) updates.title = title;
  if (url !== undefined) updates.url = url;

  await db.updateProjectLink(linkId, updates);

  // Invalidate cache
  invalidateCache(`project:${projectId}`);

  const links = await db.getProjectLinks(projectId);
  res.json({ links });
  return;
}));

/**
 * DELETE /api/v1/projects/:id/links/:linkId
 * Delete a project link
 */
router.delete('/:id/links/:linkId', authenticate, asyncHandler(async (req: AuthRequest, res: Response) => {
  const db = await getDatabase();
  const { id: projectId, linkId } = req.params;

  if (!projectId || !linkId) {
    return res.status(400).json({ error: 'Project ID and Link ID are required' });
  }

  await db.deleteProjectLink(linkId);

  // Invalidate cache
  invalidateCache(`project:${projectId}`);

  res.json({ message: 'Link deleted' });
  return;
}));

export default router;
