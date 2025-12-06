
import React, { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { IssueList } from './components/IssueList';
import { IssueModal } from './components/IssueModal';
import { BoardView } from './components/BoardView';
import { TimelineView } from './components/TimelineView';
import { Auth } from './components/Auth';
import { ProjectModal } from './components/ProjectModal';
import { TeamModal } from './components/TeamModal';
import { UserManagementModal } from './components/UserManagementModal';
import { NotificationPopover } from './components/NotificationPopover';
import { INITIAL_ISSUES, MOCK_USERS, MOCK_PROJECTS, MOCK_TEAMS, MOCK_COMMENTS, MOCK_NOTIFICATIONS } from './constants';
import { Issue, Status, Priority, User, Team, Project, UserRole, Comment, Notification, NotificationType } from './types';
import { List, Layout, Bell, Plus, GanttChart } from './components/Icons';

const App: React.FC = () => {
  // --- STATE ---
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>(MOCK_USERS);
  const [teams, setTeams] = useState<Team[]>(MOCK_TEAMS);
  const [projects, setProjects] = useState<Project[]>(MOCK_PROJECTS);
  const [issues, setIssues] = useState<Issue[]>(INITIAL_ISSUES);
  const [comments, setComments] = useState<Comment[]>(MOCK_COMMENTS);
  const [notifications, setNotifications] = useState<Notification[]>(MOCK_NOTIFICATIONS);
  
  // UI State
  const [isIssueModalOpen, setIsIssueModalOpen] = useState(false);
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [isTeamModalOpen, setIsTeamModalOpen] = useState(false);
  const [isUserManagementOpen, setIsUserManagementOpen] = useState(false);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [editingIssue, setEditingIssue] = useState<Issue | undefined>(undefined);
  const [currentTeamId, setCurrentTeamId] = useState<string>(MOCK_TEAMS[0].id);
  
  // Navigation State
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null); 
  const [statusFilter, setStatusFilter] = useState<Status | null>(null);
  const [assigneeFilter, setAssigneeFilter] = useState<string | null>(null);

  const [currentView, setCurrentView] = useState<'list' | 'board' | 'timeline'>('list');
  const [pendingInvites, setPendingInvites] = useState<{email: string, role: UserRole}[]>([]);

  // --- COMPUTED ---
  const currentTeam = teams.find(t => t.id === currentTeamId);
  // Filter projects by team
  const teamProjects = projects.filter(p => p.teamId === currentTeamId);
  
  // Filter issues by team projects
  const visibleIssues = issues.filter(i => {
    const project = projects.find(p => p.id === i.projectId);
    // Must belong to a project in the current team
    if (!project || project.teamId !== currentTeamId) return false;
    
    // Project Filter
    if (selectedProjectId && i.projectId !== selectedProjectId) return false;
    
    // Status Filter
    if (statusFilter && i.status !== statusFilter) return false;

    // Assignee Filter
    if (assigneeFilter && i.assigneeId !== assigneeFilter) return false;

    return true;
  });

  const myNotifications = currentUser ? notifications.filter(n => n.userId === currentUser.id && !n.isRead) : [];

  // Permissions Check Helpers
  const canCreateContent = currentUser?.role !== UserRole.Viewer;
  const isAdmin = currentUser?.role === UserRole.Admin;

  // --- EFFECT: Check Due Dates ---
  useEffect(() => {
    if (!currentUser) return;
    
    // Check for issues due today that are assigned to current user
    const checkDueDates = () => {
        const today = new Date().toISOString().split('T')[0];
        const dueIssues = issues.filter(i => 
            i.assigneeId === currentUser.id && 
            i.dueDate && 
            new Date(i.dueDate).toISOString().split('T')[0] === today &&
            i.status !== Status.Done && 
            i.status !== Status.Canceled
        );

        dueIssues.forEach(issue => {
            // Avoid duplicate notifications
            const exists = notifications.some(n => 
                n.issueId === issue.id && 
                n.type === NotificationType.DueDate &&
                n.userId === currentUser.id &&
                new Date(n.createdAt).toISOString().split('T')[0] === today
            );

            if (!exists) {
                const notif: Notification = {
                    id: `n_due_${Date.now()}_${issue.id}`,
                    userId: currentUser.id,
                    type: NotificationType.DueDate,
                    message: `Issue "${issue.title}" is due today`,
                    issueId: issue.id,
                    isRead: false,
                    createdAt: new Date()
                };
                setNotifications(prev => [notif, ...prev]);
            }
        });
    };

    checkDueDates();
    // In a real app, setup an interval or run on load
  }, [issues, currentUser]); // Removed notifications dependency to avoid loops, though in production need better logic

  // --- HANDLERS ---

  // Auth
  const handleLogin = (user: User) => setCurrentUser(user);
  
  const handleSignup = (name: string, email: string, pass: string) => {
    const params = new URLSearchParams(window.location.search);
    const inviteTeamId = params.get('inviteTeamId');
    const inviteRole = params.get('inviteRole') as UserRole;
    
    const newUser: User = {
        id: `u${Date.now()}`,
        name,
        email,
        password: pass,
        avatarUrl: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random`,
        role: inviteRole || UserRole.Member 
    };
    
    setUsers(prev => [...prev, newUser]);
    
    if (inviteTeamId) {
        setTeams(prevTeams => prevTeams.map(team => {
            if (team.id === inviteTeamId) {
                if (team.members.includes(newUser.id)) return team;
                return { ...team, members: [...team.members, newUser.id] };
            }
            return team;
        }));
        setCurrentTeamId(inviteTeamId);
    }
    
    setCurrentUser(newUser);
    window.history.replaceState({}, document.title, window.location.pathname);
  };

  const handleLogout = () => setCurrentUser(null);

  // User Management
  const handleUpdateUserRole = (userId: string, newRole: UserRole) => {
    if (!isAdmin) return;
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u));
  };

  const handleRemoveUser = (userId: string) => {
    if (!isAdmin) return;
    if (userId === currentUser?.id) return; 
    if (confirm('Are you sure you want to remove this user?')) {
        setUsers(prev => prev.filter(u => u.id !== userId));
        setTeams(prev => prev.map(t => ({
            ...t,
            members: t.members.filter(mid => mid !== userId)
        })));
    }
  };
  
  const handleInviteUser = (email: string, role: UserRole) => {
      setPendingInvites(prev => [...prev, { email, role }]);
  };

  // Helper to process text for mentions
  const processMentions = (text: string, issueId: string, type: 'comment' | 'description') => {
      if (!currentUser) return;
      
      // Simple regex to find @Name
      // Iterate all users to check presence
      users.forEach(user => {
          if (user.id === currentUser.id) return; // Don't notify self
          
          if (text.includes(`@${user.name}`)) {
              const notif: Notification = {
                  id: `n_${Date.now()}_${user.id}`,
                  userId: user.id,
                  type: NotificationType.Mention,
                  message: type === 'comment' ? 'mentioned you in a comment' : 'mentioned you in an issue',
                  issueId: issueId,
                  isRead: false,
                  actorId: currentUser.id,
                  createdAt: new Date()
              };
              setNotifications(prev => [notif, ...prev]);
          }
      });
  };

  // Data Actions
  const handleSaveIssue = (issueData: Partial<Issue>) => {
    if (!canCreateContent) return;

    let savedIssueId = issueData.id;

    if (issueData.id) {
        // Edit
        setIssues(prev => prev.map(i => i.id === issueData.id ? { ...i, ...issueData, updatedAt: new Date() } as Issue : i));
        // Check for mentions in description update
        if (issueData.description) {
            processMentions(issueData.description, issueData.id, 'description');
        }
    } else {
        // Create
        const project = projects.find(p => p.id === issueData.projectId);
        const prefix = project ? project.identifier : 'LIN';
        const newId = Math.random().toString(36).substr(2, 9);
        savedIssueId = newId;

        const newIssue: Issue = {
          id: newId,
          identifier: `${prefix}-${100 + issues.length + 1}`,
          title: issueData.title || 'Untitled',
          description: issueData.description || '',
          status: issueData.status || Status.Backlog,
          priority: issueData.priority || Priority.NoPriority,
          assigneeId: issueData.assigneeId,
          projectId: issueData.projectId!,
          startDate: issueData.startDate,
          dueDate: issueData.dueDate,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        setIssues([newIssue, ...issues]);
        
        if (newIssue.description) {
            processMentions(newIssue.description, newIssue.id, 'description');
        }
    }
    setEditingIssue(undefined);
  };

  const handleCreateSubtask = (parentIssueId: string, title: string) => {
      if (!canCreateContent) return;
      const parent = issues.find(i => i.id === parentIssueId);
      if (!parent) return;

      const project = projects.find(p => p.id === parent.projectId);
      const prefix = project ? project.identifier : 'LIN';
      const newId = Math.random().toString(36).substr(2, 9);

      const newIssue: Issue = {
          id: newId,
          identifier: `${prefix}-${100 + issues.length + 1}`,
          title: title,
          description: '',
          status: Status.Todo,
          priority: Priority.NoPriority,
          projectId: parent.projectId,
          parentId: parentIssueId,
          createdAt: new Date(),
          updatedAt: new Date(),
      };
      
      setIssues([...issues, newIssue]);
  };

  const handleDeleteIssue = (id: string) => {
    if (!isAdmin) {
        alert("Only Admins can delete issues.");
        return;
    }
    if (confirm('Are you sure you want to delete this issue?')) {
        setIssues(prev => prev.filter(i => i.id !== id));
    }
  };

  const handleStatusChange = (id: string, status: Status) => {
      if (!canCreateContent) return;
      setIssues(prev => prev.map(i => i.id === id ? { ...i, status, updatedAt: new Date() } : i));
  };

  const handleCreateProject = (name: string, identifier: string, icon: string, teamId: string) => {
      if (!canCreateContent) return;
      const newProject: Project = {
          id: `p${Date.now()}`,
          name,
          identifier,
          icon,
          teamId
      };
      setProjects([...projects, newProject]);
      setCurrentTeamId(teamId);
  };

  const handleCreateTeam = (name: string, icon: string) => {
    if (!currentUser) return;
    const newTeam: Team = {
      id: `t${Date.now()}`,
      name,
      icon,
      members: [currentUser.id]
    };
    setTeams([...teams, newTeam]);
    setCurrentTeamId(newTeam.id);
  };

  const handleAddComment = (issueId: string, content: string) => {
      if (!currentUser) return;
      const newComment: Comment = {
          id: `c${Date.now()}`,
          content,
          issueId,
          userId: currentUser.id,
          createdAt: new Date()
      };
      setComments([...comments, newComment]);
      processMentions(content, issueId, 'comment');
  };

  // Notification Actions
  const handleReadNotification = (id: string) => {
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
  };

  const handleOpenIssueFromNotification = (issueId: string) => {
      const issue = issues.find(i => i.id === issueId);
      if (issue) {
          setEditingIssue(issue);
          setIsIssueModalOpen(true);
          setIsNotificationOpen(false);
      }
  };

  // Navigation Handlers
  const handleSelectProject = (projectId: string | null) => {
    setSelectedProjectId(projectId);
    setStatusFilter(null);
    setAssigneeFilter(null);
  };

  const handleSelectStatusFilter = (status: Status | null) => {
    setStatusFilter(status);
    setSelectedProjectId(null);
    setAssigneeFilter(null);
  };

  const handleSelectAssigneeFilter = (userId: string | null) => {
    setAssigneeFilter(userId);
    setSelectedProjectId(null);
    setStatusFilter(null);
  };

  // --- EFFECT ---
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement).tagName)) return;
      if (e.key.toLowerCase() === 'c' && canCreateContent) {
        e.preventDefault();
        setEditingIssue(undefined);
        setIsIssueModalOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [canCreateContent]);

  // --- RENDER ---

  if (!currentUser) {
      return <Auth users={users} onLogin={handleLogin} onSignup={handleSignup} />;
  }
  
  let headerTitle = "All Issues";
  if (selectedProjectId) {
      headerTitle = projects.find(p => p.id === selectedProjectId)?.name || "Project";
  } else if (statusFilter) {
      headerTitle = `All ${statusFilter}`;
  } else if (assigneeFilter) {
      const user = users.find(u => u.id === assigneeFilter);
      headerTitle = user ? `Issues assigned to ${user.name}` : "Assigned Issues";
  }

  return (
    <div className="flex h-screen bg-[#1E1F24] text-[#DEDEDE] font-sans overflow-hidden selection:bg-[#5E6AD2] selection:text-white">
      
      <Sidebar 
        currentUser={currentUser}
        users={users} 
        teams={teams}
        projects={projects}
        currentTeam={currentTeam}
        onSwitchTeam={setCurrentTeamId}
        onCreateIssue={() => { setEditingIssue(undefined); setIsIssueModalOpen(true); }}
        onCreateProject={() => setIsProjectModalOpen(true)}
        onCreateTeam={() => setIsTeamModalOpen(true)}
        onSelectProject={handleSelectProject}
        onSelectStatusFilter={handleSelectStatusFilter}
        selectedProjectId={selectedProjectId}
        currentStatusFilter={statusFilter}
        onLogout={handleLogout}
        onOpenUserManagement={() => setIsUserManagementOpen(true)}
        assigneeFilter={assigneeFilter}
        onSelectAssigneeFilter={handleSelectAssigneeFilter}
      />

      <main className="flex-1 flex flex-col min-w-0 bg-[#1E1F24]">
        
        {/* Header */}
        <header className="h-14 border-b border-[#363840] flex items-center justify-between px-6 bg-[#1E1F24] z-10 shrink-0">
           <div className="flex items-center space-x-2 text-sm text-gray-500">
             <span className="hover:text-gray-300 cursor-pointer transition-colors">{currentTeam?.name}</span>
             <span>/</span>
             <span className="font-medium text-[#E5E7EB] flex items-center">
               <span className={`w-1.5 h-1.5 rounded-full mr-2 ${statusFilter ? 'bg-blue-500' : 'bg-orange-500'}`}></span>
               {headerTitle}
             </span>
           </div>
           
           <div className="flex items-center space-x-2 relative">
             <div className="flex items-center bg-[#2E3036] rounded-md p-0.5 border border-[#363840]">
                <button 
                  onClick={() => setCurrentView('list')}
                  className={`p-1.5 rounded-sm ${currentView === 'list' ? 'bg-[#3E4049] text-white shadow-sm' : 'text-gray-400 hover:text-gray-200'}`}
                  title="List View"
                >
                  <List className="w-4 h-4" />
                </button>
                <button 
                   onClick={() => setCurrentView('board')}
                   className={`p-1.5 rounded-sm ${currentView === 'board' ? 'bg-[#3E4049] text-white shadow-sm' : 'text-gray-400 hover:text-gray-200'}`}
                   title="Board View"
                >
                  <Layout className="w-4 h-4" />
                </button>
                <button 
                   onClick={() => setCurrentView('timeline')}
                   className={`p-1.5 rounded-sm ${currentView === 'timeline' ? 'bg-[#3E4049] text-white shadow-sm' : 'text-gray-400 hover:text-gray-200'}`}
                   title="Timeline (Gantt) View"
                >
                  <GanttChart className="w-4 h-4" />
                </button>
             </div>
             
             <div className="relative">
                <button 
                    onClick={() => setIsNotificationOpen(!isNotificationOpen)}
                    className="p-2 hover:bg-[#2E3036] rounded text-gray-400 hover:text-gray-200 transition-colors relative"
                >
                    <Bell className="w-4 h-4" />
                    {myNotifications.length > 0 && (
                        <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-blue-500 rounded-full border border-[#1E1F24]"></span>
                    )}
                </button>
                {isNotificationOpen && (
                    <NotificationPopover 
                        notifications={myNotifications}
                        users={users}
                        onRead={handleReadNotification}
                        onOpenIssue={handleOpenIssueFromNotification}
                    />
                )}
             </div>
             
             <button 
                onClick={() => { setEditingIssue(undefined); setIsIssueModalOpen(true); }}
                disabled={!canCreateContent}
                className={`ml-2 bg-[#5E6AD2] text-white px-3 py-1.5 rounded text-xs font-semibold transition-all flex items-center shadow-lg shadow-purple-900/20 ${canCreateContent ? 'hover:bg-[#4b55aa]' : 'opacity-50 cursor-not-allowed grayscale'}`}
             >
                <Plus className="w-3 h-3 mr-1.5" />
                New Issue
             </button>
           </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 overflow-hidden relative flex flex-col pt-6">
           {currentView === 'list' ? (
              <IssueList 
                issues={visibleIssues} 
                users={users}
                onEdit={(issue) => { 
                    if (canCreateContent) {
                        setEditingIssue(issue); 
                        setIsIssueModalOpen(true); 
                    }
                }}
                onDelete={handleDeleteIssue}
                onStatusChange={handleStatusChange}
              />
           ) : currentView === 'board' ? (
              <BoardView
                issues={visibleIssues}
                users={users}
                onEdit={(issue) => { 
                    if (canCreateContent) {
                        setEditingIssue(issue); 
                        setIsIssueModalOpen(true); 
                    }
                }}
                onDelete={handleDeleteIssue}
                onStatusChange={handleStatusChange}
              />
           ) : (
              <TimelineView
                issues={visibleIssues}
                users={users}
                onEdit={(issue) => { 
                    if (canCreateContent) {
                        setEditingIssue(issue); 
                        setIsIssueModalOpen(true); 
                    }
                }}
              />
           )}
           
           <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-[#1E1F24] to-transparent pointer-events-none"></div>
        </div>

      </main>

      <IssueModal 
        isOpen={isIssueModalOpen} 
        onClose={() => setIsIssueModalOpen(false)} 
        onSave={handleSaveIssue} 
        users={users}
        projects={teamProjects} // Only allow selecting projects from current team
        existingIssue={editingIssue}
        comments={comments}
        currentUser={currentUser}
        onAddComment={handleAddComment}
        issues={issues}
        onCreateSubtask={handleCreateSubtask}
        onOpenIssue={(issueId) => {
            const issue = issues.find(i => i.id === issueId);
            if (issue) setEditingIssue(issue);
        }}
        defaultProjectId={selectedProjectId || teamProjects[0]?.id}
      />

      <ProjectModal
        isOpen={isProjectModalOpen}
        onClose={() => setIsProjectModalOpen(false)}
        teams={teams}
        onSave={handleCreateProject}
      />

      <TeamModal
        isOpen={isTeamModalOpen}
        onClose={() => setIsTeamModalOpen(false)}
        onSave={handleCreateTeam}
      />

      <UserManagementModal
        isOpen={isUserManagementOpen}
        onClose={() => setIsUserManagementOpen(false)}
        users={users}
        currentUser={currentUser}
        currentTeam={currentTeam}
        onUpdateRole={handleUpdateUserRole}
        onRemoveUser={handleRemoveUser}
        onInviteUser={handleInviteUser}
      />

    </div>
  );
};

export default App;
