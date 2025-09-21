import { Request, Response } from 'express';
import { Pool } from 'pg';
export declare class ExportController {
    private static pool;
    static initialize(pool: Pool): void;
    static exportEmployeesCSV(req: Request, res: Response): Promise<void>;
    static exportProjectsCSV(req: Request, res: Response): Promise<void>;
    static exportAllocationsCSV(req: Request, res: Response): Promise<void>;
    static exportEmployeesExcel(req: Request, res: Response): Promise<void>;
    static generateCapacityReportPDF(req: Request, res: Response): Promise<void>;
    static scheduleReport(req: Request, res: Response): Promise<void>;
    static syncWithExternalTools(req: Request, res: Response): Promise<void>;
    private static syncWithJira;
    private static syncWithAsana;
    private static syncWithTrello;
}
//# sourceMappingURL=exportController.d.ts.map