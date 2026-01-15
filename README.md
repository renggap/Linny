# Linear Clone - Project Management Application

A modern, full-stack project management application built as a clone of Linear, featuring issue tracking, team collaboration, and multiple view modes.

## 🚀 Features

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

## 🛠 Tech Stack

### Frontend
- **React 19** - Modern React with hooks
- **TypeScript** - Type-safe development
- **Vite** - Fast build tool and dev server
- **React Router DOM v7** - Client-side routing
- **Tailwind CSS** - Utility-first CSS framework
- **Lucide React** - Icon library

### Backend
- **Node.js** - JavaScript runtime
- **Express** - Web framework
- **sql.js** - SQL database compiled to WebAssembly
- **JWT** - JSON Web Tokens for authentication
- **bcrypt** - Password hashing
- **Zod** - Runtime type validation

### Database
- **sql.js** - SQLite compiled to JavaScript/Wasm
- Persistent file-based storage (`linear_clone.db`)

## 📦 Installation

### Prerequisites
- Node.js (version 18 or higher recommended)
- npm or yarn

### Setup Instructions

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd Linear-Clone
   ```

2. **Install dependencies**
   ```bash
   # Install root dependencies
   npm install

   # Install server dependencies
   cd server
   npm install
   cd ..
   ```

3. **Start the development server**
   ```bash
   npm run dev
   ```
   This starts both the frontend (port 3000) and backend (port 3001) concurrently.

4. **Open your browser**
   Navigate to `http://localhost:3000`

5. **Create your account**
   - Register a new account (first user is automatically promoted to Admin)
   - Create your first team
   - Create your first project
   - Start creating issues!

## 🎯 Usage

### Getting Started
1. **Register an account** - First user becomes Admin automatically
2. **Create a team** - Teams organize your projects and members
3. **Create a project** - Projects contain your issues
4. **Invite team members** - Add users to collaborate
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
- **Board View**: Kanban-style organization by status columns
- **Timeline View**: Gantt chart for project planning and scheduling

#### Team Collaboration
- Switch between teams using the team dropdown
- Filter issues by assignee, status, or project
- Use comments for discussions with @mentions
- Receive notifications for mentions and due dates
- View activity feed for project updates

### Keyboard Shortcuts
| Key | Action |
|-----|--------|
| **C** | Create new issue |
| **/** | Focus search input |
| **Esc** | Close modals / Clear search |

## 📁 Project Structure

```
Linear-Clone/
├── components/              # React components
│   ├── Auth.tsx            # Authentication component
│   ├── BoardView.tsx       # Kanban board view
│   ├── IssueList.tsx       # List view component
│   ├── IssueModal.tsx      # Issue creation/editing modal
│   ├── ProjectModal.tsx    # Project creation modal
│   ├── ProjectRightSidebar.tsx  # Project details panel
│   ├── Sidebar.tsx         # Navigation sidebar
│   ├── TimelineView.tsx    # Gantt chart view
│   ├── UserProfileModal.tsx  # User profile editing
│   └── ...                 # Other components
├── contexts/               # React Context providers
│   └── AuthContext.tsx     # Authentication context
├── hooks/                  # Custom React hooks
│   └── useLocalStorage.ts  # Local storage synchronization hook
├── server/                 # Express backend
│   ├── routes/            # API routes
│   │   ├── auth.ts        # Authentication endpoints
│   │   ├── teams.ts       # Team management
│   │   ├── projects.ts    # Project management
│   │   ├── issues.ts      # Issue management
│   │   ├── comments.ts    # Comment system
│   │   ├── notifications.ts # Notification system
│   │   └── activities.ts  # Activity logging
│   ├── middleware/        # Express middleware
│   │   ├── auth.ts       # JWT authentication
│   │   ├── error.ts      # Error handling
│   │   ├── rateLimit.ts  # Rate limiting
│   │   └── validation.ts # Request validation
│   ├── validation/        # Zod schemas
│   ├── database.ts        # sql.js database manager
│   ├── schema.sql         # Database schema
│   └── index.ts           # Server entry point
├── services/               # Frontend API client
│   └── api.ts             # API wrapper with auth handling
├── types.ts               # TypeScript type definitions
├── App.tsx                # Main application component
├── index.tsx              # Application entry point
├── index.css              # Global styles
├── tailwind.config.js     # Tailwind CSS configuration
├── vite.config.ts         # Vite configuration
├── package.json           # Root dependencies
├── server/package.json    # Server dependencies
└── README.md             # This file
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

# Database
DATABASE_PATH=./linear_clone.db

# Frontend (for production)
VITE_API_URL=http://localhost:3001
```

### Build Configuration
- **Development**: `npm run dev` (Starts both frontend and backend)
- **Build Frontend**: `npm run build`
- **Preview Frontend**: `npm run preview`

### Styling
The application uses Tailwind CSS with a custom color scheme:
- Primary: `#5E6AD2` (Purple)
- Background: `#1E1F24` (Dark)
- Border: `#363840` (Dark gray)
- Text: `#DEDEDE` (Light gray)

## 🔐 Authentication Flow

1. **Register**: User creates account with email/password
2. **Login**: User receives access token (15min) and refresh token (7 days)
3. **API Requests**: Access token sent in `Authorization: Bearer` header
4. **Token Refresh**: Automatic refresh when access token expires
5. **Logout**: Refresh token invalidated on server

## 🚀 Deployment

### Production Build

1. **Build the frontend**
   ```bash
   npm run build
   ```

2. **Start the production server**
   ```bash
   cd server
   npm run start
   ```

3. **Configure reverse proxy** (nginx example)
   ```nginx
   location /api {
       proxy_pass http://localhost:3001;
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

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines
- Follow the existing code style
- Add TypeScript types for all new code
- Include error handling for API calls
- Update the README for new features
- Test on both dark and light themes (if applicable)

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

- Built with React and TypeScript
- Inspired by Linear's excellent UX
- Uses Lucide icons for beautiful SVG icons
- Powered by Vite for fast development
- Backend built with Express and sql.js

## 📞 Support

For support and questions:
- Create an issue in the repository
- Check the documentation
- Review existing issues and discussions

---

**Made with ❤️ using React, TypeScript, and Express**
