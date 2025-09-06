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
}
//# sourceMappingURL=capacity.controller.backup.d.ts.map