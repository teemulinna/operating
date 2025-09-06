import { Pool } from 'pg';
import { UtilizationData, CapacityTrendData, ResourceAllocationMetrics, SkillGap, DepartmentPerformance, DepartmentComparison, AnalyticsFilters, AnalyticsApiResponse } from '../types/analytics.types';
export declare class AnalyticsService {
    private static pool;
    static initialize(pool: Pool): void;
    static getTeamUtilizationData(filters?: AnalyticsFilters): Promise<AnalyticsApiResponse<UtilizationData[]>>;
    static getCapacityTrends(filters?: AnalyticsFilters): Promise<AnalyticsApiResponse<CapacityTrendData[]>>;
    static getResourceAllocationMetrics(filters?: AnalyticsFilters): Promise<AnalyticsApiResponse<ResourceAllocationMetrics>>;
    static getSkillGapAnalysis(filters?: AnalyticsFilters): Promise<AnalyticsApiResponse<SkillGap[]>>;
    static getDepartmentPerformance(filters?: AnalyticsFilters): Promise<AnalyticsApiResponse<DepartmentPerformance[]>>;
    static compareDepartments(departmentAId: string, departmentBId: string, filters?: AnalyticsFilters): Promise<DepartmentComparison>;
    private static generateCapacityForecast;
    private static getDateFormat;
    private static getDepartmentMetrics;
    private static compareMetric;
    private static generateRecommendations;
}
//# sourceMappingURL=analytics.service.d.ts.map