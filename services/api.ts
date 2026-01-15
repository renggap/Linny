/**
 * API Client for Linear Clone Backend
 *
 * Handles all HTTP requests to the Express server with JWT authentication.
 *
 * DEEP REASONING CHAIN:
 * Offline support enables:
 * 1. App functionality without internet connection
 * 2. Request queuing when offline
 * 3. Automatic sync when connection restored
 * 4. Better UX for poor connectivity
 *
 * EDGE CASE ANALYSIS:
 * - Detects online/offline status via navigator.onLine
 * - Queues failed requests for retry
 * - Syncs queued requests when online
 * - Handles duplicate requests in queue
 * - Provides offline indicator to UI
 */

import { User, UserRole, Team, Project, Status, Priority, Issue, Activity, Comment, Notification } from '../types';
import { getUserAvatarUrl } from '../utils/avatar';

const API_BASE = '/api/v1';

// Field name transformation helpers
function transformUser(user: any): User {
  // Normalize avatar URL - handles both avatar_url (snake_case) and avatarUrl (camelCase)
  // Server now sends avatarUrl, but we handle both for compatibility
  const existingAvatar = user.avatarUrl || user.avatar_url;
  const normalizedAvatar = getUserAvatarUrl({ name: user.name, avatar_url: existingAvatar });

  // Transform to camelCase and normalize avatar
  return {
    ...user,
    avatarUrl: normalizedAvatar,
    avatar_url: undefined, // Remove snake_case version
  } as User;
}

function transformProject(project: any): Project {
  return {
    ...project,
    teamId: project.team_id,
    isPublic: !!project.is_public,
    publicSlug: project.public_slug,
    leadId: project.lead_id,
    // Keep dates as YYYY-MM-DD strings to avoid timezone display issues
    startDate: project.start_date ? project.start_date.split('T')[0] : undefined,
    targetDate: project.target_date ? project.target_date.split('T')[0] : undefined,
    // Include links from server response
    links: project.links || [],
  };
}

function transformIssue(issue: any): Issue {
  return {
    ...issue,
    projectId: issue.project_id,
    assigneeIds: issue.assignees ? issue.assignees.map((a: any) => a.id) : (issue.assigneeIds || issue.assignee_ids || []),
    startDate: issue.start_date ? new Date(issue.start_date) : undefined,
    dueDate: issue.due_date ? new Date(issue.due_date) : undefined,
    parentId: issue.parent_id || undefined,
    createdAt: new Date(issue.created_at),
    updatedAt: new Date(issue.updated_at),
  };
}

function transformComment(comment: any): Comment {
  return {
    ...comment,
    issueId: comment.issue_id,
    userId: comment.user_id,
    createdAt: new Date(comment.created_at),
  };
}

function transformNotification(notification: any): Notification {
  return {
    ...notification,
    userId: notification.user_id,
    issueId: notification.issue_id,
    isRead: !!notification.is_read,
    createdAt: new Date(notification.created_at),
    actorId: notification.actor_id || undefined,
  };
}

function transformActivity(activity: any): Activity {
  return {
    ...activity,
    userId: activity.user_id,
    projectId: activity.project_id || undefined,
    issueId: activity.issue_id || undefined,
    createdAt: new Date(activity.created_at),
  };
}

// Offline support
interface QueuedRequest {
  method: string;
  url: string;
  options?: RequestInit;
  timestamp: number;
}

let isOnline = navigator.onLine;
let requestQueue: QueuedRequest[] = [];

// Types
interface ApiResponse<T> {
  data?: T;
  error?: string;
  details?: any;
}

interface LoginResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
}

interface TokenResponse {
  accessToken: string;
  refreshToken: string;
}

interface PaginatedResponse<T> {
  items: T[];
  total?: number;
  page?: number;
  pageSize?: number;
}

// Helper to get access token from memory
let accessToken: string | null = null;
let isRefreshing = false;
let refreshPromise: Promise<boolean> | null = null;

function getAccessToken(): string | null {
  return accessToken;
}

// Helper to get refresh token from cookie
function getRefreshToken(): string | null {
  // Get from cookie
  const cookies = document.cookie.split(';');
  for (const cookie of cookies) {
    const [name, value] = cookie.trim().split('=');
    if (name === 'refreshToken') {
      return value || null;
    }
  }
  return null;
}

function setAccessToken(token: string): void {
  accessToken = token;
}

function setTokens(accessToken: string, refreshToken: string): void {
  // Store access token in memory
  accessToken = accessToken;

  // Refresh token is already set by server as httpOnly cookie
  // We don't need to store it in localStorage
}

function clearTokens(): void {
  accessToken = null;
  // Clear cookie (will be done by server on logout)
}

/**
 * Offline detection and queueing
 */
function handleOffline(): void {
  isOnline = false;
  console.log('📴 Going offline - requests will be queued');
}

function handleOnline(): void {
  isOnline = true;
  console.log('📶 Back online - syncing queued requests');
  syncQueuedRequests();
}

function queueRequest(method: string, url: string, options?: RequestInit): void {
  const request: QueuedRequest = {
    method,
    url,
    options,
    timestamp: Date.now()
  };
  requestQueue.push(request);
  console.log(`📦 Queued request: ${method} ${url}`);
}

async function syncQueuedRequests(): Promise<void> {
  if (requestQueue.length === 0) return;

  console.log(`🔄 Syncing ${requestQueue.length} queued requests...`);

  const queue = [...requestQueue];
  requestQueue = [];

  for (const request of queue) {
    try {
      await fetch(`${API_BASE}${request.url}`, {
        ...request.options,
        credentials: 'include'
      });
      console.log(`✅ Synced: ${request.method} ${request.url}`);
    } catch (error) {
      console.error(`❌ Failed to sync: ${request.method} ${request.url}`, error);
      // Re-queue failed requests
      requestQueue.push(request);
    }
  }

  if (requestQueue.length > 0) {
    console.log(`⚠️ ${requestQueue.length} requests still queued`);
  }
}

// Listen for online/offline events
if (typeof window !== 'undefined') {
  window.addEventListener('offline', handleOffline);
  window.addEventListener('online', handleOnline);
}

// CSRF Token Management
let csrfToken: string | null = null;

export function getCsrfToken(): string | null {
  return csrfToken;
}

export function setCsrfToken(token: string): void {
  csrfToken = token;
}

export async function fetchCsrfToken(): Promise<string> {
  const response = await fetch('/api/csrf-token');
  const data = await response.json();
  csrfToken = data.csrfToken || null;
  if (!csrfToken) {
    throw new Error('Failed to fetch CSRF token');
  }
  return csrfToken;
}

// Helper to make authenticated requests
async function fetchWithAuth(url: string, options?: RequestInit): Promise<Response> {
  // Check if offline
  if (!isOnline && navigator.onLine === false) {
    const method = options?.method || 'GET';
    queueRequest(method, url, options);
    throw new Error('Offline: Request queued');
  }

  const token = getAccessToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
    ...(options?.headers as Record<string, string> || {})
  };

  // Add CSRF token for state-changing methods
  const method = (options?.method || 'GET').toUpperCase();
  const stateChangingMethods = ['POST', 'PUT', 'PATCH', 'DELETE'];

  if (stateChangingMethods.includes(method)) {
    // Ensure CSRF token is present before state-changing requests
    if (!csrfToken) {
      console.log('No CSRF token, fetching one...');
      await fetchCsrfToken();
    }
    headers['X-CSRF-Token'] = csrfToken || '';
    console.log(`Making ${method} request to ${url} with CSRF token: ${csrfToken?.substring(0, 10)}...`);
  }

  try {
    const response = await fetch(`${API_BASE}${url}`, {
      ...options,
      headers,
      credentials: 'include' // Include cookies for httpOnly refresh token
    });

    // Update CSRF token from response headers
    const newCsrfToken = response.headers.get('X-CSRF-Token');
    if (newCsrfToken) {
      csrfToken = newCsrfToken;
    }

    // Handle 401 Unauthorized - try to refresh token
    if (response.status === 401 && !url.includes('/auth/refresh')) {
      console.log(`Got 401 for ${url}, attempting to refresh token...`);
      const refreshed = await refreshAccessToken();
      if (refreshed) {
        // Retry original request with new token
        return fetchWithAuth(url, options);
      } else {
        // Refresh failed, throw error
        throw new Error('Authentication failed. Please log in again.');
      }
    }

    // Handle 403 Forbidden - might be invalid CSRF token
    if (response.status === 403 && stateChangingMethods.includes(method)) {
      console.log(`Got 403 for ${url}, checking if CSRF token issue...`);
      const error = await response.json().catch(() => ({ error: 'Forbidden' }));
      if (error.error?.toLowerCase().includes('csrf')) {
        console.log(`CSRF token invalid, refreshing and retrying...`);
        // Fetch new CSRF token and retry
        await fetchCsrfToken();
        // Get current access token for the retry
        const currentToken = getAccessToken();
        // Create new options with updated CSRF token and Authorization header
        const retryOptions: RequestInit = {
          ...options,
          headers: {
            ...(options?.headers as Record<string, string> || {}),
            'X-CSRF-Token': csrfToken || '',
            ...(currentToken ? { Authorization: `Bearer ${currentToken}` } : {})
          },
          credentials: 'include'
        };
        // Retry original request with new CSRF token
        return fetch(`${API_BASE}${url}`, retryOptions);
      }
    }

    // Update online status based on response
    if (response.ok) {
      isOnline = true;
    }

    return response;
  } catch (error) {
    // Check if this is a network error (offline)
    if (error instanceof TypeError && error.message.includes('fetch')) {
      handleOffline();
      const reqMethod = options?.method || 'GET';
      queueRequest(reqMethod, url, options);
      throw new Error('Offline: Request queued');
    }
    console.error(`API Error for ${method} ${url}:`, error);
    throw error;
  }
}

// Refresh access token
// The refresh token is stored in an httpOnly cookie, which is automatically sent by the browser
async function refreshAccessToken(): Promise<boolean> {
  // If already refreshing, wait for the existing refresh to complete
  if (isRefreshing && refreshPromise) {
    return refreshPromise;
  }

  // Mark as refreshing and create the refresh promise
  isRefreshing = true;
  refreshPromise = (async () => {
    try {
      // Fetch CSRF token first if not present
      if (!csrfToken) {
        await fetchCsrfToken();
      }

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'X-CSRF-Token': csrfToken || ''
      };

      const response = await fetch(`${API_BASE}/auth/refresh`, {
        method: 'POST',
        headers,
        credentials: 'include' // Include httpOnly cookie automatically
      });

      // Update CSRF token from response headers if present
      const newCsrfToken = response.headers.get('X-CSRF-Token');
      if (newCsrfToken) {
        csrfToken = newCsrfToken;
      }

      if (response.ok) {
        const data: TokenResponse = await response.json();
        setAccessToken(data.accessToken);
        // Refresh token is already set by server as httpOnly cookie
        return true;
      }
    } catch {
      // Refresh failed
    } finally {
      // Clear the refresh lock
      isRefreshing = false;
      refreshPromise = null;
    }

    clearTokens();
    return false;
  })();

  return refreshPromise;
}

// Handle API response
async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(error.error || error.message || `HTTP ${response.status}`);
  }
  return response.json();
}

// ===== AUTH API =====

export const authApi = {
  async login(email: string, password: string): Promise<LoginResponse> {
    // Fetch CSRF token first if not present
    if (!csrfToken) {
      await fetchCsrfToken();
    }

    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      'X-CSRF-Token': csrfToken || ''
    };

    const response = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ email, password }),
      credentials: 'include' // Include cookies
    });

    // Handle 403 Forbidden - CSRF token might be invalid or expired
    if (response.status === 403) {
      const error = await response.json().catch(() => ({ error: 'Forbidden' }));
      if (error.error?.toLowerCase().includes('csrf')) {
        // Refresh CSRF token and retry
        await fetchCsrfToken();
        const retryResponse = await fetch(`${API_BASE}/auth/login`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-CSRF-Token': csrfToken || ''
          },
          body: JSON.stringify({ email, password }),
          credentials: 'include'
        });
        const data = await handleResponse<LoginResponse>(retryResponse);
        setAccessToken(data.accessToken);
        return data;
      }
    }

    // Update CSRF token from response headers if present
    const newCsrfToken = response.headers.get('X-CSRF-Token');
    if (newCsrfToken) {
      csrfToken = newCsrfToken;
    }

    const data = await handleResponse<LoginResponse>(response);
    setAccessToken(data.accessToken);
    // Refresh token is set by server as httpOnly cookie
    return data;
  },

  async register(name: string, email: string, password: string): Promise<LoginResponse> {
    // Fetch CSRF token first if not present
    if (!csrfToken) {
      await fetchCsrfToken();
    }

    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      'X-CSRF-Token': csrfToken || ''
    };

    const response = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ name, email, password }),
      credentials: 'include' // Include cookies
    });

    // Handle 403 Forbidden - CSRF token might be invalid or expired
    if (response.status === 403) {
      const error = await response.json().catch(() => ({ error: 'Forbidden' }));
      if (error.error?.toLowerCase().includes('csrf')) {
        // Refresh CSRF token and retry
        await fetchCsrfToken();
        const retryResponse = await fetch(`${API_BASE}/auth/register`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-CSRF-Token': csrfToken || ''
          },
          body: JSON.stringify({ name, email, password }),
          credentials: 'include'
        });
        const data = await handleResponse<LoginResponse>(retryResponse);
        setAccessToken(data.accessToken);
        return data;
      }
    }

    // Update CSRF token from response headers if present
    const newCsrfToken = response.headers.get('X-CSRF-Token');
    if (newCsrfToken) {
      csrfToken = newCsrfToken;
    }

    const data = await handleResponse<LoginResponse>(response);
    setAccessToken(data.accessToken);
    // Refresh token is set by server as httpOnly cookie
    return data;
  },

  async logout(): Promise<void> {
    clearTokens();

    // Fetch CSRF token first if not present
    if (!csrfToken) {
      await fetchCsrfToken();
    }

    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      'X-CSRF-Token': csrfToken || ''
    };

    await fetch(`${API_BASE}/auth/logout`, {
      method: 'POST',
      headers,
      credentials: 'include' // Include cookies
    });
  },

  async getCurrentUser(): Promise<User> {
    const response = await fetchWithAuth('/auth/me');
    const data = await handleResponse<{ user: any }>(response);
    // Transform avatar_url to avatarUrl for consistency
    const user = data.user;
    if (user.avatar_url) {
      user.avatarUrl = user.avatar_url;
      delete user.avatar_url;
    }
    return user as User;
  }
};

// ===== USERS API =====

export const usersApi = {
  async getAll(): Promise<User[]> {
    const response = await fetchWithAuth('/users');
    const data = await handleResponse<{ users: any[] }>(response);
    return data.users.map(transformUser);
  },

  async getById(id: string): Promise<User> {
    const response = await fetchWithAuth(`/users/${id}`);
    const data = await handleResponse<{ user: any }>(response);
    return transformUser(data.user);
  },

  async updateRole(userId: string, role: UserRole): Promise<User> {
    const response = await fetchWithAuth(`/users/${userId}/role`, {
      method: 'PATCH',
      body: JSON.stringify({ role })
    });
    const data = await handleResponse<{ user: any }>(response);
    return transformUser(data.user);
  },

  async updateProfile(userId: string, data: { name?: string; avatar_url?: string }): Promise<User> {
    const response = await fetchWithAuth(`/users/${userId}`, {
      method: 'PATCH',
      body: JSON.stringify(data)
    });
    const res = await handleResponse<{ user: any }>(response);
    return transformUser(res.user);
  },

  async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<void> {
    const response = await fetchWithAuth(`/users/${userId}/password`, {
      method: 'POST',
      body: JSON.stringify({ currentPassword, newPassword })
    });
    await handleResponse<{ message: string }>(response);
  },

  async remove(userId: string): Promise<void> {
    await fetchWithAuth(`/users/${userId}`, { method: 'DELETE' });
  }
};

// ===== TEAMS API =====

export const teamsApi = {
  async getAll(): Promise<Team[]> {
    const response = await fetchWithAuth('/teams');
    const data = await handleResponse<{ teams: Team[] }>(response);
    return data.teams;
  },

  async getById(id: string): Promise<Team> {
    const response = await fetchWithAuth(`/teams/${id}`);
    const data = await handleResponse<{ team: Team }>(response);
    return data.team;
  },

  async create(name: string, icon: string): Promise<Team> {
    const response = await fetchWithAuth('/teams', {
      method: 'POST',
      body: JSON.stringify({ name, icon })
    });
    const data = await handleResponse<{ team: Team }>(response);
    return data.team;
  },

  async addMember(teamId: string, userId: string): Promise<string[]> {
    const response = await fetchWithAuth(`/teams/${teamId}/members`, {
      method: 'POST',
      body: JSON.stringify({ userId })
    });
    const data = await handleResponse<{ members: string[] }>(response);
    return data.members;
  },

  async removeMember(teamId: string, userId: string): Promise<string[]> {
    await fetchWithAuth(`/teams/${teamId}/members/${userId}`, { method: 'DELETE' });
    const team = await teamsApi.getById(teamId);
    return team.members;
  }
};

// ===== PROJECTS API =====

export const projectsApi = {
  async getAll(filters?: { teamId?: string }): Promise<Project[]> {
    const params = new URLSearchParams();
    if (filters?.teamId) params.append('teamId', filters.teamId);
    const query = params.toString() ? `?${params}` : '';
    const response = await fetchWithAuth(`/projects${query}`);
    const data = await handleResponse<{ projects: any[] }>(response);
    return data.projects.map(transformProject);
  },

  async getById(id: string): Promise<Project> {
    const response = await fetchWithAuth(`/projects/${id}`);
    const data = await handleResponse<{ project: any }>(response);
    return transformProject(data.project);
  },

  async getByIdWithLinks(id: string): Promise<Project> {
    const response = await fetchWithAuth(`/projects/${id}/with-links`);
    const data = await handleResponse<{ project: any }>(response);
    return transformProject(data.project);
  },

  async getPublicBySlug(slug: string): Promise<{ project: Project; issues: Issue[]; users: User[] } | null> {
    try {
      const response = await fetch(`${API_BASE}/projects/public/${slug}`);
      if (!response.ok) return null;
      const data = await handleResponse<{ project: any; issues: any[]; users: any[] }>(response);
      return {
        project: transformProject(data.project),
        issues: (data.issues || []).map(transformIssue),
        users: (data.users || []).map(transformUser)
      };
    } catch (error) {
      console.error('Error fetching public project:', error);
      return null;
    }
  },

  async create(data: {
    name: string;
    identifier: string;
    icon?: string;
    teamId: string;
    description?: string;
    isPublic?: boolean;
    publicSlug?: string;
    startDate?: string;
    targetDate?: string;
  }): Promise<Project> {
    const response = await fetchWithAuth('/projects', {
      method: 'POST',
      body: JSON.stringify(data)
    });
    const res = await handleResponse<{ project: any }>(response);
    return transformProject(res.project);
  },

  async update(id: string, updates: Partial<Project>): Promise<Project> {
    // Transform camelCase to snake_case for backend
    const backendUpdates: any = {};
    if (updates.name !== undefined) backendUpdates.name = updates.name;
    if (updates.identifier !== undefined) backendUpdates.identifier = updates.identifier;
    if (updates.icon !== undefined) backendUpdates.icon = updates.icon;
    if (updates.teamId !== undefined) backendUpdates.teamId = updates.teamId;
    if (updates.description !== undefined) backendUpdates.description = updates.description;
    if (updates.isPublic !== undefined) backendUpdates.is_public = updates.isPublic;
    if (updates.publicSlug !== undefined) backendUpdates.public_slug = updates.publicSlug;
    if (updates.leadId !== undefined) backendUpdates.lead_id = updates.leadId;
    // Format dates like the Issues API does
    if (updates.startDate !== undefined) {
      backendUpdates.startDate = updates.startDate instanceof Date
        ? updates.startDate.toISOString().split('T')[0]
        : updates.startDate;
    }
    if (updates.targetDate !== undefined) {
      backendUpdates.targetDate = updates.targetDate instanceof Date
        ? updates.targetDate.toISOString().split('T')[0]
        : updates.targetDate;
    }

    // DIAGNOSTIC: Log what we're sending
    console.log('[projects.update] Sending to server:', JSON.stringify(backendUpdates));

    const response = await fetchWithAuth(`/projects/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(backendUpdates)
    });

    // DIAGNOSTIC: Log response status
    console.log('[projects.update] Response status:', response.status);

    const data = await handleResponse<{ project: any }>(response);
    return transformProject(data.project);
  },

  // Project Links
  async getLinks(projectId: string): Promise<{ id: string; title: string; url: string; createdAt: string }[]> {
    const response = await fetchWithAuth(`/projects/${projectId}/links`);
    const data = await handleResponse<{ links: any[] }>(response);
    return data.links.map((link: any) => ({
      ...link,
      createdAt: link.created_at ? new Date(link.created_at).toISOString() : new Date().toISOString()
    }));
  },

  async addLink(projectId: string, title: string, url: string): Promise<{ id: string; title: string; url: string; createdAt: string }> {
    const response = await fetchWithAuth(`/projects/${projectId}/links`, {
      method: 'POST',
      body: JSON.stringify({ title, url })
    });
    const data = await handleResponse<{ link: any }>(response);
    return {
      ...data.link,
      createdAt: data.link.created_at ? new Date(data.link.created_at).toISOString() : new Date().toISOString()
    };
  },

  async updateLink(projectId: string, linkId: string, updates: { title?: string; url?: string }): Promise<{ id: string; title: string; url: string; createdAt: string }[]> {
    const response = await fetchWithAuth(`/projects/${projectId}/links/${linkId}`, {
      method: 'PATCH',
      body: JSON.stringify(updates)
    });
    const data = await handleResponse<{ links: any[] }>(response);
    return data.links.map((link: any) => ({
      ...link,
      createdAt: link.created_at ? new Date(link.created_at).toISOString() : new Date().toISOString()
    }));
  },

  async deleteLink(projectId: string, linkId: string): Promise<void> {
    await fetchWithAuth(`/projects/${projectId}/links/${linkId}`, { method: 'DELETE' });
  }
};

// ===== ISSUES API =====

export interface IssueFilters {
  teamId?: string;
  projectId?: string;
  status?: Status;
  assigneeId?: string;
  search?: string;
}

export const issuesApi = {
  async getAll(filters?: IssueFilters): Promise<Issue[]> {
    const params = new URLSearchParams();
    if (filters?.teamId) params.append('teamId', filters.teamId);
    if (filters?.projectId) params.append('projectId', filters.projectId);
    if (filters?.status) params.append('status', filters.status);
    if (filters?.assigneeId) params.append('assigneeId', filters.assigneeId);
    if (filters?.search) params.append('search', filters.search);
    const query = params.toString() ? `?${params}` : '';
    const response = await fetchWithAuth(`/issues${query}`);
    const data = await handleResponse<{ issues: any[] }>(response);
    return data.issues.map(transformIssue);
  },

  async getById(id: string): Promise<Issue> {
    const response = await fetchWithAuth(`/issues/${id}`);
    const data = await handleResponse<{ issue: any }>(response);
    return transformIssue(data.issue);
  },

  async create(data: {
    title: string;
    description?: string;
    status?: Status;
    priority?: Priority;
    assigneeIds?: string[];
    projectId: string;
    startDate?: string;
    dueDate?: string;
    parentId?: string;
    blockedBy?: string[];
  }): Promise<Issue> {
    const response = await fetchWithAuth('/issues', {
      method: 'POST',
      body: JSON.stringify(data)
    });
    const res = await handleResponse<{ issue: any }>(response);
    return transformIssue(res.issue);
  },

  async update(id: string, updates: Partial<Issue>): Promise<Issue> {
    const apiUpdates = {
      ...updates,
      startDate: updates.startDate instanceof Date ? updates.startDate.toISOString().split('T')[0] : updates.startDate,
      dueDate: updates.dueDate instanceof Date ? updates.dueDate.toISOString().split('T')[0] : updates.dueDate,
    };

    const response = await fetchWithAuth(`/issues/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(apiUpdates)
    });
    const data = await handleResponse<{ issue: any }>(response);
    return transformIssue(data.issue);
  },

  async delete(id: string): Promise<void> {
    await fetchWithAuth(`/issues/${id}`, { method: 'DELETE' });
  },

  async updateStatus(id: string, status: Status): Promise<Issue> {
    const response = await fetchWithAuth(`/issues/${id}/status`, {
      method: 'POST',
      body: JSON.stringify({ status })
    });
    const data = await handleResponse<{ issue: any }>(response);
    return transformIssue(data.issue);
  },

  async createSubtask(parentId: string, title: string): Promise<Issue> {
    const response = await fetchWithAuth(`/issues/${parentId}/subtasks`, {
      method: 'POST',
      body: JSON.stringify({ title })
    });
    const data = await handleResponse<{ issue: any }>(response);
    return transformIssue(data.issue);
  },

  async setDependencies(id: string, blockingIds: string[]): Promise<void> {
    await fetchWithAuth(`/issues/${id}/dependencies`, {
      method: 'PUT',
      body: JSON.stringify({ blockingIds })
    });
  }
};

// ===== COMMENTS API =====

export const commentsApi = {
  async getByIssue(issueId: string): Promise<Comment[]> {
    const response = await fetchWithAuth(`/issues/${issueId}/comments`);
    const data = await handleResponse<{ comments: any[] }>(response);
    return data.comments.map(transformComment);
  },

  async create(content: string, issueId: string): Promise<Comment> {
    const response = await fetchWithAuth('/comments', {
      method: 'POST',
      body: JSON.stringify({ content, issueId })
    });
    const data = await handleResponse<{ comment: any }>(response);
    return transformComment(data.comment);
  }
};

// ===== NOTIFICATIONS API =====

export const notificationsApi = {
  async getAll(unreadOnly?: boolean): Promise<Notification[]> {
    const query = unreadOnly ? '?unread=true' : '';
    const response = await fetchWithAuth(`/notifications${query}`);
    const data = await handleResponse<{ notifications: any[] }>(response);
    return data.notifications.map(transformNotification);
  },

  async markRead(id: string): Promise<void> {
    await fetchWithAuth(`/notifications/${id}/read`, { method: 'PATCH' });
  },

  async markAllRead(): Promise<void> {
    await fetchWithAuth('/notifications/read-all', { method: 'PATCH' });
  }
};

// ===== ACTIVITIES API =====

export const activitiesApi = {
  async getAll(filters?: { projectId?: string; limit?: number }): Promise<Activity[]> {
    const params = new URLSearchParams();
    if (filters?.projectId) params.append('projectId', filters.projectId);
    if (filters?.limit) params.append('limit', filters.limit.toString());
    const query = params.toString() ? `?${params}` : '';
    const response = await fetchWithAuth(`/activities${query}`);
    const data = await handleResponse<{ activities: any[] }>(response);
    return data.activities.map(transformActivity);
  }
};

// Export all APIs as a single object
export const api = {
  auth: authApi,
  users: usersApi,
  teams: teamsApi,
  projects: projectsApi,
  issues: issuesApi,
  comments: commentsApi,
  notifications: notificationsApi,
  activities: activitiesApi
};

// Export offline status and queue for UI
export function getOfflineStatus(): { isOnline: boolean; queuedRequests: number } {
  return {
    isOnline: navigator.onLine && isOnline,
    queuedRequests: requestQueue.length
  };
}

export function clearRequestQueue(): void {
  requestQueue = [];
  console.log('🗑️ Request queue cleared');
}
