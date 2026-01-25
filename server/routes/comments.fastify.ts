import { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { createCommentSchema } from '../validation/schemas.js';
import { broadcastCommentUpdate } from '../websocket/fastifyWebSocketRoutes.js';
import { authenticate } from '../middleware/authHooks.js';

const commentsRoutes: FastifyPluginAsyncZod = async (fastify) => {
  const prisma = fastify.prisma;

  // Helper function to verify user has access to the issue's team
  async function canAccessIssue(issueId: string, userId: string): Promise<boolean> {
    const issue = await prisma.issue.findUnique({
      where: { id: issueId },
      include: { project: { select: { teamId: true, team: { select: { isStealth: true } } } } }
    });

    if (!issue) return false;

    const team = issue.project.team;
    if (!team.isStealth) return true;

    // For stealth teams, check membership
    const membership = await prisma.teamMember.findUnique({
      where: { teamId_userId: { teamId: issue.project.teamId, userId } }
    });

    return !!membership;
  }

  fastify.get('/issues/:issueId/comments', {
    onRequest: [authenticate],
    schema: {
      params: z.object({ issueId: z.string() }),
      querystring: z.object({ teamId: z.string().optional() })
    }
  }, async (request: any, reply: any) => {
    const { issueId } = request.params;
    const { teamId } = request.query;
    const userId = request.userId;

    // Verify user has access to this issue's team
    const hasAccess = await canAccessIssue(issueId, userId);
    if (!hasAccess) {
      return reply.code(403).send({ error: 'You do not have access to this issue' });
    }

    // If teamId is provided, validate it matches the issue's team (scope validation)
    if (teamId) {
      const issue = await prisma.issue.findUnique({
        where: { id: issueId },
        select: { project: { select: { teamId: true } } }
      });

      if (!issue) {
        return reply.code(404).send({ error: 'Issue not found' });
      }

      if (issue.project.teamId !== teamId) {
        return reply.code(403).send({
          error: 'Scope validation failed',
          details: [{ field: 'teamId', message: 'Issue does not belong to the specified team' }]
        });
      }
    }

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

  fastify.post('/', {
    onRequest: [authenticate],
    schema: {
      body: createCommentSchema
    }
  }, async (request: any, reply: any) => {
    const { content, issueId, teamId } = request.body;
    const userId = request.userId;

    // Verify user has access to this issue's team
    const hasAccess = await canAccessIssue(issueId, userId);
    if (!hasAccess) {
      return reply.code(403).send({ error: 'You do not have access to this issue' });
    }

    const issue = await prisma.issue.findUnique({
      where: { id: issueId },
      include: { project: true }
    });

    if (!issue) return reply.code(404).send({ error: 'Issue not found' });

    // If teamId is provided, validate it matches the issue's team (scope validation)
    if (teamId && issue.project.teamId !== teamId) {
      return reply.code(403).send({
        error: 'Scope validation failed',
        details: [{ field: 'teamId', message: 'Issue does not belong to the specified team' }]
      });
    }

    const newComment = await prisma.comment.create({
      data: {
        content,
        issueId,
        userId
      },
      include: { user: true }
    });

    const activity = await prisma.activity.create({
      data: {
        userId,
        type: 'comment',
        projectId: issue.projectId,
        issueId,
        entityTitle: issue.title,
        description: 'commented on the issue'
      },
      include: { user: true }
    });

    // Process mentions
    const mentionedUsers = await prisma.user.findMany({
      where: {
        id: { not: userId },
        name: { in: content.match(/@(\w+)/g)?.map((m: string) => m.slice(1)) || [] }
      }
    });

    if (mentionedUsers.length > 0) {
      await prisma.notification.createMany({
        data: mentionedUsers.map((u: any) => ({
          userId: u.id,
          type: 'mention',
          message: 'mentioned you in a comment',
          issueId,
          actorId: userId
        }))
      });
    }

    const sanitizedComment = {
      ...newComment,
      user: {
        id: newComment.user.id,
        name: newComment.user.name,
        avatarUrl: newComment.user.avatarUrl
      }
    };

    broadcastCommentUpdate(issueId, sanitizedComment, userId);

    reply.code(201);
    return {
      comment: sanitizedComment,
      activity: {
        ...activity,
        user: {
          id: activity.user.id,
          name: activity.user.name,
          avatarUrl: activity.user.avatarUrl
        }
      }
    };
  });
};

export default commentsRoutes;
