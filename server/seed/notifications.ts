/**
 * Notification data for seed script
 * Includes mention notifications and due date notifications
 */

import { generateId, toISOString, randomDateLastDays } from './helpers';
import { extractMentions } from './comments';

export type NotificationType = 'mention' | 'dueDate';

export interface NotificationSeed {
  id: string;
  user_id: string;
  type: NotificationType;
  message: string;
  issue_id: string;
  is_read: number; // 0 or 1 for SQLite
  actor_id: string | null;
  created_at: string;
}

/**
 * Generate mention notifications from comments
 */
export function generateMentionNotifications(
  comments: Array<{ id: string; content: string; issue_id: string; user_id: string; created_at: string }>,
  userIds: string[],
  userNameToId: Map<string, string>,
  issueIdentifiers: Map<string, string>
): NotificationSeed[] {
  const notifications: NotificationSeed[] = [];
  const threeDaysAgo = new Date();
  threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

  for (const comment of comments) {
    const mentions = extractMentions(comment.content);

    for (const mentionedName of mentions) {
      const mentionedUserId = userNameToId.get(mentionedName);

      // Skip if:
      // - User not found
      // - Self-mention (user mentions themselves)
      if (!mentionedUserId || mentionedUserId === comment.user_id) {
        continue;
      }

      const issueId = comment.issue_id;
      const issueIdentifier = issueIdentifiers.get(issueId) || 'Unknown';

      notifications.push({
        id: generateId('notif'),
        user_id: mentionedUserId,
        type: 'mention',
        message: `${comment.user_id} mentioned you in ${issueIdentifier}`,
        issue_id: issueId,
        is_read: new Date(comment.created_at) < threeDaysAgo ? 1 : 0, // Older mentions are read
        actor_id: comment.user_id,
        created_at: comment.created_at,
      });
    }
  }

  return notifications;
}

/**
 * Generate due date notifications
 * For issues due today assigned to each user
 */
export function generateDueDateNotifications(
  issues: Array<{ id: string; identifier: string; due_date: string | null; title: string }>,
  issueAssignees: Array<{ issue_id: string; user_id: string }>
): NotificationSeed[] {
  const notifications: NotificationSeed[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Build a map of issue_id to assignees
  const issueToAssignees = new Map<string, string[]>();
  for (const ia of issueAssignees) {
    if (!issueToAssignees.has(ia.issue_id)) {
      issueToAssignees.set(ia.issue_id, []);
    }
    issueToAssignees.get(ia.issue_id)!.push(ia.user_id);
  }

  // Find issues due today
  for (const issue of issues) {
    if (!issue.due_date) continue;

    const dueDate = new Date(issue.due_date);
    dueDate.setHours(0, 0, 0, 0);

    // Check if due date is today (within last 24 hours or next 24 hours)
    const daysDiff = Math.abs((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    if (daysDiff <= 1) { // Due today or yesterday
      const assignees = issueToAssignees.get(issue.id);
      if (assignees) {
        for (const assigneeId of assignees) {
          notifications.push({
            id: generateId('notif'),
            user_id: assigneeId,
            type: 'dueDate',
            message: `Issue ${issue.identifier} is due today`,
            issue_id: issue.id,
            is_read: Math.random() > 0.5 ? 0 : 1, // Random read status
            actor_id: null,
            created_at: toISOString(new Date()),
          });
        }
      }
    }
  }

  return notifications;
}

/**
 * Combine and limit notifications per user (5-15 per user)
 */
export function limitNotificationsPerUser(
  notifications: NotificationSeed[],
  minPerUser: number = 5,
  maxPerUser: number = 15
): NotificationSeed[] {
  const userNotificationCounts = new Map<string, number>();
  const result: NotificationSeed[] = [];

  // Sort by created_at desc (newest first)
  const sorted = [...notifications].sort((a, b) =>
    new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  for (const notif of sorted) {
    const currentCount = userNotificationCounts.get(notif.user_id) || 0;

    if (currentCount < maxPerUser) {
      result.push(notif);
      userNotificationCounts.set(notif.user_id, currentCount + 1);
    }
  }

  return result;
}
