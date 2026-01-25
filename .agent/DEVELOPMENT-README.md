# Neo Linear - Navigator Development Guide

**Project**: Neo Linear
**Tech Stack**: React 19, TypeScript, Vite, TanStack Query/Router, Zustand, Tailwind CSS, Fastify, Prisma, PostgreSQL
**Initialized**: 2026-01-21
**Navigator Version**: 5.2.0

---

## Quick Start

```bash
# Start development
npm run dev              # Start both frontend (port 3000) and backend (port 3001)

# Start individual services
npm run dev:frontend     # Start only frontend dev server
npm run dev:server       # Start only backend server

# Database operations
docker compose up -d     # Start PostgreSQL and Redis
cd server && npx prisma studio    # Open Prisma Studio GUI
```

---

## Project Overview

A full-stack Linear clone with:
- **Frontend**: React 19 + TypeScript + Vite, served on port 3000
- **Backend**: Fastify + Node.js, running on port 3001
- **Database**: PostgreSQL 16 with Prisma ORM (Docker)
- **Cache**: Redis 7 with ioredis client (optional, graceful degradation)
- **Real-time**: WebSocket support via `@fastify/websocket`
- **Job Queue**: In-memory queue with exponential backoff
- **State Management**: TanStack Query (server) + Zustand (UI)

---

## Architecture

### State Management Pattern

- **Server State**: TanStack Query with custom hooks in `hooks/`
- **UI State**: Zustand store in `stores/uiStore.ts`
- **Auth State**: `AuthContext` in `contexts/AuthContext.tsx`

**Critical Rule**: Server state MUST be owned by TanStack Query. Never duplicate in local state.

### Backend API Structure

```
server/routes/
├── auth.fastify.ts          # Authentication (login, register, refresh)
├── users.fastify.ts         # User management
├── teams.fastify.ts         # Team CRUD operations
├── projects.fastify.ts      # Project CRUD, public sharing
├── issues.fastify.ts        # Issue management, status updates
├── comments.fastify.ts      # Comment system
├── activities.fastify.ts    # Activity logging
├── notifications.fastify.ts # Notification management
├── search.fastify.ts        # Search functionality
├── invitations.fastify.ts   # Team invitation system
└── joinRequests.fastify.ts  # Team join request system
```

### Key Directories

- `components/` - React components (view-focused)
- `hooks/` - Custom TanStack Query hooks for data fetching
- `services/` - API client, WebSocket, query sync
- `stores/` - Zustand store for UI state
- `server/prisma/` - Database schema and migrations
- `server/middleware/` - Auth, caching, rate limiting, validation
- `packages/contracts/` - Scope validation contracts (Zod)

---

## Important Conventions

### Scope & Query Keys

All queries are scoped to team/workspace to prevent data leakage:

```typescript
// Correct: Scoped query key with primitive values
queryKey: ['scope', teamId, 'issues', 'list', teamId, projectId, status, assigneeId, search]

// WRONG: Object reference causes cache issues
queryKey: ['scope', teamId, 'issues', 'list', filters] // Don't do this!
```

### Field Naming

- **Backend**: `snake_case` (e.g., `team_id`, `created_at`)
- **Frontend**: `camelCase` (e.g., `teamId`, `createdAt`)
- API client handles transformation automatically

### URL Synchronization

**NEVER manually call `navigate()` when changing teams/projects**. Update Zustand store instead:

```typescript
// Correct: Update store, useURLSync handles navigation
ui.setCurrentTeamId(newTeamId);

// WRONG: Manual navigation breaks sync
navigate({ to: `/team/${newTeamId}` }); // Don't do this!
```

---

## When Adding Features

1. Update Prisma schema → create migration
2. Add Fastify route in `server/routes/`
3. Add API client method in `services/api.ts`
4. Create custom hook in `hooks/` using TanStack Query
5. Use hook directly in components
6. Add WebSocket sync if real-time needed
7. Extend types in `types.ts`

---

## Database Migrations

```bash
cd server
npx prisma migrate dev --name <description>  # Create and apply migration
npx prisma generate                           # Regenerate Prisma Client
npx prisma studio                             # Open Prisma Studio
```

---

## Development Commands

```bash
npm run lint           # Run ESLint
npm run lint:fix       # Run ESLint with auto-fix
npm run format         # Run Prettier
npm run format:check   # Check formatting
npm run typecheck      # Run TypeScript type checking
```

---

## Environment Variables

Create `.env` in root:

```env
# Server
PORT=3001
NODE_ENV=development

# JWT (Generate secure random string for production)
JWT_SECRET=your-secret-key-here

# Database (PostgreSQL - Docker)
DATABASE_URL="postgresql://linear_clone:linear_clone_password@localhost:5432/linear_clone"

# Redis (optional)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_ENABLED=true

# Frontend
VITE_API_URL=http://localhost:3001
FRONTEND_URL=http://localhost:3000
```

---

## Active Work

### Recent Refactoring (from refactor.md)
- Implemented workspace scope contracts to prevent data leakage
- Added scope validation to Fastify routes
- Updated frontend hooks with scoped query keys
- Migrated from Express to Fastify routes
- Search now scoped to current team (major security fix)

### Known Issues
- Auth refresh token handling needs investigation
- Some routes still need scope validation (comments, notifications)

---

## Navigator Workflow

### Starting a Session
```bash
# Say this to Claude:
"Start my Navigator session"
```

### Creating Tasks
```bash
"Create a task for adding dark mode toggle"
```

### Saving Progress
```bash
"Save my progress"          # Creates context marker
"Clear context, keep progress"  # Compact and continue
```

### Token Monitoring
Navigator warns at 70% context usage, critical alert at 85%.

---

## Documentation Structure

```
.agent/
├── DEVELOPMENT-README.md   # This file
├── .nav-config.json        # Navigator configuration
├── tasks/                  # Implementation plans
├── system/                 # Architecture docs
├── sops/                   # Standard Operating Procedures
│   ├── integrations/       # API integrations
│   ├── debugging/          # Debugging patterns
│   ├── development/        # Development workflows
│   └── deployment/         # Deployment procedures
└── grafana/                # Metrics dashboard setup
```

---

## Further Reading

- `CLAUDE.md` - Detailed project instructions for Claude Code
- `refactor.md` - Workspace scope refactor documentation
- `server-state.md` - Server state management rules
- `docs/realtime-checklist.md` - WebSocket implementation checklist
