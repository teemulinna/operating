#!/usr/bin/env node
export = EmpiricalValidationRunner;
declare class EmpiricalValidationRunner {
    testResults: {
        database: boolean;
        api: boolean;
        frontend: boolean;
        integration: boolean;
        startTime: number;
    };
    runValidation(): Promise<void>;
    validateEnvironment(): Promise<void>;
    runEmpiricalProof(): Promise<any>;
    runBackendContractTests(): Promise<any>;
    runFrontendContractTests(): Promise<any>;
    generateValidationReport(): Promise<void>;
    generateVerdict(passed: any, total: any): "🏆 EXCEPTIONAL - Fully functional production system" | "✅ EXCELLENT - Real system with minor issues" | "⚠️  GOOD - Functional system with some components needing work" | "❌ NEEDS WORK - System has significant issues";
}
//# sourceMappingURL=run-empirical-validation.d.ts.map