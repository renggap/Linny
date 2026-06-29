import jwt from 'jsonwebtoken';

const ACCESS_EXPIRY = '3d';
const REFRESH_EXPIRY = '7d';
const FALLBACK_DEV_SECRET = 'dev-secret-change-in-production';

function getSecret(): string {
  const secret = process.env.JWT_SECRET;
  const isProduction = process.env.NODE_ENV === 'production';

  if (!secret) {
    if (isProduction) {
      throw new Error(
        'CRITICAL: JWT_SECRET environment variable is required in production. ' +
        'Set a strong, random secret (minimum 32 characters).'
      );
    }
    console.warn(
      '⚠️  WARNING: JWT_SECRET not set. Using development secret. ' +
      'Set JWT_SECRET environment variable for production use.'
    );
    return FALLBACK_DEV_SECRET;
  }

  if (secret.length < 32) {
    throw new Error(
      'CRITICAL: JWT_SECRET must be at least 32 characters long for security. ' +
      'Current length: ' + secret.length + ' characters.'
    );
  }

  return secret;
}

export interface TokenPayload {
  userId: string;
  email: string;
  role: string;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

/**
 * Generate an access token (short-lived)
 */
export function generateAccessToken(payload: TokenPayload): string {
  return jwt.sign(payload, getSecret(), { expiresIn: ACCESS_EXPIRY });
}

/**
 * Generate a refresh token (long-lived)
 */
export function generateRefreshToken(payload: TokenPayload): string {
  return jwt.sign(payload, getSecret(), { expiresIn: REFRESH_EXPIRY });
}

/**
 * Generate both access and refresh tokens
 */
export function generateTokenPair(payload: TokenPayload): TokenPair {
  return {
    accessToken: generateAccessToken(payload),
    refreshToken: generateRefreshToken(payload)
  };
}

/**
 * Verify and decode a token
 * @returns Token payload or null if invalid
 */
export function verifyToken(token: string): TokenPayload | null {
  try {
    return jwt.verify(token, getSecret()) as TokenPayload;
  } catch {
    return null;
  }
}

/**
 * Get access token expiry time in milliseconds
 */
export function getAccessTokenExpiry(): number {
  return 3 * 24 * 60 * 60 * 1000; // 3 days
}

/**
 * Get refresh token expiry time in milliseconds
 */
export function getRefreshTokenExpiry(): number {
  return 7 * 24 * 60 * 60 * 1000; // 7 days
}

/**
 * Calculate refresh token expiry date
 */
export function getRefreshTokenExpiryDate(): string {
  const expiry = new Date();
  expiry.setDate(expiry.getDate() + 7);
  return expiry.toISOString();
}
