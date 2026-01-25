import { useQuery } from '@tanstack/react-query';
import { api } from '../services/api';
import { User } from '../types';

export function useUsers() {
  return useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const response = await api.users.getAll();
      return response as User[];
    }
  });
}

export function useUser(id: string | null) {
  return useQuery({
    queryKey: ['users', id],
    queryFn: async () => {
      if (!id) return null;
      const response = await api.users.getById(id);
      return response as User;
    },
    enabled: !!id
  });
}
