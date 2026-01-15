import { Router, Response } from 'express';
import { z } from 'zod';
import { getDatabase } from '../database.js';
import { AuthRequest, authenticate, requireAdmin } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/error.js';
import { apiRateLimit } from '../middleware/rateLimit.js';
import { updateUserRoleSchema } from '../validation/schemas.js';
import { validateParams, validateBody } from '../middleware/validation.js';
import { getUserAvatarUrl } from '../utils/avatar.js';
import { verifyPassword, hashPassword, validatePasswordStrength } from '../auth/password.js';

const router = Router();

/**
 * GET /api/users
 * Get all users (authenticated)
 */
router.get('/', authenticate, apiRateLimit, asyncHandler(async (_req: AuthRequest, res: Response) => {
  const db = await getDatabase();
  const users = await db.getAllUsers();
  // Remove password_hash, transform avatar_url to avatarUrl, and normalize
  const sanitizedUsers = users.map(({ password_hash: __pwd, avatar_url: __avatar, ...user }) => ({
    ...user,
    avatarUrl: getUserAvatarUrl({ name: user.name, avatar_url: user.avatar_url })
  }));
  res.json({ users: sanitizedUsers });
  return;
}));

/**
 * GET /api/users/:id
 * Get user by ID (authenticated)
 */
router.get('/:id', authenticate, apiRateLimit, asyncHandler(async (req: AuthRequest, res: Response) => {
  const db = await getDatabase();
  const userId = req.params.id;
  if (!userId) {
    return res.status(400).json({ error: 'User ID is required' });
  }

  const user = await db.getUserById(userId);

  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  // Remove password_hash and avatar_url, add normalized avatarUrl
  const { password_hash: __pwd, avatar_url: __avatar, ...sanitizedUser } = {
    ...user,
    avatarUrl: getUserAvatarUrl(user)
  };
  res.json({ user: sanitizedUser });
  return;
}));

/**
 * PATCH /api/users/:id
 * Update user profile (name, avatar_url)
 * Users can only update their own profile
 */
router.patch('/:id', authenticate, apiRateLimit, asyncHandler(async (req: AuthRequest, res: Response) => {
  const db = await getDatabase();
  const { id } = req.params;
  const { name, avatar_url } = req.body;

  if (!id) {
    return res.status(400).json({ error: 'User ID is required' });
  }

  // Users can only update their own profile
  if (id !== req.userId) {
    return res.status(403).json({ error: 'You can only update your own profile' });
  }

  const user = await db.getUserById(id);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  // Build updates object
  const updates: { name?: string; avatar_url?: string } = {};
  if (name !== undefined) updates.name = name;
  if (avatar_url !== undefined) updates.avatar_url = avatar_url;

  await db.updateUser(id, updates);

  const updatedUser = await db.getUserById(id);
  const { password_hash: _, ...sanitizedUser } = updatedUser!;
  res.json({ user: sanitizedUser });
  return;
}));

/**
 * PATCH /api/users/:id/role
 * Update user role (admin only)
 */
router.patch('/:id/role', authenticate, requireAdmin, validateParams(z.object({ id: z.string().min(1) })), validateBody(updateUserRoleSchema), asyncHandler(async (req: AuthRequest, res: Response) => {
  const db = await getDatabase();
  const { id } = req.params;
  const { role } = req.body;

  if (!id) {
    return res.status(400).json({ error: 'User ID is required' });
  }

  const user = await db.getUserById(id);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  // Prevent admin from changing their own role
  if (id === req.userId) {
    return res.status(400).json({ error: 'Cannot change your own role' });
  }

  await db.updateUser(id, { role });

  const updatedUser = await db.getUserById(id);
  const { password_hash: _, ...sanitizedUser } = updatedUser!;
  res.json({ user: sanitizedUser });
  return;
}));

/**
 * DELETE /api/users/:id
 * Remove user (admin only)
 */
router.delete('/:id', authenticate, requireAdmin, asyncHandler(async (req: AuthRequest, res: Response) => {
  const db = await getDatabase();
  const { id } = req.params;

  if (!id) {
    return res.status(400).json({ error: 'User ID is required' });
  }

  const user = await db.getUserById(id);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  // Prevent admin from deleting themselves
  if (id === req.userId) {
    return res.status(400).json({ error: 'Cannot delete your own account' });
  }

  await db.deleteUser(id);

  res.json({ message: 'User removed successfully' });
  return;
}));

/**
 * POST /api/users/:id/password
 * Change user password
 */
router.post('/:id/password', authenticate, apiRateLimit, asyncHandler(async (req: AuthRequest, res: Response) => {
  const db = await getDatabase();
  const { id } = req.params;
  const { currentPassword, newPassword } = req.body;

  if (!id || id !== req.userId) {
    return res.status(403).json({ error: 'Unauthorized: Access restricted' });
  }

  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: 'Missing parameters: current and new password required' });
  }

  const user = await db.getUserById(id);
  if (!user) {
    return res.status(404).json({ error: 'User not found: Synchronization failed' });
  }

  // Verify current password
  const isMatch = await verifyPassword(currentPassword, user.password_hash);
  if (!isMatch) {
    return res.status(401).json({ error: 'Authorization failed: Invalid current password' });
  }

  // Validate new password strength
  const strength = validatePasswordStrength(newPassword);
  if (!strength.valid) {
    return res.status(400).json({ error: strength.errors[0] });
  }

  // Hash and update
  const newHash = await hashPassword(newPassword);
  await db.updateUser(id, { password_hash: newHash });

  res.json({ message: 'Authorization phrase updated successfully' });
  return;
}));

export default router;
