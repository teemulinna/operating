"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorMatchers = exports.ErrorTestHelpers = void 0;
const database_service_1 = require("../../src/database/database.service");
const globals_1 = require("@jest/globals");
class ErrorTestHelpers {
    static mockDatabaseConnectionError(errorType = 'timeout') {
        const dbService = database_service_1.DatabaseService.getInstance();
        const errorMap = {
            timeout: Object.assign(new Error('Connection timeout'), { code: 'ETIMEDOUT' }),
            refused: Object.assign(new Error('connect ECONNREFUSED'), { code: 'ECONNREFUSED' }),
            reset: Object.assign(new Error('Connection reset'), { code: 'ECONNRESET' }),
            unavailable: Object.assign(new Error('Connection terminated'), { code: '08006' })
        };
        return globals_1.jest.spyOn(dbService, 'query').mockImplementation(() => Promise.reject(errorMap[errorType]));
    }
    static mockDatabaseConstraintError(constraintType = 'unique') {
        const dbService = database_service_1.DatabaseService.getInstance();
        const errorMap = {
            unique: Object.assign(new Error('duplicate key value violates unique constraint "employees_email_key"'), { code: '23505' }),
            foreign_key: Object.assign(new Error('insert or update on table "employees" violates foreign key constraint'), { code: '23503' }),
            not_null: Object.assign(new Error('null value in column "email" violates not-null constraint'), { code: '23502' }),
            check: Object.assign(new Error('new row for relation "employees" violates check constraint'), { code: '23514' })
        };
        return globals_1.jest.spyOn(dbService, 'query').mockImplementation(() => Promise.reject(errorMap[constraintType]));
    }
    static mockSlowDatabaseResponse(delayMs = 5000) {
        const dbService = database_service_1.DatabaseService.getInstance();
        return globals_1.jest.spyOn(dbService, 'query').mockImplementation(() => new Promise((_, reject) => setTimeout(() => reject(new Error('Query timeout')), delayMs)));
    }
    static mockIntermittentDatabaseFailure(failCount = 2) {
        const dbService = database_service_1.DatabaseService.getInstance();
        let attempts = 0;
        return globals_1.jest.spyOn(dbService, 'query').mockImplementation(() => {
            attempts++;
            if (attempts <= failCount) {
                return Promise.reject(new Error('Transient database error'));
            }
            return Promise.resolve({ rows: [], rowCount: 0, command: 'SELECT', oid: 0, fields: [] });
        });
    }
    static mockSelectiveDatabaseFailure(failurePatterns) {
        const dbService = database_service_1.DatabaseService.getInstance();
        return globals_1.jest.spyOn(dbService, 'query').mockImplementation((query) => {
            const shouldFail = failurePatterns.some(pattern => query.toLowerCase().includes(pattern.toLowerCase()));
            if (shouldFail) {
                return Promise.reject(new Error(`Database error for query containing: ${failurePatterns.join(', ')}`));
            }
            return Promise.resolve({ rows: [], rowCount: 0, command: 'SELECT', oid: 0, fields: [] });
        });
    }
    static generateMaliciousPayloads() {
        return {
            sqlInjection: {
                firstName: "'; DROP TABLE employees; --",
                lastName: "Test' OR '1'='1",
                email: "test@example.com' UNION SELECT * FROM passwords --"
            },
            xssAttempts: {
                firstName: '<script>alert("xss")</script>',
                lastName: '<img src="x" onerror="alert(1)">',
                email: 'test@example.com<script>document.cookie</script>'
            },
            oversizedData: {
                firstName: 'A'.repeat(10000),
                lastName: 'B'.repeat(10000),
                email: 'test@example.com',
                description: 'C'.repeat(100000)
            },
            nullBytes: {
                firstName: 'Test\x00',
                lastName: 'User\x00\x00',
                email: 'test\x00@example.com'
            },
            specialCharacters: {
                firstName: '测试用户',
                lastName: 'Üser Tëst',
                email: 'tëst@ëxample.com'
            },
            pathTraversal: {
                firstName: '../../../etc/passwd',
                lastName: '..\\..\\windows\\system32',
                email: 'test@example.com'
            }
        };
    }
    static validateErrorResponse(response, expectedStatus) {
        expect(response.status).toBe(expectedStatus);
        expect(response.body).toHaveProperty('error');
        expect(response.body).toHaveProperty('timestamp');
        expect(response.body).toHaveProperty('path');
        expect(response.body.error).not.toContain('password');
        expect(response.body.error).not.toContain('secret');
        expect(response.body.error).not.toContain('token');
        expect(response.body.error).not.toContain('internal-');
        if (process.env.NODE_ENV === 'production') {
            expect(response.body).not.toHaveProperty('stack');
            expect(response.body.error).not.toContain('at Object.');
            expect(response.body.error).not.toContain('at Function.');
        }
        return response.body;
    }
    static async testConcurrentRequests(requestFn, concurrency = 10) {
        const requests = Array.from({ length: concurrency }, requestFn);
        const results = await Promise.allSettled(requests);
        const successful = results.filter(r => r.status === 'fulfilled').length;
        const failed = results.filter(r => r.status === 'rejected').length;
        return {
            total: concurrency,
            successful,
            failed,
            successRate: successful / concurrency,
            results
        };
    }
    static mockMemoryPressure() {
        const originalMemoryUsage = process.memoryUsage;
        return globals_1.jest.spyOn(process, 'memoryUsage').mockImplementation(() => ({
            rss: 1024 * 1024 * 1024 * 2,
            heapTotal: 1024 * 1024 * 1024,
            heapUsed: 1024 * 1024 * 900,
            external: 1024 * 1024 * 100,
            arrayBuffers: 1024 * 1024 * 50
        }));
    }
    static cleanupMocks() {
        globals_1.jest.restoreAllMocks();
    }
    static createTestData(scenario) {
        const baseData = {
            firstName: 'Test',
            lastName: 'User',
            email: 'test@example.com',
            position: 'Software Engineer',
            departmentId: '1',
            salary: 75000
        };
        switch (scenario) {
            case 'valid':
                return baseData;
            case 'invalid':
                return {
                    ...baseData,
                    email: 'invalid-email',
                    salary: 'not-a-number'
                };
            case 'malicious':
                return this.generateMaliciousPayloads().sqlInjection;
            case 'oversized':
                return this.generateMaliciousPayloads().oversizedData;
            default:
                return baseData;
        }
    }
    static simulateNetworkConditions(condition) {
        const conditions = {
            slow: () => new Promise(resolve => setTimeout(resolve, 2000)),
            unstable: () => Math.random() > 0.7 ? Promise.reject(new Error('Network unstable')) : Promise.resolve(),
            disconnected: () => Promise.reject(new Error('Network disconnected'))
        };
        return conditions[condition];
    }
}
exports.ErrorTestHelpers = ErrorTestHelpers;
exports.errorMatchers = {
    toBeValidErrorResponse: (received) => {
        const pass = (received &&
            typeof received.error === 'string' &&
            typeof received.timestamp === 'string' &&
            typeof received.path === 'string' &&
            !received.hasOwnProperty('stack'));
        return {
            message: () => `Expected ${received} to be a valid error response`,
            pass
        };
    },
    toNotExposeSensitiveInfo: (received) => {
        const sensitivePatterns = [
            /password/i,
            /secret/i,
            /token/i,
            /key/i,
            /internal-/i,
            /localhost/i,
            /127\.0\.0\.1/i,
            /\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/,
            /[a-f0-9]{32,}/,
        ];
        const errorText = JSON.stringify(received).toLowerCase();
        const exposedInfo = sensitivePatterns.filter(pattern => pattern.test(errorText));
        return {
            message: () => `Expected error response not to expose sensitive information. Found: ${exposedInfo.join(', ')}`,
            pass: exposedInfo.length === 0
        };
    }
};
//# sourceMappingURL=error-test-helpers.js.map