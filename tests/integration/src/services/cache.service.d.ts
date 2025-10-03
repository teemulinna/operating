export const __esModule: boolean;
export const cacheService: any;
export class CacheService extends events_1<[never]> {
    static getInstance(config: any): any;
    constructor(config: any);
    cache: Map<any, any>;
    stats: {
        hits: number;
        misses: number;
        sets: number;
        deletes: number;
        evictions: number;
        size: number;
        memoryUsage: number;
    };
    cleanupInterval: NodeJS.Timeout | null;
    maxSize: any;
    defaultTTL: any;
    evictionPolicy: any;
    get(key: any): Promise<any>;
    set(key: any, value: any, ttl: any): Promise<void>;
    delete(pattern: any): Promise<number>;
    has(key: any): Promise<boolean>;
    clear(): Promise<void>;
    getOrSet(key: any, factory: any, ttl: any): Promise<any>;
    mget(keys: any): Promise<any[]>;
    mset(entries: any): Promise<void>;
    mdel(patterns: any): Promise<number>;
    expire(key: any, ttl: any): Promise<boolean>;
    persist(key: any): Promise<boolean>;
    ttl(key: any): Promise<number>;
    getStats(): {
        size: number;
        memoryUsage: number;
        hits: number;
        misses: number;
        sets: number;
        deletes: number;
        evictions: number;
    };
    keys(pattern: any): any[];
    size(): number;
    evict(): void;
    evictLRU(): any;
    evictLFU(): any;
    evictFIFO(): any;
    startCleanupInterval(intervalMs: any): void;
    cleanup(): void;
    destroy(): void;
    warmup(entries: any): Promise<void>;
    namespace(prefix: any): NamespacedCache;
    export(): Promise<{
        key: any;
        value: any;
        expires: any;
    }[]>;
    import(entries: any): Promise<void>;
}
export class NamespacedCache {
    constructor(cache: any, prefix: any);
    cache: any;
    prefix: any;
    getKey(key: any): string;
    get(key: any): Promise<any>;
    set(key: any, value: any, ttl: any): Promise<any>;
    delete(key: any): Promise<any>;
    has(key: any): Promise<any>;
    clear(): Promise<void>;
    getOrSet(key: any, factory: any, ttl: any): Promise<any>;
    keys(pattern: any): any;
}
import events_1 = require("events");
//# sourceMappingURL=cache.service.d.ts.map