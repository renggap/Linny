import { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { updateUserRoleSchema, updateProfileSchema } from '../validation/schemas.js';
import { verifyPassword, hashPassword, validatePasswordStrength } from '../auth/password.js';
import { authenticate, requireAdminOrTeamLead } from '../middleware/authHooks.js';

const usersRoutes: FastifyPluginAsyncZod = async (fastify) => {
  const prisma = fastify.prisma;

  fastify.get('/', {
    onRequest: [authenticate]
  }, async () => {
    const users = await prisma.user.findMany();
    return {
      users: users.map(({ passwordHash: _, ...user }) => user)
    };
  });

  fastify.get('/:id', {
    onRequest: [authenticate],
    schema: {
      params: z.object({ id: z.string() })
    }
  }, async (request: any, reply: any) => {
    const { id } = request.params;
    const user = await prisma.user.findUnique({ where: { id } });

    if (!user) {
      return reply.code(404).send({ error: 'User not found' });
    }

    const { passwordHash: _, ...sanitizedUser } = user;
    return { user: sanitizedUser };
  });

  fastify.patch('/:id', {
    onRequest: [authenticate],
    schema: {
      params: z.object({ id: z.string() }),
      body: updateProfileSchema
    }
  }, async (request: any, reply: any) => {
    const { id } = request.params;
    const { name, avatar_url } = request.body;

    if (id !== request.userId) {
      return reply.code(403).send({ error: 'You can only update your own profile' });
    }

    const user = await prisma.user.update({
      where: { id },
      data: {
        name,
        avatarUrl: avatar_url,
        updatedAt: new Date()
      }
    });

    const { passwordHash: _, ...sanitizedUser } = user;
    return { user: sanitizedUser };
  });

  fastify.patch('/:id/role', {
    onRequest: [requireAdminOrTeamLead],
    schema: {
      params: z.object({ id: z.string() }),
      body: updateUserRoleSchema
    }
  }, async (request: any, reply: any) => {
    const { id } = request.params;
    const { role } = request.body;

    if (id === request.userId) {
      return reply.code(400).send({ error: 'Cannot change your own role' });
    }

    if (request.userRole === 'TeamLead' && role === 'Administrator') {
      return reply.code(403).send({ error: 'Team Leads cannot assign Administrator role' });
    }

    const targetUser = await prisma.user.findUnique({ where: { id } });
    if (!targetUser) {
      return reply.code(404).send({ error: 'User not found' });
    }
    if (targetUser.role === 'Administrator' && request.userRole !== 'Administrator') {
      return reply.code(403).send({ error: 'Forbidden: Only Administrators can modify an Administrator' });
    }

    const user = await prisma.user.update({
      where: { id },
      data: {
        role: role as any,
        updatedAt: new Date()
      }
    });

    const { passwordHash: _, ...sanitizedUser } = user;
    return { user: sanitizedUser };
  });

  fastify.delete('/:id', {
    onRequest: [requireAdminOrTeamLead],
    schema: {
      params: z.object({ id: z.string() })
    }
  }, async (request: any, reply: any) => {
    const { id } = request.params;

    if (id === request.userId) {
      return reply.code(400).send({ error: 'Cannot delete your own account' });
    }

    await prisma.user.delete({ where: { id } });
    return { message: 'User removed successfully' };
  });

  fastify.post('/:id/password', {
    onRequest: [authenticate],
    schema: {
      params: z.object({ id: z.string() }),
      body: z.object({
        currentPassword: z.string(),
        newPassword: z.string()
      })
    }
  }, async (request: any, reply: any) => {
    const { id } = request.params;
    const { currentPassword, newPassword } = request.body;

    if (id !== request.userId) {
      return reply.code(403).send({ error: 'Unauthorized: Access restricted' });
    }

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      return reply.code(404).send({ error: 'User not found' });
    }

    const isMatch = await verifyPassword(currentPassword, user.passwordHash);
    if (!isMatch) {
      return reply.code(401).send({ error: 'Invalid current password' });
    }

    const strength = validatePasswordStrength(newPassword);
    if (!strength.valid) {
      return reply.code(400).send({ error: strength.errors[0] });
    }

    const newHash = await hashPassword(newPassword);
    await prisma.user.update({
      where: { id },
      data: { passwordHash: newHash, updatedAt: new Date() }
    });

    return { message: 'Password updated successfully' };
  });
};

export default usersRoutes;
