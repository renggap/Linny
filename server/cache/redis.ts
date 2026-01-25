/**
 * Redis Client Wrapper
 *
 * Provides a singleton Redis client with connection management,
 * graceful degradation, and health checking.
 */

import * as RedisModule from 'ioredis';
const Redis = (RedisModule as any).default || RedisModule;

export interface RedisConfig {
  host: string;
  port: number;
  password?: string;
  db: number;
  enabled: boolean;
  prefix: string;
}

const DEFAULT_CONFIG: RedisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD || undefined,
  db: parseInt(process.env.REDIS_DB || '0'),
  enabled: process.env.REDIS_ENABLED !== 'false',
  prefix: process.env.REDIS_PREFIX || 'linear_clone:'
};

class RedisClient {
  client: any = null;
  private config: RedisConfig;
  private isConnected: boolean = false;
  private maxReconnectAttempts: number = 5;

  constructor(config: RedisConfig = DEFAULT_CONFIG) {
    this.config = config;
    if (this.config.enabled) {
      this.connect();
    }
  }

  private connect(): void {
    try {
      this.client = new Redis({
        host: this.config.host,
        port: this.config.port,
        password: this.config.password,
        db: this.config.db,
        retryStrategy: (times: number) => {
          if (times > this.maxReconnectAttempts) {
            return null;
          }
          return Math.min(times * 100, 3000);
        },
        maxRetriesPerRequest: 3,
        enableReadyCheck: true,
        lazyConnect: false
      });

      this.client.on('connect', () => {
        console.log('✅ Redis connected');
        this.isConnected = true;
      });

      this.client.on('error', (err: Error) => {
        console.error('❌ Redis error:', err.message);
        this.isConnected = false;
      });

      this.client.on('close', () => {
        console.warn('⚠️  Redis connection closed');
        this.isConnected = false;
      });

      this.client.on('reconnecting', () => {
        console.log('🔄 Redis reconnecting...');
      });
    } catch (error) {
      console.error('❌ Failed to initialize Redis:', error);
      this.client = null;
      this.isConnected = false;
    }
  }

  /**
   * Get the Redis client instance
   * Returns null if Redis is disabled or not connected
   */
  getClient(): any {
    return this.client && this.isConnected ? this.client : null;
  }

  /**
   * Check if Redis is connected and available
   */
  isReady(): boolean {
    return this.config.enabled && this.isConnected && this.client !== null;
  }

  /**
   * Get Redis health status
   */
  async getHealthStatus(): Promise<{
    connected: boolean;
    memory?: string;
    keyCount?: number;
    error?: string;
  }> {
    if (!this.isReady()) {
      return { connected: false };
    }

    try {
      const info = await this.client.info('memory');
      const keyCount = await this.client.dbsize();

      // Parse memory usage from INFO
      const usedMemoryMatch = info.match(/used_memory_human:(.+)/);
      const memory = usedMemoryMatch ? usedMemoryMatch[1].trim() : 'unknown';

      return {
        connected: true,
        memory,
        keyCount
      };
    } catch (error) {
      return {
        connected: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Get a value from Redis
   */
  async get(key: string): Promise<string | null> {
    if (!this.isReady()) return null;
    try {
      return await this.client.get(this.config.prefix + key);
    } catch (error) {
      console.error('Redis GET error:', error);
      return null;
    }
  }

  /**
   * Set a value in Redis with optional TTL
   */
  async set(key: string, value: string, ttl?: number): Promise<boolean> {
    if (!this.isReady()) return false;
    try {
      const fullKey = this.config.prefix + key;
      if (ttl) {
        await this.client.setex(fullKey, ttl, value);
      } else {
        await this.client.set(fullKey, value);
      }
      return true;
    } catch (error) {
      console.error('Redis SET error:', error);
      return false;
    }
  }

  /**
   * Delete a key from Redis
   */
  async del(key: string): Promise<boolean> {
    if (!this.isReady()) return false;
    try {
      await this.client.del(this.config.prefix + key);
      return true;
    } catch (error) {
      console.error('Redis DEL error:', error);
      return false;
    }
  }

  /**
   * Delete keys matching a pattern
   */
  async delPattern(pattern: string): Promise<number> {
    if (!this.isReady()) return 0;
    try {
      const keys = await this.client.keys(this.config.prefix + pattern);
      if (keys.length === 0) return 0;
      await this.client.del(...keys);
      return keys.length;
    } catch (error) {
      console.error('Redis DEL_PATTERN error:', error);
      return 0;
    }
  }

  /**
   * Check if a key exists
   */
  async exists(key: string): Promise<boolean> {
    if (!this.isReady()) return false;
    try {
      const result = await this.client.exists(this.config.prefix + key);
      return result === 1;
    } catch (error) {
      console.error('Redis EXISTS error:', error);
      return false;
    }
  }

  /**
   * Set TTL for a key
   */
  async expire(key: string, ttl: number): Promise<boolean> {
    if (!this.isReady()) return false;
    try {
      await this.client.expire(this.config.prefix + key, ttl);
      return true;
    } catch (error) {
      console.error('Redis EXPIRE error:', error);
      return false;
    }
  }

  /**
   * Get TTL for a key
   */
  async ttl(key: string): Promise<number> {
    if (!this.isReady()) return -1;
    try {
      return await this.client.ttl(this.config.prefix + key);
    } catch (error) {
      console.error('Redis TTL error:', error);
      return -1;
    }
  }

  /**
   * Increment a counter
   */
  async incr(key: string): Promise<number | null> {
    if (!this.isReady()) return null;
    try {
      return await this.client.incr(this.config.prefix + key);
    } catch (error) {
      console.error('Redis INCR error:', error);
      return null;
    }
  }

  /**
   * Add member to a set
   */
  async sadd(key: string, ...members: string[]): Promise<number | null> {
    if (!this.isReady()) return null;
    try {
      return await this.client.sadd(this.config.prefix + key, ...members);
    } catch (error) {
      console.error('Redis SADD error:', error);
      return null;
    }
  }

  /**
   * Remove member from a set
   */
  async srem(key: string, ...members: string[]): Promise<number | null> {
    if (!this.isReady()) return null;
    try {
      return await this.client.srem(this.config.prefix + key, ...members);
    } catch (error) {
      console.error('Redis SREM error:', error);
      return null;
    }
  }

  /**
   * Get all members of a set
   */
  async smembers(key: string): Promise<string[] | null> {
    if (!this.isReady()) return null;
    try {
      return await this.client.smembers(this.config.prefix + key);
    } catch (error) {
      console.error('Redis SMEMBERS error:', error);
      return null;
    }
  }

  /**
   * Close the Redis connection
   */
  async close(): Promise<void> {
    if (this.client) {
      await this.client.quit();
      this.client = null;
      this.isConnected = false;
    }
  }
}

// Singleton instance
let redisInstance: RedisClient | null = null;

export function getRedisClient(): RedisClient {
  if (!redisInstance) {
    redisInstance = new RedisClient();
  }
  return redisInstance;
}

export { RedisClient };
export default getRedisClient;
