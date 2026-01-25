import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Comment, Notification } from '../types';

/**
 * Activity Feed is DERIVED server state.
 * It reads from TanStack Query.
 * It owns nothing.
 */

// Activity item shape (normalized)
export type ActivityItem = {
  id: string;
  type: 'comment' | 'notification';
  createdAt: Date;
  payload: Comment | Notification;
};

/**
 * Merge comments and notifications into a single activity feed.
 * Deterministic, pure function.
 */
function mergeAndSort(
  allComments: Comment[],
  allNotifications: Notification[]
): ActivityItem[] {
  const activities: ActivityItem[] = [];

  // Map comments to activity items
  for (const comment of allComments) {
    activities.push({
      id: `comment-${comment.id}`,
      type: 'comment',
      createdAt: new Date(comment.createdAt),
      payload: comment,
    });
  }

  // Map notifications to activity items
  for (const notification of allNotifications) {
    activities.push({
      id: `notification-${notification.id}`,
      type: 'notification',
      createdAt: new Date(notification.createdAt),
      payload: notification,
    });
  }

  // Sort by createdAt DESC (newest first)
  activities.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

  return activities;
}

/**
 * Hook that provides a derived activity feed from comments and notifications.
 *
 * This is READ-ONLY derived state. It reads from TanStack Query cache.
 * It does NOT fetch from backend. It does NOT store local state.
 *
 * The activity feed updates automatically when comments or notifications change
 * because it's derived from TanStack Query's reactivity system.
 *
 * This hook creates an 'activity' query that combines data from:
 * - All comment queries (comments for each issue)
 * - The notifications query
 */
export function useActivityFeed() {
  const queryClient = useQueryClient();

  return useQuery({
    queryKey: ['activity'],
    queryFn: () => {
      // Read from existing query caches
      const allCommentQueries = queryClient.getQueriesData({
        predicate: (query) => {
          const key = query.queryKey;
          // Match scoped comment queries: ['scope', teamId, 'comments', 'issue', issueId]
          return Array.isArray(key) && key.length >= 4 && key[0] === 'scope' && key[2] === 'comments';
        }
      });

      const notifications = queryClient.getQueryData<Notification[]>(['notifications']) ?? [];

      // Flatten all comment arrays from different issue queries
      const allComments: Comment[] = [];
      for (const [, commentData] of allCommentQueries) {
        if (Array.isArray(commentData)) {
          allComments.push(...commentData);
        }
      }

      return mergeAndSort(allComments, notifications);
    },
    // This query is derived only, not fetched from backend
    staleTime: 1000 * 60 * 5, // 5 minutes
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    // Disable automatic refetching - we handle refetching via invalidation
    enabled: true,
  });
}
