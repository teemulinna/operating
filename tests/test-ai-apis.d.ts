#!/usr/bin/env node
export function runAllTests(): Promise<boolean>;
export namespace testResults {
    let timestamp: string;
    namespace summary {
        let total: number;
        let passed: number;
        let failed: number;
        let errors: number;
    }
    let tests: never[];
}
//# sourceMappingURL=test-ai-apis.d.ts.map