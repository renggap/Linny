# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

```bash
npm run dev              # Start both frontend (port 3000) and backend (port 3001)
npm run dev:frontend     # Start only frontend dev server
npm run dev:server       # Start only backend server
npm run build            # Build frontend for production
npm run build:server     # Build server (TypeScript)
npm run preview          # Preview production build
npm run seed             # Seed database with sample data
npm run seed:force       # Force re-seed database (deletes existing data)
npm run lint             # Run ESLint
npm run lint:fix         # Run ESLint with auto-fix
npm run format           # Run Prettier to format code
npm run format:check     # Check code formatting with Prettier
npm run typecheck        # Run TypeScript type checking
```

### Prisma Commands (run from `server/` directory)

```bash
cd server
npx prisma migrate dev --name <name>  # Create and apply migration
npx prisma generate                    # Regenerate Prisma Client
npx prisma studio                      # Open Prisma Studio (GUI)
npx prisma migrate reset               # Reset database (⚠️ deletes all data)
```

## Architecture Overview

This is a **full-stack application** with a React frontend and Fastify backend using PostgreSQL for persistent data storage and Redis for caching.

### Full-Stack Architecture

**Frontend**: React 19 + TypeScript + Vite, served on port 3000
**Backend**: Fastify + Node.js, running on port 3001
**Database**: PostgreSQL 16 with Prisma ORM, running in Docker via Docker Compose
**Cache**: Redis 7 with ioredis client (optional, graceful degradation if unavailable)
**Real-time**: WebSocket support via `@fastify/websocket` plugin for live updates
**Job Queue**: In-memory queue with exponential backoff for background tasks
**Server State**: TanStack Query for data management (issues, projects, comments, notifications, activities)
**UI State**: Zustand store for modal states, filters, and navigation
**Routing**: TanStack Router for type-safe routing

### Docker Setup

PostgreSQL and Redis run in Docker containers. Start them with:
```bash
docker compose up -d    # Start PostgreSQL and Redis
docker compose down     # Stop containers
docker compose down -v  # Stop and remove volumes (⚠️ deletes data)
```

Database connection is configured via `DATABASE_URL` in `.env`.

### State Management Pattern

The application uses a **hybrid state management** approach:

**Server State** (data from backend):
- Owned by **TanStack Query** via custom hooks in `hooks/` directory
- Includes: `issues`, `projects`, `teams`, `users`, `comments`, `notifications`, `activities`, `joinRequests`
- Real-time updates via WebSocket integration in `services/websocketQuerySync.ts`
- Custom hooks: `useIssues`, `useProjects`, `useTeams`, `useUsers`, `useActivities`, `useComments`, `useJoinRequests`, etc.

**UI State** (client-side only):
- Managed by **Zustand** store in `stores/uiStore.ts`
- Includes: modal states, current team/project selection, filters, view mode, sidebar state
- Access via `useUIStore()` hook

**Auth State**:
- Managed by `AuthContext` (in `contexts/AuthContext.tsx`)
- Provides `user`, `login()`, `register()`, `logout()`, `refreshUser()`

**Key Principle**: Server state MUST be owned by TanStack Query. UI state uses Zustand. Never duplicate server state in local component state or prop drilling.

### Backend API Structure

The backend (`server/` directory) uses **Fastify** with a modular route structure. All routes use `.fastify.ts` suffix:

**Core Routes:**
- `routes/auth.fastify.ts` - Authentication endpoints (login, register, logout, refresh)
- `routes/users.fastify.ts` - User management
- `routes/teams.fastify.ts` - Team CRUD operations
- `routes/projects.fastify.ts` - Project CRUD, public sharing
- `routes/issues.fastify.ts` - Issue management, status updates, subtasks, dependencies
- `routes/comments.fastify.ts` - Comment system with WebSocket notifications
- `routes/notifications.fastify.ts` - Notification management
- `routes/activities.fastify.ts` - Activity logging

**Advanced Routes:**
- `routes/analytics.fastify.ts` - API analytics/metrics
- `routes/admin.fastify.ts` - Admin operations
- `routes/search.fastify.ts` - Search functionality
- `routes/export.fastify.ts` - Data export
- `routes/invitations.fastify.ts` - Team invitation system
- `routes/joinRequests.fastify.ts` - Team join request system

**API Versioning**: All endpoints use `/api/v1/` prefix.

**Middleware**: Located in `server/middleware/`:
- `auth.ts` - JWT authentication decorator
- `cache.ts` - Redis caching layer
- `error.ts` - Global error handling
- `rateLimit.ts`, `userRateLimit.ts` - Rate limiting
- `validation.ts` - Request validation with Zod

### Server Infrastructure

**Fastify Server** (`server/index.ts`):
- **Plugins**: Helmet (security), CORS, compression, cookies, JWT auth, rate limiting, WebSocket
- **Authentication**: JWT via `@fastify/jwt` with 3-day expiry
- **Decorators**: `fastify.authenticate` for protected routes, sets `request.userId`, `request.userRole`, `request.userEmail`
- **Rate Limiting**: Configurable per-endpoint (100 req/15min API, higher in dev)
- **Health Check**: `/api/health` endpoint with DB and Redis status

**WebSocket** (`server/websocket/fastifyWebSocketRoutes.ts`):
- Uses `@fastify/websocket` plugin for native Fastify integration
- Routes: `/ws/user`, `/ws/issue/:issueId`, `/ws/project/:projectId`
- Stealth-team membership gate on issue/project rooms (Administrators bypass)
- JWT authentication via query parameter token
- Room-based broadcasting via `broadcastIssueUpdate`, `broadcastCommentUpdate`, `broadcastNotification`, `broadcastProjectUpdate`, `broadcastNewIssue`, `broadcastJoinRequestCreated/Updated`
- Used for live comment, notification, and issue updates
- Frontend auto-reconnects (client-side `services/websocket.ts`)

**Frontend WebSocket Integration**:
- `services/websocket.ts` - WebSocket client with auto-reconnect
- `services/websocketQuerySync.ts` - Bridges WebSocket events to TanStack Query cache
- WebSocket handlers ONLY patch query cache, never update React state directly

**Job Queue** (`server/jobs/jobQueue.ts`):
- In-memory queues for async processing
- Queues: Email, Notifications, Cleanup, Data Processing
- Exponential backoff on retry (max 3 attempts)
- Periodic jobs: due date notifications, token cleanup

**Redis Cache** (`server/cache/redis.ts`):
- Singleton client with graceful degradation
- Used for API response caching
- Health monitoring via `getHealthStatus()`

### Authentication & Security

**JWT Authentication Flow**:
- Access tokens (3-day expiry) stored in memory
- CSRF protection via double-submit cookie pattern (`/api/csrf-token` endpoint)
- Fastify decorator `fastify.authenticate` for protected routes
- Rate limiting on all endpoints (configurable via `@fastify/rate-limit`)
- Security headers via `@fastify/helmet` (CSP, HSTS, X-Frame-Options)

**AuthContext** (`contexts/AuthContext.tsx`) provides:
- `user` - Current authenticated user
- `login()`, `register()`, `logout()` - Auth methods
- `refreshUser()` - Refresh user data from API
- `isAuthenticated`, `isLoading` - Auth state flags

### API Client (`services/api.ts`)

The frontend uses a centralized API client with these features:
- **JWT handling**: Automatic token refresh on 401 errors
- **CSRF protection**: Fetches and includes CSRF tokens in state-changing requests
- **Offline support**: Queues requests when offline, syncs when reconnected
- **Field name transformation**: Converts snake_case (DB) to camelCase (frontend)
- **Date handling**: Converts ISO strings to Date objects automatically

### WebSocket Client (`services/websocket.ts`)

Handles real-time updates from the server:
- Automatic reconnection with exponential backoff
- Room-based subscriptions (issue, project, team)
- JWT authentication on connection
- Event handlers for `comment_updated`, `notification.created`, `issue_updated`, etc.

**WebSocket → Query Cache Integration** (`services/websocketQuerySync.ts`):
- Bridges WebSocket events to TanStack Query cache
- Functions: `setupCommentWebSocketSync()`, `setupNotificationWebSocketSync()`, `setupIssueWebSocketSync()`
- Enables real-time sync without manual refetching
- Called automatically in `App.tsx` when user authenticates
- **Critical rule**: WebSocket handlers may ONLY patch query cache, never update React state

### Database (PostgreSQL + Prisma)

- **Database**: PostgreSQL 16 running in Docker
- **ORM**: Prisma with auto-generated TypeScript types
- **Schema**: Defined in `server/prisma/schema.prisma`
- **Migrations**: Managed by Prisma

**Important**: The database uses snake_case for column names (e.g., `team_id`, `created_at`). The API client handles transformation to/from camelCase. Prisma handles this automatically via `@map` attributes in the schema.

**Key Database Models:**
- `User` - Users with global roles (Administrator, TeamLead, Member, Guest)
- `Team` - Teams with stealth mode support (`isStealth`)
- `TeamMember` - Junction table with team-specific roles
- `Project` - Projects with public sharing, lead, dates, and links
- `Issue` - Issues with status, priority, assignees (many-to-many), dates
- `Comment`, `Notification`, `Activity` - Activity tracking
- `Invitation` - Team invitations with expiry
- `JoinRequest` - Team join requests with approval workflow
- `RefreshToken`, `EmailVerificationToken`, `PasswordResetToken`, `TwoFactorAuth` - Auth models

### Custom Hooks

The `hooks/` directory provides custom hooks for data fetching using TanStack Query:
- `useIssues.ts` - Issue queries and mutations
- `useProjects.ts` - Project queries and mutations
- `useTeams.ts` - Team queries and mutations
- `useUsers.ts` - User queries
- `useComments.ts` - Comment queries and mutations
- `useActivities.ts` - Activity feed queries
- `useJoinRequests.ts` - Join request queries and mutations
- `useInitialData.ts` - Initial app data fetching
- `useURLSync.ts` - Bidirectional URL synchronization
- `useWorkspaceMembers.ts` - Fetches members for current workspace/team
- `useWebSocket.ts` - WebSocket connection management

**Pattern**: All server state hooks return `useQuery` or `useMutation` from TanStack Query, ensuring consistent cache management and real-time updates.

**Workspace-Scoped Queries**: When data is scoped to a team/workspace (e.g., projects, issues), the query uses the `currentTeamId` from the UI store. The `enabled` query option prevents fetching when `teamId` is empty.

### Context Providers

React providers used in the app:
- **QueryClientProvider** (`@tanstack/react-query`) - Server state management
- **AuthProvider** (`contexts/AuthContext.tsx`) - Authentication state

See `index.tsx` for provider wrapping order.

### Routing

Uses **TanStack Router** (`@tanstack/react-router`) with routes defined in `router.tsx`:
- `/` - Main app (redirects to auth if not logged in)
- `/public/:slug` - Public project read-only view

URL synchronization is handled by `hooks/useURLSync.ts` for bidirectional state ↔ URL mapping.

### Component Organization

Components are **view-focused**:
- `IssueList.tsx` - Table/list view for issues
- `BoardView.tsx` - Kanban board with drag-and-drop
- `TimelineView.tsx` - Gantt chart timeline
- `Sidebar.tsx` - Navigation with team/project switching
- `Header.tsx` - Top navigation bar with search and notifications
- `ProjectRightSidebar.tsx` - Issue details and filters
- `ProjectOverviewHeader.tsx` - Project summary and metadata
- `MainView.tsx` - Main content area router
- `TeamDashboard.tsx` - Team overview and metrics
- `PublicViewContainer.tsx` - Wrapper for public project views
- `ActivityFeed.tsx` - Combined comments + notifications activity feed
- `ModalsContainer.tsx` - Centralized modal rendering

**Modals** handle all CRUD operations (IssueModal, ProjectModal, TeamModal, etc.).

**Authentication**:
- `Auth.tsx` - Login/register forms
- `WorkspaceApplication.tsx` - New user onboarding

**Management Modals**:
- `UserManagementModal.tsx` - Team member management
- `JoinRequestManagementModal.tsx` - Join request approvals
- `ProjectSettingsModal.tsx` - Project configuration
- `TeamModal.tsx` - Team creation/editing
- `WorkspaceSettingsModal.tsx` - Workspace configuration

### Type System

All types defined in `types.ts` including enums for `Status`, `Priority`, `UserRole`, `NotificationType`. Core entities: `User`, `Team`, `Project`, `Issue`, `Comment`, `Notification`, `Activity`.

**Multi-Assignee**: Issues support multiple assignees via `Issue.assigneeIds` (array of user IDs). When creating/editing issues, always use this array rather than a single assignee.

**Team Stealth Mode**: Teams can be marked as `isStealth` - they are only visible to members. Non-stealth teams are visible to all users.

**Team-Specific Roles**: While users have a global `UserRole`, they can also have team-specific roles via `TeamMember.role`. This allows fine-grained permissions per team.

### Keyboard Shortcuts

- **C** - Create new issue (global)
- **/** - Focus search input
- **Esc** - Close modals (or clear search and blur when search is focused)

### Styling

**Tailwind CSS** with custom theme. Dark mode by default. Primary color: `#5E6AD2` (purple). Custom animations defined in `tailwind.config.js`.

**Path Aliases**:
- `@/` maps to project root (configured in `vite.config.ts`)
- Use `@/components/...`, `@/hooks/...`, etc. for imports

**Linting**: ESLint configuration in `eslint.config.js` using the flat config format with TypeScript, React, and React Hooks rules. Run `npm run lint` to check and `npm run lint:fix` to auto-fix issues.

## When Adding Features

1. **Backend first**: Update Prisma schema in `server/prisma/schema.prisma`, create migration
2. **API routes**: Add new endpoints in `server/routes/` as native Fastify plugins (using `.fastify.ts` suffix). Follow existing patterns in `routes/auth.fastify.ts` or `routes/issues.fastify.ts`.
3. **API client**: Add methods to `services/api.ts` for frontend to call your new endpoints
4. **Create custom hook**: Add a hook in `hooks/` (e.g., `useSomething.ts`) that uses TanStack Query
   - Use `useQuery` for fetching data
   - Use `useMutation` for writes with optimistic updates
   - Invalidate/refetch related queries on success
5. **Use hook in components**: Import and use the hook directly in components
   - Never pass server data via props
   - Never store server data in local state
6. **UI state**: Use Zustand store (`stores/uiStore.ts`) for modal states, filters, navigation
7. **WebSocket integration** (if real-time): Add sync functions to `services/websocketQuerySync.ts`
8. **Extend types.ts first**: Define interfaces before implementing
9. **Modal-based interactions**: Follow existing modal patterns for CRUD

**Database Schema Changes**:
1. Edit `server/prisma/schema.prisma`
2. Run `cd server && npx prisma migrate dev --name <description>`
3. Prisma auto-generates the migration and applies it

**WebSocket Real-time Updates**:
To add real-time notifications for new features:
1. Import broadcaster helpers from `server/websocket/fastifyWebSocketRoutes.ts` (e.g., `broadcastIssueUpdate`, `broadcastNotification`)
2. Frontend WebSocket client (`services/websocket.ts`) handles automatic reconnection
3. Add cache update functions to `services/websocketQuerySync.ts`

**For real-time updates specifically:**
- Backend broadcasts events via WebSocket
- Frontend `websocketQuerySync.ts` intercepts and updates TanStack Query cache
- No manual refetching needed - Query cache updates automatically
- Components using `useQuery` re-render with new data instantly

**Server State Rules**:
- Server state MUST be owned by TanStack Query
- UI components MUST render server state directly from `useQuery`
- WebSocket handlers may ONLY patch TanStack Query cache by ID
- Never duplicate server data in local state or props

## Issue Identifier Pattern

Issues use auto-generated identifiers like `NEO-101` combining project identifier + sequential number. This is handled by the backend API.

## Field Naming Convention

**Critical**: The backend uses snake_case, frontend uses camelCase. The API client (`services/api.ts`) handles transformation:
- `team_id` (DB) ↔ `teamId` (frontend)
- `created_at` (DB) ↔ `createdAt` (frontend)
- `is_public` (DB) ↔ `isPublic` (frontend)

When adding new API endpoints, ensure transformation is handled in the API client.

## URL Synchronization Pattern

The app uses **bidirectional URL sync** for deep linking via `hooks/useURLSync.ts`:
- **URL → State**: Parse URL on load and navigate
- **State → URL**: Update URL when team/project selection changes
- Team slugs are lowercase with hyphens: `"Engineering"` → `"engineering"`
- Project identifiers are used: `"ENG"` → `"eng"`
- Skips URL updates for public routes (`/public/*`)

**Critical: Never manually call `navigate()` when updating team/project state.**
When switching teams or projects, ONLY update the Zustand store (`ui.setCurrentTeamId()`, `ui.setSelectedProjectId()`). The `useURLSync` hook will handle the URL navigation automatically. Manual navigation creates race conditions and breaks the sync.

## Board View Quick-Create

The `BoardView.tsx` `onCreateIssue` callback receives a `status` parameter to pre-fill the new issue's status when clicking the "+" button in a specific column. Uses the `PartialIssue` type to pass pre-fill data without requiring a full Issue object.

## @Mention System

Mentions are processed on the backend:
- Scans text for `@UserName` patterns
- Creates notifications for matched users
- Skips self-mentions
- Works in both comments and issue descriptions

## Search Functionality

The app includes a global search feature in the header:
- **Search scope**: Searches across issue titles, descriptions, and identifiers
- **Keyboard shortcut**: Press `/` to focus the search input from anywhere
- **Clear search**: Press `Esc` while searching to clear and blur the input
- **Result count**: Shows number of matching issues below the search input
- **Integration**: Works with all other filters (status, assignee, project)

For server-side search, use `/api/v1/search`.

## Public Project View

Public routes (`/public/:slug`) are handled as a special case:
- No authentication required
- Read-only access (all save callbacks are no-ops)
- Issues can be viewed but not modified
- Uses `isPublicView` prop to disable editing

## Due Date Notifications

Automatic due date checking runs on the backend via scheduled jobs:
- Checks for issues due today assigned to current user
- Creates `DueDate` type notifications
- Deduplicates by checking existing notifications for same day/issue
- Only notifies for non-Done/non-Canceled issues

## Team Invitation & Join Request System

The application supports two workflows for adding users to teams:

**Invitation System** (Admin/Team Lead initiated):
- Admins/Team Leads can invite users via email (`routes/invitations.fastify.ts`)
- Generates token with expiry (default 7 days)
- Invited users register and automatically join the team with specified role
- Pending invitations visible during registration
- Accepted invitations are marked and cleaned up

**Join Request System** (User initiated):
- Users can request to join teams (`routes/joinRequests.fastify.ts`)
- Team admins see pending requests and can approve/reject
- Workflow: `pending` → `approved`/`rejected`
- One request per user per team (unique constraint)
- Auto-removes pending requests on expiry

## Error Handling

The app includes an **Error Boundary** (`ErrorBoundary.tsx`) wrapped at the root level:
- Catches JavaScript errors anywhere in the component tree
- Prevents the entire app from crashing
- Displays a styled fallback UI matching the app's dark theme
- Provides error details in a collapsible section for debugging
- Offers recovery options (reload page or navigate to home)
- Logs errors to console for debugging

The backend also has comprehensive error handling middleware (`server/middleware/error.ts`).

## Security Features

The backend implements comprehensive security:
- **Helmet** (`@fastify/helmet`): Security headers (CSP, HSTS, X-Frame-Options, etc.)
- **CORS** (`@fastify/cors`): Strict origin whitelist for cross-origin requests
- **CSRF**: Double-submit cookie pattern for state-changing requests
- **Rate Limiting** (`@fastify/rate-limit`): Per-IP limits on all endpoints
- **JWT** (`@fastify/jwt`): Token-based authentication with 3-day expiry
- **Input Sanitization**: XSS prevention on request bodies
- **Compression** (`@fastify/compress`): Response compression to reduce bandwidth

## Environment Variables

Create a `.env` file in the root directory:
```env
# Server
PORT=3001
NODE_ENV=development

# JWT (Generate a secure random string for production)
JWT_SECRET=your-secret-key-here

# Database (PostgreSQL - managed by Docker Compose)
DATABASE_URL="postgresql://neo_linear:neo_linear_password@localhost:5432/neo_linear"

# Redis (optional - graceful degradation if unavailable)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_ENABLED=true
REDIS_PREFIX=neo_linear:

# Frontend (for production)
# VITE_API_URL must be the ORIGIN ONLY — code in services/api.ts:25 appends /api/v1.
# Correct: https://linny-live.microworker.my.id
# Wrong:   https://linny-live.microworker.my.id/api/v1 (produces /api/v1/api/v1/... 404s)
VITE_API_URL=http://localhost:3001
FRONTEND_URL=http://localhost:3000
```
