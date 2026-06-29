import React from 'react';
import { useTeams } from '../hooks/useTeams';
import { useMyJoinRequests } from '../hooks/useJoinRequests';
import { useCreateJoinRequest } from '../hooks/useJoinRequests';
import { useAuth } from '../contexts/AuthContext';
import { LogOut } from 'lucide-react';

export const WorkspaceApplication: React.FC = () => {
  const { data: teams = [], isLoading: teamsLoading } = useTeams();
  const { data: myRequests = [], isLoading: requestsLoading } = useMyJoinRequests();
  const createJoinRequest = useCreateJoinRequest();
  const { logout } = useAuth();

  const handleLogout = async () => {
    await logout();
  };

  const isRequestPending = (teamId: string): boolean => {
    return myRequests.some(
      req => req.teamId === teamId && req.status === 'pending'
    );
  };

  const isRequestApproved = (teamId: string): boolean => {
    return myRequests.some(
      req => req.teamId === teamId && req.status === 'approved'
    );
  };

  const isRequestRejected = (teamId: string): boolean => {
    return myRequests.some(
      req => req.teamId === teamId && req.status === 'rejected'
    );
  };

  const handleApply = async (teamId: string) => {
    try {
      console.log(`[WorkspaceApplication] Applying to team: ${teamId}`);
      await createJoinRequest.mutateAsync(teamId);
      alert('Application submitted successfully!');
    } catch (error: any) {
      console.error('[WorkspaceApplication] Error applying to team:', error);
      const errorMessage = error.message || 'Failed to submit application';
      if (errorMessage.includes('private') || errorMessage.includes('Forbidden')) {
        alert('This workspace is private and cannot be joined via application.');
      } else if (errorMessage.includes('already pending')) {
        alert('You already have a pending application for this workspace.');
      } else if (errorMessage.includes('Already a member')) {
        alert('You are already a member of this workspace.');
      } else {
        alert(errorMessage);
      }
    }
  };

  // Filter out stealth teams and teams where user is already a member
  const availableTeams = teams.filter(team => {
    const isStealth = team.isStealth === true;
    if (isStealth) {
      console.log(`[WorkspaceApplication] Filtering out stealth team: ${team.name} (${team.id})`);
    }
    return !isStealth;
  });

  const hasPendingRequests = myRequests.some(req => req.status === 'pending');
  const hasApprovedRequest = myRequests.some(req => req.status === 'approved');

  if (teamsLoading || requestsLoading) {
    return (
      <div className="min-h-screen bg-[#1E1F24] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#1E1F24] text-[#DEDEDE] flex items-center justify-center p-6">
      <div className="max-w-2xl w-full">
        {/* Header with logout button */}
        <div className="flex items-center justify-between mb-8">
          <div className="text-center flex-1">
            <h1 className="text-3xl font-semibold mb-2">Join a Workspace</h1>
            <p className="text-[#9CA3AF]">
              Apply to join a workspace to access projects and issues
            </p>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-4 py-2 bg-[#2E3036] hover:bg-[#3E4049] border border-[#363840] text-sm text-gray-400 hover:text-white transition-all active:scale-95"
            title="Logout"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>

        {/* Pending requests section */}
        {hasPendingRequests && (
          <div className="mb-6 p-4 bg-[#2A2B30] border border-accent/30">
            <h2 className="text-lg font-medium mb-3 text-accent">
              Pending Applications
            </h2>
            {myRequests
              .filter(req => req.status === 'pending')
              .map(req => (
                <div
                  key={req.id}
                  className="flex items-center justify-between py-2 px-3 bg-[#1E1F24] rounded mb-2"
                >
                  <span className="flex items-center gap-2">
                    <span className="text-lg">{req.team?.icon || '📁'}</span>
                    <span>{req.team?.name || 'Unknown Workspace'}</span>
                  </span>
                  <span className="text-sm text-[#9CA3AF]">Pending review</span>
                </div>
              ))}
            <p className="text-xs text-[#9CA3AF] mt-2">
              You'll receive a notification when your application is reviewed
            </p>
          </div>
        )}

        {/* Approved request - success message */}
        {hasApprovedRequest && (
          <div className="mb-6 p-4 bg-[#2A2B30] border border-green-500/30">
            <h2 className="text-lg font-medium mb-3 text-green-500">
              Application Approved!
            </h2>
            <p className="text-sm text-[#DEDEDE]">
              Refresh the page to access your workspace.
            </p>
          </div>
        )}

        {/* Available workspaces */}
        <div className="space-y-4">
          <h2 className="text-lg font-medium mb-3">Available Workspaces</h2>

          {availableTeams.length === 0 ? (
            <div className="p-6 bg-[#2A2B30] text-center">
              <p className="text-[#9CA3AF]">
                No workspaces available to join at the moment.
              </p>
            </div>
          ) : (
            <div className="grid gap-3">
              {availableTeams.map(team => {
                const pending = isRequestPending(team.id);
                const approved = isRequestApproved(team.id);
                const rejected = isRequestRejected(team.id);

                return (
                  <div
                    key={team.id}
                    className="p-4 bg-[#2A2B30] border border-[#3E3F46] hover:border-accent/50 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{team.icon}</span>
                        <div>
                          <h3 className="font-medium">{team.name}</h3>
                          <p className="text-sm text-[#9CA3AF]">
                            {team.members?.length || 0} member{team.members?.length !== 1 ? 's' : ''}
                          </p>
                        </div>
                      </div>

                      {approved ? (
                        <span className="px-3 py-1.5 bg-green-500/20 text-green-500 text-sm">
                          Approved
                        </span>
                      ) : pending ? (
                        <span className="px-3 py-1.5 bg-accent/20 text-accent text-sm">
                          Pending
                        </span>
                      ) : rejected ? (
                        <button
                          onClick={() => handleApply(team.id)}
                          className="px-3 py-1.5 bg-accent hover:bg-accent/80 text-sm transition-colors"
                        >
                          Re-apply
                        </button>
                      ) : (
                        <button
                          onClick={() => handleApply(team.id)}
                          disabled={createJoinRequest.isPending}
                          className="px-3 py-1.5 bg-accent hover:bg-accent/80 text-sm transition-colors disabled:opacity-50"
                        >
                          {createJoinRequest.isPending ? 'Applying...' : 'Apply'}
                        </button>
                      )}
                    </div>

                    {rejected && (
                      <p className="mt-2 text-xs text-[#9CA3AF]">
                        Your previous application was rejected. You can apply again.
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Info text */}
        <div className="mt-8 p-4 bg-[#2A2B30]/50">
          <p className="text-sm text-[#9CA3AF] text-center">
            Workspace administrators will review your application and you'll receive a notification once a decision is made.
          </p>
        </div>
      </div>
    </div>
  );
};
