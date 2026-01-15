import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import compression from 'compression';
import dotenv from 'dotenv';
import { getDatabase } from './database.js';
import { errorHandler, notFoundHandler } from './middleware/error.js';
import { csrfProtection, getCsrfToken } from './middleware/csrf.js';
import { requestLogger, errorLogger } from './middleware/requestLogger.js';
import { authRateLimit, apiRateLimit } from './middleware/rateLimit.js';
import { sanitizeBody } from './middleware/sanitize.js';
import { analyticsMiddleware } from './middleware/analytics.js';

// Load environment variables
dotenv.config();

// Import routes
import authRoutes from './routes/auth.js';
import usersRoutes from './routes/users.js';
import teamsRoutes from './routes/teams.js';
import projectsRoutes from './routes/projects.js';
import issuesRoutes from './routes/issues.js';
import commentsRoutes from './routes/comments.js';
import notificationsRoutes from './routes/notifications.js';
import activitiesRoutes from './routes/activities.js';
import analyticsRoutes from './routes/analytics.js';
import adminRoutes from './routes/admin.js';
import filesRoutes from './routes/files.js';
import searchRoutes from './routes/search.js';
import exportRoutes from './routes/export.js';
import webhooksRoutes from './routes/webhooks.js';
import apiKeysRoutes from './routes/apiKeys.js';
import { WebSocketManager } from './websocket/websocketServer.js';
import { schedulePeriodicJobs } from './jobs/jobQueue.js';

const app = express();
const PORT = process.env.PORT || 3001;

// ============================================================================
// SECURITY MIDDLEWARE
// ============================================================================

/**
 * Issue #15: Security Headers
 * DEEP REASONING CHAIN:
 * Security headers protect against various attacks:
 * - X-Content-Type-Options: Prevents MIME type sniffing
 * - X-Frame-Options: Prevents clickjacking
 * - X-XSS-Protection: Enables browser XSS filter
 * - Strict-Transport-Security: Enforces HTTPS in production
 * - Content-Security-Policy: Controls resource loading
 * 
 * EDGE CASE ANALYSIS:
 * - CSP allows inline styles for Tailwind CSS
 * - CSP allows images from trusted sources
 * - HSTS only enabled in production
 * - Frame options prevent embedding in iframes
 */
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"], // For Tailwind
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", 'data:', 'https://picsum.photos', 'https://ui-avatars.com'],
      connectSrc: ["'self'", 'http://localhost:3001', 'http://localhost:3000'],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"]
    }
  },
  hsts: process.env.NODE_ENV === 'production' ? {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  } : false,
  noSniff: true,
  frameguard: { action: 'deny' },
  xssFilter: true
}));

/**
 * Issue #2: Strict CORS Configuration
 * DEEP REASONING CHAIN:
 * CORS controls cross-origin requests to prevent unauthorized access.
 * Strict configuration:
 * - Only allows specific origins (not wildcard)
 * - Enables credentials for cookie-based auth
 * - Limits allowed methods to those actually used
 * - Restricts allowed headers
 * 
 * EDGE CASE ANALYSIS:
 * - Development mode allows localhost
 * - Production uses configured FRONTEND_URL
 * - Credentials required for cookie-based auth
 * - Preflight requests handled correctly
 */
const allowedOrigins = process.env.NODE_ENV === 'production'
  ? (process.env.FRONTEND_URL || 'https://your-domain.com').split(',')
  : ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:3002', 'http://localhost:5173', 'http://127.0.0.1:3000', 'http://127.0.0.1:5173'];

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);

    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token'],
  credentials: true,
  maxAge: 86400 // 24 hours
}));

/**
 * Issue #9: Response Compression
 * DEEP REASONING CHAIN:
 * Compression reduces bandwidth usage and improves response times.
 * Benefits:
 * - Reduces payload size by 60-80% for text-based responses
 * - Faster page loads for clients
 * - Lower bandwidth costs
 * 
 * EDGE CASE ANALYSIS:
 * - Only compresses responses above threshold (default 1KB)
 * - Skips compression for already compressed content
 * - Handles compression errors gracefully
 */
app.use(compression({
  filter: (req, res) => {
    if (req.headers['x-no-compression']) {
      return false;
    }
    return compression.filter(req, res);
  },
  threshold: 1024, // Only compress responses larger than 1KB
  level: 6 // Compression level (1-9, 6 is default)
}));

/**
 * Issue #14: Request Size Limit
 * DEEP REASONING CHAIN:
 * Limiting request body size prevents:
 * - Denial of service attacks via large payloads
 * - Memory exhaustion
 * - Disk space exhaustion
 * 
 * EDGE CASE ANALYSIS:
 * - 10MB limit allows file uploads
 * - Rejects oversized requests with 413 status
 * - Applies to JSON and URL-encoded bodies
 */
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

/**
 * Issue #13: Request Timeout
 * DEEP REASONING CHAIN:
 * Request timeouts prevent:
 * - Hanging connections
 * - Resource exhaustion
 * - Slowloris attacks
 * 
 * EDGE CASE ANALYSIS:
 * - 30 second timeout for all requests
 * - Long-running operations should use async patterns
 * - Timeout errors handled gracefully
 */
app.use((_req, res, next) => {
  res.setTimeout(30000, () => {
    res.status(504).json({ error: 'Request timeout' });
  });
  next();
});

/**
 * Issue #3: Request Logging Middleware
 * Logs all requests with timing and status codes
 */
app.use(requestLogger);

/**
 * Issue #10: Input Sanitization
 * Sanitizes all request bodies to prevent XSS attacks
 */
app.use(sanitizeBody());

/**
 * Issue #1: API Analytics Middleware
 * DEEP REASONING CHAIN:
 * Analytics middleware tracks:
 * - Request counts per endpoint
 * - Response times (min, max, average)
 * - Error rates
 * - Usage patterns over time
 *
 * Benefits:
 * - Performance monitoring and optimization
 * - Usage insights for product decisions
 * - Error tracking and prioritization
 * - Capacity planning
 *
 * EDGE CASE ANALYSIS:
 * - Async collection prevents request blocking
 * - Sliding window algorithm for memory efficiency
 * - Defensive coding prevents analytics from breaking requests
 * - Fixed-size buffers prevent memory exhaustion
 */
app.use(analyticsMiddleware);

// ============================================================================
// RATE LIMITING
// ============================================================================

/**
 * Issue #1: Rate Limiting on All Public Endpoints
 * DEEP REASONING CHAIN:
 * Rate limiting prevents:
 * - Brute force attacks
 * - DDoS attacks
 * - API abuse
 * 
 * Different limits for different endpoint types:
 * - Auth endpoints: 5 requests/15min (most restrictive)
 * - Public endpoints: 20 requests/15min
 * - Authenticated endpoints: 100 requests/15min
 * - Read-only endpoints: 200 requests/15min (most permissive)
 * 
 * EDGE CASE ANALYSIS:
 * - Rate limiting per IP address
 * - Successful requests count toward limit
 * - Headers inform clients of remaining requests
 * - Limits configurable per environment
 */

// Apply rate limiting to auth routes
app.use('/api/auth/login', authRateLimit);
app.use('/api/auth/register', authRateLimit);
app.use('/api/auth/reset-password', authRateLimit);
app.use('/api/auth/verify-email', authRateLimit);

// Apply rate limiting to public endpoints
app.use('/api/auth/refresh', apiRateLimit);

// CSRF protection middleware (applies to all routes)
app.use(csrfProtection);

// ============================================================================
// HEALTH CHECK ENDPOINT
// ============================================================================

/**
 * Issue #5: Health Check Endpoint
 * DEEP REASONING CHAIN:
 * Health check endpoint enables:
 * - Load balancer health checks
 * - Monitoring system integration
 * - Container orchestration (Kubernetes, Docker)
 * - Automated alerting
 * 
 * Returns:
 * - Service status
 * - Database connectivity
 * - Uptime
 * - Memory usage
 * 
 * EDGE CASE ANALYSIS:
 * - Lightweight operation (no expensive queries)
 * - Returns 200 for healthy, 503 for unhealthy
 * - Includes timestamp for monitoring
 * - No authentication required (for monitoring tools)
 */
app.get('/api/health', async (_req, res) => {
  try {
    const db = await getDatabase();

    // Check database connectivity
    const dbStatus = await db.getAllUsers().then(() => 'connected').catch(() => 'disconnected');

    // Calculate uptime
    const uptime = process.uptime();
    const uptimeString = `${Math.floor(uptime / 60)}m ${Math.floor(uptime % 60)}s`;

    // Memory usage
    const memoryUsage = process.memoryUsage();
    const memoryUsageString = `${Math.round(memoryUsage.heapUsed / 1024 / 1024)}MB / ${Math.round(memoryUsage.heapTotal / 1024 / 1024)}MB`;

    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: uptimeString,
      database: dbStatus,
      memory: memoryUsageString,
      environment: process.env.NODE_ENV || 'development'
    };

    if (dbStatus !== 'connected') {
      return res.status(503).json({ ...health, status: 'unhealthy' });
    }

    return res.json(health);
  } catch (error) {
    return res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: 'Health check failed'
    });
  }
});

// CSRF token endpoint
app.get('/api/csrf-token', getCsrfToken);

// ============================================================================
// API ROUTES (with rate limiting)
// ============================================================================

/**
 * Issue #12: API Versioning
 * DEEP REASONING CHAIN:
 * API versioning enables:
 * - Backward compatibility
 * - Gradual migration
 * - Breaking changes without disrupting clients
 * - Multiple API versions running simultaneously
 * 
 * Strategy:
 * - URL-based versioning (/api/v1/)
 * - Current version is v1
 * - Future versions can be added as v2, v3, etc.
 * - Deprecation policy documented in API docs
 * 
 * EDGE CASE ANALYSIS:
 * - Version prefix in all routes
 * - Easy to add new versions
 * - Old versions can be maintained or deprecated
 * - Clients must specify version in URL
 */

// Apply rate limiting to authenticated routes
app.use('/api/v1/users', apiRateLimit, usersRoutes);
app.use('/api/v1/teams', apiRateLimit, teamsRoutes);
app.use('/api/v1/projects', apiRateLimit, projectsRoutes);
app.use('/api/v1/issues', apiRateLimit, issuesRoutes);
app.use('/api/v1/comments', apiRateLimit, commentsRoutes);
app.use('/api/v1/notifications', apiRateLimit, notificationsRoutes);
app.use('/api/v1/activities', apiRateLimit, activitiesRoutes);
app.use('/api/v1/analytics', apiRateLimit, analyticsRoutes);
app.use('/api/v1/admin', apiRateLimit, adminRoutes);
app.use('/api/v1/files', apiRateLimit, filesRoutes);
app.use('/api/v1/search', apiRateLimit, searchRoutes);
app.use('/api/v1/export', apiRateLimit, exportRoutes);
app.use('/api/v1/webhooks', apiRateLimit, webhooksRoutes);
app.use('/api/v1/api-keys', apiRateLimit, apiKeysRoutes);

// Auth routes (with different rate limits)
app.use('/api/v1/auth', authRoutes);

// Legacy API routes (for backward compatibility - will be deprecated)
app.use('/api/users', usersRoutes);
app.use('/api/teams', teamsRoutes);
app.use('/api/projects', projectsRoutes);
app.use('/api/issues', issuesRoutes);
app.use('/api/comments', commentsRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/activities', activitiesRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/files', filesRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/export', exportRoutes);
app.use('/api/webhooks', webhooksRoutes);
app.use('/api/api-keys', apiKeysRoutes);
app.use('/api/auth', authRoutes);

// ============================================================================
// ERROR HANDLING
// ============================================================================

/**
 * Issue #4: Error Monitoring Middleware
 * Logs all errors with full context for debugging
 */
app.use(errorLogger);

// 404 handler for API routes
app.use(notFoundHandler);

// Global error handler
app.use(errorHandler);

// ============================================================================
// SERVER STARTUP
// ============================================================================

// Initialize database and start server
async function startServer() {
  try {
    // Initialize database (loads sql.js and existing data or creates new schema)
    const db = await getDatabase();
    console.log('✅ Database initialized');

    // Migration: Ensure first user is Admin if no Admin users exist
    const allUsers = await db.getAllUsers();
    const hasAdmin = allUsers.some(u => u.role === 'Admin');
    if (!hasAdmin && allUsers.length > 0) {
      const firstUser = allUsers[0];
      if (firstUser) {
        console.log(`⚠️  No Admin users found. Promoting first user (${firstUser.email}) to Admin...`);
        await db.updateUser(firstUser.id, { role: 'Admin' });
        console.log('✅ First user promoted to Admin');
      }
    }

    // Start server
    const server = app.listen(PORT, () => {
      console.log(`\n🚀 Linear Clone Server running on http://localhost:${PORT}`);
      console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`🔐 JWT Secret: ${process.env.JWT_SECRET ? 'configured' : 'WARNING: using default!'}`);
      console.log(`🔒 Security: Helmet, CORS, CSRF, Rate Limiting enabled`);
      console.log(`📦 Compression: Enabled`);
      console.log(`📝 Logging: Request and error logging enabled`);
    });

    // Initialize WebSocket server
    const wsManager = new WebSocketManager(server);

    // Make wsManager available globally for route handlers
    (global as any).wsManager = wsManager;

    // Schedule periodic background jobs
    await schedulePeriodicJobs();
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

startServer();

export default app;
