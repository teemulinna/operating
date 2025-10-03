#!/usr/bin/env node
export class QATestOrchestrator {
    runAllTests(): Promise<void>;
    generateReport(): Promise<{
        summary: {
            totalTests: number;
            passedTests: number;
            failedTests: number;
            successRate: string;
            duration: string;
            timestamp: any;
        };
        testResults: {
            apiTests: never[];
            frontendTests: never[];
            performanceTests: never[];
            securityTests: never[];
            accessibilityTests: never[];
            totalTests: number;
            passedTests: number;
            failedTests: number;
            startTime: Date;
            endTime: null;
        };
        qualityGates: {
            allCrudOperations: boolean;
            responseTimeUnder100ms: boolean;
            noSecurityVulnerabilities: boolean;
            frontendAccessible: boolean;
        };
    }>;
}
export class APITestSuite {
    client: any;
    testHealthEndpoint(): Promise<void>;
    testEmployeesEndpoints(): Promise<void>;
    createdEmployeeId: any;
    testDepartmentsEndpoints(): Promise<void>;
    testSearchAndPagination(): Promise<void>;
    testErrorHandling(): Promise<void>;
    testConcurrentRequests(): Promise<void>;
    runAllTests(): Promise<void>;
}
export class PerformanceTestSuite {
    client: any;
    testResponseTimes(): Promise<void>;
    testLoadCapacity(): Promise<void>;
    testMemoryUsage(): Promise<void>;
    runAllTests(): Promise<void>;
}
export class SecurityTestSuite {
    client: any;
    testSQLInjection(): Promise<void>;
    testXSSProtection(): Promise<void>;
    testRateLimiting(): Promise<void>;
    testInputValidation(): Promise<void>;
    runAllTests(): Promise<void>;
}
export class FrontendTestSuite {
    testFrontendAvailability(): Promise<void>;
    testAPIIntegration(): Promise<void>;
    runAllTests(): Promise<void>;
}
//# sourceMappingURL=qa-comprehensive-test-suite.d.ts.map