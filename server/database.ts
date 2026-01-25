/**
 * Neo Linear Database Manager
 *
 * Refactored to use Prisma ORM with PostgreSQL instead of SQLite/sql.js.
 *
 * This module provides a high-level API for database operations that wraps
 * Prisma Client and maintains backward compatibility with existing code.
 */

import { PrismaClient } from '@prisma/client';
import {
  User, Status, Priority, UserRole
} from '@prisma/client';

// Types matching the frontend types (without password)
export interface DbUser {
  id: string;
  name: string;
  email: string;
  password_hash: string;
  avatar_url: string;
  role: string;
  email_verified: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface DbTeam {
  id: string;
  name: string;
  icon: string;
  isStealth: boolean;
  created_at: Date;
}

export interface DbProject {
  id: string;
  name: string;
  identifier: string;
  icon: string;
  team_id: string;
  description: string | null;
  is_public: boolean;
  public_slug: string | null;
  lead_id: string | null;
  start_date: Date | null;
  target_date: Date | null;
  created_at: Date;
  updated_at: Date;
}

export interface DbIssue {
  id: string;
  identifier: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  project_id: string;
  parent_id: string | null;
  created_at: Date;
  updated_at: Date;
  start_date: Date | null;
  due_date: Date | null;
}

export interface DbComment {
  id: string;
  content: string;
  issue_id: string;
  user_id: string;
  created_at: Date;
}

export interface DbNotification {
  id: string;
  user_id: string;
  type: string;
  message: string;
  issue_id: string;
  is_read: boolean;
  actor_id: string | null;
  created_at: Date;
}

export interface DbActivity {
  id: string;
  user_id: string;
  type: string;
  project_id: string | null;
  issue_id: string | null;
  entity_title: string | null;
  description: string | null;
  created_at: Date;
}

export interface DbRefreshToken {
  id: string;
  user_id: string;
  token: string;
  expires_at: Date;
  created_at: Date;
}

export interface DbProjectLink {
  id: string;
  project_id: string;
  title: string;
  url: string;
  created_at: Date;
}

/**
 * Convert Prisma User to DbUser format (for backward compatibility)
 */
function toDbUser(user: User): DbUser {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    password_hash: user.passwordHash,
    avatar_url: user.avatarUrl,
    role: user.role,
    email_verified: user.emailVerified,
    created_at: user.createdAt,
    updated_at: user.updatedAt
  };
}

/**
 * Convert Prisma Team to DbTeam format
 */
function toDbTeam(team: any): DbTeam {
  return {
    id: team.id,
    name: team.name,
    icon: team.icon,
    isStealth: team.isStealth || false,
    created_at: team.createdAt
  };
}

/**
 * Convert Prisma Project to DbProject format
 */
function toDbProject(project: any): DbProject {
  return {
    id: project.id,
    name: project.name,
    identifier: project.identifier,
    icon: project.icon,
    team_id: project.teamId,
    description: project.description,
    is_public: project.isPublic,
    public_slug: project.publicSlug,
    lead_id: project.leadId,
    start_date: project.startDate,
    target_date: project.targetDate,
    created_at: project.createdAt,
    updated_at: project.updatedAt
  };
}

/**
 * Convert Prisma Issue to DbIssue format
 */
function toDbIssue(issue: any): DbIssue {
  return {
    id: issue.id,
    identifier: issue.identifier,
    title: issue.title,
    description: issue.description,
    status: issue.status,
    priority: issue.priority,
    project_id: issue.projectId,
    parent_id: issue.parentId,
    created_at: issue.createdAt,
    updated_at: issue.updatedAt,
    start_date: issue.startDate,
    due_date: issue.dueDate
  };
}

/**
 * Convert Prisma Comment to DbComment format
 */
function toDbComment(comment: any): DbComment {
  return {
    id: comment.id,
    content: comment.content,
    issue_id: comment.issueId,
    user_id: comment.userId,
    created_at: comment.createdAt
  };
}

/**
 * Convert Prisma Notification to DbNotification format
 */
function toDbNotification(notification: any): DbNotification {
  return {
    id: notification.id,
    user_id: notification.userId,
    type: notification.type,
    message: notification.message,
    issue_id: notification.issueId,
    is_read: notification.isRead,
    actor_id: notification.actorId,
    created_at: notification.createdAt
  };
}

/**
 * Convert Prisma Activity to DbActivity format
 */
function toDbActivity(activity: any): DbActivity {
  return {
    id: activity.id,
    user_id: activity.userId,
    type: activity.type,
    project_id: activity.projectId,
    issue_id: activity.issueId,
    entity_title: activity.entityTitle,
    description: activity.description,
    created_at: activity.createdAt
  };
}

/**
 * Convert Prisma RefreshToken to DbRefreshToken format
 */
function toDbRefreshToken(token: any): DbRefreshToken {
  return {
    id: token.id,
    user_id: token.userId,
    token: token.token,
    expires_at: token.expiresAt,
    created_at: token.createdAt
  };
}

/**
 * Convert Prisma ProjectLink to DbProjectLink format
 */
function toDbProjectLink(link: any): DbProjectLink {
  return {
    id: link.id,
    project_id: link.projectId,
    title: link.title,
    url: link.url,
    created_at: link.createdAt
  };
}

class DatabaseManager {
  public prisma: PrismaClient;

  constructor() {
    // Use singleton pattern for Prisma Client in development
    if (process.env.NODE_ENV === 'production') {
      this.prisma = new PrismaClient();
    } else {
      // @ts-ignore - global.prisma is used for hot reload in development
      if (!global.prisma) {
        // @ts-ignore
        global.prisma = new PrismaClient();
      }
      // @ts-ignore
      this.prisma = global.prisma;
    }
  }

  // Helper to get current timestamp
  now(): Date {
    return new Date();
  }

  // Save method for backward compatibility (Prisma auto-saves)
  save(): void {
    // Prisma handles transactions automatically, no explicit save needed
  }

  // === USER OPERATIONS ===

  async createUser(data: Omit<DbUser, 'id' | 'created_at' | 'updated_at'>): Promise<DbUser> {
    const now = this.now();
    const user = await this.prisma.user.create({
      data: {
        name: data.name,
        email: data.email,
        passwordHash: data.password_hash,
        avatarUrl: data.avatar_url,
        role: data.role as UserRole,
        emailVerified: data.email_verified,
        createdAt: now,
        updatedAt: now
      }
    });
    return toDbUser(user);
  }

  async getUserById(id: string): Promise<DbUser | null> {
    const user = await this.prisma.user.findUnique({
      where: { id }
    });
    return user ? toDbUser(user) : null;
  }

  async getUserByEmail(email: string): Promise<DbUser | null> {
    const user = await this.prisma.user.findUnique({
      where: { email }
    });
    return user ? toDbUser(user) : null;
  }

  async getAllUsers(): Promise<DbUser[]> {
    const users = await this.prisma.user.findMany();
    return users.map(toDbUser);
  }

  async updateUser(id: string, updates: Partial<Omit<DbUser, 'id' | 'created_at'>>): Promise<void> {
    const data: any = {
      updatedAt: this.now()
    };

    if (updates.name !== undefined) data.name = updates.name;
    if (updates.email !== undefined) data.email = updates.email;
    if (updates.avatar_url !== undefined) data.avatarUrl = updates.avatar_url;
    if (updates.role !== undefined) data.role = updates.role as UserRole;
    if (updates.password_hash !== undefined) data.passwordHash = updates.password_hash;
    if (updates.email_verified !== undefined) data.emailVerified = updates.email_verified;

    await this.prisma.user.update({
      where: { id },
      data
    });
  }

  async updateUserPassword(id: string, password_hash: string): Promise<void> {
    await this.prisma.user.update({
      where: { id },
      data: {
        passwordHash: password_hash,
        updatedAt: this.now()
      }
    });
  }

  async deleteUser(id: string): Promise<void> {
    await this.prisma.user.delete({
      where: { id }
    });
  }

  // === TEAM OPERATIONS ===

  async createTeam(data: { name: string; icon: string }): Promise<DbTeam> {
    const team = await this.prisma.team.create({
      data: {
        name: data.name,
        icon: data.icon
      }
    });
    return toDbTeam(team);
  }

  async getTeamById(id: string): Promise<DbTeam | null> {
    const team = await this.prisma.team.findUnique({
      where: { id }
    });
    return team ? toDbTeam(team) : null;
  }

  async getAllTeams(): Promise<DbTeam[]> {
    const teams = await this.prisma.team.findMany();
    return teams.map(toDbTeam);
  }

  async getTeamMembers(teamId: string): Promise<DbUser[]> {
    const members = await this.prisma.teamMember.findMany({
      where: { teamId },
      include: {
        user: true
      }
    });
    return members.map(m => toDbUser(m.user));
  }

  async getTeamMembersWithInfo(teamId: string): Promise<Array<{ id: string; name: string; email: string; avatar_url: string; role: string; created_at: Date; updated_at: Date }>> {
    const members = await this.prisma.teamMember.findMany({
      where: { teamId },
      include: {
        user: true
      }
    });
    return members.map(m => ({
      id: m.user.id,
      name: m.user.name,
      email: m.user.email,
      avatar_url: m.user.avatarUrl || '',
      role: m.user.role,
      created_at: m.user.createdAt,
      updated_at: m.user.updatedAt
    }));
  }

  async addTeamMember(teamId: string, userId: string): Promise<void> {
    await this.prisma.teamMember.create({
      data: {
        teamId,
        userId
      }
    }).catch(() => {
      // Ignore duplicate key errors (member already exists)
    });
  }

  async removeTeamMember(teamId: string, userId: string): Promise<void> {
    await this.prisma.teamMember.deleteMany({
      where: {
        teamId,
        userId
      }
    });
  }

  async deleteTeam(id: string): Promise<void> {
    await this.prisma.team.delete({
      where: { id }
    });
  }

  async updateTeam(id: string, updates: { name?: string; icon?: string }): Promise<void> {
    const data: any = {};
    if (updates.name !== undefined) data.name = updates.name;
    if (updates.icon !== undefined) data.icon = updates.icon;

    if (Object.keys(data).length > 0) {
      await this.prisma.team.update({
        where: { id },
        data
      });
    }
  }

  async getUserTeams(userId: string): Promise<any[]> {
    const allTeams = await this.prisma.team.findMany();

    // Batch load all team members for this user
    const userMemberships = await this.prisma.teamMember.findMany({
      where: { userId },
      select: { teamId: true, role: true }
    });

    const memberTeamIds = new Set(userMemberships.map(m => m.teamId));

    // Filter: user must be a member of stealth teams, non-stealth teams are visible to all
    return allTeams.filter(team => {
      if (!team.isStealth) return true; // Non-stealth teams visible to all
      return memberTeamIds.has(team.id); // Stealth teams only if member
    }).map(team => {
      const membership = userMemberships.find(m => m.teamId === team.id);
      return {
        id: team.id,
        name: team.name,
        icon: team.icon,
        isStealth: team.isStealth,
        createdAt: team.createdAt,
        // Include the user's role in this team if they're a member
        userRole: membership?.role || null
      };
    });
  }

  // === PROJECT OPERATIONS ===

  async createProject(data: Omit<DbProject, 'id' | 'created_at' | 'updated_at'>): Promise<DbProject> {
    const now = this.now();
    const project = await this.prisma.project.create({
      data: {
        name: data.name,
        identifier: data.identifier,
        icon: data.icon,
        teamId: data.team_id,
        description: data.description,
        isPublic: data.is_public ?? false,
        publicSlug: data.public_slug,
        leadId: data.lead_id,
        startDate: data.start_date,
        targetDate: data.target_date,
        createdAt: now,
        updatedAt: now
      }
    });
    return toDbProject(project);
  }

  async getProjectById(id: string): Promise<DbProject | null> {
    const project = await this.prisma.project.findUnique({
      where: { id }
    });
    return project ? toDbProject(project) : null;
  }

  async getProjectBySlug(slug: string): Promise<DbProject | null> {
    console.log('[getProjectBySlug] Querying for slug:', slug);
    const project = await this.prisma.project.findUnique({
      where: { publicSlug: slug }
    });
    console.log('[getProjectBySlug] Found project:', project ? `${project.name} (publicSlug=${project.publicSlug}, isPublic=${project.isPublic})` : 'null');
    return project ? toDbProject(project) : null;
  }

  async getProjectsByTeam(teamId: string): Promise<DbProject[]> {
    const projects = await this.prisma.project.findMany({
      where: { teamId }
    });
    return projects.map(toDbProject);
  }

  async getAllProjects(): Promise<DbProject[]> {
    const projects = await this.prisma.project.findMany();
    return projects.map(toDbProject);
  }

  async updateProject(id: string, updates: Partial<Omit<DbProject, 'id' | 'created_at'>>): Promise<void> {
    const data: any = {
      updatedAt: this.now()
    };

    if (updates.name !== undefined) data.name = updates.name;
    if (updates.identifier !== undefined) data.identifier = updates.identifier;
    if (updates.icon !== undefined) data.icon = updates.icon;
    if (updates.description !== undefined) data.description = updates.description;
    if (updates.is_public !== undefined) data.isPublic = updates.is_public;
    if (updates.public_slug !== undefined) data.publicSlug = updates.public_slug;
    if (updates.lead_id !== undefined) data.leadId = updates.lead_id;
    if (updates.start_date !== undefined) data.startDate = updates.start_date;
    if (updates.target_date !== undefined) data.targetDate = updates.target_date;

    console.log('[updateProject] Updating project:', id, 'with data:', JSON.stringify({ isPublic: data.isPublic, publicSlug: data.publicSlug }));

    await this.prisma.project.update({
      where: { id },
      data
    });
  }

  async deleteProject(id: string): Promise<void> {
    await this.prisma.project.delete({
      where: { id }
    });
  }

  // === PROJECT LINK OPERATIONS ===

  async createProjectLink(data: Omit<DbProjectLink, 'id' | 'created_at'>): Promise<DbProjectLink> {
    const link = await this.prisma.projectLink.create({
      data: {
        projectId: data.project_id,
        title: data.title,
        url: data.url
      }
    });
    return toDbProjectLink(link);
  }

  async getProjectLinks(projectId: string): Promise<DbProjectLink[]> {
    const links = await this.prisma.projectLink.findMany({
      where: { projectId },
      orderBy: { createdAt: 'asc' }
    });
    return links.map(toDbProjectLink);
  }

  async updateProjectLink(id: string, updates: Partial<Omit<DbProjectLink, 'id' | 'project_id' | 'created_at'>>): Promise<void> {
    const data: any = {};
    if (updates.title !== undefined) data.title = updates.title;
    if (updates.url !== undefined) data.url = updates.url;

    if (Object.keys(data).length > 0) {
      await this.prisma.projectLink.update({
        where: { id },
        data
      });
    }
  }

  async deleteProjectLink(id: string): Promise<void> {
    await this.prisma.projectLink.delete({
      where: { id }
    });
  }

  // === ISSUE OPERATIONS ===

  async createIssue(data: Omit<DbIssue, 'id' | 'created_at' | 'updated_at'>): Promise<DbIssue> {
    const now = this.now();
    const issue = await this.prisma.issue.create({
      data: {
        identifier: data.identifier,
        title: data.title,
        description: data.description,
        status: data.status as Status,
        priority: data.priority as Priority,
        projectId: data.project_id,
        parentId: data.parent_id,
        startDate: data.start_date ? new Date(data.start_date) : null,
        dueDate: data.due_date ? new Date(data.due_date) : null,
        createdAt: now,
        updatedAt: now
      }
    });
    return toDbIssue(issue);
  }

  async getIssueById(id: string): Promise<DbIssue | null> {
    const issue = await this.prisma.issue.findUnique({
      where: { id }
    });
    return issue ? toDbIssue(issue) : null;
  }

  async getIssuesByProject(projectId: string): Promise<DbIssue[]> {
    const issues = await this.prisma.issue.findMany({
      where: { projectId }
    });
    return issues.map(toDbIssue);
  }

  async getIssuesByTeam(teamId: string): Promise<DbIssue[]> {
    const issues = await this.prisma.issue.findMany({
      where: {
        project: {
          teamId
        }
      }
    });
    return issues.map(toDbIssue);
  }

  async getAllIssues(): Promise<DbIssue[]> {
    const issues = await this.prisma.issue.findMany();
    return issues.map(toDbIssue);
  }

  async updateIssue(id: string, updates: Partial<Omit<DbIssue, 'id' | 'created_at'>>): Promise<void> {
    const data: any = {
      updatedAt: this.now()
    };

    if (updates.identifier !== undefined) data.identifier = updates.identifier;
    if (updates.title !== undefined) data.title = updates.title;
    if (updates.description !== undefined) data.description = updates.description;
    if (updates.status !== undefined) data.status = updates.status as Status;
    if (updates.priority !== undefined) data.priority = updates.priority as Priority;
    if (updates.project_id !== undefined) data.projectId = updates.project_id;
    if (updates.parent_id !== undefined) data.parentId = updates.parent_id;
    // Convert date-only strings to Date objects for Prisma
    if (updates.start_date !== undefined) {
      data.startDate = updates.start_date ? new Date(updates.start_date) : null;
    }
    if (updates.due_date !== undefined) {
      data.dueDate = updates.due_date ? new Date(updates.due_date) : null;
    }

    await this.prisma.issue.update({
      where: { id },
      data
    });
  }

  async deleteIssue(id: string): Promise<void> {
    await this.prisma.issue.delete({
      where: { id }
    });
  }

  // Issue assignees
  async setIssueAssignees(issueId: string, userIds: string[]): Promise<void> {
    // Delete existing assignees
    await this.prisma.issueAssignee.deleteMany({
      where: { issueId }
    });

    // Add new assignees
    if (userIds.length > 0) {
      await this.prisma.issueAssignee.createMany({
        data: userIds.map(userId => ({ issueId, userId }))
      });
    }
  }

  async getIssueAssignees(issueId: string): Promise<DbUser[]> {
    const assignees = await this.prisma.issueAssignee.findMany({
      where: { issueId },
      include: {
        user: true
      }
    });
    return assignees.map(a => toDbUser(a.user));
  }

  // === COMMENT OPERATIONS ===

  async createComment(data: Omit<DbComment, 'id' | 'created_at'>): Promise<DbComment> {
    const comment = await this.prisma.comment.create({
      data: {
        content: data.content,
        issueId: data.issue_id,
        userId: data.user_id
      }
    });
    return toDbComment(comment);
  }

  async getCommentsByIssue(issueId: string): Promise<DbComment[]> {
    const comments = await this.prisma.comment.findMany({
      where: { issueId },
      orderBy: { createdAt: 'asc' }
    });
    return comments.map(toDbComment);
  }

  async deleteComment(id: string): Promise<void> {
    await this.prisma.comment.delete({
      where: { id }
    });
  }

  // === NOTIFICATION OPERATIONS ===

  async createNotification(data: Omit<DbNotification, 'id' | 'created_at'>): Promise<DbNotification> {
    const notification = await this.prisma.notification.create({
      data: {
        userId: data.user_id,
        type: data.type as any,
        message: data.message,
        issueId: data.issue_id,
        isRead: data.is_read,
        actorId: data.actor_id
      }
    });
    return toDbNotification(notification);
  }

  async getNotificationsByUser(userId: string): Promise<DbNotification[]> {
    const notifications = await this.prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' }
    });
    return notifications.map(toDbNotification);
  }

  async getUnreadNotificationsByUser(userId: string): Promise<DbNotification[]> {
    const notifications = await this.prisma.notification.findMany({
      where: {
        userId,
        isRead: false
      },
      orderBy: { createdAt: 'desc' }
    });
    return notifications.map(toDbNotification);
  }

  async markNotificationRead(id: string): Promise<void> {
    await this.prisma.notification.update({
      where: { id },
      data: { isRead: true }
    });
  }

  async markAllNotificationsRead(userId: string): Promise<void> {
    await this.prisma.notification.updateMany({
      where: { userId },
      data: { isRead: true }
    });
  }

  async deleteNotification(id: string): Promise<void> {
    await this.prisma.notification.delete({
      where: { id }
    });
  }

  // === ACTIVITY OPERATIONS ===

  async createActivity(data: Omit<DbActivity, 'id' | 'created_at'>): Promise<DbActivity> {
    const activity = await this.prisma.activity.create({
      data: {
        userId: data.user_id,
        type: data.type,
        projectId: data.project_id,
        issueId: data.issue_id,
        entityTitle: data.entity_title,
        description: data.description
      }
    });
    return toDbActivity(activity);
  }

  async getActivitiesByUser(userId: string, limit: number = 100): Promise<DbActivity[]> {
    const activities = await this.prisma.activity.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit
    });
    return activities.map(toDbActivity);
  }

  async getActivitiesByProject(projectId: string, limit: number = 100): Promise<DbActivity[]> {
    const activities = await this.prisma.activity.findMany({
      where: { projectId },
      orderBy: { createdAt: 'desc' },
      take: limit
    });
    return activities.map(toDbActivity);
  }

  async getRecentActivities(limit: number = 500): Promise<DbActivity[]> {
    const activities = await this.prisma.activity.findMany({
      orderBy: { createdAt: 'desc' },
      take: limit
    });
    return activities.map(toDbActivity);
  }

  // === REFRESH TOKEN OPERATIONS ===

  async createRefreshToken(userId: string, token: string, expiresAt: Date): Promise<DbRefreshToken> {
    const refreshToken = await this.prisma.refreshToken.create({
      data: {
        userId,
        token,
        expiresAt
      }
    });
    return toDbRefreshToken(refreshToken);
  }

  async getRefreshToken(token: string): Promise<DbRefreshToken | null> {
    const refreshToken = await this.prisma.refreshToken.findUnique({
      where: { token }
    });

    // Check if token is expired
    if (refreshToken && refreshToken.expiresAt < new Date()) {
      await this.prisma.refreshToken.delete({
        where: { id: refreshToken.id }
      });
      return null;
    }

    return refreshToken ? toDbRefreshToken(refreshToken) : null;
  }

  async deleteRefreshToken(token: string): Promise<void> {
    await this.prisma.refreshToken.deleteMany({
      where: { token }
    });
  }

  async deleteAllRefreshTokensForUser(userId: string): Promise<void> {
    await this.prisma.refreshToken.deleteMany({
      where: { userId }
    });
  }

  // Clean up expired tokens
  async cleanupExpiredTokens(): Promise<void> {
    await this.prisma.refreshToken.deleteMany({
      where: {
        expiresAt: {
          lt: new Date()
        }
      }
    });
  }

  // === EMAIL VERIFICATION TOKEN OPERATIONS ===

  async createEmailVerificationToken(userId: string, token: string, expiresAt: Date): Promise<void> {
    await this.prisma.emailVerificationToken.create({
      data: {
        userId,
        token,
        expiresAt
      }
    });
  }

  async getEmailVerificationToken(token: string): Promise<any | null> {
    const verificationToken = await this.prisma.emailVerificationToken.findUnique({
      where: { token }
    });

    // Check if token is expired
    if (verificationToken && verificationToken.expiresAt < new Date()) {
      await this.prisma.emailVerificationToken.delete({
        where: { id: verificationToken.id }
      });
      return null;
    }

    return verificationToken;
  }

  async deleteEmailVerificationToken(id: string): Promise<void> {
    await this.prisma.emailVerificationToken.delete({
      where: { id }
    });
  }

  async deleteEmailVerificationTokensForUser(userId: string): Promise<void> {
    await this.prisma.emailVerificationToken.deleteMany({
      where: { userId }
    });
  }

  // === PASSWORD RESET TOKEN OPERATIONS ===

  async createPasswordResetToken(userId: string, token: string, expiresAt: Date): Promise<void> {
    await this.prisma.passwordResetToken.create({
      data: {
        userId,
        token,
        expiresAt
      }
    });
  }

  async getPasswordResetToken(token: string): Promise<any | null> {
    const resetToken = await this.prisma.passwordResetToken.findUnique({
      where: { token }
    });

    // Check if token is expired
    if (resetToken && resetToken.expiresAt < new Date()) {
      await this.prisma.passwordResetToken.delete({
        where: { id: resetToken.id }
      });
      return null;
    }

    return resetToken;
  }

  async deletePasswordResetToken(id: string): Promise<void> {
    await this.prisma.passwordResetToken.delete({
      where: { id }
    });
  }

  async deletePasswordResetTokensForUser(userId: string): Promise<void> {
    await this.prisma.passwordResetToken.deleteMany({
      where: { userId }
    });
  }

  // === TWO FACTOR AUTH OPERATIONS ===

  async createTwoFactorAuth(userId: string, secret: string, backupCodes: string[]): Promise<void> {
    const now = this.now();
    await this.prisma.twoFactorAuth.upsert({
      where: { userId },
      create: {
        userId,
        secret,
        backupCodes: JSON.stringify(backupCodes),
        enabled: false,
        createdAt: now,
        updatedAt: now
      },
      update: {
        secret,
        backupCodes: JSON.stringify(backupCodes),
        enabled: false,
        updatedAt: now
      }
    });
  }

  async getTwoFactorAuth(userId: string): Promise<any | null> {
    return await this.prisma.twoFactorAuth.findUnique({
      where: { userId }
    });
  }

  async enableTwoFactorAuth(userId: string): Promise<void> {
    await this.prisma.twoFactorAuth.update({
      where: { userId },
      data: { enabled: true, updatedAt: this.now() }
    });
  }

  async disableTwoFactorAuth(userId: string): Promise<void> {
    await this.prisma.twoFactorAuth.delete({
      where: { userId }
    });
  }

  // === WORKSPACE OPERATIONS ===

  /**
   * Clear all workspace data (delete all teams, projects, issues, comments, etc.)
   * This is used for workspace deletion by administrators
   */
  async clearWorkspace(): Promise<void> {
    // Delete all data in order of dependencies (foreign keys)
    await this.prisma.notification.deleteMany({});
    await this.prisma.activity.deleteMany({});
    await this.prisma.comment.deleteMany({});
    await this.prisma.issueAssignee.deleteMany({});
    await this.prisma.issue.deleteMany({});
    await this.prisma.projectLink.deleteMany({});
    await this.prisma.project.deleteMany({});
    await this.prisma.teamMember.deleteMany({});
    await this.prisma.team.deleteMany({});
  }

  // === INVITATION OPERATIONS ===

  async createInvitation(email: string, teamId: string, role: UserRole, token: string, expiresAt: Date): Promise<void> {
    await this.prisma.invitation.create({
      data: {
        email,
        teamId,
        role,
        token,
        expiresAt,
        accepted: false
      }
    });
  }

  async getInvitationByToken(token: string): Promise<any | null> {
    const invitation = await this.prisma.invitation.findUnique({
      where: { token },
      include: { team: true }
    });

    // Check if token is expired
    if (invitation && invitation.expiresAt < new Date()) {
      await this.prisma.invitation.delete({
        where: { id: invitation.id }
      });
      return null;
    }

    return invitation;
  }

  async getPendingInvitationsByEmail(email: string): Promise<any[]> {
    return await this.prisma.invitation.findMany({
      where: {
        email,
        accepted: false,
        expiresAt: { gte: new Date() }
      },
      include: { team: true }
    });
  }

  async markInvitationAccepted(token: string): Promise<void> {
    await this.prisma.invitation.update({
      where: { token },
      data: { accepted: true }
    });
  }

  async deleteInvitation(token: string): Promise<void> {
    await this.prisma.invitation.deleteMany({
      where: { token }
    });
  }

  async deleteInvitationByEmail(email: string, teamId: string): Promise<void> {
    await this.prisma.invitation.deleteMany({
      where: { email, teamId }
    });
  }

  // === TEAM LEAVING VALIDATION ===

  /**
   * Count global Administrators who are members of a team.
   * This is used to prevent the last administrator from leaving a workspace.
   */
  async countAdminsInTeam(teamId: string): Promise<number> {
    const teamMembers = await this.prisma.teamMember.findMany({
      where: { teamId },
      include: { user: true }
    });

    // Count only users with global Administrator role who are team members
    return teamMembers.filter(tm => tm.user.role === 'Administrator').length;
  }

  // Close database connection
  async close(): Promise<void> {
    await this.prisma.$disconnect();
  }

  // Get Prisma client for direct access (for advanced queries)
  getPrisma(): PrismaClient {
    return this.prisma;
  }
}

// Singleton instance
let dbInstance: DatabaseManager | null = null;

export async function getDatabase(): Promise<DatabaseManager> {
  if (!dbInstance) {
    dbInstance = new DatabaseManager();
  }
  return dbInstance;
}

export { DatabaseManager };
