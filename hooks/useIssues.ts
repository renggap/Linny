import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../services/api';
import { Issue, Status } from '../types';
import { useUIStore } from '../stores/uiStore';
import { issueKeys, activityKeys } from '../services/queryKeys';

/**
 * SCOPED ISSUES HOOK
 *
 * Uses workspace-scoped query keys to prevent data leaking across teams.
 * Query keys are namespaced by teamId: ['scope', teamId, 'issues', ...filters]
 *
 * When teamId changes, the previous team's issue data becomes unreachable
 * and is automatically garbage collected by TanStack Query.
 *
 * BACKWARDS COMPATIBLE: Accepts teamId in filters but uses store value internally
 */
export function useIssues(filters: {
  teamId?: string; // Backwards compatible - ignored, uses store value instead
  projectId?: string | null;
  status?: Status | null;
  assigneeId?: string | null;
  search?: string;
}) {
  // Get current teamId from UI store (always uses store value, not filter parameter)
  const currentTeamId = useUIStore((state) => state.currentTeamId);

  // Always include teamId in filters for scoping (from store, not filters)
  const scopedFilters = {
    teamId: currentTeamId,
    projectId: filters.projectId,
    status: filters.status,
    assigneeId: filters.assigneeId,
    search: filters.search,
  };

  return useQuery({
    // Use scoped query key
    queryKey: issueKeys.filtered(currentTeamId, scopedFilters),
    queryFn: async () => api.issues.getAll(scopedFilters),
    // Only enable query if we have a teamId
    enabled: !!currentTeamId,
    // Always fetch when switching teams (ignore stale cache)
    staleTime: 0, // Data is immediately stale, forcing refetch on team change
    gcTime: 1000 * 60 * 5, // Keep in cache for 5 minutes but don't use stale data
  });
}

/**
 * SCOPED SINGLE ISSUE HOOK
 *
 * Uses workspace-scoped query key for individual issue.
 */
export function useIssue(id: string | null) {
  const currentTeamId = useUIStore((state) => state.currentTeamId);

  return useQuery({
    queryKey: id ? issueKeys.detail(currentTeamId, id) : ['issues', null],
    queryFn: async () => {
      if (!id) return null;
      const response = await api.issues.getById(id);
      return response as Issue;
    },
    enabled: !!id && !!currentTeamId,
  });
}

/**
 * CREATE ISSUE MUTATION
 *
 * Uses scoped cache updates. The new issue will be added to the
 * current workspace's cache only.
 */
export function useCreateIssue() {
  const queryClient = useQueryClient();
  const currentTeamId = useUIStore((state) => state.currentTeamId);

  return useMutation({
    mutationFn: (data: any) => api.issues.create(data),
    onSuccess: (newIssue) => {
      console.log('[useCreateIssue] Issue created successfully:', newIssue);

      // Update only the current workspace's issue queries
      queryClient.setQueriesData(
        { queryKey: issueKeys.all(currentTeamId) },
        (oldData: any) => {
          if (!oldData) return oldData;
          if (!Array.isArray(oldData)) return oldData;
          // Add the new issue to the array
          return [...oldData, newIssue];
        }
      );

      // Refetch current workspace issues to ensure consistency
      queryClient.invalidateQueries({ queryKey: issueKeys.all(currentTeamId) });
      queryClient.invalidateQueries({ queryKey: activityKeys.all(currentTeamId) });
    }
  });
}

/**
 * UPDATE ISSUE MUTATION
 *
 * Uses scoped cache updates. Only the current workspace's cache is affected.
 */
export function useUpdateIssue() {
  const queryClient = useQueryClient();
  const currentTeamId = useUIStore((state) => state.currentTeamId);

  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: any }) => api.issues.update(id, updates),
    onSuccess: (data, variables) => {
      console.log('[useUpdateIssue] Issue updated successfully:', data);

      // Update only the current workspace's issue queries
      queryClient.setQueriesData(
        { queryKey: issueKeys.all(currentTeamId) },
        (oldData: any) => {
          if (!oldData) return oldData;
          if (!Array.isArray(oldData)) return oldData;
          // Update the issue in the array
          return oldData.map((issue: any) =>
            issue.id === data.id ? { ...issue, ...data } : issue
          );
        }
      );

      // Also set the specific issue query data for current workspace
      queryClient.setQueryData(issueKeys.detail(currentTeamId, data.id), data);

      // No refetch - we've already updated the cache directly
    }
  });
}

/**
 * UPDATE ISSUE STATUS MUTATION
 *
 * Uses scoped cache updates. Only the current workspace's cache is affected.
 */
export function useUpdateIssueStatus() {
  const queryClient = useQueryClient();
  const currentTeamId = useUIStore((state) => state.currentTeamId);

  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: Status }) => {
      console.log('[useUpdateIssueStatus] Updating issue status:', { id, status });
      return api.issues.updateStatus(id, status);
    },
    onSuccess: (data, variables) => {
      console.log('[useUpdateIssueStatus] Status updated successfully:', data);

      // Update only the current workspace's issue queries
      queryClient.setQueriesData(
        { queryKey: issueKeys.all(currentTeamId) },
        (oldData: any) => {
          if (!oldData) return oldData;
          if (!Array.isArray(oldData)) return oldData;
          // Update the issue in the array
          return oldData.map((issue: any) =>
            issue.id === data.id ? { ...issue, ...data } : issue
          );
        }
      );

      // Also set the specific issue query data for current workspace
      queryClient.setQueryData(issueKeys.detail(currentTeamId, data.id), data);

      console.log('[useUpdateIssueStatus] Cache updated, no refetch needed');
    },
    onError: (error) => {
      console.error('[useUpdateIssueStatus] Failed to update status:', error);
    }
  });
}

/**
 * CREATE SUBTASK MUTATION
 *
 * Uses scoped cache updates. Only the current workspace's cache is affected.
 */
export function useCreateSubtask() {
  const queryClient = useQueryClient();
  const currentTeamId = useUIStore((state) => state.currentTeamId);

  return useMutation({
    mutationFn: ({ parentId, title }: { parentId: string; title: string }) => api.issues.createSubtask(parentId, title),
    onSuccess: (newSubtask) => {
      console.log('[useCreateSubtask] Subtask created successfully:', newSubtask);

      // Update only the current workspace's issue queries
      queryClient.setQueriesData(
        { queryKey: issueKeys.all(currentTeamId) },
        (oldData: any) => {
          if (!oldData) return oldData;
          if (!Array.isArray(oldData)) return oldData;
          // Add the new subtask to the array
          return [...oldData, newSubtask];
        }
      );

      // Refetch current workspace issues to ensure consistency
      queryClient.invalidateQueries({ queryKey: issueKeys.all(currentTeamId) });
      queryClient.invalidateQueries({ queryKey: activityKeys.all(currentTeamId) });
    }
  });
}
