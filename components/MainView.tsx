import React from 'react';
import { useUIStore } from '../stores/uiStore';
import { useAuth } from '../contexts/AuthContext';
import { useIssues, useUpdateIssueStatus } from '../hooks/useIssues';
import { useTeams } from '../hooks/useTeams';
import { useUsers } from '../hooks/useUsers';
import { useProjectsWithLinks, useUpdateProject } from "../hooks/useProjects";
import { TeamDashboard } from './TeamDashboard';
import { IssueList } from './IssueList';
import { BoardView } from './BoardView';
import { TimelineView } from './TimelineView';
// ProjectOverviewHeader was moved to Header.tsx (topbar popover) to avoid
// eating vertical space in the main content area.
import { ProjectRightSidebar } from './ProjectRightSidebar';
import { Activity } from '../types';
import { api } from '../services/api';
import { canCreateContent } from '../lib/roleUtils';

interface MainViewProps {
  activities: Activity[];
}

export const MainView: React.FC<MainViewProps> = ({ activities }) => {
  const { user: currentUser } = useAuth();
  const ui = useUIStore();

  const { data: users = [] } = useUsers();
  const { data: teams = [] } = useTeams(); // Assuming we need teams for dashboard
  const { data: projects = [] } = useProjectsWithLinks();
  const { data: issues = [] } = useIssues({
    teamId: ui.currentTeamId,
    projectId: ui.selectedProjectId,
    status: ui.statusFilter,
    assigneeId: ui.assigneeFilter,
    search: ui.searchQuery
  });

  const updateStatusMutation = useUpdateIssueStatus();
  const updateProjectMutation = useUpdateProject();

  const currentTeam = teams.find(t => t.id === ui.currentTeamId);
  const currentProject = projects.find(p => p.id === ui.selectedProjectId);
  const teamProjects = projects.filter(p => p.teamId === ui.currentTeamId);

  const workspaceUsers = currentTeam?.members
    ? users.filter(u => (currentTeam.members || []).includes(u.id))
    : users;

  // Check if user can create content based on team-specific role
  const canCreateContentCheck = canCreateContent(currentUser, currentTeam);

  const isDashboard = !ui.selectedProjectId && !ui.statusFilter && !ui.assigneeFilter && !ui.searchQuery && !!currentTeam;

  const handleDeleteIssue = async (id: string) => {
    if (!confirm('Are you sure?')) return;
    await api.issues.delete(id);
    // Mutation would be better here
  };

  const handleCreateIssue = (prefill?: any) => {
    ui.setIssueModalOpen(true, {
      projectId: ui.selectedProjectId || teamProjects[0]?.id,
      ...prefill
    });
  };

  return (
    <div className="flex-1 flex flex-row overflow-hidden relative">
      <div className="flex-1 flex flex-col min-w-0 min-h-0 bg-[#1E1F24]">
        <div className="flex-1 overflow-hidden relative flex flex-col min-h-0">
          {isDashboard ? (
            <TeamDashboard
              team={currentTeam!}
              issues={issues}
              users={users}
              projects={teamProjects}
            />
          ) : ui.currentView === 'list' ? (
            <div className="flex-1 overflow-y-auto relative no-scrollbar bg-[#0F1014]">
              <IssueList
                key={`list-${ui.statusFilter || 'all'}`}
                issues={issues}
                users={users}
                onEdit={async (issue) => ui.setIssueModalOpen(true, issue)}
                onDelete={handleDeleteIssue}
                onStatusChange={(id, status) => updateStatusMutation.mutate({ id, status })}
                isPublicView={false}
                canEdit={canCreateContentCheck}
                statusFilter={ui.statusFilter}
              />
            </div>
          ) : ui.currentView === 'board' ? (
            <BoardView
              key={`board-${ui.statusFilter || 'all'}`}
              issues={issues}
              users={users}
              onEdit={async (issue) => ui.setIssueModalOpen(true, issue)}
              onDelete={handleDeleteIssue}
              onStatusChange={(id, status) => updateStatusMutation.mutate({ id, status })}
              onCreateIssue={(status) => handleCreateIssue({ status })}
              isPublicView={false}
              canEdit={canCreateContentCheck}
              statusFilter={ui.statusFilter}
            />
          ) : (
            <TimelineView
              key={`timeline-${ui.statusFilter || 'all'}`}
              issues={issues}
              users={users}
              onEdit={async (issue) => ui.setIssueModalOpen(true, issue)}
              statusFilter={ui.statusFilter}
            />
          )}

          <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-[#0F1014] to-transparent pointer-events-none z-10"></div>
        </div>
      </div>

      {currentProject && ui.selectedProjectId && ui.isRightSidebarOpen && (
        <div className="hidden md:block w-80 shrink-0 border-l border-[#22242A]">
          <ProjectRightSidebar
            project={currentProject}
            issues={issues}
            users={users}
            workspaceUsers={workspaceUsers}
            team={currentTeam}
            activities={activities}
            onUpdate={(p) => updateProjectMutation.mutate({ id: p.id, updates: p })}
            onOpenIssue={async (issueId) => {
              const issue = issues.find(i => i.id === issueId);
              if (issue) {
                ui.setIssueModalOpen(true, issue);
              }
            }}
          />
        </div>
      )}
    </div>
  );
};