
import React from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../services/api';
import { Notification, NotificationType, User } from '../types';
import { Bell, Calendar, MessageSquare, Users } from 'lucide-react';
import { useNotifications } from '../hooks/useNotifications';
import { UserAvatar } from './UserAvatar';

interface NotificationPopoverProps {
  users: User[];
  onOpenIssue: (issueId: string) => void;
}

// Notifications are server state.
// They must be rendered directly from TanStack Query.
// Do NOT store or sync them in App.tsx.

export const NotificationPopover: React.FC<NotificationPopoverProps> = ({
  users,
  onOpenIssue
}) => {
  const queryClient = useQueryClient();

  // Use shared hook for notifications
  const { data: notifications = [] } = useNotifications();

  // Filter out undefined/null notifications and show only unread ones
  const unreadNotifications = notifications.filter(n => n && !n.isRead);

  // Mark notification as read mutation with optimistic update
  const markReadMutation = useMutation({
    mutationFn: (id: string) => api.notifications.markRead(id),

    onMutate: async (id) => {
      // Cancel any in-flight refetches
      await queryClient.cancelQueries({ queryKey: ['notifications'] });

      // Snapshot previous value
      const previous = queryClient.getQueryData(['notifications']);

      // Optimistically update
      queryClient.setQueryData(['notifications'], (old: Notification[] = []) =>
        old.map(n => n && n.id === id ? { ...n, isRead: true } : n)
      );

      return { previous };
    },

    onError: (err, variables, context) => {
      // Revert on error
      queryClient.setQueryData(['notifications'], context?.previous);
    },
  });

  const handleRead = (id: string) => {
    markReadMutation.mutate(id);
  };

  if (unreadNotifications.length === 0) {
    return (
      <div className="absolute top-12 right-0 w-[420px] bg-[#1A1B1F] border border-[#363840]/60 shadow-[0_32px_64px_-12px_rgba(0,0,0,0.5)] z-50 p-10 flex flex-col items-center justify-center animate-in fade-in zoom-in-95 duration-200">
        <Bell className="w-10 h-10 mb-4 text-gray-800" />
        <span className="text-[11px] font-bold text-gray-600 uppercase tracking-[0.2em]">Signal Clear</span>
        <p className="text-[10px] text-gray-700 mt-2 uppercase tracking-widest">No pending notifications</p>
      </div>
    );
  }

  return (
    <div className="absolute top-12 right-0 w-[420px] bg-[#1A1B1F] border border-[#363840]/60 shadow-[0_32px_64px_-12px_rgba(0,0,0,0.5)] z-50 flex flex-col max-h-[540px] animate-in fade-in zoom-in-95 duration-200 overflow-hidden">
      {/* Header */}
      <div className="px-6 h-14 border-b border-[#363840]/30 flex items-center justify-between shrink-0">
        <h3 className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">Notification Registry</h3>
        <span className="text-[10px] bg-[#25262B] px-1.5 py-0.5 rounded text-accent font-mono font-bold">{unreadNotifications.length}</span>
      </div>

      {/* Notifications List */}
      <div className="overflow-y-auto no-scrollbar flex-1 bg-[#1A1B1F]">
        {unreadNotifications.map(notification => {
          // Skip undefined notifications
          if (!notification || !notification.id) {
            console.warn('[NotificationPopover] Skipping invalid notification:', notification);
            return null;
          }

          const actor = users.find(u => u.id === notification.actorId);

          const handleClick = () => {
            handleRead(notification.id);
            // Only call onOpenIssue if the notification has an issueId
            if (notification.issueId) {
              onOpenIssue(notification.issueId);
            }
          };

          const getIcon = () => {
            if (notification.type === NotificationType.Mention) {
              return actor ? (
                <UserAvatar
                  name={actor.name || 'Unknown'}
                  avatarUrl={actor.avatarUrl}
                  size="lg"
                  className="rounded-full border border-[#363840] w-9 h-9"
                />
              ) : (
                <div className="w-9 h-9 rounded-full bg-accent/10 flex items-center justify-center border border-accent/20">
                  <MessageSquare className="w-4 h-4 text-accent" />
                </div>
              );
            } else if (notification.type === NotificationType.JoinRequest) {
              return (
                <div className="w-9 h-9 rounded-full bg-green-500/10 flex items-center justify-center border border-green-500/20">
                  <Users className="w-4 h-4 text-green-400" />
                </div>
              );
            } else {
              // DueDate notification
              return (
                <div className="w-9 h-9 rounded-full bg-orange-500/10 flex items-center justify-center border border-orange-500/20">
                  <Calendar className="w-4 h-4 text-orange-400" />
                </div>
              );
            }
          };

          return (
            <div
              key={notification.id}
              onClick={handleClick}
              className="px-6 py-5 border-b border-[#363840]/10 hover:bg-[#25262B]/30 cursor-pointer transition-colors relative group"
            >
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 pt-1">
                  {getIcon()}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="text-[13px] leading-relaxed">
                    {actor && (
                      <span className="font-bold text-gray-200">{actor.name}</span>
                    )}{' '}
                    <span className="text-gray-400 font-medium">{notification.message}</span>
                  </div>
                  <div className="text-[10px] text-gray-600 font-bold uppercase tracking-widest mt-2 flex items-center">
                    <span className="mr-2">Received</span>
                    <span className="font-mono">{new Date(notification.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>

                {!notification.isRead && (
                  <div className="flex-shrink-0 w-1.5 h-1.5 rounded-full bg-accent mt-2.5"></div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
