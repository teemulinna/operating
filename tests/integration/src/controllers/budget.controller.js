"use strict";
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.BudgetController = void 0;
const budget_service_1 = require("../services/budget.service");
const Budget_1 = require("../models/Budget");
const ResourceCost_1 = require("../models/ResourceCost");
const async_handler_1 = require("../middleware/async-handler");
const api_error_1 = require("../utils/api-error");
const zod_1 = require("zod");
// Validation schemas
const createBudgetSchema = zod_1.z.object({
    projectId: zod_1.z.number().positive('Project ID must be a positive number'),
    totalBudget: zod_1.z.number().positive('Total budget must be a positive number'),
    currency: zod_1.z.nativeEnum(Budget_1.Currency).optional(),
    status: zod_1.z.nativeEnum(Budget_1.BudgetStatus).optional(),
    costCategories: zod_1.z.record(zod_1.z.object({
        budgeted: zod_1.z.number().min(0),
        allocated: zod_1.z.number().min(0).default(0),
        spent: zod_1.z.number().min(0).default(0),
        committed: zod_1.z.number().min(0).default(0)
    })).optional(),
    contingencyPercentage: zod_1.z.number().min(0).max(100).optional(),
    notes: zod_1.z.string().optional(),
    createdBy: zod_1.z.string().optional()
});
const updateBudgetSchema = zod_1.z.object({
    totalBudget: zod_1.z.number().positive().optional(),
    allocatedBudget: zod_1.z.number().min(0).optional(),
    spentBudget: zod_1.z.number().min(0).optional(),
    committedBudget: zod_1.z.number().min(0).optional(),
    status: zod_1.z.nativeEnum(Budget_1.BudgetStatus).optional(),
    costCategories: zod_1.z.record(zod_1.z.object({
        budgeted: zod_1.z.number().min(0),
        allocated: zod_1.z.number().min(0),
        spent: zod_1.z.number().min(0),
        committed: zod_1.z.number().min(0)
    })).optional(),
    contingencyPercentage: zod_1.z.number().min(0).max(100).optional(),
    notes: zod_1.z.string().optional(),
    updatedBy: zod_1.z.string().optional()
});
const createResourceCostSchema = zod_1.z.object({
    employeeId: zod_1.z.string().uuid('Employee ID must be a valid UUID'),
    baseRate: zod_1.z.number().positive('Base rate must be a positive number'),
    overtimeRate: zod_1.z.number().positive().optional(),
    billableRate: zod_1.z.number().positive().optional(),
    costType: zod_1.z.enum(['hourly', 'daily', 'weekly', 'monthly', 'project_based', 'fixed']).optional(),
    rateType: zod_1.z.enum(['standard', 'overtime', 'double_time', 'weekend', 'holiday', 'emergency']).optional(),
    billingType: zod_1.z.enum(['billable', 'non_billable', 'internal', 'overhead']).optional(),
    currency: zod_1.z.nativeEnum(Budget_1.Currency).optional(),
    costCenterCode: zod_1.z.string().optional(),
    costCenterName: zod_1.z.string().optional(),
    effectiveDate: zod_1.z.string().transform(str => new Date(str)),
    endDate: zod_1.z.string().transform(str => new Date(str)).optional(),
    notes: zod_1.z.string().optional(),
    createdBy: zod_1.z.string().optional()
});
const updateSpendingSchema = zod_1.z.object({
    amount: zod_1.z.number().positive('Amount must be a positive number'),
    category: zod_1.z.nativeEnum(Budget_1.CostCategory),
    description: zod_1.z.string().optional()
});
class BudgetController {
}
exports.BudgetController = BudgetController;
_a = BudgetController;
// Create a new budget for a project
BudgetController.createBudget = (0, async_handler_1.asyncHandler)(async (req, res) => {
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
        const budget = await budget_service_1.BudgetService.createBudget(budgetData);
        res.status(201).json({
            success: true,
            message: 'Budget created successfully',
            data: budget
        });
    }
    catch (error) {
        if (error.message.includes('already exists')) {
            throw new api_error_1.ApiError(409, error.message);
        }
        throw new api_error_1.ApiError(400, `Failed to create budget: ${error.message}`);
    }
});
// Get budget by project ID
BudgetController.getBudgetByProjectId = (0, async_handler_1.asyncHandler)(async (req, res) => {
    const { projectId } = req.params;
    if (!projectId || isNaN(Number(projectId))) {
        throw new api_error_1.ApiError(400, 'Valid project ID is required');
    }
    try {
        const reports = await budget_service_1.BudgetService.generateCostReports(projectId);
        if (!reports) {
            throw new api_error_1.ApiError(404, 'Budget not found for this project');
        }
        res.json({
            success: true,
            data: reports
        });
    }
    catch (error) {
        if (error.message.includes('not found')) {
            throw new api_error_1.ApiError(404, error.message);
        }
        throw new api_error_1.ApiError(500, `Failed to retrieve budget: ${error.message}`);
    }
});
// Update budget
BudgetController.updateBudget = (0, async_handler_1.asyncHandler)(async (req, res) => {
    const { id } = req.params;
    const validatedData = updateBudgetSchema.parse(req.body);
    if (!id || isNaN(Number(id))) {
        throw new api_error_1.ApiError(400, 'Valid budget ID is required');
    }
    try {
        const updateData = {};
        if (validatedData.totalBudget !== undefined)
            updateData.totalBudget = validatedData.totalBudget;
        if (validatedData.allocatedBudget !== undefined)
            updateData.allocatedBudget = validatedData.allocatedBudget;
        if (validatedData.spentBudget !== undefined)
            updateData.spentBudget = validatedData.spentBudget;
        if (validatedData.committedBudget !== undefined)
            updateData.committedBudget = validatedData.committedBudget;
        if (validatedData.status !== undefined)
            updateData.status = validatedData.status;
        if (validatedData.costCategories !== undefined)
            updateData.costCategories = validatedData.costCategories;
        if (validatedData.contingencyPercentage !== undefined)
            updateData.contingencyPercentage = validatedData.contingencyPercentage;
        if (validatedData.notes !== undefined)
            updateData.notes = validatedData.notes;
        if (validatedData.updatedBy !== undefined)
            updateData.updatedBy = validatedData.updatedBy;
        const budget = await budget_service_1.BudgetService.updateBudget(id, updateData);
        res.json({
            success: true,
            message: 'Budget updated successfully',
            data: budget
        });
    }
    catch (error) {
        if (error.message.includes('not found')) {
            throw new api_error_1.ApiError(404, error.message);
        }
        throw new api_error_1.ApiError(400, `Failed to update budget: ${error.message}`);
    }
});
// Calculate project cost
BudgetController.calculateProjectCost = (0, async_handler_1.asyncHandler)(async (req, res) => {
    const { projectId } = req.params;
    if (!projectId || isNaN(Number(projectId))) {
        throw new api_error_1.ApiError(400, 'Valid project ID is required');
    }
    try {
        const costCalculation = await budget_service_1.BudgetService.calculateProjectCost(projectId);
        res.json({
            success: true,
            data: costCalculation
        });
    }
    catch (error) {
        throw new api_error_1.ApiError(500, `Failed to calculate project cost: ${error.message}`);
    }
});
// Track resource costs for a period
BudgetController.trackResourceCosts = (0, async_handler_1.asyncHandler)(async (req, res) => {
    const { projectId } = req.params;
    const { startDate, endDate } = req.query;
    if (!projectId || isNaN(Number(projectId))) {
        throw new api_error_1.ApiError(400, 'Valid project ID is required');
    }
    if (!startDate || !endDate) {
        throw new api_error_1.ApiError(400, 'Start date and end date are required');
    }
    try {
        const start = new Date(startDate);
        const end = new Date(endDate);
        if (start > end) {
            throw new api_error_1.ApiError(400, 'Start date must be before end date');
        }
        const resourceCosts = await budget_service_1.BudgetService.trackResourceCosts(projectId, start, end);
        res.json({
            success: true,
            data: resourceCosts
        });
    }
    catch (error) {
        throw new api_error_1.ApiError(500, `Failed to track resource costs: ${error.message}`);
    }
});
// Generate comprehensive budget reports
BudgetController.generateBudgetReports = (0, async_handler_1.asyncHandler)(async (req, res) => {
    const { projectId } = req.params;
    if (!projectId || isNaN(Number(projectId))) {
        throw new api_error_1.ApiError(400, 'Valid project ID is required');
    }
    try {
        const reports = await budget_service_1.BudgetService.generateCostReports(projectId);
        res.json({
            success: true,
            data: reports
        });
    }
    catch (error) {
        if (error.message.includes('not found')) {
            throw new api_error_1.ApiError(404, error.message);
        }
        throw new api_error_1.ApiError(500, `Failed to generate budget reports: ${error.message}`);
    }
});
// Get budget forecasting
BudgetController.getBudgetForecast = (0, async_handler_1.asyncHandler)(async (req, res) => {
    const { projectId } = req.params;
    const { periods = '6' } = req.query;
    if (!projectId || isNaN(Number(projectId))) {
        throw new api_error_1.ApiError(400, 'Valid project ID is required');
    }
    try {
        const forecastPeriods = parseInt(periods) || 6;
        const forecast = await budget_service_1.BudgetService.budgetForecasting(projectId, forecastPeriods);
        res.json({
            success: true,
            data: forecast
        });
    }
    catch (error) {
        throw new api_error_1.ApiError(500, `Failed to generate budget forecast: ${error.message}`);
    }
});
// Perform cost variance analysis
BudgetController.getCostVarianceAnalysis = (0, async_handler_1.asyncHandler)(async (req, res) => {
    const { projectId } = req.params;
    if (!projectId || isNaN(Number(projectId))) {
        throw new api_error_1.ApiError(400, 'Valid project ID is required');
    }
    try {
        const analysis = await budget_service_1.BudgetService.costVarianceAnalysis(projectId);
        res.json({
            success: true,
            data: analysis
        });
    }
    catch (error) {
        if (error.message.includes('not found')) {
            throw new api_error_1.ApiError(404, error.message);
        }
        throw new api_error_1.ApiError(500, `Failed to perform cost variance analysis: ${error.message}`);
    }
});
// Update budget spending
BudgetController.updateBudgetSpending = (0, async_handler_1.asyncHandler)(async (req, res) => {
    const { projectId } = req.params;
    const validatedData = updateSpendingSchema.parse(req.body);
    if (!projectId || isNaN(Number(projectId))) {
        throw new api_error_1.ApiError(400, 'Valid project ID is required');
    }
    try {
        const budget = await budget_service_1.BudgetService.updateBudgetSpending(projectId, validatedData.amount, validatedData.category, validatedData.description);
        res.json({
            success: true,
            message: 'Budget spending updated successfully',
            data: budget
        });
    }
    catch (error) {
        if (error.message.includes('not found')) {
            throw new api_error_1.ApiError(404, error.message);
        }
        throw new api_error_1.ApiError(400, `Failed to update budget spending: ${error.message}`);
    }
});
// Create resource cost rate
BudgetController.createResourceCost = (0, async_handler_1.asyncHandler)(async (req, res) => {
    const validatedData = createResourceCostSchema.parse(req.body);
    try {
        const resourceData = {
            employeeId: validatedData.employeeId,
            baseRate: validatedData.baseRate,
            effectiveDate: validatedData.effectiveDate
        };
        if (validatedData.overtimeRate !== undefined)
            resourceData.overtimeRate = validatedData.overtimeRate;
        if (validatedData.billableRate !== undefined)
            resourceData.billableRate = validatedData.billableRate;
        if (validatedData.costType !== undefined)
            resourceData.costType = validatedData.costType;
        if (validatedData.rateType !== undefined)
            resourceData.rateType = validatedData.rateType;
        if (validatedData.billingType !== undefined)
            resourceData.billingType = validatedData.billingType;
        if (validatedData.currency !== undefined)
            resourceData.currency = validatedData.currency;
        if (validatedData.costCenterCode !== undefined)
            resourceData.costCenterCode = validatedData.costCenterCode;
        if (validatedData.costCenterName !== undefined)
            resourceData.costCenterName = validatedData.costCenterName;
        if (validatedData.endDate !== undefined)
            resourceData.endDate = validatedData.endDate;
        if (validatedData.notes !== undefined)
            resourceData.notes = validatedData.notes;
        if (validatedData.createdBy !== undefined)
            resourceData.createdBy = validatedData.createdBy;
        const resourceCost = await ResourceCost_1.ResourceCostModel.create(resourceData);
        res.status(201).json({
            success: true,
            message: 'Resource cost created successfully',
            data: resourceCost
        });
    }
    catch (error) {
        if (error.message.includes('already exists')) {
            throw new api_error_1.ApiError(409, error.message);
        }
        throw new api_error_1.ApiError(400, `Failed to create resource cost: ${error.message}`);
    }
});
// Get resource costs for an employee
BudgetController.getResourceCostsByEmployee = (0, async_handler_1.asyncHandler)(async (req, res) => {
    const { employeeId } = req.params;
    const { effectiveDate } = req.query;
    if (!employeeId || isNaN(Number(employeeId))) {
        throw new api_error_1.ApiError(400, 'Valid employee ID is required');
    }
    try {
        const effectiveDateParam = effectiveDate ? new Date(effectiveDate) : undefined;
        const resourceCosts = await ResourceCost_1.ResourceCostModel.findByEmployeeId(employeeId, effectiveDateParam);
        res.json({
            success: true,
            data: resourceCosts
        });
    }
    catch (error) {
        throw new api_error_1.ApiError(500, `Failed to retrieve resource costs: ${error.message}`);
    }
});
// Get current rate for an employee
BudgetController.getCurrentEmployeeRate = (0, async_handler_1.asyncHandler)(async (req, res) => {
    const { employeeId } = req.params;
    if (!employeeId || isNaN(Number(employeeId))) {
        throw new api_error_1.ApiError(400, 'Valid employee ID is required');
    }
    try {
        const currentRate = await ResourceCost_1.ResourceCostModel.getCurrentRateForEmployee(employeeId);
        if (!currentRate) {
            throw new api_error_1.ApiError(404, 'No current rate found for this employee');
        }
        res.json({
            success: true,
            data: currentRate
        });
    }
    catch (error) {
        if (error.message.includes('not found')) {
            throw new api_error_1.ApiError(404, error.message);
        }
        throw new api_error_1.ApiError(500, `Failed to retrieve current employee rate: ${error.message}`);
    }
});
// Update resource cost
BudgetController.updateResourceCost = (0, async_handler_1.asyncHandler)(async (req, res) => {
    const { id } = req.params;
    const validatedData = updateBudgetSchema.parse(req.body);
    if (!id || isNaN(Number(id))) {
        throw new api_error_1.ApiError(400, 'Valid resource cost ID is required');
    }
    try {
        const updateData = {};
        if (validatedData.totalBudget !== undefined)
            updateData.totalBudget = validatedData.totalBudget;
        if (validatedData.allocatedBudget !== undefined)
            updateData.allocatedBudget = validatedData.allocatedBudget;
        if (validatedData.spentBudget !== undefined)
            updateData.spentBudget = validatedData.spentBudget;
        if (validatedData.committedBudget !== undefined)
            updateData.committedBudget = validatedData.committedBudget;
        if (validatedData.status !== undefined)
            updateData.status = validatedData.status;
        if (validatedData.costCategories !== undefined)
            updateData.costCategories = validatedData.costCategories;
        if (validatedData.contingencyPercentage !== undefined)
            updateData.contingencyPercentage = validatedData.contingencyPercentage;
        if (validatedData.notes !== undefined)
            updateData.notes = validatedData.notes;
        if (validatedData.updatedBy !== undefined)
            updateData.updatedBy = validatedData.updatedBy;
        const resourceCost = await ResourceCost_1.ResourceCostModel.update(id, updateData);
        res.json({
            success: true,
            message: 'Resource cost updated successfully',
            data: resourceCost
        });
    }
    catch (error) {
        if (error.message.includes('not found')) {
            throw new api_error_1.ApiError(404, error.message);
        }
        throw new api_error_1.ApiError(400, `Failed to update resource cost: ${error.message}`);
    }
});
// Get budget dashboard data
BudgetController.getBudgetDashboard = (0, async_handler_1.asyncHandler)(async (req, res) => {
    const { projectId } = req.params;
    if (!projectId || isNaN(Number(projectId))) {
        throw new api_error_1.ApiError(400, 'Valid project ID is required');
    }
    try {
        // Get comprehensive budget data for dashboard
        const [reports, forecast, analysis] = await Promise.all([
            budget_service_1.BudgetService.generateCostReports(projectId),
            budget_service_1.BudgetService.budgetForecasting(projectId, 6),
            budget_service_1.BudgetService.costVarianceAnalysis(projectId)
        ]);
        res.json({
            success: true,
            data: {
                reports,
                forecast,
                analysis
            }
        });
    }
    catch (error) {
        if (error.message.includes('not found')) {
            throw new api_error_1.ApiError(404, error.message);
        }
        throw new api_error_1.ApiError(500, `Failed to retrieve budget dashboard data: ${error.message}`);
    }
});
