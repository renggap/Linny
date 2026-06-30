/**
 * Linny Contracts
 *
 * Shared contracts, schemas, and types for Linny.
 * Provides runtime validation (Zod) and compile-time type safety (TypeScript).
 *
 * @packageDocumentation
 */

// ============================================================================
// SCOPE CONTRACTS
// ============================================================================

export * from './scope/index.js';

// ============================================================================
// FILTER CONTRACTS
// ============================================================================

export * from './filters/index.js';

// ============================================================================
// ENTITY TYPES
// ============================================================================

export * from './entities/index.js';

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

export * from './validation/index.js';

// ============================================================================
// CONVENIENCE RE-EXPORTS
// ============================================================================

// Scope helpers
export { isProjectScope, getTeamId } from './scope/index.js';

// Filter helpers
export { parseIssueFilters, safeParseIssueFilters } from './filters/index.js';

// Scope parsers
export { parseWorkspaceScope, safeParseWorkspaceScope, parseProjectScope, safeParseProjectScope } from './scope/index.js';
