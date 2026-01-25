import { z } from 'zod';

/**
 * Workspace Scope Schema
 *
 * Core scope contract for workspace-level operations.
 * All team-scoped queries require at least a teamId.
 *
 * This represents the minimal context needed to identify "where" an operation happens.
 */
export const workspaceScopeSchema = z.object({
  /** The team/workspace ID */
  teamId: z.string().min(1, 'Team ID is required'),
  /** The user ID performing the operation */
  userId: z.string().min(1, 'User ID is required'),
});

/**
 * Workspace scope type
 * Represents the context for workspace-level operations
 */
export type WorkspaceScope = z.infer<typeof workspaceScopeSchema>;

/**
 * Validates raw data as a workspace scope
 * @throws {ZodError} If validation fails
 */
export function parseWorkspaceScope(data: unknown): WorkspaceScope {
  return workspaceScopeSchema.parse(data);
}

/**
 * Safely parses raw data as a workspace scope
 * Returns undefined if validation fails
 */
export function safeParseWorkspaceScope(data: unknown): WorkspaceScope | undefined {
  const result = workspaceScopeSchema.safeParse(data);
  return result.success ? result.data : undefined;
}
