import { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { registerSchema, loginSchema } from '../validation/schemas.js';
import { hashPassword, verifyPassword, validatePasswordStrength } from '../auth/password.js';
import { getRefreshTokenExpiryDate } from '../auth/jwt.js';
import { authenticate } from '../middleware/authHooks.js';
import { UserRole } from '@prisma/client';

const authRoutes: FastifyPluginAsyncZod = async (fastify) => {
  const prisma = fastify.prisma;

  // Helper to set refresh token cookie
  const setRefreshTokenCookie = (reply: any, token: string) => {
    reply.setCookie('refreshToken', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      path: '/'
    });
  };

  // Helper to send auth response
  const sendAuthResponse = async (reply: any, user: any) => {
    const payload = {
      userId: user.id,
      email: user.email,
      role: user.role
    };

    const accessToken = fastify.jwt.sign(payload);
    const refreshToken = fastify.jwt.sign(payload, { expiresIn: '7d' });

    await prisma.refreshToken.create({
      data: {
        userId: user.id,
        token: refreshToken,
        expiresAt: new Date(getRefreshTokenExpiryDate())
      }
    });

    setRefreshTokenCookie(reply, refreshToken);

    const { passwordHash: _, ...userResponse } = user;
    return {
      user: userResponse,
      accessToken
    };
  };

  fastify.post('/register', {
    schema: {
      body: registerSchema
    }
  }, async (request: any, reply: any) => {
    const { name, email, password } = request.body;

    const passwordValidation = validatePasswordStrength(password);
    if (!passwordValidation.valid) {
      return reply.code(400).send({ error: 'Password does not meet requirements', details: passwordValidation.errors });
    }

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return reply.code(409).send({ error: 'Email already registered' });
    }

    const allUsersCount = await prisma.user.count();
    const role = allUsersCount === 0 ? UserRole.Administrator : UserRole.Member;

    const passwordHash = await hashPassword(password);

    const newUser = await prisma.user.create({
      data: {
        name,
        email,
        passwordHash,
        avatarUrl: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random`,
        role,
        emailVerified: false
      }
    });

    reply.code(201);
    return sendAuthResponse(reply, newUser);
  });

  fastify.post('/login', {
    schema: {
      body: loginSchema
    }
  }, async (request: any, reply: any) => {
    console.log('[auth.login] Handler entered');
    const { email, password } = request.body;
    console.log('[auth.login] Email:', email);

    console.log('[auth.login] Finding user...');
    const user = await prisma.user.findUnique({ where: { email } });
    console.log('[auth.login] User found:', !!user);
    if (!user) {
      return reply.code(401).send({ error: 'Invalid credentials' });
    }

    console.log('[auth.login] Verifying password...');
    const isValid = await verifyPassword(password, user.passwordHash);
    console.log('[auth.login] Password valid:', isValid);
    if (!isValid) {
      return reply.code(401).send({ error: 'Invalid credentials' });
    }

    console.log('[auth.login] Sending auth response...');
    return sendAuthResponse(reply, user);
  });

  fastify.post('/logout', async (request: any, reply: any) => {
    const refreshToken = request.cookies['refreshToken'];

    if (refreshToken) {
      await prisma.refreshToken.deleteMany({
        where: { token: refreshToken }
      });
    }

    reply.clearCookie('refreshToken', { path: '/' });
    return { message: 'Logged out successfully' };
  });

  fastify.get('/me', {
    onRequest: [authenticate]
  }, async (request: any) => {
    const user = await prisma.user.findUnique({
      where: { id: request.userId }
    });

    if (!user) {
      throw new Error('User not found');
    }

    const { passwordHash: _, ...userResponse } = user;
    return { user: userResponse };
  });

  fastify.post('/refresh', {
    schema: {
      body: z.object({})
    }
  }, async (request: any, reply: any) => {
    console.log('[auth.refresh] Request received');
    const refreshToken = request.cookies['refreshToken'];
    console.log('[auth.refresh] Cookie:', refreshToken ? 'exists' : 'missing');

    if (!refreshToken) {
      console.log('[auth.refresh] No token, returning 401');
      return reply.code(401).send({ error: 'Refresh token not found' });
    }

    try {
      console.log('[auth.refresh] Verifying JWT...');
      const decoded = fastify.jwt.verify(refreshToken) as any;
      console.log('[auth.refresh] JWT decoded:', decoded.userId);

      console.log('[auth.refresh] Looking up token in database...');
      const storedToken = await prisma.refreshToken.findUnique({
        where: { token: refreshToken }
      });
      console.log('[auth.refresh] Stored token found:', !!storedToken);

      if (!storedToken || storedToken.expiresAt < new Date()) {
        console.log('[auth.refresh] Token invalid or expired');
        if (storedToken) await prisma.refreshToken.delete({ where: { id: storedToken.id } });
        return reply.code(401).send({ error: 'Invalid or expired refresh token' });
      }

      console.log('[auth.refresh] Finding user...');
      const user = await prisma.user.findUnique({ where: { id: decoded.userId } });
      if (!user) {
        console.log('[auth.refresh] User not found');
        return reply.code(401).send({ error: 'User not found' });
      }

      console.log('[auth.refresh] User found, deleting old token...');
      await prisma.refreshToken.delete({ where: { id: storedToken.id } });
      console.log('[auth.refresh] Sending auth response...');
      return sendAuthResponse(reply, user);
    } catch (err) {
      console.log('[auth.refresh] Error:', err);
      fastify.log.error({ err }, 'Refresh token error');
      return reply.code(401).send({ error: 'Invalid or expired refresh token' });
    }
  });
};

export default authRoutes;
