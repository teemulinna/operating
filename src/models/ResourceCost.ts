import { Pool } from 'pg';
import { DatabaseService } from '../database/database.service';
import { DatabaseError, PaginatedResponse } from '../types';
import { Currency } from './Budget';

export enum CostType {
  HOURLY = 'hourly',
  DAILY = 'daily',
  WEEKLY = 'weekly',
  MONTHLY = 'monthly',
  PROJECT_BASED = 'project_based',
  FIXED = 'fixed'
}

export enum RateType {
  STANDARD = 'standard',
  OVERTIME = 'overtime',
  DOUBLE_TIME = 'double_time',
  WEEKEND = 'weekend',
  HOLIDAY = 'holiday',
  EMERGENCY = 'emergency'
}

export enum BillingType {
  BILLABLE = 'billable',
  NON_BILLABLE = 'non_billable',
  INTERNAL = 'internal',
  OVERHEAD = 'overhead'
}

export interface ResourceCost {
  id: number;
  employeeId: string;
  baseRate: number;
  overtimeRate?: number;
  doubleTimeRate?: number;
  billableRate?: number;
  costType: CostType;
  rateType: RateType;
  billingType: BillingType;
  currency: Currency;
  costCenterCode?: string;
  costCenterName?: string;
  effectiveDate: Date;
  endDate?: Date;
  rateModifiers?: {
    skillId?: number;
    skillName?: string;
    modifier: number;
    modifierType: 'percentage' | 'fixed';
    description?: string;
  }[];
  overtimeRules?: {
    dailyThreshold: number;
    weeklyThreshold: number;
    weekendMultiplier: number;
    holidayMultiplier: number;
    maxHoursPerWeek?: number;
  };
  benefitsCost?: {
    healthInsurance?: number;
    retirement?: number;
    payrollTax?: number;
    workersComp?: number;
    unemployment?: number;
    overhead?: number;
    totalBenefitsRate?: number;
  };
  utilizationTarget?: number;
  projectRates?: {
    projectId: number;
    projectName: string;
    rate: number;
    billableRate?: number;
    effectiveDate: Date;
    endDate?: Date;
  }[];
  isActive: boolean;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
  createdBy?: string;
  updatedBy?: string;

}

export interface CreateResourceCostInput {
  employeeId: string;
  baseRate: number;
  overtimeRate?: number;
  billableRate?: number;
  costType?: CostType;
  rateType?: RateType;
  billingType?: BillingType;
  currency?: Currency;
  costCenterCode?: string;
  costCenterName?: string;
  effectiveDate: Date;
  endDate?: Date;
  isActive?: boolean;
  notes?: string;
  createdBy?: string;
}

export interface UpdateResourceCostInput {
  baseRate?: number;
  overtimeRate?: number;
  billableRate?: number;
  costType?: CostType;
  rateType?: RateType;
  billingType?: BillingType;
  currency?: Currency;
  costCenterCode?: string;
  costCenterName?: string;
  effectiveDate?: Date;
  endDate?: Date;
  isActive?: boolean;
  notes?: string;
  updatedBy?: string;
}

export class ResourceCostModel {
  private static pool: Pool;
  private static db = DatabaseService.getInstance();

  static initialize(pool: Pool): void {
    this.pool = pool;
  }

  static async create(input: CreateResourceCostInput): Promise<ResourceCost> {
    try {
      const query = `
        INSERT INTO resource_costs (
          employee_id, base_rate, overtime_rate, billable_rate, cost_type, rate_type,
          billing_type, currency, cost_center_code, cost_center_name, effective_date,
          end_date, is_active, notes, created_by
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
        RETURNING *
      `;

      const values = [
        input.employeeId,
        input.baseRate,
        input.overtimeRate || null,
        input.billableRate || null,
        input.costType || CostType.HOURLY,
        input.rateType || RateType.STANDARD,
        input.billingType || BillingType.BILLABLE,
        input.currency || Currency.USD,
        input.costCenterCode || null,
        input.costCenterName || null,
        input.effectiveDate,
        input.endDate || null,
        input.isActive !== false, // default true
        input.notes || null,
        input.createdBy || null
      ];

      const result = await this.pool.query(query, values);
      return this.mapRow(result.rows[0]);
    } catch (error: any) {
      if (error.code === '23505') {
        throw new DatabaseError('Resource cost with this configuration already exists');
      }
      if (error.code === '23503') {
        throw new DatabaseError('Invalid employee ID');
      }
      throw error;
    }
  }

  static async findByEmployeeId(
    employeeId: string,
    effectiveDate?: Date
  ): Promise<ResourceCost[]> {
    if (!this.db.isConnected()) {
      await this.db.connect();
    }

    let query = `
      SELECT * FROM resource_costs 
      WHERE employee_id = $1 AND is_active = true
    `;
    const values: any[] = [employeeId];

    if (effectiveDate) {
      values.push(effectiveDate);
      query += ` AND effective_date <= $${values.length} AND (end_date IS NULL OR end_date >= $${values.length})`;
    }

    query += ` ORDER BY effective_date DESC`;

    const result = await this.db.query(query, values);
    return result.rows.map(row => this.mapRow(row));
  }

  static async getCurrentRateForEmployee(employeeId: string): Promise<ResourceCost | null> {
    const rates = await this.findByEmployeeId(employeeId, new Date());
    return rates.length > 0 ? rates[0] : null;
  }

  static async update(id: string, updates: UpdateResourceCostInput): Promise<ResourceCost> {
    const updateFields: string[] = [];
    const values: any[] = [];

    if (updates.baseRate !== undefined) {
      values.push(updates.baseRate);
      updateFields.push(`base_rate = $${values.length}`);
    }

    if (updates.overtimeRate !== undefined) {
      values.push(updates.overtimeRate);
      updateFields.push(`overtime_rate = $${values.length}`);
    }

    if (updates.billableRate !== undefined) {
      values.push(updates.billableRate);
      updateFields.push(`billable_rate = $${values.length}`);
    }

    if (updates.costType !== undefined) {
      values.push(updates.costType);
      updateFields.push(`cost_type = $${values.length}`);
    }

    if (updates.rateType !== undefined) {
      values.push(updates.rateType);
      updateFields.push(`rate_type = $${values.length}`);
    }

    if (updates.billingType !== undefined) {
      values.push(updates.billingType);
      updateFields.push(`billing_type = $${values.length}`);
    }

    if (updates.endDate !== undefined) {
      values.push(updates.endDate);
      updateFields.push(`end_date = $${values.length}`);
    }

    if (updates.isActive !== undefined) {
      values.push(updates.isActive);
      updateFields.push(`is_active = $${values.length}`);
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
      UPDATE resource_costs 
      SET ${updateFields.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE id = $${values.length}
      RETURNING *
    `;

    const result = await this.pool.query(query, values);
    
    if (result.rows.length === 0) {
      throw new Error('Resource cost not found');
    }

    return this.mapRow(result.rows[0]);
  }

  static getTotalCompensationRate(resourceCost: ResourceCost): number {
    const base = Number(resourceCost.baseRate);
    const benefitsMultiplier = resourceCost.benefitsCost?.totalBenefitsRate 
      ? (100 + Number(resourceCost.benefitsCost.totalBenefitsRate)) / 100 
      : 1.3; // Default 30% benefits overhead
    
    return base * benefitsMultiplier;
  }

  static getProfitMargin(resourceCost: ResourceCost): number {
    if (!resourceCost.billableRate) return 0;
    const totalCost = this.getTotalCompensationRate(resourceCost);
    const revenue = Number(resourceCost.billableRate);
    return ((revenue - totalCost) / revenue) * 100;
  }

  private static mapRow(row: any): ResourceCost {
    const resourceCost: ResourceCost = {
      id: row.id,
      employeeId: row.employee_id,
      baseRate: parseFloat(row.base_rate),
      costType: row.cost_type,
      rateType: row.rate_type,
      billingType: row.billing_type,
      currency: row.currency,
      costCenterCode: row.cost_center_code,
      costCenterName: row.cost_center_name,
      effectiveDate: row.effective_date,
      endDate: row.end_date,
      isActive: row.is_active,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      createdBy: row.created_by,
      updatedBy: row.updated_by
    };

    // Only set optional properties if they have values
    if (row.overtime_rate !== null && row.overtime_rate !== undefined) {
      resourceCost.overtimeRate = parseFloat(row.overtime_rate);
    }
    if (row.double_time_rate !== null && row.double_time_rate !== undefined) {
      resourceCost.doubleTimeRate = parseFloat(row.double_time_rate);
    }
    if (row.billable_rate !== null && row.billable_rate !== undefined) {
      resourceCost.billableRate = parseFloat(row.billable_rate);
    }
    if (row.rate_modifiers !== null && row.rate_modifiers !== undefined) {
      resourceCost.rateModifiers = JSON.parse(row.rate_modifiers);
    }
    if (row.overtime_rules !== null && row.overtime_rules !== undefined) {
      resourceCost.overtimeRules = JSON.parse(row.overtime_rules);
    }
    if (row.benefits_cost !== null && row.benefits_cost !== undefined) {
      resourceCost.benefitsCost = JSON.parse(row.benefits_cost);
    }
    if (row.utilization_target !== null && row.utilization_target !== undefined) {
      resourceCost.utilizationTarget = parseFloat(row.utilization_target);
    }
    if (row.project_rates !== null && row.project_rates !== undefined) {
      resourceCost.projectRates = JSON.parse(row.project_rates);
    }
    if (row.notes !== null && row.notes !== undefined) {
      resourceCost.notes = row.notes;
    }

    return resourceCost;
  }
}