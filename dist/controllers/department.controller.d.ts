import { Request, Response, NextFunction } from 'express';
export declare class DepartmentController {
    private departmentService;
    constructor();
    getDepartments: (_req: Request, res: Response, next: NextFunction) => Promise<void>;
    getDepartmentById: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    createDepartment: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    updateDepartment: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    deleteDepartment: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    getDepartmentEmployees: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    getDepartmentAnalytics: (_req: Request, res: Response, next: NextFunction) => Promise<void>;
}
//# sourceMappingURL=department.controller.d.ts.map