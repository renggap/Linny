/**
 * Scope-aware Query Keys
 *
 * Provides utilities for generating namespaced query keys based on workspace scope.
 * This prevents data leaking across workspaces by ensuring cache keys are scoped to teamId.
 *
 * Key pattern: ['scope', teamId, entity, ...params]
 *
 * When teamId changes, all previous scope queries become unreachable and are
 * automatically garbage collected by TanStack Query.
 */

import type { IssueFilters } from '../types';


// ============================================================================
// ISSUE QUERY KEYS
// ============================================================================

/**
 * Base key for issue queries
 */
export const issueKeys = {
  // All issues keys start with this pattern
  all: (teamId: string) => ['scope', teamId, 'issues'] as const,

  // List with filters - use stable query key by spreading filter values
  filtered: (teamId: string, filters: IssueFilters) =>
    ['scope', teamId, 'issues', 'list', filters.teamId, filters.projectId, filters.status, filters.assigneeId, filters.search] as const,

  // Single issue by ID
  detail: (teamId: string, issueId: string) =>
    ['scope', teamId, 'issues', 'detail', issueId] as const,

  // Issues for a project
  project: (teamId: string, projectId: string) =>
    ['scope', teamId, 'issues', 'project', projectId] as const,
};

// ============================================================================
// PROJECT QUERY KEYS
// ============================================================================

export const projectKeys = {
  all: (teamId: string) => ['scope', teamId, 'projects'] as const,

  detail: (teamId: string, projectId: string) =>
    ['scope', teamId, 'projects', 'detail', projectId] as const,
};

// ============================================================================
// TEAM QUERY KEYS
// ============================================================================

export const teamKeys = {
  all: () => ['teams'] as const, // Teams are global, not scoped

  detail: (teamId: string) => ['teams', 'detail', teamId] as const,
};

// ============================================================================
// USER QUERY KEYS
// ============================================================================

export const userKeys = {
  all: () => ['users'] as const, // Users are global

  current: () => ['users', 'current'] as const,

  workspaceMembers: (teamId: string) =>
    ['scope', teamId, 'users', 'members'] as const,
};

// ============================================================================
// ACTIVITY QUERY KEYS
// ============================================================================

export const activityKeys = {
  all: (teamId: string) => ['scope', teamId, 'activities'] as const,

  project: (teamId: string, projectId: string) =>
    ['scope', teamId, 'activities', 'project', projectId] as const,
};

// ============================================================================
// COMMENT QUERY KEYS
// ============================================================================

export const commentKeys = {
  forIssue: (teamId: string, issueId: string) =>
    ['scope', teamId, 'comments', 'issue', issueId] as const,
};

// ============================================================================
// NOTIFICATION QUERY KEYS
// ============================================================================

export const notificationKeys = {
  all: () => ['notifications'] as const, // Notifications are per-user, not scoped
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Check if a query key belongs to a specific scope
 */
export function isScopeKey(key: unknown[], teamId: string): boolean {
  return (
    Array.isArray(key) &&
    key.length >= 2 &&
    key[0] === 'scope' &&
    key[1] === teamId
  );
}

/**
 * Extract teamId from a scoped query key
 */
export function getScopeTeamId(key: unknown[]): string | null {
  if (Array.isArray(key) && key.length >= 2 && key[0] === 'scope') {
    return key[1] as string;
  }
  return null;
}
