
import React from 'react';
import { Notification, NotificationType, User } from '../types';
import { Bell, Calendar, MessageSquare } from 'lucide-react';

interface NotificationPopoverProps {
  notifications: Notification[];
  users: User[];
  onRead: (id: string) => void;
  onOpenIssue: (issueId: string) => void;
}

export const NotificationPopover: React.FC<NotificationPopoverProps> = ({
  notifications,
  users,
  onRead,
  onOpenIssue
}) => {
  if (notifications.length === 0) {
    return (
      <div className="absolute top-12 right-0 w-[420px] bg-[#1A1B1F] border border-[#363840]/60 rounded-xl shadow-[0_32px_64px_-12px_rgba(0,0,0,0.5)] z-50 p-10 flex flex-col items-center justify-center animate-in fade-in zoom-in-95 duration-200">
        <Bell className="w-10 h-10 mb-4 text-gray-800" />
        <span className="text-[11px] font-bold text-gray-600 uppercase tracking-[0.2em]">Signal Clear</span>
        <p className="text-[10px] text-gray-700 mt-2 uppercase tracking-widest">No pending notifications</p>
      </div>
    );
  }

  return (
    <div className="absolute top-12 right-0 w-[420px] bg-[#1A1B1F] border border-[#363840]/60 rounded-xl shadow-[0_32px_64px_-12px_rgba(0,0,0,0.5)] z-50 flex flex-col max-h-[540px] animate-in fade-in zoom-in-95 duration-200 overflow-hidden">
      {/* Header */}
      <div className="px-6 h-14 border-b border-[#363840]/30 flex items-center justify-between shrink-0">
        <h3 className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">Notification Registry</h3>
        <span className="text-[10px] bg-[#25262B] px-1.5 py-0.5 rounded text-[#5E6AD2] font-mono font-bold">{notifications.length}</span>
      </div>

      {/* Notifications List */}
      <div className="overflow-y-auto no-scrollbar flex-1 bg-[#1A1B1F]">
        {notifications.map(notification => {
          const actor = users.find(u => u.id === notification.actorId);

          return (
            <div
              key={notification.id}
              onClick={() => { onRead(notification.id); onOpenIssue(notification.issueId); }}
              className="px-6 py-5 border-b border-[#363840]/10 hover:bg-[#25262B]/30 cursor-pointer transition-colors relative group"
            >
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 pt-1">
                  {notification.type === NotificationType.Mention ? (
                    actor ? (
                      <img
                        src={actor.avatarUrl}
                        alt=""
                        className="w-9 h-9 rounded-full border border-[#363840]"
                      />
                    ) : (
                      <div className="w-9 h-9 rounded-full bg-[#5E6AD2]/10 flex items-center justify-center border border-[#5E6AD2]/20">
                        <MessageSquare className="w-4 h-4 text-[#5E6AD2]" />
                      </div>
                    )
                  ) : (
                    <div className="w-9 h-9 rounded-full bg-orange-500/10 flex items-center justify-center border border-orange-500/20">
                      <Calendar className="w-4 h-4 text-orange-400" />
                    </div>
                  )}
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
                  <div className="flex-shrink-0 w-1.5 h-1.5 rounded-full bg-[#5E6AD2] mt-2.5"></div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
