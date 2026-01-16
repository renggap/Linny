-- Migration: Add Email Verification, Password Reset, and 2FA Tables
--
-- DEEP REASONING CHAIN:
-- These tables enable critical security features:
-- 1. Email verification prevents fake accounts
-- 2. Password reset enables account recovery
-- 3. 2FA adds an extra security layer
--
-- EDGE CASE ANALYSIS:
-- - Tokens have expiration times
-- - One-time use tokens (deleted after use)
-- - Indexes on user_id for fast lookups
-- - Indexes on tokens for fast validation

-- Email verification tokens
CREATE TABLE IF NOT EXISTS email_verification_tokens (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  token TEXT UNIQUE NOT NULL,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_email_verification_tokens_user ON email_verification_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_email_verification_tokens_token ON email_verification_tokens(token);
CREATE INDEX IF NOT EXISTS idx_email_verification_tokens_expires ON email_verification_tokens(expires_at);

-- Password reset tokens
CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  token TEXT UNIQUE NOT NULL,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_user ON password_reset_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_token ON password_reset_tokens(token);
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_expires ON password_reset_tokens(expires_at);

-- Two-factor authentication secrets
CREATE TABLE IF NOT EXISTS two_factor_auth (
  id TEXT PRIMARY KEY,
  user_id TEXT UNIQUE NOT NULL,
  secret TEXT NOT NULL,
  backup_codes TEXT, -- JSON array of backup codes
  enabled INTEGER DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_two_factor_auth_user ON two_factor_auth(user_id);

-- Add email_verified column to users table (if not already exists)
-- SQLite doesn't support ALTER TABLE IF NOT EXISTS, so we need to check first
-- This is handled by the migration runner in TypeScript
CREATE INDEX IF NOT EXISTS idx_users_email_verified ON users(email_verified);
