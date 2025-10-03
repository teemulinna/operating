export const __esModule: boolean;
export class HeatMapController {
    getHeatMap: (req: any, res: any, next: any) => void;
    getHeatMapSummary: (req: any, res: any, next: any) => void;
    getEmployeeTrends: (req: any, res: any, next: any) => void;
    getBottlenecks: (req: any, res: any, next: any) => void;
    exportHeatMap: (req: any, res: any, next: any) => void;
    refreshHeatMap: (req: any, res: any, next: any) => void;
    getHeatMapService(req: any): any;
    calculateTrendStatistics(timeline: any): {
        average?: undefined;
        max?: undefined;
        min?: undefined;
        trend?: undefined;
        overAllocationDays?: undefined;
        criticalDays?: undefined;
    } | {
        average: number;
        max: number;
        min: number;
        trend: string;
        overAllocationDays: any;
        criticalDays: any;
    };
    identifyBottlenecks(data: any): any[];
    generateBottleneckRecommendations(bottlenecks: any): string[];
}
export namespace HeatMapController {
    let validateHeatMapQuery: express_validator_1.ValidationChain[];
    let validateEmployeeTrends: express_validator_1.ValidationChain[];
}
import express_validator_1 = require("express-validator");
//# sourceMappingURL=heat-map.controller.d.ts.map