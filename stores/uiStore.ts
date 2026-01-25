import { create } from 'zustand';
import { Status, Project, User, Issue, PartialIssue } from '../types';

interface UIState {
  // Modal states
  isIssueModalOpen: boolean;
  isProjectModalOpen: boolean;
  isTeamModalOpen: boolean;
  isUserManagementOpen: boolean;
  isUserProfileOpen: boolean;
  isNotificationOpen: boolean;
  isProjectSettingsOpen: boolean;
  isWorkspaceSettingsOpen: boolean;
  isJoinRequestManagementOpen: boolean;

  // Selection states
  editingIssue: Issue | PartialIssue | undefined;
  settingsProject: Project | null;
  selectedUserForModal: User | null;
  currentTeamId: string;
  selectedProjectId: string | null;

  // Navigation & View states
  currentView: 'list' | 'board' | 'timeline';
  isSidebarCollapsed: boolean;
  isRightSidebarOpen: boolean;
  isProjectOverviewExpanded: boolean;

  // Filter states
  statusFilter: Status | null;
  assigneeFilter: string | null;
  searchQuery: string;

  // Actions
  setIssueModalOpen: (open: boolean, issue?: Issue | PartialIssue) => void;
  setProjectModalOpen: (open: boolean) => void;
  setTeamModalOpen: (open: boolean) => void;
  setUserManagementOpen: (open: boolean, user?: User | null) => void;
  setUserProfileOpen: (open: boolean) => void;
  setNotificationOpen: (open: boolean) => void;
  setProjectSettingsOpen: (open: boolean, project?: Project | null) => void;
  setWorkspaceSettingsOpen: (open: boolean) => void;
  setJoinRequestManagementOpen: (open: boolean) => void;

  setCurrentTeamId: (id: string) => void;
  setSelectedProjectId: (id: string | null) => void;
  setCurrentView: (view: 'list' | 'board' | 'timeline') => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  setRightSidebarOpen: (open: boolean) => void;
  setProjectOverviewExpanded: (expanded: boolean) => void;

  setStatusFilter: (status: Status | null) => void;
  setAssigneeFilter: (userId: string | null) => void;
  setSearchQuery: (query: string) => void;
}

export const useUIStore = create<UIState>((set) => ({
  isIssueModalOpen: false,
  isProjectModalOpen: false,
  isTeamModalOpen: false,
  isUserManagementOpen: false,
  isUserProfileOpen: false,
  isNotificationOpen: false,
  isProjectSettingsOpen: false,
  isWorkspaceSettingsOpen: false,
  isJoinRequestManagementOpen: false,

  editingIssue: undefined,
  settingsProject: null,
  selectedUserForModal: null,
  currentTeamId: '',
  selectedProjectId: null,

  currentView: 'list',
  isSidebarCollapsed: true,
  isRightSidebarOpen: true,
  isProjectOverviewExpanded: true,

  statusFilter: null,
  assigneeFilter: null,
  searchQuery: '',

  setIssueModalOpen: (open, issue) => set({ isIssueModalOpen: open, editingIssue: issue }),
  setProjectModalOpen: (open) => set({ isProjectModalOpen: open }),
  setTeamModalOpen: (open) => set({ isTeamModalOpen: open }),
  setUserManagementOpen: (open, user) => set({ isUserManagementOpen: open, selectedUserForModal: user || null }),
  setUserProfileOpen: (open) => set({ isUserProfileOpen: open }),
  setNotificationOpen: (open) => set({ isNotificationOpen: open }),
  setProjectSettingsOpen: (open, project) => set({ isProjectSettingsOpen: open, settingsProject: project || null }),
  setWorkspaceSettingsOpen: (open) => set({ isWorkspaceSettingsOpen: open }),
  setJoinRequestManagementOpen: (open) => set({ isJoinRequestManagementOpen: open }),

  setCurrentTeamId: (id) => set({ currentTeamId: id }),
  setSelectedProjectId: (id) => set({ selectedProjectId: id }),
  setCurrentView: (view) => set({ currentView: view }),
  setSidebarCollapsed: (collapsed) => set({ isSidebarCollapsed: collapsed }),
  setRightSidebarOpen: (open) => set({ isRightSidebarOpen: open }),
  setProjectOverviewExpanded: (expanded) => set({ isProjectOverviewExpanded: expanded }),

  setStatusFilter: (status) => set({ statusFilter: status }),
  setAssigneeFilter: (userId) => set({ assigneeFilter: userId }),
  setSearchQuery: (query) => set({ searchQuery: query }),
}));
