/**
 * Scope Contracts
 *
 * Scope contracts define the context (workspace/project) for operations.
 * Filters are defined separately to allow flexible composition.
 *
 * @module scope
 */

// Import types for use in this file
import type { WorkspaceScope } from './workspaceScope.js';
import type { ProjectScope } from './projectScope.js';

// Export everything from scope files
export * from './workspaceScope.js';
export * from './projectScope.js';

/**
 * Query scope type - the union of all scope types
 * Used for type-safe scope passing in queries
 */
export type QueryScope = WorkspaceScope | ProjectScope;

/**
 * Type guard to check if a scope has a project
 */
export function isProjectScope(scope: QueryScope): scope is ProjectScope {
  return 'projectId' in scope;
}

/**
 * Get the team ID from any scope type
 */
export function getTeamId(scope: QueryScope): string {
  return scope.teamId;
}
