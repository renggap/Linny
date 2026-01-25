import { useQuery } from '@tanstack/react-query';
import { api } from '../services/api';
import { Notification } from '../types';

export function useNotifications() {
  return useQuery<Notification[]>({
    queryKey: ['notifications'],
    queryFn: () => api.notifications.getAll(),
    staleTime: 1000 * 60, // 1 minute
  });
}

export function useUnreadNotificationCount() {
  const { data: notifications = [] } = useNotifications();
  // Filter out undefined/null notifications and count unread ones
  return notifications.filter(n => n && !n.isRead).length;
}
