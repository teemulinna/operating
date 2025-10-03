export const __esModule: boolean;
export class ExportController {
    static initialize(pool: any): void;
    static exportEmployeesCSV(req: any, res: any): Promise<void>;
    static exportProjectsCSV(req: any, res: any): Promise<void>;
    static exportAllocationsCSV(req: any, res: any): Promise<void>;
    static exportEmployeesExcel(req: any, res: any): Promise<void>;
    static generateCapacityReportPDF(req: any, res: any): Promise<void>;
    static scheduleReport(req: any, res: any): Promise<void>;
    static syncWithExternalTools(req: any, res: any): Promise<void>;
    static syncWithJira(_syncType: any, data: any): Promise<{
        recordsProcessed: number;
        details: {
            issueUpdated: string;
            capacityUpdated: any;
            assigneeCapacity: any;
        };
    }>;
    static syncWithAsana(_syncType: any, data: any): Promise<{
        recordsProcessed: number;
        details: {
            taskCapacityUpdated: string;
            userCapacity: any;
            availableHours: any;
        };
    }>;
    static syncWithTrello(_syncType: any, data: any): Promise<{
        recordsProcessed: number;
        details: {
            boardUpdated: string;
            memberCapacity: any;
            cardAssignments: any;
        };
    }>;
}
//# sourceMappingURL=exportController.d.ts.map