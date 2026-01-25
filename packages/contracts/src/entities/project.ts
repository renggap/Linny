import { z } from 'zod';
import { teamMemberSchema } from './team.js';

/**
 * Project Link Entity
 */
export const projectLinkSchema = z.object({
  id: z.string(),
  title: z.string(),
  url: z.string().url(),
  createdAt: z.coerce.date(),
});

export type ProjectLink = z.infer<typeof projectLinkSchema>;

/**
 * Project Entity
 */
export const projectSchema = z.object({
  /** Project ID */
  id: z.string(),
  /** Project name */
  name: z.string(),
  /** Project identifier (e.g., "ENG", "LIN") */
  identifier: z.string(),
  /** Project icon (emoji or short string) */
  icon: z.string(),
  /** Team ID this project belongs to */
  teamId: z.string(),
  /** Project description */
  description: z.string().optional(),
  /** Whether the project is publicly accessible */
  isPublic: z.boolean().optional().default(false),
  /** Public slug for sharing */
  publicSlug: z.string().optional().nullable(),
  /** User ID of the project lead */
  leadId: z.string().optional().nullable(),
  /** Start date (YYYY-MM-DD format) */
  startDate: z.string().optional().nullable(),
  /** Target/due date (YYYY-MM-DD format) */
  targetDate: z.string().optional().nullable(),
  /** Array of user IDs who are members of this project */
  members: z.array(z.string()),
  /** Associated links */
  links: z.array(projectLinkSchema).optional().default([]),
  /** Members with roles (team-specific) */
  membersWithRoles: z.array(teamMemberSchema).optional(),
  /** When the project was created */
  createdAt: z.coerce.date(),
  /** When the project was last updated */
  updatedAt: z.coerce.date(),
});

export type Project = z.infer<typeof projectSchema>;
