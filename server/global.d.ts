import { FastifyRequest, FastifyInstance } from 'fastify';
import { PrismaClient, UserRole } from '@prisma/client';
import { Redis } from 'ioredis';

declare module 'fastify' {
    interface FastifyInstance {
        prisma: PrismaClient;
        redis: Redis;
    }

    interface FastifyRequest {
        userId?: string;
        userRole?: UserRole;
        userEmail?: string;
    }
}

export { };
