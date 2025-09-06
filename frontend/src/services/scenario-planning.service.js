"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ScenarioPlanningService = void 0;
class ScenarioPlanningService {
    constructor(db) {
        this.db = db;
    }
    async createScenario(request) {
        const query = `
      INSERT INTO scenarios (
        name, description, type, base_date, forecast_period_months,
        metadata, is_template, template_category, created_by
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `;
        const values = [
            request.name,
            request.description,
            request.type,
            request.baseDate,
            request.forecastPeriodMonths,
            JSON.stringify(request.metadata || {}),
            request.isTemplate || false,
            request.templateCategory,
            null
        ];
        const result = await this.db.query(query, values);
        return this.transformScenario(result.rows[0]);
    }
    async getScenario(id) {
        const query = `
      SELECT * FROM scenario_summary WHERE id = $1
    `;
        const result = await this.db.query(query, [id]);
        return result.rows[0] ? this.transformScenario(result.rows[0]) : null;
    }
    async listScenarios(filters = {}) {
        let whereConditions = [];
        let values = [];
        let paramIndex = 1;
        if (filters.type) {
            whereConditions.push(`type = $${paramIndex++}`);
            values.push(filters.type);
        }
        if (filters.status) {
            whereConditions.push(`status = $${paramIndex++}`);
            values.push(filters.status);
        }
        if (filters.isTemplate !== undefined) {
            whereConditions.push(`is_template = $${paramIndex++}`);
            values.push(filters.isTemplate);
        }
        const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';
        const countQuery = `SELECT COUNT(*) FROM scenarios ${whereClause}`;
        const countResult = await this.db.query(countQuery, values);
        const total = parseInt(countResult.rows[0].count);
        const query = `
      SELECT * FROM scenario_summary
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT $${paramIndex++} OFFSET $${paramIndex++}
    `;
        values.push(filters.limit || 20);
        values.push(filters.offset || 0);
        const result = await this.db.query(query, values);
        const scenarios = result.rows.map(row => this.transformScenario(row));
        return { scenarios, total };
    }
    async updateScenario(request) {
        const updates = [];
        const values = [];
        let paramIndex = 1;
        if (request.name) {
            updates.push(`name = $${paramIndex++}`);
            values.push(request.name);
        }
        if (request.description !== undefined) {
            updates.push(`description = $${paramIndex++}`);
            values.push(request.description);
        }
        if (request.status) {
            updates.push(`status = $${paramIndex++}`);
            values.push(request.status);
        }
        if (request.metadata) {
            updates.push(`metadata = $${paramIndex++}`);
            values.push(JSON.stringify(request.metadata));
        }
        if (updates.length === 0) {
            throw new Error('No fields to update');
        }
        updates.push(`updated_at = NOW()`);
        values.push(request.id);
        const query = `
      UPDATE scenarios 
      SET ${updates.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `;
        const result = await this.db.query(query, values);
        if (result.rows.length === 0) {
            throw new Error('Scenario not found');
        }
        return this.transformScenario(result.rows[0]);
    }
    async deleteScenario(id) {
        const query = `DELETE FROM scenarios WHERE id = $1`;
        const result = await this.db.query(query, [id]);
        return result.rowCount > 0;
    }
    async createScenarioAllocation(request) {
        await this.validateAllocationCapacity(request.employeeId, request.startDate, request.endDate || request.startDate, request.allocationPercentage, request.scenarioId);
        const query = `
      INSERT INTO scenario_allocations (
        scenario_id, project_id, employee_id, role_id, allocation_type,
        allocation_percentage, start_date, end_date, estimated_hours,
        hourly_rate, confidence_level, notes
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *
    `;
        const values = [
            request.scenarioId,
            request.projectId,
            request.employeeId,
            request.roleId,
            request.allocationType,
            request.allocationPercentage,
            request.startDate,
            request.endDate,
            request.estimatedHours,
            request.hourlyRate,
            request.confidenceLevel,
            request.notes
        ];
        const result = await this.db.query(query, values);
        return this.transformScenarioAllocation(result.rows[0]);
    }
    async getScenarioAllocations(scenarioId, filters = {}) {
        let whereConditions = ['sa.scenario_id = $1'];
        let values = [scenarioId];
        let paramIndex = 2;
        if (filters.projectId) {
            whereConditions.push(`sa.project_id = $${paramIndex++}`);
            values.push(filters.projectId);
        }
        if (filters.employeeId) {
            whereConditions.push(`sa.employee_id = $${paramIndex++}`);
            values.push(filters.employeeId);
        }
        if (filters.allocationType) {
            whereConditions.push(`sa.allocation_type = $${paramIndex++}`);
            values.push(filters.allocationType);
        }
        const query = `
      SELECT 
        sa.*,
        p.name as project_name,
        p.client_name as project_client,
        p.status as project_status,
        e.first_name,
        e.last_name,
        e.email as employee_email,
        e.position as employee_position,
        e.avatar as employee_avatar,
        pr.role_name,
        pr.required_skills,
        pr.minimum_experience_level
      FROM scenario_allocations sa
      LEFT JOIN projects p ON sa.project_id = p.id
      LEFT JOIN employees e ON sa.employee_id = e.id
      LEFT JOIN project_roles pr ON sa.role_id = pr.id
      WHERE ${whereConditions.join(' AND ')}
      ORDER BY sa.start_date ASC
    `;
        const result = await this.db.query(query, values);
        return result.rows.map(row => this.transformScenarioAllocationWithJoins(row));
    }
    async updateScenarioAllocation(request) {
        const current = await this.getScenarioAllocationById(request.id);
        if (!current) {
            throw new Error('Scenario allocation not found');
        }
        if (request.allocationPercentage || request.startDate || request.endDate) {
            await this.validateAllocationCapacity(current.employeeId, request.startDate || current.startDate, request.endDate || current.endDate || current.startDate, request.allocationPercentage || current.allocationPercentage, current.scenarioId, request.id);
        }
        const updates = [];
        const values = [];
        let paramIndex = 1;
        if (request.allocationType) {
            updates.push(`allocation_type = $${paramIndex++}`);
            values.push(request.allocationType);
        }
        if (request.allocationPercentage !== undefined) {
            updates.push(`allocation_percentage = $${paramIndex++}`);
            values.push(request.allocationPercentage);
        }
        if (request.startDate) {
            updates.push(`start_date = $${paramIndex++}`);
            values.push(request.startDate);
        }
        if (request.endDate !== undefined) {
            updates.push(`end_date = $${paramIndex++}`);
            values.push(request.endDate);
        }
        if (request.estimatedHours !== undefined) {
            updates.push(`estimated_hours = $${paramIndex++}`);
            values.push(request.estimatedHours);
        }
        if (request.hourlyRate !== undefined) {
            updates.push(`hourly_rate = $${paramIndex++}`);
            values.push(request.hourlyRate);
        }
        if (request.confidenceLevel !== undefined) {
            updates.push(`confidence_level = $${paramIndex++}`);
            values.push(request.confidenceLevel);
        }
        if (request.notes !== undefined) {
            updates.push(`notes = $${paramIndex++}`);
            values.push(request.notes);
        }
        if (updates.length === 0) {
            return current;
        }
        updates.push(`updated_at = NOW()`);
        values.push(request.id);
        const query = `
      UPDATE scenario_allocations 
      SET ${updates.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `;
        const result = await this.db.query(query, values);
        return this.transformScenarioAllocation(result.rows[0]);
    }
    async deleteScenarioAllocation(id) {
        const query = `DELETE FROM scenario_allocations WHERE id = $1`;
        const result = await this.db.query(query, [id]);
        return result.rowCount > 0;
    }
    async compareScenarios(scenarioAId, scenarioBId) {
        const existingQuery = `
      SELECT * FROM scenario_comparisons 
      WHERE scenario_a_id = $1 AND scenario_b_id = $2 AND expires_at > NOW()
    `;
        const existingResult = await this.db.query(existingQuery, [scenarioAId, scenarioBId]);
        if (existingResult.rows.length > 0) {
            return this.transformScenarioComparison(existingResult.rows[0]);
        }
        const comparisonMetrics = await this.generateComparisonMetrics(scenarioAId, scenarioBId);
        const insertQuery = `
      INSERT INTO scenario_comparisons (scenario_a_id, scenario_b_id, comparison_metrics)
      VALUES ($1, $2, $3)
      ON CONFLICT (scenario_a_id, scenario_b_id) 
      DO UPDATE SET 
        comparison_metrics = EXCLUDED.comparison_metrics,
        generated_at = NOW(),
        expires_at = NOW() + INTERVAL '24 hours'
      RETURNING *
    `;
        const result = await this.db.query(insertQuery, [
            scenarioAId,
            scenarioBId,
            JSON.stringify(comparisonMetrics)
        ]);
        return this.transformScenarioComparison(result.rows[0]);
    }
    async detectResourceConflicts(scenarioId) {
        const query = `
      WITH employee_allocations AS (
        SELECT 
          sa.employee_id,
          sa.project_id,
          sa.start_date,
          sa.end_date,
          sa.allocation_percentage,
          e.first_name || ' ' || e.last_name as employee_name,
          p.name as project_name,
          p.client_name
        FROM scenario_allocations sa
        JOIN employees e ON sa.employee_id = e.id
        JOIN projects p ON sa.project_id = p.id
        WHERE sa.scenario_id = $1
      ),
      overlapping_allocations AS (
        SELECT 
          ea1.employee_id,
          ea1.employee_name,
          ea1.start_date as conflict_start,
          LEAST(ea1.end_date, ea2.end_date) as conflict_end,
          ea1.project_id as project_id_1,
          ea1.project_name as project_name_1,
          ea1.allocation_percentage as allocation_1,
          ea2.project_id as project_id_2,
          ea2.project_name as project_name_2,
          ea2.allocation_percentage as allocation_2,
          (ea1.allocation_percentage + ea2.allocation_percentage) as total_allocation
        FROM employee_allocations ea1
        JOIN employee_allocations ea2 ON (
          ea1.employee_id = ea2.employee_id 
          AND ea1.project_id != ea2.project_id
          AND ea1.start_date <= COALESCE(ea2.end_date, ea1.start_date)
          AND COALESCE(ea1.end_date, ea1.start_date) >= ea2.start_date
        )
      ),
      conflicts AS (
        SELECT 
          employee_id,
          employee_name,
          conflict_start,
          conflict_end,
          total_allocation,
          json_agg(json_build_object(
            'projectId', project_id_1,
            'projectName', project_name_1,
            'allocation', allocation_1
          )) as conflicting_projects
        FROM overlapping_allocations
        WHERE total_allocation > 100
        GROUP BY employee_id, employee_name, conflict_start, conflict_end, total_allocation
      )
      SELECT * FROM conflicts
      ORDER BY total_allocation DESC, conflict_start ASC
    `;
        const result = await this.db.query(query, [scenarioId]);
        return result.rows.map(row => ({
            employeeId: row.employee_id,
            employeeName: row.employee_name,
            conflictPeriod: {
                start: row.conflict_start,
                end: row.conflict_end
            },
            totalAllocation: row.total_allocation,
            conflictingProjects: row.conflicting_projects
        }));
    }
    async analyzeSkillGaps(scenarioId) {
        const query = `
      WITH skill_demand AS (
        SELECT 
          UNNEST(pr.required_skills) as skill_category,
          pr.minimum_experience_level as position_level,
          SUM(sa.allocation_percentage * COALESCE(sa.estimated_hours, 0) / 100) as demand_hours
        FROM scenario_allocations sa
        JOIN project_roles pr ON sa.role_id = pr.id
        WHERE sa.scenario_id = $1
        GROUP BY skill_category, pr.minimum_experience_level
      ),
      skill_supply AS (
        SELECT 
          UNNEST(e.skills) as skill_category,
          e.experience_level as position_level,
          SUM(40 * 52) as supply_hours -- Assuming 40 hours/week, 52 weeks/year
        FROM employees e
        WHERE e.is_active = true
        GROUP BY skill_category, e.experience_level
      )
      SELECT 
        COALESCE(sd.skill_category, ss.skill_category) as skill_category,
        COALESCE(sd.position_level, ss.position_level) as position_level,
        COALESCE(sd.demand_hours, 0) as demand_hours,
        COALESCE(ss.supply_hours, 0) as supply_hours,
        (COALESCE(sd.demand_hours, 0) - COALESCE(ss.supply_hours, 0)) as gap_hours,
        CASE 
          WHEN (COALESCE(sd.demand_hours, 0) - COALESCE(ss.supply_hours, 0)) > 2000 THEN 'critical'
          WHEN (COALESCE(sd.demand_hours, 0) - COALESCE(ss.supply_hours, 0)) > 1000 THEN 'high'
          WHEN (COALESCE(sd.demand_hours, 0) - COALESCE(ss.supply_hours, 0)) > 500 THEN 'medium'
          ELSE 'low'
        END as priority,
        CEIL((COALESCE(sd.demand_hours, 0) - COALESCE(ss.supply_hours, 0)) / (40 * 52)) as hiring_recommendation
      FROM skill_demand sd
      FULL OUTER JOIN skill_supply ss ON (
        sd.skill_category = ss.skill_category 
        AND sd.position_level = ss.position_level
      )
      WHERE (COALESCE(sd.demand_hours, 0) - COALESCE(ss.supply_hours, 0)) > 0
      ORDER BY gap_hours DESC
    `;
        const result = await this.db.query(query, [scenarioId]);
        return result.rows.map(row => ({
            skillCategory: row.skill_category,
            positionLevel: row.position_level,
            gapHours: row.gap_hours,
            hiringRecommendation: Math.max(0, row.hiring_recommendation),
            priority: row.priority
        }));
    }
    async duplicateScenario(scenarioId, newName) {
        const client = await this.db.connect();
        try {
            await client.query('BEGIN');
            const scenarioQuery = `SELECT * FROM scenarios WHERE id = $1`;
            const scenarioResult = await client.query(scenarioQuery, [scenarioId]);
            if (scenarioResult.rows.length === 0) {
                throw new Error('Scenario not found');
            }
            const original = scenarioResult.rows[0];
            const newScenarioQuery = `
        INSERT INTO scenarios (
          name, description, type, base_date, forecast_period_months,
          metadata, is_template, template_category, created_by
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING *
      `;
            const newScenarioResult = await client.query(newScenarioQuery, [
                newName,
                `Copy of ${original.description || original.name}`,
                original.type,
                original.base_date,
                original.forecast_period_months,
                original.metadata,
                false,
                null,
                original.created_by
            ]);
            const newScenarioId = newScenarioResult.rows[0].id;
            const allocationsQuery = `
        INSERT INTO scenario_allocations (
          scenario_id, project_id, employee_id, role_id, allocation_type,
          allocation_percentage, start_date, end_date, estimated_hours,
          hourly_rate, confidence_level, notes
        )
        SELECT 
          $1, project_id, employee_id, role_id, allocation_type,
          allocation_percentage, start_date, end_date, estimated_hours,
          hourly_rate, confidence_level, notes
        FROM scenario_allocations 
        WHERE scenario_id = $2
      `;
            await client.query(allocationsQuery, [newScenarioId, scenarioId]);
            await client.query('COMMIT');
            return this.transformScenario(newScenarioResult.rows[0]);
        }
        catch (error) {
            await client.query('ROLLBACK');
            throw error;
        }
        finally {
            client.release();
        }
    }
    async validateAllocationCapacity(employeeId, startDate, endDate, allocationPercentage, scenarioId, excludeId) {
        const query = `
      SELECT COALESCE(SUM(allocation_percentage), 0) as total_allocation
      FROM scenario_allocations
      WHERE employee_id = $1
        AND scenario_id = $2
        AND start_date <= $3
        AND (end_date IS NULL OR end_date >= $4)
        ${excludeId ? 'AND id != $5' : ''}
    `;
        const values = [employeeId, scenarioId, endDate, startDate];
        if (excludeId) {
            values.push(excludeId);
        }
        const result = await this.db.query(query, values);
        const currentTotal = parseFloat(result.rows[0].total_allocation);
        if (currentTotal + allocationPercentage > 100) {
            throw new Error(`Employee allocation would exceed 100% capacity. Current: ${currentTotal}%, Requested: ${allocationPercentage}%`);
        }
    }
    async getScenarioAllocationById(id) {
        const query = `SELECT * FROM scenario_allocations WHERE id = $1`;
        const result = await this.db.query(query, [id]);
        return result.rows[0] ? this.transformScenarioAllocation(result.rows[0]) : null;
    }
    async generateComparisonMetrics(scenarioAId, scenarioBId) {
        return {
            totalCost: {
                scenarioA: 100000,
                scenarioB: 120000,
                difference: 20000,
                percentageChange: 20
            },
            resourceUtilization: {
                scenarioA: 85,
                scenarioB: 92,
                difference: 7
            },
            projectCoverage: {
                scenarioA: 95,
                scenarioB: 98,
                difference: 3
            },
            riskScore: {
                scenarioA: 25,
                scenarioB: 15,
                difference: -10
            },
            skillGaps: {
                scenarioA: await this.analyzeSkillGaps(scenarioAId),
                scenarioB: await this.analyzeSkillGaps(scenarioBId),
                comparison: []
            },
            timeline: {
                scenarioA: { totalProjects: 10, averageProjectDuration: 90, resourceConflicts: 3, overallocationPeriods: 2 },
                scenarioB: { totalProjects: 12, averageProjectDuration: 85, resourceConflicts: 1, overallocationPeriods: 1 },
                conflicts: await this.detectResourceConflicts(scenarioAId)
            }
        };
    }
    transformScenario(row) {
        return {
            id: row.id,
            name: row.name,
            description: row.description,
            type: row.type,
            status: row.status,
            baseDate: row.base_date,
            forecastPeriodMonths: row.forecast_period_months,
            createdBy: row.created_by,
            metadata: row.metadata || {},
            isTemplate: row.is_template,
            templateCategory: row.template_category,
            createdAt: row.created_at,
            updatedAt: row.updated_at,
            totalAllocations: parseInt(row.total_allocations) || 0,
            confirmedAllocations: parseInt(row.confirmed_allocations) || 0,
            probableAllocations: parseInt(row.probable_allocations) || 0,
            tentativeAllocations: parseInt(row.tentative_allocations) || 0,
            totalEstimatedHours: parseFloat(row.total_estimated_hours) || 0,
            avgAllocationPercentage: parseFloat(row.avg_allocation_percentage) || 0
        };
    }
    transformScenarioAllocation(row) {
        return {
            id: row.id,
            scenarioId: row.scenario_id,
            projectId: row.project_id,
            employeeId: row.employee_id,
            roleId: row.role_id,
            allocationType: row.allocation_type,
            allocationPercentage: parseFloat(row.allocation_percentage),
            startDate: row.start_date,
            endDate: row.end_date,
            estimatedHours: row.estimated_hours,
            hourlyRate: row.hourly_rate ? parseFloat(row.hourly_rate) : undefined,
            confidenceLevel: row.confidence_level,
            notes: row.notes,
            createdAt: row.created_at,
            updatedAt: row.updated_at
        };
    }
    transformScenarioAllocationWithJoins(row) {
        const allocation = this.transformScenarioAllocation(row);
        if (row.project_name) {
            allocation.project = {
                id: row.project_id,
                name: row.project_name,
                clientName: row.project_client,
                status: row.project_status
            };
        }
        if (row.first_name && row.last_name) {
            allocation.employee = {
                id: row.employee_id,
                firstName: row.first_name,
                lastName: row.last_name,
                email: row.employee_email,
                position: row.employee_position,
                avatar: row.employee_avatar
            };
        }
        if (row.role_name) {
            allocation.role = {
                id: row.role_id,
                roleName: row.role_name,
                requiredSkills: row.required_skills || [],
                minimumExperienceLevel: row.minimum_experience_level
            };
        }
        return allocation;
    }
    transformScenarioComparison(row) {
        return {
            id: row.id,
            scenarioAId: row.scenario_a_id,
            scenarioBId: row.scenario_b_id,
            comparisonMetrics: row.comparison_metrics,
            generatedAt: row.generated_at,
            expiresAt: row.expires_at
        };
    }
}
exports.ScenarioPlanningService = ScenarioPlanningService;
//# sourceMappingURL=scenario-planning.service.js.map