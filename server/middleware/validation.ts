/**
 * Validation Middleware (Fastify Compatible)
 *
 * Validates request body, params, and query against Zod schemas.
 * Compatible with both Fastify and Express (via @fastify/express).
 */

import { AnyZodObject, ZodError } from 'zod';

/**
 * Validation middleware factory
 * Validates request body, params, and query against a Zod schema
 * Compatible with both Fastify and Express
 */
export function validate(schema: AnyZodObject, target: 'body' | 'params' | 'query' | 'all' = 'body') {
  return (req: any, res: any, next?: any): any => {
    let dataToValidate: Record<string, any> = {};

    try {
      if (target === 'body' || target === 'all') {
        Object.assign(dataToValidate, req.body);
      }
      if (target === 'params' || target === 'all') {
        Object.assign(dataToValidate, req.params);
      }
      if (target === 'query' || target === 'all') {
        Object.assign(dataToValidate, req.query);
      }

      schema.parse(dataToValidate);

      if (next) return next();
      return;
    } catch (error) {
      if (error instanceof ZodError) {
        // DIAGNOSTIC: Log validation errors
        console.log('[Validation] Failed for', target, '- Data:', JSON.stringify(dataToValidate));
        console.log('[Validation] Errors:', JSON.stringify(error.errors));

        const response = {
          error: 'Validation failed',
          details: error.errors.map(e => ({
            field: e.path.join('.'),
            message: e.message
          }))
        };

        if (res.code) {
          return res.code(400).send(response);
        }
        return res.status(400).json(response);
      }
      if (next) return next(error);
      return;
    }
  };
}

/**
 * Body validation shortcut
 */
export function validateBody(schema: AnyZodObject) {
  return validate(schema, 'body');
}

/**
 * Params validation shortcut
 */
export function validateParams(schema: AnyZodObject) {
  return validate(schema, 'params');
}

/**
 * Query validation shortcut
 */
export function validateQuery(schema: AnyZodObject) {
  return validate(schema, 'query');
}
