/**
 * Activity Feed Component
 *
 * SERVER STATE RULE:
 * Activity Feed is derived state.
 * Do NOT store, sync, or mutate activity manually.
 */

import React from 'react';
import { MessageSquare, Bell } from 'lucide-react';
import { User, Comment, Notification } from '../types';
import { useActivityFeed } from '../services/useActivityFeed';
import { useAuth } from '../contexts/AuthContext';
import { cn } from '../lib/utils';
import { renderMentionsWithBadges } from '../services/mentionUtils';

interface ActivityFeedProps {
  users: User[];
}

/**
 * ActivityFeed displays a combined feed of comments and notifications.
 *
 * This component is a pure rendering component that:
 * - Reads from TanStack Query via useActivityFeed hook
 * - Has no local state
 * - Has no effects
 * - Receives minimal props (only users for rendering user data)
 *
 * The feed updates automatically when comments or notifications change
 * because it's derived from TanStack Query cache.
 */
export const ActivityFeed: React.FC<ActivityFeedProps> = ({ users }) => {
  const { user: currentUser } = useAuth();
  // Activity feed is derived from TanStack Query cache
  const { data: activities = [] } = useActivityFeed();

  // Limit to recent activities (last 20)
  const recentActivities = activities.slice(0, 20);

  if (recentActivities.length === 0) {
    return (
      <div className="p-6 text-center">
        <div className="inline-flex flex-col items-center justify-center w-12 h-12 rounded-full bg-[#1A1C23] border border-[#2C2D35] mb-4">
          <Bell className="w-5 h-5 text-[#5E6068]" />
        </div>
        <p className="text-[13px] text-[#5E6068] font-medium">No recent activity</p>
        <p className="text-[11px] text-[#3A3C46] mt-1">Activity will appear here as you interact</p>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {recentActivities.map((activity, index) => {
        const actor = users.find(u => u.id === (activity.payload as any).userId || (activity.payload as any).actorId);

        if (activity.type === 'comment') {
          const comment = activity.payload as Comment;
          return (
            <div
              key={activity.id}
              className={cn(
                "flex items-start gap-3 p-3 rounded-lg hover:bg-[#1A1C23]/30 transition-colors group",
                index === recentActivities.length - 1 ? "" : "border-b border-[#22242A]/30"
              )}
            >
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center border border-accent/20">
                <MessageSquare className="w-3.5 h-3.5 text-accent" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  {actor && (
                    <span className="text-[12px] font-semibold text-[#E8E8E8]">{actor.name}</span>
                  )}
                  <span className="text-[10px] text-[#5E6068] uppercase tracking-wider">commented</span>
                  <span className="text-[9px] text-[#3A3C46]">•</span>
                  <span className="text-[9px] text-[#3A3C46]">
                    {new Date(activity.createdAt).toLocaleDateString()} {new Date(activity.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <p className="text-[12px] text-[#8A8F98] line-clamp-2">
                  {renderMentionsWithBadges(comment.content, users)}
                </p>
              </div>
            </div>
          );
        }

        // Notification type
        const notification = activity.payload as Notification;
        return (
          <div
            key={activity.id}
            className={cn(
              "flex items-start gap-3 p-3 rounded-lg hover:bg-[#1A1C23]/30 transition-colors group",
              index === recentActivities.length - 1 ? "" : "border-b border-[#22242A]/30"
            )}
          >
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-orange-500/10 flex items-center justify-center border border-orange-500/20">
              <Bell className="w-3.5 h-3.5 text-orange-400" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                {/* Show "Your" for current user's notifications, or actor name for others */}
                <span className="text-[12px] font-semibold text-[#E8E8E8]">
                  {notification.userId === currentUser?.id ? 'Your' : actor?.name || 'Someone'}
                </span>
                <span className="text-[10px] text-[#5E6068] uppercase tracking-wider">notification</span>
                <span className="text-[9px] text-[#3A3C46]">•</span>
                <span className="text-[9px] text-[#3A3C46]">
                  {new Date(activity.createdAt).toLocaleDateString()} {new Date(activity.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              <p className="text-[12px] text-[#8A8F98] line-clamp-2">{notification.message}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
};
