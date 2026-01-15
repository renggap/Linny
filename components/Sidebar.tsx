
import React, { useState } from 'react';
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
  Users,
  ChevronRight,
  Command
} from 'lucide-react';
import { StatusIcon } from './Icons'; // Keep custom status icons
import { Project, Team, User, UserRole, Status } from '../types';
import { motion, AnimatePresence } from 'framer-motion';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

// Utilitiy
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

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
  onSelectProject: (projectId: string | null) => void;
  onLogout: () => void;
  onOpenUserManagement: () => void;
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
      "group flex items-center px-3 py-1.5 mx-2 rounded-md cursor-pointer transition-all duration-200 border border-transparent",
      isActive
        ? "bg-[#1A1C23] border-[#2C2D35] text-[#E8E8E8]"
        : "text-[#8A8F98] hover:bg-[#15161A] hover:text-[#C0C4CC]",
      indent && "ml-6",
      className
    )}
  >
    {Icon && (
      <Icon
        className={cn(
          "w-4 h-4 mr-3 transition-colors",
          isActive ? "text-[#5E6AD2]" : "text-[#5E6068] group-hover:text-[#8A8F98]"
        )}
      />
    )}
    <span className="flex-1 text-[13px] font-medium truncate">{label}</span>
    {rightElement}
  </motion.div>
);

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
  const [isAllIssuesCollapsed, setIsAllIssuesCollapsed] = useState(true);

  const teamProjects = projects.filter(p => p.teamId === currentTeam?.id);

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
      <AnimatePresence>
        {!isSidebarCollapsed && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-[2px] z-40 md:hidden"
            onClick={() => setIsSidebarCollapsed(true)}
          />
        )}
      </AnimatePresence>

      <aside
        className={cn(
          "w-[240px] bg-[#0F1014] border-r border-[#22242A] flex flex-col h-full select-none z-50 transition-all duration-300",
          isSidebarCollapsed ? "hidden md:flex" : "fixed inset-y-0 left-0 flex shadow-2xl md:static md:shadow-none"
        )}
      >
        {/* Mobile Close Button */}
        <button
          className="absolute top-3 right-3 p-1.5 text-[#5E6068] hover:text-[#E8E8E8] md:hidden"
          onClick={() => setIsSidebarCollapsed(true)}
        >
          <X className="w-5 h-5" />
        </button>

        {/* Team Switcher Header */}
        <div className="relative shrink-0 z-40 px-3 pt-4 pb-2">
          <div
            onClick={() => setIsTeamMenuOpen(!isTeamMenuOpen)}
            className="flex items-center p-2 rounded-lg hover:bg-[#1A1C23] border border-transparent hover:border-[#2C2D35] transition-all cursor-pointer group select-none"
          >
            <div className="w-6 h-6 bg-[#1A1C23] border border-[#2C2D35] rounded-md flex items-center justify-center text-xs font-bold text-[#E8E8E8] shadow-sm group-hover:border-[#5E6AD2]/50 group-hover:text-white transition-all">
              {currentTeam?.icon || <LayoutGrid className="w-3.5 h-3.5" />}
            </div>
            <span className="ml-3 font-medium text-[13px] text-[#E8E8E8] tracking-tight truncate flex-1">
              {currentTeam?.name || 'Select Team'}
            </span>
            <ChevronDown className={cn("w-3.5 h-3.5 text-[#5E6068] transition-transform duration-200", isTeamMenuOpen && "rotate-180")} />
          </div>

          {/* Team Dropdown */}
          <AnimatePresence>
            {isTeamMenuOpen && (
              <motion.div
                initial={{ opacity: 0, y: -10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.15 }}
                className="absolute top-full left-3 right-3 mt-1 bg-[#14151A] border border-[#26272F] shadow-xl rounded-xl overflow-hidden z-[60]"
              >
                <div className="px-3 py-2 bg-[#1A1C23]/50 border-b border-[#26272F]">
                  <span className="text-[10px] font-semibold text-[#5E6068] uppercase tracking-wider">Switch Team</span>
                </div>
                <div className="max-h-[200px] overflow-y-auto py-1">
                  {teams.map(team => (
                    <div
                      key={team.id}
                      onClick={() => { onSwitchTeam(team.id); setIsTeamMenuOpen(false); }}
                      className={cn(
                        "flex items-center px-3 py-2 cursor-pointer transition-colors border-l-2",
                        currentTeam?.id === team.id
                          ? "bg-[#1A1C23] border-[#5E6AD2] text-white"
                          : "border-transparent text-[#8A8F98] hover:bg-[#15161A] hover:text-[#C0C4CC]"
                      )}
                    >
                      <span className="text-sm">{team.icon}</span>
                      <span className="ml-3 text-[13px] font-medium">{team.name}</span>
                    </div>
                  ))}
                </div>
                {isAdmin && (
                  <div
                    onClick={() => { onCreateTeam(); setIsTeamMenuOpen(false); }}
                    className="flex items-center px-3 py-2.5 border-t border-[#26272F] hover:bg-[#1A1C23] cursor-pointer text-[#8A8F98] hover:text-[#E8E8E8] transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5 mr-2" />
                    <span className="text-[12px] font-medium">Create New Team</span>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Create Issue Action */}
        <div className="px-5 mb-6">
          <button
            onClick={onCreateIssue}
            disabled={!canCreateContent}
            className={cn(
              "w-full flex items-center justify-between px-3 py-1.5 rounded-lg border transition-all text-left group shadow-lg shadow-black/20",
              canCreateContent
                ? "bg-[#1A1C23] border-[#2C2D35] text-[#C0C4CC] hover:border-[#3A3C46] hover:bg-[#202229] hover:text-white"
                : "opacity-40 cursor-not-allowed border-transparent bg-[#1A1C23]"
            )}
          >
            <div className="flex items-center">
              <div className="w-5 h-5 rounded bg-[#5E6AD2]/10 flex items-center justify-center mr-2 border border-[#5E6AD2]/20 group-hover:border-[#5E6AD2]/50 transition-colors">
                <Plus className="w-3.5 h-3.5 text-[#5E6AD2]" />
              </div>
              <span className="text-[13px] font-medium">New Issue</span>
            </div>
            <div className="flex items-center space-x-1">
              <span className="text-[10px] font-mono text-[#5E6068] bg-[#15161A] px-1.5 rounded border border-[#22242A]">C</span>
            </div>
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto px-1 space-y-6 no-scrollbar">

          {/* Navigation */}
          <nav className="space-y-0.5">
            <SidebarItem
              label="Search..."
              icon={Search}
              isActive={false}
              className="mb-4" // spacer
              onClick={() => {
                // Focus existing search input logic if needed, or open global search
                // For now just consistent UI
                const input = document.querySelector('header input') as HTMLInputElement;
                if (input) input.focus();
              }}
              rightElement={<Command className="w-3 h-3 text-[#5E6068]" />}
            />

            <SidebarItem
              label="All Issues"
              icon={Layers}
              isActive={!selectedProjectId && !statusFilter && !assigneeFilter}
              onClick={() => {
                setIsAllIssuesCollapsed(!isAllIssuesCollapsed);
                if (isAllIssuesCollapsed) {
                  // Expand means we probably want to see specific filters, but clicking main "All Issues" usually resets filters in Linear
                  // However, let's just toggle collapse here to reveal sub-items
                } else {
                  // If collapsing, maybe just collapse
                }
                // Default behavior from old sidebar
                if (isAllIssuesCollapsed) setIsAllIssuesCollapsed(false);
                else setIsAllIssuesCollapsed(true);

                setStatusFilter(null);
                onSelectProject(null);
                onSelectAssigneeFilter(null);
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
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden space-y-0.5"
                >
                  {statusViews.map(view => (
                    <SidebarItem
                      key={view.status}
                      indent
                      label={view.label}
                      isActive={statusFilter === view.status}
                      onClick={() => {
                        setStatusFilter(view.status);
                        onSelectProject(null);
                        onSelectAssigneeFilter(null);
                      }}
                      icon={({ className }: { className?: string }) => (
                        <div className="mr-3 ml-0.5">
                          <StatusIcon status={view.status} className={cn("w-3.5 h-3.5", className?.replace('text-[#5E6AD2]', ''))} />
                        </div>
                      )}
                    />
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </nav>

          {/* Projects */}
          <div className="pt-2">
            <div className="px-5 mb-2 flex items-center justify-between group">
              <span className="text-[11px] font-semibold text-[#5E6068] uppercase tracking-wider">Projects</span>
              {canCreateContent && (
                <button onClick={onCreateProject} className="opacity-0 group-hover:opacity-100 text-[#8A8F98] hover:text-[#E8E8E8] transition-all">
                  <Plus className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            <div className="space-y-0.5">
              {teamProjects.map(project => (
                <SidebarItem
                  key={project.id}
                  label={project.name}
                  icon={() => <span className="text-base mr-3 opacity-80 leading-none">{project.icon}</span>}
                  isActive={selectedProjectId === project.id}
                  onClick={() => onSelectProject(project.id)}
                  rightElement={
                    <div className="flex items-center">
                      {project.isPublic && <Globe className="w-3 h-3 text-[#5E6068] mr-2" />}
                      <Settings
                        onClick={(e) => { e.stopPropagation(); onOpenProjectSettings(project); }}
                        className="w-3.5 h-3.5 text-[#5E6068] hover:text-[#E8E8E8] opacity-0 group-hover:opacity-100 transition-opacity"
                      />
                    </div>
                  }
                />
              ))}
              {teamProjects.length === 0 && (
                <div className="px-5 py-2 text-xs text-[#5E6068] italic">No projects found</div>
              )}
            </div>
          </div>

          {/* Team Members */}
          <div className="pt-2">
            <div className="px-5 mb-2 flex items-center justify-between group">
              <span className="text-[11px] font-semibold text-[#5E6068] uppercase tracking-wider">Your Team</span>
              {isAdmin && (
                <button onClick={onOpenUserManagement} className="opacity-0 group-hover:opacity-100 text-[#8A8F98] hover:text-[#E8E8E8] transition-all">
                  <Settings className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            <div className="space-y-0.5">
              {users.map(user => (
                <SidebarItem
                  key={user.id}
                  label={user.name}
                  isActive={assigneeFilter === user.id}
                  onClick={() => onSelectAssigneeFilter(user.id)}
                  icon={() => (
                    <div className="w-4 h-4 rounded-full bg-[#2C2D35] overflow-hidden mr-3 ring-1 ring-[#363840]/50 flex items-center justify-center">
                      {user.avatarUrl ? (
                        <img src={user.avatarUrl} className="w-full h-full object-cover" alt="" />
                      ) : (
                        <span className="text-[8px] font-bold text-[#8A8F98]">{user.name[0]}</span>
                      )}
                    </div>
                  )}
                />
              ))}
            </div>
          </div>
        </div>

        {/* User Profile Footer */}
        <div className="mt-auto px-3 py-3 border-t border-[#22242A] bg-[#0F1014]/50 backdrop-blur-sm">
          <div
            onClick={onOpenUserProfile}
            className="flex items-center p-2 rounded-lg hover:bg-[#1A1C23] cursor-pointer group transition-all"
          >
            <div className="w-8 h-8 rounded-full bg-[#1A1C23] border border-[#2C2D35] overflow-hidden mr-3 flex items-center justify-center relative">
              {currentUser.avatarUrl ? (
                <img src={currentUser.avatarUrl} className="w-full h-full object-cover" alt="" />
              ) : (
                <Users className="w-4 h-4 text-[#5E6068]" />
              )}
              <div className="absolute bottom-0 right-0 w-2 h-2 rounded-full bg-emerald-500 border border-[#1A1C23]" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[13px] font-medium text-[#E8E8E8] truncate">{currentUser.name}</div>
              <div className="text-[10px] text-[#5E6068] font-mono truncate">{currentUser.email}</div>
            </div>
            <button
              onClick={(e) => { e.stopPropagation(); onLogout(); }}
              className="p-1.5 rounded-md hover:bg-[#2C2D35] text-[#5E6068] hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

      </aside>
    </>
  );
};
