import { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { createIssueSchema, statusSchema } from '../validation/schemas.js';
import { invalidateCache } from '../middleware/cache.js';
import { broadcastIssueUpdate, broadcastNewIssue } from '../websocket/fastifyWebSocketRoutes.js';
import { authenticate, requireIssueTeamMember, requireAdmin } from '../middleware/authHooks.js';
import { getDatabase } from '../database.js';

const issuesRoutes: FastifyPluginAsyncZod = async (fastify) => {
  const db = await getDatabase();
  const prisma = db.getPrisma();

  fastify.get('/', {
    onRequest: [authenticate]
  }, async (request: any, reply: any) => {
    const { teamId, projectId, status, assigneeId, search, page = 1, limit = 50 } = request.query;

    // Manual validation for required scope
    if (!teamId || typeof teamId !== 'string' || teamId.trim().length === 0) {
      return reply.code(400).send({
        error: 'Scope validation failed',
        details: [{ field: 'teamId', message: 'Team ID is required' }]
      });
    }

    const skip = (page - 1) * limit;

    const where: any = {};
    if (teamId) where.project = { teamId };
    if (projectId) {
      // Only include projectId filter if it matches the teamId to prevent cross-team data leakage
      // If projectId doesn't belong to the requested team, ignore it to return correct results
      const projectBelongsToTeam = await prisma.project.findFirst({
        where: { id: projectId, teamId }
      });
      if (projectBelongsToTeam) {
        where.projectId = projectId;
      }
    }
    if (status) where.status = status;
    if (assigneeId) where.assignees = { some: { userId: assigneeId } };
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { identifier: { contains: search, mode: 'insensitive' } }
      ];
    }

    const [paginatedIssues, total] = await Promise.all([
      prisma.issue.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          assignees: {
            include: { user: true }
          }
        }
      }),
      prisma.issue.count({ where })
    ]);

    return {
      issues: paginatedIssues.map((issue: any) => ({
        ...issue,
        assignees: issue.assignees.map((ia: any) => {
          const { passwordHash: _, ...u } = ia.user;
          return u;
        })
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: skip + limit < total
      }
    };
  });

  fastify.get('/:id', {
    onRequest: [authenticate],
    schema: {
      params: z.object({ id: z.string() })
    }
  }, async (request: any, reply: any) => {
    const { id } = request.params;
    const issue = await prisma.issue.findUnique({
      where: { id },
      include: {
        assignees: {
          include: { user: true }
        }
      }
    });

    if (!issue) {
      return reply.code(404).send({ error: 'Issue not found' });
    }

    return {
      issue: {
        ...issue,
        assignees: issue.assignees.map((ia: any) => {
          const { passwordHash: _, ...u } = ia.user;
          return u;
        })
      }
    };
  });

  fastify.post('/', {
    onRequest: [authenticate],
    schema: {
      body: createIssueSchema.partial()
    }
  }, async (request: any, reply: any) => {
    const { title, description, status, priority, assigneeIds, projectId, startDate, dueDate, parentId } = request.body;
    const userId = request.userId;

    if (!projectId) return reply.code(400).send({ error: 'Project ID is required' });

    const newIssue = await prisma.$transaction(async (tx: any) => {
      const project = await tx.project.findUnique({ where: { id: projectId } });
      if (!project) return null;

      // Fetch recent issues and sort by numeric portion to avoid alphabetical sorting issues
      // (e.g., "TEAM-9" vs "TEAM-10" - alphabetical would put TEAM-9 last)
      const recentIssues = await tx.issue.findMany({
        where: { projectId },
        take: 100, // Reasonable limit for most projects
        select: { identifier: true }
      });

      // Extract numeric portion and find the highest number
      const highestNumber = recentIssues.reduce((max: number, issue: any) => {
        const num = parseInt(issue.identifier.split('-')[1]);
        return isNaN(num) ? max : Math.max(max, num);
      }, 0);

      const nextNumber = highestNumber > 0 ? highestNumber + 1 : 101;

      return tx.issue.create({
        data: {
          identifier: `${project.identifier}-${nextNumber}`,
          title: title || 'Untitled',
          description: description || null,
          status: (status as any) || 'Backlog',
          priority: (priority as any) || 'NoPriority',
          projectId,
          parentId: parentId || null,
          startDate: startDate ? new Date(startDate) : null,
          dueDate: dueDate ? new Date(dueDate) : null,
          assignees: assigneeIds ? {
            create: assigneeIds.map((uid: string) => ({ userId: uid }))
          } : undefined,
          activities: {
            create: {
              userId,
              type: 'issue_created',
              projectId,
              entityTitle: title || 'Untitled',
              description: 'created the issue'
            }
          }
        },
        include: {
          assignees: { include: { user: true } },
          activities: { include: { user: true }, take: 1 }
        }
      });
    });

    if (!newIssue) return reply.code(404).send({ error: 'Project not found' });

    await invalidateCache('issues');

    const sanitizedIssue = {
      ...newIssue,
      assignees: (newIssue as any).assignees.map((ia: any) => {
        const { passwordHash: _, ...u } = ia.user;
        return u;
      })
    };

    broadcastNewIssue(projectId, sanitizedIssue, userId);

    reply.code(201);
    return {
      issue: sanitizedIssue,
      activity: (newIssue as any).activities[0]
    };
  });

  fastify.patch('/:id', {
    onRequest: [requireIssueTeamMember],
    schema: {
      params: z.object({ id: z.string() }),
      body: createIssueSchema.partial()
    }
  }, async (request: any, reply: any) => {
    const { id } = request.params;
    const updates = request.body;
    const userId = request.userId;

    const issue = await prisma.issue.findUnique({ where: { id } });
    if (!issue) return reply.code(404).send({ error: 'Issue not found' });

    if (updates.description !== undefined && updates.description !== issue.description) {
      await prisma.activity.create({
        data: {
          userId,
          type: 'issue_update',
          projectId: issue.projectId,
          issueId: id,
          entityTitle: issue.title,
          description: 'updated the description'
        }
      });
    }

    const updatedIssue = await prisma.issue.update({
      where: { id },
      data: {
        title: updates.title,
        description: updates.description,
        status: updates.status as any,
        priority: updates.priority as any,
        startDate: updates.startDate ? new Date(updates.startDate) : undefined,
        dueDate: updates.dueDate ? new Date(updates.dueDate) : undefined,
        updatedAt: new Date(),
        assignees: updates.assigneeIds ? {
          deleteMany: {},
          create: updates.assigneeIds.map((uid: string) => ({ userId: uid }))
        } : undefined
      },
      include: {
        assignees: { include: { user: true } }
      }
    });

    await invalidateCache('issues');
    await invalidateCache(`issue:${id}`);

    const sanitizedIssue = {
      ...updatedIssue,
      assignees: updatedIssue.assignees.map((ia: any) => {
        const { passwordHash: _, ...u } = ia.user;
        return u;
      })
    };

    broadcastIssueUpdate(id, sanitizedIssue, userId);

    return { issue: sanitizedIssue };
  });

  fastify.post('/:id/status', {
    onRequest: [requireIssueTeamMember],
    schema: {
      params: z.object({ id: z.string() }),
      body: z.object({ status: statusSchema })
    }
  }, async (request: any, reply: any) => {
    const { id } = request.params;
    const { status } = request.body;
    const userId = request.userId;

    const issue = await prisma.issue.findUnique({ where: { id } });
    if (!issue) return reply.code(404).send({ error: 'Issue not found' });

    await prisma.activity.create({
      data: {
        userId,
        type: 'status_change',
        projectId: issue.projectId,
        issueId: id,
        entityTitle: issue.title,
        description: `changed status to ${status}`
      }
    });

    const updatedIssue = await prisma.issue.update({
      where: { id },
      data: { status: status as any, updatedAt: new Date() }
    });

    await invalidateCache('issues');
    await invalidateCache(`issue:${id}`);

    broadcastIssueUpdate(id, { status: updatedIssue.status }, userId);

    return { issue: updatedIssue };
  });

  fastify.delete('/:id', {
    onRequest: [requireAdmin],
    schema: {
      params: z.object({ id: z.string() })
    }
  }, async (request: any, reply: any) => {
    const { id } = request.params;
    const issue = await prisma.issue.findUnique({ where: { id } });
    if (!issue) return reply.code(404).send({ error: 'Issue not found' });

    await prisma.issue.delete({ where: { id } });
    await invalidateCache('issues');
    await invalidateCache(`issue:${id}`);

    // Custom broadcast for deletion
    const wsManager = (fastify as any).wsManager;
    if (wsManager) {
      wsManager.broadcastToRoom(`issue:${id}`, {
        type: 'issue_deleted',
        data: { issueId: id, projectId: issue.projectId }
      });
    }

    return { message: 'Issue deleted successfully' };
  });

  // Comments
  fastify.get('/:id/comments', {
    onRequest: [authenticate],
    schema: {
      params: z.object({ id: z.string() })
    }
  }, async (request: any) => {
    const { id: issueId } = request.params;
    const comments = await prisma.comment.findMany({
      where: { issueId },
      include: { user: true },
      orderBy: { createdAt: 'asc' }
    });

    return {
      comments: comments.map((c: any) => ({
        ...c,
        user: {
          id: c.user.id,
          name: c.user.name,
          avatarUrl: c.user.avatarUrl
        }
      }))
    };
  });
};

export default issuesRoutes;
