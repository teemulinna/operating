export const __esModule: boolean;
export class DepartmentController {
    getDepartments: (_req: any, res: any, next: any) => Promise<void>;
    getDepartmentById: (req: any, res: any, next: any) => Promise<void>;
    createDepartment: (req: any, res: any, next: any) => Promise<void>;
    updateDepartment: (req: any, res: any, next: any) => Promise<void>;
    deleteDepartment: (req: any, res: any, next: any) => Promise<void>;
    getDepartmentEmployees: (req: any, res: any, next: any) => Promise<void>;
    getDepartmentAnalytics: (_req: any, res: any, next: any) => Promise<void>;
    departmentService: department_service_1.DepartmentService;
}
import department_service_1 = require("../services/department.service");
//# sourceMappingURL=department.controller.d.ts.map