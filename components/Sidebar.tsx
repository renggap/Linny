
import React, { useState } from 'react';
import { Layers, Users, Search, Plus, Sparkles, ChevronDown, LogOut, Shield, Settings, StatusIcon } from './Icons';
import { Project, Team, User, UserRole, Status } from '../types';

interface SidebarProps {
  currentUser: User;
  users: User[];
  teams: Team[];
  projects: Project[];
  currentTeam: Team | undefined;
  onSwitchTeam: (teamId: string) => void;
  onCreateIssue: () => void;
  onCreateProject: () => void;
  onCreateTeam: () => void;
  onSelectProject: (projectId: string | null) => void; // null for 'all'
  onLogout: () => void;
  onOpenUserManagement: () => void;
  // New props for navigation state
  selectedProjectId: string | null;
  assigneeFilter: string | null;
  onSelectAssigneeFilter: (userId: string | null) => void;
  onOpenUserProfile: () => void;
  onOpenProjectSettings: (project: Project) => void;
  statusFilter: Status | null;
  setStatusFilter: (status: Status | null) => void;
  isSidebarCollapsed: boolean;
  setIsSidebarCollapsed: (collapsed: boolean) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentUser,
  users,
  teams,
  projects,
  currentTeam,
  onSwitchTeam,
  onCreateIssue,
  onCreateProject,
  onCreateTeam,
  onSelectProject,
  onLogout,
  onOpenUserManagement,
  selectedProjectId,
  assigneeFilter,
  onSelectAssigneeFilter,
  onOpenUserProfile,
  onOpenProjectSettings,
  statusFilter,
  setStatusFilter,
  isSidebarCollapsed,
  setIsSidebarCollapsed
}) => {
  const [isTeamMenuOpen, setIsTeamMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isAllIssuesCollapsed, setIsAllIssuesCollapsed] = useState(true);

  const teamProjects = projects.filter(p => p.teamId === currentTeam?.id);
  const filteredProjects = teamProjects.filter(p =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const canCreateContent = currentUser.role !== UserRole.Viewer;
  const isAdmin = currentUser.role === UserRole.Admin;

  const statusViews = [
    { status: Status.Backlog, label: 'Backlog' },
    { status: Status.Todo, label: 'Todo' },
    { status: Status.InProgress, label: 'In Progress' },
    { status: Status.InReview, label: 'In Review' },
    { status: Status.Done, label: 'Done' },
    { status: Status.Canceled, label: 'Canceled' },
  ];

  return (
    <>
      <aside className={`w-[240px] bg-[#222328] border-r border-[#363840] flex flex-col h-full text-[#9CA3AF] text-[13px] font-medium select-none ${isSidebarCollapsed ? 'hidden md:flex' : 'flex'}`}>

        {/* Team Switcher */}
        <div className="relative">
          <div
            onClick={() => setIsTeamMenuOpen(!isTeamMenuOpen)}
            className="h-12 flex items-center px-4 border-b border-[#363840] hover:bg-[#2E3036] transition-colors cursor-pointer text-[#E5E7EB]"
          >
            <div className="w-5 h-5 bg-gradient-to-br from-purple-500 to-blue-500 rounded flex items-center justify-center text-[10px] font-bold text-white mr-2">
              {currentTeam?.icon || 'T'}
            </div>
            <span className="font-semibold tracking-tight truncate max-w-[120px]">{currentTeam?.name || 'Select Team'}</span>
            <ChevronDown className="w-3 h-3 ml-auto opacity-50" />
          </div>

          {isTeamMenuOpen && (
            <div className="absolute top-12 left-0 w-full bg-[#25262B] border border-[#363840] shadow-xl z-20 py-1">
              <div className="px-3 py-1 text-[10px] font-semibold uppercase text-gray-500">Switch Team</div>
              {teams.map(team => (
                <div
                  key={team.id}
                  onClick={() => { onSwitchTeam(team.id); setIsTeamMenuOpen(false); }}
                  className="flex items-center px-3 py-2 hover:bg-[#2E3036] cursor-pointer text-gray-200"
                >
                  <div className="w-4 h-4 bg-gray-700 rounded flex items-center justify-center text-[9px] mr-2 text-white">
                    {team.icon}
                  </div>
                  {team.name}
                </div>
              ))}
              {isAdmin && (
                <div className="border-t border-[#363840] mt-1 pt-1">
                  <div
                    onClick={() => { onCreateTeam(); setIsTeamMenuOpen(false); }}
                    className="px-3 py-2 text-gray-400 hover:text-white hover:bg-[#2E3036] cursor-pointer text-xs flex items-center"
                  >
                    <Plus className="w-3 h-3 mr-2" /> Create Team
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto py-3 px-2 space-y-6">

          {/* Primary Actions */}
          <div className="space-y-0.5">
            <button
              onClick={onCreateIssue}
              disabled={!canCreateContent}
              className={`w-full flex items-center px-2 py-1.5 rounded-md text-[#E5E7EB] group transition-all ${canCreateContent ? 'hover:bg-[#2E3036]' : 'opacity-50 cursor-not-allowed'}`}
            >
              <div className={`w-5 h-5 rounded-full flex items-center justify-center mr-2 border transition-all ${canCreateContent ? 'bg-[#5E6AD2]/20 text-[#5E6AD2] border-[#5E6AD2]/30 group-hover:bg-[#5E6AD2] group-hover:text-white' : 'bg-gray-700 text-gray-500 border-gray-600'}`}>
                <Plus className="w-3.5 h-3.5" />
              </div>
              New Issue
              {canCreateContent && <span className="ml-auto text-[10px] bg-[#2E3036] px-1.5 py-0.5 rounded text-gray-500 border border-white/5">C</span>}
            </button>

            <div className="px-0 py-1">
              <div className="relative group">
                <Search className="absolute left-2.5 top-2 w-3.5 h-3.5 text-gray-500 group-focus-within:text-gray-300 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Filter projects..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-[#1E1F24] border border-[#363840] rounded-md py-1.5 pl-8 pr-2 text-xs text-gray-300 placeholder-gray-600 focus:outline-none focus:border-[#5E6AD2] transition-colors"
                />
              </div>
            </div>

            {/* Collapsible All Issues Section */}
            <div className="space-y-0.5">
              <div
                onClick={() => setIsAllIssuesCollapsed(!isAllIssuesCollapsed)}
                className={`flex items-center px-2 py-1.5 rounded-md cursor-pointer transition-colors ${!selectedProjectId && !statusFilter && !assigneeFilter ? 'bg-[#2E3036] text-white' : 'text-[#E5E7EB] hover:bg-[#2E3036]'}`}
              >
                <Layers className={`w-4 h-4 mr-2.5 ${!selectedProjectId && !statusFilter && !assigneeFilter ? 'text-[#5E6AD2]' : ''}`} />
                <span className="flex-1">All Issues</span>
                <ChevronDown className={`w-3 h-3 transition-transform ${isAllIssuesCollapsed ? 'rotate-180' : ''}`} />
              </div>

              {!isAllIssuesCollapsed && (
                <>
                  {/* Status Filters */}
                  {statusViews.map(view => (
                    <div
                      key={view.status}
                      onClick={() => {
                        setStatusFilter(view.status);
                        onSelectProject(null);
                        onSelectAssigneeFilter(null);
                      }}
                      className={`flex items-center px-2 py-1.5 rounded-md cursor-pointer transition-colors ${statusFilter === view.status ? 'bg-[#2E3036] text-white' : 'text-[#E5E7EB] hover:bg-[#2E3036]'}`}
                    >
                      <StatusIcon status={view.status} className="w-4 h-4 mr-2.5" />
                      All {view.label}
                    </div>
                  ))}
                </>
              )}
            </div>

          </div>

          {/* Projects */}
          <div>
            <div className="px-2 mb-1 text-[11px] font-semibold opacity-50 uppercase tracking-wider flex items-center justify-between">
              Projects
              {canCreateContent && (
                <button
                  onClick={onCreateProject}
                  className="flex items-center space-x-1 px-1.5 py-0.5 bg-[#5E6AD2] hover:bg-[#4b55aa] text-white rounded text-[10px] font-medium transition-all shadow-lg shadow-purple-900/20"
                >
                  <Plus className="w-3 h-3" />
                  <span>New</span>
                </button>
              )}
            </div>
            <div className="space-y-0.5">
              {filteredProjects.map(project => (
                <div
                  key={project.id}
                  onClick={() => onSelectProject(project.id)}
                  className={`flex items-center px-2 py-1.5 rounded-md cursor-pointer group transition-colors ${selectedProjectId === project.id ? 'bg-[#2E3036] text-white' : 'hover:bg-[#2E3036]'}`}
                >
                  <span className="mr-2.5 text-sm w-4 text-center">{project.icon}</span>
                  <span className="truncate flex-1">{project.name}</span>
                  {project.isPublic && (
                    <span className="text-[9px] bg-green-500/20 text-green-400 px-1.5 py-0.5 rounded mr-1">Public</span>
                  )}
                  <Settings
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpenProjectSettings(project);
                    }}
                    className="w-3.5 h-3.5 opacity-0 group-hover:opacity-50 hover:!opacity-100 cursor-pointer text-gray-400 hover:text-white transition-opacity"
                  />
                </div>
              ))}
              {filteredProjects.length === 0 && (
                <div className="px-2 py-1.5 text-xs text-gray-600 italic">
                  {searchQuery ? 'No matching projects' : 'No projects'}
                </div>
              )}
            </div>
          </div>

          {/* Team Members */}
          <div>
            <div className="px-2 mb-1 text-[11px] font-semibold opacity-50 uppercase tracking-wider flex items-center justify-between">
              Team Members
              {isAdmin && (
                <button
                  onClick={onOpenUserManagement}
                  className="flex items-center space-x-1 px-1.5 py-0.5 bg-[#5E6AD2] hover:bg-[#4b55aa] text-white rounded text-[10px] font-medium transition-all shadow-lg shadow-purple-900/20"
                >
                  <Settings className="w-3 h-3" />
                  <span>Manage</span>
                </button>
              )}
            </div>
            <div className="space-y-0.5">
              {currentTeam?.members.map(memberId => {
                const member = users.find(u => u.id === memberId);
                if (!member) return null;
                return (
                  <div
                    key={memberId}
                    onClick={() => onSelectAssigneeFilter(memberId)}
                    className={`flex items-center px-2 py-1.5 rounded-md cursor-pointer group transition-colors ${assigneeFilter === memberId ? 'bg-[#2E3036] text-white' : 'hover:bg-[#2E3036] text-gray-400'}`}
                  >
                    <img src={member.avatarUrl} alt={member.name} className={`w-4 h-4 rounded-full mr-2.5 transition-all ${assigneeFilter === memberId ? 'grayscale-0' : 'grayscale group-hover:grayscale-0'}`} />
                    <span className={`truncate transition-colors ${assigneeFilter === memberId ? 'text-white' : 'group-hover:text-gray-200'}`}>{member.name}</span>
                  </div>
                );
              })}
              {!isAdmin && (
                <div
                  onClick={onOpenUserManagement}
                  className="flex items-center px-2 py-1.5 rounded-md hover:bg-[#2E3036] cursor-pointer text-gray-500 hover:text-gray-300 transition-colors"
                >
                  <div className="w-4 h-4 border border-dashed border-gray-600 rounded-full flex items-center justify-center mr-2.5">
                    <Plus className="w-2.5 h-2.5" />
                  </div>
                  Invite people
                </div>
              )}
            </div>
          </div>

        </div>

        {/* User Profile */}
        <div className="p-3 border-t border-[#363840]">
          <div
            onClick={onOpenUserProfile}
            className="flex items-center px-2 py-1.5 rounded-md hover:bg-[#2E3036] cursor-pointer group relative"
          >
            <div className="w-6 h-6 rounded-full overflow-hidden mr-2">
              <img src={currentUser.avatarUrl} alt="User" className="w-full h-full object-cover" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="truncate text-xs text-white font-medium">{currentUser.name}</div>
              <div className="truncate text-[10px] text-gray-500 flex items-center">
                {currentUser.role}
              </div>
            </div>
            <LogOut onClick={onLogout} className="w-4 h-4 text-gray-500 opacity-0 group-hover:opacity-100 hover:text-red-400 transition-all absolute right-2" />
          </div>
        </div>

      </aside>
    </>
  );
};
