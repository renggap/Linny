import React, { useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import {
  Layers,
  Search,
  Plus,
  ChevronDown,
  LogOut,
  Settings,
  Globe,
  X,
  LayoutGrid,
  ChevronRight,
  Command,
  Crown,
  Loader2,
  EyeOff,
  Shield
} from 'lucide-react';
import { StatusIcon } from './Icons';
import { Team, User, UserRole, Status } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { UserAvatar } from './UserAvatar';
import { useWorkspaceMembers } from '../hooks/useWorkspaceMembers';
import { useUIStore } from '../stores/uiStore';
import { useAuth } from '../contexts/AuthContext';
import { useTeams } from '../hooks/useTeams';
import { useProjects } from '../hooks/useProjects';
import { useUsers } from '../hooks/useUsers';
import { useMyJoinRequests } from '../hooks/useJoinRequests';
import { api } from '../services/api';
import { canCreateContent, isGlobalAdministrator, getTeamRole } from '../lib/roleUtils';

const roleBadgeStyles: Record<UserRole, { bg: string; text: string; label: string; icon?: React.ComponentType<{ className?: string }> }> = {
  [UserRole.Administrator]: { bg: 'bg-amber-500/10', text: 'text-amber-400', label: 'Admin' },
  [UserRole.TeamLead]: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', label: 'Lead' },
  [UserRole.Member]: { bg: 'bg-blue-500/10', text: 'text-blue-400', label: 'Member' },
  [UserRole.Guest]: { bg: 'bg-gray-500/10', text: 'text-gray-400', label: 'Guest' }
};

const SidebarItem = ({
  icon: Icon,
  label,
  isActive,
  onClick,
  rightElement,
  className,
  indent = false
}: {
  icon?: any,
  label: string,
  isActive?: boolean,
  onClick?: () => void,
  rightElement?: React.ReactNode,
  className?: string,
  indent?: boolean
}) => (
  <motion.div
    onClick={onClick}
    whileHover={{ x: 2 }}
    whileTap={{ scale: 0.98 }}
    className={cn(
      "group flex items-center px-3 py-1.5 mx-2 cursor-pointer transition-all duration-200 border-l-2 border-transparent",
      isActive
        ? "bg-[#1A1C23] border-accent text-[#E8E8E8]"
        : "text-[#8A8F98] hover:bg-[#15161A] hover:text-[#C0C4CC]",
      indent && "ml-6",
      className
    )}
  >
    {Icon && (
      <Icon
        className={cn(
          "w-4 h-4 mr-3 transition-colors",
          isActive ? "text-accent" : "text-[#5E6068] group-hover:text-[#8A8F98]"
        )}
      />
    )}
    <span className="flex-1 text-[13px] font-medium truncate">{label}</span>
    {rightElement}
  </motion.div>
);

export const Sidebar: React.FC = () => {
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const ui = useUIStore();
  const { data: teams = [] } = useTeams();
  const { data: projects = [] } = useProjects(ui.currentTeamId);
  const { data: users = [] } = useUsers();
  const { data: joinRequests = [] } = useMyJoinRequests();

  const [isTeamMenuOpen, setIsTeamMenuOpen] = useState(false);
  const [isAllIssuesCollapsed, setIsAllIssuesCollapsed] = useState(true);
  const [joiningTeamId, setJoiningTeamId] = useState<string | null>(null);

  const currentTeam = teams.find(t => t.id === ui.currentTeamId);
  const teamUsers = useWorkspaceMembers(currentTeam, users);

  // Sort team users by role: Administrator > TeamLead > Member > Guest, then by name
  const sortedTeamUsers = teamUsers.sort((a, b) => {
    const roleA = getTeamRole(a, currentTeam);
    const roleB = getTeamRole(b, currentTeam);

    const roleOrder = [UserRole.Administrator, UserRole.TeamLead, UserRole.Member, UserRole.Guest];
    const indexA = roleOrder.indexOf(roleA as UserRole);
    const indexB = roleOrder.indexOf(roleB as UserRole);

    if (indexA !== indexB) {
      return indexA - indexB;
    }

    return a.name.localeCompare(b.name);
  });

  // Helper to check if user has a pending join request for a team
  const hasPendingJoinRequest = (teamId: string) => {
    return joinRequests.some(req => req.teamId === teamId && req.status === 'pending');
  };

  const getTeamSpecificRole = (user: User, team: Team | undefined): UserRole | null => {
    if (!team?.membersWithRoles) return null;
    const memberWithRole = team.membersWithRoles.find(m => m.id === user.id);
    return memberWithRole?.role ?? null;
  };

  const visibleUsers = sortedTeamUsers;

  // Check if user can create content based on team-specific role
  const canCreateContentCheck = canCreateContent(currentUser, currentTeam);
  const isAdmin = isGlobalAdministrator(currentUser);

  const isTeamMember = (team: Team): boolean => {
    if (isAdmin) return true; // Admins can access all visible teams
    return team.members?.includes(currentUser?.id || '') || false;
  };

  const statusViews = [
    { status: Status.Backlog, label: 'Backlog' },
    { status: Status.Todo, label: 'Todo' },
    { status: Status.InProgress, label: 'In Progress' },
    { status: Status.InReview, label: 'In Review' },
    { status: Status.Done, label: 'Done' },
    { status: Status.Canceled, label: 'Canceled' },
  ];

  if (!currentUser) return null;

  return (
    <>
      <AnimatePresence>
        {!ui.isSidebarCollapsed && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-[2px] z-40 md:hidden"
            onClick={() => ui.setSidebarCollapsed(true)}
          />
        )}
      </AnimatePresence>

      <aside
        className={cn(
          "w-[240px] bg-[#0F1014] border-r border-[#22242A] flex flex-col h-full select-none z-50 transition-all duration-300",
          ui.isSidebarCollapsed ? "hidden md:flex" : "fixed inset-y-0 left-0 flex shadow-popover md:static md:shadow-none"
        )}
      >
        <button
          className="absolute top-3 right-3 p-1.5 text-[#5E6068] hover:text-[#E8E8E8] md:hidden"
          onClick={() => ui.setSidebarCollapsed(true)}
        >
          <X className="w-5 h-5" />
        </button>

        <div className="relative shrink-0 z-40 px-3 pt-4 pb-2">
          <div
            onClick={() => setIsTeamMenuOpen(!isTeamMenuOpen)}
            className="flex items-center p-2 hover:bg-[#1A1C23] border border-transparent hover:border-[#2C2D35] transition-all cursor-pointer group select-none"
          >
            <div className="w-6 h-6 bg-[#1A1C23] border border-[#2C2D35] flex items-center justify-center text-xs font-bold text-[#E8E8E8] shadow-sm group-hover:border-accent/50 group-hover:text-white transition-all">
              {currentTeam?.icon || <LayoutGrid className="w-3.5 h-3.5" />}
            </div>
            <span className="ml-3 font-medium text-[13px] text-[#E8E8E8] tracking-tight truncate flex-1">
              {currentTeam?.name || 'Select Team'}
            </span>
            {currentTeam?.isStealth && (
              <EyeOff className="w-3.5 h-3.5 text-[#5E6068] mr-1" title="Stealth workspace - only visible to members" />
            )}
            <ChevronDown className={cn("w-3.5 h-3.5 text-[#5E6068] transition-transform duration-200", isTeamMenuOpen && "rotate-180")} />
          </div>

          <AnimatePresence>
            {isTeamMenuOpen && (
              <motion.div
                initial={{ opacity: 0, y: -10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.15 }}
                className="absolute top-full left-3 right-3 mt-1 bg-[#14151A] border border-[#26272F] shadow-xl overflow-hidden z-[60]"
              >
                <div className="px-3 py-2 bg-[#1A1C23]/50 border-b border-[#26272F]">
                  <span className="text-[10px] font-semibold text-[#5E6068] uppercase tracking-wider">Switch Team</span>
                </div>
                <div className="max-h-[250px] overflow-y-auto py-1">
                  {teams.map(team => {
                    const isMember = isTeamMember(team);
                    const hasPendingRequest = hasPendingJoinRequest(team.id);
                    return (
                      <div key={team.id}>
                        <div
                          onClick={async () => {
                            if (isMember) {
                              ui.setCurrentTeamId(team.id);
                              ui.setSelectedProjectId(null);
                              ui.setStatusFilter(null);
                              ui.setAssigneeFilter(null);
                              ui.setSearchQuery('');
                              setIsTeamMenuOpen(false);
                              // useURLSync will handle the navigation automatically
                            } else if (!hasPendingRequest) {
                              // If not a member and no pending request, handle join/apply
                              try {
                                setJoiningTeamId(team.id);
                                await api.joinRequests.createJoinRequest(team.id);
                              } catch (err: any) {
                                alert(err.message || 'Failed to submit join request');
                              } finally {
                                setJoiningTeamId(null);
                              }
                            }
                            // If has pending request, do nothing (already applied)
                          }}
                          className={cn(
                            "flex items-center px-3 py-2 transition-colors border-l-2",
                            ui.currentTeamId === team.id
                              ? "bg-[#1A1C23] border-accent text-white"
                              : "border-transparent text-[#8A8F98]",
                            !isMember && !hasPendingRequest && "hover:bg-[#15161A] hover:text-[#C0C4CC] cursor-pointer",
                            hasPendingRequest && "cursor-default opacity-70"
                          )}
                        >
                          <span className="text-sm">{team.icon}</span>
                          <span className={cn("ml-3 text-[13px] font-medium flex-1", !isMember && "opacity-60")}>
                            {team.name}
                          </span>
                          {team.isStealth && (
                            <EyeOff className="w-3.5 h-3.5 text-[#5E6068] mr-2" title="Stealth workspace - only visible to members" />
                          )}
                          {!isMember && (
                            <div className="flex items-center gap-2">
                              {joiningTeamId === team.id ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin text-accent" />
                              ) : hasPendingRequest ? (
                                <span className="text-[10px] bg-amber-500/10 text-amber-400 px-1.5 py-0.5 rounded border border-amber-500/20">
                                  Pending
                                </span>
                              ) : (
                                <span className="text-[10px] bg-accent/10 text-accent px-1.5 py-0.5 rounded border border-accent/20">
                                  Join
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
                {isAdmin && (
                  <div
                    onClick={() => { ui.setTeamModalOpen(true); setIsTeamMenuOpen(false); }}
                    className="flex items-center px-3 py-2.5 border-t border-[#26272F] hover:bg-[#1A1C23] cursor-pointer text-[#8A8F98] hover:text-[#E8E8E8] transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5 mr-2" />
                    <span className="text-[12px] font-medium">Create New Workspace</span>
                  </div>
                )}
                <div
                  onClick={() => { ui.setWorkspaceSettingsOpen(true); setIsTeamMenuOpen(false); }}
                  className="flex items-center px-3 py-2.5 border-t border-[#26272F] hover:bg-[#1A1C23] cursor-pointer text-[#8A8F98] hover:text-[#E8E8E8] transition-colors"
                >
                  <Settings className="w-3.5 h-3.5 mr-2" />
                  <span className="text-[12px] font-medium">Workspace Settings</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="px-5 mb-6">
          <button
            onClick={() => ui.setIssueModalOpen(true)}
            disabled={!canCreateContentCheck}
            className={cn(
              "w-full flex items-center justify-between px-3 py-1.5 border transition-all text-left group shadow-lg shadow-black/20",
              canCreateContentCheck
                ? "bg-[#1A1C23] border-[#2C2D35] text-[#C0C4CC] hover:border-[#3A3C46] hover:bg-[#202229] hover:text-white"
                : "opacity-40 cursor-not-allowed border-transparent bg-[#1A1C23]"
            )}
          >
            <div className="flex items-center">
              <div className="w-5 h-5 rounded bg-accent/10 flex items-center justify-center mr-2 border border-accent/20 group-hover:border-accent/50 transition-colors">
                <Plus className="w-3.5 h-3.5 text-accent" />
              </div>
              <span className="text-[13px] font-medium">New Issue</span>
            </div>
            <div className="flex items-center space-x-1">
              <span className="text-[10px] font-mono text-[#5E6068] bg-[#15161A] px-1.5 rounded border border-[#22242A]">C</span>
            </div>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-1 space-y-6 no-scrollbar">
          <nav className="space-y-0.5">
            <SidebarItem
              label="Search..."
              icon={Search}
              isActive={false}
              className="mb-4"
              onClick={() => {
                const input = document.querySelector('header input') as HTMLInputElement;
                if (input) input.focus();
              }}
              rightElement={<Command className="w-3 h-3 text-[#5E6068]" />}
            />

            <SidebarItem
              label="All Issues"
              icon={Layers}
              isActive={!ui.selectedProjectId && !ui.statusFilter && !ui.assigneeFilter && !ui.searchQuery}
              onClick={() => {
                setIsAllIssuesCollapsed(prev => !prev);
                ui.setStatusFilter(null);
                ui.setSelectedProjectId(null);
                ui.setAssigneeFilter(null);
                ui.setSearchQuery('');
              }}
              rightElement={
                <ChevronRight
                  className={cn("w-3.5 h-3.5 text-[#5E6068] transition-transform duration-200", !isAllIssuesCollapsed && "rotate-90")}
                />
              }
            />

            <AnimatePresence>
              {!isAllIssuesCollapsed && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden space-y-0.5"
                >
                  {statusViews.map(view => (
                    <SidebarItem
                      key={view.status}
                      indent
                      label={view.label}
                      isActive={ui.statusFilter === view.status}
                      onClick={() => {
                        ui.setStatusFilter(view.status);
                        ui.setSelectedProjectId(null);
                        ui.setAssigneeFilter(null);
                        ui.setSearchQuery('');
                      }}
                      icon={({ className }: { className?: string }) => (
                        <div className="mr-3 ml-0.5">
                          <StatusIcon status={view.status} className={cn("w-3.5 h-3.5", className?.replace('text-accent', ''))} />
                        </div>
                      )}
                    />
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </nav>

          <div className="pt-2">
            <div className="px-5 mb-2 flex items-center justify-between group">
              <span className="text-[11px] font-semibold text-[#5E6068] uppercase tracking-wider">Projects</span>
              {canCreateContentCheck && (
                <button onClick={() => ui.setProjectModalOpen(true)} className="opacity-0 group-hover:opacity-100 text-[#8A8F98] hover:text-[#E8E8E8] transition-all">
                  <Plus className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            <div className="space-y-0.5">
              {projects.map(project => (
                <SidebarItem
                  key={project.id}
                  label={project.name}
                  icon={() => <span className="text-base mr-3 opacity-80 leading-none">{project.icon}</span>}
                  isActive={ui.selectedProjectId === project.id}
                  onClick={() => {
                    ui.setSelectedProjectId(project.id);
                    ui.setStatusFilter(null);
                    ui.setAssigneeFilter(null);
                    ui.setSearchQuery('');
                    // useURLSync will handle the navigation automatically
                  }}
                  rightElement={
                    <div className="flex items-center">
                      {project.isPublic && <Globe className="w-3 h-3 text-[#5E6068] mr-2" />}
                      <Settings
                        onClick={(e) => { e.stopPropagation(); ui.setProjectSettingsOpen(true, project); }}
                        className="w-3.5 h-3.5 text-[#5E6068] hover:text-[#E8E8E8] opacity-0 group-hover:opacity-100 transition-opacity"
                      />
                    </div>
                  }
                />
              ))}
            </div>
          </div>

          <div className="pt-2">
            <div className="px-5 mb-2 flex items-center justify-between group">
              <span className="text-[11px] font-semibold text-[#5E6068] uppercase tracking-wider">Your Team</span>
              {isAdmin && (
                <button onClick={() => ui.setUserManagementOpen(true)} className="opacity-0 group-hover:opacity-100 text-[#8A8F98] hover:text-[#E8E8E8] transition-all">
                  <Settings className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            <div className="space-y-0.5">
              {visibleUsers.map(user => {
                // Display the team-scoped role for the badge. Using
                // getEffectiveRole here caused global Administrators to
                // always render with a crown even after being demoted to
                // Member within this team — the crown persisted because
                // getEffectiveRole short-circuits on the global role.
                const effectiveRole = getTeamRole(user, currentTeam);

                // Only show badge if role is not Member (default role)
                if (effectiveRole === UserRole.Member) {
                  return (
                    <SidebarItem
                      key={user.id}
                      label={user.name}
                      isActive={ui.assigneeFilter === user.id}
                      onClick={() => ui.setAssigneeFilter(user.id)}
                      icon={() => <UserAvatar name={user.name} size="sm" className="mr-3" showRing={true} />}
                    />
                  );
                }

                const roleStyle = roleBadgeStyles[effectiveRole];
                const showCrownOnly = effectiveRole === UserRole.Administrator;
                const isGlobalAdmin = isGlobalAdministrator(user);

                return (
                  <SidebarItem
                    key={user.id}
                    label={user.name}
                    isActive={ui.assigneeFilter === user.id}
                    onClick={() => ui.setAssigneeFilter(user.id)}
                    icon={() => <UserAvatar name={user.name} size="sm" className="mr-3" showRing={true} />}
                    rightElement={
                      <span className="flex items-center gap-1">
                        {isGlobalAdmin && (
                          <span
                            className="flex items-center justify-center w-4 h-4 bg-violet-500/15 border border-violet-400/40 text-violet-300"
                            title="Global Administrator — system-wide superuser"
                          >
                            <Shield className="w-2.5 h-2.5" />
                          </span>
                        )}
                        <span className={cn("flex items-center text-[10px] font-medium px-1.5 py-0.5", roleStyle.bg, roleStyle.text, "border border-[#2C2D35] gap-1")}>
                          {showCrownOnly && <Crown className="w-3 h-3 text-amber-400" />}
                          {!showCrownOnly && roleStyle.label}
                        </span>
                      </span>
                    }
                  />
                );
              })}
            </div>
          </div>
        </div>

        <div className="mt-auto px-3 py-3 border-t border-[#22242A] bg-[#0F1014]/50 backdrop-blur-sm">
          <div
            onClick={() => ui.setUserProfileOpen(true)}
            className="flex items-center p-2 hover:bg-[#1A1C23] cursor-pointer group transition-all"
          >
            <UserAvatar name={currentUser.name} size="lg" className="mr-3" />
            <div className="flex-1 min-w-0">
              <div className="text-[13px] font-medium text-[#E8E8E8] truncate">{currentUser.name}</div>
              <div className="text-[10px] text-[#5E6068] font-mono truncate">{currentUser.email}</div>
            </div>
            <button
              onClick={async (e) => { e.stopPropagation(); await api.auth.logout(); window.location.href = '/'; }}
              className="p-1.5 hover:bg-[#2C2D35] text-[#5E6068] hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};
