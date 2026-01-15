import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../auth/jwt.js';
import { getDatabase } from '../database.js';

export interface AuthRequest extends Request {
  userId?: string;
  userRole?: string;
  userEmail?: string;
}

/**
 * Authentication middleware - verifies JWT token
 */
export function authenticate(req: AuthRequest, res: Response, next: NextFunction): void | Response {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: No token provided' });
  }

  const token = authHeader.substring(7);
  const payload = verifyToken(token);

  if (!payload) {
    return res.status(401).json({ error: 'Unauthorized: Invalid or expired token' });
  }

  req.userId = payload.userId;
  req.userRole = payload.role;
  req.userEmail = payload.email;
  next();
  return;
}

/**
 * Check if user is a member of a team
 * Admins bypass this check
 */
async function isTeamMember(userId: string, teamId: string): Promise<boolean> {
  const db = await getDatabase();
  const team = await db.getTeamById(teamId);

  if (!team) {
    return false;
  }

  // Get user to check role
  const user = await db.getUserById(userId);
  if (!user) {
    return false;
  }

  // Admins have access to all teams
  if (user.role === 'Admin') {
    return true;
  }

  // Check if user is a team member
  const members = await db.getTeamMembers(teamId);
  return members.some(m => m.id === userId);
}

/**
 * Authorization middleware - require team membership
 * Admins bypass this check
 */
export function requireTeamMember(teamIdParam: string = 'teamId') {
  return async (req: AuthRequest, res: Response, next: NextFunction): Promise<void | Response> => {
    if (!req.userId) {
      return res.status(401).json({ error: 'Unauthorized: No user ID found' });
    }

    const teamId = req.params[teamIdParam] || req.body[teamIdParam] || req.query[teamIdParam];

    if (!teamId || typeof teamId !== 'string') {
      return res.status(400).json({ error: 'Bad Request: Team ID required' });
    }

    const isMember = await isTeamMember(req.userId, teamId);

    if (!isMember) {
      return res.status(403).json({
        error: 'Forbidden: You must be a member of this team to perform this action'
      });
    }

    next();
    return;
  };
}

/**
 * Authorization middleware - require team membership for project operations
 * Checks if user is member of the team that owns the project
 */
export function requireProjectTeamMember(projectIdParam: string = 'id') {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.userId) {
      return res.status(401).json({ error: 'Unauthorized: No user ID found' });
    }

    const projectId = req.params[projectIdParam] || req.body[projectIdParam];

    if (!projectId || typeof projectId !== 'string') {
      return res.status(400).json({ error: 'Bad Request: Project ID required' });
    }

    const db = await getDatabase();
    const project = await db.getProjectById(projectId);

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    // Check if user is member of the project's team
    const isMember = await isTeamMember(req.userId, project.team_id);

    if (!isMember) {
      return res.status(403).json({
        error: 'Forbidden: You must be a member of this project\'s team to perform this action'
      });
    }

    next();
    return;
  };
}

/**
 * Authorization middleware - require team membership for issue operations
 * Checks if user is member of the team that owns the issue's project
 */
export function requireIssueTeamMember(issueIdParam: string = 'id') {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.userId) {
      return res.status(401).json({ error: 'Unauthorized: No user ID found' });
    }

    const issueId = req.params[issueIdParam];

    if (!issueId || typeof issueId !== 'string') {
      return res.status(400).json({ error: 'Bad Request: Issue ID required' });
    }

    const db = await getDatabase();
    const issue = await db.getIssueById(issueId);

    if (!issue) {
      return res.status(404).json({ error: 'Issue not found' });
    }

    const project = await db.getProjectById(issue.project_id);
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    // Check if user is member of the project's team
    const isMember = await isTeamMember(req.userId, project.team_id);

    if (!isMember) {
      return res.status(403).json({
        error: 'Forbidden: You must be a member of this issue\'s team to perform this action'
      });
    }

    next();
    return;
  };
}

/**
 * Authorization middleware - requires specific roles
 */
export function requireRole(...allowedRoles: string[]) {
  return (req: AuthRequest, res: Response, next: NextFunction): void | Response => {
    if (!req.userRole) {
      return res.status(401).json({ error: 'Unauthorized: No role found' });
    }

    if (!allowedRoles.includes(req.userRole)) {
      return res.status(403).json({ error: 'Forbidden: Insufficient permissions' });
    }

    next();
    return;
  };
}

/**
 * Authorization helper - can create content (not Viewer)
 */
export function requireCanCreateContent(req: AuthRequest, res: Response, next: NextFunction): void | Response {
  if (req.userRole === 'Viewer') {
    return res.status(403).json({ error: 'Forbidden: Viewers cannot create content' });
  }
  next();
  return;
}

/**
 * Authorization helper - admin only
 */
export function requireAdmin(req: AuthRequest, res: Response, next: NextFunction): void | Response {
  if (req.userRole !== 'Admin') {
    return res.status(403).json({ error: 'Forbidden: Admin access required' });
  }
  next();
  return;
}

/**
 * Authorization helper - admin or team lead
 */
export function requireAdminOrTeamLead(req: AuthRequest, res: Response, next: NextFunction): void | Response {
  if (req.userRole !== 'Admin' && req.userRole !== 'Team Lead') {
    return res.status(403).json({ error: 'Forbidden: Admin or Team Lead access required' });
  }
  next();
  return;
}
