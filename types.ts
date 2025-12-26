
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
  Admin = 'Admin',
  Member = 'Member',
  Viewer = 'Viewer'
}

export interface User {
  id: string;
  name: string;
  email: string;
  password?: string; // In real app, hash this.
  avatarUrl: string;
  role: UserRole;
}

export interface Team {
  id: string;
  name: string;
  icon: string;
  members: string[]; // User IDs
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
}

export interface Issue {
  id: string;
  identifier: string; // e.g., LIN-101
  title: string;
  description: string;
  status: Status;
  priority: Priority;
  assigneeId?: string;
  projectId: string;

  // Timeline fields
  startDate?: Date;
  dueDate?: Date;

  // Hierarchy & Dependencies
  parentId?: string; // For subtasks
  blockedBy?: string[]; // Array of Issue IDs blocking this one

  createdAt: Date;
  updatedAt: Date;
}

export interface Comment {
  id: string;
  content: string;
  issueId: string;
  userId: string;
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
}
