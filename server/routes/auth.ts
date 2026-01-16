import { Router, Response } from 'express';
import { getDatabase } from '../database.js';
import { hashPassword, verifyPassword, validatePasswordStrength } from '../auth/password.js';
import { generateTokenPair, getRefreshTokenExpiryDate, verifyToken, TokenPayload } from '../auth/jwt.js';
import {
  sendEmail,
  generateToken as generateEmailToken,
  generateVerificationEmailHTML,
  generatePasswordResetEmailHTML
} from '../auth/email.js';
import {
  generateSecret,
  generateBackupCodes,
  generateQRCode,
  verifyTOTP
} from '../auth/twoFactor.js';
import { registerSchema, loginSchema, refreshTokenSchema } from '../validation/schemas.js';
import { validateBody } from '../middleware/validation.js';
import { authRateLimit, apiRateLimit } from '../middleware/rateLimit.js';
import { accountLockout, recordFailedAttempt, resetFailedAttempts } from '../middleware/accountLockout.js';
import { AuthRequest } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/error.js';

const router = Router();

/**
 * @route POST /api/auth/register
 * @description Register a new user account
 * @access Public
 * @rateLimit 5 requests per 15 minutes (IP-based)
 * @param {Object} req.body - Request body
 * @param {string} req.body.name - User's full name (2-100 characters)
 * @param {string} req.body.email - User's email address (must be valid email format)
 * @param {string} req.body.password - User's password (min 8 chars, must contain uppercase, lowercase, number, and special character)
 * @returns {Object} 201 - User created successfully
 * @returns {Object} 400 - Invalid request data or password doesn't meet requirements
 * @returns {Object} 409 - Email already registered
 * @example
 * // Request
 * POST /api/auth/register
 * {
 *   "name": "John Doe",
 *   "email": "john@example.com",
 *   "password": "SecurePass123!"
 * }
 *
 * // Response
 * {
 *   "user": {
 *     "id": "abc123",
 *     "name": "John Doe",
 *     "email": "john@example.com",
 *     "avatar_url": "https://ui-avatars.com/api/?name=John+Doe&background=random",
 *     "role": "Member",
 *     "email_verified": false,
 *     "created_at": "2024-01-01T00:00:00Z",
 *     "updated_at": "2024-01-01T00:00:00Z"
 *   },
 *   "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 * }
 * @notes
 * - First user registered automatically becomes Admin
 * - Refresh token is set in httpOnly cookie
 * - Email verification required for full access
 * - Password strength validated before creation
 */
router.post('/register', authRateLimit, validateBody(registerSchema), asyncHandler(async (req: AuthRequest, res: Response) => {
  const db = await getDatabase();
  const { name, email, password } = req.body;

  // Validate password strength
  const passwordValidation = validatePasswordStrength(password);
  if (!passwordValidation.valid) {
    return res.status(400).json({ error: 'Password does not meet requirements', details: passwordValidation.errors });
  }

  // Check if user already exists
  const existingUser = await db.getUserByEmail(email);
  if (existingUser) {
    return res.status(409).json({ error: 'Email already registered' });
  }

  // Check if this is first user - make them Administrator
  const allUsers = await db.getAllUsers();
  const isFirstUser = allUsers.length === 0;
  const role = isFirstUser ? 'Administrator' : 'Member';

  // Hash password
  const password_hash = await hashPassword(password);

  // Create user
  const newUser = await db.createUser({
    name,
    email,
    password_hash,
    avatar_url: undefined,
    role,
    email_verified: 0
  });

  // Generate tokens
  const payload: TokenPayload = {
    userId: newUser.id,
    email: newUser.email,
    role: newUser.role
  };

  const tokens = generateTokenPair(payload);

  // Store refresh token
  await db.createRefreshToken(newUser.id, tokens.refreshToken, getRefreshTokenExpiryDate());

  // Set httpOnly cookie for refresh token
  res.cookie('refreshToken', tokens.refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    path: '/'
  });

  // Return user without password and access token (refresh token in cookie)
  const { password_hash: _, ...userResponse } = newUser;
  res.status(201).json({
    user: userResponse,
    accessToken: tokens.accessToken
  });
  return;
}));

/**
 * @route POST /api/auth/login
 * @description Authenticate user with email and password
 * @access Public
 * @rateLimit 5 requests per 15 minutes (IP-based)
 * @param {Object} req.body - Request body
 * @param {string} req.body.email - User's email address
 * @param {string} req.body.password - User's password
 * @returns {Object} 200 - Login successful
 * @returns {Object} 401 - Invalid credentials
 * @example
 * // Request
 * POST /api/auth/login
 * {
 *   "email": "john@example.com",
 *   "password": "SecurePass123!"
 * }
 *
 * // Response
 * {
 *   "user": {
 *     "id": "abc123",
 *     "name": "John Doe",
 *     "email": "john@example.com",
 *     "avatar_url": "https://ui-avatars.com/api/?name=John+Doe&background=random",
 *     "role": "Member",
 *     "email_verified": true,
 *     "created_at": "2024-01-01T00:00:00Z",
 *     "updated_at": "2024-01-01T00:00:00Z"
 *   },
 *   "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 * }
 * @notes
 * - Account locked after 5 failed attempts (15 minute cooldown)
 * - Refresh token is set in httpOnly cookie
 * - If 2FA is enabled, additional verification required
 * - Failed attempts are tracked for security
 */
router.post('/login', accountLockout, authRateLimit, validateBody(loginSchema), asyncHandler(async (req: AuthRequest, res: Response) => {
  const db = await getDatabase();
  const { email, password } = req.body;

  // Find user by email
  const user = await db.getUserByEmail(email);
  if (!user) {
    recordFailedAttempt(email);
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  // Verify password
  const isValid = await verifyPassword(password, user.password_hash);
  if (!isValid) {
    recordFailedAttempt(email);
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  // Reset failed attempts on successful login
  resetFailedAttempts(email);

  // Generate tokens
  const payload: TokenPayload = {
    userId: user.id,
    email: user.email,
    role: user.role
  };

  const tokens = generateTokenPair(payload);

  // Store refresh token
  await db.createRefreshToken(user.id, tokens.refreshToken, getRefreshTokenExpiryDate());

  // Set httpOnly cookie for refresh token
  res.cookie('refreshToken', tokens.refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    path: '/'
  });

  // Return user without password and access token (refresh token in cookie)
  const { password_hash: _, ...userResponse } = user;
  res.json({
    user: userResponse,
    accessToken: tokens.accessToken
  });
  return;
}));

/**
 * @route POST /api/auth/refresh
 * @description Refresh access token using refresh token from httpOnly cookie
 * @access Public (requires valid refresh token in cookie)
 * @rateLimit 20 requests per 15 minutes (IP-based)
 * @returns {Object} 200 - Token refreshed successfully
 * @returns {Object} 401 - Invalid or expired refresh token
 * @example
 * // Request
 * POST /api/auth/refresh
 * (refresh token is read from httpOnly cookie)
 *
 * // Response
 * {
 *   "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
 *   "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 * }
 * @notes
 * - Refresh token is read from httpOnly cookie (not request body for security)
 * - Old refresh token is invalidated
 * - New refresh token is set in httpOnly cookie
 * - Access token is valid for 3 days
 * - Refresh token is valid for 7 days
 */
router.post('/refresh', apiRateLimit, asyncHandler(async (req: AuthRequest, res: Response) => {
  const db = await getDatabase();
  // Read refresh token from httpOnly cookie
  const refreshToken = req.cookies.refreshToken;

  if (!refreshToken) {
    return res.status(401).json({ error: 'Refresh token not found' });
  }

  // Verify refresh token
  const payload = verifyToken(refreshToken);
  if (!payload) {
    return res.status(401).json({ error: 'Invalid or expired refresh token' });
  }

  // Check if refresh token exists in database
  const storedToken = await db.getRefreshToken(refreshToken);
  if (!storedToken) {
    return res.status(401).json({ error: 'Refresh token not found or expired' });
  }

  // Get user to ensure they still exist
  const user = await db.getUserById(payload.userId);
  if (!user) {
    return res.status(401).json({ error: 'User not found' });
  }

  // Generate new tokens
  const newPayload: TokenPayload = {
    userId: user.id,
    email: user.email,
    role: user.role
  };

  const tokens = generateTokenPair(newPayload);

  // Store new refresh token and delete old one
  await db.deleteRefreshToken(refreshToken);
  await db.createRefreshToken(user.id, tokens.refreshToken, getRefreshTokenExpiryDate());

  // Set httpOnly cookie for new refresh token
  res.cookie('refreshToken', tokens.refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    path: '/'
  });

  // Return new access token (refresh token in cookie)
  res.json({
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken
  });
  return;
}));

/**
 * @route POST /api/auth/logout
 * @description Logout user by invalidating refresh token
 * @access Public (requires valid refresh token in cookie)
 * @rateLimit 20 requests per 15 minutes (IP-based)
 * @returns {Object} 200 - Logout successful
 * @example
 * // Request
 * POST /api/auth/logout
 *
 * // Response
 * {
 *   "message": "Logged out successfully"
 * }
 * @notes
 * - Refresh token is deleted from database
 * - httpOnly cookie is cleared
 * - Access token is not invalidated (will expire naturally)
 */
router.post('/logout', apiRateLimit, asyncHandler(async (req: AuthRequest, res: Response) => {
  const db = await getDatabase();
  const refreshToken = req.cookies.refreshToken;

  if (refreshToken) {
    await db.deleteRefreshToken(refreshToken);
  }

  // Clear httpOnly cookie
  res.clearCookie('refreshToken', {
    path: '/'
  });

  res.json({ message: 'Logged out successfully' });
  return;
}));

/**
 * @route GET /api/auth/me
 * @description Get current authenticated user information
 * @access Private (requires valid access token)
 * @rateLimit 100 requests per 15 minutes (user-based)
 * @header {string} Authorization - Bearer token
 * @returns {Object} 200 - User information
 * @returns {Object} 401 - Unauthorized (invalid or missing token)
 * @returns {Object} 404 - User not found
 * @example
 * // Request
 * GET /api/auth/me
 * Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
 *
 * // Response
 * {
 *   "user": {
 *     "id": "abc123",
 *     "name": "John Doe",
 *     "email": "john@example.com",
 *     "avatar_url": "https://ui-avatars.com/api/?name=John+Doe&background=random",
 *     "role": "Member",
 *     "email_verified": true,
 *     "created_at": "2024-01-01T00:00:00Z",
 *     "updated_at": "2024-01-01T00:00:00Z"
 *   }
 * }
 */
router.get('/me', asyncHandler(async (req: AuthRequest, res: Response) => {
  const db = await getDatabase();

  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const token = authHeader.substring(7);
  const payload = verifyToken(token);

  if (!payload) {
    return res.status(401).json({ error: 'Invalid token' });
  }

  const user = await db.getUserById(payload.userId);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  const { password_hash: _, ...userResponse } = user;
  res.json({ user: userResponse });
  return;
}));

/**
 * POST /api/v1/auth/verify-email
 * Verify email address with token
 */
router.post('/verify-email', authRateLimit, asyncHandler(async (req: AuthRequest, res: Response) => {
  const db = await getDatabase();
  const { token } = req.body;

  if (!token) {
    return res.status(400).json({ error: 'Token is required' });
  }

  // Find token in database
  const tokenData = await db.get(`
    SELECT * FROM email_verification_tokens
    WHERE token = ? AND expires_at > datetime("now")
  `, [token]);

  if (!tokenData) {
    return res.status(400).json({ error: 'Invalid or expired token' });
  }

  // Mark user as verified
  await db.run('UPDATE users SET email_verified = 1, updated_at = ? WHERE id = ?', [
    db.now(),
    tokenData.user_id
  ]);

  // Delete token
  await db.run('DELETE FROM email_verification_tokens WHERE id = ?', [tokenData.id]);

  res.json({ message: 'Email verified successfully' });
  return;
}));

/**
 * POST /api/v1/auth/resend-verification
 * Resend email verification token
 */
router.post('/resend-verification', authRateLimit, asyncHandler(async (req: AuthRequest, res: Response) => {
  const db = await getDatabase();
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ error: 'Email is required' });
  }

  const user = await db.getUserByEmail(email);
  if (!user) {
    // Don't reveal if user exists
    return res.json({ message: 'If email exists, verification email sent' });
  }

  if (user.email_verified) {
    return res.status(400).json({ error: 'Email already verified' });
  }

  // Generate new token
  const token = generateEmailToken();
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // 24 hours

  // Delete old tokens
  await db.run('DELETE FROM email_verification_tokens WHERE user_id = ?', [user.id]);

  // Create new token
  await db.run(`
    INSERT INTO email_verification_tokens (id, user_id, token, expires_at, created_at)
    VALUES (?, ?, ?, ?, ?)
  `, [db.generateId(), user.id, token, expiresAt, db.now()]);

  // Send email
  await sendEmail({
    to: user.email,
    subject: 'Verify Your Email Address',
    html: generateVerificationEmailHTML(token)
  });

  res.json({ message: 'Verification email sent' });
  return;
}));

/**
 * POST /api/v1/auth/request-password-reset
 * Request password reset
 */
router.post('/request-password-reset', authRateLimit, asyncHandler(async (req: AuthRequest, res: Response) => {
  const db = await getDatabase();
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ error: 'Email is required' });
  }

  const user = await db.getUserByEmail(email);
  if (!user) {
    // Don't reveal if user exists
    return res.json({ message: 'If email exists, reset link sent' });
  }

  // Generate token
  const token = generateEmailToken();
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // 1 hour

  // Delete old tokens
  await db.run('DELETE FROM password_reset_tokens WHERE user_id = ?', [user.id]);

  // Create new token
  await db.run(`
    INSERT INTO password_reset_tokens (id, user_id, token, expires_at, created_at)
    VALUES (?, ?, ?, ?, ?)
  `, [db.generateId(), user.id, token, expiresAt, db.now()]);

  // Send email
  await sendEmail({
    to: user.email,
    subject: 'Reset Your Password',
    html: generatePasswordResetEmailHTML(token)
  });

  res.json({ message: 'Password reset email sent' });
  return;
}));

/**
 * POST /api/v1/auth/reset-password
 * Reset password with token
 */
router.post('/reset-password', authRateLimit, asyncHandler(async (req: AuthRequest, res: Response) => {
  const db = await getDatabase();
  const { token, password } = req.body;

  if (!token || !password) {
    return res.status(400).json({ error: 'Token and password are required' });
  }

  // Validate password strength
  const passwordValidation = validatePasswordStrength(password);
  if (!passwordValidation.valid) {
    return res.status(400).json({ error: 'Password does not meet requirements', details: passwordValidation.errors });
  }

  // Find token
  const tokenData = await db.get(`
    SELECT * FROM password_reset_tokens
    WHERE token = ? AND expires_at > datetime("now")
  `, [token]);

  if (!tokenData) {
    return res.status(400).json({ error: 'Invalid or expired token' });
  }

  // Hash new password
  const password_hash = await hashPassword(password);

  // Update password
  await db.run('UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?', [
    password_hash,
    db.now(),
    tokenData.user_id
  ]);

  // Delete token
  await db.run('DELETE FROM password_reset_tokens WHERE id = ?', [tokenData.id]);

  // Delete all refresh tokens (force logout)
  await db.deleteAllRefreshTokensForUser(tokenData.user_id);

  res.json({ message: 'Password reset successfully' });
  return;
}));

/**
 * POST /api/v1/auth/setup-2fa
 * Setup two-factor authentication
 */
router.post('/setup-2fa', apiRateLimit, asyncHandler(async (req: AuthRequest, res: Response) => {
  const db = await getDatabase();
  const userId = req.userId;

  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // Generate secret and backup codes
  const secret = generateSecret();
  const backupCodes = generateBackupCodes();

  // Generate QR code
  const user = await db.getUserById(userId);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  const qrCode = await generateQRCode(secret, user.email);

  // Store in database (not enabled yet)
  await db.run(`
    INSERT OR REPLACE INTO two_factor_auth (id, user_id, secret, backup_codes, enabled, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `, [db.generateId(), userId, secret, JSON.stringify(backupCodes), 0, db.now(), db.now()]);

  res.json({
    secret,
    qrCode,
    backupCodes
  });
  return;
}));

/**
 * POST /api/v1/auth/enable-2fa
 * Enable 2FA after verification
 */
router.post('/enable-2fa', apiRateLimit, asyncHandler(async (req: AuthRequest, res: Response) => {
  const db = await getDatabase();
  const userId = req.userId;
  const { token } = req.body;

  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (!token) {
    return res.status(400).json({ error: 'Token is required' });
  }

  // Get 2FA settings
  const twoFactorData = await db.get(`
    SELECT * FROM two_factor_auth WHERE user_id = ?
  `, [userId]);

  if (!twoFactorData) {
    return res.status(400).json({ error: '2FA not setup' });
  }

  // Verify token
  const isValid = verifyTOTP(twoFactorData.secret, token);
  if (!isValid) {
    return res.status(400).json({ error: 'Invalid token' });
  }

  // Enable 2FA
  await db.run(`
    UPDATE two_factor_auth SET enabled = 1, updated_at = ? WHERE user_id = ?
  `, [db.now(), userId]);

  res.json({ message: '2FA enabled successfully' });
  return;
}));

/**
 * POST /api/v1/auth/disable-2fa
 * Disable two-factor authentication
 */
router.post('/disable-2fa', apiRateLimit, asyncHandler(async (req: AuthRequest, res: Response) => {
  const db = await getDatabase();
  const userId = req.userId;
  const { password } = req.body;

  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (!password) {
    return res.status(400).json({ error: 'Password is required' });
  }

  // Verify password
  const user = await db.getUserById(userId);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  const isValid = await verifyPassword(password, user.password_hash);
  if (!isValid) {
    return res.status(401).json({ error: 'Invalid password' });
  }

  // Disable 2FA
  await db.run('DELETE FROM two_factor_auth WHERE user_id = ?', [userId]);

  res.json({ message: '2FA disabled successfully' });
  return;
}));

/**
 * POST /api/v1/auth/verify-2fa
 * Verify 2FA token during login
 */
router.post('/verify-2fa', authRateLimit, asyncHandler(async (req: AuthRequest, res: Response) => {
  const db = await getDatabase();
  const { userId, token } = req.body;

  if (!userId || !token) {
    return res.status(400).json({ error: 'User ID and token are required' });
  }

  // Get 2FA settings
  const twoFactorData = await db.get(`
    SELECT * FROM two_factor_auth WHERE user_id = ? AND enabled = 1
  `, [userId]);

  if (!twoFactorData) {
    return res.status(400).json({ error: '2FA not enabled' });
  }

  // Verify token
  const isValid = verifyTOTP(twoFactorData.secret, token);
  if (!isValid) {
    return res.status(400).json({ error: 'Invalid token' });
  }

  // Generate tokens
  const user = await db.getUserById(userId);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  const payload: TokenPayload = {
    userId: user.id,
    email: user.email,
    role: user.role
  };

  const tokens = generateTokenPair(payload);

  // Store refresh token
  await db.createRefreshToken(user.id, tokens.refreshToken, getRefreshTokenExpiryDate());

  // Set httpOnly cookie for refresh token
  res.cookie('refreshToken', tokens.refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    path: '/'
  });

  // Return user without password and access token
  const { password_hash: _, ...userResponse } = user;
  res.json({
    user: userResponse,
    accessToken: tokens.accessToken
  });
  return;
}));

export default router;
