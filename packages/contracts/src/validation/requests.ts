import { z } from 'zod';
import { workspaceScopeSchema, projectScopeSchema } from '../scope/index.js';
import { issueFiltersSchema } from '../filters/index.js';
import {
  
  issueStatusEnumSchema,
  issuePriorityEnumSchema,
  
} from '../entities/index.js';

// ============================================================================
// AUTH REQUESTS
// ============================================================================

/**
 * Register request schema
 */
export const registerRequestSchema = z.object({
  name: z.string()
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name must be less than 100 characters')
    .trim()
    .regex(/^[a-zA-Z\s\-']+$/, 'Name contains invalid characters'),
  email: z.string().email('Invalid email address').max(255, 'Email must be less than 255 characters'),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password must be less than 128 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
});

export type RegisterRequest = z.infer<typeof registerRequestSchema>;

/**
 * Login request schema
 */
export const loginRequestSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required').max(128, 'Password is too long'),
});

export type LoginRequest = z.infer<typeof loginRequestSchema>;

// ============================================================================
// TEAM REQUESTS
// ============================================================================

/**
 * Create team request schema
 */
export const createTeamRequestSchema = z.object({
  name: z.string().min(1, 'Team name is required').max(100, 'Team name must be less than 100 characters').trim(),
  icon: z.string().max(10, 'Icon must be less than 10 characters').optional(),
});

export type CreateTeamRequest = z.infer<typeof createTeamRequestSchema>;

// ============================================================================
// PROJECT REQUESTS
// ============================================================================

/**
 * Create project request schema with scope
 */
export const createProjectRequestSchema = projectScopeSchema.extend({
  name: z.string().min(1, 'Project name is required').max(200, 'Project name must be less than 200 characters').trim(),
  identifier: z.string().length(3, 'Identifier must be exactly 3 characters').regex(/^[A-Z0-9]+$/, 'Identifier must be uppercase letters and numbers only'),
  icon: z.string().max(10, 'Icon must be less than 10 characters').optional(),
  description: z.string().max(2000, 'Description must be less than 2000 characters').optional(),
  isPublic: z.boolean().optional(),
  publicSlug: z.string().regex(/^[a-z0-9-]+$/, 'Public slug must contain only lowercase letters, numbers, and hyphens').optional().or(z.literal('')),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Start date must be YYYY-MM-DD format').optional(),
  targetDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Target date must be YYYY-MM-DD format').optional(),
});

export type CreateProjectRequest = z.infer<typeof createProjectRequestSchema>;

/**
 * Update project request schema
 */
export const updateProjectRequestSchema = createProjectRequestSchema.partial().extend({
  leadId: z.string().optional().nullable(),
});

export type UpdateProjectRequest = z.infer<typeof updateProjectRequestSchema>;

// ============================================================================
// ISSUE REQUESTS
// ============================================================================

/**
 * Create issue request schema with scope
 */
export const createIssueRequestSchema = projectScopeSchema.extend({
  title: z.string().min(1, 'Title is required').max(500, 'Title must be less than 500 characters').trim(),
  description: z.string().max(10000, 'Description must be less than 10000 characters').optional(),
  status: issueStatusEnumSchema.optional(),
  priority: issuePriorityEnumSchema.optional(),
  assigneeIds: z.array(z.string()).optional(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Start date must be YYYY-MM-DD format').optional(),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Due date must be YYYY-MM-DD format').optional(),
  parentId: z.string().optional(),
});

export type CreateIssueRequest = z.infer<typeof createIssueRequestSchema>;

/**
 * Update issue request schema
 */
export const updateIssueRequestSchema = createIssueRequestSchema.partial().extend({
  id: z.string().min(1, 'Issue ID is required'),
});

export type UpdateIssueRequest = z.infer<typeof updateIssueRequestSchema>;

/**
 * Update issue status request schema
 */
export const updateIssueStatusRequestSchema = z.object({
  status: issueStatusEnumSchema,
});

export type UpdateIssueStatusRequest = z.infer<typeof updateIssueStatusRequestSchema>;

// ============================================================================
// QUERY REQUESTS (Scope + Filters)
// ============================================================================

/**
 * Issues query request schema
 * Combines workspace scope with issue filters
 */
export const issuesQueryRequestSchema = workspaceScopeSchema.extend({
  // Optional project filter within the workspace
  projectId: z.string().optional(),

  // Filters from the filters contract
  ...issueFiltersSchema.shape,
});

export type IssuesQueryRequest = z.infer<typeof issuesQueryRequestSchema>;

/**
 * Activities query request schema
 */
export const activitiesQueryRequestSchema = workspaceScopeSchema.extend({
  // Optional project filter within the workspace
  projectId: z.string().optional(),

  // Limit for pagination
  limit: z.coerce.number()
    .int('Limit must be an integer')
    .min(1, 'Limit must be at least 1')
    .max(500, 'Limit must be at most 500')
    .optional(),
});

export type ActivitiesQueryRequest = z.infer<typeof activitiesQueryRequestSchema>;

// ============================================================================
// COMMENT REQUESTS
// ============================================================================

/**
 * Create comment request schema
 */
export const createCommentRequestSchema = z.object({
  content: z.string().min(1, 'Comment content is required').max(5000, 'Comment must be less than 5000 characters').trim(),
  issueId: z.string().min(1, 'Issue ID is required'),
});

export type CreateCommentRequest = z.infer<typeof createCommentRequestSchema>;

// ============================================================================
// NOTIFICATION REQUESTS
// ============================================================================

/**
 * Mark notification read request schema
 */
export const markNotificationReadRequestSchema = z.object({
  id: z.string().min(1, 'Notification ID is required'),
});

export type MarkNotificationReadRequest = z.infer<typeof markNotificationReadRequestSchema>;
