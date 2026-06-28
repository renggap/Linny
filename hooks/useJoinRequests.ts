import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../services/api';
import { JoinRequest } from '../types';

export function useJoinRequests() {
  return useQuery({
    queryKey: ['join-requests'],
    queryFn: async () => {
      console.log('[useJoinRequests] Fetching join requests from API...');
      const response = await api.joinRequests.getAll();
      console.log('[useJoinRequests] Response:', response);
      return response as JoinRequest[];
    },
    staleTime: 0, // Always consider data stale, refetch on every mount/window focus
    refetchOnMount: 'always', // Always refetch when component mounts
    refetchOnWindowFocus: true
  });
}

export function useMyJoinRequests() {
  return useQuery({
    queryKey: ['join-requests', 'my'],
    queryFn: async () => {
      const response = await api.joinRequests.getMyRequests();
      return response as JoinRequest[];
    }
  });
}

export function useCreateJoinRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (teamId: string) => api.joinRequests.createJoinRequest(teamId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['join-requests'] });
      queryClient.invalidateQueries({ queryKey: ['join-requests', 'my'] });
    }
  });
}

export function useApproveJoinRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (requestId: string) => api.joinRequests.approve(requestId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['join-requests'] });
      queryClient.invalidateQueries({ queryKey: ['teams'] });
      queryClient.invalidateQueries({ queryKey: ['users'] });
    }
  });
}

export function useRejectJoinRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (requestId: string) => api.joinRequests.reject(requestId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['join-requests'] });
    }
  });
}
