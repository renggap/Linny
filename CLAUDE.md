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
npm run migrate          # Run database migrations
npm run lint             # Run ESLint
npm run lint:fix         # Run ESLint with auto-fix
npm run format           # Run Prettier to format code
npm run format:check     # Check code formatting with Prettier
npm run typecheck        # Run TypeScript type checking
```

## Architecture Overview

This is a **full-stack application** with a React frontend and Express backend using sql.js for persistent data storage.

### Full-Stack Architecture

**Frontend**: React 19 + TypeScript + Vite, served on port 3000
**Backend**: Express + Node.js, running on port 3001
**Database**: sql.js (SQLite compiled to WebAssembly) with file-based persistence (`linear_clone.db`)

The architecture differs from the old localStorage-only design:
- Data is stored in a proper SQL database via the backend API
- Authentication uses JWT with httpOnly cookies for security
- State is fetched from the API and cached in React state (not localStorage)
- Offline support is implemented via request queuing in `services/api.ts`

### State Management Pattern

**All state is centralized in `App.tsx`** - this is the single source of truth. State flows down to components via props, and actions bubble up through callback props. There is no Redux, Zustand, or Context API for app state (only AuthContext and ThemeContext).

Key state categories in `App.tsx`:
- **Data state**: `users`, `teams`, `projects`, `issues`, `comments`, `notifications`, `activities`
- **UI state**: Modal open/close flags, `currentTeamId`, `selectedProjectId`, `currentView`
- **Navigation state**: `isSidebarCollapsed`, `isRightSidebarOpen`
- **Filter state**: `statusFilter`, `assigneeFilter`, `searchQuery`
- **Loading states**: `isDataLoading` for initial data fetch

**Current user** is managed by `AuthContext` (in `contexts/AuthContext.tsx`), not by `App.tsx` state.

### Backend API Structure

The backend (`server/` directory) uses Express with a modular route structure:
- `routes/auth.ts` - Authentication endpoints (login, register, logout, refresh)
- `routes/users.ts` - User management
- `routes/teams.ts` - Team CRUD operations
- `routes/projects.ts` - Project CRUD, public sharing
- `routes/issues.ts` - Issue management, status updates, subtasks, dependencies
- `routes/comments.ts` - Comment system
- `routes/notifications.ts` - Notification management
- `routes/activities.ts` - Activity logging
- `routes/analytics.ts` - API analytics/metrics
- `routes/admin.ts` - Admin operations
- `routes/files.ts` - File uploads
- `routes/search.ts` - Search functionality
- `routes/export.ts` - Data export
- `routes/webhooks.ts` - Webhook integrations
- `routes/apiKeys.ts` - API key management

**API Versioning**: All endpoints use `/api/v1/` prefix for versioning.

### Authentication & Security

**JWT Authentication Flow**:
- Access tokens (15min expiry) stored in memory
- Refresh tokens (7 days) stored as httpOnly cookies
- CSRF protection on all state-changing requests
- Automatic token refresh on 401 responses
- Rate limiting on all endpoints (auth: 5/15min, API: 100/15min)

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

**Usage**: Import from `services/api.ts`:
```tsx
import { api } from './services/api';
const users = await api.users.getAll();
const issue = await api.issues.getById(id);
```

### Database (sql.js)

- **File**: `linear_clone.db` in project root
- **Type**: SQLite database via sql.js (WebAssembly)
- **Schema**: Defined in `server/schema.sql`
- **Migrations**: Run via `npm run migrate` (uses `server/migrate.ts`)
- **Access**: Database operations in `server/database.ts`

**Important**: The database uses snake_case for column names (e.g., `team_id`, `created_at`). The API client handles transformation to/from camelCase.

### Context Providers

Two React contexts are used:
1. **AuthContext** (`contexts/AuthContext.tsx`) - Authentication state
2. **ThemeContext** (`contexts/ThemeContext.tsx`) - Dark/light theme (currently unused)

Wrap your app with these providers (see `index.tsx`).

### Custom Hooks

The `hooks/` directory contains:
- `useLocalStorage<T>(key, initialValue)` - Synchronizes state with localStorage, handles Date serialization automatically
- `useLocalStorageOptional<T>(key, initialValue)` - Same as above but for nullable values

**Note**: These hooks are NOT used for app data anymore (data comes from API). They're only used for UI preferences like `isSidebarCollapsed`.

### Routing

Uses **React Router DOM v7** with declarative routes in `App.tsx`. Routes include:
- `/` - Main app (redirects to auth if not logged in)
- `/public/:slug` - Public project read-only view
- `/team/:teamId/project/:projectId` - Project detail views

### Component Organization

Components are **view-focused** rather than domain-focused:
- `IssueList.tsx` - Table/list view for issues
- `BoardView.tsx` - Kanban board with drag-and-drop
- `TimelineView.tsx` - Gantt chart timeline
- `Sidebar.tsx` - Navigation with team/project switching
- `ProjectRightSidebar.tsx` - Issue details and filters
- `PublicViewContainer.tsx` - Wrapper for public project views

**Modals** handle all CRUD operations (IssueModal, ProjectModal, TeamModal, etc.).

### Type System

All types defined in `types.ts` including enums for `Status`, `Priority`, `UserRole`, `NotificationType`. Core entities: `User`, `Team`, `Project`, `Issue`, `Comment`, `Notification`, `Activity`.

**Multi-Assignee**: Issues support multiple assignees via `Issue.assigneeIds` (array of user IDs). When creating/editing issues, always use this array rather than a single assignee.

### Keyboard Shortcuts

- **C** - Create new issue (global)
- **/** - Focus search input
- **Esc** - Close modals (or clear search and blur when search is focused)

### Styling

**Tailwind CSS** with custom theme. Dark mode by default. Primary color: `#5E6AD2` (purple). Custom animations defined in `tailwind.config.js`.

## When Adding Features

1. **Backend first**: Add database schema changes to `server/schema.sql`, create migration if needed
2. **API routes**: Add new endpoints in `server/routes/` following existing patterns
3. **API client**: Add methods to `services/api.ts` for frontend to call your new endpoints
4. **App state**: Add state to `App.tsx` and fetch data in `useEffect` hooks
5. **Pass down via props**: Use callback props for actions
6. **Extend types.ts first**: Define interfaces before implementing
7. **Modal-based interactions**: Follow existing modal patterns for CRUD

## Issue Identifier Pattern

Issues use auto-generated identifiers like `LIN-101` combining project identifier + sequential number. This is handled by the backend API.

## Field Naming Convention

**Critical**: The backend uses snake_case, frontend uses camelCase. The API client (`services/api.ts`) handles transformation:
- `team_id` (DB) ↔ `teamId` (frontend)
- `created_at` (DB) ↔ `createdAt` (frontend)
- `is_public` (DB) ↔ `isPublic` (frontend)

When adding new API endpoints, ensure transformation is handled in the API client.

## URL Synchronization Pattern

The app uses **bidirectional URL sync** for deep linking:
- **URL → State**: Parse URL on load and navigate (effect in `App.tsx:566-622`)
- **State → URL**: Update URL when team/project/issue selection changes (effect in `App.tsx:624-659`)
- Team slugs are lowercase with hyphens: `"Engineering"` → `"engineering"`
- Project identifiers are used: `"ENG"` → `"eng"`
- Skip URL updates for public routes (`/public/*`)

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

The search is implemented in `App.tsx` via the `searchQuery` state and filters the `visibleIssues` array client-side. For server-side search, use `/api/v1/search`.

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

## Error Handling

The app includes an **Error Boundary** (`ErrorBoundary.tsx`) wrapped at the root level in `index.tsx`:
- Catches JavaScript errors anywhere in the component tree
- Prevents the entire app from crashing
- Displays a styled fallback UI matching the app's dark theme
- Provides error details in a collapsible section for debugging
- Offers recovery options (reload page or navigate to home)
- Logs errors to console for debugging

The backend also has comprehensive error handling middleware (`server/middleware/error.ts`).

## Offline Support

The API client (`services/api.ts`) implements offline support:
- Detects online/offline status via `navigator.onLine`
- Queues failed requests when offline
- Automatically syncs queued requests when connection restored
- Export `getOfflineStatus()` to check offline state from UI

## Security Features

The backend implements comprehensive security:
- **Helmet**: Security headers (CSP, HSTS, X-Frame-Options, etc.)
- **CORS**: Strict origin whitelist for cross-origin requests
- **CSRF**: Double-submit cookie pattern for state-changing requests
- **Rate Limiting**: Per-IP limits on all endpoints
- **Input Sanitization**: XSS prevention on request bodies
- **Compression**: Response compression to reduce bandwidth
- **Request Timeout**: 30-second timeout on all requests

## Environment Variables

Create a `.env` file in the root directory:
```env
# Server
PORT=3001
NODE_ENV=development

# JWT (Generate a secure random string for production)
JWT_SECRET=your-secret-key-here

# Database
DATABASE_PATH=./linear_clone.db

# Frontend (for production)
VITE_API_URL=http://localhost:3001
FRONTEND_URL=http://localhost:3000
```
