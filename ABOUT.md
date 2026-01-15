# Linear Clone Project Analysis

## Overview
This is a full-stack project management application built as a clone of Linear, featuring issue tracking, team collaboration, and multiple view modes. The application is built with React 19 + TypeScript on the frontend and Node.js + Express + SQLite on the backend.

## Tech Stack

### Frontend
- **React 19** with TypeScript
- **Vite** for build tooling and dev server
- **Tailwind CSS** for styling
- **Lucide React** for icons
- **React Router DOM v7** for client-side routing

### Backend
- **Node.js** with Express
- **sql.js** (SQLite compiled to WebAssembly) for database
- **JWT** for authentication
- **bcrypt** for password hashing
- **Zod** for runtime validation
- **express-rate-limit** for rate limiting

## Architecture

### Frontend Structure
```
components/
├── Auth.tsx              # Authentication component
├── BoardView.tsx         # Kanban board view
├── IssueList.tsx         # List view component
├── IssueModal.tsx        # Issue creation/editing modal
├── ProjectModal.tsx      # Project creation modal
├── ProjectOverviewHeader.tsx
├── ProjectRightSidebar.tsx
├── PublicProjectView.tsx # Public project sharing
├── Sidebar.tsx           # Navigation sidebar
├── TeamModal.tsx         # Team creation modal
├── TimelineView.tsx      # Gantt chart view
├── UserManagementModal.tsx
├── UserProfileModal.tsx
├── NotificationPopover.tsx
├── PrioritySelect.tsx
├── UserSelect.tsx
└── Icons.tsx

services/
└── api.ts               # API client with JWT handling

contexts/
└── AuthContext.tsx      # Authentication context

hooks/
└── useLocalStorage.ts   # Local storage synchronization
```

### Backend Structure
```
server/
├── database.ts           # Database manager with sql.js
├── index.ts             # Express server entry point
├── migrate.ts           # Migration script for localStorage
├── auth/
│   ├── jwt.ts           # JWT utilities
│   └── password.ts      # Password hashing
├── middleware/
│   ├── auth.ts          # Authentication middleware
│   ├── error.ts         # Error handling
│   ├── rateLimit.ts     # Rate limiting
│   └── validation.ts    # Request validation
├── routes/
│   ├── auth.ts          # Authentication endpoints
│   ├── users.ts         # User management
│   ├── teams.ts         # Team management
│   ├── projects.ts      # Project management
│   ├── issues.ts        # Issue management
│   ├── comments.ts      # Comment system
│   ├── notifications.ts # Notification system
│   └── activities.ts    # Activity logging
├── validation/
│   └── schemas.ts       # Zod validation schemas
└── schema.sql           # Database schema
```

## Key Features

### Core Functionality
- **Issue Management**: Create, edit, delete, and track issues with full CRUD operations
- **Multiple View Modes**: List view, Kanban board view, and Timeline/Gantt chart view
- **Team Collaboration**: Team-based project organization with user management
- **Project Organization**: Create and manage projects within teams
- **Multi-Assignee Issues**: Assign multiple users to a single issue
- **Status Tracking**: Comprehensive issue status management (Backlog, Todo, In Progress, In Review, Done, Canceled)
- **Priority System**: Priority levels (No Priority, Urgent, High, Medium, Low)

### Advanced Features
- **JWT Authentication**: Secure authentication with access and refresh tokens
- **Real-time Notifications**: Due date reminders and @mention notifications
- **Public Project Sharing**: Share projects publicly with read-only access via unique URLs
- **Comment System**: Threaded comments with @mention support
- **Subtask Creation**: Create subtasks linked to parent issues
- **Issue Dependencies**: Block issues by dependencies on other issues
- **URL Routing**: Deep linking with SEO-friendly URLs (`/team/{team}/project/{project}/issue/{issue}`)
- **Keyboard Shortcuts**: Quick issue creation with 'C' key, search with '/' key
- **Activity Logging**: Track all user actions for audit trail
- **Error Handling**: Global error boundary for graceful error recovery

### User Management
- **Role-based Access**: Admin, Team Lead, Member, and Viewer roles
- **User Invitations**: Invite new users to teams
- **Profile Management**: User profile customization with avatar generation
- **Token Management**: Automatic token refresh for seamless sessions

## Database Schema

The application uses a comprehensive relational database with the following main entities:

- **Users**: User accounts with roles and authentication
- **Teams**: Team organization with members
- **Projects**: Projects within teams, can be public or private
- **Issues**: Issues with statuses, priorities, assignees, dependencies
- **Comments**: Threaded comments on issues
- **Notifications**: User notifications for mentions and due dates
- **Activities**: Audit log of user actions
- **Refresh Tokens**: JWT refresh token management

## Authentication Flow

1. **Register**: User creates account with email/password (first user becomes Admin)
2. **Login**: User receives access token (15min) and refresh token (7 days)
3. **API Requests**: Access token sent in `Authorization: Bearer` header
4. **Token Refresh**: Automatic refresh when access token expires
5. **Logout**: Refresh token invalidated on server

## Development Setup

### Prerequisites
- Node.js (version 18 or higher recommended)
- npm or yarn

### Installation
```bash
# Clone repository
git clone <repository-url>
cd Linear-Clone

# Install dependencies
npm install
cd server && npm install && cd ..

# Start development server
npm run dev
```

### Build Commands
- `npm run dev` - Start both frontend and backend concurrently
- `npm run build` - Build frontend for production
- `npm run preview` - Preview production build
- `npm run migrate` - Run database migration script

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `POST /api/auth/refresh` - Refresh access token
- `POST /api/auth/logout` - Logout user
- `GET /api/auth/me` - Get current user

### Core Resources
- `GET/POST/PUT/DELETE /api/users` - User management
- `GET/POST/PUT/DELETE /api/teams` - Team management
- `GET/POST/PUT/DELETE /api/projects` - Project management
- `GET/POST/PUT/DELETE /api/issues` - Issue management
- `GET/POST /api/comments` - Comment system
- `GET/PUT /api/notifications` - Notification system
- `GET /api/activities` - Activity logging

## Security Features

- **Password Requirements**: Min 8 chars, uppercase, lowercase, number
- **JWT Authentication**: Secure token-based auth with refresh mechanism
- **Rate Limiting**: Different limits for auth (5/15min), API (100/15min), read-only (200/15min)
- **Input Validation**: Zod schemas for all request validation
- **Role-based Authorization**: Admin, Team Lead, Member, Viewer permissions
- **CORS Protection**: Configurable CORS settings
- **Helmet Security**: Security headers middleware

## Key Components Analysis

### App.tsx (Main Application)
- Manages global state and data fetching
- Handles URL routing and navigation state
- Implements keyboard shortcuts (C for create, / for search)
- Coordinates between different views (List, Board, Timeline)
- Manages modals and popovers

### Sidebar.tsx (Navigation)
- Team switching and management
- Project filtering and navigation
- User management for teams
- Status-based filtering
- User assignment filtering

### IssueModal.tsx (Issue Management)
- Rich text editor with @mention support
- Multi-select user assignment
- Priority and status selection
- Date pickers for start/due dates
- Dependency management
- Comment system integration
- Subtask creation

### BoardView.tsx (Kanban)
- Drag-and-drop issue management
- Column-based status organization
- Real-time updates and filtering
- Issue creation per column

### TimelineView.tsx (Gantt)
- Project timeline visualization
- Issue duration and dependencies
- Interactive timeline editing

## Notable Implementation Details

1. **Database**: Uses sql.js (SQLite in WebAssembly) for persistent storage
2. **State Management**: Mix of React context and local component state
3. **Error Handling**: Comprehensive error boundaries and API error handling
4. **Performance**: Lazy loading, memoization, and efficient re-rendering
5. **Accessibility**: Keyboard navigation and semantic HTML
6. **Responsive Design**: Mobile-friendly with Tailwind CSS
7. **Real-time Features**: Live notifications and activity updates

## Development Patterns

- **Type Safety**: Full TypeScript coverage with strict typing
- **Component Composition**: Reusable, composable components
- **API Layer**: Centralized API client with automatic token refresh
- **Middleware Pattern**: Express middleware for auth, validation, and error handling
- **Schema Validation**: Zod schemas for runtime type checking
- **Security First**: Built-in security measures and best practices

This project demonstrates a well-architected full-stack application with modern development practices, comprehensive feature set, and attention to user experience and security.