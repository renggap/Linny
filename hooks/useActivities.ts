import { useQuery } from '@tanstack/react-query';
import { api } from '../services/api';
import { Activity } from '../types';
import { useUIStore } from '../stores/uiStore';
import { activityKeys } from '../services/queryKeys';

/**
 * SCOPED ACTIVITIES HOOK
 *
 * Uses workspace-scoped query keys to prevent data leaking across teams.
 * Query keys are namespaced by teamId: ['scope', teamId, 'activities']
 *
 * When teamId changes, the previous team's activity data becomes unreachable
 * and is automatically garbage collected by TanStack Query.
 *
 * BACKWARDS COMPATIBLE: Accepts projectId parameter for project-specific filtering
 */
export function useActivities(projectId?: string) {
  // Get current teamId from UI store
  const currentTeamId = useUIStore((state) => state.currentTeamId);

  // Determine which scoped key to use based on whether projectId is provided
  const queryKey = projectId
    ? activityKeys.project(currentTeamId, projectId)
    : activityKeys.all(currentTeamId);

  return useQuery({
    queryKey,
    queryFn: async () => {
      const response = await api.activities.getAll({
        teamId: currentTeamId, // Always pass teamId for workspace scoping
        projectId,
        limit: 100
      });
      return response;
    },
    // Only enable query if we have a teamId
    enabled: !!currentTeamId,
    staleTime: 0, // Always fetch fresh data on team change
    gcTime: 1000 * 60 * 5
  });
}
