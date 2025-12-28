
import React from 'react';
import { Notification, NotificationType, User } from '../types';
import { Bell, Calendar, MessageSquare, CheckCircle2 } from 'lucide-react';

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
         <div className="absolute md:top-12 top-20 right-0 md:w-80 w-full bg-[#25262B] border border-[#363840] rounded-lg shadow-xl z-50 p-4 flex flex-col items-center justify-center text-gray-500 animate-in fade-in zoom-in-95 duration-200">
            <Bell className="w-8 h-8 mb-2 opacity-50" />
            <span className="text-sm">No new notifications</span>
         </div>
      );
   }

   return (
      <div className="absolute md:top-12 top-20 right-0 md:w-80 w-[calc(100vw-1rem)] max-w-full bg-[#25262B] border border-[#363840] rounded-lg shadow-xl z-50 animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[400px]">
         <div className="px-4 py-3 border-b border-[#363840] text-xs font-semibold text-gray-400 uppercase tracking-wide flex justify-between items-center">
            <span>Notifications</span>
         </div>
         <div className="overflow-y-auto flex-1">
            {notifications.map(notification => {
               const actor = users.find(u => u.id === notification.actorId);

               return (
                  <div
                     key={notification.id}
                     onClick={() => { onRead(notification.id); onOpenIssue(notification.issueId); }}
                     className="px-4 py-3 border-b border-[#363840] hover:bg-[#2E3036] cursor-pointer transition-colors relative group"
                  >
                     <div className="flex items-start space-x-3">
                        <div className="pt-0.5">
                           {notification.type === NotificationType.Mention ? (
                              actor ? (
                                 <img src={actor.avatarUrl} alt={actor.name} className="w-8 h-8 rounded-full border border-[#363840]" />
                              ) : (
                                 <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400">
                                    <MessageSquare className="w-4 h-4" />
                                 </div>
                              )
                           ) : (
                              <div className="w-8 h-8 rounded-full bg-orange-500/20 flex items-center justify-center text-orange-400">
                                 <Calendar className="w-4 h-4" />
                              </div>
                           )}
                        </div>
                        <div className="flex-1 min-w-0">
                           <div className="text-sm text-gray-200 leading-relaxed">
                              {actor && <span className="font-semibold">{actor.name} </span>}
                              {notification.message}
                           </div>
                           <div className="text-xs text-gray-500 mt-1">
                              {new Date(notification.createdAt).toLocaleDateString()}
                           </div>
                        </div>
                        {!notification.isRead && (
                           <div className="w-2 h-2 rounded-full bg-blue-500 absolute top-4 right-4"></div>
                        )}
                     </div>
                  </div>
               );
            })}
         </div>
      </div>
   );
};
