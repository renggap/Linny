# Neo Linear - Project Management Application

A modern, full-stack project management application built as an enhanced version of Linear, featuring issue tracking, team collaboration, multiple view modes, and real-time updates.

## 🚀 Features

### Core Functionality
- **Issue Management**: Create, edit, delete, and track issues with full CRUD operations
- **Multiple View Modes**: List view, Kanban board view (drag & drop), and Timeline/Gantt chart view
- **Team Dashboard**: Visual dashboard with animated stat cards showing team velocity and project progress
- **Team Collaboration**: Team-based project organization with user management
- **Project Organization**: Create and manage projects within teams
- **Multi-Assignee Issues**: Assign multiple users to a single issue
- **Status Tracking**: Comprehensive issue status management (Backlog, Todo, In Progress, In Review, Done, Canceled)
- **Priority System**: Priority levels (No Priority, Urgent, High, Medium, Low)

### Advanced Features
- **JWT Authentication**: Secure authentication with 3-day token expiry and automatic refresh
- **Real-time Updates**: WebSocket integration for instant comment, notification, and issue updates
- **Instant UI Updates**: All changes applied immediately via TanStack Query cache management
- **Public Project Sharing**: Share projects publicly with read-only access via unique URLs
- **Comment System**: Threaded comments with @mention support and real-time sync
- **Subtask Creation**: Create subtasks linked to parent issues
- **Issue Dependencies**: Block issues by dependencies on other issues
- **URL Routing**: Deep linking with SEO-friendly URLs via TanStack Router (`/team/{team}/project/{project}`)
- **Keyboard Shortcuts**: Quick issue creation with 'C' key, search with '/' key
- **Activity Logging**: Track all user actions for audit trail
- **Error Handling**: Global error boundary for graceful error recovery
- **Offline Support**: Request queuing when offline, automatic sync when reconnected

### User Management
- **Role-based Access**: Administrator, Team Lead, Member, and Guest roles
- **Team-specific Roles**: Fine-grained permissions per team
- **User Invitations**: Invite new users to teams via email with expiry
- **Join Requests**: Users can request to join teams (approval workflow)
- **Profile Management**: User profile customization with avatar generation
- **Team Stealth Mode**: Teams can be marked as stealth (only visible to members)

### UI/UX Features
- **Animated Stat Cards**: Decorative backgrounds with floating particles, rotating shapes, and twinkling stars
- **Team Velocity Indicators**: Visual completion rings showing team member progress
- **Completion Indicators**: Color-coded progress indicators (green ≥75%, amber ≥50%, orange ≥25%, red <25%)
- **Drag & Drop**: Instant status updates when dragging issues between board columns
- **Smooth Animations**: Framer Motion powered transitions and hover effects
- **Responsive Design**: Works on desktop and tablet devices

## 🛠 Tech Stack

### Frontend
- **React 19** - Modern React with hooks and concurrent features
- **TypeScript** - Type-safe development
- **Vite** - Fast build tool and dev server
- **TanStack Router** - Type-safe routing with URL synchronization
- **TanStack Query** - Server state management with real-time sync
- **Zustand** - UI state management for modals, filters, navigation
- **Framer Motion** - Production-ready animation library
- **Tailwind CSS** - Utility-first CSS framework with custom theme
- **Lucide React** - Icon library

### Backend
- **Node.js** - JavaScript runtime
- **Fastify** - High-performance web framework (migrated from Express)
- **Prisma** - Type-safe ORM for database queries
- **PostgreSQL 16** - Production-grade relational database (Docker)
- **Redis 7** - Caching layer with graceful degradation (optional)
- **JWT** - JSON Web Tokens for authentication
- **WebSocket** - Real-time bidirectional communication via `@fastify/websocket`
- **Zod** - Runtime type validation
- **bcrypt** - Password hashing

### Database
- **PostgreSQL 16** - Production-grade relational database
- **Prisma ORM** - Type-safe database access with auto-generated migrations
- **Docker Compose** - Containerized database and cache for easy setup

### State Management
- **Server State**: TanStack Query with WebSocket sync
- **UI State**: Zustand store
- **Auth State**: React Context (AuthContext)

## 📦 Installation

### Prerequisites
- Node.js (version 18 or higher recommended)
- Docker and Docker Compose (for PostgreSQL and Redis)
- npm or yarn

### Setup Instructions

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd Neo-Linear
   ```

2. **Start PostgreSQL and Redis** (required for database and caching)
   ```bash
   docker compose up -d
   ```
   This starts PostgreSQL on port 5432 and Redis on port 6379.

3. **Install dependencies**
   ```bash
   # Install root dependencies
   npm install

   # Install server dependencies
   cd server
   npm install
   cd ..
   ```

4. **Configure environment variables**
   Create a `.env` file in the root directory (see Configuration section below)

5. **Run database migrations** (first time only)
   ```bash
   cd server
   npx prisma migrate dev
   cd ..
   ```

6. **Start the development server**
   ```bash
   npm run dev
   ```
   This starts both the frontend (port 3000) and backend (port 3001) concurrently.

7. **Open your browser**
   Navigate to `http://localhost:3000`

8. **Create your account**
   - Register a new account (first user is automatically promoted to Administrator)
   - Create your first team
   - Create your first project
   - Start creating issues!

## 🎯 Usage

### Getting Started
1. **Register an account** - First user becomes Administrator automatically
2. **Create a team** - Teams organize your projects and members
3. **Create a project** - Projects contain your issues
4. **Invite team members** - Add users to collaborate via invitations or join requests
5. **Create issues** - Track your work with detailed issues

### Key Workflows

#### Creating Issues
- Press **'C'** key or click "New Issue" button
- Fill in title, description, assignee(s), and due date
- Select project and priority level
- Use **@mentions** to notify team members
- Set dependencies to block issues until others are complete

#### Managing Workflow
- **List View**: Traditional table-style issue tracking with sorting/filtering
- **Board View**: Kanban-style organization with drag & drop between columns
- **Timeline View**: Gantt chart for project planning and scheduling
- **Team Dashboard**: Overview of team performance with animated stat cards

#### Team Collaboration
- Switch between teams using the team dropdown
- Filter issues by assignee, status, or project
- Use comments for discussions with @mentions
- Receive real-time notifications for mentions and due dates
- View activity feed for project updates

### Keyboard Shortcuts
| Key | Action |
|-----|--------|
| **C** | Create new issue |
| **/** | Focus search input |
| **Esc** | Close modals / Clear search |

## 📁 Project Structure

```
Neo-Linear/
├── components/              # React components
│   ├── ActivityFeed.tsx    # Combined comments + notifications feed
│   ├── Auth.tsx            # Authentication component
│   ├── BoardView.tsx       # Kanban board view with drag & drop
│   ├── Header.tsx          # Application header with search
│   ├── IssueList.tsx       # List view component
│   ├── IssueModal.tsx      # Issue creation/editing modal
│   ├── MainView.tsx        # Main content area with view routing
│   ├── MentionInput.tsx    # Text input with @mention autocomplete
│   ├── ModalsContainer.tsx # Centralized modal rendering
│   ├── ProjectModal.tsx    # Project creation modal
│   ├── ProjectRightSidebar.tsx  # Project details panel
│   ├── Sidebar.tsx         # Navigation sidebar
│   ├── TeamDashboard.tsx   # Team overview with animated stats
│   ├── TimelineView.tsx    # Gantt chart view
│   └── ...                 # Other components
├── contexts/               # React Context providers
│   └── AuthContext.tsx     # Authentication context
├── hooks/                  # Custom React hooks
│   ├── useActivities.ts    # Activity feed queries
│   ├── useComments.ts      # Comment queries & mutations
│   ├── useInitialData.ts   # Initial data fetching
│   ├── useIssues.ts        # Issue queries & mutations
│   ├── useProjects.ts      # Project queries & mutations
│   ├── useTeams.ts         # Team queries & mutations
│   ├── useURLSync.ts       # Bidirectional URL sync
│   ├── useUsers.ts         # User queries
│   ├── useWebSocket.ts     # WebSocket connection management
│   └── useWorkspaceMembers.ts  # Workspace member queries
├── server/                 # Fastify backend
│   ├── routes/            # API routes
│   │   ├── auth.ts / auth.fastify.ts
│   │   ├── teams.ts / teams.fastify.ts
│   │   ├── projects.ts / projects.fastify.ts
│   │   ├── issues.ts / issues.fastify.ts
│   │   ├── comments.ts / comments.fastify.ts
│   │   ├── notifications.ts / notifications.fastify.ts
│   │   ├── activities.ts / activities.fastify.ts
│   │   ├── invitations.ts / invitations.fastify.ts
│   │   ├── joinRequests.ts / joinRequests.fastify.ts
│   │   └── ...              # Other routes
│   ├── middleware/        # Fastify middleware
│   │   ├── auth.ts       # JWT authentication decorator
│   │   ├── cache.ts      # Redis caching layer
│   │   ├── error.ts      # Global error handling
│   │   ├── rateLimit.ts  # Rate limiting
│   │   └── validation.ts # Request validation with Zod
│   ├── websocket/        # WebSocket implementation
│   │   └── fastifyWebSocketRoutes.ts  # WebSocket routes + broadcast helpers
│   ├── cache/            # Cache implementations
│   │   └── redis.ts      # Redis client with graceful degradation
│   ├── jobs/             # Background job queues
│   │   └── jobQueue.ts   # In-memory job queue
│   ├── prisma/           # Prisma ORM
│   │   └── schema.prisma # Database schema
│   ├── validation/        # Zod schemas
│   ├── database.ts        # Prisma database manager (wrapper)
│   └── index.ts           # Server entry point
├── services/               # Frontend services
│   ├── api.ts             # API client with auth & offline support
│   ├── queryClient.ts     # TanStack Query client configuration
│   ├── websocket.ts       # WebSocket client with auto-reconnect
│   ├── websocketQuerySync.ts  # WebSocket → Query cache bridge
│   └── mentionUtils.tsx   # @mention utilities
├── stores/                 # Zustand stores
│   └── uiStore.ts         # UI state (modals, filters, navigation)
├── types.ts               # TypeScript type definitions
├── router.tsx             # TanStack Router configuration
├── App.tsx                # Main application component
├── index.tsx              # Application entry point
├── index.css              # Global styles
├── tailwind.config.js     # Tailwind CSS configuration
├── vite.config.ts         # Vite configuration
├── docker-compose.yml     # Docker Compose for PostgreSQL & Redis
├── eslint.config.js       # ESLint configuration
├── package.json           # Root dependencies
└── server/package.json    # Server dependencies
```

## 🔧 Configuration

### Environment Variables
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
VITE_API_URL=http://localhost:3001
FRONTEND_URL=http://localhost:3000
```

### Development Commands
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

### Build Configuration
- **Development**: `npm run dev` (Starts both frontend and backend)
- **Build Frontend**: `npm run build`
- **Build Server**: `npm run build:server`
- **Preview Frontend**: `npm run preview`

### Styling
The application uses Tailwind CSS with a custom dark theme:
- Primary: `#5E6AD2` (Purple)
- Background: `#1E1F24` (Dark)
- Border: `#363840` (Dark gray)
- Text: `#DEDEDE` (Light gray)

## 🔐 Authentication Flow

1. **Register**: User creates account with email/password
2. **Login**: User receives access token (3-day expiry)
3. **API Requests**: Access token sent in `Authorization: Bearer` header
4. **Token Refresh**: Automatic refresh on 401 responses
5. **Logout**: Token cleared from memory

## 🔄 Real-time Updates

The application uses WebSocket for real-time synchronization:

1. **WebSocket Connection**: Established on authentication
2. **Room-based Subscriptions**: Subscribe to issue, project, or team updates
3. **Cache Updates**: WebSocket events automatically update TanStack Query cache
4. **Instant UI**: No manual refetching needed - updates appear instantly

**WebSocket Events:**
- `comment_updated` - New or updated comments
- `notification.created` - New notifications
- `issue_updated` - Issue status/priority/assignee changes
- `project_updated` - Project metadata changes

## 🚀 Deployment

### Production Build

1. **Build the frontend**
   ```bash
   npm run build
   ```

2. **Build the server**
   ```bash
   npm run build:server
   ```

3. **Start the production server**
   ```bash
   cd server
   npm run start
   ```

4. **Configure reverse proxy** (nginx example)
   ```nginx
   location /api {
       proxy_pass http://localhost:3001;
       proxy_http_version 1.1;
       proxy_set_header Upgrade $http_upgrade;
       proxy_set_header Connection 'upgrade';
       proxy_set_header Host $host;
       proxy_cache_bypass $http_upgrade;
   }

   location /ws {
       proxy_pass http://localhost:3001;
       proxy_http_version 1.1;
       proxy_set_header Upgrade $http_upgrade;
       proxy_set_header Connection "Upgrade";
       proxy_set_header Host $host;
   }

   location / {
       root /path/to/dist;
       try_files $uri $uri/ /index.html;
   }
   ```

### Deployment Options
- **Vercel/Netlify**: Deploy frontend, use serverless functions or separate backend
- **DigitalOcean/AWS**: Deploy full stack on a VPS
- **Docker**: Containerize both frontend and backend
- **Railway/Render**: Full-stack deployment with managed databases

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines
- Follow the existing code style (see `eslint.config.js`)
- Add TypeScript types for all new code
- Include error handling for API calls
- Update the README for new features
- Server state MUST be owned by TanStack Query
- UI state uses Zustand store
- Never duplicate server data in local state

### State Management Rules
- **Server State**: Use TanStack Query hooks (`useIssues`, `useProjects`, etc.)
- **UI State**: Use Zustand store (`useUIStore()`)
- **Auth State**: Use `AuthContext`
- **WebSocket Handlers**: May ONLY patch TanStack Query cache, never update React state directly

## 📋 Roadmap

- [ ] Email notifications for @mentions
- [ ] File attachments for issues
- [ ] Advanced search with filters
- [ ] Mobile-responsive design improvements
- [ ] Calendar view for deadlines
- [ ] Custom workflows per project
- [ ] Time tracking on issues
- [ ] Export issues to CSV/JSON
- [ ] Integrations (Slack, GitHub, etc.)
- [ ] Dark/Light theme toggle
- [ ] Multi-language support

## 🐛 Bug Reports

To report a bug or suggest a feature:
1. Check existing issues
2. Create a new issue with:
   - Clear description
   - Steps to reproduce
   - Expected vs actual behavior
   - Screenshots if applicable

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- Built with React 19 and TypeScript
- Inspired by Linear's excellent UX
- Uses Lucide icons for beautiful SVG icons
- Powered by Vite for fast development
- Backend built with Fastify and Prisma
- Database powered by PostgreSQL
- Real-time updates via WebSocket
- State management with TanStack Query and Zustand
- Animations by Framer Motion

## 📞 Support

For support and questions:
- Create an issue in the repository
- Check the documentation in `CLAUDE.md`
- Review existing issues and discussions

---

**Made with ❤️ using React 19, TypeScript, Fastify, and TanStack**
