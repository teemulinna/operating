import { Request, Response, NextFunction } from 'express';
export declare class EmployeeController {
    private employeeService;
    private webSocketService;
    constructor();
    getEmployees: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    getEmployeeById: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    createEmployee: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    updateEmployee: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    checkEmployeeDeletionConstraints: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    deleteEmployee: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    bulkImportEmployees: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    exportEmployees: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    getEmployeeAnalytics: (_req: Request, res: Response, next: NextFunction) => Promise<void>;
}
//# sourceMappingURL=employee.controller.d.ts.map