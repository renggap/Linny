import React from 'react';
import { useLocation } from '@tanstack/react-router';
import { router } from './router';
import { useAuth } from './contexts/AuthContext';
import { useUIStore } from './stores/uiStore';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { MainView } from './components/MainView';
import { ModalsContainer } from './components/ModalsContainer';
import { Auth } from './components/Auth';
import { PublicViewContainer } from './components/PublicViewContainer';
import { AcceptInvite } from './components/AcceptInvite';
import { WorkspaceApplication } from './components/WorkspaceApplication';
import { JoinRequestManagementModal } from './components/JoinRequestManagementModal';
import { useInitialData } from './hooks/useInitialData';
import { useWebSocket } from './hooks/useWebSocket';
import { useURLSync } from './hooks/useURLSync';
import { useTeams, useCreateTeam } from './hooks/useTeams';
import { useProjects, useCreateProject, useUpdateProject, useDeleteProject } from './hooks/useProjects';
import { useIssues, useCreateIssue, useUpdateIssue, useUpdateIssueStatus, useCreateSubtask } from './hooks/useIssues';
import { useUsers } from './hooks/useUsers';
import { useActivities } from './hooks/useActivities';
import { useCreateComment, useComments } from './hooks/useComments';
import { useQueryClient } from '@tanstack/react-query';
import { api } from './services/api';
import { UserRole } from './types';

const App: React.FC = () => {
  const { isAuthenticated, isLoading: authLoading, user: currentUser, refreshUser } = useAuth();
  const location = useLocation();
  const ui = useUIStore();
  const queryClient = useQueryClient();

  // Core Data
  const { data: teams = [] } = useTeams();
  const { data: projects = [] } = useProjects(ui.currentTeamId);
  const { data: issues = [] } = useIssues({
    teamId: ui.currentTeamId,
    projectId: ui.selectedProjectId,
    status: ui.statusFilter,
    assigneeId: ui.assigneeFilter,
    search: ui.searchQuery
  });
  const { data: users = [] } = useUsers();
  const { data: activities = [] } = useActivities(ui.selectedProjectId || undefined);

  // Hooks for initialization and sync
  const { isLoading: dataLoading } = useInitialData();
  useWebSocket();
  useURLSync(teams, projects, issues);

  // Mutations
  const createIssueMutation = useCreateIssue();
  const updateIssueMutation = useUpdateIssue();
  const createSubtaskMutation = useCreateSubtask();
  const createProjectMutation = useCreateProject();
  const updateProjectMutation = useUpdateProject();
  const deleteProjectMutation = useDeleteProject();
  const createCommentMutation = useCreateComment();
  const createTeamMutation = useCreateTeam();

  // Computed
  const currentTeam = teams.find(t => t.id === ui.currentTeamId);
  const currentProject = projects.find(p => p.id === ui.selectedProjectId);
  const teamProjects = projects.filter(p => p.teamId === ui.currentTeamId);
  const workspaceUsers = currentTeam?.members
    ? users.filter(u => currentTeam.members.includes(u.id))
    : users;

  // Get editing issue ID for comments fetching
  const editingIssueId = ui.editingIssue && 'id' in ui.editingIssue ? ui.editingIssue.id : null;
  const { data: comments = [] } = useComments(editingIssueId);

  const canCreateContent = currentUser?.role !== UserRole.Guest;

  // Handlers (Simplified)
  const handleSaveIssue = async (data: any) => {
    if (data.id) {
      // Updating existing issue - don't close modal
      // Extract the id and send only the fields (excluding id) as updates
      const { id, ...updates } = data;
      const result = await updateIssueMutation.mutateAsync({ id, updates });
      // Return the updated data so the modal can use it
      return result;
    } else {
      // Creating new issue - close modal after save
      const result = await createIssueMutation.mutateAsync(data);
      ui.setIssueModalOpen(false);
      return result;
    }
  };

  const handleAddComment = async (issueId: string, content: string) => {
    await createCommentMutation.mutateAsync({ content, issueId });
  };

  const handleOpenIssueFromNotification = async (issueId: string) => {
    const issue = await api.issues.getById(issueId);
    const project = projects.find(p => p.id === issue.projectId);
    if (project) {
      ui.setCurrentTeamId(project.teamId);
      ui.setSelectedProjectId(project.id);
      ui.setIssueModalOpen(true, issue);
      ui.setNotificationOpen(false);
    }
  };

  if (authLoading || dataLoading) {
    return (
      <div className="min-h-screen bg-[#1E1F24] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#5E6AD2] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (location.pathname.startsWith('/public/')) return <PublicViewContainer />;
  if (location.pathname.startsWith('/accept-invite')) {
    // AcceptInvite route handles its own auth logic
    return <AcceptInvite />;
  }
  if (!isAuthenticated) return <Auth />;

  // Check if user is a member of any team or is an administrator
  const userIsInAnyTeam = teams.some(team => team.members?.includes(currentUser?.id || ''));
  const isAdmin = currentUser?.role === UserRole.Administrator;

  // If user is not in any team and not an admin, show the workspace application page
  if (!userIsInAnyTeam && !isAdmin) {
    return <WorkspaceApplication />;
  }

  return (
    <div className="flex h-screen bg-[#1E1F24] text-[#DEDEDE] font-sans overflow-hidden">
      <Sidebar />
      <main className="flex-1 flex flex-col min-w-0 bg-[#1E1F24]">
        <Header
          currentTeam={currentTeam}
          currentProject={currentProject}
          users={users}
          visibleIssuesCount={issues.length}
          canCreateContent={canCreateContent}
          onOpenIssueFromNotification={handleOpenIssueFromNotification}
          onCreateIssue={() => ui.setIssueModalOpen(true, { projectId: ui.selectedProjectId || teamProjects[0]?.id })}
        />
        <MainView activities={activities} />
      </main>

      <ModalsContainer
        users={users}
        teams={teams}
        projects={projects}
        issues={issues}
        currentTeam={currentTeam}
        workspaceUsers={workspaceUsers}
        teamProjects={teamProjects}
        comments={comments}
        handleSaveIssue={handleSaveIssue}
        handleAddComment={handleAddComment}
        handleCreateSubtask={async (id, title) => { await createSubtaskMutation.mutateAsync({ parentId: id, title }); }}
        handleCreateProject={async (name, id, icon, tid) => { await createProjectMutation.mutateAsync({ name, identifier: id, icon, teamId: tid }); }}
        handleUpdateProject={async (id, updates) => { await updateProjectMutation.mutateAsync({ id, updates }); }}
        handleDeleteProject={async (id) => { await deleteProjectMutation.mutateAsync(id); }}
        handleCreateTeam={async (name, icon) => {
          const result = await createTeamMutation.mutateAsync({ name, icon });
          // Automatically switch to the newly created workspace
          if (result && result.id) {
            ui.setCurrentTeamId(result.id);
            ui.setSelectedProjectId(null);
          }
        }}
        handleUpdateUserRole={async (id, role) => {
          if (!currentTeam) return;

          try {
            // Update team-specific role
            await api.teams.addMember(currentTeam.id, id, role);
            // Invalidate teams query to refresh role badges in sidebar
            queryClient.invalidateQueries({ queryKey: ['teams'] });
          } catch (error) {
            throw error;
          }
        }}
        handleRemoveUser={async (id) => {
          // Optimistic update - remove user from list
          queryClient.setQueryData(['users'], (oldUsers: any[] = []) => {
            return oldUsers.filter((u: any) => u.id !== id);
          });

          try {
            await api.users.remove(id);
            // Success - user is already removed optimistically
          } catch (error) {
            // Revert on error
            queryClient.invalidateQueries({ queryKey: ['users'] });
            throw error;
          }
        }}
        handleInviteUser={(email, role) => { alert(`Invite sent to ${email}`); }}
        handleUpdateProfile={async (data) => { await api.users.updateProfile(currentUser!.id, data); await refreshUser(); }}
        handleUpdateWorkspace={async (id, updates) => { await api.teams.update(id, updates); }}
        handleDeleteWorkspace={async () => { if (ui.currentTeamId) await api.teams.delete(ui.currentTeamId); }}
        handleLeaveTeam={async () => { await api.teams.leaveTeam(ui.currentTeamId); }}
      />

      <JoinRequestManagementModal
        isOpen={ui.isJoinRequestManagementOpen}
        onClose={() => ui.setJoinRequestManagementOpen(false)}
      />
    </div>
  );
};

export default App;