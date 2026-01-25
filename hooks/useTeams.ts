import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../services/api';
import { Team } from '../types';
import { useAuth } from '../contexts/AuthContext';

export function useTeams() {
  return useQuery({
    queryKey: ['teams'],
    queryFn: async () => {
      const response = await api.teams.getAll();
      return response as Team[];
    }
  });
}

export function useCreateTeam() {
  const queryClient = useQueryClient();
  const { user: currentUser } = useAuth();

  return useMutation({
    mutationFn: (data: { name: string; icon: string }) => api.teams.create(data.name, data.icon),
    onMutate: async (variables) => {
      // Cancel any in-flight refetches
      await queryClient.cancelQueries({ queryKey: ['teams'] });

      // Snapshot previous value
      const previousTeams = queryClient.getQueryData(['teams']) as Team[] | undefined;

      // Optimistically add the new team to the cache
      const tempId = `temp-${Date.now()}`;
      const optimisticTeam: Team = {
        id: tempId,
        name: variables.name,
        icon: variables.icon || variables.name.charAt(0).toUpperCase(),
        members: [currentUser?.id || ''] // Creator will be a member
      };

      queryClient.setQueryData(['teams'], (old: Team[] = []) => [...old, optimisticTeam]);

      // Return context with the temp ID
      return { previousTeams, tempId };
    },
    onSuccess: (newTeam, variables, context) => {
      // Replace the optimistic team with the actual server response
      queryClient.setQueryData(['teams'], (old: Team[] | undefined) => {
        if (!old) return [newTeam];
        return old.map(t => t.id === (context as any).tempId ? newTeam : t);
      });
    },
    onError: (error, variables, context) => {
      // Revert to previous value on error
      queryClient.setQueryData(['teams'], (context as any).previousTeams);
    }
  });
}
