// WebSocket handlers may ONLY patch TanStack Query cache.
// They must not update React state or UI directly.

import { queryClient } from './queryClient';
import { websocketService } from './websocket';
import { useUIStore } from '../stores/uiStore';
import { Comment, Notification, Issue, JoinRequest } from '../types';
import { issueKeys, commentKeys, isScopeKey } from './queryKeys';

/**
 * WebSocket to TanStack Query Cache Integration (SCOPED)
 *
 * This module bridges WebSocket events to TanStack Query cache updates,
 * enabling real-time sync without manual refetching.
 *
 * IMPORTANT: Scope Validation
 * - WebSocket events ONLY update cache if they match the current workspace scope
 * - When teamId changes, old scope data becomes unreachable and is ignored
 * - This prevents data from other workspaces from leaking into the current view
 *
 * Event handlers check if the query key matches the current teamId before updating.
 */

interface CommentUpdatedEvent {
    issueId: string;
    comment: Comment;
    teamId?: string; // Team context for the issue
}

interface NotificationCreatedEvent {
    notification: Notification;
}

interface IssueUpdatedEvent {
    issueId: string;
    issue: Issue;
    teamId?: string; // Team context for the issue
}

interface JoinRequestCreatedEvent {
    joinRequest: JoinRequest;
}

interface JoinRequestUpdatedEvent {
    joinRequestId: string;
    status: 'pending' | 'approved' | 'rejected';
}

/**
 * Get the current teamId from UI store
 * Used to check if WebSocket events should update the cache
 */
function getCurrentTeamId(): string {
    // Note: We need to access the store state directly
    // This is called from WebSocket handlers, not React components
    const state = useUIStore.getState();
    return state.currentTeamId;
}

/**
 * Check if an issue update belongs to the current workspace
 */
function shouldUpdateIssueCache(issueTeamId: string | undefined): boolean {
    const currentTeamId = getCurrentTeamId();
    if (!currentTeamId) return false;
    if (!issueTeamId) return true; // Backwards compatibility if teamId not in event
    return issueTeamId === currentTeamId;
}

/**
 * Set up notification WebSocket sync to TanStack Query cache.
 * Notifications are global (per-user), not scoped to workspace.
 */
export function setupNotificationWebSocketSync() {
    websocketService.on('notification.created', (data: NotificationCreatedEvent) => {
        console.log('[websocketQuerySync] Received notification.created event:', data);
        const { notification } = data;

        // Validate notification data
        if (!notification || !notification.id) {
            console.error('[websocketQuerySync] Invalid notification data:', notification);
            return;
        }

        // Notifications are global, not scoped
        queryClient.setQueryData(['notifications'], (old: Notification[] = []) => {
            const validOld = old.filter(n => n && n.id); // Filter out undefined/null entries
            if (validOld.some(n => n.id === notification.id)) {
                console.log('[websocketQuerySync] Notification already exists, skipping');
                return old;
            }

            console.log('[websocketQuerySync] Adding new notification to cache');
            return [notification, ...old];
        });

        // Refetch activity query
        queryClient.refetchQueries({ queryKey: ['activity'] });
    });

    console.log('[websocketQuerySync] Notification WebSocket sync enabled');
}

/**
 * Clean up notification WebSocket sync handlers.
 */
export function cleanupNotificationWebSocketSync() {
    websocketService.off('notification.created');
    console.log('[websocketQuerySync] Notification WebSocket sync disabled');
}

/**
 * Set up comment WebSocket sync to TanStack Query cache.
 * Only updates comments for issues in the current workspace.
 */
export function setupCommentWebSocketSync() {
    websocketService.on('comment_updated', (data: CommentUpdatedEvent) => {
        console.log('[websocketQuerySync] Received comment_updated event:', data);
        const { issueId, comment, teamId } = data;

        // Scope check: Only update if this comment belongs to current workspace
        if (!shouldUpdateIssueCache(teamId)) {
            console.log('[websocketQuerySync] Comment belongs to different workspace, skipping');
            return;
        }

        const currentTeamId = getCurrentTeamId();

        // Update scoped comment cache
        queryClient.setQueryData(commentKeys.forIssue(currentTeamId, issueId), (old: Comment[] = []) => {
            if (old.some(c => c.id === comment.id)) {
                console.log('[websocketQuerySync] Comment already exists, replacing');
                return old.map(c => c.id === comment.id ? comment : c);
            }

            console.log('[websocketQuerySync] Adding new comment to cache');
            return [...old, comment];
        });

        // Refetch activity query
        queryClient.refetchQueries({ queryKey: ['activity'] });
    });

    console.log('[websocketQuerySync] Comment WebSocket sync enabled (scoped)');
}

/**
 * Clean up comment WebSocket sync handlers.
 */
export function cleanupCommentWebSocketSync() {
    websocketService.off('comment_updated');
    console.log('[websocketQuerySync] Comment WebSocket sync disabled');
}

/**
 * Set up issue WebSocket sync to TanStack Query cache.
 * Only updates issues that belong to the current workspace.
 */
export function setupIssueWebSocketSync() {
    websocketService.on('issue_updated', (data: IssueUpdatedEvent) => {
        console.log('[websocketQuerySync] Received issue_updated event:', data);
        const { issueId, issue, teamId } = data;

        // Defensive: drop malformed events rather than corrupt cache
        if (!issue || !issue.id || issue.id !== issueId) {
            console.warn('[websocketQuerySync] Malformed issue_updated event, ignoring:', data);
            return;
        }

        // Scope check: Only update if this issue belongs to current workspace
        if (!shouldUpdateIssueCache(teamId)) {
            console.log('[websocketQuerySync] Issue belongs to different workspace, skipping');
            return;
        }

        const currentTeamId = getCurrentTeamId();

        // Merge partial issue updates into existing cache entries instead of replacing.
        // This protects against any future partial-payload broadcast that would
        // otherwise blank out fields not present in the patch.
        queryClient.setQueriesData(
            { queryKey: issueKeys.all(currentTeamId) },
            (old: Issue[] = []) => old.map(i => i.id === issueId ? { ...i, ...issue } : i)
        );

        // Detail cache: merge if existing entry, else set fresh
        queryClient.setQueryData(issueKeys.detail(currentTeamId, issueId), (old: Issue | undefined) =>
            old ? { ...old, ...issue } : issue
        );

        // Refetch activity feed (Task 11 will fix the query key)
        queryClient.refetchQueries({ queryKey: ['activity'] });

        console.log('[websocketQuerySync] Issue data updated in cache (scoped)');
    });

    console.log('[websocketQuerySync] Issue WebSocket sync enabled (scoped)');
}

/**
 * Clean up issue WebSocket sync handlers.
 */
export function cleanupIssueWebSocketSync() {
    websocketService.off('issue_updated');
    console.log('[websocketQuerySync] Issue WebSocket sync disabled');
}

/**
 * Set up join request WebSocket sync to TanStack Query cache.
 * Join requests are not scoped to a specific workspace.
 */
export function setupJoinRequestWebSocketSync() {
    websocketService.on('join_request.created', (data: JoinRequestCreatedEvent) => {
        console.log('[websocketQuerySync] Received join_request.created event:', data);
        const { joinRequest } = data;

        queryClient.setQueryData(['join-requests'], (old: JoinRequest[] = []) => {
            if (old.some(r => r.id === joinRequest.id)) {
                console.log('[websocketQuerySync] Join request already exists, skipping');
                return old;
            }
            console.log('[websocketQuerySync] Adding new join request to cache');
            return [joinRequest, ...old];
        });

        queryClient.setQueryData(['join-requests', 'my'], (old: JoinRequest[] = []) => {
            if (old.some(r => r.id === joinRequest.id)) {
                return old;
            }
            return [joinRequest, ...old];
        });
    });

    websocketService.on('join_request.updated', (data: JoinRequestUpdatedEvent) => {
        console.log('[websocketQuerySync] Received join_request.updated event:', data);
        const { joinRequestId, status } = data;

        queryClient.setQueryData(['join-requests'], (old: JoinRequest[] = []) => {
            return old.map(r => r.id === joinRequestId ? { ...r, status } : r);
        });

        queryClient.setQueryData(['join-requests', 'my'], (old: JoinRequest[] = []) => {
            return old.map(r => r.id === joinRequestId ? { ...r, status } : r);
        });

        if (status === 'approved') {
            queryClient.refetchQueries({ queryKey: ['teams'] });
        }
    });

    console.log('[websocketQuerySync] Join request WebSocket sync enabled');
}

/**
 * Clean up join request WebSocket sync handlers.
 */
export function cleanupJoinRequestWebSocketSync() {
    websocketService.off('join_request.created');
    websocketService.off('join_request.updated');
    console.log('[websocketQuerySync] Join request WebSocket sync disabled');
}

/**
 * Set up all WebSocket sync handlers.
 */
export function setupAllWebSocketSync() {
    setupCommentWebSocketSync();
    setupNotificationWebSocketSync();
    setupIssueWebSocketSync();
    setupJoinRequestWebSocketSync();
}

/**
 * Clean up all WebSocket sync handlers.
 */
export function cleanupAllWebSocketSync() {
    cleanupCommentWebSocketSync();
    cleanupNotificationWebSocketSync();
    cleanupIssueWebSocketSync();
    cleanupJoinRequestWebSocketSync();
}
