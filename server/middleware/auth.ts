/**
 * Authentication and Authorization Middleware (Express/Fastify Compatible)
 *
 * Provides JWT authentication and role-based authorization.
 * Compatible with both Fastify and Express (via @fastify/express).
 */

import { Request as ExpressRequest } from 'express';
import { verifyToken } from '../auth/jwt.js';
import { getDatabase } from '../database.js';
import { UserRole } from '@prisma/client';

// Unified AuthRequest type for Express/Fastify compatibility
export interface AuthRequest extends ExpressRequest {
  userId?: string;
  userRole?: UserRole;
  userEmail?: string;

  // Fastify compatibility
  code?: number;
  raw?: any;
}

/**
 * Authentication middleware - verifies JWT token
 * Compatible with both Fastify and Express
 */
export async function authenticate(req: AuthRequest, res: any, next?: any): Promise<void | any> {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    if (res.code) {
      // Fastify response
      return res.code(401).send({ error: 'Unauthorized: No token provided' });
    }
    // Express response
    return res.status(401).json({ error: 'Unauthorized: No token provided' });
  }

  const token = authHeader.substring(7);
  const payload = verifyToken(token);

  if (!payload) {
    if (res.code) {
      return res.code(401).send({ error: 'Unauthorized: Invalid or expired token' });
    }
    return res.status(401).json({ error: 'Unauthorized: Invalid or expired token' });
  }

  req.userId = payload.userId;
  req.userRole = payload.role as UserRole;
  req.userEmail = payload.email;

  if (next) return next();
}

/**
 * Check if user is a member of a team
 * Stealth teams require explicit membership (even for admins)
 */
async function isTeamMember(userId: string, teamId: string): Promise<boolean> {
  const db = await getDatabase();
  const prisma = db.getPrisma();
  const team = await prisma.team.findUnique({
    where: { id: teamId },
    select: { isStealth: true }
  });

  if (!team) {
    return false;
  }

  // Stealth teams require explicit membership (even for admins)
  if (team.isStealth) {
    return prisma.teamMember.findUnique({
      where: {
        teamId_userId: { teamId, userId }
      }
    }).then(m => !!m);
  }

  // Non-stealth teams: admins have access to all
  const user = await db.getUserById(userId);
  if (!user) {
    return false;
  }

  if (user.role === 'Administrator') {
    return true;
  }

  // Regular users must be members
  return prisma.teamMember.findUnique({
    where: {
      teamId_userId: { teamId, userId }
    }
  }).then(m => !!m);
}

/**
 * Authorization middleware - require team membership
 * Admins bypass this check
 */
export function requireTeamMember(teamIdParam: string = 'teamId') {
  return async (req: AuthRequest, res: any, next?: any): Promise<void | any> => {
    if (!req.userId) {
      if (res.code) {
        return res.code(401).send({ error: 'Unauthorized: No user ID found' });
      }
      return res.status(401).json({ error: 'Unauthorized: No user ID found' });
    }

    const teamId = (req.params as any)[teamIdParam] || (req.body as any)[teamIdParam] || (req.query as any)[teamIdParam];

    if (!teamId || typeof teamId !== 'string') {
      if (res.code) {
        return res.code(400).send({ error: 'Bad Request: Team ID required' });
      }
      return res.status(400).json({ error: 'Bad Request: Team ID required' });
    }

    const isMember = await isTeamMember(req.userId, teamId);

    if (!isMember) {
      if (res.code) {
        return res.code(403).send({
          error: 'Forbidden: You must be a member of this team to perform this action'
        });
      }
      return res.status(403).json({
        error: 'Forbidden: You must be a member of this team to perform this action'
      });
    }

    if (next) return next();
  };
}

/**
 * Authorization middleware - require team membership for project operations
 * Checks if user is member of the team that owns the project
 */
export function requireProjectTeamMember(projectIdParam: string = 'id') {
  return async (req: AuthRequest, res: any, next?: any): Promise<void | any> => {
    if (!req.userId) {
      if (res.code) {
        return res.code(401).send({ error: 'Unauthorized: No user ID found' });
      }
      return res.status(401).json({ error: 'Unauthorized: No user ID found' });
    }

    const projectId = (req.params as any)[projectIdParam] || (req.body as any)[projectIdParam];

    if (!projectId || typeof projectId !== 'string') {
      if (res.code) {
        return res.code(400).send({ error: 'Bad Request: Project ID required' });
      }
      return res.status(400).json({ error: 'Bad Request: Project ID required' });
    }

    const db = await getDatabase();
    const project = await db.getProjectById(projectId);

    if (!project) {
      if (res.code) {
        return res.code(404).send({ error: 'Project not found' });
      }
      return res.status(404).json({ error: 'Project not found' });
    }

    // Check if user is member of the project's team
    const isMember = await isTeamMember(req.userId, project.team_id);

    if (!isMember) {
      if (res.code) {
        return res.code(403).send({
          error: 'Forbidden: You must be a member of this project\'s team to perform this action'
        });
      }
      return res.status(403).json({
        error: 'Forbidden: You must be a member of this project\'s team to perform this action'
      });
    }

    if (next) return next();
  };
}

/**
 * Authorization middleware - require team membership for issue operations
 * Checks if user is member of the team that owns the issue's project
 */
export function requireIssueTeamMember(issueIdParam: string = 'id') {
  return async (req: AuthRequest, res: any, next?: any): Promise<void | any> => {
    if (!req.userId) {
      if (res.code) {
        return res.code(401).send({ error: 'Unauthorized: No user ID found' });
      }
      return res.status(401).json({ error: 'Unauthorized: No user ID found' });
    }

    const issueId = (req.params as any)[issueIdParam];

    if (!issueId || typeof issueId !== 'string') {
      if (res.code) {
        return res.code(400).send({ error: 'Bad Request: Issue ID required' });
      }
      return res.status(400).json({ error: 'Bad Request: Issue ID required' });
    }

    const db = await getDatabase();
    const issue = await db.getIssueById(issueId);

    if (!issue) {
      if (res.code) {
        return res.code(404).send({ error: 'Issue not found' });
      }
      return res.status(404).json({ error: 'Issue not found' });
    }

    const project = await db.getProjectById(issue.project_id);
    if (!project) {
      if (res.code) {
        return res.code(404).send({ error: 'Project not found' });
      }
      return res.status(404).json({ error: 'Project not found' });
    }

    // Check if user is member of the project's team
    const isMember = await isTeamMember(req.userId, project.team_id);

    if (!isMember) {
      if (res.code) {
        return res.code(403).send({
          error: 'Forbidden: You must be a member of this issue\'s team to perform this action'
        });
      }
      return res.status(403).json({
        error: 'Forbidden: You must be a member of this issue\'s team to perform this action'
      });
    }

    if (next) return next();
  };
}

/**
 * Authorization middleware - requires specific roles
 */
export function requireRole(...allowedRoles: string[]) {
  return (req: AuthRequest, res: any, next?: any): any => {
    if (!req.userRole) {
      if (res.code) {
        return res.code(401).send({ error: 'Unauthorized: No role found' });
      }
      return res.status(401).json({ error: 'Unauthorized: No role found' });
    }

    if (!allowedRoles.includes(req.userRole)) {
      if (res.code) {
        return res.code(403).send({ error: 'Forbidden: Insufficient permissions' });
      }
      return res.status(403).json({ error: 'Forbidden: Insufficient permissions' });
    }

    if (next) return next();
  };
}

/**
 * Authorization helper - can create content (not Guest)
 */
export function requireCanCreateContent(req: AuthRequest, res: any, next?: any): any {
  if (req.userRole === 'Guest') {
    if (res.code) {
      return res.code(403).send({ error: 'Forbidden: Guests cannot create content' });
    }
    return res.status(403).json({ error: 'Forbidden: Guests cannot create content' });
  }
  if (next) return next();
}

/**
 * Authorization helper - administrator only
 */
export function requireAdmin(req: AuthRequest, res: any, next?: any): any {
  if (req.userRole !== 'Administrator') {
    if (res.code) {
      return res.code(403).send({ error: 'Forbidden: Administrator access required' });
    }
    return res.status(403).json({ error: 'Forbidden: Administrator access required' });
  }
  if (next) return next();
}

/**
 * Authorization helper - administrator or team lead
 */
export function requireAdminOrTeamLead(req: AuthRequest, res: any, next?: any): any {
  if (req.userRole !== 'Administrator' && req.userRole !== 'TeamLead') {
    if (res.code) {
      return res.code(403).send({ error: 'Forbidden: Administrator or Team Lead access required' });
    }
    return res.status(403).json({ error: 'Forbidden: Administrator or Team Lead access required' });
  }
  if (next) return next();
}
