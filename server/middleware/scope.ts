/**
 * Scope Validation Middleware (Express/Fastify Compatible)
 *
 * Validates that requests include proper scope (teamId, projectId) and user context.
 * Uses Zod schemas from @neo-linear/contracts for runtime validation.
 * Compatible with both Fastify and Express (via @fastify/express).
 */

import { ZodError } from 'zod';
import type { AuthRequest } from './auth.js';

// Import scope schemas from contracts package
import {
  workspaceScopeSchema,
  projectScopeSchema,
  type WorkspaceScope,
  type ProjectScope
} from '@neo-linear/contracts/scope';

/**
 * Extended request types with scope information
 */
export interface ScopedRequest extends AuthRequest {
  scope?: WorkspaceScope | ProjectScope;
}

export interface WorkspaceScopedRequest extends AuthRequest {
  scope: WorkspaceScope;
}

export interface ProjectScopedRequest extends AuthRequest {
  scope: ProjectScope;
}

/**
 * Scope validation options
 */
export interface ScopeValidationOptions {
  /** Whether projectId is required (default: false) */
  requireProject?: boolean;
  /** Source locations for scope parameters (default: ['query', 'body']) */
  sources?: Array<'query' | 'body' | 'params'>;
}

/**
 * Parse query string from URL (for Fastify-Express compatibility)
 * Returns parsed query parameters as a key-value record
 */
function parseQueryString(url: string | undefined): Record<string, string> {
  if (!url) return {};

  // Extract query string from URL
  const queryStart = url.indexOf('?');
  if (queryStart === -1) return {};

  const queryString = url.slice(queryStart + 1);
  const params: Record<string, string> = {};

  // Parse key=value pairs
  queryString.split('&').forEach(pair => {
    const [key, value] = pair.split('=');
    if (key) {
      params[key] = value ? decodeURIComponent(value.replace(/\+/g, ' ')) : '';
    }
  });

  return params;
}

/**
 * Scope validation middleware factory
 * Validates teamId and optionally projectId from request sources
 */
export function validateScope(options: ScopeValidationOptions = {}) {
  const { requireProject = false, sources = ['query', 'body'] } = options;

  // Select appropriate schema based on options
  const schema = requireProject ? projectScopeSchema : workspaceScopeSchema;

  return (req: ScopedRequest, res: any, next?: any): any => {
    try {
      // Extract scope data from specified sources
      const scopeData: Record<string, string | undefined> = {};

      for (const source of sources) {
        if (source === 'query') {
          let query = req.query as any;

          // Fallback: If req.query is empty, parse from URL (Fastify-Express compatibility)
          if (!query || Object.keys(query).length === 0) {
            const rawUrl = (req as any).url || (req as any).originalUrl;
            query = parseQueryString(rawUrl);
          }

          // Handle query parameters which can be string | string[] | undefined
          if (query) {
            if (!scopeData.teamId) {
              const teamIdValue = query.teamId;
              scopeData.teamId = Array.isArray(teamIdValue) ? teamIdValue[0] : teamIdValue;
            }
            if (!scopeData.projectId) {
              const projectIdValue = query.projectId;
              scopeData.projectId = Array.isArray(projectIdValue) ? projectIdValue[0] : projectIdValue;
            }
          }
        }
        if (source === 'body') {
          const body = req.body as Record<string, string | undefined> | undefined;
          if (body) {
            if (!scopeData.teamId) scopeData.teamId = body.teamId;
            if (!scopeData.projectId) scopeData.projectId = body.projectId;
          }
        }
        if (source === 'params') {
          const params = req.params as Record<string, string | undefined>;
          if (!scopeData.teamId) scopeData.teamId = params.teamId;
          if (!scopeData.projectId) scopeData.projectId = params.projectId;
        }
      }

      // Ensure userId is available from auth middleware
      if (!req.userId) {
        if (res.code) {
          return res.code(401).send({ error: 'Unauthorized: Authentication required' });
        }
        return res.status(401).json({ error: 'Unauthorized: Authentication required' });
      }

      // Add userId to scope data for validation
      scopeData.userId = req.userId;

      // Validate against schema
      const validatedScope = schema.parse(scopeData);

      // Attach validated scope to request
      req.scope = validatedScope;

      if (next) return next();
      return;
    } catch (error) {
      if (error instanceof ZodError) {
        const response = {
          error: 'Scope validation failed',
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
 * Workspace scope validation (teamId + userId required)
 * Use for workspace-level operations like listing issues, projects
 */
export function validateWorkspaceScope(sources?: Array<'query' | 'body' | 'params'>) {
  return validateScope({ requireProject: false, sources });
}

/**
 * Project scope validation (teamId + projectId + userId required)
 * Use for project-specific operations like creating issues
 */
export function validateProjectScope(sources?: Array<'query' | 'body' | 'params'>) {
  return validateScope({ requireProject: true, sources });
}

/**
 * Extract scope from request for use in route handlers
 * Returns the validated scope or throws if not available
 */
export function getScope(req: ScopedRequest): WorkspaceScope | ProjectScope {
  if (!req.scope) {
    throw new Error('Scope not validated - use validateScope middleware first');
  }
  return req.scope;
}

/**
 * Check if the current scope is a project scope
 */
export function isProjectScope(scope: WorkspaceScope | ProjectScope): scope is ProjectScope {
  return 'projectId' in scope && typeof scope.projectId === 'string';
}
