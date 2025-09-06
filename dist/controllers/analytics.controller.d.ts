import { Request, Response } from 'express';
export declare class AnalyticsController {
    static getTeamUtilization(req: Request, res: Response): Promise<void>;
    static getCapacityTrends(req: Request, res: Response): Promise<void>;
    static getResourceAllocationMetrics(req: Request, res: Response): Promise<void>;
    static getSkillsGapAnalysis(req: Request, res: Response): Promise<void>;
    static getDepartmentPerformance(req: Request, res: Response): Promise<void>;
    static compareDepartments(req: Request, res: Response): Promise<void>;
    static exportAnalytics(req: Request, res: Response): Promise<void>;
    static getDashboardSummary(req: Request, res: Response): Promise<void>;
}
//# sourceMappingURL=analytics.controller.d.ts.map