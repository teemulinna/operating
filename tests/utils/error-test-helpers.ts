import { DatabaseService } from '../../src/database/database.service';
import { jest } from '@jest/globals';
import { QueryResult } from 'pg';

/**
 * Utility functions for testing error scenarios and failure modes
 */
export class ErrorTestHelpers {
  /**
   * Mock database connection errors
   */
  static mockDatabaseConnectionError(errorType: 'timeout' | 'refused' | 'reset' | 'unavailable' = 'timeout') {
    const dbService = DatabaseService.getInstance();

    const errorMap = {
      timeout: Object.assign(new Error('Connection timeout'), { code: 'ETIMEDOUT' }),
      refused: Object.assign(new Error('connect ECONNREFUSED'), { code: 'ECONNREFUSED' }),
      reset: Object.assign(new Error('Connection reset'), { code: 'ECONNRESET' }),
      unavailable: Object.assign(new Error('Connection terminated'), { code: '08006' })
    };

    return jest.spyOn(dbService, 'query').mockImplementation(() =>
      Promise.reject(errorMap[errorType])
    );
  }

  /**
   * Mock database constraint violations
   */
  static mockDatabaseConstraintError(constraintType: 'unique' | 'foreign_key' | 'not_null' | 'check' = 'unique') {
    const dbService = DatabaseService.getInstance();

    const errorMap = {
      unique: Object.assign(
        new Error('duplicate key value violates unique constraint "employees_email_key"'),
        { code: '23505' }
      ),
      foreign_key: Object.assign(
        new Error('insert or update on table "employees" violates foreign key constraint'),
        { code: '23503' }
      ),
      not_null: Object.assign(
        new Error('null value in column "email" violates not-null constraint'),
        { code: '23502' }
      ),
      check: Object.assign(
        new Error('new row for relation "employees" violates check constraint'),
        { code: '23514' }
      )
    };

    return jest.spyOn(dbService, 'query').mockImplementation(() =>
      Promise.reject(errorMap[constraintType])
    );
  }

  /**
   * Mock slow database responses (for timeout testing)
   */
  static mockSlowDatabaseResponse(delayMs: number = 5000) {
    const dbService = DatabaseService.getInstance();

    return jest.spyOn(dbService, 'query').mockImplementation(() =>
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Query timeout')), delayMs)
      )
    );
  }

  /**
   * Mock intermittent database failures (succeeds after N failures)
   */
  static mockIntermittentDatabaseFailure(failCount: number = 2) {
    const dbService = DatabaseService.getInstance();
    let attempts = 0;

    return jest.spyOn(dbService, 'query').mockImplementation(() => {
      attempts++;
      if (attempts <= failCount) {
        return Promise.reject(new Error('Transient database error'));
      }
      return Promise.resolve({ rows: [], rowCount: 0, command: 'SELECT', oid: 0, fields: [] } as QueryResult);
    });
  }

  /**
   * Mock selective database failures (fail specific queries)
   */
  static mockSelectiveDatabaseFailure(failurePatterns: string[]) {
    const dbService = DatabaseService.getInstance();

    return jest.spyOn(dbService, 'query').mockImplementation((query: string) => {
      const shouldFail = failurePatterns.some(pattern =>
        query.toLowerCase().includes(pattern.toLowerCase())
      );

      if (shouldFail) {
        return Promise.reject(new Error(`Database error for query containing: ${failurePatterns.join(', ')}`));
      }

      return Promise.resolve({ rows: [], rowCount: 0, command: 'SELECT', oid: 0, fields: [] } as QueryResult);
    });
  }

  /**
   * Generate test payloads for various attack scenarios
   */
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

  /**
   * Validate error response structure
   */
  static validateErrorResponse(response: any, expectedStatus: number) {
    expect(response.status).toBe(expectedStatus);
    expect(response.body).toHaveProperty('error');
    expect(response.body).toHaveProperty('timestamp');
    expect(response.body).toHaveProperty('path');

    // Ensure no sensitive information is exposed
    expect(response.body.error).not.toContain('password');
    expect(response.body.error).not.toContain('secret');
    expect(response.body.error).not.toContain('token');
    expect(response.body.error).not.toContain('internal-');

    // Ensure stack traces are not exposed in production
    if (process.env.NODE_ENV === 'production') {
      expect(response.body).not.toHaveProperty('stack');
      expect(response.body.error).not.toContain('at Object.');
      expect(response.body.error).not.toContain('at Function.');
    }

    return response.body;
  }

  /**
   * Test concurrent request handling
   */
  static async testConcurrentRequests(requestFn: () => Promise<any>, concurrency: number = 10) {
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

  /**
   * Mock memory pressure scenarios
   */
  static mockMemoryPressure() {
    const originalMemoryUsage = process.memoryUsage;

    return jest.spyOn(process, 'memoryUsage').mockImplementation(() => ({
      rss: 1024 * 1024 * 1024 * 2, // 2GB
      heapTotal: 1024 * 1024 * 1024, // 1GB
      heapUsed: 1024 * 1024 * 900, // 900MB (90% heap usage)
      external: 1024 * 1024 * 100, // 100MB
      arrayBuffers: 1024 * 1024 * 50 // 50MB
    }));
  }

  /**
   * Clean up all mocks
   */
  static cleanupMocks() {
    jest.restoreAllMocks();
  }

  /**
   * Create test data for error scenarios
   */
  static createTestData(scenario: 'valid' | 'invalid' | 'malicious' | 'oversized') {
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

  /**
   * Simulate network conditions
   */
  static simulateNetworkConditions(condition: 'slow' | 'unstable' | 'disconnected') {
    // This would typically integrate with a network simulation library
    // For now, we'll use timeouts and random failures

    const conditions = {
      slow: () => new Promise(resolve => setTimeout(resolve, 2000)),
      unstable: () => Math.random() > 0.7 ? Promise.reject(new Error('Network unstable')) : Promise.resolve(),
      disconnected: () => Promise.reject(new Error('Network disconnected'))
    };

    return conditions[condition];
  }
}

/**
 * Custom Jest matchers for error testing
 */
export const errorMatchers = {
  toBeValidErrorResponse: (received: any) => {
    const pass = (
      received &&
      typeof received.error === 'string' &&
      typeof received.timestamp === 'string' &&
      typeof received.path === 'string' &&
      !received.hasOwnProperty('stack') // No stack traces in responses
    );

    return {
      message: () => `Expected ${received} to be a valid error response`,
      pass
    };
  },

  toNotExposeSensitiveInfo: (received: any) => {
    const sensitivePatterns = [
      /password/i,
      /secret/i,
      /token/i,
      /key/i,
      /internal-/i,
      /localhost/i,
      /127\.0\.0\.1/i,
      /\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/, // IP addresses
      /[a-f0-9]{32,}/, // Long hex strings (potential hashes/tokens)
    ];

    const errorText = JSON.stringify(received).toLowerCase();
    const exposedInfo = sensitivePatterns.filter(pattern => pattern.test(errorText));

    return {
      message: () => `Expected error response not to expose sensitive information. Found: ${exposedInfo.join(', ')}`,
      pass: exposedInfo.length === 0
    };
  }
};

// Extend Jest matchers
declare global {
  namespace jest {
    interface Matchers<R> {
      toBeValidErrorResponse(): R;
      toNotExposeSensitiveInfo(): R;
    }
  }
}