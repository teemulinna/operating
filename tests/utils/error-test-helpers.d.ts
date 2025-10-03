import { QueryResult } from 'pg';
export declare class ErrorTestHelpers {
    static mockDatabaseConnectionError(errorType?: 'timeout' | 'refused' | 'reset' | 'unavailable'): import("jest-mock").SpiedFunction<(text: string, params?: any[]) => Promise<QueryResult>>;
    static mockDatabaseConstraintError(constraintType?: 'unique' | 'foreign_key' | 'not_null' | 'check'): import("jest-mock").SpiedFunction<(text: string, params?: any[]) => Promise<QueryResult>>;
    static mockSlowDatabaseResponse(delayMs?: number): import("jest-mock").SpiedFunction<(text: string, params?: any[]) => Promise<QueryResult>>;
    static mockIntermittentDatabaseFailure(failCount?: number): import("jest-mock").SpiedFunction<(text: string, params?: any[]) => Promise<QueryResult>>;
    static mockSelectiveDatabaseFailure(failurePatterns: string[]): import("jest-mock").SpiedFunction<(text: string, params?: any[]) => Promise<QueryResult>>;
    static generateMaliciousPayloads(): {
        sqlInjection: {
            firstName: string;
            lastName: string;
            email: string;
        };
        xssAttempts: {
            firstName: string;
            lastName: string;
            email: string;
        };
        oversizedData: {
            firstName: string;
            lastName: string;
            email: string;
            description: string;
        };
        nullBytes: {
            firstName: string;
            lastName: string;
            email: string;
        };
        specialCharacters: {
            firstName: string;
            lastName: string;
            email: string;
        };
        pathTraversal: {
            firstName: string;
            lastName: string;
            email: string;
        };
    };
    static validateErrorResponse(response: any, expectedStatus: number): any;
    static testConcurrentRequests(requestFn: () => Promise<any>, concurrency?: number): Promise<{
        total: number;
        successful: number;
        failed: number;
        successRate: number;
        results: PromiseSettledResult<any>[];
    }>;
    static mockMemoryPressure(): import("jest-mock").SpiedFunction<NodeJS.MemoryUsageFn>;
    static cleanupMocks(): void;
    static createTestData(scenario: 'valid' | 'invalid' | 'malicious' | 'oversized'): {
        firstName: string;
        lastName: string;
        email: string;
    } | {
        email: string;
        salary: string;
        firstName: string;
        lastName: string;
        position: string;
        departmentId: string;
    };
    static simulateNetworkConditions(condition: 'slow' | 'unstable' | 'disconnected'): (() => Promise<unknown>) | (() => Promise<void>) | (() => Promise<never>);
}
export declare const errorMatchers: {
    toBeValidErrorResponse: (received: any) => {
        message: () => string;
        pass: any;
    };
    toNotExposeSensitiveInfo: (received: any) => {
        message: () => string;
        pass: boolean;
    };
};
declare global {
    namespace jest {
        interface Matchers<R> {
            toBeValidErrorResponse(): R;
            toNotExposeSensitiveInfo(): R;
        }
    }
}
//# sourceMappingURL=error-test-helpers.d.ts.map