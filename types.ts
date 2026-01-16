
export enum Status {
  Backlog = 'Backlog',
  Todo = 'Todo',
  InProgress = 'In Progress',
  InReview = 'In Review',
  Done = 'Done',
  Canceled = 'Canceled'
}

export enum Priority {
  NoPriority = 'No Priority',
  Urgent = 'Urgent',
  High = 'High',
  Medium = 'Medium',
  Low = 'Low'
}

export enum UserRole {
  Administrator = 'Administrator',
  TeamLead = 'Team Lead',
  Member = 'Member',
  Guest = 'Guest'
}

export interface User {
  id: string;
  name: string;
  email: string;
  avatarUrl: string;
  role: UserRole;
  createdAt?: Date;
}

export interface Team {
  id: string;
  name: string;
  icon: string;
  members: string[]; // User IDs
}

export interface ResourceLink {
  id: string;
  title: string;
  url: string;
}

export interface Project {
  id: string;
  name: string;
  identifier: string; // 3 Letter Key e.g., ENG
  icon: string;
  teamId: string;
  description?: string;
  isPublic?: boolean;
  publicSlug?: string; // URL-friendly slug for public access
  leadId?: string;
  startDate?: Date;
  targetDate?: Date; // "End Date" - using targetDate to match Linear terminology or just endDate
  links?: ResourceLink[];
}

export interface Issue {
  id: string;
  identifier: string; // e.g., LIN-101
  title: string;
  description: string;
  status: Status;
  priority: Priority;
  assigneeIds: string[];
  assignees?: User[]; // Populated from API
  projectId: string;

  // Timeline fields
  startDate?: Date;
  dueDate?: Date;

  // Hierarchy
  parentId?: string; // For subtasks

  createdAt: Date;
  updatedAt: Date;
}

/**
 * Partial issue data for pre-filling the create issue form.
 * Used when creating an issue from a specific context (e.g., from a board column).
 */
export type PartialIssue = Partial<Pick<Issue, 'status' | 'priority' | 'projectId'>>;

export interface Comment {
  id: string;
  content: string;
  issueId: string;
  userId: string;
  user?: User; // Populated from API
  createdAt: Date;
}

export enum NotificationType {
  Mention = 'mention',
  DueDate = 'dueDate'
}

export interface Notification {
  id: string;
  userId: string; // The person receiving the notification
  type: NotificationType;
  message: string;
  issueId: string;
  isRead: boolean;
  createdAt: Date;
  actorId?: string; // The person who triggered it (e.g. who tagged you)
  actor?: User; // Populated from API
}

export interface Activity {
  id: string;
  userId: string;
  type: 'issue_created' | 'status_change' | 'comment' | 'project_update' | 'issue_update';
  projectId?: string;
  issueId?: string;
  entityTitle?: string;
  description?: string;
  createdAt: Date;
}
