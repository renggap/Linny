import { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { createTeamSchema } from '../validation/schemas.js';
import { authenticate, requireAdminOrTeamLead, requireTeamMember, requireTeamAccess, requireAdmin, requireTeamAdminOrTeamLead } from '../middleware/authHooks.js';

const teamsRoutes: FastifyPluginAsyncZod = async (fastify) => {
  const prisma = fastify.prisma;

  fastify.get('/', {
    onRequest: [authenticate]
  }, async (request: any) => {
    const userId = request.userId;

    const allTeams = await prisma.team.findMany({
      include: {
        members: {
          include: {
            user: true
          }
        }
      }
    });

    const visibleTeams = allTeams.filter(team => {
      if (!team.isStealth) return true;
      return team.members.some(m => m.userId === userId);
    });

    console.log(`[Teams] User ${userId} sees ${visibleTeams.length} of ${allTeams.length} teams`);

    return {
      teams: visibleTeams.map(team => ({
        id: team.id,
        name: team.name,
        icon: team.icon,
        isStealth: team.isStealth,
        createdAt: team.createdAt,
        members: team.members.map(m => m.userId),
        membersWithRoles: team.members.map(m => ({
          id: m.userId,
          role: m.role
        }))
      }))
    };
  });

  fastify.get('/:id', {
    onRequest: [authenticate],
    schema: {
      params: z.object({ id: z.string() })
    }
  }, async (request: any, reply: any) => {
    const { id } = request.params;
    const team = await prisma.team.findUnique({
      where: { id },
      include: {
        members: true
      }
    });

    if (!team) {
      return reply.code(404).send({ error: 'Team not found' });
    }

    // Check visibility if stealth
    if (team.isStealth && !team.members.some(m => m.userId === request.userId)) {
      return reply.code(403).send({ error: 'Forbidden' });
    }

    return {
      team: {
        ...team,
        members: team.members.map(m => m.userId)
      }
    };
  });

  fastify.post('/', {
    onRequest: [requireAdminOrTeamLead],
    schema: {
      body: createTeamSchema
    }
  }, async (request: any, reply: any) => {
    const { name, icon } = request.body;
    const userId = request.userId;

    const newTeam = await prisma.team.create({
      data: {
        name,
        icon: icon || name.charAt(0).toUpperCase(),
        members: {
          create: {
            userId,
            role: 'Administrator' // Team creator is always an Administrator of that team
          }
        }
      },
      include: {
        members: true
      }
    });

    reply.code(201);
    return {
      team: {
        ...newTeam,
        members: newTeam.members.map(m => m.userId)
      }
    };
  });

  fastify.patch('/:id', {
    onRequest: [requireTeamMember],
    schema: {
      params: z.object({ id: z.string() }),
      body: z.object({
        name: z.string().min(1).max(100).optional(),
        icon: z.string().max(10).optional(),
        isStealth: z.boolean().optional()
      })
    }
  }, async (request: any) => {
    const { id } = request.params;
    const { name, icon, isStealth } = request.body;

    const updatedTeam = await prisma.team.update({
      where: { id },
      data: {
        name,
        icon,
        isStealth
      },
      include: {
        members: true
      }
    });

    return {
      team: {
        ...updatedTeam,
        members: updatedTeam.members.map(m => m.userId),
        membersWithRoles: updatedTeam.members.map(m => ({
          id: m.userId,
          role: m.role
        }))
      }
    };
  });

  fastify.get('/:id/members', {
    onRequest: [requireTeamAccess],
    schema: {
      params: z.object({ id: z.string() })
    }
  }, async (request: any) => {
    const { id } = request.params;
    const members = await prisma.teamMember.findMany({
      where: { teamId: id },
      include: { user: true }
    });

    return {
      members: members.map(m => {
        const { passwordHash: _, ...sanitizedUser } = m.user;
        return { ...sanitizedUser, teamRole: m.role };
      })
    };
  });

  fastify.post('/:id/members', {
    onRequest: [requireTeamAdminOrTeamLead, requireTeamMember],
    schema: {
      params: z.object({ id: z.string() }),
      body: z.object({
        userId: z.string(),
        role: z.enum(['Administrator', 'TeamLead', 'Member', 'Guest']).optional()
      })
    }
  }, async (request: any, reply: any) => {
    const { id: teamId } = request.params;
    const { userId, role = 'Member' } = request.body;

    // Team Leads cannot assign Administrator role
    // Check team-specific role (not global role) since we're using team-specific permissions
    const currentMember = await prisma.teamMember.findUnique({
      where: { teamId_userId: { teamId, userId: request.userId } }
    });

    if (currentMember?.role === 'TeamLead' && role === 'Administrator') {
      return reply.code(403).send({ error: 'Team Leads cannot assign Administrator role' });
    }

    await prisma.teamMember.upsert({
      where: {
        teamId_userId: { teamId, userId }
      },
      update: { role: role as any },
      create: { teamId, userId, role: role as any }
    });

    const members = await prisma.teamMember.findMany({
      where: { teamId },
      include: { user: true }
    });

    return {
      members: members.map(m => m.userId),
      membersWithRoles: members.map(m => ({
        id: m.userId,
        role: m.role
      }))
    };
  });

  fastify.delete('/:id/members/:userId', {
    onRequest: [requireTeamAdminOrTeamLead, requireTeamMember],
    schema: {
      params: z.object({
        id: z.string(),
        userId: z.string()
      })
    }
  }, async (request: any) => {
    const { id: teamId, userId } = request.params;

    await prisma.teamMember.delete({
      where: {
        teamId_userId: { teamId, userId }
      }
    });

    const members = await prisma.teamMember.findMany({
      where: { teamId }
    });

    return {
      members: members.map(m => m.userId)
    };
  });

  fastify.post('/:id/leave', {
    onRequest: [authenticate],
    schema: {
      params: z.object({ id: z.string() })
    }
  }, async (request: any, reply: any) => {
    const { id: teamId } = request.params;
    const userId = request.userId;

    const membership = await prisma.teamMember.findUnique({
      where: { teamId_userId: { teamId, userId } },
      include: { user: true }
    });

    if (!membership) {
      return reply.code(404).send({ error: 'You are not a member of this team' });
    }

    if (membership.user.role === 'Administrator') {
      const adminCount = await prisma.teamMember.count({
        where: {
          teamId,
          user: { role: 'Administrator' }
        }
      });
      if (adminCount <= 1) {
        return reply.code(400).send({
          error: 'Cannot leave workspace: You are the last Administrator.'
        });
      }
    }

    await prisma.teamMember.delete({
      where: { teamId_userId: { teamId, userId } }
    });

    return { message: 'Left workspace successfully' };
  });

  fastify.delete('/:id', {
    onRequest: [requireAdmin],
    schema: {
      params: z.object({ id: z.string() })
    }
  }, async (request: any) => {
    const { id } = request.params;
    await prisma.team.delete({ where: { id } });
    return { message: 'Team deleted successfully' };
  });
};

export default teamsRoutes;
