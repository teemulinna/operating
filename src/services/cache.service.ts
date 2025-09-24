import { EventEmitter } from 'events';
import { logger } from '../utils/logger';

// ============================================
// CACHE SERVICE - PRODUCTION-READY
// ============================================

interface CacheEntry<T = any> {
  value: T;
  expires: number;
  hits: number;
  createdAt: number;
  lastAccessed: number;
}

interface CacheStats {
  hits: number;
  misses: number;
  sets: number;
  deletes: number;
  evictions: number;
  size: number;
  memoryUsage: number;
}

export class CacheService extends EventEmitter {
  private static instance: CacheService;
  private cache = new Map<string, CacheEntry>();
  private stats: CacheStats = {
    hits: 0,
    misses: 0,
    sets: 0,
    deletes: 0,
    evictions: 0,
    size: 0,
    memoryUsage: 0
  };

  private readonly maxSize: number;
  private readonly defaultTTL: number;
  private readonly evictionPolicy: 'LRU' | 'LFU' | 'FIFO';
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor(config?: {
    maxSize?: number;
    defaultTTL?: number;
    evictionPolicy?: 'LRU' | 'LFU' | 'FIFO';
    cleanupIntervalMs?: number;
  }) {
    super();
    this.maxSize = config?.maxSize || 1000;
    this.defaultTTL = config?.defaultTTL || 3600; // 1 hour default
    this.evictionPolicy = config?.evictionPolicy || 'LRU';

    // Start cleanup interval
    const cleanupIntervalMs = config?.cleanupIntervalMs || 60000; // 1 minute default
    this.startCleanupInterval(cleanupIntervalMs);

    logger.info('Cache service initialized', {
      maxSize: this.maxSize,
      defaultTTL: this.defaultTTL,
      evictionPolicy: this.evictionPolicy
    });
  }

  public static getInstance(config?: any): CacheService {
    if (!CacheService.instance) {
      CacheService.instance = new CacheService(config);
    }
    return CacheService.instance;
  }

  // ============================================
  // CORE OPERATIONS
  // ============================================

  /**
   * Get a value from cache
   */
  async get<T = any>(key: string): Promise<T | null> {
    const entry = this.cache.get(key);

    if (!entry) {
      this.stats.misses++;
      this.emit('miss', key);
      return null;
    }

    // Check if expired
    if (entry.expires > 0 && Date.now() > entry.expires) {
      this.cache.delete(key);
      this.stats.misses++;
      this.emit('expired', key);
      return null;
    }

    // Update access metadata
    entry.hits++;
    entry.lastAccessed = Date.now();

    this.stats.hits++;
    this.emit('hit', key);

    return entry.value as T;
  }

  /**
   * Set a value in cache with optional TTL
   */
  async set<T = any>(key: string, value: T, ttl?: number): Promise<void> {
    // Check if we need to evict
    if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
      this.evict();
    }

    const expires = ttl
      ? Date.now() + (ttl * 1000)
      : this.defaultTTL > 0
        ? Date.now() + (this.defaultTTL * 1000)
        : 0;

    const now = Date.now();
    this.cache.set(key, {
      value,
      expires,
      hits: 0,
      createdAt: now,
      lastAccessed: now
    });

    this.stats.sets++;
    this.stats.size = this.cache.size;
    this.emit('set', key, value);
  }

  /**
   * Delete a value from cache
   */
  async delete(pattern: string): Promise<number> {
    let deleted = 0;

    // Support wildcard patterns
    if (pattern.includes('*')) {
      const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
      for (const key of this.cache.keys()) {
        if (regex.test(key)) {
          this.cache.delete(key);
          deleted++;
        }
      }
    } else {
      if (this.cache.delete(pattern)) {
        deleted = 1;
      }
    }

    this.stats.deletes += deleted;
    this.stats.size = this.cache.size;
    this.emit('delete', pattern, deleted);

    return deleted;
  }

  /**
   * Check if key exists in cache
   */
  async has(key: string): Promise<boolean> {
    const entry = this.cache.get(key);
    if (!entry) return false;

    // Check if expired
    if (entry.expires > 0 && Date.now() > entry.expires) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  /**
   * Clear all cache entries
   */
  async clear(): Promise<void> {
    const size = this.cache.size;
    this.cache.clear();
    this.stats.size = 0;
    this.emit('clear', size);
    logger.info(`Cache cleared: ${size} entries removed`);
  }

  /**
   * Get or set a value (cache-aside pattern)
   */
  async getOrSet<T = any>(
    key: string,
    factory: () => Promise<T> | T,
    ttl?: number
  ): Promise<T> {
    // Try to get from cache first
    const cached = await this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    // Generate value using factory
    const value = await factory();

    // Store in cache
    await this.set(key, value, ttl);

    return value;
  }

  // ============================================
  // BULK OPERATIONS
  // ============================================

  /**
   * Get multiple values
   */
  async mget<T = any>(keys: string[]): Promise<(T | null)[]> {
    return Promise.all(keys.map(key => this.get<T>(key)));
  }

  /**
   * Set multiple values
   */
  async mset(entries: Array<{ key: string; value: any; ttl?: number }>): Promise<void> {
    for (const entry of entries) {
      await this.set(entry.key, entry.value, entry.ttl);
    }
  }

  /**
   * Delete multiple values
   */
  async mdel(patterns: string[]): Promise<number> {
    let totalDeleted = 0;
    for (const pattern of patterns) {
      totalDeleted += await this.delete(pattern);
    }
    return totalDeleted;
  }

  // ============================================
  // TTL OPERATIONS
  // ============================================

  /**
   * Update TTL for a key
   */
  async expire(key: string, ttl: number): Promise<boolean> {
    const entry = this.cache.get(key);
    if (!entry) return false;

    entry.expires = Date.now() + (ttl * 1000);
    return true;
  }

  /**
   * Remove TTL (make persistent)
   */
  async persist(key: string): Promise<boolean> {
    const entry = this.cache.get(key);
    if (!entry) return false;

    entry.expires = 0;
    return true;
  }

  /**
   * Get remaining TTL for a key
   */
  async ttl(key: string): Promise<number> {
    const entry = this.cache.get(key);
    if (!entry) return -2; // Key doesn't exist

    if (entry.expires === 0) return -1; // No expiration

    const remaining = Math.max(0, entry.expires - Date.now());
    return Math.ceil(remaining / 1000);
  }

  // ============================================
  // CACHE MANAGEMENT
  // ============================================

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    // Calculate memory usage (approximate)
    let memoryUsage = 0;
    for (const [key, entry] of this.cache.entries()) {
      memoryUsage += key.length * 2; // String chars are 2 bytes
      memoryUsage += JSON.stringify(entry.value).length * 2;
      memoryUsage += 40; // Overhead for entry metadata
    }

    return {
      ...this.stats,
      size: this.cache.size,
      memoryUsage
    };
  }

  /**
   * Get keys matching a pattern
   */
  keys(pattern?: string): string[] {
    const keys = Array.from(this.cache.keys());

    if (!pattern) return keys;

    const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
    return keys.filter(key => regex.test(key));
  }

  /**
   * Get cache size
   */
  size(): number {
    return this.cache.size;
  }

  // ============================================
  // EVICTION STRATEGIES
  // ============================================

  private evict(): void {
    let keyToEvict: string | null = null;

    switch (this.evictionPolicy) {
      case 'LRU':
        keyToEvict = this.evictLRU();
        break;
      case 'LFU':
        keyToEvict = this.evictLFU();
        break;
      case 'FIFO':
        keyToEvict = this.evictFIFO();
        break;
    }

    if (keyToEvict) {
      this.cache.delete(keyToEvict);
      this.stats.evictions++;
      this.emit('evict', keyToEvict);
    }
  }

  private evictLRU(): string | null {
    let oldestKey: string | null = null;
    let oldestAccess = Infinity;

    for (const [key, entry] of this.cache.entries()) {
      if (entry.lastAccessed < oldestAccess) {
        oldestAccess = entry.lastAccessed;
        oldestKey = key;
      }
    }

    return oldestKey;
  }

  private evictLFU(): string | null {
    let leastUsedKey: string | null = null;
    let leastHits = Infinity;

    for (const [key, entry] of this.cache.entries()) {
      if (entry.hits < leastHits) {
        leastHits = entry.hits;
        leastUsedKey = key;
      }
    }

    return leastUsedKey;
  }

  private evictFIFO(): string | null {
    let oldestKey: string | null = null;
    let oldestCreated = Infinity;

    for (const [key, entry] of this.cache.entries()) {
      if (entry.createdAt < oldestCreated) {
        oldestCreated = entry.createdAt;
        oldestKey = key;
      }
    }

    return oldestKey;
  }

  // ============================================
  // CLEANUP & MAINTENANCE
  // ============================================

  private startCleanupInterval(intervalMs: number): void {
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, intervalMs);

    // Ensure cleanup is unrefed so it doesn't keep process alive
    if (this.cleanupInterval.unref) {
      this.cleanupInterval.unref();
    }
  }

  private cleanup(): void {
    let expired = 0;
    const now = Date.now();

    for (const [key, entry] of this.cache.entries()) {
      if (entry.expires > 0 && now > entry.expires) {
        this.cache.delete(key);
        expired++;
      }
    }

    if (expired > 0) {
      this.stats.size = this.cache.size;
      logger.debug(`Cache cleanup: ${expired} expired entries removed`);
    }
  }

  /**
   * Destroy cache service and cleanup
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }

    this.cache.clear();
    this.removeAllListeners();
    CacheService.instance = null as any;

    logger.info('Cache service destroyed');
  }

  // ============================================
  // ADVANCED FEATURES
  // ============================================

  /**
   * Warm up cache with preloaded data
   */
  async warmup(entries: Array<{ key: string; value: any; ttl?: number }>): Promise<void> {
    logger.info(`Warming up cache with ${entries.length} entries`);

    for (const entry of entries) {
      await this.set(entry.key, entry.value, entry.ttl);
    }

    this.emit('warmup', entries.length);
  }

  /**
   * Create a namespace-scoped cache interface
   */
  namespace(prefix: string): NamespacedCache {
    return new NamespacedCache(this, prefix);
  }

  /**
   * Export cache contents for backup
   */
  async export(): Promise<Array<{ key: string; value: any; expires: number }>> {
    const entries = [];
    const now = Date.now();

    for (const [key, entry] of this.cache.entries()) {
      // Skip expired entries
      if (entry.expires > 0 && now > entry.expires) continue;

      entries.push({
        key,
        value: entry.value,
        expires: entry.expires
      });
    }

    return entries;
  }

  /**
   * Import cache contents from backup
   */
  async import(entries: Array<{ key: string; value: any; expires: number }>): Promise<void> {
    const now = Date.now();

    for (const entry of entries) {
      // Skip already expired entries
      if (entry.expires > 0 && entry.expires < now) continue;

      // Calculate remaining TTL
      const ttl = entry.expires > 0 ? Math.ceil((entry.expires - now) / 1000) : 0;

      await this.set(entry.key, entry.value, ttl);
    }

    logger.info(`Imported ${entries.length} cache entries`);
  }
}

// ============================================
// NAMESPACED CACHE
// ============================================

export class NamespacedCache {
  constructor(
    private cache: CacheService,
    private prefix: string
  ) {}

  private getKey(key: string): string {
    return `${this.prefix}:${key}`;
  }

  async get<T = any>(key: string): Promise<T | null> {
    return this.cache.get<T>(this.getKey(key));
  }

  async set<T = any>(key: string, value: T, ttl?: number): Promise<void> {
    return this.cache.set(this.getKey(key), value, ttl);
  }

  async delete(key: string): Promise<number> {
    return this.cache.delete(this.getKey(key));
  }

  async has(key: string): Promise<boolean> {
    return this.cache.has(this.getKey(key));
  }

  async clear(): Promise<void> {
    const deleted = await this.cache.delete(`${this.prefix}:*`);
    logger.debug(`Cleared ${deleted} entries from namespace ${this.prefix}`);
  }

  async getOrSet<T = any>(
    key: string,
    factory: () => Promise<T> | T,
    ttl?: number
  ): Promise<T> {
    return this.cache.getOrSet(this.getKey(key), factory, ttl);
  }

  keys(pattern?: string): string[] {
    const fullPattern = pattern ? `${this.prefix}:${pattern}` : `${this.prefix}:*`;
    const keys = this.cache.keys(fullPattern);
    const prefixLength = this.prefix.length + 1;
    return keys.map(key => key.substring(prefixLength));
  }
}

// Export singleton instance
export const cacheService = CacheService.getInstance();