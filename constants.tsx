
import { Issue, Priority, Project, Status, Team, User, UserRole, Comment, Notification, NotificationType } from './types';

export const MOCK_USERS: User[] = [
  { id: 'u1', name: 'Alex Rivera', email: 'alex@acme.com', avatarUrl: 'https://picsum.photos/32/32?random=1', password: 'password', role: UserRole.Administrator },
  { id: 'u2', name: 'Sarah Chen', email: 'sarah@acme.com', avatarUrl: 'https://picsum.photos/32/32?random=2', password: 'password', role: UserRole.Member },
  { id: 'u3', name: 'Jordan Smith', email: 'jordan@acme.com', avatarUrl: 'https://picsum.photos/32/32?random=3', password: 'password', role: UserRole.Guest },
];

export const MOCK_TEAMS: Team[] = [
  { id: 't1', name: 'Engineering', icon: 'E', members: ['u1', 'u2', 'u3'] },
  { id: 't2', name: 'Design', icon: 'D', members: ['u2'] },
];

export const MOCK_PROJECTS: Project[] = [
  { id: 'p1', name: 'Linear Clone', identifier: 'LIN', icon: '⚡', teamId: 't1', isPublic: true, publicSlug: 'linear-clone' },
  { id: 'p2', name: 'Mobile App', identifier: 'MOB', icon: '📱', teamId: 't1' },
  { id: 'p3', name: 'Q3 Roadmap', identifier: 'Q3R', icon: '🗺️', teamId: 't2' },
  { id: 'p4', name: 'Public Demo', identifier: 'PUB', icon: '🌐', teamId: 't1', isPublic: true, publicSlug: 'public-demo' },
];

const today = new Date();
const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1);
const nextWeek = new Date(today); nextWeek.setDate(today.getDate() + 7);
const twoWeeks = new Date(today); twoWeeks.setDate(today.getDate() + 14);

export const INITIAL_ISSUES: Issue[] = [
  {
    id: '1',
    identifier: 'LIN-101',
    title: 'Implement authentication flow',
    description: 'We need to support Google and GitHub OAuth. @Sarah Chen please review.',
    status: Status.InProgress,
    priority: Priority.High,
    assigneeIds: ['u1'],
    projectId: 'p1',
    startDate: today,
    dueDate: nextWeek,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: '2',
    identifier: 'LIN-102',
    title: 'Fix alignment on sidebar',
    description: 'The sidebar is off by 2px on Safari.',
    status: Status.Todo,
    priority: Priority.Medium,
    assigneeIds: ['u2'],
    projectId: 'p1',
    startDate: tomorrow,
    dueDate: new Date(new Date().setDate(today.getDate() + 3)),
    blockedBy: ['1'], // Blocked by auth flow
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: '3',
    identifier: 'Q3R-103',
    title: 'Design system updates',
    description: 'Update the color palette to match the new brand guidelines.',
    status: Status.Backlog,
    priority: Priority.Low,
    assigneeIds: [],
    projectId: 'p3',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: '4',
    identifier: 'MOB-104',
    title: 'Optimize API queries',
    description: 'Reduce response time by optimizing database queries.',
    status: Status.Done,
    priority: Priority.Urgent,
    assigneeIds: ['u3'],
    projectId: 'p2',
    startDate: new Date(new Date().setDate(today.getDate() - 5)),
    dueDate: today,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  // Subtask Example
  {
    id: '5',
    identifier: 'LIN-105',
    title: 'Setup OAuth Providers',
    description: 'Configure Google Cloud Console.',
    status: Status.InProgress,
    priority: Priority.High,
    assigneeIds: ['u1'],
    projectId: 'p1',
    parentId: '1', // Child of LIN-101
    startDate: today,
    dueDate: new Date(new Date().setDate(today.getDate() + 2)),
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: '6',
    identifier: 'LIN-106',
    title: 'Frontend Login Page',
    description: 'Build the React components.',
    status: Status.Todo,
    priority: Priority.High,
    assigneeIds: ['u2'],
    projectId: 'p1',
    parentId: '1', // Child of LIN-101
    startDate: new Date(new Date().setDate(today.getDate() + 2)),
    dueDate: new Date(new Date().setDate(today.getDate() + 5)),
    blockedBy: ['5'], // Blocked by Setup OAuth
    createdAt: new Date(),
    updatedAt: new Date(),
  }
];

export const MOCK_COMMENTS: Comment[] = [
  {
    id: 'c1',
    content: 'I can pick this up next sprint.',
    issueId: '1',
    userId: 'u2',
    createdAt: new Date(Date.now() - 86400000), // 1 day ago
  },
  {
    id: 'c2',
    content: 'Make sure to handle the redirect URI correctly for local dev.',
    issueId: '1',
    userId: 'u1',
    createdAt: new Date(Date.now() - 3600000), // 1 hour ago
  },
];

export const MOCK_NOTIFICATIONS: Notification[] = [
  {
    id: 'n1',
    userId: 'u1',
    type: NotificationType.Mention,
    message: 'mentioned you in a comment',
    issueId: '1',
    isRead: false,
    actorId: 'u2',
    createdAt: new Date(Date.now() - 3600000)
  }
];
