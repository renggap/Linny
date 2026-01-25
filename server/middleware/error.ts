/**
 * Error Handling Middleware (Fastify Compatible)
 *
 * Provides error handling for both Fastify and Express (via @fastify/express).
 */

export interface ApiError extends Error {
  statusCode?: number;
  details?: any;
}

/**
 * Async handler wrapper to catch errors in async route handlers
 * Compatible with both Fastify and Express
 */
export function asyncHandler(fn: (req: any, res: any, next?: any) => Promise<any>) {
  return (req: any, res: any, next?: any) => {
    Promise.resolve(fn(req, res, next)).catch((err) => {
      if (next) return next(err);

      // For Express routes without next, handle error directly
      const statusCode = err.statusCode || 500;
      const message = err.message || 'Internal server error';

      console.error(`[Error ${statusCode}] ${message}`, {
        path: req.url || req.path,
        method: req.method,
        error: err.stack
      });

      if (res.code) {
        res.code(statusCode).send({
          error: message,
          ...(process.env.NODE_ENV === 'development' && { stack: err.stack, details: err.details })
        });
      } else {
        res.status(statusCode).json({
          error: message,
          ...(process.env.NODE_ENV === 'development' && { stack: err.stack, details: err.details })
        });
      }
    });
  };
}

/**
 * 404 Not Found handler
 * Compatible with both Fastify and Express
 */
export function notFoundHandler(req: any, res: any): any {
  if (res.code) {
    return res.code(404).send({
      error: 'Not Found',
      path: req.url || req.path,
      method: req.method
    });
  }

  return res.status(404).json({
    error: 'Not Found',
    path: req.url || req.path,
    method: req.method
  });
}

// Note: The main error handler is set in server/index.ts using fastify.setErrorHandler()
// which is the Fastify way of handling global errors. The functions above
// are for Express route compatibility within @fastify/express.
