export const __esModule: boolean;
export class EmployeeController {
    getEmployees: (req: any, res: any, next: any) => Promise<void>;
    getEmployeeById: (req: any, res: any, next: any) => Promise<void>;
    createEmployee: (req: any, res: any, next: any) => Promise<void>;
    updateEmployee: (req: any, res: any, next: any) => Promise<void>;
    checkEmployeeDeletionConstraints: (req: any, res: any, next: any) => Promise<void>;
    deleteEmployee: (req: any, res: any, next: any) => Promise<void>;
    bulkImportEmployees: (req: any, res: any, next: any) => Promise<void>;
    exportEmployees: (req: any, res: any, next: any) => Promise<void>;
    getEmployeeAnalytics: (_req: any, res: any, next: any) => Promise<void>;
    employeeService: employee_service_1.EmployeeService;
    webSocketService: any;
}
import employee_service_1 = require("../services/employee.service");
//# sourceMappingURL=employee.controller.d.ts.map