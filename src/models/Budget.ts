import { Pool } from 'pg';
import { DatabaseService } from '../database/database.service';
import { DatabaseError } from '../types';

export enum CostCategory {
  LABOR = 'labor',
  MATERIALS = 'materials',
  OVERHEAD = 'overhead',
  EQUIPMENT = 'equipment',
  TRAVEL = 'travel',
  OTHER = 'other'
}

export enum BudgetStatus {
  DRAFT = 'draft',
  APPROVED = 'approved',
  ACTIVE = 'active',
  COMPLETED = 'completed',
  OVERBUDGET = 'overbudget',
  CANCELLED = 'cancelled'
}

export enum Currency {
  USD = 'USD',
  EUR = 'EUR',
  GBP = 'GBP',
  JPY = 'JPY',
  CAD = 'CAD',
  AUD = 'AUD'
}

export interface Budget {
  id: number;
  projectId: number;
  totalBudget: number;
  allocatedBudget: number;
  spentBudget: number;
  committedBudget: number;
  costCategories: {
    [key in CostCategory]?: {
      budgeted: number;
      allocated: number;
      spent: number;
      committed: number;
    };
  };
  currency: Currency;
  status: BudgetStatus;
  budgetPeriods?: {
    period: string;
    budgeted: number;
    allocated: number;
    spent: number;
    forecast: number;
  }[];
  contingencyPercentage: number;
  approvalWorkflow?: {
    approver: string;
    approvedAt: Date;
    comments?: string;
    amount: number;
  }[];
  costCenters?: {
    costCenterCode: string;
    name: string;
    allocation: number;
    percentage: number;
  }[];
  notes?: string;
  exchangeRates?: {
    currency: Currency;
    rate: number;
    effectiveDate: Date;
  }[];
  createdAt: Date;
  updatedAt: Date;
  createdBy?: string;
  updatedBy?: string;

}

export interface CreateBudgetInput {
  projectId: number;
  totalBudget: number;
  currency?: Currency;
  status?: BudgetStatus;
  costCategories?: Budget['costCategories'];
  contingencyPercentage?: number;
  notes?: string;
  createdBy?: string;
}

export interface UpdateBudgetInput {
  totalBudget?: number;
  allocatedBudget?: number;
  spentBudget?: number;
  committedBudget?: number;
  status?: BudgetStatus;
  costCategories?: Budget['costCategories'];
  contingencyPercentage?: number;
  notes?: string;
  updatedBy?: string;
}

export class BudgetModel {
  private static pool: Pool;
  private static db = DatabaseService.getInstance();

  static initialize(pool: Pool): void {
    this.pool = pool;
  }

  static async create(input: CreateBudgetInput): Promise<Budget> {
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
    } catch (error: any) {
      if (error.code === '23505') {
        throw new DatabaseError('Budget for this project already exists');
      }
      if (error.code === '23503') {
        throw new DatabaseError('Invalid project ID');
      }
      throw error;
    }
  }

  static async findById(id: string): Promise<Budget | null> {
    if (!this.db.isConnected()) {
      await this.db.connect();
    }

    const query = `SELECT * FROM budgets WHERE id = $1`;
    const result = await this.db.query(query, [id]);
    return result.rows.length > 0 ? this.mapRow(result.rows[0]) : null;
  }

  static async findByProjectId(projectId: string): Promise<Budget | null> {
    if (!this.db.isConnected()) {
      await this.db.connect();
    }

    const query = `SELECT * FROM budgets WHERE project_id = $1 ORDER BY created_at DESC LIMIT 1`;
    const result = await this.db.query(query, [projectId]);
    return result.rows.length > 0 ? this.mapRow(result.rows[0]) : null;
  }

  static async update(id: string, updates: UpdateBudgetInput): Promise<Budget> {
    const updateFields: string[] = [];
    const values: any[] = [];

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

  static getRemainingBudget(budget: Budget): number {
    return Number(budget.totalBudget) - Number(budget.spentBudget) - Number(budget.committedBudget);
  }

  static getUtilizationPercentage(budget: Budget): number {
    const total = Number(budget.totalBudget);
    if (total === 0) return 0;
    return ((Number(budget.spentBudget) + Number(budget.committedBudget)) / total) * 100;
  }

  static getHealthStatus(budget: Budget): 'healthy' | 'warning' | 'critical' {
    const utilization = this.getUtilizationPercentage(budget);
    if (utilization <= 75) return 'healthy';
    if (utilization <= 95) return 'warning';
    return 'critical';
  }

  private static mapRow(row: any): Budget {
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