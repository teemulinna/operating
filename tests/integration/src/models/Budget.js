"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BudgetModel = exports.Currency = exports.BudgetStatus = exports.CostCategory = void 0;
const database_service_1 = require("../database/database.service");
const types_1 = require("../types");
var CostCategory;
(function (CostCategory) {
    CostCategory["LABOR"] = "labor";
    CostCategory["MATERIALS"] = "materials";
    CostCategory["OVERHEAD"] = "overhead";
    CostCategory["EQUIPMENT"] = "equipment";
    CostCategory["TRAVEL"] = "travel";
    CostCategory["OTHER"] = "other";
})(CostCategory || (exports.CostCategory = CostCategory = {}));
var BudgetStatus;
(function (BudgetStatus) {
    BudgetStatus["DRAFT"] = "draft";
    BudgetStatus["APPROVED"] = "approved";
    BudgetStatus["ACTIVE"] = "active";
    BudgetStatus["COMPLETED"] = "completed";
    BudgetStatus["OVERBUDGET"] = "overbudget";
    BudgetStatus["CANCELLED"] = "cancelled";
})(BudgetStatus || (exports.BudgetStatus = BudgetStatus = {}));
var Currency;
(function (Currency) {
    Currency["USD"] = "USD";
    Currency["EUR"] = "EUR";
    Currency["GBP"] = "GBP";
    Currency["JPY"] = "JPY";
    Currency["CAD"] = "CAD";
    Currency["AUD"] = "AUD";
})(Currency || (exports.Currency = Currency = {}));
class BudgetModel {
    static initialize(pool) {
        this.pool = pool;
    }
    static async create(input) {
        try {
            const query = `
        INSERT INTO budgets (
          project_id, total_budget, allocated_budget, spent_budget, committed_budget,
          cost_categories, currency, status, contingency_percentage, notes, created_by
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING *
      `;
            const values = [
                input.projectId,
                input.totalBudget,
                0, // allocated_budget
                0, // spent_budget
                0, // committed_budget
                JSON.stringify(input.costCategories || {}),
                input.currency || Currency.USD,
                input.status || BudgetStatus.DRAFT,
                input.contingencyPercentage || 10.00,
                input.notes || null,
                input.createdBy || null
            ];
            const result = await this.pool.query(query, values);
            return this.mapRow(result.rows[0]);
        }
        catch (error) {
            if (error.code === '23505') {
                throw new types_1.DatabaseError('Budget for this project already exists');
            }
            if (error.code === '23503') {
                throw new types_1.DatabaseError('Invalid project ID');
            }
            throw error;
        }
    }
    static async findById(id) {
        if (!this.db.isConnected()) {
            await this.db.connect();
        }
        const query = `SELECT * FROM budgets WHERE id = $1`;
        const result = await this.db.query(query, [id]);
        return result.rows.length > 0 ? this.mapRow(result.rows[0]) : null;
    }
    static async findByProjectId(projectId) {
        if (!this.db.isConnected()) {
            await this.db.connect();
        }
        const query = `SELECT * FROM budgets WHERE project_id = $1 ORDER BY created_at DESC LIMIT 1`;
        const result = await this.db.query(query, [projectId]);
        return result.rows.length > 0 ? this.mapRow(result.rows[0]) : null;
    }
    static async update(id, updates) {
        const updateFields = [];
        const values = [];
        if (updates.totalBudget !== undefined) {
            values.push(updates.totalBudget);
            updateFields.push(`total_budget = $${values.length}`);
        }
        if (updates.allocatedBudget !== undefined) {
            values.push(updates.allocatedBudget);
            updateFields.push(`allocated_budget = $${values.length}`);
        }
        if (updates.spentBudget !== undefined) {
            values.push(updates.spentBudget);
            updateFields.push(`spent_budget = $${values.length}`);
        }
        if (updates.committedBudget !== undefined) {
            values.push(updates.committedBudget);
            updateFields.push(`committed_budget = $${values.length}`);
        }
        if (updates.status !== undefined) {
            values.push(updates.status);
            updateFields.push(`status = $${values.length}`);
        }
        if (updates.costCategories !== undefined) {
            values.push(JSON.stringify(updates.costCategories));
            updateFields.push(`cost_categories = $${values.length}`);
        }
        if (updates.contingencyPercentage !== undefined) {
            values.push(updates.contingencyPercentage);
            updateFields.push(`contingency_percentage = $${values.length}`);
        }
        if (updates.notes !== undefined) {
            values.push(updates.notes);
            updateFields.push(`notes = $${values.length}`);
        }
        if (updates.updatedBy !== undefined) {
            values.push(updates.updatedBy);
            updateFields.push(`updated_by = $${values.length}`);
        }
        if (updateFields.length === 0) {
            throw new Error('No fields to update');
        }
        values.push(id);
        const query = `
      UPDATE budgets 
      SET ${updateFields.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE id = $${values.length}
      RETURNING *
    `;
        const result = await this.pool.query(query, values);
        if (result.rows.length === 0) {
            throw new Error('Budget not found');
        }
        return this.mapRow(result.rows[0]);
    }
    static getRemainingBudget(budget) {
        return Number(budget.totalBudget) - Number(budget.spentBudget) - Number(budget.committedBudget);
    }
    static getUtilizationPercentage(budget) {
        const total = Number(budget.totalBudget);
        if (total === 0)
            return 0;
        return ((Number(budget.spentBudget) + Number(budget.committedBudget)) / total) * 100;
    }
    static getHealthStatus(budget) {
        const utilization = this.getUtilizationPercentage(budget);
        if (utilization <= 75)
            return 'healthy';
        if (utilization <= 95)
            return 'warning';
        return 'critical';
    }
    static mapRow(row) {
        return {
            id: row.id,
            projectId: row.project_id,
            totalBudget: parseFloat(row.total_budget),
            allocatedBudget: parseFloat(row.allocated_budget) || 0,
            spentBudget: parseFloat(row.spent_budget) || 0,
            committedBudget: parseFloat(row.committed_budget) || 0,
            costCategories: typeof row.cost_categories === 'string'
                ? JSON.parse(row.cost_categories)
                : row.cost_categories,
            currency: row.currency,
            status: row.status,
            budgetPeriods: row.budget_periods ? JSON.parse(row.budget_periods) : undefined,
            contingencyPercentage: parseFloat(row.contingency_percentage) || 10,
            approvalWorkflow: row.approval_workflow ? JSON.parse(row.approval_workflow) : undefined,
            costCenters: row.cost_centers ? JSON.parse(row.cost_centers) : undefined,
            notes: row.notes,
            exchangeRates: row.exchange_rates ? JSON.parse(row.exchange_rates) : undefined,
            createdAt: row.created_at,
            updatedAt: row.updated_at,
            createdBy: row.created_by,
            updatedBy: row.updated_by
        };
    }
}
exports.BudgetModel = BudgetModel;
BudgetModel.db = database_service_1.DatabaseService.getInstance();
