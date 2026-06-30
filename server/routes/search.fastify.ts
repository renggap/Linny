import { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { authenticate } from '../middleware/authHooks.js';
import { workspaceScopeSchema } from '@linny/contracts';

const searchRoutes: FastifyPluginAsyncZod = async (fastify) => {
  const prisma = fastify.prisma;

  // Search schema - requires teamId for scoped search (userId comes from JWT)
  const searchSchema = workspaceScopeSchema.pick({ teamId: true }).and(
    z.object({
      q: z.string().min(2),
      type: z.enum(['all', 'issues', 'projects', 'users']).default('all'),
      page: z.coerce.number().min(1).default(1),
      limit: z.coerce.number().min(1).max(100).default(20)
    })
  );

  fastify.get('/', {
    onRequest: [authenticate],
    schema: {
      querystring: searchSchema
    }
  }, async (request: any) => {
    const { q, type, page, limit, teamId } = request.query;
    const query = q.toLowerCase();
    const offset = (page - 1) * limit;

    const results: any = {
      issues: [],
      projects: [],
      users: []
    };

    if (type === 'all' || type === 'issues') {
      results.issues = await prisma.issue.findMany({
        where: {
          project: { teamId }, // Scope to team
          OR: [
            { title: { contains: query, mode: 'insensitive' } },
            { description: { contains: query, mode: 'insensitive' } },
            { identifier: { contains: query, mode: 'insensitive' } }
          ]
        },
        include: {
          project: { select: { name: true, identifier: true } },
          assignees: { include: { user: { select: { id: true, name: true, email: true, avatarUrl: true } } } }
        },
        orderBy: { updatedAt: 'desc' },
        take: limit,
        skip: offset
      }).then((issues: any[]) => issues.map((i: any) => ({
        ...i,
        project_name: i.project.name,
        project_identifier: i.project.identifier,
        assignees: i.assignees.map((a: any) => a.user)
      })));
    }

    if (type === 'all' || type === 'projects') {
      results.projects = await prisma.project.findMany({
        where: {
          teamId, // Scope to team
          OR: [
            { name: { contains: query, mode: 'insensitive' } },
            { identifier: { contains: query, mode: 'insensitive' } },
            { description: { contains: query, mode: 'insensitive' } }
          ]
        },
        include: { team: { select: { name: true } } },
        orderBy: { updatedAt: 'desc' },
        take: limit,
        skip: offset
      }).then((projects: any[]) => projects.map((p: any) => ({
        ...p,
        team_name: p.team.name
      })));
    }

    if (type === 'all' || type === 'users') {
      // Users are workspace-wide, but only show users from the current team
      results.users = await prisma.user.findMany({
        where: {
          teamMemberships: {
            some: { teamId } // Only users in this team
          },
          OR: [
            { name: { contains: query, mode: 'insensitive' } },
            { email: { contains: query, mode: 'insensitive' } }
          ]
        },
        select: { id: true, name: true, email: true, avatarUrl: true, role: true },
        orderBy: { name: 'asc' },
        take: limit,
        skip: offset
      });
    }

    return { query, type, page, limit, results };
  });

  fastify.get('/issues', {
    onRequest: [authenticate],
    schema: {
      querystring: z.object({
        q: z.string().min(2),
        projectId: z.string().optional(),
        status: z.string().optional(),
        priority: z.string().optional(),
        assigneeId: z.string().optional(),
        page: z.coerce.number().min(1).default(1),
        limit: z.coerce.number().min(1).max(100).default(20)
      })
    }
  }, async (request: any) => {
    const { q, projectId, status, priority, assigneeId, page, limit } = request.query;
    const query = q.toLowerCase();
    const offset = (page - 1) * limit;

    const where: any = {
      OR: [
        { title: { contains: query, mode: 'insensitive' } },
        { description: { contains: query, mode: 'insensitive' } },
        { identifier: { contains: query, mode: 'insensitive' } }
      ]
    };

    if (projectId) where.projectId = projectId;
    if (status) where.status = status as any;
    if (priority) where.priority = priority as any;
    if (assigneeId) where.assignees = { some: { userId: assigneeId } };

    const [issues, total] = await Promise.all([
      prisma.issue.findMany({
        where,
        include: {
          project: { select: { name: true, identifier: true } },
          assignees: { include: { user: { select: { id: true, name: true, email: true, avatarUrl: true } } } }
        },
        orderBy: { updatedAt: 'desc' },
        take: limit,
        skip: offset
      }),
      prisma.issue.count({ where })
    ]);

    return {
      query,
      issues: issues.map((i: any) => ({
        ...i,
        assignees: i.assignees.map((a: any) => a.user)
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  });
};

export default searchRoutes;
