import { Request, Response, NextFunction } from 'express';
import { ApiError } from '../utils/api-error';
import { asyncHandler } from '../middleware/async-handler';
import { EmployeeService } from '../services/employee.service';
import { CapacityHistoryModel } from '../models/CapacityHistory';

export class ResourceController {
  private employeeService: EmployeeService;

  constructor() {
    this.employeeService = new EmployeeService();
  }

  /**
   * Get comprehensive resource allocation data
   */
  static getResourceAllocation = asyncHandler(async (req: Request, res: Response, _next: NextFunction) => {
    const { departmentId, startDate, endDate } = req.query;

    // Get employees
    const employeeService = new EmployeeService();
    const employeesResult = await employeeService.getEmployees({
      departmentId: departmentId ? parseInt(departmentId as string) : undefined,
      limit: 1000,
      page: 1
    });

    // Get capacity data
    const capacityData = await CapacityHistoryModel.findAll({
      employeeId: undefined,
      dateFrom: startDate ? new Date(startDate as string) : undefined,
      dateTo: endDate ? new Date(endDate as string) : undefined
    });

    // Calculate resource utilization metrics
    const resourceMetrics = ResourceController.calculateResourceMetrics(employeesResult.data, capacityData);

    res.json({
      success: true,
      data: {
        employees: employeesResult.data,
        capacity: capacityData,
        metrics: resourceMetrics,
        departments: await ResourceController.getDepartmentSummary(employeesResult.data, capacityData)
      },
      timestamp: new Date().toISOString()
    });
  });

  /**
   * Get resource optimization suggestions
   */
  static getOptimizationSuggestions = asyncHandler(async (req: Request, res: Response, _next: NextFunction) => {
    const { mode = 'balanced' } = req.query;

    // Get current resource state
    const employeeService = new EmployeeService();
    const employeesResult = await employeeService.getEmployees({ limit: 1000, page: 1 });
    const capacityData = await CapacityHistoryModel.findAll({});

    // Generate optimization suggestions based on current data
    const suggestions = ResourceController.generateOptimizationSuggestions(
      employeesResult.data, 
      capacityData, 
      mode as string
    );

    res.json({
      success: true,
      data: suggestions,
      mode,
      timestamp: new Date().toISOString()
    });
  });

  /**
   * Create resource allocation
   */
  static createAllocation = asyncHandler(async (req: Request, res: Response, _next: NextFunction) => {
    const { employeeId, projectId, allocatedHours, startDate, endDate } = req.body;

    if (!employeeId || !projectId || !allocatedHours) {
      throw new ApiError(400, 'Employee ID, Project ID, and allocated hours are required');
    }

    // Check if employee exists
    const employeeService = new EmployeeService();
    const employee = await employeeService.getEmployeeById(parseInt(employeeId));
    if (!employee) {
      throw new ApiError(404, 'Employee not found');
    }

    // Create capacity entry (this would typically be in a separate allocations table)
    const allocationEntry = await CapacityHistoryModel.create({
      employeeId,
      date: new Date(startDate || new Date()),
      availableHours: 40, // Default work week
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

  /**
   * Get resource conflicts
   */
  static getConflicts = asyncHandler(async (req: Request, res: Response, _next: NextFunction) => {
    const { severity, type, employeeId } = req.query;

    // Get current capacity data for conflict analysis
    const capacityData = await CapacityHistoryModel.findAll({
      employeeId: employeeId as string
    });

    // Analyze for conflicts
    const conflicts = ResourceController.detectResourceConflicts(capacityData);

    // Filter by severity and type if specified
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

  /**
   * Resolve resource conflict
   */
  static resolveConflict = asyncHandler(async (req: Request, res: Response, _next: NextFunction) => {
    const { id } = req.params;
    const { status, resolution } = req.body;

    if (!['resolved', 'ignored'].includes(status)) {
      throw new ApiError(400, 'Status must be either "resolved" or "ignored"');
    }

    // In a real implementation, this would update a conflicts table
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

  /**
   * Get resource analytics
   */
  static getResourceAnalytics = asyncHandler(async (req: Request, res: Response, _next: NextFunction) => {
    const { period = '30d', departmentId } = req.query;

    const employeeService = new EmployeeService();
    const employeesResult = await employeeService.getEmployees({
      departmentId: departmentId ? parseInt(departmentId as string) : undefined,
      limit: 1000,
      page: 1
    });

    const capacityData = await CapacityHistoryModel.findAll({
      dateFrom: ResourceController.getPeriodStartDate(period as string),
      dateTo: new Date()
    });

    const analytics = {
      utilization: ResourceController.calculateUtilizationTrends(capacityData),
      departmentBreakdown: await ResourceController.getDepartmentSummary(employeesResult.data, capacityData),
      skillsAnalysis: ResourceController.analyzeSkillsDistribution(employeesResult.data),
      costAnalysis: ResourceController.calculateCostAnalysis(employeesResult.data, capacityData),
      projectedMetrics: ResourceController.calculateProjections(capacityData)
    };

    res.json({
      success: true,
      data: analytics,
      period,
      timestamp: new Date().toISOString()
    });
  });

  /**
   * Calculate resource metrics
   */
  private static calculateResourceMetrics(employees: any[], capacityData: any[]) {
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

  /**
   * Get department summary
   */
  private static async getDepartmentSummary(employees: any[], capacityData: any[]) {
    const departments = employees.reduce((acc, emp) => {
      if (!acc[emp.departmentId]) {
        acc[emp.departmentId] = {
          id: emp.departmentId,
          name: `Department ${emp.departmentId}`, // In real app, get from departments table
          employees: [],
          capacity: []
        };
      }
      acc[emp.departmentId].employees.push(emp);
      return acc;
    }, {} as any);

    // Add capacity data to departments
    capacityData.forEach(cap => {
      const employee = employees.find(emp => emp.id.toString() === cap.employeeId);
      if (employee && departments[employee.departmentId]) {
        departments[employee.departmentId].capacity.push(cap);
      }
    });

    // Calculate metrics for each department
    return Object.values(departments).map((dept: any) => {
      const totalCapacity = dept.capacity.reduce((sum: number, cap: any) => sum + cap.availableHours, 0);
      const totalAllocated = dept.capacity.reduce((sum: number, cap: any) => sum + cap.allocatedHours, 0);
      const avgUtilization = dept.capacity.length > 0 
        ? dept.capacity.reduce((sum: number, cap: any) => sum + cap.utilizationRate, 0) / dept.capacity.length 
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

  /**
   * Generate optimization suggestions
   */
  private static generateOptimizationSuggestions(employees: any[], capacityData: any[], mode: string) {
    const suggestions = [];

    // Analyze utilization patterns
    const utilizationAnalysis = employees.map(emp => {
      const empCapacity = capacityData.filter(cap => cap.employeeId === emp.id.toString());
      const avgUtilization = empCapacity.length > 0 
        ? empCapacity.reduce((sum, cap) => sum + cap.utilizationRate, 0) / empCapacity.length
        : 0;
      
      return { employee: emp, utilization: avgUtilization, capacity: empCapacity };
    });

    const overUtilized = utilizationAnalysis.filter(emp => emp.utilization > 0.9);
    const underUtilized = utilizationAnalysis.filter(emp => emp.utilization < 0.6);

    // Generate reallocation suggestions
    if (overUtilized.length > 0 && underUtilized.length > 0) {
      overUtilized.forEach(over => {
        const potentialMatch = underUtilized.find(under => 
          over.employee.skills.some((skill: string) => under.employee.skills.includes(skill))
        );

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

    // Generate capacity adjustment suggestions based on mode
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
        affectedEmployees: employees.map((emp: any) => `${emp.firstName} ${emp.lastName}`),
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

  /**
   * Detect resource conflicts
   */
  private static detectResourceConflicts(capacityData: any[]) {
    const conflicts: any[] = [];

    // Group by employee
    const employeeCapacity = capacityData.reduce((acc, cap) => {
      if (!acc[cap.employeeId]) {
        acc[cap.employeeId] = [];
      }
      acc[cap.employeeId].push(cap);
      return acc;
    }, {} as any);

    // Check for over-allocation
    Object.entries(employeeCapacity).forEach(([employeeId, capacity]: [string, any[]]) => {
      const avgUtilization = capacity.reduce((sum, cap) => sum + cap.utilizationRate, 0) / capacity.length;
      
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

  /**
   * Calculate utilization trends
   */
  private static calculateUtilizationTrends(capacityData: any[]) {
    // Group by date
    const dateGroups = capacityData.reduce((acc, cap) => {
      const date = cap.date.split('T')[0];
      if (!acc[date]) {
        acc[date] = [];
      }
      acc[date].push(cap);
      return acc;
    }, {} as any);

    return Object.entries(dateGroups)
      .map(([date, dayCapacity]: [string, any[]]) => ({
        date,
        utilization: dayCapacity.reduce((sum, cap) => sum + cap.utilizationRate, 0) / dayCapacity.length,
        capacity: dayCapacity.reduce((sum, cap) => sum + cap.availableHours, 0),
        allocated: dayCapacity.reduce((sum, cap) => sum + cap.allocatedHours, 0)
      }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }

  /**
   * Analyze skills distribution
   */
  private static analyzeSkillsDistribution(employees: any[]) {
    const skillCounts = employees.reduce((acc, emp) => {
      emp.skills.forEach((skill: string) => {
        acc[skill] = (acc[skill] || 0) + 1;
      });
      return acc;
    }, {} as any);

    return Object.entries(skillCounts)
      .map(([skill, count]) => ({ skill, count }))
      .sort((a: any, b: any) => b.count - a.count);
  }

  /**
   * Calculate cost analysis
   */
  private static calculateCostAnalysis(employees: any[], capacityData: any[]) {
    const totalSalaries = employees.reduce((sum, emp) => sum + (emp.salary || 75000), 0);
    const totalAllocatedHours = capacityData.reduce((sum, cap) => sum + cap.allocatedHours, 0);
    const avgHourlyRate = 150; // $150/hour
    const projectedRevenue = totalAllocatedHours * avgHourlyRate;

    return {
      totalSalaries,
      avgSalary: employees.length > 0 ? totalSalaries / employees.length : 0,
      projectedRevenue,
      grossProfit: projectedRevenue - totalSalaries,
      profitMargin: projectedRevenue > 0 ? ((projectedRevenue - totalSalaries) / projectedRevenue) * 100 : 0
    };
  }

  /**
   * Calculate projections
   */
  private static calculateProjections(capacityData: any[]) {
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

  /**
   * Get period start date
   */
  private static getPeriodStartDate(period: string): Date {
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