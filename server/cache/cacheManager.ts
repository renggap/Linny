/**
 * Cache Manager
 *
 * Multi-level cache system with L1 (in-memory) and L2 (Redis) caching.
 * Provides cache key generation, tag-based invalidation, and metrics.
 */

import { getRedisClient } from './redis.js';

// TTL constants (in seconds)
export const TTL = {
  USER_PROFILE: 900,      // 15 minutes
  TEAM_DATA: 1800,        // 30 minutes
  PROJECT_DATA: 120,      // 2 minutes
  ISSUE_DATA: 120,        // 2 minutes
  ISSUE_LIST: 60,         // 1 minute
  ACTIVITY_LIST: 60,      // 1 minute
  NOTIFICATION_LIST: 60,  // 1 minute
  DEFAULT: 300            // 5 minutes
};

// Cache key prefixes
export const CacheKey = {
  USER: (userId: string) => `user:${userId}:profile`,
  USER_SESSIONS: (userId: string) => `user:${userId}:sessions`,
  TEAM: (teamId: string) => `team:${teamId}:data`,
  TEAM_MEMBERS: (teamId: string) => `team:${teamId}:members`,
  PROJECT: (projectId: string) => `project:${projectId}:data`,
  PROJECT_ISSUES: (projectId: string) => `project:${projectId}:issues`,
  ISSUE: (issueId: string) => `issue:${issueId}:data`,
  ISSUE_COMMENTS: (issueId: string) => `issue:${issueId}:comments`,
  ISSUES_BY_PROJECT: (projectId: string) => `issues:project:${projectId}:all`,
  ACTIVITIES: (userId: string) => `activities:${userId}:list`,
  NOTIFICATIONS: (userId: string) => `notifications:${userId}:list`,
  SEARCH_RESULTS: (query: string) => `search:${query}`,
  PUBLIC_PROJECT: (slug: string) => `public:project:${slug}`
};

// L1 in-memory cache for frequently accessed data
class L1Cache {
  private cache: Map<string, { data: any; expires: number }>;
  private maxSize: number;

  constructor(maxSize: number = 100) {
    this.cache = new Map();
    this.maxSize = maxSize;
  }

  get(key: string): any | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    if (Date.now() > entry.expires) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  set(key: string, data: any, ttl: number): void {
    // Evict oldest if at capacity
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey) this.cache.delete(firstKey);
    }

    this.cache.set(key, {
      data,
      expires: Date.now() + ttl * 1000
    });
  }

  delete(key: string): void {
    this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  deletePattern(pattern: string): number {
    let count = 0;
    for (const key of this.cache.keys()) {
      if (key.includes(pattern)) {
        this.cache.delete(key);
        count++;
      }
    }
    return count;
  }
}

class CacheManager {
  private l1: L1Cache;
  private redis = getRedisClient();
  private metrics: {
    hits: number;
    misses: number;
    sets: number;
    deletes: number;
  };

  constructor(l1MaxSize: number = 100) {
    this.l1 = new L1Cache(l1MaxSize);
    this.metrics = { hits: 0, misses: 0, sets: 0, deletes: 0 };
  }

  /**
   * Get value from cache (L1 first, then L2)
   */
  async get(key: string): Promise<any | null> {
    // Try L1 first
    const l1Value = this.l1.get(key);
    if (l1Value !== null) {
      this.metrics.hits++;
      return l1Value;
    }

    // Try L2 (Redis)
    const l2Value = await this.redis.get(key);
    if (l2Value !== null) {
      try {
        const parsed = JSON.parse(l2Value);
        // Store in L1 for next access
        this.l1.set(key, parsed, TTL.DEFAULT);
        this.metrics.hits++;
        return parsed;
      } catch {
        // Return raw value if JSON parse fails
        this.metrics.hits++;
        return l2Value;
      }
    }

    this.metrics.misses++;
    return null;
  }

  /**
   * Set value in both L1 and L2
   */
  async set(key: string, value: any, ttl: number = TTL.DEFAULT): Promise<void> {
    const serialized = JSON.stringify(value);

    // Set in L1
    this.l1.set(key, value, ttl);

    // Set in L2 (Redis)
    await this.redis.set(key, serialized, ttl);

    this.metrics.sets++;
  }

  /**
   * Delete from both L1 and L2
   */
  async delete(key: string): Promise<void> {
    this.l1.delete(key);
    await this.redis.del(key);
    this.metrics.deletes++;
  }

  /**
   * Delete all keys matching a pattern
   */
  async deletePattern(pattern: string): Promise<number> {
    const l1Count = this.l1.deletePattern(pattern);
    const l2Count = await this.redis.delPattern(pattern);
    this.metrics.deletes += l1Count + l2Count;
    return l1Count + l2Count;
  }

  /**
   * Invalidate user-related cache
   */
  async invalidateUser(userId: string): Promise<void> {
    await this.deletePattern(`user:${userId}:`);
    await this.deletePattern(`notifications:${userId}`);
    await this.deletePattern(`activities:${userId}`);
  }

  /**
   * Invalidate team-related cache
   */
  async invalidateTeam(teamId: string): Promise<void> {
    await this.deletePattern(`team:${teamId}:`);
    // Also invalidate projects for this team
    await this.deletePattern(`project:*`);
    await this.deletePattern(`issues:project:*`);
  }

  /**
   * Invalidate project-related cache
   */
  async invalidateProject(projectId: string): Promise<void> {
    await this.deletePattern(`project:${projectId}:`);
    await this.deletePattern(`issues:project:${projectId}`);
  }

  /**
   * Invalidate issue-related cache
   */
  async invalidateIssue(issueId: string): Promise<void> {
    await this.deletePattern(`issue:${issueId}:`);
  }

  /**
   * Get or set pattern (cache-aside)
   */
  async getOrSet(
    key: string,
    fetch: () => Promise<any>,
    ttl: number = TTL.DEFAULT
  ): Promise<any> {
    const cached = await this.get(key);
    if (cached !== null) {
      return cached;
    }

    const value = await fetch();
    await this.set(key, value, ttl);
    return value;
  }

  /**
   * Get cache metrics
   */
  getMetrics() {
    const hitRate = this.metrics.hits + this.metrics.misses > 0
      ? (this.metrics.hits / (this.metrics.hits + this.metrics.misses)) * 100
      : 0;

    return {
      ...this.metrics,
      hitRate: `${hitRate.toFixed(2)}%`,
      l1Size: this.l1['cache'].size
    };
  }

  /**
   * Reset metrics
   */
  resetMetrics(): void {
    this.metrics = { hits: 0, misses: 0, sets: 0, deletes: 0 };
  }

  /**
   * Clear all cache
   */
  async clear(): Promise<void> {
    this.l1.clear();
    // Clear all keys with our prefix from Redis
    await this.redis.delPattern('*');
  }

  /**
   * Check if Redis is available
   */
  isRedisAvailable(): boolean {
    return this.redis.isReady();
  }
}

// Singleton instance
let cacheManagerInstance: CacheManager | null = null;

export function getCacheManager(): CacheManager {
  if (!cacheManagerInstance) {
    cacheManagerInstance = new CacheManager();
  }
  return cacheManagerInstance;
}

export { CacheManager };
export default getCacheManager;
