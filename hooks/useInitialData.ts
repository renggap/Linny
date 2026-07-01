import { useEffect } from 'react';
import { useLocation } from '@tanstack/react-router';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../contexts/AuthContext';
import { useUIStore } from '../stores/uiStore';
import { useTeams } from './useTeams';
import { api } from '../services/api';

export function useInitialData() {
  const { isAuthenticated, user: currentUser } = useAuth();
  const ui = useUIStore();
  const location = useLocation();
  const queryClient = useQueryClient();
  const { data: teams = [], isLoading } = useTeams();

  useEffect(() => {
    if (isAuthenticated && currentUser && teams.length > 0 && !ui.currentTeamId) {
      // Check if URL specifies a team first
      const teamMatch = location.pathname.match(/^\/team\/([^/]+)/);
      if (teamMatch) {
        const urlTeam = teams.find(t =>
          t.id === teamMatch[1] ||
          t.name.toLowerCase().replace(/\s+/g, '-') === teamMatch[1]
        );
        if (urlTeam) {
          ui.setCurrentTeamId(urlTeam.id);
          return;
        }
      }

      // Only set default team if URL doesn't specify one
      const userTeam = teams.find(team => (team.members || []).includes(currentUser.id));
      if (userTeam) {
        ui.setCurrentTeamId(userTeam.id);
      } else {
        // No team membership — create a default workspace. Surface errors
        // instead of silently stranding the user with no currentTeamId.
        api.teams.create(`${currentUser.name}'s Workspace`, currentUser.name.charAt(0).toUpperCase())
          .then(newTeam => {
            ui.setCurrentTeamId(newTeam.id);
            // Invalidate teams so the new team appears in the sidebar list.
            queryClient.invalidateQueries({ queryKey: ['teams'] });
          })
          .catch(error => {
            console.error('[useInitialData] Failed to create default workspace:', error);
          });
      }
    }
  }, [isAuthenticated, currentUser, teams, ui.currentTeamId, location.pathname]);

  return { isLoading };
}
