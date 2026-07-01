import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../services/api';
import { Project } from '../types';
import { useUIStore } from '../stores/uiStore';
import { projectKeys, activityKeys } from '../services/queryKeys';

/**
 * SCOPED PROJECTS HOOK
 *
 * Uses workspace-scoped query keys to prevent data leaking across teams.
 * Query keys are namespaced by teamId: ['scope', teamId, 'projects']
 *
 * When teamId changes, the previous team's project data becomes unreachable
 * and is automatically garbage collected by TanStack Query.
 *
 * BACKWARDS COMPATIBLE: Accepts teamId parameter but uses store value internally
 */
export function useProjects() {
  // Get current teamId from UI store (uses store value, not parameter)
  const currentTeamId = useUIStore((state) => state.currentTeamId);

  return useQuery({
    // Use scoped query key
    queryKey: projectKeys.all(currentTeamId),
    queryFn: async () => {
      const response = await api.projects.getAll({ teamId: currentTeamId });
      return response as Project[];
    },
    // Only enable query if we have a teamId
    enabled: !!currentTeamId
  });
}

/**
 * SCOPED PROJECTS WITH LINKS HOOK
 *
 * Fetches projects with their associated links for the current workspace.
 *
 * Note: The backend getAll endpoint now includes links directly,
 * so this hook is equivalent to useProjects but with a separate query key
 * for more granular cache invalidation when links change.
 */
export function useProjectsWithLinks() {
  const currentTeamId = useUIStore((state) => state.currentTeamId);

  return useQuery({
    // Use scoped query key with links flag
    queryKey: ['scope', currentTeamId, 'projects', 'with-links'],
    queryFn: async () => {
      const response = await api.projects.getAll({ teamId: currentTeamId });
      return response as Project[];
    },
    enabled: !!currentTeamId
  });
}

/**
 * SCOPED SINGLE PROJECT HOOK
 *
 * Uses workspace-scoped query key for individual project.
 */
export function useProject(id: string | null) {
  const currentTeamId = useUIStore((state) => state.currentTeamId);

  return useQuery({
    queryKey: id ? projectKeys.detail(currentTeamId, id) : ['projects', null],
    queryFn: async () => {
      if (!id) return null;
      const response = await api.projects.getByIdWithLinks(id);
      return response as Project;
    },
    enabled: !!id && !!currentTeamId
  });
}

/**
 * CREATE PROJECT MUTATION
 */
export function useCreateProject() {
  const queryClient = useQueryClient();
  const currentTeamId = useUIStore((state) => state.currentTeamId);

  return useMutation({
    mutationFn: (data: any) => api.projects.create(data),
    onSuccess: () => {
      // Single prefix-match invalidation covers both 'projects' and
      // 'projects/with-links' query keys.
      queryClient.invalidateQueries({ queryKey: ['scope', currentTeamId, 'projects'] });
      queryClient.invalidateQueries({ queryKey: activityKeys.all(currentTeamId) });
    }
  });
}

/**
 * UPDATE PROJECT MUTATION
 */
export function useUpdateProject() {
  const queryClient = useQueryClient();
  const currentTeamId = useUIStore((state) => state.currentTeamId);

  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: any }) => api.projects.update(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scope', currentTeamId, 'projects'] });
      queryClient.invalidateQueries({ queryKey: activityKeys.all(currentTeamId) });
    }
  });
}

/**
 * DELETE PROJECT MUTATION
 */
export function useDeleteProject() {
  const queryClient = useQueryClient();
  const currentTeamId = useUIStore((state) => state.currentTeamId);

  return useMutation({
    mutationFn: (id: string) => api.projects.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scope', currentTeamId, 'projects'] });
      queryClient.invalidateQueries({ queryKey: activityKeys.all(currentTeamId) });
    }
  });
}

/**
 * ADD PROJECT LINK MUTATION
 */
export function useAddProjectLink() {
  const queryClient = useQueryClient();
  const currentTeamId = useUIStore((state) => state.currentTeamId);

  return useMutation({
    mutationFn: ({ projectId, title, url }: { projectId: string; title: string; url: string }) =>
      api.projects.addLink(projectId, title, url),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['scope', currentTeamId, 'projects'] });
      queryClient.invalidateQueries({ queryKey: projectKeys.detail(currentTeamId, variables.projectId) });
    }
  });
}

/**
 * DELETE PROJECT LINK MUTATION
 */
export function useDeleteProjectLink() {
  const queryClient = useQueryClient();
  const currentTeamId = useUIStore((state) => state.currentTeamId);

  return useMutation({
    mutationFn: ({ projectId, linkId }: { projectId: string; linkId: string }) =>
      api.projects.deleteLink(projectId, linkId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['scope', currentTeamId, 'projects'] });
      queryClient.invalidateQueries({ queryKey: projectKeys.detail(currentTeamId, variables.projectId) });
    }
  });
}
