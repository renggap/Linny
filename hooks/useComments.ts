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
    mutationFn: ({ content, issueId }: { content: string; issueId: string }) =>
      api.comments.create(content, issueId),

    onMutate: async (variables) => {
      await queryClient.cancelQueries({ queryKey: commentKeys.forIssue(currentTeamId, variables.issueId) });
      const previous = queryClient.getQueryData(commentKeys.forIssue(currentTeamId, variables.issueId));
      // Optimistic placeholder — will be replaced by server response in onSuccess.
      const tempComment = {
        id: `temp-${Date.now()}`,
        content: variables.content,
        issueId: variables.issueId,
        userId: '',
        createdAt: new Date().toISOString(),
      } as any;
      queryClient.setQueryData(
        commentKeys.forIssue(currentTeamId, variables.issueId),
        (old: any) => (Array.isArray(old) ? [...old, tempComment] : [tempComment])
      );
      return { previous };
    },

    onSuccess: (data, variables) => {
      // Replace the optimistic placeholder with the real server response.
      queryClient.setQueryData(
        commentKeys.forIssue(currentTeamId, variables.issueId),
        (old: any) => {
          if (!Array.isArray(old)) return [data.comment];
          // Drop temp comments then append the real one.
          return [...old.filter((c: any) => !c.id?.startsWith('temp-')), data.comment];
        }
      );
      queryClient.invalidateQueries({ queryKey: activityKeys.all(currentTeamId) });
    },

    onError: (error, variables, context: any) => {
      // Roll back optimistic comment.
      queryClient.setQueryData(
        commentKeys.forIssue(currentTeamId, variables.issueId),
        context?.previous
      );
    }
  });
}
