import { Request, Response, NextFunction } from 'express';
export declare class ResourceController {
    private employeeService;
    constructor();
    static getResourceAllocation: (req: Request, res: Response, next: NextFunction) => void;
    static getOptimizationSuggestions: (req: Request, res: Response, next: NextFunction) => void;
    static createAllocation: (req: Request, res: Response, next: NextFunction) => void;
    static getConflicts: (req: Request, res: Response, next: NextFunction) => void;
    static resolveConflict: (req: Request, res: Response, next: NextFunction) => void;
    static getResourceAnalytics: (req: Request, res: Response, next: NextFunction) => void;
    private static calculateResourceMetrics;
    private static getDepartmentSummary;
    private static generateOptimizationSuggestions;
    private static detectResourceConflicts;
    private static calculateUtilizationTrends;
    private static analyzeSkillsDistribution;
    private static calculateCostAnalysis;
    private static calculateProjections;
    private static getPeriodStartDate;
}
//# sourceMappingURL=resource.controller.d.ts.map