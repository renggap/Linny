import { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { authenticate } from '../middleware/authHooks.js';
import { workspaceScopeSchema, projectScopeSchema } from '@linny/contracts';

const activitiesRoutes: FastifyPluginAsyncZod = async (fastify) => {
  const prisma = fastify.prisma;

  // Schema for activities query - requires either teamId OR projectId
  const activitiesQuerySchema = z.union([
    workspaceScopeSchema.pick({ teamId: true }),
    projectScopeSchema.pick({ teamId: true, projectId: true })
  ]).and(
    z.object({
      limit: z.coerce.number().min(1).max(500).optional()
    })
  );

  fastify.get('/', {
    onRequest: [authenticate],
    schema: {
      querystring: activitiesQuerySchema
    }
  }, async (request: any, reply: any) => {
    const { teamId, projectId, limit = 100 } = request.query;

    // Membership gate (mirrors /issues and /projects list routes)
    if (request.userRole !== 'Administrator') {
      if (!teamId) {
        return reply.code(400).send({ error: 'teamId is required' });
      }
      const membership = await prisma.teamMember.findUnique({
        where: { teamId_userId: { teamId, userId: request.userId } }
      });
      if (!membership) {
        return reply.code(403).send({
          error: 'Forbidden: You are not a member of this team'
        });
      }
    }

    const activities = await prisma.activity.findMany({
      where: projectId
        ? { projectId }
        : teamId
          ? { project: { teamId } }
          : undefined,
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        user: {
          select: { id: true, name: true, avatarUrl: true }
        }
      }
    });

    return { activities };
  });

  fastify.post('/', {
    onRequest: [authenticate],
    schema: {
      body: z.object({
        type: z.string(),
        project_id: z.string().optional(),
        issue_id: z.string().optional(),
        entity_title: z.string().optional(),
        description: z.string().optional()
      })
    }
  }, async (request: any, reply) => {
    const data = request.body;
    const userId = request.userId!;

    const activity = await prisma.activity.create({
      data: {
        userId,
        type: data.type,
        projectId: data.project_id,
        issueId: data.issue_id,
        entityTitle: data.entity_title,
        description: data.description
      },
      include: {
        user: {
          select: { id: true, name: true, avatarUrl: true }
        }
      }
    });

    reply.code(201);
    return { activity };
  });
};

export default activitiesRoutes;