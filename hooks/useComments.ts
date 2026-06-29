import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../services/api';
import { useUIStore } from '../stores/uiStore';
import { commentKeys, activityKeys } from '../services/queryKeys';

/**
 * SCOPED COMMENTS HOOK
 *
 * Uses workspace-scoped query keys to prevent data leaking across teams.
 * Query keys are namespaced by teamId: ['scope', teamId, 'comments', 'issue', issueId]
 *
 * When teamId changes, the previous team's comment data becomes unreachable
 * and is automatically garbage collected by TanStack Query.
 */
export function useComments(issueId: string | null) {
  // Get current teamId from UI store
  const currentTeamId = useUIStore((state) => state.currentTeamId);

  return useQuery({
    // Use scoped query key for comments
    queryKey: issueId ? commentKeys.forIssue(currentTeamId, issueId) : ['comments', null],
    queryFn: async () => {
      if (!issueId) return [];
      const response = await api.comments.getByIssue(issueId);
      return response;
    },
    enabled: !!issueId && !!currentTeamId
  });
}

/**
 * CREATE COMMENT MUTATION
 *
 * Uses scoped cache updates. The new comment will be added to the
 * current workspace's cache only.
 */
export function useCreateComment() {
  const queryClient = useQueryClient();
  const currentTeamId = useUIStore((state) => state.currentTeamId);

  return useMutation({
    mutationFn: ({ content, issueId }: { content: string; issueId: string }) => {
      console.log('[useCreateComment] mutationFn start', { issueId, contentLength: content.length, currentTeamId });
      return api.comments.create(content, issueId);
    },
    onSuccess: (data, variables) => {
      console.log('[useCreateComment] Comment created successfully:', data);
      console.log('[useCreateComment] cache key being updated:', commentKeys.forIssue(currentTeamId, variables.issueId));

      // Add the new comment to the scoped comments query cache
      queryClient.setQueriesData(
        { queryKey: commentKeys.forIssue(currentTeamId, variables.issueId) },
        (oldData: any) => {
          console.log('[useCreateComment] setQueriesData callback', { hasOldData: !!oldData, oldCount: Array.isArray(oldData) ? oldData.length : 'n/a' });
          if (!oldData) return [data.comment];
          if (!Array.isArray(oldData)) return oldData;
          // Add the new comment to the array
          return [...oldData, data.comment];
        }
      );

      // Refetch to ensure consistency
      queryClient.refetchQueries({ queryKey: commentKeys.forIssue(currentTeamId, variables.issueId) })
        .then(() => {
          const updated = queryClient.getQueryData(commentKeys.forIssue(currentTeamId, variables.issueId));
          console.log('[useCreateComment] refetch done, current cache count:', Array.isArray(updated) ? updated.length : 'n/a');
        });

      // Invalidate scoped activity queries
      queryClient.invalidateQueries({ queryKey: activityKeys.all(currentTeamId) });
    },
    onError: (error, variables) => {
      console.error('[useCreateComment] Mutation failed:', error, { issueId: variables.issueId, currentTeamId });
    }
  });
}
