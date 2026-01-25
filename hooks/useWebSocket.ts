import { useEffect } from 'react';
import { websocketService } from '../services/websocket';
import { setupAllWebSocketSync, cleanupAllWebSocketSync } from '../services/websocketQuerySync';
import { useAuth } from '../contexts/AuthContext';
import { useUIStore } from '../stores/uiStore';

export function useWebSocket() {
  const { isAuthenticated, user: currentUser } = useAuth();
  const { isIssueModalOpen, editingIssue } = useUIStore();

  // Main WebSocket connection - connect to user notifications when authenticated
  useEffect(() => {
    if (isAuthenticated && currentUser) {
      // Connect to user-specific notification channel
      websocketService.subscribe(`user:${currentUser.id}`);
      setupAllWebSocketSync();

      return () => {
        websocketService.unsubscribe(`user:${currentUser.id}`);
        cleanupAllWebSocketSync();
      };
    }
  }, [isAuthenticated, currentUser]);

  // Subscribe to issue-specific room when issue modal is open
  useEffect(() => {
    if (isIssueModalOpen && editingIssue && 'id' in editingIssue) {
      websocketService.subscribe(`issue:${editingIssue.id}`);
    } else {
      if (editingIssue && 'id' in editingIssue) {
        websocketService.unsubscribe(`issue:${editingIssue.id}`);
      }
    }

    return () => {
      if (editingIssue && 'id' in editingIssue) {
        websocketService.unsubscribe(`issue:${editingIssue.id}`);
      }
    };
  }, [isIssueModalOpen, editingIssue]);
}
