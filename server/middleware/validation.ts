import { Request, Response, NextFunction } from 'express';
import { AnyZodObject, ZodError } from 'zod';

/**
 * Validation middleware factory
 * Validates request body, params, and query against a Zod schema
 */
export function validate(schema: AnyZodObject, target: 'body' | 'params' | 'query' | 'all' = 'body') {
  return (req: Request, res: Response, next: NextFunction): void | Response => {
    console.log('[Validation Middleware] Entry - target:', target, 'body keys:', req.body ? Object.keys(req.body) : 'no body');
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
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        // DIAGNOSTIC: Log validation errors
        console.log('[Validation] Failed for', target, '- Data:', JSON.stringify(dataToValidate));
        console.log('[Validation] Errors:', JSON.stringify(error.errors));

        return res.status(400).json({
          error: 'Validation failed',
          details: error.errors.map(e => ({
            field: e.path.join('.'),
            message: e.message
          }))
        });
      }
      return next(error);
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
