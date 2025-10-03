export const __esModule: boolean;
export class ReportingService {
    db: any;
    generateUtilizationReport(filters?: {}): Promise<{
        data: {
            summary: {
                totalEmployees: number;
                averageUtilization: number;
                overutilizedCount: number;
                underutilizedCount: number;
                departmentCount: number;
            };
            employeeDetails: any;
            departmentBreakdown: any;
            trends: any;
            recommendations: string[];
        };
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
    generateBurnDownReport(projectId: any): Promise<{
        data: {
            projectId: any;
            projectName: any;
            clientName: any;
            timeline: any;
            currentStatus: {
                budgetStatus: string;
                scheduleStatus: string;
                estimatedCompletionDate: any;
                plannedEndDate: Date;
                remainingBudget: number;
                remainingHours: number;
            };
            forecasts: {
                budgetForecast: number;
                timelineForecast: Date;
                riskLevel: string;
                recommendations: string[];
            };
        };
        metadata: {
            generatedAt: Date;
            dataPoints: any;
            dateRange: {
                from: Date;
                to: Date;
            };
            filters: {};
            processingTimeMs: number;
        };
    }>;
    generateExecutiveDashboard(filters?: {}): Promise<{
        data: {
            kpis: {
                totalEmployees: number;
                averageUtilization: number;
                activeProjects: number;
                totalBudget: number;
                actualSpend: number;
                conflictsCount: number;
                capacityAvailable: number;
                revenuePerEmployee: number;
            };
            alerts: any[];
            trends: {
                utilizationTrend: number;
                budgetTrend: number;
                capacityTrend: number;
                satisfactionTrend: number;
            };
            topPerformers: {
                departments: never[];
                employees: never[];
            };
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
    generateComparisonReport(type: any, subjectIds: any, metrics: any, filters?: {}): Promise<{
        data: {
            type: any;
            subjects: any[];
            comparisons: any[];
            insights: any[];
            recommendations: any[];
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
    exportReport(reportData: any, reportType: any, exportOptions: any): Promise<{
        filePath: string;
        format: any;
        size: number;
    }>;
    saveReportConfiguration(config: any): Promise<any>;
    getReportConfigurations(userId: any): Promise<any>;
    generateUtilizationRecommendations(employeeData: any, departmentData: any): string[];
    calculateBudgetStatus(actualSpend: any, plannedBudget: any): "over-budget" | "approaching-budget" | "on-budget";
    calculateScheduleStatus(completionPercentage: any, currentDate: any, startDate: any, endDate: any): "behind-schedule" | "on-schedule" | "ahead-of-schedule";
    estimateCompletionDate(completionPercentage: any, burnRate: any, plannedEndDate: any): any;
    generateProjectForecasts(snapshots: any, project: any): {
        budgetForecast: number;
        timelineForecast: Date;
        riskLevel: string;
        recommendations: string[];
    };
    generateAlerts(filters: any): Promise<never[]>;
    calculateTrends(filters: any): Promise<{
        utilizationTrend: number;
        budgetTrend: number;
        capacityTrend: number;
        satisfactionTrend: number;
    }>;
    getTopPerformers(filters: any): Promise<{
        departments: never[];
        employees: never[];
    }>;
    getDepartmentMetricsForComparison(departmentIds: any, metrics: any, filters: any): Promise<never[]>;
    getProjectMetricsForComparison(projectIds: any, metrics: any, filters: any): Promise<never[]>;
    getEmployeeMetricsForComparison(employeeIds: any, metrics: any, filters: any): Promise<never[]>;
    calculateComparisons(subjects: any, metrics: any): never[];
    generateComparisonInsights(comparisons: any, type: any): never[];
    generateComparisonRecommendations(comparisons: any, subjects: any): never[];
    convertToCSV(reportData: any, reportType: any): Promise<string>;
    generatePDF(reportData: any, reportType: any, options: any): Promise<Buffer<ArrayBuffer>>;
}
//# sourceMappingURL=reporting.service.d.ts.map