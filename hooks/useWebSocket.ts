import { useEffect } from 'react';
import { websocketService } from '../services/websocket';
import { setupAllWebSocketSync, cleanupAllWebSocketSync } from '../services/websocketQuerySync';
import { useAuth } from '../contexts/AuthContext';
import { useUIStore } from '../stores/uiStore';
import { isGlobalAdministrator } from '../lib/roleUtils';

export function useWebSocket() {
  const { isAuthenticated, user: currentUser } = useAuth();
  const { isIssueModalOpen, editingIssue, selectedProjectId } = useUIStore();

  // Main WebSocket connection - user notifications always; join-requests only for admins
  // (route broadcasts to a global room, so non-admins would leak other teams' applicant PII)
  useEffect(() => {
    if (isAuthenticated && currentUser) {
      websocketService.subscribe(`user:${currentUser.id}`);
      // Only global admins subscribe to the join-requests room — broadcasts are
      // unfiltered and would leak applicant PII across teams to non-admins.
      // Team leads fall back to refetch on view (TanStack Query).
      const canSeeJoinRequests = isGlobalAdministrator(currentUser);
      if (canSeeJoinRequests) {
        websocketService.subscribe('join-requests');
      }
      setupAllWebSocketSync();

      return () => {
        websocketService.unsubscribe(`user:${currentUser.id}`);
        if (canSeeJoinRequests) {
          websocketService.unsubscribe('join-requests');
        }
        cleanupAllWebSocketSync();
      };
    }
  }, [isAuthenticated, currentUser]);

  // Subscribe to current project room
  useEffect(() => {
    if (!selectedProjectId) return;
    websocketService.subscribe(`project:${selectedProjectId}`);
    return () => {
      websocketService.unsubscribe(`project:${selectedProjectId}`);
    };
  }, [selectedProjectId]);

  // Subscribe to issue-specific room when issue modal is open.
  // Capture the issueId at effect setup so the cleanup unsubscribes from
  // the SAME room we subscribed to (not whatever editingIssue points to at
  // cleanup time — React closures capture the render-time value).
  useEffect(() => {
    if (isIssueModalOpen && editingIssue && 'id' in editingIssue) {
      const issueId = editingIssue.id;
      websocketService.subscribe(`issue:${issueId}`);
      return () => {
        websocketService.unsubscribe(`issue:${issueId}`);
      };
    }
  }, [isIssueModalOpen, editingIssue]);
}
