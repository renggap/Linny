import { z } from 'zod';
import { userRoleEnumSchema } from './enums.js';

/**
 * Team Entity
 */
export const teamSchema = z.object({
  /** Team ID */
  id: z.string(),
  /** Team name */
  name: z.string(),
  /** Team icon (emoji or short string) */
  icon: z.string(),
  /** Whether the team is in stealth mode (only visible to members) */
  isStealth: z.boolean().optional().default(false),
  /** Array of user IDs who are members of this team */
  members: z.array(z.string()),
  /** When the team was created */
  createdAt: z.coerce.date(),
  /** When the team was last updated */
  updatedAt: z.coerce.date(),
});

export type Team = z.infer<typeof teamSchema>;

/**
 * Team Member with Role (for team-specific permissions)
 */
export const teamMemberSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().email(),
  avatarUrl: z.string().url().optional().nullable(),
  role: userRoleEnumSchema,
});

export type TeamMember = z.infer<typeof teamMemberSchema>;
