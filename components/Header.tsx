import React, { useRef, useEffect } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { Layout, List, GanttChart, X, Bell, PanelRightClose, Plus, Users } from './Icons';
import { ChevronDown, ChevronUp, Globe } from 'lucide-react';
import { NotificationPopover } from './NotificationPopover';
import { ProjectOverviewHeader } from './ProjectOverviewHeader';
import { useUIStore } from '../stores/uiStore';
import { useAuth } from '../contexts/AuthContext';
import { useJoinRequests } from '../hooks/useJoinRequests';
import { useUnreadNotificationCount } from '../hooks/useNotifications';
import { Team, User, Project } from '../types';
import { canManageTeam } from '../lib/roleUtils';

interface HeaderProps {
  currentTeam?: Team;
  currentProject?: Project;
  users: User[];
  visibleIssuesCount: number;
  canCreateContent: boolean;
  onOpenIssueFromNotification: (issueId: string) => void;
  onCreateIssue: (prefill?: any) => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentTeam,
  currentProject,
  users,
  visibleIssuesCount,
  canCreateContent,
  onOpenIssueFromNotification,
  onCreateIssue
}) => {
  const navigate = useNavigate();
  const searchInputRef = useRef<HTMLInputElement>(null);
  const projectOverviewRef = useRef<HTMLDivElement>(null);
  const { user: currentUser } = useAuth();
  const ui = useUIStore();
  const { data: joinRequests = [] } = useJoinRequests();
  const unreadNotificationCount = useUnreadNotificationCount();

  // Count pending join requests
  const pendingJoinRequestsCount = joinRequests.filter(req => req.status === 'pending').length;

  // Check if user can manage join requests (admin or team lead in current team)
  const canManageJoinRequests = canManageTeam(currentUser, currentTeam);

  const {
    currentView,
    setCurrentView,
    isSidebarCollapsed,
    setSidebarCollapsed,
    isRightSidebarOpen,
    setRightSidebarOpen,
    searchQuery,
    setSearchQuery,
    statusFilter,
    setStatusFilter,
    assigneeFilter,
    setAssigneeFilter,
    selectedProjectId,
    setSelectedProjectId,
    isNotificationOpen,
    setNotificationOpen,
    isProjectOverviewExpanded,
    setProjectOverviewExpanded
  } = ui;

  // Close project overview popover on outside click
  useEffect(() => {
    if (!isProjectOverviewExpanded) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (projectOverviewRef.current && !projectOverviewRef.current.contains(event.target as Node)) {
        setProjectOverviewExpanded(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isProjectOverviewExpanded, setProjectOverviewExpanded]);

  // Header title calculation
  let headerTitle = "Overview";
  if (searchQuery) headerTitle = `Search: "${searchQuery}"`;
  else if (selectedProjectId) headerTitle = currentProject?.name || "Project";
  else if (statusFilter) headerTitle = `All ${statusFilter}`;
  else if (assigneeFilter) {
    const user = users.find(u => u.id === assigneeFilter);
    headerTitle = user ? `Issues assigned to ${user.name}` : "Assigned Issues";
  }

  const isDashboard = !selectedProjectId && !statusFilter && !assigneeFilter && !searchQuery && !!currentTeam;

  // Keyboard shortcut for search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement).tagName)) return;
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
  }, [searchQuery, setSearchQuery]);

  return (
    <header className="border-b border-[#363840]/30 flex items-center justify-between px-6 h-[60px] bg-[#1E1F24]/80 backdrop-blur-md z-30 shrink-0 sticky top-0">
      <div className="flex items-center space-x-3 text-sm min-w-0">
        <button
          onClick={() => setSidebarCollapsed(!isSidebarCollapsed)}
          className="md:hidden p-1.5 bg-[#2E3036] hover:bg-[#3E4049] text-gray-400 hover:text-white transition-all active:scale-95"
        >
          <Layout className="w-4 h-4" />
        </button>

        <div className="flex items-center space-x-2 text-gray-500 font-medium truncate">
          <span
            className="hover:text-white cursor-pointer transition-colors bg-white/5 px-2 py-0.5 border border-white/5 active:scale-95 whitespace-nowrap"
            onClick={() => {
              const teamSlug = currentTeam?.name.toLowerCase().replace(/\s+/g, '-');
              if (teamSlug) navigate({ to: `/team/${teamSlug}` });
              setSelectedProjectId(null);
              setStatusFilter(null);
              setAssigneeFilter(null);
              setSearchQuery('');
            }}
          >
            {currentTeam?.name}
          </span>
          <span className="opacity-20 translate-y-[1px]">/</span>
          <div className="flex items-center space-x-2 relative">
            <div className={`w-2 h-2 rounded-full shadow-sm shrink-0 ${statusFilter ? 'bg-accent' : selectedProjectId ? 'bg-orange-500' : 'bg-green-500'}`} />
            {currentProject && selectedProjectId ? (
              <button
                onClick={() => setProjectOverviewExpanded(!isProjectOverviewExpanded)}
                className="flex items-center space-x-1 hover:bg-white/5 px-1.5 py-0.5 -mx-1.5 transition-colors group max-w-full"
                title="Toggle project brief"
              >
                <span className="text-white font-bold tracking-tight truncate group-hover:text-accent transition-colors">{headerTitle}</span>
                {isProjectOverviewExpanded
                  ? <ChevronUp className="w-3 h-3 text-gray-500 group-hover:text-accent shrink-0" />
                  : <ChevronDown className="w-3 h-3 text-gray-500 group-hover:text-accent shrink-0" />}
              </button>
            ) : (
              <span className="text-white font-bold tracking-tight truncate">{headerTitle}</span>
            )}
          </div>
        </div>
      </div>

      {currentProject && selectedProjectId && isProjectOverviewExpanded && (
        <div ref={projectOverviewRef} className="absolute top-full left-0 right-0 z-40 px-6">
          <ProjectOverviewHeader
            project={currentProject}
            isExpanded={true}
            onToggleExpand={() => setProjectOverviewExpanded(false)}
            users={users}
            onUserClick={(user) => ui.setUserManagementOpen(true, user)}
          />
        </div>
      )}

      <div className="flex items-center justify-between md:justify-end space-x-2 relative">
        {currentProject?.isPublic && currentProject.publicSlug && (
          <a
            href={`/public/${currentProject.publicSlug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="hidden sm:flex items-center space-x-2 h-8 px-3 bg-[#1A1C23] border border-[#2C2D35] hover:border-accent/40 hover:text-[#E8E8E8] transition-all group"
            title="Open public view"
          >
            <Globe className="w-3.5 h-3.5 text-[#5E6068] group-hover:text-accent transition-colors" />
            <span className="text-[11px] font-medium text-[#8A8F98] group-hover:text-[#C0C4CC]">Public View</span>
          </a>
        )}

        {!isDashboard && (
          <div className="flex items-center bg-[#2E3036] p-0.5 border border-[#363840]">
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
            className="w-48 md:w-64 bg-transparent border-b-2 border-transparent px-3 py-1.5 text-sm text-gray-300 placeholder-gray-600 focus:outline-none focus:border-accent transition-all"
          />
          {searchQuery && (
            <button onClick={() => { setSearchQuery(''); searchInputRef.current?.blur(); }} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300">
              <X className="w-3 h-3" />
            </button>
          )}
          {searchQuery && (
            <span className="absolute -bottom-5 left-0 text-xs text-gray-500 whitespace-nowrap">
              {visibleIssuesCount} result{visibleIssuesCount !== 1 ? 's' : ''}
            </span>
          )}
        </div>

        <div className="relative">
          <button
            onClick={() => setNotificationOpen(!isNotificationOpen)}
            className="p-2 hover:bg-[#2E3036] rounded text-gray-400 hover:text-gray-200 transition-colors relative"
          >
            <Bell className="w-4 h-4" />
            {unreadNotificationCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                {unreadNotificationCount > 9 ? '9+' : unreadNotificationCount}
              </span>
            )}
          </button>
          {isNotificationOpen && (
            <NotificationPopover
              users={users}
              onOpenIssue={onOpenIssueFromNotification}
              onClose={() => setNotificationOpen(false)}
            />
          )}
        </div>

        {canManageJoinRequests && (
          <div className="relative">
            <button
              onClick={() => ui.setJoinRequestManagementOpen(true)}
              className="p-2 hover:bg-[#2E3036] rounded text-gray-400 hover:text-gray-200 transition-colors relative"
              title="Join Requests"
            >
              <Users className="w-4 h-4" />
              {pendingJoinRequestsCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                  {pendingJoinRequestsCount > 9 ? '9+' : pendingJoinRequestsCount}
                </span>
              )}
            </button>
          </div>
        )}

        {currentProject && selectedProjectId && (
          <button
            onClick={() => setRightSidebarOpen(!isRightSidebarOpen)}
            className={`p-2 rounded transition-colors ${isRightSidebarOpen ? 'bg-[#3E4049] text-white' : 'hover:bg-[#2E3036] text-gray-400 hover:text-gray-200'}`}
            title={isRightSidebarOpen ? "Close sidebar" : "Open sidebar"}
          >
            <PanelRightClose className="w-4 h-4" />
          </button>
        )}

        <button
          onClick={() => onCreateIssue()}
          disabled={!canCreateContent}
          className={`bg-accent text-white px-3 py-1.5 text-xs font-semibold transition-all flex items-center ${canCreateContent ? 'hover:bg-accent-hover' : 'opacity-50 cursor-not-allowed grayscale'}`}
        >
          <Plus className="w-3 h-3 mr-1.5" />
          <span className="hidden sm:inline">New Issue</span>
          <span className="sm:hidden">New</span>
        </button>
      </div>
    </header>
  );
};
