# GEMINI.md - Linny Project Context

This document provides a comprehensive overview of the Linny project to serve as instructional context for AI agents.

## Project Overview
A modern, full-stack project management application mimicking Linear. Features include issue tracking (List, Board, Timeline views), team/project management, real-time notifications, and multi-user collaboration.

### Core Tech Stack
- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS, TanStack Query, React Router v7.
- **Backend**: Node.js, Fastify (migrating from Express), Prisma ORM, PostgreSQL, Redis.
- **Infrastructure**: Docker Compose (PostgreSQL 16, Redis 7).
- **Communication**: REST API + WebSockets for real-time updates.

---

## Architecture & Patterns

### 1. State Management
- **Centralized Source of Truth**: `App.tsx` manages core data state (`users`, `teams`, `projects`, `issues`, `activities`).
- **TanStack Query**: Specifically used for **Comments** and **Notifications** to handle optimistic updates and real-time sync.
- **AuthContext**: Manages user authentication state, tokens, and profile data.
- **UI State**: Modal toggles, filters, and view modes are managed locally in `App.tsx` or specialized components.

### 2. Backend Structure (`/server`)
- **Fastify Implementation**: Modular plugin-based architecture (`server/index.ts`).
- **Prisma ORM**: All database interactions go through Prisma (`server/prisma/schema.prisma`).
- **Security**: JWT auth, CSRF protection, rate limiting, and Helmet security headers.
- **Real-time**: WebSocket manager handles room-based broadcasts for comments and notifications.
- **Background Jobs**: Bull-based (or in-memory) job queue for emails and notifications.

### 3. Data Transformation (Crucial)
- **Database**: Uses `snake_case` for column names (e.g., `team_id`, `created_at`).
- **Frontend**: Uses `camelCase` (e.g., `teamId`, `createdAt`).
- **Transformation Layer**: The API client (`services/api.ts`) automatically handles this conversion for all requests and responses. **Always follow this convention when adding new fields.**

### 4. Real-time Sync
- WebSocket events (e.g., `comment.created`) are broadcast by the backend.
- The frontend `websocketQuerySync.ts` intercepts these and updates the TanStack Query cache directly, ensuring instant UI updates without manual refetches.

---

## Development Workflows

### Key Commands
```bash
npm run dev              # Start frontend (3000) and backend (3001) concurrently
npm run dev:frontend     # Start Vite dev server
npm run dev:server       # Start Fastify server (tsx watch)
npm run seed             # Seed database with mock data
npm run typecheck        # Run TypeScript compiler check
npm run prisma:migrate   # (In server/) Run Prisma migrations
```

### Database Management
- **Schema**: `server/prisma/schema.prisma`
- **Migrations**: `cd server && npx prisma migrate dev --name <description>`
- **Studio**: `cd server && npx prisma studio` to view data in GUI.

---

## Directory Map

### Frontend (`/src` root)
- `App.tsx`: The main application orchestrator and state hub.
- `components/`: View-focused React components (e.g., `BoardView.tsx`, `IssueModal.tsx`).
- `services/api.ts`: Centralized API client with transformation and offline logic.
- `services/websocket.ts`: WebSocket client for real-time events.
- `types.ts`: Shared TypeScript interfaces and enums.

### Backend (`/server`)
- `routes/`: API endpoint definitions (organized by domain).
- `middleware/`: Auth, validation, and error handling logic.
- `prisma/`: Database schema and migration history.
- `websocket/`: WebSocket server and broadcast managers.
- `jobs/`: Background task processing.

---

## Key Files for Investigation
1. `App.tsx`: Central state and routing logic.
2. `server/prisma/schema.prisma`: The definitive data model.
3. `services/api.ts`: How the frontend communicates with the backend.
4. `CLAUDE.md`: Highly detailed development guide (check this for specific implementation rules).
5. `types.ts`: Core data structures used throughout the app.

---

## AI Implementation Guidelines
- **Always Backend First**: When adding a feature, start with the Prisma schema and API routes.
- **Prop Drilling vs Context**: Prefer passing props from `App.tsx` for core entities. Use `useQuery` for comments/notifications.
- **Naming**: Ensure `camelCase` on frontend and `snake_case` in Prisma/DB.
- **Modals**: Most CRUD happens in modals (e.g., `IssueModal.tsx`). Follow this pattern.
- **Icons**: Use `Lucide React` for all icons.
