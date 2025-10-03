export = TDDCoverageTracker;
declare class TDDCoverageTracker {
    coverageThresholds: {
        minimum: number;
        branches: number;
        functions: number;
        lines: number;
        statements: number;
    };
    teamCoverage: {
        database: {
            current: number;
            target: number;
            tests: never[];
        };
        backend: {
            current: number;
            target: number;
            tests: never[];
        };
        frontend: {
            current: number;
            target: number;
            tests: never[];
        };
    };
    coverageHistory: any[];
    violations: any[];
    trackTeamCoverage(team: any, coverageData: any, testFiles?: any[]): Promise<{
        timestamp: string;
        team: any;
        total: any;
        branches: any;
        functions: any;
        lines: any;
        statements: any;
        testFiles: any[];
        filesCovered: any;
        totalFiles: any;
    }>;
    validateCoverageThresholds(team: any, coverage: any): Promise<{
        team: any;
        type: string;
        current: any;
        required: number;
        message: string;
    }[]>;
    generateDetailedReport(): {
        timestamp: string;
        summary: {
            totalTeams: number;
            compliantTeams: number;
            averageCoverage: number;
            totalViolations: number;
            status: string;
        };
        teams: {};
        violations: any[];
        trends: {};
        recommendations: never[];
    };
    analyzeCoverageTrends(): {};
    calculateTrend(teamName: any): "stable" | "improving" | "declining" | "insufficient_data";
    getLatestCoverageForTeam(teamName: any): any;
    generateTeamRecommendations(teamName: any, teamData: any, violations: any): string[];
    generateOverallRecommendations(report: any): string[];
    exportCoverageData(format?: string, filePath?: null): Promise<string>;
    convertToCsv(data: any): string;
    generateHtmlReport(data: any): string;
    reset(): void;
}
//# sourceMappingURL=tdd-coverage-tracker.d.ts.map