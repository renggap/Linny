# Linear Clone - Project Management Application

A modern, feature-rich project management application built as a clone of Linear, featuring issue tracking, team collaboration, and multiple view modes.

## 🚀 Features

### Core Functionality
- **Issue Management**: Create, edit, delete, and track issues with full CRUD operations
- **Multiple View Modes**: List view, Kanban board view, and Timeline/Gantt chart view
- **Team Collaboration**: Team-based project organization with user management
- **Project Organization**: Create and manage projects within teams
- **Status Tracking**: Comprehensive issue status management (Backlog, Todo, In Progress, Done, Canceled)
- **Priority System**: Priority levels (No Priority, Low, Medium, High, Urgent)

### Advanced Features
- **Real-time Notifications**: Due date reminders and mention notifications
- **Public Project Sharing**: Share projects publicly with read-only access
- **Comment System**: Threaded comments with mention support
- **Subtask Creation**: Create subtasks linked to parent issues
- **URL Routing**: Deep linking with SEO-friendly URLs
- **Keyboard Shortcuts**: Quick issue creation with 'C' key
- **Data Persistence**: Local storage for offline functionality

### User Management
- **Role-based Access**: Admin, Member, and Viewer roles
- **User Invitations**: Invite new users to teams
- **Profile Management**: User profile customization
- **Authentication**: Simple login/signup system

## 🛠 Tech Stack

### Frontend
- **React 19** - Modern React with hooks
- **TypeScript** - Type-safe development
- **Vite** - Fast build tool and dev server
- **React Router DOM** - Client-side routing
- **Tailwind CSS** - Utility-first CSS framework
- **Lucide React** - Icon library

### Development Tools
- **TypeScript** - Static typing
- **PostCSS & Autoprefixer** - CSS processing
- **Node.js** - Runtime environment

## 📦 Installation

### Prerequisites
- Node.js (version 18 or higher recommended)

### Setup Instructions

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd Linear-Clone
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start the development server**
   ```bash
   npm run dev
   ```

4. **Open your browser**
   Navigate to `http://localhost:5173` (or the port specified in the terminal)

## 🎯 Usage

### Getting Started
1. **Create an account** or use existing test accounts
2. **Join or create a team** to start collaborating
3. **Create projects** within your team
4. **Add issues** to track your work
5. **Switch between views** to organize your workflow

### Key Workflows

#### Creating Issues
- Click "New Issue" button or press 'C' key
- Fill in title, description, assignee, and due date
- Select project and priority level
- Use @mentions to notify team members

#### Managing Workflow
- **List View**: Traditional table-style issue tracking
- **Board View**: Kanban-style drag-and-drop organization
- **Timeline View**: Gantt chart for project planning

#### Team Collaboration
- Invite team members via User Management
- Assign issues to team members
- Use comments for discussions
- Receive notifications for mentions and due dates

### Keyboard Shortcuts
- **C**: Create new issue
- **Esc**: Close modals
- **Enter**: Submit forms

## 📁 Project Structure

```
Linear-Clone/
├── components/              # React components
│   ├── Auth.tsx            # Authentication component
│   ├── BoardView.tsx       # Kanban board view
│   ├── IssueList.tsx       # List view component
│   ├── IssueModal.tsx      # Issue creation/editing modal
│   ├── Sidebar.tsx         # Navigation sidebar
│   ├── TimelineView.tsx    # Gantt chart view
│   └── ...                 # Other components
├── services/               # API services (placeholder)
├── constants.tsx           # Mock data and constants
├── types.ts               # TypeScript type definitions
├── App.tsx                # Main application component
├── index.tsx              # Application entry point
├── index.css              # Global styles
├── tailwind.config.js     # Tailwind CSS configuration
├── vite.config.ts         # Vite configuration
├── package.json           # Project dependencies
└── README.md             # This file
```

## 🔧 Configuration

### Environment Variables
No environment variables required for local development.

### Build Configuration
- **Development**: `npm run dev`
- **Build**: `npm run build`
- **Preview**: `npm run preview`

### Styling
The application uses Tailwind CSS with a custom color scheme:
- Primary: `#5E6AD2` (Purple)
- Background: `#1E1F24` (Dark)
- Text: `#DEDEDE` (Light gray)

## 🚀 Deployment

### Build for Production
```bash
npm run build
```

### Serve Built Application
```bash
npm run preview
```

### Deployment Options
- **Netlify**: Drag and drop the `dist` folder
- **Vercel**: Connect repository and deploy
- **GitHub Pages**: Configure to serve from `dist` folder
- **Any static hosting**: Upload built files

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📋 TODO List

- [ ] Add real backend API integration
- [ ] Implement real-time collaboration
- [ ] Add file upload functionality
- [ ] Create advanced reporting and analytics
- [ ] Add mobile responsiveness improvements
- [ ] Implement advanced search and filtering
- [ ] Add integrations with external tools

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

## 📞 Support

For support and questions:
- Create an issue in the repository
- Check the documentation
- Review existing issues and discussions

---

**Made with ❤️ using React and TypeScript**
