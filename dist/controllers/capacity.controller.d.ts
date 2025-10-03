import { Request, Response, NextFunction } from 'express';
export declare class CapacityController {
    static getAllCapacity: (req: Request, res: Response, next: NextFunction) => void;
    static getEmployeeCapacity: (req: Request, res: Response, next: NextFunction) => void;
    static createCapacity: (req: Request, res: Response, next: NextFunction) => void;
    static updateCapacity: (req: Request, res: Response, next: NextFunction) => void;
    static deleteCapacity: (req: Request, res: Response, next: NextFunction) => void;
    static bulkCreateCapacity: (req: Request, res: Response, next: NextFunction) => void;
    static getUtilizationSummary: (req: Request, res: Response, next: NextFunction) => void;
    static getTeamCapacityTrends: (req: Request, res: Response, next: NextFunction) => void;
    static getOverutilizedEmployees: (req: Request, res: Response, next: NextFunction) => void;
    static getCapacityByDate: (req: Request, res: Response, next: NextFunction) => void;
    static getDepartmentCapacity: (req: Request, res: Response, next: NextFunction) => void;
    static updateEmployeeCapacity: (req: Request, res: Response, next: NextFunction) => void;
    static bulkImportCapacity: (req: Request, res: Response, next: NextFunction) => void;
    static exportCapacityCSV: (req: Request, res: Response, next: NextFunction) => void;
    static getHeatmap: (req: Request, res: Response, next: NextFunction) => void;
    static getBottlenecks: (req: Request, res: Response, next: NextFunction) => void;
    static getCapacityTrends: (req: Request, res: Response, next: NextFunction) => void;
    static exportHeatmapCSV: (req: Request, res: Response, next: NextFunction) => void;
    static refreshHeatmapViews: (req: Request, res: Response, next: NextFunction) => void;
    static getDepartmentCapacitySummary: (req: Request, res: Response, next: NextFunction) => void;
}
//# sourceMappingURL=capacity.controller.d.ts.map