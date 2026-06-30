/**
 * Linny Server - Fastify Implementation
 *
 * Migrated from Express to Fastify for improved performance and Redis caching.
 *
 * Features:
 * - Fastify framework with plugins for security, CORS, compression, cookies
 * - JWT authentication with @fastify/jwt
 * - Redis caching with ioredis
 * - WebSocket support via @fastify/websocket
 * - Rate limiting with @fastify/rate-limit
 * - Comprehensive security headers
 * - Health check endpoint with Redis status
 */

import './env.js';

import Fastify, { FastifyInstance } from 'fastify';
import fastifyHelmet from '@fastify/helmet';
import fastifyCors from '@fastify/cors';
import fastifyCompress from '@fastify/compress';
import fastifyCookie from '@fastify/cookie';
import fastifyJwt from '@fastify/jwt';
import fastifyRateLimit from '@fastify/rate-limit';
import fastifyWebsocket from '@fastify/websocket';
import { serializerCompiler, validatorCompiler } from 'fastify-type-provider-zod';
import crypto from 'crypto';
import fp from 'fastify-plugin';
import { getDatabase } from './database.js';
import { validateConfig } from './config/index.js';
import { getRedisClient } from './cache/redis.js';
import { registerWebSocketRoutes } from './websocket/fastifyWebSocketRoutes.js';
import { schedulePeriodicJobs } from './jobs/jobQueue.js';
import { BANNER } from './utils/banner.js';

// Show banner on startup (only in production or if explicitly enabled)
if (process.env.NODE_ENV === 'production' || process.env.SHOW_BANNER === 'true') {
  console.log(BANNER);
}

const PORT = process.env.PORT || 3001;
const isDevelopment = process.env.NODE_ENV !== 'production';

// ============================================================================
// SECURITY PLUGIN
// ============================================================================

/**
 * Security plugin wrapper for @fastify/helmet
 *
 * Production no longer relies on nginx to inject a Content-Security-Policy
 * header — Helmet emits it for every environment so the protection cannot
 * silently disappear behind a reverse proxy config.
 *
 * NOTE: `styleSrc` includes `'unsafe-inline'` because Tailwind injects
 * runtime styles. Switching to nonces/hashes is a follow-up.
 */
async function securityPlugin(fastify: FastifyInstance) {
  // Include configured production frontend origin(s) so the deployed UI can
  // reach the API over HTTPS and the WebSocket over WSS. Browsers treat
  // https:// and wss:// as distinct CSP schemes, so we derive the WS pair.
  const frontendUrls = process.env.FRONTEND_URL
    ? [
        ...process.env.FRONTEND_URL.split(','),
        ...process.env.FRONTEND_URL.split(',').map((u) =>
          u.trim().replace(/^https:/, 'wss:').replace(/^http:/, 'ws:')
        )
      ]
    : [];

  const cspDirectives = {
    defaultSrc: ["'self'"],
    styleSrc: ["'self'", "'unsafe-inline'"], // Tailwind requires unsafe-inline
    scriptSrc: ["'self'"],
    imgSrc: ["'self'", 'data:', 'https://picsum.photos', 'https://ui-avatars.com'],
    connectSrc: [
      "'self'",
      ...(isDevelopment
        ? ['http://localhost:3001', 'http://localhost:3000', 'ws://localhost:3001']
        : []),
      ...frontendUrls
    ],
    fontSrc: ["'self'"],
    objectSrc: ["'none'"],
    mediaSrc: ["'self'"],
    frameSrc: ["'none'"]
  };

  await fastify.register(fastifyHelmet, {
    contentSecurityPolicy: { directives: cspDirectives },
    hsts: isDevelopment ? false : {
      maxAge: 63072000, // 2 years
      includeSubDomains: true,
      preload: true
    }
  });
}

// ============================================================================
// CORS CONFIGURATION
// ============================================================================

const corsOptions = {
  origin: (origin: string | undefined, callback: (err: Error | null, allow: boolean) => void) => {
    // Allow requests with no origin (like mobile apps, curl, etc.)
    if (!origin) return callback(null, true);

    const allowedOrigins = isDevelopment
      ? ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:3002', 'http://localhost:4173', 'http://localhost:5173',
        'http://127.0.0.1:3000', 'http://127.0.0.1:4173', 'http://127.0.0.1:5173',
        'https://linear.neodigital.co.id'] // Add production domain
      : (process.env.FRONTEND_URL || 'https://linear.neodigital.co.id').split(',');

    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'), false);
    }
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token'],
  credentials: true,
  maxAge: 86400
};

// ============================================================================
// JWT AUTHENTICATION PLUGIN
// ============================================================================

// Production CSP requires FRONTEND_URL so connectSrc can derive wss:// for WebSocket.
// Without it, deployed browsers will block API/WS requests.
if (process.env.NODE_ENV === 'production') {
  const frontendUrl = process.env.FRONTEND_URL;
  if (!frontendUrl || frontendUrl.trim().length === 0) {
    console.error('FATAL: FRONTEND_URL environment variable is required in production (used for CSP connectSrc and WebSocket wss:// derivation)');
    process.exit(1);
  }
}

async function jwtPlugin(fastify: FastifyInstance) {
  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    console.error('FATAL: JWT_SECRET environment variable is not set');
    process.exit(1);
  }
  if (jwtSecret.length < 32) {
    console.error('FATAL: JWT_SECRET must be at least 32 characters long');
    process.exit(1);
  }
  await fastify.register(fastifyJwt, {
    secret: jwtSecret,
    sign: {
      expiresIn: '3d'
    }
  });
}

// ============================================================================
// RATE LIMITING CONFIG
// ============================================================================

const rateLimitConfig = {
  global: true,
  max: isDevelopment ? 1000 : 100,
  timeWindow: '15 minutes',
  cache: 10000,
  allowList: isDevelopment ? ['127.0.0.1', '::1'] : [],
  redis: undefined // Will be set if Redis is available
};

// ============================================================================
// DATABASE PLUGIN
// ============================================================================

async function databasePlugin(fastify: FastifyInstance) {
  const db = await getDatabase();
  (fastify as any).decorate('prisma', db.getPrisma());

  fastify.addHook('onClose', async () => {
    await db.close();
  });
}

// ============================================================================
// CACHE PLUGIN
// ============================================================================

async function cachePlugin(fastify: FastifyInstance) {
  const redis = getRedisClient();
  (fastify as any).decorate('redis', redis);
}

// ============================================================================
// FASTIFY INSTANCE CREATION
// ============================================================================

const fastify = Fastify({
  logger: {
    level: isDevelopment ? 'info' : 'warn',
    transport: isDevelopment ? {
      target: 'pino-pretty',
      options: {
        translateTime: 'HH:MM:ss Z',
        ignore: 'pid,hostname'
      }
    } : undefined, // JSON output in production
    redact: ['req.headers.authorization', 'req.headers.cookie'], // Don't log sensitive data
  },
  bodyLimit: 5 * 1024 * 1024, // 5MB - reduced from 10MB for security
  requestIdHeader: 'x-request-id',
  trustProxy: true, // Behind nginx — read X-Forwarded-For so rate limits key per-client
  disableRequestLogging: !isDevelopment // Disable request logging in production for performance
});

// Set validator and serializer compilers
fastify.setValidatorCompiler(validatorCompiler);
fastify.setSerializerCompiler(serializerCompiler);

// ============================================================================
// REGISTER PLUGINS
// ============================================================================

async function registerPlugins() {
  // Security plugins
  await fastify.register(securityPlugin);

  // CORS - register directly with options
  await fastify.register(fastifyCors, corsOptions);

  await fastify.register(fastifyCompress, { threshold: 1024 });
  await fastify.register(fastifyCookie);

  // JWT authentication
  await fastify.register(fp(jwtPlugin));

  // Rate limiting
  await fastify.register(fastifyRateLimit, rateLimitConfig);

  // Database and cache
  await fastify.register(fp(databasePlugin));
  await fastify.register(fp(cachePlugin));

  // CSRF token endpoint + double-submit preHandler (fp-wrapped so the
  // preHandler escapes encapsulation and applies to /api/v1/* routes).
  await fastify.register(fp(csrfPlugin));

  // WebSocket support (registered after Express compatibility layer)
  await fastify.register(fastifyWebsocket);
}

// ============================================================================
// HEALTH CHECK ENDPOINT
// ============================================================================

fastify.get('/api/health', async (_request, reply) => {
  try {
    const db = await getDatabase();
    const redis = getRedisClient();

    // Check database connectivity
    let dbStatus = 'disconnected';
    try {
      await db.getAllUsers();
      dbStatus = 'connected';
    } catch {
      dbStatus = 'disconnected';
    }

    // Get Redis status
    const redisStatus = await redis.getHealthStatus();

    // Calculate uptime
    const uptime = process.uptime();
    const uptimeString = `${Math.floor(uptime / 60)}m ${Math.floor(uptime % 60)}s`;

    // Memory usage
    const memoryUsage = process.memoryUsage();
    const memoryUsageString = `${Math.round(memoryUsage.heapUsed / 1024 / 1024)}MB / ${Math.round(memoryUsage.heapTotal / 1024 / 1024)}MB`;

    const health = {
      status: dbStatus === 'connected' ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      uptime: uptimeString,
      database: dbStatus,
      redis: redisStatus.connected ? {
        status: 'connected',
        memory: redisStatus.memory || 'unknown',
        keyCount: redisStatus.keyCount || 0
      } : {
        status: 'disconnected'
      },
      memory: memoryUsageString,
      environment: process.env.NODE_ENV || 'development'
    };

    if (dbStatus !== 'connected') {
      return reply.code(503).send({ ...health, status: 'unhealthy' });
    }

    return reply.send(health);
  } catch (error) {
    return reply.code(503).send({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: 'Health check failed'
    });
  }
});

// ============================================================================
// CSRF TOKEN ENDPOINT
// ============================================================================

const csrfTokens = new Map<string, { token: string; expires: number }>();
const TOKEN_EXPIRY_MS = 30 * 60 * 1000;

// Evict expired tokens every 5 minutes to bound memory growth
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of csrfTokens.entries()) {
    if (value.expires <= now) csrfTokens.delete(key);
  }
}, 5 * 60 * 1000).unref();

function generateCsrfToken(): string {
  return crypto.randomBytes(32).toString('base64url');
}

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

async function csrfPlugin(fastify: FastifyInstance) {
  fastify.get('/api/csrf-token', async (request, reply) => {
    const sessionId = (request.ip as string) || 'anonymous';
    const now = Date.now();
    const existing = csrfTokens.get(sessionId);

    // Reuse valid token to avoid invalidating other tabs/sessions sharing
    // the same session id (multi-tab scenario).
    const token = (existing && existing.expires > now) ? existing.token : generateCsrfToken();

    if (!existing || existing.expires <= now) {
      csrfTokens.set(sessionId, {
        token,
        expires: now + TOKEN_EXPIRY_MS
      });
    }

    // Set cookie so the browser echoes it back on subsequent state-changing
    // requests (double-submit pattern). Frontend reads token from JSON
    // response and sends X-CSRF-Token header; browser sends cookie
    // automatically. Server compares header === cookie === stored token.
    reply.setCookie('csrfToken', token, {
      httpOnly: false, // Frontend reads document.cookie for retries
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
      maxAge: TOKEN_EXPIRY_MS / 1000,
      path: '/'
    });

    return reply.send({ csrfToken: token });
  });

  // Double-submit CSRF validation on state-changing routes.
  // Wrapped with fp() at registration so this hook propagates to all
  // /api/v1/* routes registered in registerRoutes().
  fastify.addHook('preHandler', async (request: any, reply: any) => {
    if (SAFE_METHODS.has(request.method)) return;

    // Skip endpoints a client must hit before having a token.
    // Strip query string so endpoints invoked with ?email=... etc. are still skipped.
    const urlPath = request.url.split('?')[0];
    if (urlPath === '/api/v1/auth/login' ||
        urlPath === '/api/v1/auth/register' ||
        urlPath === '/api/v1/auth/forgot-password' ||
        urlPath === '/api/v1/auth/reset-password' ||
        urlPath === '/api/csrf-token') {
      return;
    }

    const headerToken = request.headers['x-csrf-token'];
    const cookieToken = request.cookies?.csrfToken;
    const sessionId = (request.ip as string) || 'anonymous';
    const stored = csrfTokens.get(sessionId);

    const isValid =
      headerToken &&
      cookieToken &&
      headerToken === cookieToken &&
      stored &&
      stored.token === headerToken &&
      stored.expires > Date.now();

    if (!isValid) {
      return reply.code(403).send({ error: 'CSRF token invalid or missing' });
    }
  });
}

// ============================================================================
// IMPORT ROUTES
// ============================================================================

async function registerRoutes() {
  // Register native Fastify routes
  const authFastify = (await import('./routes/auth.fastify.js')).default;
  const usersFastify = (await import('./routes/users.fastify.js')).default;
  const teamsFastify = (await import('./routes/teams.fastify.js')).default;
  const projectsFastify = (await import('./routes/projects.fastify.js')).default;
  const issuesFastify = (await import('./routes/issues.fastify.js')).default;
  const commentsFastify = (await import('./routes/comments.fastify.js')).default;
  const activitiesFastify = (await import('./routes/activities.fastify.js')).default;
  const notificationsFastify = (await import('./routes/notifications.fastify.js')).default;
  const searchFastify = (await import('./routes/search.fastify.js')).default;
  const invitationsFastify = (await import('./routes/invitations.fastify.js')).default;
  const joinRequestsFastify = (await import('./routes/joinRequests.fastify.js')).default;

  // New Fastify routes (converted from Express)
  const analyticsFastify = (await import('./routes/analytics.fastify.js')).default;
  const adminFastify = (await import('./routes/admin.fastify.js')).default;
  const exportFastify = (await import('./routes/export.fastify.js')).default;

  // Register Fastify routes with /api/v1/ prefix only (deprecating /api/ prefix)
  await fastify.register(authFastify, { prefix: '/api/v1/auth' });
  await fastify.register(usersFastify, { prefix: '/api/v1/users' });
  await fastify.register(teamsFastify, { prefix: '/api/v1/teams' });
  await fastify.register(projectsFastify, { prefix: '/api/v1/projects' });
  await fastify.register(issuesFastify, { prefix: '/api/v1/issues' });
  await fastify.register(commentsFastify, { prefix: '/api/v1/comments' });
  await fastify.register(activitiesFastify, { prefix: '/api/v1/activities' });
  await fastify.register(notificationsFastify, { prefix: '/api/v1/notifications' });
  await fastify.register(searchFastify, { prefix: '/api/v1/search' });
  await fastify.register(invitationsFastify, { prefix: '/api/v1/invitations' });
  await fastify.register(joinRequestsFastify, { prefix: '/api/v1/join-requests' });

  // Register new Fastify routes
  await fastify.register(analyticsFastify, { prefix: '/api/v1/analytics' });
  await fastify.register(adminFastify, { prefix: '/api/v1/admin' });
  await fastify.register(exportFastify, { prefix: '/api/v1/export' });

  // Initialize WebSocket routes
  registerWebSocketRoutes(fastify);
}

// ============================================================================
// ERROR HANDLER
// ============================================================================

fastify.setErrorHandler((error: any, _request: any, reply: any) => {
  const statusCode = error.statusCode || 500;
  const message = error.message || 'Internal server error';

  fastify.log.error(`[Error ${statusCode}] ${message}`);
  fastify.log.error(error);

  reply.code(statusCode).send({
    error: message,
    ...(isDevelopment && { stack: error.stack })
  });
});

fastify.setNotFoundHandler((request, reply) => {
  reply.code(404).send({
    error: 'Not Found',
    path: request.url,
    method: request.method
  });
});

// ============================================================================
// SERVER STARTUP
// ============================================================================

async function startServer() {
  try {
    // Validate configuration before any plugins register
    validateConfig();

    // Register plugins
    await registerPlugins();

    // Register routes
    await registerRoutes();

    // Initialize database
    const db = await getDatabase();

    // Database: Ensure first user is Administrator if no Administrator users exist
    const allUsers = await db.getAllUsers();
    const hasAdmin = allUsers.some(u => u.role === 'Administrator');
    if (!hasAdmin && allUsers.length > 0) {
      const firstUser = allUsers[0];
      if (firstUser) {
        fastify.log.warn(`No Administrator users found. Promoting first user (${firstUser.email}) to Administrator...`);
        await db.updateUser(firstUser.id, { role: 'Administrator' });
      }
    }

    // Start server (WebSocket already registered in registerRoutes())
    await fastify.listen({ port: PORT as number, host: '0.0.0.0' });

    // Server startup info (only show in development or with banner)
    if (isDevelopment || process.env.SHOW_BANNER === 'true') {
      console.log(`\n🚀 Linny Server running on http://localhost:${PORT}`);
      console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`🔐 JWT Secret: ${process.env.JWT_SECRET ? 'configured' : 'WARNING: using default!'}`);
      console.log(`🔒 Security: Helmet, CORS, CSRF, Rate Limiting enabled`);
      console.log(`📦 Compression: Enabled`);
      console.log(`📝 Logging: Request and error logging enabled`);
      console.log(`🔴 Redis: ${getRedisClient().isReady() ? 'Connected' : 'Not connected'}`);
    } else {
      // Production: minimal logging
      fastify.log.info(`Linny server started on port ${PORT}`);
    }

    // Schedule periodic background jobs
    await schedulePeriodicJobs();

  } catch (error) {
    fastify.log.error('Failed to start server');
    fastify.log.error(error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGINT', async () => {
  if (isDevelopment) console.log('\n⏳ Shutting down gracefully...');
  fastify.log.info('Received SIGINT, shutting down gracefully...');
  await fastify.close();
  const redis = getRedisClient();
  await redis.close();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  if (isDevelopment) console.log('\n⏳ Shutting down gracefully...');
  fastify.log.info('Received SIGTERM, shutting down gracefully...');
  await fastify.close();
  const redis = getRedisClient();
  await redis.close();
  process.exit(0);
});

startServer();

export default fastify;
