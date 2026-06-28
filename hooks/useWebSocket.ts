import { useEffect } from 'react';
import { websocketService } from '../services/websocket';
import { setupAllWebSocketSync, cleanupAllWebSocketSync } from '../services/websocketQuerySync';
import { useAuth } from '../contexts/AuthContext';
import { useUIStore } from '../stores/uiStore';

export function useWebSocket() {
  const { isAuthenticated, user: currentUser } = useAuth();
  const { isIssueModalOpen, editingIssue, selectedProjectId } = useUIStore();

  // Main WebSocket connection - connect to user notifications + join-requests when authenticated
  useEffect(() => {
    if (isAuthenticated && currentUser) {
      websocketService.subscribe(`user:${currentUser.id}`);
      websocketService.subscribe('join-requests');
      setupAllWebSocketSync();

      return () => {
        websocketService.unsubscribe(`user:${currentUser.id}`);
        websocketService.unsubscribe('join-requests');
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

  // Subscribe to issue-specific room when issue modal is open
  useEffect(() => {
    if (isIssueModalOpen && editingIssue && 'id' in editingIssue) {
      websocketService.subscribe(`issue:${editingIssue.id}`);
    }
    return () => {
      if (editingIssue && 'id' in editingIssue) {
        websocketService.unsubscribe(`issue:${editingIssue.id}`);
      }
    };
  }, [isIssueModalOpen, editingIssue]);
}
