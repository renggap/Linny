import { z } from 'zod';
import { userRoleEnumSchema } from './enums.js';

/**
 * User Entity
 */
export const userSchema = z.object({
  /** User ID */
  id: z.string(),
  /** User display name */
  name: z.string(),
  /** User email address */
  email: z.string().email(),
  /** User avatar URL */
  avatarUrl: z.string().url().optional().nullable(),
  /** Global user role */
  role: userRoleEnumSchema,
  /** When the user was created */
  createdAt: z.coerce.date(),
  /** When the user was last updated */
  updatedAt: z.coerce.date(),
});

export type User = z.infer<typeof userSchema>;
