# Linny API Documentation

## Overview

This document provides comprehensive documentation for all API endpoints in the Linny application. All endpoints follow RESTful conventions and use JSON for request/response bodies.

## Base URL

- Development: `http://localhost:3001`
- Production: Configured via `FRONTEND_URL` environment variable

## API Versioning

The API uses URL-based versioning. Current version: `v1`

- Versioned endpoints: `/api/v1/*`
- Legacy endpoints: `/api/*` (for backward compatibility)

## Authentication

Most endpoints require authentication using JWT (JSON Web Tokens).

### Authentication Methods

1. **Bearer Token**: Include JWT in `Authorization` header
   ```
   Authorization: Bearer <access_token>
   ```

2. **Refresh Token**: Stored in httpOnly cookie
   ```
   Cookie: refreshToken=<refresh_token>
   ```

### Token Types

- **Access Token**: Short-lived (15 minutes), used for API requests
- **Refresh Token**: Long-lived (7 days), used to obtain new access tokens

## Response Format

### Success Response
```json
{
  "data": { ... },
  "message": "Success message"
}
```

### Error Response
```json
{
  "error": "Error message",
  "details": { ... }  // Only in development
}
```

### Standard HTTP Status Codes

- `200 OK`: Request succeeded
- `201 Created`: Resource created successfully
- `204 No Content`: Request succeeded, no content returned
- `400 Bad Request`: Invalid request data
- `401 Unauthorized`: Authentication required or failed
- `403 Forbidden`: Insufficient permissions
- `404 Not Found`: Resource not found
- `409 Conflict`: Resource already exists
- `413 Payload Too Large`: Request body too large
- `429 Too Many Requests`: Rate limit exceeded
- `500 Internal Server Error`: Server error
- `503 Service Unavailable`: Service temporarily unavailable

## Rate Limiting

Different endpoints have different rate limits:

- **Auth endpoints**: 5 requests per 15 minutes (IP-based)
- **Public endpoints**: 20 requests per 15 minutes (IP-based)
- **Authenticated endpoints**: 100 requests per 15 minutes (user-based)
- **Read-only endpoints**: 200 requests per 15 minutes (user-based)

Rate limit headers are included in responses:
- `X-RateLimit-Limit`: Maximum requests per window
- `X-RateLimit-Remaining`: Remaining requests in current window
- `X-RateLimit-Reset`: Unix timestamp when rate limit resets

## Pagination

List endpoints support pagination via query parameters:

- `page`: Page number (default: 1, minimum: 1)
- `limit`: Items per page (default: 50, minimum: 1, maximum: 100)

### Pagination Response
```json
{
  "items": [ ... ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 150,
    "totalPages": 3,
    "hasNext": true
  }
}
```

---

# Authentication Endpoints

## POST /api/v1/auth/register

Register a new user account.

### Request Body
```json
{
  "name": "string (required, min: 2, max: 100)",
  "email": "string (required, valid email)",
  "password": "string (required, min: 8)"
}
```

### Password Requirements
- Minimum 8 characters
- Must contain at least one lowercase letter
- Must contain at least one uppercase letter
- Must contain at least one number
- Must contain at least one special character

### Response (201 Created)
```json
{
  "user": {
    "id": "string",
    "name": "string",
    "email": "string",
    "avatar_url": "string",
    "role": "Admin|Member",
    "email_verified": "boolean",
    "created_at": "ISO 8601 timestamp",
    "updated_at": "ISO 8601 timestamp"
  },
  "accessToken": "string (JWT)"
}
```

### Notes
- First user registered automatically becomes Admin
- Refresh token is set in httpOnly cookie
- Email verification required for full access

---

## POST /api/v1/auth/login

Authenticate with email and password.

### Request Body
```json
{
  "email": "string (required, valid email)",
  "password": "string (required)"
}
```

### Response (200 OK)
```json
{
  "user": {
    "id": "string",
    "name": "string",
    "email": "string",
    "avatar_url": "string",
    "role": "Admin|Member",
    "email_verified": "boolean",
    "created_at": "ISO 8601 timestamp",
    "updated_at": "ISO 8601 timestamp"
  },
  "accessToken": "string (JWT)"
}
```

### Notes
- Account locked after 5 failed attempts (15 minute cooldown)
- Refresh token is set in httpOnly cookie
- If 2FA is enabled, additional verification required

---

## POST /api/v1/auth/refresh

Refresh access token using refresh token.

### Request Body
```json
{
  "refreshToken": "string (required)"
}
```

### Response (200 OK)
```json
{
  "accessToken": "string (JWT)",
  "refreshToken": "string (JWT)"
}
```

### Notes
- Old refresh token is invalidated
- New refresh token is set in httpOnly cookie

---

## POST /api/v1/auth/logout

Invalidate refresh token and logout user.

### Response (200 OK)
```json
{
  "message": "Logged out successfully"
}
```

### Notes
- Refresh token is deleted from database
- httpOnly cookie is cleared

---

## GET /api/v1/auth/me

Get current authenticated user information.

### Headers
```
Authorization: Bearer <access_token>
```

### Response (200 OK)
```json
{
  "user": {
    "id": "string",
    "name": "string",
    "email": "string",
    "avatar_url": "string",
    "role": "Admin|Member",
    "email_verified": "boolean",
    "created_at": "ISO 8601 timestamp",
    "updated_at": "ISO 8601 timestamp"
  }
}
```

---

## POST /api/v1/auth/verify-email

Verify email address using verification token.

### Request Body
```json
{
  "token": "string (required)"
}
```

### Response (200 OK)
```json
{
  "message": "Email verified successfully"
}
```

### Notes
- Token expires after 24 hours
- Token is single-use

---

## POST /api/v1/auth/resend-verification

Resend email verification token.

### Request Body
```json
{
  "email": "string (required, valid email)"
}
```

### Response (200 OK)
```json
{
  "message": "If email exists, verification email sent"
}
```

### Notes
- Doesn't reveal if email exists (security measure)
- Old tokens are invalidated

---

## POST /api/v1/auth/request-password-reset

Request password reset link via email.

### Request Body
```json
{
  "email": "string (required, valid email)"
}
```

### Response (200 OK)
```json
{
  "message": "If email exists, reset link sent"
}
```

### Notes
- Doesn't reveal if email exists (security measure)
- Token expires after 1 hour

---

## POST /api/v1/auth/reset-password

Reset password using reset token.

### Request Body
```json
{
  "token": "string (required)",
  "password": "string (required, min: 8)"
}
```

### Response (200 OK)
```json
{
  "message": "Password reset successfully"
}
```

### Notes
- Password must meet strength requirements
- All refresh tokens are invalidated (forced logout)

---

## POST /api/v1/auth/setup-2fa

Setup two-factor authentication.

### Headers
```
Authorization: Bearer <access_token>
```

### Response (200 OK)
```json
{
  "secret": "string (TOTP secret)",
  "qrCode": "string (base64 encoded QR code image)",
  "backupCodes": ["string", "string", ...] // 10 backup codes
}
```

### Notes
- 2FA not enabled until verified
- Store backup codes securely

---

## POST /api/v1/auth/enable-2fa

Enable 2FA after verification.

### Headers
```
Authorization: Bearer <access_token>
```

### Request Body
```json
{
  "token": "string (required, 6-digit TOTP code)"
}
```

### Response (200 OK)
```json
{
  "message": "2FA enabled successfully"
}
```

---

## POST /api/v1/auth/disable-2fa

Disable two-factor authentication.

### Headers
```
Authorization: Bearer <access_token>
```

### Request Body
```json
{
  "password": "string (required)"
}
```

### Response (200 OK)
```json
{
  "message": "2FA disabled successfully"
}
```

---

## POST /api/v1/auth/verify-2fa

Verify 2FA token during login.

### Request Body
```json
{
  "userId": "string (required)",
  "token": "string (required, 6-digit TOTP code)"
}
```

### Response (200 OK)
```json
{
  "user": {
    "id": "string",
    "name": "string",
    "email": "string",
    "avatar_url": "string",
    "role": "Admin|Member",
    "email_verified": "boolean",
    "created_at": "ISO 8601 timestamp",
    "updated_at": "ISO 8601 timestamp"
  },
  "accessToken": "string (JWT)"
}
```

---

# User Endpoints

## GET /api/v1/users

Get all users.

### Headers
```
Authorization: Bearer <access_token>
```

### Query Parameters
- None

### Response (200 OK)
```json
{
  "users": [
    {
      "id": "string",
      "name": "string",
      "email": "string",
      "avatar_url": "string",
      "role": "Admin|Member",
      "email_verified": "boolean",
      "created_at": "ISO 8601 timestamp",
      "updated_at": "ISO 8601 timestamp"
    }
  ]
}
```

---

## GET /api/v1/users/:id

Get user by ID.

### Headers
```
Authorization: Bearer <access_token>
```

### Response (200 OK)
```json
{
  "user": {
    "id": "string",
    "name": "string",
    "email": "string",
    "avatar_url": "string",
    "role": "Admin|Member",
    "email_verified": "boolean",
    "created_at": "ISO 8601 timestamp",
    "updated_at": "ISO 8601 timestamp"
  }
}
```

---

## PATCH /api/v1/users/:id

Update user profile.

### Headers
```
Authorization: Bearer <access_token>
```

### Request Body
```json
{
  "name": "string (optional, min: 2, max: 100)",
  "avatar_url": "string (optional, valid URL)"
}
```

### Response (200 OK)
```json
{
  "user": {
    "id": "string",
    "name": "string",
    "email": "string",
    "avatar_url": "string",
    "role": "Admin|Member",
    "email_verified": "boolean",
    "created_at": "ISO 8601 timestamp",
    "updated_at": "ISO 8601 timestamp"
  }
}
```

### Notes
- Users can only update their own profile
- At least one field must be provided

---

## PATCH /api/v1/users/:id/role

Update user role (Admin only).

### Headers
```
Authorization: Bearer <access_token>
```

### Request Body
```json
{
  "role": "Admin|Member (required)"
}
```

### Response (200 OK)
```json
{
  "user": {
    "id": "string",
    "name": "string",
    "email": "string",
    "avatar_url": "string",
    "role": "Admin|Member",
    "email_verified": "boolean",
    "created_at": "ISO 8601 timestamp",
    "updated_at": "ISO 8601 timestamp"
  }
}
```

### Notes
- Admin only
- Cannot change your own role

---

## DELETE /api/v1/users/:id

Delete user (Admin only).

### Headers
```
Authorization: Bearer <access_token>
```

### Response (200 OK)
```json
{
  "message": "User removed successfully"
}
```

### Notes
- Admin only
- Cannot delete your own account

---

# Team Endpoints

## GET /api/v1/teams

Get all teams.

### Headers
```
Authorization: Bearer <access_token>
```

### Response (200 OK)
```json
{
  "teams": [
    {
      "id": "string",
      "name": "string",
      "icon": "string",
      "created_at": "ISO 8601 timestamp",
      "updated_at": "ISO 8601 timestamp",
      "members": ["string (user ID)", ...]
    }
  ]
}
```

---

## GET /api/v1/teams/:id

Get team by ID.

### Headers
```
Authorization: Bearer <access_token>
```

### Response (200 OK)
```json
{
  "team": {
    "id": "string",
    "name": "string",
    "icon": "string",
    "created_at": "ISO 8601 timestamp",
    "updated_at": "ISO 8601 timestamp",
    "members": ["string (user ID)", ...]
  }
}
```

---

## POST /api/v1/teams

Create a new team.

### Headers
```
Authorization: Bearer <access_token>
```

### Request Body
```json
{
  "name": "string (required, min: 2, max: 100)",
  "icon": "string (optional, default: first letter of name)"
}
```

### Response (201 Created)
```json
{
  "team": {
    "id": "string",
    "name": "string",
    "icon": "string",
    "created_at": "ISO 8601 timestamp",
    "updated_at": "ISO 8601 timestamp",
    "members": ["string (user ID)", ...]
  }
}
```

### Notes
- Admin or Team Lead only
- Creator is automatically added as first member

---

## GET /api/v1/teams/:id/members

Get team members.

### Headers
```
Authorization: Bearer <access_token>
```

### Response (200 OK)
```json
{
  "members": [
    {
      "id": "string",
      "name": "string",
      "email": "string",
      "avatar_url": "string",
      "role": "Admin|Member",
      "email_verified": "boolean",
      "created_at": "ISO 8601 timestamp",
      "updated_at": "ISO 8601 timestamp"
    }
  ]
}
```

---

## POST /api/v1/teams/:id/members

Add member to team.

### Headers
```
Authorization: Bearer <access_token>
```

### Request Body
```json
{
  "userId": "string (required)"
}
```

### Response (200 OK)
```json
{
  "members": ["string (user ID)", ...]
}
```

### Notes
- Admin or Team Lead only
- Requester must be a team member

---

## DELETE /api/v1/teams/:id/members/:userId

Remove member from team.

### Headers
```
Authorization: Bearer <access_token>
```

### Response (200 OK)
```json
{
  "members": ["string (user ID)", ...]
}
```

### Notes
- Admin or Team Lead only
- Requester must be a team member

---

# Project Endpoints

## GET /api/v1/projects

Get all projects.

### Headers
```
Authorization: Bearer <access_token>
```

### Query Parameters
- `teamId` (optional): Filter by team ID

### Response (200 OK)
```json
{
  "projects": [
    {
      "id": "string",
      "name": "string",
      "identifier": "string",
      "icon": "string",
      "team_id": "string",
      "description": "string|null",
      "is_public": "boolean",
      "public_slug": "string|null",
      "lead_id": "string|null",
      "start_date": "ISO 8601 timestamp|null",
      "target_date": "ISO 8601 timestamp|null",
      "created_at": "ISO 8601 timestamp",
      "updated_at": "ISO 8601 timestamp",
      "members": ["string (user ID)", ...]
    }
  ]
}
```

---

## GET /api/v1/projects/:id

Get project by ID.

### Headers
```
Authorization: Bearer <access_token>
```

### Response (200 OK)
```json
{
  "project": {
    "id": "string",
    "name": "string",
    "identifier": "string",
    "icon": "string",
    "team_id": "string",
    "description": "string|null",
    "is_public": "boolean",
    "public_slug": "string|null",
    "lead_id": "string|null",
    "start_date": "ISO 8601 timestamp|null",
    "target_date": "ISO 8601 timestamp|null",
    "created_at": "ISO 8601 timestamp",
    "updated_at": "ISO 8601 timestamp",
    "members": ["string (user ID)", ...]
  }
}
```

---

## POST /api/v1/projects

Create a new project.

### Headers
```
Authorization: Bearer <access_token>
```

### Request Body
```json
{
  "name": "string (required, min: 2, max: 100)",
  "identifier": "string (required, min: 2, max: 10, uppercase)",
  "icon": "string (optional, default: 📁)",
  "teamId": "string (required)",
  "description": "string (optional, max: 1000)",
  "isPublic": "boolean (optional, default: false)",
  "publicSlug": "string (optional, unique)",
  "startDate": "ISO 8601 timestamp (optional)",
  "targetDate": "ISO 8601 timestamp (optional)"
}
```

### Response (201 Created)
```json
{
  "project": {
    "id": "string",
    "name": "string",
    "identifier": "string",
    "icon": "string",
    "team_id": "string",
    "description": "string|null",
    "is_public": "boolean",
    "public_slug": "string|null",
    "lead_id": "string|null",
    "start_date": "ISO 8601 timestamp|null",
    "target_date": "ISO 8601 timestamp|null",
    "created_at": "ISO 8601 timestamp",
    "updated_at": "ISO 8601 timestamp"
  }
}
```

---

## PATCH /api/v1/projects/:id

Update project.

### Headers
```
Authorization: Bearer <access_token>
```

### Request Body
```json
{
  "name": "string (optional, min: 2, max: 100)",
  "icon": "string (optional)",
  "description": "string (optional, max: 1000)",
  "isPublic": "boolean (optional)",
  "publicSlug": "string (optional, unique)",
  "startDate": "ISO 8601 timestamp (optional)",
  "targetDate": "ISO 8601 timestamp (optional)"
}
```

### Response (200 OK)
```json
{
  "project": {
    "id": "string",
    "name": "string",
    "identifier": "string",
    "icon": "string",
    "team_id": "string",
    "description": "string|null",
    "is_public": "boolean",
    "public_slug": "string|null",
    "lead_id": "string|null",
    "start_date": "ISO 8601 timestamp|null",
    "target_date": "ISO 8601 timestamp|null",
    "created_at": "ISO 8601 timestamp",
    "updated_at": "ISO 8601 timestamp"
  }
}
```

---

## DELETE /api/v1/projects/:id

Delete project.

### Headers
```
Authorization: Bearer <access_token>
```

### Response (200 OK)
```json
{
  "message": "Project deleted"
}
```

---

# Issue Endpoints

## GET /api/v1/issues

Get issues with filters.

### Headers
```
Authorization: Bearer <access_token>
```

### Query Parameters
- `teamId` (optional): Filter by team ID
- `projectId` (optional): Filter by project ID
- `status` (optional): Filter by status (Backlog|Todo|In Progress|In Review|Done|Cancelled)
- `assigneeId` (optional): Filter by assignee ID
- `search` (optional): Search in title, description, identifier
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 50, max: 100)

### Response (200 OK)
```json
{
  "issues": [
    {
      "id": "string",
      "identifier": "string",
      "title": "string",
      "description": "string|null",
      "status": "Backlog|Todo|In Progress|In Review|Done|Cancelled",
      "priority": "No Priority|Urgent|High|Medium|Low",
      "project_id": "string",
      "parent_id": "string|null",
      "start_date": "ISO 8601 timestamp|null",
      "due_date": "ISO 8601 timestamp|null",
      "created_at": "ISO 8601 timestamp",
      "updated_at": "ISO 8601 timestamp",
      "assignees": [
        {
          "id": "string",
          "name": "string",
          "email": "string",
          "avatar_url": "string",
          "role": "Admin|Member",
          "created_at": "ISO 8601 timestamp",
          "updated_at": "ISO 8601 timestamp"
        }
      ]
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 150,
    "totalPages": 3,
    "hasNext": true
  }
}
```

---

## GET /api/v1/issues/:id

Get issue by ID.

### Headers
```
Authorization: Bearer <access_token>
```

### Response (200 OK)
```json
{
  "issue": {
    "id": "string",
    "identifier": "string",
    "title": "string",
    "description": "string|null",
    "status": "Backlog|Todo|In Progress|In Review|Done|Cancelled",
    "priority": "No Priority|Urgent|High|Medium|Low",
    "project_id": "string",
    "parent_id": "string|null",
    "start_date": "ISO 8601 timestamp|null",
    "due_date": "ISO 8601 timestamp|null",
    "created_at": "ISO 8601 timestamp",
    "updated_at": "ISO 8601 timestamp",
    "assignees": [
      {
        "id": "string",
        "name": "string",
        "email": "string",
        "avatar_url": "string",
        "role": "Admin|Member",
        "created_at": "ISO 8601 timestamp",
        "updated_at": "ISO 8601 timestamp"
      }
    ]
  }
}
```

---

## POST /api/v1/issues

Create a new issue.

### Headers
```
Authorization: Bearer <access_token>
```

### Request Body
```json
{
  "title": "string (optional, default: 'Untitled')",
  "description": "string (optional)",
  "status": "Backlog|Todo|In Progress|In Review|Done|Cancelled (optional, default: 'Backlog')",
  "priority": "No Priority|Urgent|High|Medium|Low (optional, default: 'No Priority')",
  "assigneeIds": ["string (user ID)", ...] (optional),
  "projectId": "string (required)",
  "startDate": "ISO 8601 timestamp (optional)",
  "dueDate": "ISO 8601 timestamp (optional)",
  "parentId": "string (optional)"
}
```

### Response (201 Created)
```json
{
  "issue": {
    "id": "string",
    "identifier": "string",
    "title": "string",
    "description": "string|null",
    "status": "Backlog|Todo|In Progress|In Review|Done|Cancelled",
    "priority": "No Priority|Urgent|High|Medium|Low",
    "project_id": "string",
    "parent_id": "string|null",
    "start_date": "ISO 8601 timestamp|null",
    "due_date": "ISO 8601 timestamp|null",
    "created_at": "ISO 8601 timestamp",
    "updated_at": "ISO 8601 timestamp",
    "assignees": [
      {
        "id": "string",
        "name": "string",
        "email": "string",
        "avatar_url": "string",
        "role": "Admin|Member",
        "created_at": "ISO 8601 timestamp",
        "updated_at": "ISO 8601 timestamp"
      }
    ]
  }
}
```

### Notes
- Issue identifier auto-generated (e.g., PROJ-101)
- Non-Viewer role required

---

## PATCH /api/v1/issues/:id

Update issue.

### Headers
```
Authorization: Bearer <access_token>
```

### Request Body
```json
{
  "title": "string (optional)",
  "description": "string (optional)",
  "status": "Backlog|Todo|In Progress|In Review|Done|Cancelled (optional)",
  "priority": "No Priority|Urgent|High|Medium|Low (optional)",
  "assigneeIds": ["string (user ID)", ...] (optional),
  "startDate": "ISO 8601 timestamp (optional)",
  "dueDate": "ISO 8601 timestamp (optional)"
}
```

### Response (200 OK)
```json
{
  "issue": {
    "id": "string",
    "identifier": "string",
    "title": "string",
    "description": "string|null",
    "status": "Backlog|Todo|In Progress|In Review|Done|Cancelled",
    "priority": "No Priority|Urgent|High|Medium|Low",
    "project_id": "string",
    "parent_id": "string|null",
    "start_date": "ISO 8601 timestamp|null",
    "due_date": "ISO 8601 timestamp|null",
    "created_at": "ISO 8601 timestamp",
    "updated_at": "ISO 8601 timestamp",
    "assignees": [
      {
        "id": "string",
        "name": "string",
        "email": "string",
        "avatar_url": "string",
        "role": "Admin|Member",
        "created_at": "ISO 8601 timestamp",
        "updated_at": "ISO 8601 timestamp"
      }
    ]
  }
}
```

### Notes
- Non-Viewer role required
- Must be team member

---

## POST /api/v1/issues/:id/status

Change issue status.

### Headers
```
Authorization: Bearer <access_token>
```

### Request Body
```json
{
  "status": "Backlog|Todo|In Progress|In Review|Done|Cancelled (required)"
}
```

### Response (200 OK)
```json
{
  "issue": {
    "id": "string",
    "identifier": "string",
    "title": "string",
    "description": "string|null",
    "status": "Backlog|Todo|In Progress|In Review|Done|Cancelled",
    "priority": "No Priority|Urgent|High|Medium|Low",
    "project_id": "string",
    "parent_id": "string|null",
    "start_date": "ISO 8601 timestamp|null",
    "due_date": "ISO 8601 timestamp|null",
    "created_at": "ISO 8601 timestamp",
    "updated_at": "ISO 8601 timestamp"
  }
}
```

### Notes
- Non-Viewer role required
- Must be team member

---

## POST /api/v1/issues/:id/subtasks

Create a subtask.

### Headers
```
Authorization: Bearer <access_token>
```

### Request Body
```json
{
  "title": "string (required, min: 2, max: 200)"
}
```

### Response (201 Created)
```json
{
  "issue": {
    "id": "string",
    "identifier": "string",
    "title": "string",
    "description": "string|null",
    "status": "Todo",
    "priority": "No Priority",
    "project_id": "string",
    "parent_id": "string",
    "start_date": "ISO 8601 timestamp|null",
    "due_date": "ISO 8601 timestamp|null",
    "created_at": "ISO 8601 timestamp",
    "updated_at": "ISO 8601 timestamp"
  }
}
```

### Notes
- Non-Viewer role required
- Must be team member

---

## DELETE /api/v1/issues/:id

Delete issue.

### Headers
```
Authorization: Bearer <access_token>
```

### Response (200 OK)
```json
{
  "message": "Issue deleted successfully"
}
```

### Notes
- Admin only

---

# Comment Endpoints

## GET /api/v1/comments

Get comments for an issue.

### Headers
```
Authorization: Bearer <access_token>
```

### Query Parameters
- `issueId` (required): Issue ID

### Response (200 OK)
```json
{
  "comments": [
    {
      "id": "string",
      "issue_id": "string",
      "user_id": "string",
      "body": "string",
      "created_at": "ISO 8601 timestamp",
      "updated_at": "ISO 8601 timestamp",
      "user": {
        "id": "string",
        "name": "string",
        "email": "string",
        "avatar_url": "string",
        "role": "Admin|Member"
      }
    }
  ]
}
```

---

## POST /api/v1/comments

Create a comment.

### Headers
```
Authorization: Bearer <access_token>
```

### Request Body
```json
{
  "issueId": "string (required)",
  "body": "string (required, min: 1, max: 10000)"
}
```

### Response (201 Created)
```json
{
  "comment": {
    "id": "string",
    "issue_id": "string",
    "user_id": "string",
    "body": "string",
    "created_at": "ISO 8601 timestamp",
    "updated_at": "ISO 8601 timestamp",
    "user": {
      "id": "string",
      "name": "string",
      "email": "string",
      "avatar_url": "string",
      "role": "Admin|Member"
    }
  }
}
```

---

## PATCH /api/v1/comments/:id

Update a comment.

### Headers
```
Authorization: Bearer <access_token>
```

### Request Body
```json
{
  "body": "string (required, min: 1, max: 10000)"
}
```

### Response (200 OK)
```json
{
  "comment": {
    "id": "string",
    "issue_id": "string",
    "user_id": "string",
    "body": "string",
    "created_at": "ISO 8601 timestamp",
    "updated_at": "ISO 8601 timestamp",
    "user": {
      "id": "string",
      "name": "string",
      "email": "string",
      "avatar_url": "string",
      "role": "Admin|Member"
    }
  }
}
```

### Notes
- Can only update your own comments

---

## DELETE /api/v1/comments/:id

Delete a comment.

### Headers
```
Authorization: Bearer <access_token>
```

### Response (200 OK)
```json
{
  "message": "Comment deleted successfully"
}
```

### Notes
- Can only delete your own comments

---

# Notification Endpoints

## GET /api/v1/notifications

Get user notifications.

### Headers
```
Authorization: Bearer <access_token>
```

### Query Parameters
- `unread` (optional): Filter by unread status (true|false)

### Response (200 OK)
```json
{
  "notifications": [
    {
      "id": "string",
      "user_id": "string",
      "type": "string",
      "title": "string",
      "message": "string",
      "data": "object|null",
      "read": "boolean",
      "created_at": "ISO 8601 timestamp"
    }
  ]
}
```

---

## PATCH /api/v1/notifications/:id

Mark notification as read.

### Headers
```
Authorization: Bearer <access_token>
```

### Response (200 OK)
```json
{
  "notification": {
    "id": "string",
    "user_id": "string",
    "type": "string",
    "title": "string",
    "message": "string",
    "data": "object|null",
    "read": "boolean",
    "created_at": "ISO 8601 timestamp"
  }
}
```

---

## DELETE /api/v1/notifications/:id

Delete notification.

### Headers
```
Authorization: Bearer <access_token>
```

### Response (200 OK)
```json
{
  "message": "Notification deleted successfully"
}
```

---

# Activity Endpoints

## GET /api/v1/activities

Get activity feed.

### Headers
```
Authorization: Bearer <access_token>
```

### Query Parameters
- `projectId` (optional): Filter by project ID
- `issueId` (optional): Filter by issue ID
- `limit` (optional): Number of items (default: 50, max: 100)

### Response (200 OK)
```json
{
  "activities": [
    {
      "id": "string",
      "user_id": "string",
      "type": "string",
      "project_id": "string|null",
      "issue_id": "string|null",
      "entity_title": "string|null",
      "description": "string",
      "created_at": "ISO 8601 timestamp",
      "user": {
        "id": "string",
        "name": "string",
        "email": "string",
        "avatar_url": "string",
        "role": "Admin|Member"
      }
    }
  ]
}
```

---

# Health Check

## GET /api/health

Check service health.

### Response (200 OK)
```json
{
  "status": "healthy",
  "timestamp": "ISO 8601 timestamp",
  "uptime": "5m 30s",
  "database": "connected",
  "memory": "45MB / 128MB",
  "environment": "development"
}
```

### Response (503 Service Unavailable)
```json
{
  "status": "unhealthy",
  "timestamp": "ISO 8601 timestamp",
  "error": "Health check failed"
}
```

---

# CSRF Token

## GET /api/csrf-token

Get CSRF token for form submissions.

### Response (200 OK)
```json
{
  "csrfToken": "string"
}
```

### Notes
- Include token in `X-CSRF-Token` header for POST/PUT/PATCH/DELETE requests
- Token is also set in `X-CSRF-Token` response header

---

# Error Codes

| Code | Description |
|------|-------------|
| `INVALID_CREDENTIALS` | Invalid email or password |
| `EMAIL_ALREADY_REGISTERED` | Email already exists in system |
| `USER_NOT_FOUND` | User not found |
| `TOKEN_EXPIRED` | Token has expired |
| `INVALID_TOKEN` | Token is invalid |
| `INSUFFICIENT_PERMISSIONS` | User lacks required permissions |
| `RESOURCE_NOT_FOUND` | Requested resource not found |
| `VALIDATION_ERROR` | Request data validation failed |
| `RATE_LIMIT_EXCEEDED` | Too many requests |
| `ACCOUNT_LOCKED` | Account temporarily locked |
| `2FA_REQUIRED` | Two-factor authentication required |
| `2FA_NOT_ENABLED` | Two-factor authentication not enabled |

---

# Webhooks

Coming soon - webhook support for real-time notifications.

---

# SDKs

Coming soon - official SDKs for JavaScript, Python, and Go.
