-- Migration: Add Performance Indexes
-- 
-- DEEP REASONING CHAIN:
-- Database indexes dramatically improve query performance by:
-- 1. Reducing full table scans
-- 2. Speeding up JOIN operations
-- 3. Optimizing WHERE clause filtering
-- 4. Improving ORDER BY performance
--
-- EDGE CASE ANALYSIS:
-- - Indexes already exist on foreign keys (from schema.sql)
-- - This migration adds composite indexes for common query patterns
-- - Indexes on frequently filtered columns (status, priority)
-- - Indexes on timestamp columns for sorting
-- - Composite indexes for multi-column queries

-- Composite index for issues by project and status (common query pattern)
CREATE INDEX IF NOT EXISTS idx_issues_project_status ON issues(project_id, status);

-- Composite index for issues by project and priority (common query pattern)
CREATE INDEX IF NOT EXISTS idx_issues_project_priority ON issues(project_id, priority);

-- Index for issues by status alone (for global status filters)
CREATE INDEX IF NOT EXISTS idx_issues_status_filter ON issues(status);

-- Index for issues by priority alone (for global priority filters)
CREATE INDEX IF NOT EXISTS idx_issues_priority_filter ON issues(priority);

-- Composite index for notifications by user and read status (common query pattern)
CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON notifications(user_id, is_read);

-- Composite index for activities by project and created_at (for activity feeds)
CREATE INDEX IF NOT EXISTS idx_activities_project_created ON activities(project_id, created_at DESC);

-- Composite index for activities by user and created_at (for user activity feeds)
CREATE INDEX IF NOT EXISTS idx_activities_user_created ON activities(user_id, created_at DESC);

-- Index for comments by issue and created_at (for comment ordering)
CREATE INDEX IF NOT EXISTS idx_comments_issue_created ON comments(issue_id, created_at DESC);

-- Index for users by role (for admin queries)
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- Composite index for refresh tokens by user and expiration (for cleanup)
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_expires ON refresh_tokens(user_id, expires_at);

-- Index for refresh tokens by expiration alone (for cleanup jobs)
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_expires ON refresh_tokens(expires_at);
