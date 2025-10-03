export const __esModule: boolean;
export const globalCache: Cache;
export class Cache {
    static destroyAll(): void;
    static generateKey(namespace: any, ...parts: any[]): string;
    static cacheable(options?: {}): (target: any, propertyKey: any, descriptor: any) => any;
    memoryCache: Map<any, any>;
    redisClient: any;
    defaultTTL: number;
    cleanupInterval: NodeJS.Timeout | null;
    destroy(): void;
    get(key: any): Promise<any>;
    set(key: any, value: any, ttl: any): Promise<void>;
    delete(key: any): Promise<void>;
    clear(prefix: any): Promise<void>;
    has(key: any): Promise<boolean>;
    size(): number;
    startCleanupInterval(): void;
}
export namespace Cache {
    let instances: any[];
}
//# sourceMappingURL=cache.d.ts.map