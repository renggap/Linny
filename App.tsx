import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Routes, Route, useNavigate, useParams, useLocation } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import { api } from './services/api';
import { Sidebar } from './components/Sidebar';
import { IssueList } from './components/IssueList';
import { IssueModal } from './components/IssueModal';
import { BoardView } from './components/BoardView';
import { TimelineView } from './components/TimelineView';
import { Auth } from './components/Auth';
import { ProjectModal } from './components/ProjectModal';
import { TeamModal } from './components/TeamModal';
import { PublicProjectView } from './components/PublicProjectView';
import { ProjectSettingsModal } from './components/ProjectSettingsModal';
import { PublicViewContainer } from './components/PublicViewContainer';
import { UserManagementModal } from './components/UserManagementModal';
import { UserProfileModal } from './components/UserProfileModal';
import { NotificationPopover } from './components/NotificationPopover';
import { ProjectRightSidebar } from './components/ProjectRightSidebar';
import { ProjectOverviewHeader } from './components/ProjectOverviewHeader';
import { TeamDashboard } from './components/TeamDashboard';
import { Issue, Status, Priority, User, Team, Project, UserRole, Comment, Notification, NotificationType, Activity, PartialIssue } from './types';
import { List, Layout, Bell, Plus, GanttChart, X, PanelRightClose } from './components/Icons';

const App: React.FC = () => {
  const { user: currentUser, isAuthenticated, isLoading: authLoading, refreshUser } = useAuth();

  // --- DATA STATE (fetched from API) ---
  const [users, setUsers] = useState<User[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [issues, setIssues] = useState<Issue[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);

  // Loading states
  const [isDataLoading, setIsDataLoading] = useState(true);

  // UI State
  const [isIssueModalOpen, setIsIssueModalOpen] = useState(false);
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [isTeamModalOpen, setIsTeamModalOpen] = useState(false);
  const [isUserManagementOpen, setIsUserManagementOpen] = useState(false);
  const [isUserProfileOpen, setIsUserProfileOpen] = useState(false);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [isProjectSettingsOpen, setIsProjectSettingsOpen] = useState(false);
  const [settingsProject, setSettingsProject] = useState<Project | null>(null);
  const [editingIssue, setEditingIssue] = useState<Issue | PartialIssue | undefined>(undefined);
  const [currentTeamId, setCurrentTeamId] = useState<string>('');
  const [isRightSidebarOpen, setIsRightSidebarOpen] = useState(true);

  // Navigation State
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<Status | null>(null);
  const [assigneeFilter, setAssigneeFilter] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [currentView, setCurrentView] = useState<'list' | 'board' | 'timeline'>('list');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(true);
  const [isProjectOverviewExpanded, setIsProjectOverviewExpanded] = useState(true);

  // Router hooks
  const navigate = useNavigate();
  const location = useLocation();
  const searchInputRef = useRef<HTMLInputElement>(null);
  // Track whether URL change is from user action to prevent redirect loops
  const isNavigatingRef = useRef(false);

  // --- DATA FETCHING ---

  // Fetch all data on mount (only once)
  const fetchAllData = useCallback(async () => {
    console.log('[App] fetchAllData called, isAuthenticated:', isAuthenticated);
    if (!isAuthenticated) {
      console.log('[App] Not authenticated, skipping data fetch');
      setIsDataLoading(false);
      return;
    }

    setIsDataLoading(true);
    try {
      console.log('[App] Fetching all data...');
      const [usersData, teamsData, projectsData, notifs, acts] = await Promise.all([
        api.users.getAll(),
        api.teams.getAll(),
        api.projects.getAll(),
        api.notifications.getAll(),
        api.activities.getAll({ limit: 100 })
      ]);

      console.log('[App] Data fetched:', { users: usersData.length, teams: teamsData.length, projects: projectsData.length });
      setUsers(usersData);
      setTeams(teamsData);
      setProjects(projectsData);
      setNotifications(notifs);
      setActivities(acts);

      // Set initial team if not set
      const teamId = currentTeamId || teamsData[0]?.id;
      if (teamId && teamsData.length > 0) {
        console.log('[App] Setting team:', teamId);
        setCurrentTeamId(teamId);
        // Issues will be fetched by the useEffect below
      }
    } catch (error) {
      console.error('[App] Failed to fetch data:', error);
    } finally {
      setIsDataLoading(false);
    }
  }, [isAuthenticated]);

  // Track if we've fetched data for current auth session
  const hasFetchedDataRef = useRef(false);

  // Set loading to false when not authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      console.log('[App] Not authenticated, setting data loading to false');
      setIsDataLoading(false);
      hasFetchedDataRef.current = false;
    }
  }, [isAuthenticated]);

  // Fetch data when authenticated status changes
  useEffect(() => {
    console.log('[App] Auth status changed, isAuthenticated:', isAuthenticated, 'hasFetched:', hasFetchedDataRef.current);
    if (isAuthenticated && !hasFetchedDataRef.current) {
      console.log('[App] User authenticated, fetching data...');
      hasFetchedDataRef.current = true;
      fetchAllData();
    }
  }, [isAuthenticated, fetchAllData]);

  // Fetch projects and issues when team changes
  useEffect(() => {
    if (!currentTeamId || !isAuthenticated) return;

    const fetchTeamData = async () => {
      try {
        console.log('[App] Fetching projects and issues for team:', currentTeamId);

        // Clear selected project when switching teams
        setSelectedProjectId(null);

        // Fetch projects for the new team
        const projectsData = await api.projects.getAll({ teamId: currentTeamId });
        console.log('[App] Projects fetched:', projectsData.length);
        setProjects(projectsData);

        // Fetch issues for the new team
        const issuesData = await api.issues.getAll({ teamId: currentTeamId });
        console.log('[App] Issues fetched:', issuesData.length);
        setIssues(issuesData);
      } catch (error) {
        console.error('Failed to fetch team data:', error);
      }
    };

    fetchTeamData();
  }, [currentTeamId, isAuthenticated]);
  // Fetch full project details (including links) when project is selected
  useEffect(() => {
    if (selectedProjectId && isAuthenticated) {
      const fetchProjectDetails = async () => {
        try {
          console.log('[App] Fetching full project details for:', selectedProjectId);
          const updated = await api.projects.getByIdWithLinks(selectedProjectId);
          setProjects((prev: Project[]) => prev.map((p: Project) => p.id === updated.id ? updated : p));
        } catch (error) {
          console.error('[App] Failed to fetch project details:', error);
        }
      };
      fetchProjectDetails();
    }
  }, [selectedProjectId, isAuthenticated]);

  // Fetch issues when team changes - consolidated into fetchAllData
  // Issues are now fetched inside fetchAllData to avoid race conditions

  // Fetch comments for a specific issue
  const fetchComments = useCallback(async (issueId: string) => {
    try {
      const commentsData = await api.comments.getByIssue(issueId);
      setComments(commentsData);
    } catch (error) {
      console.error('Failed to fetch comments:', error);
    }
  }, []);

  // Fetch notifications (called manually)
  const fetchNotifications = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const notifs = await api.notifications.getAll();
      setNotifications(notifs);
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    }
  }, [isAuthenticated]);

  // --- COMPUTED ---

  const currentTeam = teams.find(t => t.id === currentTeamId);
  const teamProjects = projects.filter(p => p.teamId === currentTeamId);
  const currentProject = projects.find(p => p.id === selectedProjectId);

  // Filter issues client-side - allow status/assignee filters without requiring a selected project
  const visibleIssues = issues.filter(i => {
    const project = projects.find(p => p.id === i.projectId);
    if (!project || project.teamId !== currentTeamId) return false;
    if (selectedProjectId && i.projectId !== selectedProjectId) return false;
    if (statusFilter && i.status !== statusFilter) return false;
    if (assigneeFilter && !i.assigneeIds.includes(assigneeFilter)) return false;
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const searchableText = `${i.title} ${i.description} ${i.identifier}`.toLowerCase();
      if (!searchableText.includes(query)) return false;
    }
    return true;
  });

  const myNotifications = notifications.filter(n => !n.isRead);

  // Permissions
  const canCreateContent = currentUser?.role !== UserRole.Viewer;
  const isAdmin = currentUser?.role === UserRole.Admin;

  // --- HANDLERS ---

  // Issue handlers
  const handleSaveIssue = async (issueData: Partial<Issue>) => {
    if (!canCreateContent) {
      throw new Error('You do not have permission to create issues');
    }

    try {
      if (issueData.id) {
        const updated = await api.issues.update(issueData.id, issueData);
        setIssues(prev => prev.map(i => i.id === updated.id ? updated : i));
        setEditingIssue(prev => {
          if (prev && 'id' in prev && prev.id === updated.id) return updated;
          return prev;
        });
        if (updated.id) {
          await fetchComments(updated.id);
        }
      } else {
        const formatDate = (date: Date | string | undefined) => {
          if (!date) return undefined;
          if (date instanceof Date) return date.toISOString();
          if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
            return `${date}T00:00:00.000Z`;
          }
          return date;
        };

        const created = await api.issues.create({
          title: issueData.title || '',
          description: issueData.description,
          status: issueData.status,
          priority: issueData.priority,
          assigneeIds: issueData.assigneeIds || [],
          projectId: issueData.projectId!,
          startDate: formatDate(issueData.startDate),
          dueDate: formatDate(issueData.dueDate),
          blockedBy: issueData.blockedBy
        });

        setIssues(prev => [created, ...prev]);
        setEditingIssue(undefined);
        // Issues will be refreshed by the useEffect below
      }
    } catch (error) {
      console.error('Failed to save issue:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to save issue. Please try again.';
      alert(errorMessage);
      throw error;
    }
  };

  const handleDeleteIssue = async (id: string) => {
    if (!isAdmin) {
      alert('Only Admins can delete issues.');
      return;
    }
    if (!confirm('Are you sure you want to delete this issue?')) return;

    try {
      await api.issues.delete(id);
      setIssues(prev => prev.filter(i => i.id !== id));
    } catch (error) {
      console.error('Failed to delete issue:', error);
    }
  };

  const handleStatusChange = async (id: string, status: Status) => {
    if (!canCreateContent) return;

    try {
      const updated = await api.issues.updateStatus(id, status);
      setIssues(prev => prev.map(i => i.id === updated.id ? updated : i));
    } catch (error) {
      console.error('Failed to update status:', error);
    }
  };

  const handleCreateSubtask = async (parentIssueId: string, title: string) => {
    if (!canCreateContent) return;

    try {
      const subtask = await api.issues.createSubtask(parentIssueId, title);
      setIssues(prev => [...prev, subtask]);
      // Issues will be refreshed by the useEffect below
    } catch (error) {
      console.error('Failed to create subtask:', error);
    }
  };

  // Comment handler
  const handleAddComment = async (issueId: string, content: string) => {
    if (!currentUser) return;

    try {
      const newComment = await api.comments.create(content, issueId);
      setComments(prev => [...prev, newComment]);
    } catch (error) {
      console.error('Failed to add comment:', error);
      throw error;
    }
  };

  // Notification handlers
  const handleReadNotification = async (id: string) => {
    try {
      await api.notifications.markRead(id);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  };

  const handleOpenIssueFromNotification = async (issueId: string) => {
    const issue = issues.find(i => i.id === issueId);
    if (issue) {
      setEditingIssue(issue);
      setIsIssueModalOpen(true);
      setIsNotificationOpen(false);
      await fetchComments(issueId);
    }
  };

  // Project handlers
  const handleCreateProject = async (name: string, identifier: string, icon: string, teamId: string) => {
    if (!canCreateContent) return;

    try {
      const newProject = await api.projects.create({
        name,
        identifier,
        icon,
        teamId
      });
      setProjects(prev => [...prev, newProject]);
      // Don't switch teams - user is already in the correct team
    } catch (error) {
      console.error('Failed to create project:', error);
      throw error;
    }
  };

  const handleUpdateProject = async (projectId: string, updates: Partial<Project>) => {
    try {
      const sanitizedUpdates: any = { ...updates };

      // Format dates
      if (sanitizedUpdates.startDate instanceof Date) {
        sanitizedUpdates.startDate = sanitizedUpdates.startDate.toISOString().split('T')[0];
      }
      if (sanitizedUpdates.targetDate instanceof Date) {
        sanitizedUpdates.targetDate = sanitizedUpdates.targetDate.toISOString().split('T')[0];
      }

      // Handle links separately - they're stored in a different table
      const currentProject = projects.find(p => p.id === projectId);
      const currentLinks = currentProject?.links || [];
      const newLinks = updates.links;

      if (newLinks && newLinks !== currentLinks) {
        // Find added permanent links (not temp links from frontend)
        const addedLinks = newLinks.filter(l => !currentLinks.find(cl => cl.id === l.id) && (!l.id || !l.id.startsWith('temp-')));
        // Find removed permanent links
        const removedLinks = currentLinks.filter(l => !newLinks.find(nl => nl.id === l.id) && (!l.id || !l.id.startsWith('temp-')));

        // Add new links to backend
        for (const link of addedLinks) {
          await api.projects.addLink(projectId, link.title, link.url);
        }

        // Remove deleted links from backend
        for (const link of removedLinks) {
          await api.projects.deleteLink(projectId, link.id);
        }

        // Remove links from sanitizedUpdates since we've handled them separately
        delete sanitizedUpdates.links;
      }

      // Only include valid update fields
      const allowedFields = ['name', 'identifier', 'icon', 'teamId', 'description', 'isPublic', 'publicSlug', 'leadId', 'startDate', 'targetDate'];
      Object.keys(sanitizedUpdates).forEach(key => {
        if (!allowedFields.includes(key)) {
          delete sanitizedUpdates[key];
        }
      });

      // Only call update if there are non-link updates
      if (Object.keys(sanitizedUpdates).length > 0) {
        const updated = await api.projects.update(projectId, sanitizedUpdates);
        setProjects(prev => prev.map(p => p.id === updated.id ? updated : p));
      }

      // Always refetch project with links from backend to get persisted links
      const updated = await api.projects.getByIdWithLinks(projectId);
      setProjects(prev => prev.map(p => p.id === updated.id ? updated : p));
    } catch (error) {
      console.error('Failed to update project:', error);
    }
  };

  const handleOpenProjectSettings = (project: Project) => {
    setSettingsProject(project);
    setIsProjectSettingsOpen(true);
  };

  // Team handlers
  const handleCreateTeam = async (name: string, icon: string) => {
    if (!currentUser) throw new Error('You must be logged in to create a team');

    try {
      const newTeam = await api.teams.create(name, icon);
      setTeams(prev => [...prev, newTeam]);
      setCurrentTeamId(newTeam.id);
      // Close modal immediately after successful creation
      setIsTeamModalOpen(false);
    } catch (error) {
      console.error('Failed to create team:', error);
      throw error;
    }
  };

  // User management handlers
  const handleUpdateUserRole = async (userId: string, newRole: UserRole) => {
    if (!isAdmin) return;

    try {
      const updatedUser = await api.users.updateRole(userId, newRole);
      setUsers(prev => prev.map(u => u.id === updatedUser.id ? updatedUser : u));
    } catch (error) {
      console.error('Failed to update user role:', error);
      throw error;
    }
  };

  const handleRemoveUser = async (userId: string) => {
    if (!isAdmin) return;
    if (userId === currentUser?.id) return;
    if (!confirm('Are you sure you want to remove this user?')) return;

    try {
      await api.users.remove(userId);
      setUsers(prev => prev.filter(u => u.id !== userId));
      // Remove from team members
      setTeams(prev => prev.map(t => ({
        ...t,
        members: t.members.filter((m: any) => m !== userId)
      })));
    } catch (error) {
      console.error('Failed to remove user:', error);
    }
  };

  const handleInviteUser = (email: string, role: UserRole) => {
    // In a real app, this would send an email invite
    // For now, just show a message
    alert(`Invite functionality would send an email to ${email} for role: ${role}`);
  };

  const handleUpdateProfile = async (data: { name?: string; avatar_url?: string }) => {
    if (!currentUser) return;

    try {
      const updatedUser = await api.users.updateProfile(currentUser.id, data);
      // Update in users array
      setUsers((prev: User[]) => prev.map((u: User) => u.id === currentUser.id ? updatedUser : u));
      // Refresh current user in auth context to update avatar in UI
      await refreshUser();
    } catch (error) {
      console.error('Failed to update profile:', error);
      alert('Failed to update profile. Please try again.');
    }
  };

  // Navigation handlers
  const handleSelectProject = (projectId: string | null) => {
    setSelectedProjectId(projectId);
    if (projectId !== null) {
      setAssigneeFilter(null);
      setStatusFilter(null);
    }
  };

  const handleSelectAssigneeFilter = (userId: string | null) => {
    setAssigneeFilter(userId);
    setSelectedProjectId(null);
  };

  // Helper function to validate and start issue creation
  const handleCreateIssue = (prefill?: Partial<Issue>) => {
    console.log('[App] handleCreateIssue called:', {
      canCreateContent,
      currentTeamId,
      selectedProjectId,
      projectsCount: projects.filter(p => p.teamId === currentTeamId).length
    });
    if (!canCreateContent) return;

    const teamProjects = projects.filter(p => p.teamId === currentTeamId);
    console.log('[App] Team projects:', teamProjects.map(p => ({ id: p.id, name: p.name })));
    if (teamProjects.length === 0) {
      alert('Please create a project first before creating issues.');
      setIsProjectModalOpen(true);
      return;
    }

    // Issues can only be created within a selected project
    // But we allow opening the modal without one, and let the user select it there
    const effectiveProjectId = selectedProjectId || (teamProjects.length > 0 ? teamProjects[0].id : undefined);

    if (!effectiveProjectId) {
      alert('Please create a project first before creating issues.');
      return;
    }

    // Automatically assign to the current selected project
    // The key prop on IssueModal will force a remount when selectedProjectId changes
    const issueData = {
      projectId: selectedProjectId,
      ...prefill
    };
    setEditingIssue(issueData as any);
    setIsIssueModalOpen(true);
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement).tagName)) return;

      if (e.key.toLowerCase() === 'c' && canCreateContent) {
        const teamProjects = projects.filter(p => p.teamId === currentTeamId);
        if (teamProjects.length === 0) {
          e.preventDefault();
          alert('Please create a project first before creating issues.');
          setIsProjectModalOpen(true);
          return;
        }
        e.preventDefault();
        handleCreateIssue();
      }

      if (e.key === '/') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }

      if (e.key === 'Escape' && searchQuery) {
        setSearchQuery('');
        searchInputRef.current?.blur();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [canCreateContent, searchQuery, currentTeamId, projects]);

  // URL sync - sync URL to state (only responds to URL changes, not state changes)
  useEffect(() => {
    const path = location.pathname;
    if (path.startsWith('/public/')) return;

    // Skip if this URL change is from our own navigation
    if (isNavigatingRef.current) {
      isNavigatingRef.current = false;
      return;
    }

    const teamMatch = path.match(/^\/team\/([^/]+)/);
    const projectMatch = path.match(/^\/team\/[^/]+\/project\/([^/]+)/);
    const issueMatch = path.match(/^\/team\/[^/]+\/project\/[^/]+\/issue\/([^/]+)/);

    let newTeamId = currentTeamId;
    let newProjectId = selectedProjectId;
    let newEditingIssue = editingIssue;

    if (teamMatch) {
      const team = teams.find(t => t.id === teamMatch[1] || t.name.toLowerCase().replace(/\s+/g, '-') === teamMatch[1]);
      if (team) {
        newTeamId = team.id;
      }
    }

    if (projectMatch && newTeamId) {
      const teamProjects = projects.filter(p => p.teamId === newTeamId);
      const project = teamProjects.find(p => p.id === projectMatch[1] || p.identifier.toLowerCase() === projectMatch[1].toLowerCase());
      if (project) {
        newProjectId = project.id;
      } else {
        newProjectId = null;
      }
    } else {
      newProjectId = null;
    }

    if (issueMatch && newProjectId) {
      const projectIssues = issues.filter(i => i.projectId === newProjectId);
      const issue = projectIssues.find(i => i.id === issueMatch[1] || i.identifier.toLowerCase() === issueMatch[1].toLowerCase());
      if (issue) {
        if (!editingIssue || (editingIssue as Issue).id !== issue.id) {
          newEditingIssue = issue;
          setIsIssueModalOpen(true);
          fetchComments(issue.id);
        } else {
          // It's the same issue, keep it
          newEditingIssue = editingIssue;
        }
      } else {
        newEditingIssue = undefined;
      }
    } else {
      // No issue match in URL.
      // Only clear if it was a full issue (navigated away from an issue URL)
      // If it's a PartialIssue (creating new), we keep it as it has no URL representation yet
      if (editingIssue && 'id' in editingIssue) {
        newEditingIssue = undefined;
      }
    }

    // Batch state updates to prevent multiple re-renders
    if (newTeamId !== currentTeamId) {
      setCurrentTeamId(newTeamId);
    }
    if (newProjectId !== selectedProjectId) {
      setSelectedProjectId(newProjectId);
    }
    if (newEditingIssue !== editingIssue) {
      setEditingIssue(newEditingIssue);
    }
  }, [location.pathname, teams, projects, issues, fetchComments]);

  // Update URL when navigation changes (responds to state changes, not URL changes)
  useEffect(() => {
    if (!currentUser || location.pathname.startsWith('/public/')) return;

    const team = teams.find(t => t.id === currentTeamId);
    if (!team) return;

    const teamSlug = team.name.toLowerCase().replace(/\s+/g, '-');
    let newPath = `/team/${teamSlug}`;

    if (selectedProjectId) {
      const project = projects.find(p => p.id === selectedProjectId);
      if (project) {
        newPath += `/project/${project.identifier.toLowerCase()}`;
      }
    }

    if (editingIssue && isIssueModalOpen && 'id' in editingIssue) {
      const project = projects.find(p => p.id === editingIssue.projectId);
      if (project) {
        newPath = `/team/${teamSlug}/project/${project.identifier.toLowerCase()}/issue/${editingIssue.identifier.toLowerCase()}`;
      }
    }

    // Use window.location.pathname to always get the current URL, not the stale closure value
    if (window.location.pathname !== newPath && !isNavigatingRef.current) {
      // Mark that we're navigating to prevent URL sync from triggering
      isNavigatingRef.current = true;
      // Use replace: true to prevent history stack bloat
      navigate(newPath, { replace: true });
      // Reset the flag after navigation
      setTimeout(() => {
        isNavigatingRef.current = false;
      }, 0);
    }
  }, [currentTeamId, selectedProjectId, editingIssue, isIssueModalOpen, currentUser, teams, projects, navigate, location.pathname]);

  // --- RENDER ---

  // Show loading state
  if (authLoading || isDataLoading) {
    return (
      <div className="min-h-screen bg-[#1E1F24] text-[#DEDEDE] font-sans flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-[#5E6AD2] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  // Public route handling - fetch data if not loaded yet
  if (location.pathname.startsWith('/public/')) {
    return <PublicViewContainer />;
  }

  // Auth check
  if (!isAuthenticated) {
    return <Auth />;
  }

  // Header title
  let headerTitle = "Overview";
  if (searchQuery) headerTitle = `Search: "${searchQuery}"`;
  else if (selectedProjectId) headerTitle = projects.find(p => p.id === selectedProjectId)?.name || "Project";
  else if (statusFilter) headerTitle = `All ${statusFilter}`;
  else if (assigneeFilter) {
    const user = users.find(u => u.id === assigneeFilter);
    headerTitle = user ? `Issues assigned to ${user.name}` : "Assigned Issues";
  }

  const isDashboard = !selectedProjectId && !statusFilter && !assigneeFilter && !searchQuery && !!currentTeam;

  return (
    <div className="flex h-screen bg-[#1E1F24] text-[#DEDEDE] font-sans overflow-hidden selection:bg-[#5E6AD2] selection:text-white">
      <Sidebar
        currentUser={currentUser!}
        users={users}
        teams={teams}
        projects={projects}
        currentTeam={currentTeam}
        onSwitchTeam={setCurrentTeamId}
        onCreateIssue={() => handleCreateIssue()}
        onCreateProject={() => setIsProjectModalOpen(true)}
        onCreateTeam={() => setIsTeamModalOpen(true)}
        onSelectProject={handleSelectProject}
        selectedProjectId={selectedProjectId}
        onLogout={async () => {
          await api.auth.logout();
          window.location.href = '/';
        }}
        onOpenUserManagement={() => setIsUserManagementOpen(true)}
        onOpenUserProfile={() => setIsUserProfileOpen(true)}
        onOpenProjectSettings={handleOpenProjectSettings}
        assigneeFilter={assigneeFilter}
        onSelectAssigneeFilter={handleSelectAssigneeFilter}
        statusFilter={statusFilter}
        setStatusFilter={setStatusFilter}
        isSidebarCollapsed={isSidebarCollapsed}
        setIsSidebarCollapsed={setIsSidebarCollapsed}
      />

      <main className="flex-1 flex flex-col min-w-0 bg-[#1E1F24]">
        <header className="border-b border-[#363840]/30 flex items-center justify-between px-6 h-[60px] bg-[#1E1F24]/80 backdrop-blur-md z-30 shrink-0 sticky top-0">
          <div className="flex items-center space-x-3 text-sm min-w-0">
            <button
              onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
              className="md:hidden p-1.5 bg-[#2E3036] hover:bg-[#3E4049] rounded-lg text-gray-400 hover:text-white transition-all active:scale-95"
            >
              <Layout className="w-4 h-4" />
            </button>

            <div className="flex items-center space-x-2 text-gray-500 font-medium truncate">
              <span
                className="hover:text-white cursor-pointer transition-colors bg-white/5 px-2 py-0.5 rounded-md border border-white/5 active:scale-95 whitespace-nowrap"
                onClick={() => {
                  const teamSlug = currentTeam?.name.toLowerCase().replace(/\s+/g, '-');
                  if (teamSlug) navigate(`/team/${teamSlug}`);
                  setSelectedProjectId(null);
                  setStatusFilter(null);
                  setAssigneeFilter(null);
                  setSearchQuery('');
                }}
              >
                {currentTeam?.name}
              </span>
              <span className="opacity-20 translate-y-[1px]">/</span>
              <div className="flex items-center space-x-2 truncate">
                <div className={`w-2 h-2 rounded-full shadow-sm shrink-0 ${statusFilter ? 'bg-[#5E6AD2]' : selectedProjectId ? 'bg-orange-500' : 'bg-green-500'}`} />
                <span className="text-white font-bold tracking-tight truncate">{headerTitle}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between md:justify-end space-x-2 relative">
            {!isDashboard && (
              <div className="flex items-center bg-[#2E3036] rounded-md p-0.5 border border-[#363840]">
                <button onClick={() => setCurrentView('list')} className={`p-1.5 rounded-sm ${currentView === 'list' ? 'bg-[#3E4049] text-white shadow-sm' : 'text-gray-400 hover:text-gray-200'}`} title="List View">
                  <List className="w-4 h-4" />
                </button>
                <button onClick={() => setCurrentView('board')} className={`p-1.5 rounded-sm ${currentView === 'board' ? 'bg-[#3E4049] text-white shadow-sm' : 'text-gray-400 hover:text-gray-200'}`} title="Board View">
                  <Layout className="w-4 h-4" />
                </button>
                <button onClick={() => setCurrentView('timeline')} className={`p-1.5 rounded-sm ${currentView === 'timeline' ? 'bg-[#3E4049] text-white shadow-sm' : 'text-gray-400 hover:text-gray-200'}`} title="Timeline (Gantt) View">
                  <GanttChart className="w-4 h-4" />
                </button>
              </div>
            )}

            <div className="relative">
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search... (Press /)"
                className="w-48 md:w-64 bg-[#2E3036] border border-[#363840] rounded px-3 py-1.5 text-sm text-gray-300 placeholder-gray-600 focus:outline-none focus:border-[#5E6AD2] focus:ring-1 focus:ring-[#5E6AD2] transition-all"
              />
              {searchQuery && (
                <button onClick={() => { setSearchQuery(''); searchInputRef.current?.blur(); }} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300">
                  <X className="w-3 h-3" />
                </button>
              )}
              {searchQuery && (
                <span className="absolute -bottom-5 left-0 text-xs text-gray-500 whitespace-nowrap">
                  {visibleIssues.length} result{visibleIssues.length !== 1 ? 's' : ''}
                </span>
              )}
            </div>

            <div className="relative">
              <button
                onClick={() => { setIsNotificationOpen(!isNotificationOpen); fetchNotifications(); }}
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

            {currentProject && selectedProjectId && (
              <button
                onClick={() => setIsRightSidebarOpen(!isRightSidebarOpen)}
                className={`p-2 rounded transition-colors ${isRightSidebarOpen ? 'bg-[#3E4049] text-white' : 'hover:bg-[#2E3036] text-gray-400 hover:text-gray-200'}`}
                title={isRightSidebarOpen ? "Close sidebar" : "Open sidebar"}
              >
                <PanelRightClose className="w-4 h-4" />
              </button>
            )}

            <button
              onClick={() => handleCreateIssue()}
              disabled={!canCreateContent}
              className={`bg-[#5E6AD2] text-white px-3 py-1.5 rounded text-xs font-semibold transition-all flex items-center shadow-lg shadow-purple-900/20 ${canCreateContent ? 'hover:bg-[#4b55aa]' : 'opacity-50 cursor-not-allowed grayscale'}`}
            >
              <Plus className="w-3 h-3 mr-1.5" />
              <span className="hidden sm:inline">New Issue</span>
              <span className="sm:hidden">New</span>
            </button>
          </div>
        </header>

        <div className="flex-1 flex flex-row overflow-hidden relative">
          <div className="flex-1 flex flex-col min-w-0 min-h-0 bg-[#1E1F24]">
            {currentProject && selectedProjectId && (
              <div className="shrink-0 pt-6">
                <ProjectOverviewHeader
                  project={currentProject}
                  onUpdate={(p) => handleUpdateProject(p.id, p)}
                  isExpanded={isProjectOverviewExpanded}
                  onToggleExpand={() => setIsProjectOverviewExpanded(!isProjectOverviewExpanded)}
                />
              </div>
            )}

            <div className="flex-1 overflow-hidden relative flex flex-col min-h-0">
              {isDashboard ? (
                <TeamDashboard
                  team={currentTeam!}
                  issues={issues}
                  users={users}
                  projects={teamProjects}
                />
              ) : currentView === 'list' ? (
                <div className="flex-1 overflow-y-auto relative no-scrollbar">
                  <IssueList
                    issues={visibleIssues}
                    users={users}
                    onEdit={async (issue) => {
                      if (canCreateContent) {
                        setEditingIssue(issue);
                        setIsIssueModalOpen(true);
                        await fetchComments(issue.id);
                      }
                    }}
                    onDelete={handleDeleteIssue}
                    onStatusChange={handleStatusChange}
                    isPublicView={false}
                  />
                </div>
              ) : currentView === 'board' ? (
                <BoardView
                  issues={visibleIssues}
                  users={users}
                  onEdit={async (issue) => {
                    if (canCreateContent) {
                      setEditingIssue(issue);
                      setIsIssueModalOpen(true);
                      await fetchComments(issue.id);
                    }
                  }}
                  onDelete={handleDeleteIssue}
                  onStatusChange={handleStatusChange}
                  onCreateIssue={(status) => handleCreateIssue({ status })}
                  isPublicView={false}
                  statusFilter={statusFilter}
                />
              ) : (
                <TimelineView
                  issues={visibleIssues}
                  users={users}
                  onEdit={async (issue) => {
                    if (canCreateContent) {
                      setEditingIssue(issue);
                      setIsIssueModalOpen(true);
                      await fetchComments(issue.id);
                    }
                  }}
                />
              )}

              <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-[#1E1F24] to-transparent pointer-events-none z-10"></div>
            </div>
          </div>

          {currentProject && selectedProjectId && isRightSidebarOpen && (
            <div className="hidden md:block w-80 shrink-0 border-l border-[#22242A]">
              <ProjectRightSidebar
                project={currentProject}
                issues={issues}
                users={users}
                activities={activities}
                onUpdate={(p) => handleUpdateProject(p.id, p)}
              />
            </div>
          )}
        </div>
      </main>

      <IssueModal
        key={editingIssue && 'id' in editingIssue ? editingIssue.id : (selectedProjectId || 'new-issue')}
        isOpen={isIssueModalOpen}
        onClose={() => setIsIssueModalOpen(false)}
        onSave={handleSaveIssue}
        users={users}
        projects={teamProjects}
        existingIssue={editingIssue}
        comments={comments}
        currentUser={currentUser!}
        onAddComment={handleAddComment}
        issues={issues}
        onCreateSubtask={handleCreateSubtask}
        onOpenIssue={async (issueId) => {
          const issue = issues.find(i => i.id === issueId);
          if (issue) {
            setEditingIssue(issue);
            await fetchComments(issueId);
          }
        }}
        defaultProjectId={selectedProjectId || teamProjects[0]?.id}
        isPublicView={location.pathname.startsWith('/public/')}
      />

      <ProjectModal
        isOpen={isProjectModalOpen}
        onClose={() => setIsProjectModalOpen(false)}
        currentTeam={currentTeam}
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
        currentUser={currentUser!}
        currentTeam={currentTeam}
        onUpdateRole={handleUpdateUserRole}
        onRemoveUser={handleRemoveUser}
        onInviteUser={handleInviteUser}
      />

      <UserProfileModal
        isOpen={isUserProfileOpen}
        onClose={() => setIsUserProfileOpen(false)}
        currentUser={currentUser!}
        onSave={handleUpdateProfile}
        currentTeam={currentTeam}
      />

      <ProjectSettingsModal
        isOpen={isProjectSettingsOpen}
        onClose={() => setIsProjectSettingsOpen(false)}
        project={settingsProject}
        onUpdate={handleUpdateProject}
      />
    </div>
  );
};

export default App;
