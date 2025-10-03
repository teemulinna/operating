/**
 * Cache utility for production-ready caching with Redis support
 * Following plan.md line 43: Caching abstraction (memory + Redis optional)
 */

import { promisify } from 'util';

interface CacheOptions {
  ttl?: number; // Time to live in seconds
  prefix?: string;
}

interface CacheEntry<T> {
  value: T;
  expires: number;
}

/**
 * Production-ready cache implementation
 * Starts with in-memory, Redis-ready architecture
 */
export class Cache {
  private memoryCache: Map<string, CacheEntry<any>> = new Map();
  private redisClient: any = null; // Will be initialized when Redis is configured
  private readonly defaultTTL = 300; // 5 minutes default
  private cleanupInterval: NodeJS.Timeout | null = null;
  private static instances: Cache[] = [];

  constructor() {
    // Track all instances for cleanup
    Cache.instances.push(this);

    // Start cleanup interval for expired entries
    this.startCleanupInterval();

    // Redis will be initialized later per plan.md line 221
    // "Start with HTTP caching + React Query; add Redis later"
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.memoryCache.clear();

    // Remove from instances array
    const index = Cache.instances.indexOf(this);
    if (index > -1) {
      Cache.instances.splice(index, 1);
    }
  }

  /**
   * Clean up all cache instances (for testing)
   */
  static destroyAll(): void {
    Cache.instances.forEach(instance => instance.destroy());
    Cache.instances = [];
  }

  /**
   * Get value from cache
   */
  async get<T>(key: string): Promise<T | null> {
    // Check memory cache first
    const entry = this.memoryCache.get(key);

    if (entry) {
      if (Date.now() < entry.expires) {
        return entry.value as T;
      } else {
        // Remove expired entry
        this.memoryCache.delete(key);
      }
    }

    // Future: Check Redis if configured
    if (this.redisClient) {
      // Redis implementation placeholder
    }

    return null;
  }

  /**
   * Set value in cache with TTL
   */
  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    const expirationTime = Date.now() + (ttl || this.defaultTTL) * 1000;

    this.memoryCache.set(key, {
      value,
      expires: expirationTime
    });

    // Future: Also set in Redis if configured
    if (this.redisClient) {
      // Redis implementation placeholder
    }
  }

  /**
   * Delete specific key from cache
   */
  async delete(key: string): Promise<void> {
    this.memoryCache.delete(key);

    // Future: Also delete from Redis if configured
    if (this.redisClient) {
      // Redis implementation placeholder
    }
  }

  /**
   * Clear all entries with given prefix
   */
  async clear(prefix?: string): Promise<void> {
    if (prefix) {
      // Clear only keys with prefix
      const keysToDelete: string[] = [];
      for (const key of this.memoryCache.keys()) {
        if (key.startsWith(prefix)) {
          keysToDelete.push(key);
        }
      }
      keysToDelete.forEach(key => this.memoryCache.delete(key));
    } else {
      // Clear all
      this.memoryCache.clear();
    }

    // Future: Also clear from Redis if configured
    if (this.redisClient) {
      // Redis implementation placeholder
    }
  }

  /**
   * Check if key exists in cache
   */
  async has(key: string): Promise<boolean> {
    const value = await this.get(key);
    return value !== null;
  }

  /**
   * Get cache size
   */
  size(): number {
    return this.memoryCache.size;
  }

  /**
   * Cleanup expired entries periodically
   */
  private startCleanupInterval(): void {
    // Only start interval if not in test environment
    if (process.env.NODE_ENV !== 'test') {
      this.cleanupInterval = setInterval(() => {
        const now = Date.now();
        const keysToDelete: string[] = [];

        for (const [key, entry] of this.memoryCache.entries()) {
          if (now >= entry.expires) {
            keysToDelete.push(key);
          }
        }

        keysToDelete.forEach(key => this.memoryCache.delete(key));
      }, 60000); // Cleanup every minute
    }
  }

  /**
   * Generate cache key with namespace
   */
  static generateKey(namespace: string, ...parts: (string | number)[]): string {
    return `${namespace}:${parts.join(':')}`;
  }

  /**
   * Decorator for caching method results
   */
  static cacheable(options: CacheOptions = {}) {
    return function(target: any, propertyKey: string, descriptor: PropertyDescriptor) {
      const originalMethod = descriptor.value;
      const cache = new Cache();

      descriptor.value = async function(...args: any[]) {
        const cacheKey = Cache.generateKey(
          options.prefix || target.constructor.name,
          propertyKey,
          ...args.map(arg => JSON.stringify(arg))
        );

        // Check cache first
        const cached = await cache.get(cacheKey);
        if (cached !== null) {
          return cached;
        }

        // Execute method and cache result
        const result = await originalMethod.apply(this, args);
        await cache.set(cacheKey, result, options.ttl);

        return result;
      };

      return descriptor;
    };
  }
}

// Singleton instance for global cache
export const globalCache = new Cache();