export const __esModule: boolean;
export class AnalyticsService {
    static initialize(pool: any): void;
    static getTeamUtilizationData(filters?: {}): Promise<{
        data: any;
        metadata: {
            generatedAt: Date;
            dataPoints: any;
            dateRange: {
                from: any;
                to: any;
            };
            filters: {};
            processingTimeMs: number;
        };
    }>;
    static getCapacityTrends(filters?: {}): Promise<{
        data: any;
        metadata: {
            generatedAt: Date;
            dataPoints: any;
            dateRange: {
                from: any;
                to: any;
            };
            filters: {};
            processingTimeMs: number;
        };
    }>;
    static getResourceAllocationMetrics(filters?: {}): Promise<{
        data: {
            totalEmployees: number;
            totalDepartments: number;
            averageUtilizationAcrossCompany: number;
            overutilizedEmployees: number;
            underutilizedEmployees: number;
            criticalResourceGaps: any;
            topPerformingDepartments: any;
            capacityForecast: {
                period: Date;
                predictedDemand: number;
                availableCapacity: number;
                capacityGap: number;
                recommendedActions: string[];
                confidence: number;
            }[];
        };
        metadata: {
            generatedAt: Date;
            dataPoints: number;
            dateRange: {
                from: any;
                to: any;
            };
            filters: {};
            processingTimeMs: number;
        };
    }>;
    static getSkillGapAnalysis(filters?: {}): Promise<{
        data: any;
        metadata: {
            generatedAt: Date;
            dataPoints: any;
            dateRange: {
                from: any;
                to: any;
            };
            filters: {};
            processingTimeMs: number;
        };
    }>;
    static getDepartmentPerformance(filters?: {}): Promise<{
        data: any;
        metadata: {
            generatedAt: Date;
            dataPoints: any;
            dateRange: {
                from: any;
                to: any;
            };
            filters: {};
            processingTimeMs: number;
        };
    }>;
    static compareDepartments(departmentAId: any, departmentBId: any, filters?: {}): Promise<{
        departmentA: {
            id: any;
            name: any;
            metrics: {
                employeeCount: number;
                averageUtilization: number;
                skillDiversity: number;
                experienceLevel: number;
                teamProductivity: number;
                retentionRate: number;
            };
        };
        departmentB: {
            id: any;
            name: any;
            metrics: {
                employeeCount: number;
                averageUtilization: number;
                skillDiversity: number;
                experienceLevel: number;
                teamProductivity: number;
                retentionRate: number;
            };
        };
        comparisons: {
            metric: any;
            valueA: any;
            valueB: any;
            difference: number;
            percentageDifference: number;
            winner: string;
        }[];
    }>;
    static generateCapacityForecast(filters: any): Promise<{
        data: {
            period: Date;
            predictedDemand: number;
            availableCapacity: number;
            capacityGap: number;
            recommendedActions: string[];
            confidence: number;
        }[];
        metadata: {
            generatedAt: Date;
            dataPoints: number;
            dateRange: {
                from: Date;
                to: Date;
            };
            filters: any;
            processingTimeMs: number;
        };
    }>;
    static getDateFormat(period: any): "DATE(ra.start_date)" | "DATE_TRUNC('week', ra.start_date)" | "DATE_TRUNC('month', ra.start_date)" | "DATE_TRUNC('quarter', ra.start_date)";
    static getDepartmentMetrics(departmentId: any, filters: any): Promise<{
        id: any;
        name: any;
        metrics: {
            employeeCount: number;
            averageUtilization: number;
            skillDiversity: number;
            experienceLevel: number;
            teamProductivity: number;
            retentionRate: number;
        };
    }>;
    static compareMetric(metric: any, valueA: any, valueB: any): {
        metric: any;
        valueA: any;
        valueB: any;
        difference: number;
        percentageDifference: number;
        winner: string;
    };
    static generateRecommendations(capacityGap: any): string[];
}
//# sourceMappingURL=analytics.service.d.ts.map