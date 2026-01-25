import { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { authenticate } from '../middleware/authHooks.js';

const notificationsRoutes: FastifyPluginAsyncZod = async (fastify) => {
  const prisma = fastify.prisma;

  fastify.get('/', {
    onRequest: [authenticate],
    schema: {
      querystring: z.object({
        unread: z.enum(['true', 'false']).optional(),
        teamId: z.string().optional() // Optional teamId for scope validation
      })
    }
  }, async (request: any, reply: any) => {
    const userId = request.userId;
    const { unread, teamId } = request.query;

    // Build the where clause
    const where: any = {
      userId,
      isRead: unread === 'true' ? false : undefined
    };

    // If teamId is provided, filter notifications by team scope
    // Notifications are team-scoped if they have an issue, and that issue belongs to a project in that team
    if (teamId) {
      // Validate that the team exists and user has access to it
      const team = await prisma.team.findUnique({
        where: { id: teamId },
        select: { id: true, isStealth: true }
      });

      if (!team) {
        return reply.code(400).send({
          error: 'Scope validation failed',
          details: [{ field: 'teamId', message: 'Team not found' }]
        });
      }

      // For stealth teams, verify user is a member
      if (team.isStealth) {
        const membership = await prisma.teamMember.findUnique({
          where: { teamId_userId: { teamId, userId } }
        });

        if (!membership) {
          return reply.code(403).send({
            error: 'Scope validation failed',
            details: [{ field: 'teamId', message: 'You do not have access to this team' }]
          });
        }
      }

      // Filter notifications to only include those linked to issues in the specified team
      where.issue = {
        project: {
          teamId: teamId
        }
      };
    }

    const notifications = await prisma.notification.findMany({
      where,
      include: {
        actor: {
          select: { id: true, name: true, avatarUrl: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return { notifications };
  });

  fastify.patch('/:id/read', {
    onRequest: [authenticate],
    schema: {
      params: z.object({ id: z.string() }),
      querystring: z.object({ teamId: z.string().optional() })
    }
  }, async (request: any, reply: any) => {
    const { id } = request.params;
    const { teamId } = request.query;
    const userId = request.userId;

    const notification = await prisma.notification.findUnique({
      where: { id },
      include: { issue: { select: { project: { select: { teamId: true } } } } }
    });

    if (!notification || notification.userId !== userId) {
      return reply.code(404).send({ error: 'Notification not found' });
    }

    // If teamId is provided, validate it matches the notification's team (scope validation)
    if (teamId) {
      if (!notification.issue) {
        // Notification without an issue cannot be team-scoped
        return reply.code(400).send({
          error: 'Scope validation failed',
          details: [{ field: 'teamId', message: 'Notification is not associated with a team' }]
        });
      }

      if (notification.issue.project.teamId !== teamId) {
        return reply.code(403).send({
          error: 'Scope validation failed',
          details: [{ field: 'teamId', message: 'Notification does not belong to the specified team' }]
        });
      }
    }

    await prisma.notification.update({
      where: { id },
      data: { isRead: true }
    });

    return { message: 'Notification marked as read' };
  });

  fastify.patch('/read-all', {
    onRequest: [authenticate],
    schema: {
      querystring: z.object({ teamId: z.string().optional() })
    }
  }, async (request: any, reply: any) => {
    const { teamId } = request.query;
    const userId = request.userId;

    const where: any = { userId, isRead: false };

    // If teamId is provided, filter by team scope
    if (teamId) {
      where.issue = {
        project: { teamId: teamId }
      };
    }

    await prisma.notification.updateMany({
      where,
      data: { isRead: true }
    });

    return { message: 'All notifications marked as read' };
  });
};

export default notificationsRoutes;
