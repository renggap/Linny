import React from 'react';
import { useUIStore } from '../stores/uiStore';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../services/api';
import { IssueModal } from './IssueModal';
import { ProjectModal } from './ProjectModal';
import { TeamModal } from './TeamModal';
import { UserManagementModal } from './UserManagementModal';
import { UserProfileModal } from './UserProfileModal';
import { ProjectSettingsModal } from './ProjectSettingsModal';
import { WorkspaceSettingsModal } from './WorkspaceSettingsModal';
import { Team, User, Project, Issue, UserRole, Comment } from '../types';

interface ModalsContainerProps {
  users: User[];
  teams: Team[];
  projects: Project[];
  issues: Issue[];
  currentTeam?: Team;
  workspaceUsers: User[];
  teamProjects: Project[];
  comments: Comment[];
  handleSaveIssue: (data: any) => Promise<void>;
  handleAddComment: (issueId: string, content: string) => Promise<void>;
  handleCreateSubtask: (parentId: string, title: string) => Promise<void>;
  handleCreateProject: (name: string, identifier: string, icon: string, teamId: string) => Promise<void>;
  handleUpdateProject: (id: string, updates: any) => Promise<void>;
  handleDeleteProject: (id: string) => Promise<void>;
  handleCreateTeam: (name: string, icon: string) => Promise<void>;
  handleUpdateUserRole: (id: string, role: UserRole) => Promise<void>;
  handleRemoveUser: (id: string) => Promise<void>;
  handleInviteUser: (email: string, role: UserRole) => void;
  handleUpdateProfile: (updates: any) => Promise<void>;
  handleUpdateWorkspace: (id: string, updates: any) => Promise<void>;
  handleDeleteWorkspace: () => void;
  handleLeaveTeam: () => Promise<void>;
}

export const ModalsContainer: React.FC<ModalsContainerProps> = ({
  users,
  issues,
  currentTeam,
  workspaceUsers,
  teamProjects,
  comments,
  handleSaveIssue,
  handleAddComment,
  handleCreateSubtask,
  handleCreateProject,
  handleUpdateProject,
  handleDeleteProject,
  handleCreateTeam,
  handleUpdateUserRole,
  handleRemoveUser,
  handleInviteUser,
  handleUpdateProfile,
  handleUpdateWorkspace,
  handleDeleteWorkspace,
  handleLeaveTeam
}) => {
  const { user: currentUser } = useAuth();
  const ui = useUIStore();

  const {
    isIssueModalOpen, setIssueModalOpen,
    isProjectModalOpen, setProjectModalOpen,
    isTeamModalOpen, setTeamModalOpen,
    isUserManagementOpen, setUserManagementOpen,
    isUserProfileOpen, setUserProfileOpen,
    isProjectSettingsOpen, setProjectSettingsOpen,
    isWorkspaceSettingsOpen, setWorkspaceSettingsOpen,
    editingIssue,
    settingsProject,
    selectedProjectId,
    selectedUserForModal, setUserManagementOpen: setSelectedUserForModal
  } = ui;

  return (
    <>
      <IssueModal
        key={editingIssue && 'id' in editingIssue ? editingIssue.id : (selectedProjectId || 'new-issue-modal')}
        isOpen={isIssueModalOpen}
        onClose={() => setIssueModalOpen(false)}
        onSave={handleSaveIssue}
        users={workspaceUsers}
        projects={teamProjects}
        existingIssue={editingIssue}
        currentUser={currentUser!}
        issues={issues}
        comments={comments}
        onAddComment={handleAddComment}
        onCreateSubtask={handleCreateSubtask}
        onOpenIssue={async (issueId) => {
          // First try to find in local cache
          let issue = issues.find(i => i.id === issueId);

          // If not found in cache (e.g., for newly created subtasks), fetch from API
          if (!issue) {
            try {
              issue = await api.issues.getById(issueId);
            } catch (error) {
              console.error('Failed to fetch issue:', error);
              return;
            }
          }

          if (issue) {
            setIssueModalOpen(true, issue);
          }
        }}
        defaultProjectId={selectedProjectId || teamProjects[0]?.id}
        isPublicView={false}
      />

      <ProjectModal
        isOpen={isProjectModalOpen}
        onClose={() => setProjectModalOpen(false)}
        currentTeam={currentTeam}
        onSave={handleCreateProject}
      />

      <TeamModal
        isOpen={isTeamModalOpen}
        onClose={() => setTeamModalOpen(false)}
        onSave={handleCreateTeam}
      />

      <UserManagementModal
        isOpen={isUserManagementOpen}
        onClose={() => setUserManagementOpen(false)}
        users={users}
        currentUser={currentUser!}
        currentTeam={currentTeam}
        onUpdateRole={handleUpdateUserRole}
        onRemoveUser={handleRemoveUser}
        onInviteUser={handleInviteUser}
      />

      <UserProfileModal
        isOpen={isUserProfileOpen}
        onClose={() => setUserProfileOpen(false)}
        currentUser={currentUser!}
        onSave={handleUpdateProfile}
        currentTeam={currentTeam}
      />

      <ProjectSettingsModal
        isOpen={isProjectSettingsOpen}
        onClose={() => setProjectSettingsOpen(false)}
        project={settingsProject}
        onUpdate={handleUpdateProject}
        currentUser={currentUser || null}
        onDelete={handleDeleteProject}
      />

      <WorkspaceSettingsModal
        isOpen={isWorkspaceSettingsOpen}
        onClose={() => setWorkspaceSettingsOpen(false)}
        team={currentTeam || null}
        currentUser={currentUser || null}
        onUpdate={handleUpdateWorkspace}
        onDeleteWorkspace={handleDeleteWorkspace}
        onLeaveTeam={handleLeaveTeam}
      />

      {/* User Info Modal for Mention Clicks */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div
          className={`fixed inset-0 bg-[#070809]/80 backdrop-blur-sm transition-opacity duration-200 ${selectedUserForModal ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
          onClick={() => setSelectedUserForModal(false, null)}
        />
        <div
          className={`bg-[#0F1014] w-full max-w-md rounded-2xl shadow-[0_40px_120px_-20px_rgba(0,0,0,0.7)] border border-[#22242A] overflow-hidden relative z-10 transform transition-transform duration-200 ${selectedUserForModal ? 'scale-100 opacity-100' : 'scale-95 opacity-0 pointer-events-none'}`}
        >
          <div className="p-6">
            {selectedUserForModal && (
              <>
                <div className="flex items-center gap-4 mb-4">
                  <img
                    src={selectedUserForModal.avatarUrl}
                    alt={selectedUserForModal.name}
                    className="w-16 h-16 rounded-full border-2 border-accent"
                  />
                  <div>
                    <h3 className="text-[16px] font-bold text-[#E8E8E8]">{selectedUserForModal.name}</h3>
                    <p className="text-[12px] text-[#5E6068]">{selectedUserForModal.email}</p>
                    <span className="inline-block mt-1 text-[9px] font-bold text-accent bg-accent/10 px-2 py-0.5 rounded uppercase tracking-wider border border-accent/20">
                      {selectedUserForModal.role}
                    </span>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
};
