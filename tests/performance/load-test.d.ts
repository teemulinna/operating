export = PerformanceValidator;
declare class PerformanceValidator {
    baseUrl: string;
    results: {};
    industryBenchmarks: {
        averageResponseTime: number;
        throughput: number;
        p99Latency: number;
        errorRate: number;
        concurrentUsers: number;
    };
    runComprehensiveLoadTest(): Promise<{
        timestamp: string;
        executionEnvironment: {
            nodeVersion: string;
            platform: NodeJS.Platform;
            arch: NodeJS.Architecture;
        };
        industryBenchmarks: {
            averageResponseTime: number;
            throughput: number;
            p99Latency: number;
            errorRate: number;
            concurrentUsers: number;
        };
        testResults: any;
        overallPerformance: {
            totalRequests: any;
            averageLatency: number;
            peakThroughput: number;
            peakRPS: number;
            averageErrorRate: number;
            testDuration: any;
            performanceGrade: string;
        };
        empiricalEvidence: string[];
        redditDoubterProof: {
            title: string;
            claims_refuted: string[];
            concrete_metrics: {
                average_response_time: string;
                peak_throughput: string;
                total_requests_handled: any;
                error_rate: string;
                concurrent_connections: number;
                test_duration: string;
                performance_grade: any;
            };
            industry_comparison: {
                response_time_improvement: string;
                throughput_improvement: string;
            };
            technical_evidence: {
                database_operations: string;
                backend_architecture: string;
                frontend_integration: string;
                monitoring_stack: string;
                security_measures: string;
            };
        };
    }>;
    runLoadTest(config: any): Promise<any>;
    generateEmpiricalReport(results: any): {
        timestamp: string;
        executionEnvironment: {
            nodeVersion: string;
            platform: NodeJS.Platform;
            arch: NodeJS.Architecture;
        };
        industryBenchmarks: {
            averageResponseTime: number;
            throughput: number;
            p99Latency: number;
            errorRate: number;
            concurrentUsers: number;
        };
        testResults: any;
        overallPerformance: {
            totalRequests: any;
            averageLatency: number;
            peakThroughput: number;
            peakRPS: number;
            averageErrorRate: number;
            testDuration: any;
            performanceGrade: string;
        };
        empiricalEvidence: string[];
        redditDoubterProof: {
            title: string;
            claims_refuted: string[];
            concrete_metrics: {
                average_response_time: string;
                peak_throughput: string;
                total_requests_handled: any;
                error_rate: string;
                concurrent_connections: number;
                test_duration: string;
                performance_grade: any;
            };
            industry_comparison: {
                response_time_improvement: string;
                throughput_improvement: string;
            };
            technical_evidence: {
                database_operations: string;
                backend_architecture: string;
                frontend_integration: string;
                monitoring_stack: string;
                security_measures: string;
            };
        };
    };
    calculateOverallPerformance(results: any): {
        totalRequests: any;
        averageLatency: number;
        peakThroughput: number;
        peakRPS: number;
        averageErrorRate: number;
        testDuration: any;
        performanceGrade: string;
    };
    calculatePerformanceGrade(avgLatency: any, maxRps: any, errorRate: any): "A+ (Exceptional)" | "A (Excellent)" | "B (Good)" | "C (Average)" | "D (Below Average)";
    generateEvidenceProof(summary: any): string[];
    generateRedditProof(summary: any, results: any): {
        title: string;
        claims_refuted: string[];
        concrete_metrics: {
            average_response_time: string;
            peak_throughput: string;
            total_requests_handled: any;
            error_rate: string;
            concurrent_connections: number;
            test_duration: string;
            performance_grade: any;
        };
        industry_comparison: {
            response_time_improvement: string;
            throughput_improvement: string;
        };
        technical_evidence: {
            database_operations: string;
            backend_architecture: string;
            frontend_integration: string;
            monitoring_stack: string;
            security_measures: string;
        };
    };
    saveReport(report: any): void;
    saveCsvReport(report: any, dir: any): void;
    printReport(report: any): void;
    sleep(ms: any): Promise<any>;
}
//# sourceMappingURL=load-test.d.ts.map