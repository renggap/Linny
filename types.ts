
export enum Status {
  Backlog = 'Backlog',
  Todo = 'Todo',
  InProgress = 'InProgress',
  InReview = 'InReview',
  Done = 'Done',
  Canceled = 'Canceled'
}

export enum Priority {
  NoPriority = 'NoPriority',
  Urgent = 'Urgent',
  High = 'High',
  Medium = 'Medium',
  Low = 'Low'
}

export enum UserRole {
  Administrator = 'Administrator',
  TeamLead = 'TeamLead',
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
  isStealth?: boolean;
  members: string[]; // User IDs
  membersWithRoles?: TeamMemberWithRole[]; // Team-specific roles
}

export interface TeamMemberWithRole {
  id: string; // User ID
  role: UserRole;
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

export interface IssueFilters {
  teamId?: string;
  projectId?: string | null;
  status?: Status | null;
  assigneeId?: string | null;
  search?: string;
}

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
  DueDate = 'dueDate',
  JoinRequest = 'joinRequest'
}

export interface Notification {
  id: string;
  userId: string; // The person receiving the notification
  type: NotificationType;
  message: string;
  issueId?: string; // Optional - not all notifications have an associated issue
  isRead: boolean;
  createdAt: Date;
  actorId?: string; // The person who triggered it (e.g. who tagged you)
  actor?: User; // Populated from API
}

export interface Activity {
  id: string;
  userId: string;
  type: 'issue_created' | 'status_change' | 'comment' | 'project_update' | 'issue_update' | 'issue_deleted';
  projectId?: string;
  issueId?: string;
  entityTitle?: string;
  description?: string;
  createdAt: Date;
}

export type JoinRequestStatus = 'pending' | 'approved' | 'rejected';

export interface JoinRequest {
  id: string;
  teamId: string;
  userId: string;
  status: JoinRequestStatus;
  createdAt: Date;
  updatedAt: Date;
  team?: Team;
  user?: User;
}
