export interface ConcurrencyTestConfig {
    userCount: number;
    performanceThreshold: number;
    retryAttempts: number;
    loadTestIterations: number;
    operationTimeout: number;
}
export declare const DEFAULT_CONCURRENCY_CONFIG: ConcurrencyTestConfig;
export interface OperationResult<T = any> {
    result?: T;
    error?: Error;
    responseTime: number;
    timestamp: number;
}
export interface ConcurrencyMetrics {
    successCount: number;
    errorCount: number;
    averageResponseTime: number;
    maxResponseTime: number;
    minResponseTime: number;
    errors: Error[];
    successRate: number;
    throughput: number;
    operations: OperationResult[];
}
export declare function executeConcurrentOperation<T>(operation: () => Promise<T>, config?: Partial<ConcurrencyTestConfig>): Promise<ConcurrencyMetrics>;
export declare function simulateThinkTime(minMs?: number, maxMs?: number): Promise<void>;
export declare function executeLoadTest<T>(operation: () => Promise<T>, config: {
    startUsers: number;
    endUsers: number;
    rampUpTimeMs: number;
    testDurationMs: number;
    operationIntervalMs?: number;
}): Promise<{
    metrics: ConcurrencyMetrics[];
    summary: {
        totalOperations: number;
        totalErrors: number;
        averageThroughput: number;
        peakThroughput: number;
    };
}>;
export declare function retryWithBackoff<T>(operation: () => Promise<T>, maxAttempts?: number, baseDelayMs?: number): Promise<T>;
export declare class ResourceMonitor {
    private metrics;
    private intervalId;
    private startCpuUsage?;
    start(intervalMs?: number): void;
    stop(): {
        duration: number;
        samples: number;
        peakMemoryMB: number;
        averageMemoryMB: number;
        totalCpuMs: number;
    };
    getMetrics(): {
        timestamp: number;
        memoryUsage: NodeJS.MemoryUsage;
        cpuUsage?: NodeJS.CpuUsage;
    }[];
}
export declare class TestConnectionPool {
    private db;
    private connections;
    private activeConnections;
    private maxConnections;
    constructor(db: any, maxConnections?: number);
    getConnection(): Promise<any>;
    releaseConnection(connection: any): void;
    closeAll(): Promise<void>;
    getStats(): {
        totalConnections: number;
        activeConnections: number;
        pooledConnections: number;
        maxConnections: number;
    };
}
export declare class ConcurrencyTestDataGenerator {
    static generateUsers(count: number): Array<{
        id: string;
        name: string;
        email: string;
        role: 'manager' | 'admin' | 'employee';
    }>;
    static generateProjects(count: number): Array<{
        name: string;
        description: string;
        startDate: string;
        endDate: string;
        budget: number;
        status: string;
    }>;
    static generateEmployees(count: number, departmentId: string): Array<{
        name: string;
        email: string;
        departmentId: string;
        capacity: number;
        skills?: string[];
    }>;
    static generateResourceAllocations(employees: Array<{
        id: string;
    }>, projects: Array<{
        id: string;
    }>, count: number): Array<{
        employeeId: string;
        projectId: string;
        startDate: string;
        endDate: string;
        hoursPerWeek: number;
        role: string;
    }>;
}
export declare class PerformanceAssertions {
    static assertResponseTime(metrics: ConcurrencyMetrics, maxMs: number, message?: string): void;
    static assertSuccessRate(metrics: ConcurrencyMetrics, minRate: number, message?: string): void;
    static assertThroughput(metrics: ConcurrencyMetrics, minOpsPerSecond: number, message?: string): void;
    static assertNoDeadlocks(metrics: ConcurrencyMetrics): void;
    static assertDataConsistency<T>(beforeState: T, afterState: T, validator: (before: T, after: T) => boolean, message?: string): void;
}
//# sourceMappingURL=concurrency-helpers.d.ts.map