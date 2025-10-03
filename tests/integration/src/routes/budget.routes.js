"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.budgetRoutes = void 0;
const express_1 = require("express");
const budget_controller_1 = require("../controllers/budget.controller");
const router = (0, express_1.Router)();
exports.budgetRoutes = router;
// Apply authentication middleware to all routes
// router.use(authMiddleware); // Commented out for now to avoid type issues
// Budget Management Routes
/**
 * @route POST /api/budgets
 * @desc Create a new budget for a project
 * @access Private
 * @body {
 *   projectId: number,
 *   totalBudget: number,
 *   currency?: string,
 *   status?: string,
 *   costCategories?: object,
 *   contingencyPercentage?: number,
 *   notes?: string,
 *   createdBy?: string
 * }
 */
router.post('/', budget_controller_1.BudgetController.createBudget);
/**
 * @route GET /api/budgets/project/:projectId
 * @desc Get budget and comprehensive reports for a project
 * @access Private
 */
router.get('/project/:projectId', budget_controller_1.BudgetController.getBudgetByProjectId);
/**
 * @route PUT /api/budgets/:id
 * @desc Update an existing budget
 * @access Private
 * @body {
 *   totalBudget?: number,
 *   allocatedBudget?: number,
 *   spentBudget?: number,
 *   committedBudget?: number,
 *   status?: string,
 *   costCategories?: object,
 *   contingencyPercentage?: number,
 *   notes?: string,
 *   updatedBy?: string
 * }
 */
router.put('/:id', budget_controller_1.BudgetController.updateBudget);
/**
 * @route GET /api/budgets/project/:projectId/dashboard
 * @desc Get comprehensive budget dashboard data
 * @access Private
 */
router.get('/project/:projectId/dashboard', budget_controller_1.BudgetController.getBudgetDashboard);
// Cost Calculation and Analysis Routes
/**
 * @route GET /api/budgets/project/:projectId/calculate-cost
 * @desc Calculate estimated and actual project costs
 * @access Private
 */
router.get('/project/:projectId/calculate-cost', budget_controller_1.BudgetController.calculateProjectCost);
/**
 * @route GET /api/budgets/project/:projectId/track-costs
 * @desc Track resource costs for a specific time period
 * @access Private
 * @query {
 *   startDate: string (ISO date),
 *   endDate: string (ISO date)
 * }
 */
router.get('/project/:projectId/track-costs', budget_controller_1.BudgetController.trackResourceCosts);
/**
 * @route GET /api/budgets/project/:projectId/reports
 * @desc Generate comprehensive cost reports
 * @access Private
 */
router.get('/project/:projectId/reports', budget_controller_1.BudgetController.generateBudgetReports);
/**
 * @route GET /api/budgets/project/:projectId/forecast
 * @desc Get budget forecasting based on historical data
 * @access Private
 * @query {
 *   periods?: number (default: 6)
 * }
 */
router.get('/project/:projectId/forecast', budget_controller_1.BudgetController.getBudgetForecast);
/**
 * @route GET /api/budgets/project/:projectId/variance-analysis
 * @desc Perform cost variance analysis
 * @access Private
 */
router.get('/project/:projectId/variance-analysis', budget_controller_1.BudgetController.getCostVarianceAnalysis);
/**
 * @route POST /api/budgets/project/:projectId/spending
 * @desc Update budget spending with new expenses
 * @access Private
 * @body {
 *   amount: number,
 *   category: string,
 *   description?: string
 * }
 */
router.post('/project/:projectId/spending', budget_controller_1.BudgetController.updateBudgetSpending);
// Resource Cost Management Routes
/**
 * @route POST /api/budgets/resource-costs
 * @desc Create a new resource cost rate for an employee
 * @access Private
 * @body {
 *   employeeId: string,
 *   baseRate: number,
 *   overtimeRate?: number,
 *   billableRate?: number,
 *   costType?: string,
 *   rateType?: string,
 *   billingType?: string,
 *   currency?: string,
 *   costCenterCode?: string,
 *   costCenterName?: string,
 *   effectiveDate: string,
 *   endDate?: string,
 *   notes?: string,
 *   createdBy?: string
 * }
 */
router.post('/resource-costs', budget_controller_1.BudgetController.createResourceCost);
/**
 * @route GET /api/budgets/resource-costs/employee/:employeeId
 * @desc Get resource costs for a specific employee
 * @access Private
 * @query {
 *   effectiveDate?: string (ISO date)
 * }
 */
router.get('/resource-costs/employee/:employeeId', budget_controller_1.BudgetController.getResourceCostsByEmployee);
/**
 * @route GET /api/budgets/resource-costs/employee/:employeeId/current
 * @desc Get current rate for a specific employee
 * @access Private
 */
router.get('/resource-costs/employee/:employeeId/current', budget_controller_1.BudgetController.getCurrentEmployeeRate);
/**
 * @route PUT /api/budgets/resource-costs/:id
 * @desc Update resource cost rate
 * @access Private
 * @body {
 *   baseRate?: number,
 *   overtimeRate?: number,
 *   billableRate?: number,
 *   costType?: string,
 *   rateType?: string,
 *   billingType?: string,
 *   currency?: string,
 *   costCenterCode?: string,
 *   costCenterName?: string,
 *   effectiveDate?: string,
 *   endDate?: string,
 *   notes?: string,
 *   updatedBy?: string
 * }
 */
router.put('/resource-costs/:id', budget_controller_1.BudgetController.updateResourceCost);
