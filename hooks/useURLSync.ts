import { useEffect, useRef } from 'react';
import { useLocation, useNavigate } from '@tanstack/react-router';
import { useUIStore } from '../stores/uiStore';
import { useAuth } from '../contexts/AuthContext';
import { Team, Project, Issue, UserRole } from '../types';

export function useURLSync(teams: Team[], projects: Project[], issues: Issue[]) {
  const location = useLocation();
  const navigate = useNavigate();
  const ui = useUIStore();
  const { user: currentUser } = useAuth();

  // Use refs to prevent infinite loops
  const isNavigatingRef = useRef(false);
  const isSyncingStateRef = useRef(false);

  // Track the last synced state to prevent redundant updates
  const lastSyncedStateRef = useRef({
    teamId: ui.currentTeamId,
    projectId: ui.selectedProjectId,
    pathname: location.pathname
  });

  // URL -> State
  useEffect(() => {
    const path = location.pathname;

    // Skip for public routes
    if (path.startsWith('/public/')) return;

    // Skip if we initiated this navigation
    if (isNavigatingRef.current) {
      isNavigatingRef.current = false;
      lastSyncedStateRef.current.pathname = path;
      return;
    }

    // Skip if path hasn't changed
    if (path === lastSyncedStateRef.current.pathname) return;

    const teamMatch = path.match(/^\/team\/([^/]+)/);
    const projectMatch = path.match(/^\/team\/[^/]+\/project\/([^/]+)/);
    const issueMatch = path.match(/^\/team\/[^/]+\/project\/[^/]+\/issue\/([^/]+)/);

    let stateChanged = false;

    // Sync team
    if (teamMatch) {
      const team = teams.find(t => t.id === teamMatch[1]) ||
        teams.find(t => t.name.toLowerCase().replace(/\s+/g, '-') === teamMatch[1]);
      if (team && team.id !== ui.currentTeamId) {
        ui.setCurrentTeamId(team.id);
        isSyncingStateRef.current = true;
        lastSyncedStateRef.current.teamId = team.id;
        stateChanged = true;
      }
    }

    // Sync project
    if (projectMatch && ui.currentTeamId) {
      const project = projects.find(p =>
        p.teamId === ui.currentTeamId &&
        (p.id === projectMatch[1] || p.identifier.toLowerCase() === projectMatch[1].toLowerCase())
      );
      if (project && project.id !== ui.selectedProjectId) {
        ui.setSelectedProjectId(project.id);
        isSyncingStateRef.current = true;
        lastSyncedStateRef.current.projectId = project.id;
        stateChanged = true;
      } else if (!project && ui.selectedProjectId !== null && projects.length > 0) {
        ui.setSelectedProjectId(null);
        isSyncingStateRef.current = true;
        lastSyncedStateRef.current.projectId = null;
        stateChanged = true;
      }
    } else if (ui.selectedProjectId !== null && projects.length > 0 && !projectMatch) {
      ui.setSelectedProjectId(null);
      isSyncingStateRef.current = true;
      lastSyncedStateRef.current.projectId = null;
      stateChanged = true;
    }

    // Sync issue
    if (issueMatch && ui.selectedProjectId) {
      const issue = issues.find(i =>
        i.projectId === ui.selectedProjectId &&
        (i.id === issueMatch[1] || i.identifier.toLowerCase() === issueMatch[1].toLowerCase())
      );
      if (issue && (!ui.editingIssue || (ui.editingIssue as Issue).id !== issue.id)) {
        ui.setIssueModalOpen(true, issue);
        isSyncingStateRef.current = true;
      }
    }

    // Update last synced pathname
    lastSyncedStateRef.current.pathname = path;
  }, [location.pathname, teams, projects, issues]);

  // State -> URL
  useEffect(() => {
    // Skip for public routes or unauthenticated users
    if (!currentUser || location.pathname.startsWith('/public/')) return;

    // Skip if this was triggered by URL->State sync
    if (isSyncingStateRef.current) {
      isSyncingStateRef.current = false;
      return;
    }

    // Skip if we're already navigating
    if (isNavigatingRef.current) return;

    // Skip if no teams loaded yet
    if (teams.length === 0) return;

    // Skip if state hasn't actually changed
    if (
      ui.currentTeamId === lastSyncedStateRef.current.teamId &&
      ui.selectedProjectId === lastSyncedStateRef.current.projectId
    ) {
      return;
    }

    // Find the current team
    const team = teams.find(t => t.id === ui.currentTeamId);
    if (!team) {
      if (ui.currentTeamId) {
        ui.setCurrentTeamId('');
      }
      return;
    }

    const teamSlug = team.name.toLowerCase().replace(/\s+/g, '-');
    let newPath = `/team/${teamSlug}`;

    if (ui.selectedProjectId) {
      const project = projects.find(p => p.id === ui.selectedProjectId);
      if (project) {
        newPath += `/project/${project.identifier.toLowerCase()}`;
      } else if (projects.length === 0) {
        // Projects still loading, wait
        return;
      }
    }

    if (ui.editingIssue && ui.isIssueModalOpen && 'id' in ui.editingIssue) {
      const project = projects.find(p => p.id === ui.editingIssue!.projectId);
      if (project) {
        newPath = `/team/${teamSlug}/project/${project.identifier.toLowerCase()}/issue/${(ui.editingIssue as Issue).identifier.toLowerCase()}`;
      }
    }

    // Only navigate if URL actually needs to change
    if (window.location.pathname !== newPath) {
      isNavigatingRef.current = true;
      lastSyncedStateRef.current.teamId = ui.currentTeamId;
      lastSyncedStateRef.current.projectId = ui.selectedProjectId;

      navigate({ to: newPath, replace: true }).finally(() => {
        isNavigatingRef.current = false;
      });
    }
  }, [ui.currentTeamId, ui.selectedProjectId, ui.editingIssue, ui.isIssueModalOpen, currentUser, teams, projects]);
}
