export const __esModule: boolean;
export class HeatMapService {
    db: import("pg").Pool | null;
    cachePrefix: string;
    cacheTTL: number;
    dbService: database_service_1.DatabaseService;
    cache: cache_1.Cache;
    getDb(): Promise<import("pg").Pool>;
    getHeatMapData(filters?: {}): Promise<any>;
    getHeatMapSummary(filters?: {}): Promise<any>;
    getEmployeeTimeline(employeeId: any, startDate: any, endDate: any): Promise<any>;
    refreshHeatMap(): Promise<void>;
    exportToCSV(filters?: {}): Promise<string>;
    mapRowToHeatMapData(row: any): {
        employeeId: any;
        employeeName: any;
        departmentId: any;
        departmentName: any;
        date: any;
        year: any;
        month: any;
        week: any;
        dayOfWeek: any;
        availableHours: number;
        allocatedHours: number;
        utilizationPercentage: number;
        utilizationCategory: any;
        heatColor: any;
        lastUpdated: any;
    };
    generateCacheKey(type: any, filters: any): string;
}
import database_service_1 = require("../database/database.service");
import cache_1 = require("../utils/cache");
//# sourceMappingURL=heat-map.service.d.ts.map