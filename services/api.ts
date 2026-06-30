/**
 * API Client for Neo Linear Backend
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

// Use VITE_API_URL if available (for development), otherwise use relative URL
// In development, Vite proxies /api to the backend server
const API_BASE = import.meta.env?.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/api/v1` : '/api/v1';

// Field name transformation helpers
function transformUser(user: any): User {
  const { avatar_url, ...rest } = user;
  return {
    ...rest,
    avatarUrl: avatar_url || undefined,
  } as User;
}

export function transformProject(project: any, originalProject?: any): Project {
  // If we have an original project, preserve its teamId to avoid losing it during getByIdWithLinks
  // Handle both snake_case (from raw API responses) and camelCase (from Prisma responses)
  const teamId = project.teamId || project.team_id || originalProject?.teamId || originalProject?.team_id;
  return {
    ...project,
    teamId: teamId,
    isPublic: project.isPublic !== undefined ? project.isPublic : !!project.is_public,
    publicSlug: project.publicSlug || project.public_slug,
    leadId: project.leadId || project.lead_id,
    // Keep dates as YYYY-MM-DD strings to avoid timezone display issues
    startDate: project.startDate ? (typeof project.startDate === 'string' ? project.startDate.split('T')[0] : project.startDate) : (project.start_date ? project.start_date.split('T')[0] : undefined),
    targetDate: project.targetDate ? (typeof project.targetDate === 'string' ? project.targetDate.split('T')[0] : project.targetDate) : (project.target_date ? project.target_date.split('T')[0] : undefined),
    // Include links from server response
    links: project.links || [],
  };
}

function transformIssue(issue: any): Issue {
  return {
    ...issue,
    projectId: issue.projectId || issue.project_id,
    assigneeIds: issue.assignees ? issue.assignees.map((a: any) => a.id) : (issue.assigneeIds || issue.assignee_ids || []),
    startDate: issue.startDate ? (issue.startDate instanceof Date ? issue.startDate : new Date(issue.startDate)) : (issue.start_date ? new Date(issue.start_date) : undefined),
    dueDate: issue.dueDate ? (issue.dueDate instanceof Date ? issue.dueDate : new Date(issue.dueDate)) : (issue.due_date ? new Date(issue.due_date) : undefined),
    parentId: issue.parentId || issue.parent_id || undefined,
    createdAt: issue.createdAt ? (issue.createdAt instanceof Date ? issue.createdAt : new Date(issue.createdAt)) : (issue.created_at ? new Date(issue.created_at) : undefined),
    updatedAt: issue.updatedAt ? (issue.updatedAt instanceof Date ? issue.updatedAt : new Date(issue.updatedAt)) : (issue.updated_at ? new Date(issue.updated_at) : undefined),
  };
}

function transformComment(comment: any): Comment {
  // Server now returns camelCase field names correctly
  return comment as Comment;
}

function transformNotification(notification: any): Notification {
  return {
    ...notification,
    userId: notification.userId || notification.user_id,
    issueId: notification.issueId || notification.issue_id,
    isRead: notification.isRead !== undefined ? notification.isRead : !!notification.is_read,
    createdAt: notification.createdAt ? (notification.createdAt instanceof Date ? notification.createdAt : new Date(notification.createdAt)) : (notification.created_at ? new Date(notification.created_at) : undefined),
    actorId: notification.actorId || notification.actor_id || undefined,
  };
}

function transformActivity(activity: any): Activity {
  return {
    ...activity,
    userId: activity.userId || activity.user_id,
    projectId: activity.projectId || activity.project_id || undefined,
    issueId: activity.issueId || activity.issue_id || undefined,
    createdAt: activity.createdAt ? (activity.createdAt instanceof Date ? activity.createdAt : new Date(activity.createdAt)) : (activity.created_at ? new Date(activity.created_at) : undefined),
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
const MAX_QUEUE_SIZE = 100;
const QUEUE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
let isSyncing = false;

// Types
interface LoginResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
}

interface TokenResponse {
  accessToken: string;
  refreshToken: string;
}

// Access token is stored in memory only for security (XSS prevention)
// The httpOnly refresh token cookie handles persistence across page reloads.
// The access token is also mirrored to localStorage so that page reloads don't
// trigger a 401 → refresh round-trip on every cold load (eliminates console
// noise from parallel queries firing before the refresh resolves).
const TOKEN_STORAGE_KEY = 'neo_linear_access_token';

function readTokenFromStorage(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage.getItem(TOKEN_STORAGE_KEY);
  } catch {
    return null;
  }
}

function writeTokenToStorage(token: string): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(TOKEN_STORAGE_KEY, token);
  } catch {
    // Storage full / disabled — fall back to memory-only
  }
}

function removeTokenFromStorage(): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(TOKEN_STORAGE_KEY);
  } catch {
    // no-op
  }
}

let accessToken: string | null = readTokenFromStorage();
let isRefreshing = false;
let refreshPromise: Promise<boolean> | null = null;

// Global auth failure callbacks - triggered when refresh completely fails
let authFailureCallbacks: Array<() => void> = [];

/**
 * Register a callback to be invoked when authentication completely fails
 * (e.g., refresh token is invalid/expired). This allows the app to
 * redirect to login or clear user state.
 */
export function onAuthFailure(callback: () => void): () => void {
  authFailureCallbacks.push(callback);
  // Return unsubscribe function
  return () => {
    authFailureCallbacks = authFailureCallbacks.filter(cb => cb !== callback);
  };
}

/**
 * Trigger all registered auth failure callbacks.
 * Called when token refresh completely fails.
 */
function triggerAuthFailure(): void {
  authFailureCallbacks.forEach(cb => {
    try {
      cb();
    } catch (e) {
      console.error('[api] Auth failure callback error:', e);
    }
  });
}

export function getAccessToken(): string | null {
  return accessToken;
}

function setAccessToken(token: string): void {
  accessToken = token;
  writeTokenToStorage(token);
}

function clearTokens(): void {
  accessToken = null;
  removeTokenFromStorage();
}

/**
 * Offline detection and queueing
 */
function handleOffline(): void {
  isOnline = false;
}

function handleOnline(): void {
  isOnline = true;
  syncQueuedRequests();
}

function queueRequest(method: string, url: string, options?: RequestInit): void {
  // Check queue size limit
  if (requestQueue.length >= MAX_QUEUE_SIZE) {
    console.warn(`📦 Queue full (${MAX_QUEUE_SIZE}), dropping oldest request: ${method} ${url}`);
    requestQueue.shift(); // Remove oldest request
  }

  // Remove expired requests before adding new one
  const now = Date.now();
  requestQueue = requestQueue.filter(req => now - req.timestamp < QUEUE_TTL_MS);

  const request: QueuedRequest = {
    method,
    url,
    options,
    timestamp: Date.now()
  };
  requestQueue.push(request);
}

async function syncQueuedRequests(): Promise<void> {
  if (requestQueue.length === 0 || isSyncing) return;

  isSyncing = true;


  // Filter out expired requests
  const now = Date.now();
  const validRequests = requestQueue.filter(req => now - req.timestamp < QUEUE_TTL_MS);
  const expiredCount = requestQueue.length - validRequests.length;

  if (expiredCount > 0) {
  }
  requestQueue = validRequests;

  const queue = [...requestQueue];
  requestQueue = [];

  // Process requests in parallel with concurrency limit of 5
  const CONCURRENCY_LIMIT = 5;
  const results = await Promise.allSettled(
    queue.map(async (request) => {
      try {
        const fullUrl = import.meta.env?.VITE_API_URL
          ? `${import.meta.env.VITE_API_URL}${API_BASE}${request.url}`
          : `${API_BASE}${request.url}`;
        await fetch(fullUrl, {
          ...request.options,
          credentials: 'include'
        });
        return { success: true, request };
      } catch (error) {
        console.error(`❌ Failed to sync: ${request.method} ${request.url}`, error);
        // Only re-queue if we haven't exceeded the limit and request is not expired
        if (now - request.timestamp < QUEUE_TTL_MS && requestQueue.length < MAX_QUEUE_SIZE) {
          requestQueue.push(request);
        }
        return { success: false, request, error };
      }
    })
  );

  const failed = results.filter(r => r.status === 'rejected' || (r.status === 'fulfilled' && !r.value.success));
  if (failed.length > 0) {
  }

  if (requestQueue.length > 0) {
  }

  isSyncing = false;
}

// Listen for online/offline events
let offlineListenerAdded = false;
if (typeof window !== 'undefined') {
  window.addEventListener('offline', handleOffline);
  window.addEventListener('online', handleOnline);
  offlineListenerAdded = true;
}

// Export cleanup function to remove event listeners
export function cleanup(): void {
  if (offlineListenerAdded && typeof window !== 'undefined') {
    window.removeEventListener('offline', handleOffline);
    window.removeEventListener('online', handleOnline);
    offlineListenerAdded = false;
  }
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
  const csrfUrl = import.meta.env?.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/api/csrf-token` : '/api/csrf-token';
  const response = await fetch(csrfUrl);
  const data = await handleResponse<{ csrfToken: string }>(response);
  csrfToken = data.csrfToken || null;
  if (!csrfToken) {
    throw new Error('Failed to fetch CSRF token');
  }
  return csrfToken;
}

// Helper to make authenticated requests
async function fetchWithAuth(url: string, options?: RequestInit, retryCount = 0): Promise<Response> {
  // Check if offline
  if (!isOnline && navigator.onLine === false) {
    const method = options?.method || 'GET';
    queueRequest(method, url, options);
    throw new Error('Offline: Request queued');
  }

  const token = getAccessToken();
  const method = (options?.method || 'GET').toUpperCase();

  // Only set Content-Type for methods that typically have a body AND when there's actually a body
  // DELETE, GET, and POST without body should not have Content-Type header
  const methodsWithBody = ['POST', 'PUT', 'PATCH'];
  const hasBody = options?.body !== undefined;
  const headers: Record<string, string> = {
    ...(methodsWithBody.includes(method) && hasBody && { 'Content-Type': 'application/json' }),
    ...(token && { Authorization: `Bearer ${token}` }),
    ...(options?.headers as Record<string, string> || {})
  };

  // Add CSRF token for state-changing methods
  const stateChangingMethods = ['POST', 'PUT', 'PATCH', 'DELETE'];

  if (stateChangingMethods.includes(method)) {
    // Ensure CSRF token is present before state-changing requests
    if (!csrfToken) {
      await fetchCsrfToken();
    }
    headers['X-CSRF-Token'] = csrfToken || '';
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

    // Handle 401 Unauthorized - try to refresh token (only retry once)
    if (response.status === 401 && !url.includes('/auth/refresh') && retryCount === 0) {
      const refreshed = await refreshAccessToken();
      if (refreshed) {
        // Retry original request with new token (only once)
        return fetchWithAuth(url, options, retryCount + 1);
      } else {
        // Refresh failed - trigger auth failure callbacks and throw error
        triggerAuthFailure();
        throw new Error('Authentication failed. Please log in again.');
      }
    }

    // Handle 403 Forbidden - might be invalid CSRF token
    if (response.status === 403 && stateChangingMethods.includes(method)) {
      const error = await response.json().catch(() => ({ error: 'Forbidden' }));
      if (error.error?.toLowerCase().includes('csrf')) {
        // Fetch new CSRF token and retry
        await fetchCsrfToken();
        // Get current access token for the retry
        const currentToken = getAccessToken();
        // Create new options with updated CSRF token and Authorization header
        // Only include Content-Type for methods that typically have a body
        const retryHeaders: Record<string, string> = {
          ...(methodsWithBody.includes(method) && { 'Content-Type': 'application/json' }),
          'X-CSRF-Token': csrfToken || '',
          ...(currentToken ? { Authorization: `Bearer ${currentToken}` } : {})
        };
        const retryOptions: RequestInit = {
          ...options,
          headers: retryHeaders,
          credentials: 'include'
        };
        // Retry original request with new CSRF token
        const fullUrl = import.meta.env?.VITE_API_URL ? `${import.meta.env.VITE_API_URL}${API_BASE}${url}` : `${API_BASE}${url}`;
        return fetch(fullUrl, retryOptions);
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

  // Mark as refreshing IMMEDIATELY before any async operation
  // This prevents race conditions from multiple simultaneous 401 responses
  isRefreshing = true;

  // Create the refresh promise
  refreshPromise = (async () => {
    try {
      // Fetch CSRF token first if not present
      if (!csrfToken) {
        await fetchCsrfToken();
      }

      const headers: Record<string, string> = {
        'X-CSRF-Token': csrfToken || ''
      };

      const refreshUrl = import.meta.env?.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/api/v1/auth/refresh` : `${API_BASE}/auth/refresh`;
      const response = await fetch(refreshUrl, {
        method: 'POST',
        headers: {
          ...headers,
          'Content-Type': 'application/json'
        },
        credentials: 'include', // Include httpOnly cookie automatically
        body: JSON.stringify({}) // Send empty object to satisfy backend schema
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
      } else {
        // Handle 401/403 from refresh endpoint - token is truly invalid
        return false;
      }
    } catch (error) {
      // Network error or other failure
      return false;
    } finally {
      // Clear the refresh lock AFTER the promise completes
      isRefreshing = false;
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

// Handle API response
async function handleResponse<T>(response: Response): Promise<T> {
  const contentType = response.headers.get('content-type');
  const isJson = contentType && contentType.includes('application/json');

  if (!response.ok) {
    if (isJson) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(error.error || error.message || `HTTP ${response.status}`);
    } else {
      const text = await response.text().catch(() => 'No error details');
      if (response.status === 500 && (text.includes('ECONNREFUSED') || text.includes('Error: connect ECONNREFUSED'))) {
        throw new Error('Backend server is unreachable. Please ensure the server is running on port 3001.');
      }
      throw new Error(`Server error (${response.status}): ${text.substring(0, 100)}`);
    }
  }

  if (!isJson) {
    const text = await response.text().catch(() => 'No content');
    throw new Error(`Expected JSON but got ${contentType || 'unknown'}: ${text.substring(0, 100)}`);
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

    const loginUrl = import.meta.env?.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/api/v1/auth/login` : `${API_BASE}/auth/login`;
    const response = await fetch(loginUrl, {
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
        const retryResponse = await fetch(loginUrl, {
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

  async register(name: string, email: string, password: string, inviteToken?: string): Promise<LoginResponse> {
    // Fetch CSRF token first if not present
    if (!csrfToken) {
      await fetchCsrfToken();
    }

    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      'X-CSRF-Token': csrfToken || ''
    };

    const registerUrl = import.meta.env?.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/api/v1/auth/register` : `${API_BASE}/auth/register`;
    const response = await fetch(registerUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify({ name, email, password, inviteToken }),
      credentials: 'include' // Include cookies
    });

    // Handle 403 Forbidden - CSRF token might be invalid or expired
    if (response.status === 403) {
      const error = await response.json().catch(() => ({ error: 'Forbidden' }));
      if (error.error?.toLowerCase().includes('csrf')) {
        // Refresh CSRF token and retry
        await fetchCsrfToken();
        const retryResponse = await fetch(registerUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-CSRF-Token': csrfToken || ''
          },
          body: JSON.stringify({ name, email, password, inviteToken }),
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
      'X-CSRF-Token': csrfToken || ''
    };

    const logoutUrl = import.meta.env?.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/api/v1/auth/logout` : `${API_BASE}/auth/logout`;
    await fetch(logoutUrl, {
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
  },

  async requestPasswordReset(email: string): Promise<{ message: string }> {
    const forgotPasswordUrl = import.meta.env?.VITE_API_URL
      ? `${import.meta.env.VITE_API_URL}/api/v1/auth/forgot-password`
      : `${API_BASE}/auth/forgot-password`;

    const response = await fetch(forgotPasswordUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
      credentials: 'include'
    });

    return await handleResponse<{ message: string }>(response);
  },

  async resetPassword(token: string, newPassword: string): Promise<{ message: string }> {
    const resetPasswordUrl = import.meta.env?.VITE_API_URL
      ? `${import.meta.env.VITE_API_URL}/api/v1/auth/reset-password`
      : `${API_BASE}/auth/reset-password`;

    const response = await fetch(resetPasswordUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, newPassword }),
      credentials: 'include'
    });

    return await handleResponse<{ message: string }>(response);
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

  async addMember(teamId: string, userId: string, role?: UserRole): Promise<{ members: string[]; membersWithRoles: Array<{ id: string; role: string }> }> {
    const response = await fetchWithAuth(`/teams/${teamId}/members`, {
      method: 'POST',
      body: JSON.stringify({ userId, role: role || 'Member' })
    });
    const data = await handleResponse<{ members: string[]; membersWithRoles: Array<{ id: string; role: string }> }>(response);
    return { members: data.members, membersWithRoles: data.membersWithRoles };
  },

  async removeMember(teamId: string, userId: string): Promise<string[]> {
    await fetchWithAuth(`/teams/${teamId}/members/${userId}`, { method: 'DELETE' });
    const team = await teamsApi.getById(teamId);
    return team.members;
  },

  async update(id: string, updates: { name?: string; icon?: string; isStealth?: boolean }): Promise<Team> {
    const response = await fetchWithAuth(`/teams/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(updates)
    });
    const data = await handleResponse<{ team: Team }>(response);
    return data.team;
  },

  async delete(id: string): Promise<void> {
    await fetchWithAuth(`/teams/${id}`, { method: 'DELETE' });
  },

  async leaveTeam(teamId: string): Promise<void> {
    const response = await fetchWithAuth(`/teams/${teamId}/leave`, {
      method: 'POST'
    });
    await handleResponse<{ message: string }>(response);
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
      const publicUrl = import.meta.env?.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/api/v1/projects/public/${slug}` : `${API_BASE}/projects/public/${slug}`;
      const response = await fetch(publicUrl);
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
    // Backend uses camelCase for project updates
    const backendUpdates: any = {};
    if (updates.name !== undefined) backendUpdates.name = updates.name;
    if (updates.identifier !== undefined) backendUpdates.identifier = updates.identifier;
    if (updates.icon !== undefined) backendUpdates.icon = updates.icon;
    if (updates.teamId !== undefined) backendUpdates.teamId = updates.teamId;
    if (updates.description !== undefined) backendUpdates.description = updates.description;
    if (updates.isPublic !== undefined) backendUpdates.isPublic = updates.isPublic;
    if (updates.publicSlug !== undefined) backendUpdates.publicSlug = updates.publicSlug;
    if (updates.leadId !== undefined) backendUpdates.leadId = updates.leadId;
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

    const response = await fetchWithAuth(`/projects/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(backendUpdates)
    });

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
  },

  async delete(id: string): Promise<void> {
    await fetchWithAuth(`/projects/${id}`, { method: 'DELETE' });
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
  }): Promise<{ issue: Issue; activity?: Activity }> {
    const response = await fetchWithAuth('/issues', {
      method: 'POST',
      body: JSON.stringify(data)
    });
    const res = await handleResponse<{ issue: any; activity?: any }>(response);
    return {
      issue: transformIssue(res.issue),
      activity: res.activity ? transformActivity(res.activity) : undefined
    };
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
    const transformed = transformIssue(data.issue);
    return transformed;
  },

  async createSubtask(parentId: string, title: string): Promise<Issue> {
    const response = await fetchWithAuth(`/issues/${parentId}/subtasks`, {
      method: 'POST',
      body: JSON.stringify({ title })
    });
    const data = await handleResponse<{ issue: any }>(response);
    return transformIssue(data.issue);
  }
};

// ===== COMMENTS API =====

export const commentsApi = {
  async getByIssue(issueId: string): Promise<Comment[]> {
    const response = await fetchWithAuth(`/issues/${issueId}/comments`);
    const data = await handleResponse<{ comments: any[] }>(response);
    return data.comments.map(transformComment);
  },

  async create(content: string, issueId: string): Promise<{ comment: Comment; activity?: Activity }> {
    const response = await fetchWithAuth('/comments', {
      method: 'POST',
      body: JSON.stringify({ content, issueId })
    });
    const data = await handleResponse<{ comment: any; activity?: any }>(response);
    return {
      comment: transformComment(data.comment),
      activity: data.activity ? transformActivity(data.activity) : undefined
    };
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
  async getAll(filters?: { teamId?: string; projectId?: string; limit?: number }): Promise<Activity[]> {
    const params = new URLSearchParams();
    if (filters?.teamId) params.append('teamId', filters.teamId);
    if (filters?.projectId) params.append('projectId', filters.projectId);
    if (filters?.limit) params.append('limit', filters.limit.toString());
    const query = params.toString() ? `?${params}` : '';
    const response = await fetchWithAuth(`/activities${query}`);
    const data = await handleResponse<{ activities: any[] }>(response);
    return data.activities.map(transformActivity);
  },

  async create(data: {
    user_id: string;
    type: string;
    project_id?: string;
    issue_id?: string;
    entity_title?: string;
    description?: string;
  }): Promise<Activity> {
    const response = await fetchWithAuth('/activities', {
      method: 'POST',
      body: JSON.stringify(data)
    });
    const res = await handleResponse<{ activity: any }>(response);
    return transformActivity(res.activity);
  }
};

// ===== INVITATIONS API =====

export const invitationsApi = {
  async sendInvite(email: string, teamId: string, role: UserRole): Promise<{ message: string; email: string; teamName: string; role: string } | { message: string; user: any }> {
    const response = await fetchWithAuth('/invitations/send', {
      method: 'POST',
      body: JSON.stringify({ email, teamId, role })
    });
    return await handleResponse<any>(response);
  },

  async checkInvite(token: string): Promise<{ team: any; role: string; email: string } | null> {
    try {
      const checkUrl = import.meta.env?.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/api/v1/invitations/check/${token}` : `${API_BASE}/invitations/check/${token}`;
      const response = await fetch(checkUrl);
      if (!response.ok) return null;
      return await handleResponse<{ team: any; role: string; email: string }>(response);
    } catch {
      return null;
    }
  },

  async acceptInvite(token: string): Promise<{ message: string; user?: User; team?: any; role?: string; needsRegistration?: boolean }> {
    const response = await fetchWithAuth('/invitations/accept', {
      method: 'POST',
      body: JSON.stringify({ token })
    });
    return await handleResponse<any>(response);
  },

  async getPending(): Promise<{ id: string; teamName: string; teamId: string; role: string; expiresAt: string }[]> {
    const response = await fetchWithAuth('/invitations/pending');
    const data = await handleResponse<{ invitations: any[] }>(response);
    return data.invitations;
  }
};

// ===== JOIN REQUESTS API =====

export interface JoinRequest {
  id: string;
  teamId: string;
  userId: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  updatedAt: string;
  team: {
    id: string;
    name: string;
    icon: string;
  };
  user?: {
    id: string;
    name: string;
    email: string;
    avatarUrl: string;
    role: string;
  };
}

export const joinRequestsApi = {
  async createJoinRequest(teamId: string): Promise<JoinRequest> {
    const response = await fetchWithAuth('/join-requests', {
      method: 'POST',
      body: JSON.stringify({ teamId })
    });
    const data = await handleResponse<{ joinRequest: any }>(response);
    return data.joinRequest;
  },

  async getAll(): Promise<JoinRequest[]> {
    const response = await fetchWithAuth('/join-requests');
    const data = await handleResponse<{ joinRequests: any[] }>(response);
    return data.joinRequests;
  },

  async getMyRequests(): Promise<JoinRequest[]> {
    const response = await fetchWithAuth('/join-requests/my');
    const data = await handleResponse<{ joinRequests: any[] }>(response);
    return data.joinRequests;
  },

  async approve(requestId: string): Promise<{ message: string; members: string[]; membersWithRoles: Array<{ id: string; role: string }> }> {
    const response = await fetchWithAuth(`/join-requests/${requestId}/approve`, {
      method: 'POST'
    });
    return await handleResponse<any>(response);
  },

  async reject(requestId: string): Promise<{ message: string }> {
    const response = await fetchWithAuth(`/join-requests/${requestId}`, {
      method: 'DELETE'
    });
    return await handleResponse<any>(response);
  }
};

// ===== ADMIN API =====

export const adminApi = {
  async deleteWorkspace(): Promise<void> {
    const response = await fetchWithAuth('/admin/workspace', { method: 'DELETE' });
    await handleResponse<{ message: string }>(response);
  },

  async clearCache(): Promise<void> {
    const response = await fetchWithAuth('/admin/cache', { method: 'DELETE' });
    await handleResponse<{ message: string }>(response);
  },

  async getCacheStats(): Promise<{ keys: number; size: string }> {
    const response = await fetchWithAuth('/admin/cache/stats');
    return await handleResponse<{ keys: number; size: string }>(response);
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
  activities: activitiesApi,
  invitations: invitationsApi,
  joinRequests: joinRequestsApi,
  admin: adminApi
};

// Export auth-related helper functions for use in AuthContext
// Note: getAccessToken is already exported above as a function
export { refreshAccessToken, clearTokens };

// Export offline status and queue for UI
export function getOfflineStatus(): { isOnline: boolean; queuedRequests: number } {
  return {
    isOnline: navigator.onLine && isOnline,
    queuedRequests: requestQueue.length
  };
}

export function clearRequestQueue(): void {
  requestQueue = [];
}
