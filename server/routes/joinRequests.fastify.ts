import { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { authenticate } from '../middleware/authHooks.js';
import {
  broadcastNotification,
  broadcastJoinRequestCreated,
  broadcastJoinRequestUpdated
} from '../websocket/fastifyWebSocketRoutes.js';

const joinRequestsRoutes: FastifyPluginAsyncZod = async (fastify) => {
  const prisma = fastify.prisma;

  fastify.post('/', {
    onRequest: [authenticate],
    schema: {
      body: z.object({ teamId: z.string() })
    }
  }, async (request: any, reply: any) => {
    const { teamId } = request.body;
    const userId = request.userId;

    const team = await prisma.team.findUnique({ where: { id: teamId } });
    if (!team) return reply.code(404).send({ error: 'Workspace not found' });

    // Don't allow requests to stealth teams
    if (team.isStealth) {
      console.log(`[JoinRequest] User ${userId} tried to apply to stealth team ${team.name} (${teamId})`);
      return reply.code(403).send({ error: 'Cannot request to join a private workspace' });
    }

    const existingMembership = await prisma.teamMember.findUnique({
      where: { teamId_userId: { teamId, userId } }
    });
    if (existingMembership) return reply.code(400).send({ error: 'Already a member' });

    const existingRequest = await prisma.joinRequest.findUnique({
      where: { teamId_userId: { teamId, userId } }
    });
    if (existingRequest && existingRequest.status !== 'rejected') {
      return reply.code(400).send({ error: 'Request already pending' });
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return reply.code(404).send({ error: 'User not found' });

    // Create or update join request
    const joinRequest = await prisma.joinRequest.upsert({
      where: { teamId_userId: { teamId, userId } },
      update: { status: 'pending', updatedAt: new Date() },
      create: { teamId, userId },
      include: { team: true, user: true }
    });

    // Find all team admins/team leads to notify
    const teamMembers = await prisma.teamMember.findMany({
      where: {
        teamId,
        role: { in: ['Administrator', 'TeamLead'] }
      },
      include: { user: true }
    });

    // Send notifications to all team admins
    for (const member of teamMembers) {
      const notification = await prisma.notification.create({
        data: {
          userId: member.userId,
          type: 'joinRequest',
          message: `${user.name} mau gabung ke ${team.name}`,
          actorId: userId
        }
      });
      broadcastNotification(member.userId, notification);
    }

    // Broadcast join request created event for real-time updates
    broadcastJoinRequestCreated(joinRequest);

    return { message: 'Request gabung berhasil dibuat', joinRequest };
  });

  fastify.get('/', {
    onRequest: [authenticate]
  }, async (request: any) => {
    const userId = request.userId;
    const userEmail = (request as any).userEmail;

    console.log(`[JoinRequest GET] User ${userEmail} (${userId}) fetching join requests`);

    // Get user's team memberships with their roles
    const userMemberships = await prisma.teamMember.findMany({
      where: { userId },
      select: { teamId: true, role: true }
    });

    console.log(`[JoinRequest GET] User memberships:`, userMemberships);

    // Only get teams where user is Administrator or TeamLead for that specific team
    const adminTeamIds = userMemberships
      .filter((m: any) => m.role === 'Administrator' || m.role === 'TeamLead')
      .map((m: any) => m.teamId);

    console.log(`[JoinRequest GET] Admin team IDs:`, adminTeamIds);

    // Check for all pending join requests for debugging
    const allPending = await prisma.joinRequest.findMany({
      where: { status: 'pending' },
      include: { team: true }
    });
    console.log(`[JoinRequest GET] All pending join requests in DB:`, allPending);

    // Only show join requests for teams where user has admin/lead role
    const joinRequests = await prisma.joinRequest.findMany({
      where: {
        status: 'pending',
        teamId: { in: adminTeamIds }
      },
      include: { team: true, user: { select: { id: true, name: true, email: true, avatarUrl: true } } },
      orderBy: { createdAt: 'desc' }
    });

    console.log(`[JoinRequest GET] Returning ${joinRequests.length} join requests for user ${userEmail}`);
    return { joinRequests };
  });

  fastify.get('/my', {
    onRequest: [authenticate]
  }, async (request: any) => {
    const userId = request.userId;
    const joinRequests = await prisma.joinRequest.findMany({
      where: { userId },
      include: { team: true },
      orderBy: { createdAt: 'desc' }
    });
    return { joinRequests };
  });

  fastify.post('/:id/approve', {
    onRequest: [authenticate],
    schema: {
      params: z.object({ id: z.string() })
    }
  }, async (request: any, reply: any) => {
    const { id } = request.params;
    const userId = request.userId;
    const userEmail = (request as any).userEmail;

    console.log(`[JoinRequest APPROVE] User ${userEmail} (${userId}) approving request ${id}`);

    const joinRequest = await prisma.joinRequest.findUnique({
      where: { id },
      include: { team: true, user: true }
    });

    if (!joinRequest || joinRequest.status !== 'pending') {
      console.log(`[JoinRequest APPROVE] Request not found or not pending: ${id}`);
      return reply.code(404).send({ error: 'Pending join request not found' });
    }

    console.log(`[JoinRequest APPROVE] Request found: User ${joinRequest.user.email} wants to join ${joinRequest.team.name}`);

    // Check if user is a member of this specific team with admin/lead role
    const membership = await prisma.teamMember.findUnique({
      where: { teamId_userId: { teamId: joinRequest.teamId, userId } }
    });

    console.log(`[JoinRequest APPROVE] Approver membership:`, membership);

    if (!membership || (membership.role !== 'Administrator' && membership.role !== 'TeamLead')) {
      console.log(`[JoinRequest APPROVE] Approver lacks permissions. Role: ${membership?.role}`);
      return reply.code(403).send({ error: 'Only workspace administrators and team leads can approve requests' });
    }

    try {
      // Use upsert to handle case where user is already a member
      await prisma.teamMember.upsert({
        where: {
          teamId_userId: { teamId: joinRequest.teamId, userId: joinRequest.userId }
        },
        update: { role: 'Member' },
        create: { teamId: joinRequest.teamId, userId: joinRequest.userId, role: 'Member' }
      });

      console.log(`[JoinRequest APPROVE] Added user ${joinRequest.user.email} to team ${joinRequest.team.name}`);

      await prisma.joinRequest.update({
        where: { id },
        data: { status: 'approved', updatedAt: new Date() }
      });

      console.log(`[JoinRequest APPROVE] Updated request status to approved`);

      // Notify the user that their request was approved
      const notification = await prisma.notification.create({
        data: {
          userId: joinRequest.userId,
          type: 'joinRequest',
          message: `Request kakak buat gabung ke ${joinRequest.team.name} udah diterima`,
          actorId: userId
        }
      });
      broadcastNotification(joinRequest.userId, notification);

      // Broadcast join request updated event for real-time updates
      broadcastJoinRequestUpdated(id, 'approved');

      console.log(`[JoinRequest APPROVE] Successfully approved request ${id}`);
      return { message: 'Request gabung diterima' };
    } catch (error) {
      console.error(`[JoinRequest APPROVE] Error approving request ${id}:`, error);
      return reply.code(400).send({ error: 'Failed to approve request' });
    }
  });

  fastify.delete('/:id', {
    onRequest: [authenticate],
    schema: {
      params: z.object({ id: z.string() })
    }
  }, async (request: any, reply: any) => {
    const { id } = request.params;
    const userId = request.userId;

    const joinRequest = await prisma.joinRequest.findUnique({
      where: { id },
      include: { team: true, user: true }
    });

    if (!joinRequest || joinRequest.status !== 'pending') {
      return reply.code(404).send({ error: 'Pending join request not found' });
    }

    // Check if user is a member of this specific team with admin/lead role
    const membership = await prisma.teamMember.findUnique({
      where: { teamId_userId: { teamId: joinRequest.teamId, userId } }
    });

    if (!membership || (membership.role !== 'Administrator' && membership.role !== 'TeamLead')) {
      return reply.code(403).send({ error: 'Only workspace administrators and team leads can reject requests' });
    }

    await prisma.joinRequest.update({
      where: { id },
      data: { status: 'rejected', updatedAt: new Date() }
    });

    // Notify the user that their request was rejected
    const notification = await prisma.notification.create({
      data: {
        userId: joinRequest.userId,
        type: 'joinRequest',
        message: `Request kakak buat gabung ke ${joinRequest.team.name} ditolak ya`,
        actorId: userId
      }
    });
    broadcastNotification(joinRequest.userId, notification);

    // Broadcast join request updated event for real-time updates
    broadcastJoinRequestUpdated(id, 'rejected');

      return { message: 'Request gabung ditolak' };
  });
};

export default joinRequestsRoutes;
