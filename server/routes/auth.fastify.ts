import { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';
import crypto from 'crypto';
import { registerSchema, loginSchema } from '../validation/schemas.js';
import { hashPassword, verifyPassword, validatePasswordStrength } from '../auth/password.js';
import { getRefreshTokenExpiryDate } from '../auth/jwt.js';
import { authenticate } from '../middleware/authHooks.js';
import { UserRole } from '@prisma/client';
import { generateToken, sendEmail, generatePasswordResetEmailHTML } from '../auth/email.js';
import {
  isAccountLocked,
  recordFailedAttempt,
  resetFailedAttempts,
  getLockoutTimeRemaining
} from '../middleware/accountLockout.js';

const authRoutes: FastifyPluginAsyncZod = async (fastify) => {
  const prisma = fastify.prisma;

  // Helper to set refresh token cookie
  const setRefreshTokenCookie = (reply: any, token: string) => {
    reply.setCookie('refreshToken', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
      maxAge: 7 * 24 * 60 * 60, // 7 days in seconds (@fastify/cookie uses seconds, not ms)
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
    const refreshToken = fastify.jwt.sign(
      { ...payload, jti: crypto.randomUUID() },
      { expiresIn: '7d' }
    );

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
    },
    config: { rateLimit: { max: 5, timeWindow: '1 hour' } }
  }, async (request: any, reply: any) => {
    const { name, email, password } = request.body;
    const normalizedEmail = email.toLowerCase();

    const passwordValidation = validatePasswordStrength(password);
    if (!passwordValidation.valid) {
      return reply.code(400).send({ error: 'Password does not meet requirements', details: passwordValidation.errors });
    }

    const existingUser = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (existingUser) {
      return reply.code(409).send({ error: 'Email already registered' });
    }

    const allUsersCount = await prisma.user.count();
    const role = allUsersCount === 0 ? UserRole.Administrator : UserRole.Member;

    const passwordHash = await hashPassword(password);

    const newUser = await prisma.user.create({
      data: {
        name,
        email: normalizedEmail,
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
    },
    config: { rateLimit: { max: 5, timeWindow: '15 minutes' } }
  }, async (request: any, reply: any) => {
    const { email, password } = request.body;
    const normalizedEmail = email.toLowerCase();

    if (isAccountLocked(normalizedEmail)) {
      const retryAfter = getLockoutTimeRemaining(normalizedEmail);
      return reply
        .code(429)
        .header('Retry-After', String(retryAfter))
        .send({ error: 'Too many failed login attempts. Try again later.' });
    }

    const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (!user) {
      recordFailedAttempt(normalizedEmail);
      return reply.code(401).send({ error: 'Invalid credentials' });
    }

    const isValid = await verifyPassword(password, user.passwordHash);
    if (!isValid) {
      recordFailedAttempt(normalizedEmail);
      return reply.code(401).send({ error: 'Invalid credentials' });
    }

    resetFailedAttempts(normalizedEmail);
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
    const refreshToken = request.cookies['refreshToken'];

    if (!refreshToken) {
      return reply.code(401).send({ error: 'Refresh token not found' });
    }

    try {
      const decoded = fastify.jwt.verify(refreshToken) as any;

      const storedToken = await prisma.refreshToken.findUnique({
        where: { token: refreshToken }
      });

      if (!storedToken || storedToken.expiresAt < new Date()) {
        if (storedToken) await prisma.refreshToken.delete({ where: { id: storedToken.id } });
        return reply.code(401).send({ error: 'Invalid or expired refresh token' });
      }

      const user = await prisma.user.findUnique({ where: { id: decoded.userId } });
      if (!user) {
        return reply.code(401).send({ error: 'User not found' });
      }

      await prisma.refreshToken.delete({ where: { id: storedToken.id } });
      return sendAuthResponse(reply, user);
    } catch (err) {
      fastify.log.error({ err }, 'Refresh token error');
      return reply.code(401).send({ error: 'Invalid or expired refresh token' });
    }
  });

  // Forgot password - send reset link via email
  fastify.post('/forgot-password', {
    config: { rateLimit: { max: 3, timeWindow: '1 hour' } }
  }, async (request: any, reply: any) => {
    const { email } = request.body as { email: string };

    if (!email || !email.includes('@')) {
      return reply.code(400).send({ message: 'Email wajib diisi kak' });
    }

    const normalizedEmail = email.toLowerCase();
    const genericMessage = 'Kalo ada akun pake email ini, link reset udah dikirim ya kak';

    try {
      const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });

      if (!user) {
        // Constant-time-ish delay to match the real-user path (DB + SMTP ~ 400-600ms)
        await new Promise(resolve => setTimeout(resolve, 400 + Math.random() * 200));
        return reply.send({ message: genericMessage });
      }

      await prisma.passwordResetToken.deleteMany({
        where: { userId: user.id }
      });

      const token = generateToken();
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

      await prisma.passwordResetToken.create({
        data: {
          token,
          userId: user.id,
          expiresAt
        }
      });

      const emailHTML = generatePasswordResetEmailHTML(token);
      await sendEmail({
        to: user.email,
        subject: 'Reset Password Kakak',
        html: emailHTML
      });

      reply.send({ message: genericMessage });
    } catch (error) {
      fastify.log.error({ err: error }, 'Forgot password error');
      reply.send({ message: genericMessage });
    }
  });

  // Reset password with token
  fastify.post('/reset-password', {
    config: { rateLimit: { max: 5, timeWindow: '15 minutes' } }
  }, async (request: any, reply: any) => {
    const { token, newPassword } = request.body as { token: string; newPassword: string };

    if (!token || !newPassword) {
      return reply.code(400).send({ message: 'Token dan password wajib diisi' });
    }

    const strength = validatePasswordStrength(newPassword);
    if (!strength.valid) {
      return reply.code(400).send({
        message: 'Password does not meet requirements',
        details: strength.errors
      });
    }

    try {
      const resetToken = await prisma.passwordResetToken.findUnique({
        where: { token },
        include: { user: true }
      });

      if (!resetToken) {
        return reply.code(400).send({ message: 'Link reset nggak valid atau udah kadaluarsa kak' });
      }

      if (resetToken.expiresAt < new Date()) {
        await prisma.passwordResetToken.delete({ where: { token } });
        return reply.code(400).send({ message: 'Link reset udah kadaluarsa. Request yang baru ya kak' });
      }

      const passwordHash = await hashPassword(newPassword);

      await prisma.$transaction([
        prisma.user.update({
          where: { id: resetToken.userId },
          data: { passwordHash }
        }),
        prisma.refreshToken.deleteMany({ where: { userId: resetToken.userId } }),
        prisma.passwordResetToken.delete({ where: { token } })
      ]);

      reply.send({ message: 'Password berhasil diupdate kak!' });
    } catch (error) {
      console.error('Reset password error:', error);
      reply.code(500).send({ message: 'Gagal ganti password. Coba lagi nanti ya kak' });
    }
  });
};

export default authRoutes;
