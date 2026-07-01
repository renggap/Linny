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
      await queryClient.cancelQueries({ queryKey: ['teams'] });
      const previousTeams = queryClient.getQueryData(['teams']) as Team[] | undefined;
      const tempId = `temp-${Date.now()}`;
      const optimisticTeam: Team = {
        id: tempId,
        name: variables.name,
        icon: variables.icon || variables.name.charAt(0).toUpperCase(),
        members: [currentUser?.id || '']
      };
      queryClient.setQueryData(['teams'], (old: Team[] = []) => [...old, optimisticTeam]);
      return { previousTeams, tempId };
    },
    onSuccess: (newTeam, _variables, context) => {
      // Replace the optimistic team with the actual server response.
      // If the temp team is missing (cache was cleared between onMutate and
      // onSuccess), just append the real team.
      queryClient.setQueryData(['teams'], (old: Team[] | undefined) => {
        const ctx = context as { tempId: string } | undefined;
        if (!old || !ctx) return [newTeam];
        const hasTemp = old.some(t => t.id === ctx.tempId);
        return hasTemp
          ? old.map(t => t.id === ctx.tempId ? newTeam : t)
          : [...old, newTeam];
      });
    },
    onError: (_error, _variables, context) => {
      const ctx = context as { previousTeams?: Team[] } | undefined;
      queryClient.setQueryData(['teams'], ctx?.previousTeams);
    },
    onSettled: () => {
      // Safety net: invalidate to refetch the real list. Catches the case
      // where the component unmounts between onMutate and onSuccess/onError,
      // which would orphan the temp team.
      queryClient.invalidateQueries({ queryKey: ['teams'] });
    }
  });
}
