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
export declare class SecurityTestUtils {
    private static readonly DEFAULT_JWT_SECRET;
    static readonly USERS: {
        admin: {
            id: string;
            email: string;
            role: string;
        };
        manager: {
            id: string;
            email: string;
            role: string;
        };
        user: {
            id: string;
            email: string;
            role: string;
        };
        guest: {
            id: string;
            email: string;
            role: string;
        };
    };
    static readonly MALICIOUS_PAYLOADS: {
        sql: string[];
        xss: string[];
        injection: string[];
        command: string[];
        xxe: string[];
        ldap: string[];
        nosql: string[];
    };
    static generateTestToken(user: TestUser, secret?: string, options?: any): string;
    static generateExpiredToken(user: TestUser, secret?: string): string;
    static generateInvalidSignatureToken(user: TestUser): string;
    static generateMalformedToken(): string;
    static generateTamperedToken(user: TestUser, secret?: string): string;
    static createAttackPayloads(basePayload: any, field: string, attackType: keyof typeof SecurityTestUtils.MALICIOUS_PAYLOADS): any[];
    static validateResponseSafety(responseBody: any): boolean;
    static generateSafeTestData(): any;
    static createRateLimitTestRequests(requestFunction: () => Promise<any>, count: number): Promise<any>[];
    static measureResponseTime(requestFunction: () => Promise<any>): Promise<{
        response: any;
        duration: number;
    }>;
    static validateSecurityHeaders(headers: any): {
        valid: boolean;
        missing: string[];
    };
    static generateTestUUID(): string;
    static generateInvalidUUIDs(): string[];
    static createBoundaryTestData(): any[];
    static generateTestIPs(count: number): string[];
    static createCORSTestScenarios(): Array<{
        origin: string;
        shouldAllow: boolean;
    }>;
    static generateInputValidationTests(): Array<{
        input: any;
        expectValid: boolean;
        description: string;
    }>;
    static createPrivilegeEscalationTests(): Array<{
        user: TestUser;
        action: string;
        expectAllowed: boolean;
    }>;
    static cleanup(): Promise<void>;
    static generateSecurityTestReport(results: any[]): string;
}
export declare class SecurityAssertions {
    static assertNoXSS(responseBody: any): void;
    static assertNoSQLLeakage(responseBody: any): void;
    static assertSecurityHeaders(headers: any): void;
    static assertResponseTime(duration: number, maxDuration?: number): void;
    static assertNoSensitiveData(responseBody: any): void;
}
export default SecurityTestUtils;
//# sourceMappingURL=security-utils.d.ts.map