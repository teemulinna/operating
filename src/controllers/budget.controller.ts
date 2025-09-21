import { Request, Response } from 'express';
import { BudgetService } from '../services/budget.service';
import {
  BudgetStatus,
  CostCategory,
  Currency
} from '../models/Budget';
import {
  ResourceCostModel
} from '../models/ResourceCost';
import { asyncHandler } from '../middleware/async-handler';
import { ApiError } from '../utils/api-error';
import { z } from 'zod';

// Validation schemas
const createBudgetSchema = z.object({
  projectId: z.number().positive('Project ID must be a positive number'),
  totalBudget: z.number().positive('Total budget must be a positive number'),
  currency: z.nativeEnum(Currency).optional(),
  status: z.nativeEnum(BudgetStatus).optional(),
  costCategories: z.record(z.object({
    budgeted: z.number().min(0),
    allocated: z.number().min(0).default(0),
    spent: z.number().min(0).default(0),
    committed: z.number().min(0).default(0)
  })).optional(),
  contingencyPercentage: z.number().min(0).max(100).optional(),
  notes: z.string().optional(),
  createdBy: z.string().optional()
});

const updateBudgetSchema = z.object({
  totalBudget: z.number().positive().optional(),
  allocatedBudget: z.number().min(0).optional(),
  spentBudget: z.number().min(0).optional(),
  committedBudget: z.number().min(0).optional(),
  status: z.nativeEnum(BudgetStatus).optional(),
  costCategories: z.record(z.object({
    budgeted: z.number().min(0),
    allocated: z.number().min(0),
    spent: z.number().min(0),
    committed: z.number().min(0)
  })).optional(),
  contingencyPercentage: z.number().min(0).max(100).optional(),
  notes: z.string().optional(),
  updatedBy: z.string().optional()
});

const createResourceCostSchema = z.object({
  employeeId: z.string().uuid('Employee ID must be a valid UUID'),
  baseRate: z.number().positive('Base rate must be a positive number'),
  overtimeRate: z.number().positive().optional(),
  billableRate: z.number().positive().optional(),
  costType: z.enum(['hourly', 'daily', 'weekly', 'monthly', 'project_based', 'fixed']).optional(),
  rateType: z.enum(['standard', 'overtime', 'double_time', 'weekend', 'holiday', 'emergency']).optional(),
  billingType: z.enum(['billable', 'non_billable', 'internal', 'overhead']).optional(),
  currency: z.nativeEnum(Currency).optional(),
  costCenterCode: z.string().optional(),
  costCenterName: z.string().optional(),
  effectiveDate: z.string().transform(str => new Date(str)),
  endDate: z.string().transform(str => new Date(str)).optional(),
  notes: z.string().optional(),
  createdBy: z.string().optional()
});

const updateSpendingSchema = z.object({
  amount: z.number().positive('Amount must be a positive number'),
  category: z.nativeEnum(CostCategory),
  description: z.string().optional()
});

export class BudgetController {
  // Create a new budget for a project
  static createBudget = asyncHandler(async (req: Request, res: Response) => {
    const validatedData = createBudgetSchema.parse(req.body);
    
    try {
      const budgetData = {
        projectId: validatedData.projectId,
        totalBudget: validatedData.totalBudget,
        ...(validatedData.currency && { currency: validatedData.currency }),
        ...(validatedData.status && { status: validatedData.status }),
        ...(validatedData.costCategories && { costCategories: validatedData.costCategories }),
        ...(validatedData.contingencyPercentage && { contingencyPercentage: validatedData.contingencyPercentage }),
        ...(validatedData.notes && { notes: validatedData.notes }),
        ...(validatedData.createdBy && { createdBy: validatedData.createdBy })
      };
      const budget = await BudgetService.createBudget(budgetData);
      
      res.status(201).json({
        success: true,
        message: 'Budget created successfully',
        data: budget
      });
    } catch (error: any) {
      if (error.message.includes('already exists')) {
        throw new ApiError(409, error.message);
      }
      throw new ApiError(400, `Failed to create budget: ${error.message}`);
    }
  });

  // Get budget by project ID
  static getBudgetByProjectId = asyncHandler(async (req: Request, res: Response) => {
    const { projectId } = req.params;
    
    if (!projectId || isNaN(Number(projectId))) {
      throw new ApiError(400, 'Valid project ID is required');
    }

    try {
      const reports = await BudgetService.generateCostReports(projectId);
      
      if (!reports) {
        throw new ApiError(404, 'Budget not found for this project');
      }

      res.json({
        success: true,
        data: reports
      });
    } catch (error: any) {
      if (error.message.includes('not found')) {
        throw new ApiError(404, error.message);
      }
      throw new ApiError(500, `Failed to retrieve budget: ${error.message}`);
    }
  });

  // Update budget
  static updateBudget = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const validatedData = updateBudgetSchema.parse(req.body);
    
    if (!id || isNaN(Number(id))) {
      throw new ApiError(400, 'Valid budget ID is required');
    }

    try {
      const updateData: any = {};
      if (validatedData.totalBudget !== undefined) updateData.totalBudget = validatedData.totalBudget;
      if (validatedData.allocatedBudget !== undefined) updateData.allocatedBudget = validatedData.allocatedBudget;
      if (validatedData.spentBudget !== undefined) updateData.spentBudget = validatedData.spentBudget;
      if (validatedData.committedBudget !== undefined) updateData.committedBudget = validatedData.committedBudget;
      if (validatedData.status !== undefined) updateData.status = validatedData.status;
      if (validatedData.costCategories !== undefined) updateData.costCategories = validatedData.costCategories;
      if (validatedData.contingencyPercentage !== undefined) updateData.contingencyPercentage = validatedData.contingencyPercentage;
      if (validatedData.notes !== undefined) updateData.notes = validatedData.notes;
      if (validatedData.updatedBy !== undefined) updateData.updatedBy = validatedData.updatedBy;

      const budget = await BudgetService.updateBudget(id, updateData);
      
      res.json({
        success: true,
        message: 'Budget updated successfully',
        data: budget
      });
    } catch (error: any) {
      if (error.message.includes('not found')) {
        throw new ApiError(404, error.message);
      }
      throw new ApiError(400, `Failed to update budget: ${error.message}`);
    }
  });

  // Calculate project cost
  static calculateProjectCost = asyncHandler(async (req: Request, res: Response) => {
    const { projectId } = req.params;
    
    if (!projectId || isNaN(Number(projectId))) {
      throw new ApiError(400, 'Valid project ID is required');
    }

    try {
      const costCalculation = await BudgetService.calculateProjectCost(projectId);
      
      res.json({
        success: true,
        data: costCalculation
      });
    } catch (error: any) {
      throw new ApiError(500, `Failed to calculate project cost: ${error.message}`);
    }
  });

  // Track resource costs for a period
  static trackResourceCosts = asyncHandler(async (req: Request, res: Response) => {
    const { projectId } = req.params;
    const { startDate, endDate } = req.query;
    
    if (!projectId || isNaN(Number(projectId))) {
      throw new ApiError(400, 'Valid project ID is required');
    }
    
    if (!startDate || !endDate) {
      throw new ApiError(400, 'Start date and end date are required');
    }

    try {
      const start = new Date(startDate as string);
      const end = new Date(endDate as string);
      
      if (start > end) {
        throw new ApiError(400, 'Start date must be before end date');
      }

      const resourceCosts = await BudgetService.trackResourceCosts(projectId, start, end);
      
      res.json({
        success: true,
        data: resourceCosts
      });
    } catch (error: any) {
      throw new ApiError(500, `Failed to track resource costs: ${error.message}`);
    }
  });

  // Generate comprehensive budget reports
  static generateBudgetReports = asyncHandler(async (req: Request, res: Response) => {
    const { projectId } = req.params;
    
    if (!projectId || isNaN(Number(projectId))) {
      throw new ApiError(400, 'Valid project ID is required');
    }

    try {
      const reports = await BudgetService.generateCostReports(projectId);
      
      res.json({
        success: true,
        data: reports
      });
    } catch (error: any) {
      if (error.message.includes('not found')) {
        throw new ApiError(404, error.message);
      }
      throw new ApiError(500, `Failed to generate budget reports: ${error.message}`);
    }
  });

  // Get budget forecasting
  static getBudgetForecast = asyncHandler(async (req: Request, res: Response) => {
    const { projectId } = req.params;
    const { periods = '6' } = req.query;
    
    if (!projectId || isNaN(Number(projectId))) {
      throw new ApiError(400, 'Valid project ID is required');
    }

    try {
      const forecastPeriods = parseInt(periods as string) || 6;
      const forecast = await BudgetService.budgetForecasting(projectId, forecastPeriods);
      
      res.json({
        success: true,
        data: forecast
      });
    } catch (error: any) {
      throw new ApiError(500, `Failed to generate budget forecast: ${error.message}`);
    }
  });

  // Perform cost variance analysis
  static getCostVarianceAnalysis = asyncHandler(async (req: Request, res: Response) => {
    const { projectId } = req.params;
    
    if (!projectId || isNaN(Number(projectId))) {
      throw new ApiError(400, 'Valid project ID is required');
    }

    try {
      const analysis = await BudgetService.costVarianceAnalysis(projectId);
      
      res.json({
        success: true,
        data: analysis
      });
    } catch (error: any) {
      if (error.message.includes('not found')) {
        throw new ApiError(404, error.message);
      }
      throw new ApiError(500, `Failed to perform cost variance analysis: ${error.message}`);
    }
  });

  // Update budget spending
  static updateBudgetSpending = asyncHandler(async (req: Request, res: Response) => {
    const { projectId } = req.params;
    const validatedData = updateSpendingSchema.parse(req.body);
    
    if (!projectId || isNaN(Number(projectId))) {
      throw new ApiError(400, 'Valid project ID is required');
    }

    try {
      const budget = await BudgetService.updateBudgetSpending(
        projectId,
        validatedData.amount,
        validatedData.category,
        validatedData.description
      );
      
      res.json({
        success: true,
        message: 'Budget spending updated successfully',
        data: budget
      });
    } catch (error: any) {
      if (error.message.includes('not found')) {
        throw new ApiError(404, error.message);
      }
      throw new ApiError(400, `Failed to update budget spending: ${error.message}`);
    }
  });

  // Create resource cost rate
  static createResourceCost = asyncHandler(async (req: Request, res: Response) => {
    const validatedData = createResourceCostSchema.parse(req.body);
    
    try {
      const resourceData: any = {
        employeeId: validatedData.employeeId,
        baseRate: validatedData.baseRate,
        effectiveDate: validatedData.effectiveDate
      };
      if (validatedData.overtimeRate !== undefined) resourceData.overtimeRate = validatedData.overtimeRate;
      if (validatedData.billableRate !== undefined) resourceData.billableRate = validatedData.billableRate;
      if (validatedData.costType !== undefined) resourceData.costType = validatedData.costType;
      if (validatedData.rateType !== undefined) resourceData.rateType = validatedData.rateType;
      if (validatedData.billingType !== undefined) resourceData.billingType = validatedData.billingType;
      if (validatedData.currency !== undefined) resourceData.currency = validatedData.currency;
      if (validatedData.costCenterCode !== undefined) resourceData.costCenterCode = validatedData.costCenterCode;
      if (validatedData.costCenterName !== undefined) resourceData.costCenterName = validatedData.costCenterName;
      if (validatedData.endDate !== undefined) resourceData.endDate = validatedData.endDate;
      if (validatedData.notes !== undefined) resourceData.notes = validatedData.notes;
      if (validatedData.createdBy !== undefined) resourceData.createdBy = validatedData.createdBy;

      const resourceCost = await ResourceCostModel.create(resourceData);
      
      res.status(201).json({
        success: true,
        message: 'Resource cost created successfully',
        data: resourceCost
      });
    } catch (error: any) {
      if (error.message.includes('already exists')) {
        throw new ApiError(409, error.message);
      }
      throw new ApiError(400, `Failed to create resource cost: ${error.message}`);
    }
  });

  // Get resource costs for an employee
  static getResourceCostsByEmployee = asyncHandler(async (req: Request, res: Response) => {
    const { employeeId } = req.params;
    const { effectiveDate } = req.query;
    
    if (!employeeId || isNaN(Number(employeeId))) {
      throw new ApiError(400, 'Valid employee ID is required');
    }

    try {
      const effectiveDateParam = effectiveDate ? new Date(effectiveDate as string) : undefined;
      const resourceCosts = await ResourceCostModel.findByEmployeeId(employeeId, effectiveDateParam);
      
      res.json({
        success: true,
        data: resourceCosts
      });
    } catch (error: any) {
      throw new ApiError(500, `Failed to retrieve resource costs: ${error.message}`);
    }
  });

  // Get current rate for an employee
  static getCurrentEmployeeRate = asyncHandler(async (req: Request, res: Response) => {
    const { employeeId } = req.params;
    
    if (!employeeId || isNaN(Number(employeeId))) {
      throw new ApiError(400, 'Valid employee ID is required');
    }

    try {
      const currentRate = await ResourceCostModel.getCurrentRateForEmployee(employeeId);
      
      if (!currentRate) {
        throw new ApiError(404, 'No current rate found for this employee');
      }
      
      res.json({
        success: true,
        data: currentRate
      });
    } catch (error: any) {
      if (error.message.includes('not found')) {
        throw new ApiError(404, error.message);
      }
      throw new ApiError(500, `Failed to retrieve current employee rate: ${error.message}`);
    }
  });

  // Update resource cost
  static updateResourceCost = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const validatedData = updateBudgetSchema.parse(req.body);
    
    if (!id || isNaN(Number(id))) {
      throw new ApiError(400, 'Valid resource cost ID is required');
    }

    try {
      const updateData: any = {};
      if (validatedData.totalBudget !== undefined) updateData.totalBudget = validatedData.totalBudget;
      if (validatedData.allocatedBudget !== undefined) updateData.allocatedBudget = validatedData.allocatedBudget;
      if (validatedData.spentBudget !== undefined) updateData.spentBudget = validatedData.spentBudget;
      if (validatedData.committedBudget !== undefined) updateData.committedBudget = validatedData.committedBudget;
      if (validatedData.status !== undefined) updateData.status = validatedData.status;
      if (validatedData.costCategories !== undefined) updateData.costCategories = validatedData.costCategories;
      if (validatedData.contingencyPercentage !== undefined) updateData.contingencyPercentage = validatedData.contingencyPercentage;
      if (validatedData.notes !== undefined) updateData.notes = validatedData.notes;
      if (validatedData.updatedBy !== undefined) updateData.updatedBy = validatedData.updatedBy;

      const resourceCost = await ResourceCostModel.update(id, updateData);
      
      res.json({
        success: true,
        message: 'Resource cost updated successfully',
        data: resourceCost
      });
    } catch (error: any) {
      if (error.message.includes('not found')) {
        throw new ApiError(404, error.message);
      }
      throw new ApiError(400, `Failed to update resource cost: ${error.message}`);
    }
  });

  // Get budget dashboard data
  static getBudgetDashboard = asyncHandler(async (req: Request, res: Response) => {
    const { projectId } = req.params;
    
    if (!projectId || isNaN(Number(projectId))) {
      throw new ApiError(400, 'Valid project ID is required');
    }

    try {
      // Get comprehensive budget data for dashboard
      const [reports, forecast, analysis] = await Promise.all([
        BudgetService.generateCostReports(projectId),
        BudgetService.budgetForecasting(projectId, 6),
        BudgetService.costVarianceAnalysis(projectId)
      ]);

      res.json({
        success: true,
        data: {
          reports,
          forecast,
          analysis
        }
      });
    } catch (error: any) {
      if (error.message.includes('not found')) {
        throw new ApiError(404, error.message);
      }
      throw new ApiError(500, `Failed to retrieve budget dashboard data: ${error.message}`);
    }
  });
}