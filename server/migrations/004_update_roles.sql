-- Migration: Update roles (Admin → Administrator, Viewer → Guest) and reassign Guest issues
-- This migration updates role names and reassigns any issues assigned to Guest users

-- Disable foreign key constraints for the migration
PRAGMA foreign_keys = OFF;

-- Step 1: Create a new users table with updated schema
CREATE TABLE IF NOT EXISTS users_new (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  avatar_url TEXT NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('Administrator', 'Team Lead', 'Member', 'Guest')),
  email_verified INTEGER DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- Step 2: Copy existing data with role updates
INSERT INTO users_new (id, name, email, password_hash, avatar_url, role, email_verified, created_at, updated_at)
SELECT
  id,
  name,
  email,
  password_hash,
  avatar_url,
  CASE
    WHEN role = 'Admin' THEN 'Administrator'
    WHEN role = 'Viewer' THEN 'Guest'
    ELSE role
  END as role,
  0 as email_verified,
  created_at,
  updated_at
FROM users;

-- Step 3: Drop old table and rename new one
DROP TABLE IF EXISTS users;
ALTER TABLE users_new RENAME TO users;

-- Step 4: Recreate indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_email_verified ON users(email_verified);

-- Step 5: Reassign issues from Guests to Team Leads
-- Find Team Leads to reassign to
-- For each issue assigned to a Guest, reassign to a Team Lead in the same project
-- If no Team Lead exists, assign to any Administrator

-- First, create a temporary table to track reassignments
CREATE TEMP TABLE IF NOT EXISTS guest_reassignments (
  issue_id TEXT,
  guest_user_id TEXT,
  new_assignee_id TEXT
);

-- Find issues assigned to Guests and their Team Leads/Administrators
INSERT INTO guest_reassignments (issue_id, guest_user_id, new_assignee_id)
SELECT DISTINCT
  ia.issue_id,
  ia.user_id as guest_user_id,
  (
    -- First try to find a Team Lead in the same project
    SELECT tl.id
    FROM users tl
    JOIN issue_assignees ia_tl ON tl.id = ia_tl.user_id
    JOIN issues i_proj ON ia_tl.issue_id = i_prof.id
    WHERE i_prof.project_id = i_proj.project_id
      AND tl.role = 'Team Lead'
      AND tl.id != ia.user_id
    LIMIT 1
  ) OR (
    -- If no Team Lead, find any Administrator
    SELECT admin.id
    FROM users admin
    WHERE admin.role = 'Administrator'
    LIMIT 1
  )
FROM issue_assignees ia
JOIN issues i_prof ON ia.issue_id = i_prof.id
JOIN users u ON ia.user_id = u.id
WHERE u.role = 'Guest';

-- Perform the reassignments
DELETE FROM issue_assignees
WHERE issue_id IN (SELECT issue_id FROM guest_reassignments)
  AND user_id IN (SELECT guest_user_id FROM guest_reassignments);

INSERT INTO issue_assignees (issue_id, user_id)
SELECT issue_id, new_assignee_id
FROM guest_reassignments
WHERE new_assignee_id IS NOT NULL;

-- Clean up temp table
DROP TABLE IF EXISTS guest_reassignments;

-- Re-enable foreign key constraints
PRAGMA foreign_keys = ON;
