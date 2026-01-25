import { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';
import {
  sendEmail,
  generateToken as generateEmailToken,
  generateInvitationEmailHTML
} from '../auth/email.js';
import { requireAdminOrTeamLead } from '../middleware/authHooks.js';

const invitationsRoutes: FastifyPluginAsyncZod = async (fastify) => {
  const prisma = fastify.prisma;

  fastify.post('/send', {
    onRequest: [requireAdminOrTeamLead],
    schema: {
      body: z.object({
        email: z.string().email(),
        teamId: z.string(),
        role: z.enum(['Administrator', 'TeamLead', 'Member', 'Guest']).optional()
      })
    }
  }, async (request: any, reply: any) => {
    const { email, teamId, role = 'Member' } = request.body;
    const userId = request.userId;

    const team = await prisma.team.findUnique({ where: { id: teamId } });
    if (!team) return reply.code(404).send({ error: 'Team not found' });

    const currentUserMembership = await prisma.teamMember.findUnique({
      where: { teamId_userId: { teamId, userId } }
    });

    // Verify user is a member of the team they're inviting to
    // For stealth teams, membership is required
    // For non-stealth teams, only admins can invite without being members, but team leads must be members
    if (team.isStealth && !currentUserMembership) {
      return reply.code(403).send({ error: 'You must be a member of this private workspace to send invitations' });
    }

    // For team leads, they must be members of the team they're inviting to
    if (request.userRole === 'TeamLead' && !currentUserMembership) {
      return reply.code(403).send({ error: 'Team Leads must be members of the workspace to send invitations' });
    }

    // Global Administrators can invite to any team without being members
    // Team Leads must be members of the team they're inviting to

    if (request.userRole === 'TeamLead' && role === 'Administrator') {
      return reply.code(403).send({ error: 'Team Leads cannot invite Administrators' });
    }

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      await prisma.teamMember.upsert({
        where: { teamId_userId: { teamId, userId: existingUser.id } },
        update: { role: role as any },
        create: { teamId, userId: existingUser.id, role: role as any }
      });
      return { message: 'User added to team successfully' };
    }

    const token = generateEmailToken();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await prisma.invitation.create({
      data: { email, teamId, role: role as any, token, expiresAt }
    });

    await sendEmail({
      to: email,
      subject: `Invitation to join ${team.name}`,
      html: generateInvitationEmailHTML(team.name, role, token)
    });

    return { message: 'Invitation sent successfully' };
  });

  fastify.get('/check/:token', {
    schema: {
      params: z.object({ token: z.string() })
    }
  }, async (request: any, reply: any) => {
    const { token } = request.params;
    const invitation = await prisma.invitation.findUnique({
      where: { token },
      include: { team: true }
    });

    if (!invitation || invitation.expiresAt < new Date()) {
      return reply.code(404).send({ error: 'Invalid or expired invitation' });
    }

    return {
      team: invitation.team,
      role: invitation.role,
      email: invitation.email
    };
  });

  fastify.post('/accept', {
    schema: {
      body: z.object({ token: z.string() })
    }
  }, async (request: any, reply: any) => {
    const { token } = request.body;
    const invitation = await prisma.invitation.findUnique({
      where: { token },
      include: { team: true }
    });

    if (!invitation || invitation.expiresAt < new Date() || invitation.accepted) {
      return reply.code(404).send({ error: 'Invalid or expired invitation' });
    }

    const userId = request.userId;
    if (userId) {
      await prisma.teamMember.upsert({
        where: { teamId_userId: { teamId: invitation.teamId!, userId } },
        update: { role: invitation.role },
        create: { teamId: invitation.teamId!, userId, role: invitation.role }
      });

      await prisma.invitation.update({
        where: { id: invitation.id },
        data: { accepted: true }
      });

      return { message: 'Invitation accepted successfully' };
    }

    return {
      needsRegistration: true,
      team: invitation.team,
      role: invitation.role,
      email: invitation.email
    };
  });
};

export default invitationsRoutes;
