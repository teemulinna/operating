export interface UtilizationData {
    departmentId: string;
    departmentName: string;
    totalEmployees: number;
    averageUtilization: number;
    totalAvailableHours: number;
    totalAllocatedHours: number;
    utilizationTrend: number;
}
export interface CapacityTrendData {
    date: Date;
    departmentId?: string;
    departmentName?: string;
    averageUtilization: number;
    totalAvailableHours: number;
    totalAllocatedHours: number;
    employeeCount: number;
}
export interface ResourceAllocationMetrics {
    totalEmployees: number;
    totalDepartments: number;
    averageUtilizationAcrossCompany: number;
    overutilizedEmployees: number;
    underutilizedEmployees: number;
    criticalResourceGaps: SkillGap[];
    topPerformingDepartments: DepartmentPerformance[];
    capacityForecast: CapacityForecast[];
}
export interface SkillGap {
    skillName: string;
    skillCategory: string;
    totalDemand: number;
    availableExperts: number;
    gapPercentage: number;
    criticalityLevel: 'low' | 'medium' | 'high' | 'critical';
    affectedDepartments: string[];
}
export interface DepartmentPerformance {
    departmentId: string;
    departmentName: string;
    averageUtilization: number;
    efficiencyScore: number;
    skillCoverage: number;
    teamSatisfactionScore: number;
    projectCompletionRate: number;
}
export interface CapacityForecast {
    period: Date;
    predictedDemand: number;
    availableCapacity: number;
    capacityGap: number;
    recommendedActions: string[];
    confidence: number;
}
export interface DepartmentComparison {
    departmentA: {
        id: string;
        name: string;
        metrics: DepartmentMetrics;
    };
    departmentB: {
        id: string;
        name: string;
        metrics: DepartmentMetrics;
    };
    comparisons: ComparisonMetric[];
}
export interface DepartmentMetrics {
    employeeCount: number;
    averageUtilization: number;
    skillDiversity: number;
    experienceLevel: number;
    teamProductivity: number;
    retentionRate: number;
}
export interface ComparisonMetric {
    metric: string;
    valueA: number;
    valueB: number;
    difference: number;
    percentageDifference: number;
    winner: 'A' | 'B' | 'tie';
}
export interface AnalyticsFilters {
    dateFrom?: Date;
    dateTo?: Date;
    departmentIds?: string[];
    skillCategories?: string[];
    utilizationThreshold?: {
        min?: number;
        max?: number;
    };
    aggregationPeriod?: 'daily' | 'weekly' | 'monthly' | 'quarterly';
}
export interface ExportOptions {
    format: 'png' | 'pdf' | 'csv' | 'json';
    includeSummary: boolean;
    includeCharts: boolean;
    includeRawData: boolean;
    dateRange: {
        from: Date;
        to: Date;
    };
}
export interface ChartConfiguration {
    type: 'line' | 'bar' | 'pie' | 'doughnut' | 'radar' | 'bubble' | 'scatter';
    responsive: boolean;
    maintainAspectRatio: boolean;
    plugins: {
        title: {
            display: boolean;
            text: string;
        };
        legend: {
            display: boolean;
            position: 'top' | 'bottom' | 'left' | 'right';
        };
        tooltip: {
            enabled: boolean;
            callbacks?: any;
        };
    };
    scales?: {
        x?: any;
        y?: any;
    };
}
export interface AnalyticsApiResponse<T> {
    data: T;
    metadata: {
        generatedAt: Date;
        dataPoints: number;
        dateRange: {
            from: Date;
            to: Date;
        };
        filters: AnalyticsFilters;
        processingTimeMs: number;
    };
}
export interface AnalyticsEvent {
    type: 'utilization_change' | 'capacity_alert' | 'skill_gap_detected' | 'forecast_update';
    timestamp: Date;
    departmentId?: string;
    employeeId?: string;
    severity: 'info' | 'warning' | 'critical';
    message: string;
    data: any;
}
export interface PerformanceBenchmark {
    category: 'utilization' | 'productivity' | 'satisfaction' | 'retention';
    industry: string;
    benchmarkValue: number;
    companyValue: number;
    percentile: number;
    recommendation: string;
}
//# sourceMappingURL=analytics.types.d.ts.map