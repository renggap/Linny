import { z } from 'zod';

// Password requirements: min 8 chars, 1 uppercase, 1 lowercase, 1 number, max 128 chars
export const passwordSchema = z.string()
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password must be less than 128 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number')
  .regex(/^[^\s]+$/, 'Password must not contain whitespace');

export const emailSchema = z.string()
  .email('Invalid email address')
  .max(255, 'Email must be less than 255 characters')
  .toLowerCase();

// Valid user roles
export const userRoleSchema = z.enum(['Admin', 'Team Lead', 'Member', 'Viewer']);

// Valid statuses
export const statusSchema = z.enum(['Backlog', 'Todo', 'In Progress', 'In Review', 'Done', 'Canceled']);

// Valid priorities
export const prioritySchema = z.enum(['No Priority', 'Urgent', 'High', 'Medium', 'Low']);

// ID validation
export const idSchema = z.string()
  .min(1, 'ID is required')
  .max(100, 'ID is too long')
  .regex(/^[a-zA-Z0-9\-_]+$/, 'ID contains invalid characters');

// Date validation - accept both ISO datetime and date-only formats
export const dateSchema = z.string()
  .refine((val) => {
    // Accept ISO datetime (2024-01-15T00:00:00.000Z) or date-only (2024-01-15)
    // Also accept timezone offsets like +07:00 or -05:00
    if (/^\d{4}-\d{2}-\d{2}$/.test(val)) return true;
    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?(?:Z|[+-]\d{2}:\d{2})?$/.test(val)) return true;
    return false;
  }, 'Invalid date format')
  .optional();

// Slug validation (for public URLs)
export const slugSchema = z.string()
  .min(3, 'Slug must be at least 3 characters')
  .max(50, 'Slug must be less than 50 characters')
  .regex(/^[a-z0-9-]+$/, 'Slug must contain only lowercase letters, numbers, and hyphens')
  .optional();

// === AUTH SCHEMAS ===

export const registerSchema = z.object({
  name: z.string()
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name must be less than 100 characters')
    .trim()
    .regex(/^[a-zA-Z\s\-']+$/, 'Name contains invalid characters'),
  email: emailSchema,
  password: passwordSchema
});

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string()
    .min(1, 'Password is required')
    .max(128, 'Password is too long')
});

export const refreshTokenSchema = z.object({
  refreshToken: z.string()
    .min(1, 'Refresh token is required')
    .max(500, 'Refresh token is too long')
});

// === USER SCHEMAS ===

export const updateUserRoleSchema = z.object({
  role: userRoleSchema
});

export const updateProfileSchema = z.object({
  name: z.string()
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name must be less than 100 characters')
    .trim()
    .optional(),
  avatar_url: z.string()
    .url('Avatar URL must be a valid URL')
    .max(500, 'Avatar URL is too long')
    .optional()
});

// === TEAM SCHEMAS ===

export const createTeamSchema = z.object({
  name: z.string().min(1, 'Team name is required').max(100, 'Team name must be less than 100 characters').trim(),
  icon: z.string().max(10, 'Icon must be less than 10 characters').optional()
});

export const addTeamMemberSchema = z.object({
  userId: z.string().min(1, 'User ID is required')
});

// === PROJECT SCHEMAS ===

export const createProjectSchema = z.object({
  name: z.string().min(1, 'Project name is required').max(200, 'Project name must be less than 200 characters').trim(),
  identifier: z.string().length(3, 'Identifier must be exactly 3 characters').regex(/^[A-Z0-9]+$/, 'Identifier must be uppercase letters and numbers only'),
  icon: z.string().max(10, 'Icon must be less than 10 characters').optional(),
  teamId: z.string().min(1, 'Team ID is required'),
  description: z.string().max(2000, 'Description must be less than 2000 characters').optional(),
  isPublic: z.boolean().optional(),
  publicSlug: z.string().regex(/^[a-z0-9-]+$/, 'Public slug must contain only lowercase letters, numbers, and hyphens').optional().or(z.literal('')),
  startDate: dateSchema,
  targetDate: dateSchema
});

export const updateProjectSchema = createProjectSchema.partial().extend({
  leadId: z.string().optional().nullable(),
  lead_id: z.string().optional().nullable(),
  publicSlug: z.string().regex(/^[a-z0-9-]+$/, 'Public slug must contain only lowercase letters, numbers, and hyphens').optional().or(z.literal('')).nullable()
});

// === ISSUE SCHEMAS ===

export const createIssueSchema = z.object({
  title: z.string().min(1, 'Title is required').max(500, 'Title must be less than 500 characters').trim(),
  description: z.string().max(10000, 'Description must be less than 10000 characters').optional(),
  status: statusSchema.optional(),
  priority: prioritySchema.optional(),
  assigneeIds: z.array(z.string()).optional(),
  projectId: z.string().min(1, 'Project ID is required'),
  startDate: dateSchema,
  dueDate: dateSchema,
  parentId: z.string().optional(),
  blockedBy: z.array(z.string()).optional()
});

export const updateIssueSchema = createIssueSchema.partial().extend({
  id: z.string().min(1, 'Issue ID is required')
});

export const updateIssueStatusSchema = z.object({
  status: statusSchema
});

export const createSubtaskSchema = z.object({
  title: z.string().min(1, 'Title is required').max(500, 'Title must be less than 500 characters').trim()
});

export const setIssueDependenciesSchema = z.object({
  blockingIds: z.array(z.string())
});

// === COMMENT SCHEMAS ===

export const createCommentSchema = z.object({
  content: z.string().min(1, 'Comment content is required').max(5000, 'Comment must be less than 5000 characters').trim(),
  issueId: z.string().min(1, 'Issue ID is required')
});

// === NOTIFICATION SCHEMAS ===

export const markNotificationReadSchema = z.object({
  id: z.string().min(1, 'Notification ID is required')
});

// === QUERY PARAM SCHEMAS ===

export const issuesQuerySchema = z.object({
  teamId: z.string().optional(),
  projectId: z.string().optional(),
  status: statusSchema.optional(),
  assigneeId: z.string().optional(),
  search: z.string()
    .min(1, 'Search term must be at least 1 character')
    .max(100, 'Search term must be less than 100 characters')
    .trim()
    .optional(),
  page: z.coerce.number()
    .min(1, 'Page must be at least 1')
    .max(1000, 'Page number too large')
    .optional(),
  limit: z.coerce.number()
    .min(1, 'Limit must be at least 1')
    .max(100, 'Limit must be at most 100')
    .optional()
});

export const activitiesQuerySchema = z.object({
  projectId: z.string().optional(),
  limit: z.coerce.number()
    .min(1, 'Limit must be at least 1')
    .max(500, 'Limit must be at most 500')
    .optional()
});
