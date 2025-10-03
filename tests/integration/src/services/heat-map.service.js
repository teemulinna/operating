"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HeatMapService = void 0;
const database_service_1 = require("../database/database.service");
const api_error_1 = require("../utils/api-error");
const cache_1 = require("../utils/cache");
class HeatMapService {
    constructor() {
        this.db = null;
        this.cachePrefix = 'heatmap:';
        this.cacheTTL = 300; // 5 minutes
        this.dbService = new database_service_1.DatabaseService();
        this.cache = new cache_1.Cache();
    }
    async getDb() {
        if (!this.db) {
            await this.dbService.connect();
            this.db = this.dbService.getPool();
        }
        return this.db;
    }
    /**
     * Get heat map data with optional filters
     */
    async getHeatMapData(filters = {}) {
        const cacheKey = this.generateCacheKey('data', filters);
        const cached = await this.cache.get(cacheKey);
        if (cached)
            return cached;
        try {
            const conditions = [];
            const params = [];
            let paramCount = 0;
            // Date range filter
            if (filters.startDate) {
                conditions.push(`date >= $${++paramCount}`);
                params.push(filters.startDate);
            }
            if (filters.endDate) {
                conditions.push(`date <= $${++paramCount}`);
                params.push(filters.endDate);
            }
            // Employee filter
            if (filters.employeeId) {
                conditions.push(`employee_id = $${++paramCount}`);
                params.push(filters.employeeId);
            }
            else if (filters.employeeIds?.length) {
                conditions.push(`employee_id = ANY($${++paramCount}::uuid[])`);
                params.push(filters.employeeIds);
            }
            // Department filter
            if (filters.departmentId) {
                conditions.push(`department_id = $${++paramCount}`);
                params.push(filters.departmentId);
            }
            else if (filters.departmentIds?.length) {
                conditions.push(`department_id = ANY($${++paramCount}::uuid[])`);
                params.push(filters.departmentIds);
            }
            // Utilization filters
            if (filters.utilizationCategories?.length) {
                conditions.push(`utilization_category = ANY($${++paramCount}::text[])`);
                params.push(filters.utilizationCategories);
            }
            if (filters.minUtilization !== undefined) {
                conditions.push(`utilization_percentage >= $${++paramCount}`);
                params.push(filters.minUtilization);
            }
            if (filters.maxUtilization !== undefined) {
                conditions.push(`utilization_percentage <= $${++paramCount}`);
                params.push(filters.maxUtilization);
            }
            const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
            let query = `
        SELECT
          employee_id,
          employee_name,
          department_id,
          department_name,
          date,
          year,
          month,
          week,
          day_of_week,
          available_hours,
          allocated_hours,
          utilization_percentage,
          utilization_category,
          heat_color,
          last_updated
        FROM daily_capacity_heatmap
        ${whereClause}
        ORDER BY date, employee_name
      `;
            // Apply grouping if requested
            if (filters.groupBy === 'week') {
                query = `
          SELECT
            employee_id,
            employee_name,
            department_id,
            department_name,
            MIN(date) as date,
            year,
            week,
            AVG(available_hours) as available_hours,
            AVG(allocated_hours) as allocated_hours,
            AVG(utilization_percentage) as utilization_percentage,
            MAX(last_updated) as last_updated
          FROM daily_capacity_heatmap
          ${whereClause}
          GROUP BY employee_id, employee_name, department_id, department_name, year, week
          ORDER BY year, week, employee_name
        `;
            }
            else if (filters.groupBy === 'month') {
                query = `
          SELECT
            employee_id,
            employee_name,
            department_id,
            department_name,
            MIN(date) as date,
            year,
            month,
            AVG(available_hours) as available_hours,
            AVG(allocated_hours) as allocated_hours,
            AVG(utilization_percentage) as utilization_percentage,
            MAX(last_updated) as last_updated
          FROM daily_capacity_heatmap
          ${whereClause}
          GROUP BY employee_id, employee_name, department_id, department_name, year, month
          ORDER BY year, month, employee_name
        `;
            }
            const db = await this.getDb();
            const result = await db.query(query, params);
            const data = result.rows.map(row => this.mapRowToHeatMapData(row));
            await this.cache.set(cacheKey, data, this.cacheTTL);
            return data;
        }
        catch (error) {
            console.error('Error fetching heat map data:', error);
            throw new api_error_1.ApiError(500, 'Failed to fetch heat map data');
        }
    }
    /**
     * Get heat map summary statistics
     */
    async getHeatMapSummary(filters = {}) {
        const cacheKey = this.generateCacheKey('summary', filters);
        const cached = await this.cache.get(cacheKey);
        if (cached)
            return cached;
        try {
            const conditions = [];
            const params = [];
            let paramCount = 0;
            // Apply filters (similar to getHeatMapData)
            if (filters.startDate) {
                conditions.push(`date >= $${++paramCount}`);
                params.push(filters.startDate);
            }
            if (filters.endDate) {
                conditions.push(`date <= $${++paramCount}`);
                params.push(filters.endDate);
            }
            if (filters.employeeId) {
                conditions.push(`employee_id = $${++paramCount}`);
                params.push(filters.employeeId);
            }
            else if (filters.employeeIds?.length) {
                conditions.push(`employee_id = ANY($${++paramCount}::uuid[])`);
                params.push(filters.employeeIds);
            }
            if (filters.departmentId) {
                conditions.push(`department_id = $${++paramCount}`);
                params.push(filters.departmentId);
            }
            else if (filters.departmentIds?.length) {
                conditions.push(`department_id = ANY($${++paramCount}::uuid[])`);
                params.push(filters.departmentIds);
            }
            const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
            // Get overall statistics
            const statsQuery = `
        SELECT
          COUNT(DISTINCT employee_id) as total_employees,
          AVG(utilization_percentage) as avg_utilization,
          COUNT(CASE WHEN utilization_category = 'critical' THEN 1 END) as critical_count,
          COUNT(CASE WHEN utilization_category IN ('critical', 'over') THEN 1 END) as over_allocated_count,
          COUNT(CASE WHEN utilization_category = 'optimal' THEN 1 END) as optimal_count,
          COUNT(CASE WHEN utilization_category IN ('low', 'available') THEN 1 END) as under_utilized_count,
          MIN(date) as start_date,
          MAX(date) as end_date
        FROM daily_capacity_heatmap
        ${whereClause}
      `;
            // Get department breakdown
            const deptQuery = `
        SELECT
          department_id,
          department_name,
          AVG(utilization_percentage) as avg_utilization,
          COUNT(DISTINCT employee_id) as employee_count
        FROM daily_capacity_heatmap
        ${whereClause}
        GROUP BY department_id, department_name
        ORDER BY avg_utilization DESC
      `;
            const db = await this.getDb();
            const [statsResult, deptResult] = await Promise.all([
                db.query(statsQuery, params),
                db.query(deptQuery, params)
            ]);
            const stats = statsResult.rows[0];
            const summary = {
                totalEmployees: parseInt(stats.total_employees),
                averageUtilization: parseFloat(stats.avg_utilization) || 0,
                criticalCount: parseInt(stats.critical_count) || 0,
                overAllocatedCount: parseInt(stats.over_allocated_count) || 0,
                optimalCount: parseInt(stats.optimal_count) || 0,
                underUtilizedCount: parseInt(stats.under_utilized_count) || 0,
                dateRange: {
                    start: stats.start_date || new Date(),
                    end: stats.end_date || new Date()
                },
                departmentBreakdown: deptResult.rows.map(row => ({
                    departmentId: row.department_id,
                    departmentName: row.department_name,
                    averageUtilization: parseFloat(row.avg_utilization) || 0,
                    employeeCount: parseInt(row.employee_count) || 0
                }))
            };
            await this.cache.set(cacheKey, summary, this.cacheTTL);
            return summary;
        }
        catch (error) {
            console.error('Error fetching heat map summary:', error);
            throw new api_error_1.ApiError(500, 'Failed to fetch heat map summary');
        }
    }
    /**
     * Get employee utilization timeline
     */
    async getEmployeeTimeline(employeeId, startDate, endDate) {
        const cacheKey = `${this.cachePrefix}timeline:${employeeId}:${startDate}:${endDate}`;
        const cached = await this.cache.get(cacheKey);
        if (cached)
            return cached;
        try {
            const query = `
        SELECT
          date,
          available_hours,
          allocated_hours,
          utilization_percentage,
          utilization_category,
          heat_color
        FROM daily_capacity_heatmap
        WHERE employee_id = $1
          AND date BETWEEN $2 AND $3
        ORDER BY date
      `;
            const db = await this.getDb();
            const result = await db.query(query, [employeeId, startDate, endDate]);
            const timeline = result.rows;
            await this.cache.set(cacheKey, timeline, this.cacheTTL);
            return timeline;
        }
        catch (error) {
            console.error('Error fetching employee timeline:', error);
            throw new api_error_1.ApiError(500, 'Failed to fetch employee timeline');
        }
    }
    /**
     * Refresh the materialized view
     */
    async refreshHeatMap() {
        try {
            const db = await this.getDb();
            await db.query('SELECT refresh_capacity_heatmap()');
            await this.cache.clear(this.cachePrefix);
        }
        catch (error) {
            console.error('Error refreshing heat map:', error);
            throw new api_error_1.ApiError(500, 'Failed to refresh heat map data');
        }
    }
    /**
     * Export heat map data to CSV
     */
    async exportToCSV(filters = {}) {
        const data = await this.getHeatMapData(filters);
        const headers = [
            'Employee ID',
            'Employee Name',
            'Department',
            'Date',
            'Available Hours',
            'Allocated Hours',
            'Utilization %',
            'Status'
        ];
        const rows = data.map(item => [
            item.employeeId,
            item.employeeName,
            item.departmentName,
            item.date.toISOString().split('T')[0],
            item.availableHours.toString(),
            item.allocatedHours.toString(),
            item.utilizationPercentage.toString(),
            item.utilizationCategory
        ]);
        const csv = [
            headers.join(','),
            ...rows.map(row => row.join(','))
        ].join('\n');
        return csv;
    }
    /**
     * Helper to map database row to HeatMapData interface
     */
    mapRowToHeatMapData(row) {
        return {
            employeeId: row.employee_id,
            employeeName: row.employee_name,
            departmentId: row.department_id,
            departmentName: row.department_name,
            date: row.date,
            year: row.year,
            month: row.month,
            week: row.week,
            dayOfWeek: row.day_of_week,
            availableHours: parseFloat(row.available_hours) || 0,
            allocatedHours: parseFloat(row.allocated_hours) || 0,
            utilizationPercentage: parseFloat(row.utilization_percentage) || 0,
            utilizationCategory: row.utilization_category || 'available',
            heatColor: row.heat_color || '#F0F0F0',
            lastUpdated: row.last_updated
        };
    }
    /**
     * Generate cache key from filters
     */
    generateCacheKey(type, filters) {
        const filterKey = Object.entries(filters)
            .map(([key, value]) => `${key}:${JSON.stringify(value)}`)
            .join(':');
        return `${this.cachePrefix}${type}:${filterKey}`;
    }
}
exports.HeatMapService = HeatMapService;
