"use strict";
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ResourceController = void 0;
const api_error_1 = require("../utils/api-error");
const async_handler_1 = require("../middleware/async-handler");
const employee_service_1 = require("../services/employee.service");
const CapacityHistory_1 = require("../models/CapacityHistory");
class ResourceController {
    constructor() {
    }
    static calculateResourceMetrics(employees, capacityData) {
        const totalEmployees = employees.length;
        const totalCapacity = capacityData.reduce((sum, cap) => sum + cap.availableHours, 0);
        const totalAllocated = capacityData.reduce((sum, cap) => sum + cap.allocatedHours, 0);
        const avgUtilization = capacityData.length > 0
            ? capacityData.reduce((sum, cap) => sum + cap.utilizationRate, 0) / capacityData.length
            : 0;
        const overUtilized = capacityData.filter(cap => cap.utilizationRate > 0.9).length;
        const underUtilized = capacityData.filter(cap => cap.utilizationRate < 0.6).length;
        const optimal = totalEmployees - overUtilized - underUtilized;
        return {
            totalEmployees,
            totalCapacity,
            totalAllocated,
            availableCapacity: totalCapacity - totalAllocated,
            avgUtilization,
            utilizationDistribution: {
                overUtilized,
                optimal,
                underUtilized
            },
            efficiency: totalAllocated > 0 ? (totalAllocated / totalCapacity) * 100 : 0
        };
    }
    static async getDepartmentSummary(employees, capacityData) {
        const departments = employees.reduce((acc, emp) => {
            if (!acc[emp.departmentId]) {
                acc[emp.departmentId] = {
                    id: emp.departmentId,
                    name: `Department ${emp.departmentId}`,
                    employees: [],
                    capacity: []
                };
            }
            acc[emp.departmentId].employees.push(emp);
            return acc;
        }, {});
        capacityData.forEach(cap => {
            const employee = employees.find(emp => emp.id.toString() === cap.employeeId);
            if (employee && departments[employee.departmentId]) {
                departments[employee.departmentId].capacity.push(cap);
            }
        });
        return Object.values(departments).map((dept) => {
            const totalCapacity = dept.capacity.reduce((sum, cap) => sum + cap.availableHours, 0);
            const totalAllocated = dept.capacity.reduce((sum, cap) => sum + cap.allocatedHours, 0);
            const avgUtilization = dept.capacity.length > 0
                ? dept.capacity.reduce((sum, cap) => sum + cap.utilizationRate, 0) / dept.capacity.length
                : 0;
            return {
                ...dept,
                metrics: {
                    employeeCount: dept.employees.length,
                    totalCapacity,
                    totalAllocated,
                    avgUtilization,
                    efficiency: totalCapacity > 0 ? (totalAllocated / totalCapacity) * 100 : 0
                }
            };
        });
    }
    static generateOptimizationSuggestions(employees, capacityData, mode) {
        const suggestions = [];
        const utilizationAnalysis = employees.map(emp => {
            const empCapacity = capacityData.filter(cap => cap.employeeId === emp.id.toString());
            const avgUtilization = empCapacity.length > 0
                ? empCapacity.reduce((sum, cap) => sum + cap.utilizationRate, 0) / empCapacity.length
                : 0;
            return { employee: emp, utilization: avgUtilization, capacity: empCapacity };
        });
        const overUtilized = utilizationAnalysis.filter(emp => emp.utilization > 0.9);
        const underUtilized = utilizationAnalysis.filter(emp => emp.utilization < 0.6);
        if (overUtilized.length > 0 && underUtilized.length > 0) {
            overUtilized.forEach(over => {
                const potentialMatch = underUtilized.find(under => over.employee.skills.some((skill) => under.employee.skills.includes(skill)));
                if (potentialMatch) {
                    suggestions.push({
                        type: 'reallocation',
                        priority: 'high',
                        description: `Redistribute workload from over-utilized to under-utilized resources`,
                        currentState: `${over.employee.firstName} ${over.employee.lastName} is ${(over.utilization * 100).toFixed(0)}% utilized`,
                        suggestedState: `Move some workload to ${potentialMatch.employee.firstName} ${potentialMatch.employee.lastName} (${(potentialMatch.utilization * 100).toFixed(0)}% utilized)`,
                        expectedImpact: `Improve overall team utilization by 15-20%`,
                        confidence: 85,
                        affectedEmployees: [
                            `${over.employee.firstName} ${over.employee.lastName}`,
                            `${potentialMatch.employee.firstName} ${potentialMatch.employee.lastName}`
                        ],
                        implementation: {
                            steps: [
                                'Analyze current task allocation',
                                'Identify transferable responsibilities',
                                'Coordinate handover process',
                                'Monitor impact for 2 weeks'
                            ],
                            timeframe: '1-2 weeks',
                            effort: 'medium'
                        }
                    });
                }
            });
        }
        const totalUtilization = utilizationAnalysis.reduce((sum, emp) => sum + emp.utilization, 0) / utilizationAnalysis.length;
        if (mode === 'utilization' && totalUtilization < 0.7) {
            suggestions.push({
                type: 'capacity_adjustment',
                priority: 'medium',
                description: 'Team has available capacity for additional work',
                currentState: `Average team utilization is ${(totalUtilization * 100).toFixed(0)}%`,
                suggestedState: 'Consider taking on additional projects or initiatives',
                expectedImpact: 'Increase revenue potential and team engagement',
                confidence: 80,
                affectedEmployees: employees.map((emp) => `${emp.firstName} ${emp.lastName}`),
                implementation: {
                    steps: [
                        'Identify available capacity',
                        'Evaluate potential new projects',
                        'Plan resource allocation',
                        'Implement new assignments'
                    ],
                    timeframe: '2-3 weeks',
                    effort: 'low'
                }
            });
        }
        return suggestions;
    }
    static detectResourceConflicts(capacityData) {
        const conflicts = [];
        const employeeCapacity = capacityData.reduce((acc, cap) => {
            if (!acc[cap.employeeId]) {
                acc[cap.employeeId] = [];
            }
            acc[cap.employeeId].push(cap);
            return acc;
        }, {});
        Object.entries(employeeCapacity).forEach(([employeeId, capacity]) => {
            const capacityArray = capacity;
            const avgUtilization = capacityArray.reduce((sum, cap) => sum + cap.utilizationRate, 0) / capacityArray.length;
            if (avgUtilization > 1.0) {
                conflicts.push({
                    id: `conflict-${employeeId}-${Date.now()}`,
                    type: 'overallocation',
                    severity: avgUtilization > 1.2 ? 'critical' : 'high',
                    employeeId,
                    description: `Employee is allocated ${(avgUtilization * 100).toFixed(0)}% of capacity`,
                    suggestedResolution: 'Redistribute workload or extend project timelines',
                    detectedAt: new Date().toISOString(),
                    status: 'active'
                });
            }
        });
        return conflicts;
    }
    static calculateUtilizationTrends(capacityData) {
        const dateGroups = capacityData.reduce((acc, cap) => {
            const date = cap.date.split('T')[0];
            if (!acc[date]) {
                acc[date] = [];
            }
            acc[date].push(cap);
            return acc;
        }, {});
        return Object.entries(dateGroups)
            .map(([date, dayCapacity]) => {
            const dayCapacityArray = dayCapacity;
            return {
                date,
                utilization: dayCapacityArray.reduce((sum, cap) => sum + cap.utilizationRate, 0) / dayCapacityArray.length,
                capacity: dayCapacityArray.reduce((sum, cap) => sum + cap.availableHours, 0),
                allocated: dayCapacityArray.reduce((sum, cap) => sum + cap.allocatedHours, 0)
            };
        })
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    }
    static analyzeSkillsDistribution(employees) {
        const skillCounts = employees.reduce((acc, emp) => {
            emp.skills.forEach((skill) => {
                acc[skill] = (acc[skill] || 0) + 1;
            });
            return acc;
        }, {});
        return Object.entries(skillCounts)
            .map(([skill, count]) => ({ skill, count }))
            .sort((a, b) => b.count - a.count);
    }
    static calculateCostAnalysis(employees, capacityData) {
        const totalSalaries = employees.reduce((sum, emp) => sum + (emp.salary || 75000), 0);
        const totalAllocatedHours = capacityData.reduce((sum, cap) => sum + cap.allocatedHours, 0);
        const avgHourlyRate = 150;
        const projectedRevenue = totalAllocatedHours * avgHourlyRate;
        return {
            totalSalaries,
            avgSalary: employees.length > 0 ? totalSalaries / employees.length : 0,
            projectedRevenue,
            grossProfit: projectedRevenue - totalSalaries,
            profitMargin: projectedRevenue > 0 ? ((projectedRevenue - totalSalaries) / projectedRevenue) * 100 : 0
        };
    }
    static calculateProjections(capacityData) {
        const currentUtilization = capacityData.length > 0
            ? capacityData.reduce((sum, cap) => sum + cap.utilizationRate, 0) / capacityData.length
            : 0;
        return {
            utilizationTrend: currentUtilization > 0.8 ? 'increasing' : 'stable',
            projectedGrowth: Math.max(0, (currentUtilization - 0.7) * 100),
            capacityForecast: currentUtilization < 0.9 ? 'sufficient' : 'at_risk',
            recommendations: currentUtilization > 0.9
                ? ['Consider hiring additional resources', 'Evaluate project priorities']
                : ['Capacity available for growth', 'Consider new initiatives']
        };
    }
    static getPeriodStartDate(period) {
        const now = new Date();
        switch (period) {
            case '7d':
                return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            case '30d':
                return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            case '90d':
                return new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
            default:
                return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        }
    }
}
exports.ResourceController = ResourceController;
_a = ResourceController;
ResourceController.getResourceAllocation = (0, async_handler_1.asyncHandler)(async (req, res, _next) => {
    const { departmentId, startDate, endDate } = req.query;
    const employeeService = new employee_service_1.EmployeeService();
    const employeesResult = await employeeService.getEmployees({
        departmentId: departmentId || undefined,
        limit: 1000,
        page: 1
    });
    const capacityFilters = {};
    if (startDate) {
        capacityFilters.dateFrom = new Date(startDate);
    }
    if (endDate) {
        capacityFilters.dateTo = new Date(endDate);
    }
    const capacityData = await CapacityHistory_1.CapacityHistoryModel.findAll(capacityFilters);
    const resourceMetrics = _a.calculateResourceMetrics(employeesResult.data, capacityData);
    res.json({
        success: true,
        data: {
            employees: employeesResult.data,
            capacity: capacityData,
            metrics: resourceMetrics,
            departments: await _a.getDepartmentSummary(employeesResult.data, capacityData)
        },
        timestamp: new Date().toISOString()
    });
});
ResourceController.getOptimizationSuggestions = (0, async_handler_1.asyncHandler)(async (req, res, _next) => {
    const { mode = 'balanced' } = req.query;
    const employeeService = new employee_service_1.EmployeeService();
    const employeesResult = await employeeService.getEmployees({ limit: 1000, page: 1 });
    const capacityData = await CapacityHistory_1.CapacityHistoryModel.findAll({});
    const suggestions = _a.generateOptimizationSuggestions(employeesResult.data, capacityData, mode);
    res.json({
        success: true,
        data: suggestions,
        mode,
        timestamp: new Date().toISOString()
    });
});
ResourceController.createAllocation = (0, async_handler_1.asyncHandler)(async (req, res, _next) => {
    const { employeeId, projectId, allocatedHours, startDate } = req.body;
    if (!employeeId || !projectId || !allocatedHours) {
        throw new api_error_1.ApiError(400, 'Employee ID, Project ID, and allocated hours are required');
    }
    const employeeService = new employee_service_1.EmployeeService();
    const employee = await employeeService.getEmployeeById(employeeId);
    if (!employee) {
        throw new api_error_1.ApiError(404, 'Employee not found');
    }
    const allocationEntry = await CapacityHistory_1.CapacityHistoryModel.create({
        employeeId,
        date: new Date(startDate || new Date()),
        availableHours: 40,
        allocatedHours,
        notes: `Allocated to project ${projectId}`
    });
    res.status(201).json({
        success: true,
        data: allocationEntry,
        message: 'Resource allocation created successfully',
        timestamp: new Date().toISOString()
    });
});
ResourceController.getConflicts = (0, async_handler_1.asyncHandler)(async (req, res, _next) => {
    const { severity, type, employeeId } = req.query;
    const capacityData = await CapacityHistory_1.CapacityHistoryModel.findAll({
        employeeId: employeeId
    });
    const conflicts = _a.detectResourceConflicts(capacityData);
    let filteredConflicts = conflicts;
    if (severity) {
        filteredConflicts = filteredConflicts.filter(c => c.severity === severity);
    }
    if (type) {
        filteredConflicts = filteredConflicts.filter(c => c.type === type);
    }
    res.json({
        success: true,
        data: filteredConflicts,
        count: filteredConflicts.length,
        filters: { severity, type, employeeId },
        timestamp: new Date().toISOString()
    });
});
ResourceController.resolveConflict = (0, async_handler_1.asyncHandler)(async (req, res, _next) => {
    const { id } = req.params;
    const { status, resolution } = req.body;
    if (!['resolved', 'ignored'].includes(status)) {
        throw new api_error_1.ApiError(400, 'Status must be either "resolved" or "ignored"');
    }
    res.json({
        success: true,
        data: {
            id,
            status,
            resolution,
            resolvedAt: new Date().toISOString()
        },
        message: `Conflict ${status} successfully`,
        timestamp: new Date().toISOString()
    });
});
ResourceController.getResourceAnalytics = (0, async_handler_1.asyncHandler)(async (req, res, _next) => {
    const { period = '30d', departmentId } = req.query;
    const employeeService = new employee_service_1.EmployeeService();
    const employeesResult = await employeeService.getEmployees({
        departmentId: departmentId || undefined,
        limit: 1000,
        page: 1
    });
    const capacityData = await CapacityHistory_1.CapacityHistoryModel.findAll({
        dateFrom: _a.getPeriodStartDate(period),
        dateTo: new Date()
    });
    const analytics = {
        utilization: _a.calculateUtilizationTrends(capacityData),
        departmentBreakdown: await _a.getDepartmentSummary(employeesResult.data, capacityData),
        skillsAnalysis: _a.analyzeSkillsDistribution(employeesResult.data),
        costAnalysis: _a.calculateCostAnalysis(employeesResult.data, capacityData),
        projectedMetrics: _a.calculateProjections(capacityData)
    };
    res.json({
        success: true,
        data: analytics,
        period,
        timestamp: new Date().toISOString()
    });
});
//# sourceMappingURL=resource.controller.js.map