import { z } from 'zod';
import { workspaceScopeSchema } from './workspaceScope.js';

/**
 * Project Scope Schema
 *
 * Extends workspace scope with project context.
 * Required for operations that target a specific project within a workspace.
 */
export const projectScopeSchema = workspaceScopeSchema.extend({
  /** The project ID within the workspace */
  projectId: z.string().min(1, 'Project ID is required'),
});

/**
 * Project scope type
 * Represents the context for project-level operations
 */
export type ProjectScope = z.infer<typeof projectScopeSchema>;

/**
 * Validates raw data as a project scope
 * @throws {ZodError} If validation fails
 */
export function parseProjectScope(data: unknown): ProjectScope {
  return projectScopeSchema.parse(data);
}

/**
 * Safely parses raw data as a project scope
 * Returns undefined if validation fails
 */
export function safeParseProjectScope(data: unknown): ProjectScope | undefined {
  const result = projectScopeSchema.safeParse(data);
  return result.success ? result.data : undefined;
}
