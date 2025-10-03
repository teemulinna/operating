"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ScenarioPlanner = exports.ComparisonResultSchema = exports.ImpactAnalysisSchema = exports.ScenarioSchema = exports.ImpactLevel = exports.ScenarioStatus = exports.ScenarioType = void 0;
const zod_1 = require("zod");
const api_error_1 = require("../utils/api-error");
const logger_1 = require("../utils/logger");
const date_fns_1 = require("date-fns");
// ============================================
// TYPE DEFINITIONS
// ============================================
exports.ScenarioType = zod_1.z.enum(['project', 'resource', 'capacity', 'mixed']);
exports.ScenarioStatus = zod_1.z.enum(['draft', 'active', 'archived', 'applied']);
exports.ImpactLevel = zod_1.z.enum(['low', 'medium', 'high', 'critical']);
exports.ScenarioSchema = zod_1.z.object({
    id: zod_1.z.string().uuid().optional(),
    name: zod_1.z.string().min(1).max(255),
    description: zod_1.z.string().optional(),
    type: exports.ScenarioType,
    status: exports.ScenarioStatus.default('draft'),
    baselineDate: zod_1.z.date(),
    startDate: zod_1.z.date(),
    endDate: zod_1.z.date(),
    parameters: zod_1.z.object({
        projectChanges: zod_1.z.array(zod_1.z.object({
            projectId: zod_1.z.string().uuid(),
            action: zod_1.z.enum(['add', 'remove', 'modify']),
            changes: zod_1.z.record(zod_1.z.any()).optional()
        })).optional(),
        resourceChanges: zod_1.z.array(zod_1.z.object({
            employeeId: zod_1.z.string().uuid(),
            action: zod_1.z.enum(['add', 'remove', 'reassign', 'adjust_capacity']),
            details: zod_1.z.record(zod_1.z.any()).optional()
        })).optional(),
        capacityAdjustments: zod_1.z.array(zod_1.z.object({
            departmentId: zod_1.z.string().uuid().optional(),
            teamId: zod_1.z.string().uuid().optional(),
            adjustment: zod_1.z.number(),
            startDate: zod_1.z.date(),
            endDate: zod_1.z.date()
        })).optional(),
        constraints: zod_1.z.object({
            maxBudget: zod_1.z.number().optional(),
            minResourceUtilization: zod_1.z.number().min(0).max(100).optional(),
            maxResourceUtilization: zod_1.z.number().min(0).max(100).optional(),
            requiredSkills: zod_1.z.array(zod_1.z.string()).optional(),
            blackoutDates: zod_1.z.array(zod_1.z.date()).optional()
        }).optional()
    }),
    assumptions: zod_1.z.array(zod_1.z.object({
        description: zod_1.z.string(),
        confidence: zod_1.z.number().min(0).max(100),
        impact: exports.ImpactLevel
    })).optional(),
    createdBy: zod_1.z.string().uuid(),
    approvedBy: zod_1.z.string().uuid().optional(),
    metadata: zod_1.z.record(zod_1.z.any()).optional(),
    createdAt: zod_1.z.date().optional(),
    updatedAt: zod_1.z.date().optional()
});
exports.ImpactAnalysisSchema = zod_1.z.object({
    scenarioId: zod_1.z.string().uuid(),
    timestamp: zod_1.z.date(),
    baseline: zod_1.z.object({
        totalCapacity: zod_1.z.number(),
        allocatedCapacity: zod_1.z.number(),
        utilizationRate: zod_1.z.number(),
        projectCount: zod_1.z.number(),
        resourceCount: zod_1.z.number(),
        totalCost: zod_1.z.number().optional()
    }),
    projected: zod_1.z.object({
        totalCapacity: zod_1.z.number(),
        allocatedCapacity: zod_1.z.number(),
        utilizationRate: zod_1.z.number(),
        projectCount: zod_1.z.number(),
        resourceCount: zod_1.z.number(),
        totalCost: zod_1.z.number().optional()
    }),
    impacts: zod_1.z.array(zod_1.z.object({
        type: zod_1.z.enum(['resource', 'project', 'budget', 'timeline', 'skill']),
        severity: exports.ImpactLevel,
        description: zod_1.z.string(),
        affectedEntities: zod_1.z.array(zod_1.z.object({
            id: zod_1.z.string(),
            name: zod_1.z.string(),
            type: zod_1.z.string()
        })),
        metrics: zod_1.z.record(zod_1.z.any()).optional()
    })),
    recommendations: zod_1.z.array(zod_1.z.object({
        priority: zod_1.z.enum(['low', 'medium', 'high']),
        action: zod_1.z.string(),
        expectedOutcome: zod_1.z.string(),
        effort: zod_1.z.enum(['low', 'medium', 'high']),
        risk: zod_1.z.enum(['low', 'medium', 'high'])
    })),
    risks: zod_1.z.array(zod_1.z.object({
        description: zod_1.z.string(),
        probability: zod_1.z.number().min(0).max(100),
        impact: exports.ImpactLevel,
        mitigation: zod_1.z.string().optional()
    })),
    confidenceScore: zod_1.z.number().min(0).max(100)
});
exports.ComparisonResultSchema = zod_1.z.object({
    scenarios: zod_1.z.array(exports.ScenarioSchema),
    metrics: zod_1.z.array(zod_1.z.object({
        name: zod_1.z.string(),
        values: zod_1.z.record(zod_1.z.number())
    })),
    winner: zod_1.z.object({
        scenarioId: zod_1.z.string().uuid(),
        score: zod_1.z.number(),
        reasons: zod_1.z.array(zod_1.z.string())
    }).optional(),
    tradeoffs: zod_1.z.array(zod_1.z.object({
        scenarioId: zod_1.z.string().uuid(),
        pros: zod_1.z.array(zod_1.z.string()),
        cons: zod_1.z.array(zod_1.z.string())
    }))
});
// ============================================
// SERVICE CLASS
// ============================================
class ScenarioPlanner {
    constructor(db, cacheService, wsService, availabilityService, analyticsService) {
        this.db = db;
        this.cacheService = cacheService;
        this.wsService = wsService;
        this.availabilityService = availabilityService;
        this.analyticsService = analyticsService;
    }
    // ============================================
    // SCENARIO MANAGEMENT
    // ============================================
    async createScenario(scenario) {
        const validatedScenario = exports.ScenarioSchema.parse({
            ...scenario,
            status: scenario.status || 'draft',
            createdAt: new Date(),
            updatedAt: new Date()
        });
        const client = await this.db.connect();
        try {
            await client.query('BEGIN');
            const result = await client.query(`INSERT INTO scenarios (
          name, description, type, status, baseline_date, start_date, end_date,
          parameters, assumptions, created_by, metadata
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING *`, [
                validatedScenario.name,
                validatedScenario.description,
                validatedScenario.type,
                validatedScenario.status,
                validatedScenario.baselineDate,
                validatedScenario.startDate,
                validatedScenario.endDate,
                JSON.stringify(validatedScenario.parameters),
                JSON.stringify(validatedScenario.assumptions),
                validatedScenario.createdBy,
                JSON.stringify(validatedScenario.metadata || {})
            ]);
            // Create initial impact analysis
            const impactAnalysis = await this.analyzeImpact(result.rows[0].id, client);
            await client.query(`INSERT INTO scenario_impacts (scenario_id, impact_analysis)
         VALUES ($1, $2)`, [result.rows[0].id, JSON.stringify(impactAnalysis)]);
            await client.query('COMMIT');
            const created = this.formatScenario(result.rows[0]);
            // Broadcast creation
            this.wsService.broadcast('scenario:created', {
                scenario: created,
                timestamp: new Date()
            });
            logger_1.logger.info(`Scenario created: ${created.id}`);
            return created;
        }
        catch (error) {
            await client.query('ROLLBACK');
            logger_1.logger.error('Error creating scenario:', error);
            throw new api_error_1.ApiError(500, 'Failed to create scenario');
        }
        finally {
            client.release();
        }
    }
    async getScenarioById(id) {
        const cacheKey = `scenario:${id}`;
        const cached = await this.cacheService.get(cacheKey);
        if (cached)
            return cached;
        const result = await this.db.query('SELECT * FROM scenarios WHERE id = $1', [id]);
        if (result.rows.length === 0) {
            return null;
        }
        const scenario = this.formatScenario(result.rows[0]);
        await this.cacheService.set(cacheKey, scenario, 300); // Cache for 5 minutes
        return scenario;
    }
    async updateScenario(id, updates) {
        const existing = await this.getScenarioById(id);
        if (!existing) {
            throw new api_error_1.ApiError(404, 'Scenario not found');
        }
        const validatedUpdates = exports.ScenarioSchema.partial().parse(updates);
        const result = await this.db.query(`UPDATE scenarios
       SET name = COALESCE($1, name),
           description = COALESCE($2, description),
           parameters = COALESCE($3, parameters),
           assumptions = COALESCE($4, assumptions),
           status = COALESCE($5, status),
           metadata = COALESCE($6, metadata),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $7
       RETURNING *`, [
            validatedUpdates.name,
            validatedUpdates.description,
            validatedUpdates.parameters ? JSON.stringify(validatedUpdates.parameters) : null,
            validatedUpdates.assumptions ? JSON.stringify(validatedUpdates.assumptions) : null,
            validatedUpdates.status,
            validatedUpdates.metadata ? JSON.stringify(validatedUpdates.metadata) : null,
            id
        ]);
        const updated = this.formatScenario(result.rows[0]);
        // Clear cache
        await this.cacheService.delete(`scenario:${id}`);
        // Re-analyze impact if parameters changed
        if (validatedUpdates.parameters) {
            await this.analyzeImpact(id);
        }
        // Broadcast update
        this.wsService.broadcast('scenario:updated', {
            scenario: updated,
            timestamp: new Date()
        });
        return updated;
    }
    async deleteScenario(id) {
        const result = await this.db.query('DELETE FROM scenarios WHERE id = $1 RETURNING id', [id]);
        if (result.rows.length === 0) {
            throw new api_error_1.ApiError(404, 'Scenario not found');
        }
        // Clear cache
        await this.cacheService.delete(`scenario:${id}`);
        await this.cacheService.delete(`scenario:impact:${id}`);
        // Broadcast deletion
        this.wsService.broadcast('scenario:deleted', {
            scenarioId: id,
            timestamp: new Date()
        });
        logger_1.logger.info(`Scenario deleted: ${id}`);
    }
    async listScenarios(filters) {
        let query = 'SELECT * FROM scenarios WHERE 1=1';
        const params = [];
        if (filters?.type) {
            query += ` AND type = $${params.length + 1}`;
            params.push(filters.type);
        }
        if (filters?.status) {
            query += ` AND status = $${params.length + 1}`;
            params.push(filters.status);
        }
        if (filters?.createdBy) {
            query += ` AND created_by = $${params.length + 1}`;
            params.push(filters.createdBy);
        }
        if (filters?.startDate) {
            query += ` AND start_date >= $${params.length + 1}`;
            params.push(filters.startDate);
        }
        if (filters?.endDate) {
            query += ` AND end_date <= $${params.length + 1}`;
            params.push(filters.endDate);
        }
        query += ' ORDER BY created_at DESC';
        const result = await this.db.query(query, params);
        return result.rows.map(row => this.formatScenario(row));
    }
    // ============================================
    // IMPACT ANALYSIS
    // ============================================
    async analyzeImpact(scenarioId, client) {
        const dbClient = client || await this.db.connect();
        try {
            const scenario = await this.getScenarioById(scenarioId);
            if (!scenario) {
                throw new api_error_1.ApiError(404, 'Scenario not found');
            }
            // Get baseline metrics
            const baseline = await this.calculateBaselineMetrics(scenario.baselineDate, scenario.startDate, scenario.endDate, dbClient);
            // Calculate projected metrics with scenario changes
            const projected = await this.calculateProjectedMetrics(scenario, baseline, dbClient);
            // Identify impacts
            const impacts = await this.identifyImpacts(baseline, projected, scenario);
            // Generate recommendations
            const recommendations = await this.generateRecommendations(impacts, scenario);
            // Identify risks
            const risks = await this.identifyRisks(scenario, impacts);
            // Calculate confidence score
            const confidenceScore = this.calculateConfidenceScore(scenario, impacts);
            const analysis = {
                scenarioId,
                timestamp: new Date(),
                baseline,
                projected,
                impacts,
                recommendations,
                risks,
                confidenceScore
            };
            // Cache the analysis
            await this.cacheService.set(`scenario:impact:${scenarioId}`, analysis, 600 // Cache for 10 minutes
            );
            // Store in database
            if (!client) {
                await dbClient.query(`INSERT INTO scenario_impacts (scenario_id, impact_analysis, analyzed_at)
           VALUES ($1, $2, CURRENT_TIMESTAMP)
           ON CONFLICT (scenario_id)
           DO UPDATE SET
             impact_analysis = EXCLUDED.impact_analysis,
             analyzed_at = CURRENT_TIMESTAMP`, [scenarioId, JSON.stringify(analysis)]);
            }
            return analysis;
        }
        finally {
            if (!client) {
                dbClient.release();
            }
        }
    }
    async calculateBaselineMetrics(baselineDate, startDate, endDate, client) {
        // Get current capacity
        const capacityResult = await client.query(`SELECT
        COUNT(DISTINCT e.id) as resource_count,
        SUM(e.weekly_capacity) as total_capacity
       FROM employees e
       WHERE e.is_active = true`, []);
        // Get current allocations
        const allocationResult = await client.query(`SELECT
        COUNT(DISTINCT project_id) as project_count,
        SUM(allocated_hours) as allocated_hours
       FROM resource_allocations
       WHERE allocation_date BETWEEN $1 AND $2`, [startDate, endDate]);
        // Calculate cost (simplified)
        const costResult = await client.query(`SELECT SUM(e.hourly_rate * ra.allocated_hours) as total_cost
       FROM resource_allocations ra
       JOIN employees e ON ra.employee_id = e.id
       WHERE ra.allocation_date BETWEEN $1 AND $2`, [startDate, endDate]);
        const totalCapacity = parseFloat(capacityResult.rows[0]?.total_capacity || 0);
        const allocatedCapacity = parseFloat(allocationResult.rows[0]?.allocated_hours || 0);
        return {
            totalCapacity,
            allocatedCapacity,
            utilizationRate: totalCapacity > 0 ? (allocatedCapacity / totalCapacity) * 100 : 0,
            projectCount: parseInt(allocationResult.rows[0]?.project_count || 0),
            resourceCount: parseInt(capacityResult.rows[0]?.resource_count || 0),
            totalCost: parseFloat(costResult.rows[0]?.total_cost || 0)
        };
    }
    async calculateProjectedMetrics(scenario, baseline, client) {
        let projected = { ...baseline };
        // Apply project changes
        if (scenario.parameters.projectChanges) {
            for (const change of scenario.parameters.projectChanges) {
                if (change.action === 'add') {
                    projected.projectCount++;
                    // Estimate additional allocation based on project size
                    const estimatedHours = change.changes?.estimatedHours || 160;
                    projected.allocatedCapacity += estimatedHours;
                }
                else if (change.action === 'remove') {
                    projected.projectCount--;
                    // Get actual hours for the project
                    const hoursResult = await client.query(`SELECT SUM(allocated_hours) as hours
             FROM resource_allocations
             WHERE project_id = $1`, [change.projectId]);
                    projected.allocatedCapacity -= parseFloat(hoursResult.rows[0]?.hours || 0);
                }
            }
        }
        // Apply resource changes
        if (scenario.parameters.resourceChanges) {
            for (const change of scenario.parameters.resourceChanges) {
                if (change.action === 'add') {
                    projected.resourceCount++;
                    projected.totalCapacity += change.details?.weeklyCapacity || 40;
                }
                else if (change.action === 'remove') {
                    projected.resourceCount--;
                    const capacityResult = await client.query(`SELECT weekly_capacity FROM employees WHERE id = $1`, [change.employeeId]);
                    projected.totalCapacity -= parseFloat(capacityResult.rows[0]?.weekly_capacity || 0);
                }
                else if (change.action === 'adjust_capacity') {
                    const adjustment = change.details?.adjustment || 0;
                    projected.totalCapacity += adjustment;
                }
            }
        }
        // Apply capacity adjustments
        if (scenario.parameters.capacityAdjustments) {
            for (const adjustment of scenario.parameters.capacityAdjustments) {
                const weeks = (0, date_fns_1.differenceInDays)(adjustment.endDate, adjustment.startDate) / 7;
                projected.totalCapacity += adjustment.adjustment * weeks;
            }
        }
        // Recalculate utilization
        projected.utilizationRate = projected.totalCapacity > 0
            ? (projected.allocatedCapacity / projected.totalCapacity) * 100
            : 0;
        // Recalculate cost with changes
        if (scenario.parameters.resourceChanges) {
            let costAdjustment = 0;
            for (const change of scenario.parameters.resourceChanges) {
                if (change.action === 'add') {
                    costAdjustment += (change.details?.hourlyRate || 100) * (change.details?.weeklyCapacity || 40);
                }
                else if (change.action === 'remove') {
                    const rateResult = await client.query(`SELECT hourly_rate, weekly_capacity FROM employees WHERE id = $1`, [change.employeeId]);
                    if (rateResult.rows[0]) {
                        costAdjustment -= rateResult.rows[0].hourly_rate * rateResult.rows[0].weekly_capacity;
                    }
                }
            }
            projected.totalCost += costAdjustment;
        }
        return projected;
    }
    async identifyImpacts(baseline, projected, scenario) {
        const impacts = [];
        // Check utilization impact
        const utilizationDiff = projected.utilizationRate - baseline.utilizationRate;
        if (Math.abs(utilizationDiff) > 10) {
            impacts.push({
                type: 'resource',
                severity: Math.abs(utilizationDiff) > 30 ? 'critical' :
                    Math.abs(utilizationDiff) > 20 ? 'high' : 'medium',
                description: utilizationDiff > 0
                    ? `Resource utilization will increase by ${utilizationDiff.toFixed(1)}%`
                    : `Resource utilization will decrease by ${Math.abs(utilizationDiff).toFixed(1)}%`,
                affectedEntities: [],
                metrics: {
                    baselineUtilization: baseline.utilizationRate,
                    projectedUtilization: projected.utilizationRate,
                    difference: utilizationDiff
                }
            });
        }
        // Check capacity impact
        const capacityDiff = projected.totalCapacity - baseline.totalCapacity;
        if (Math.abs(capacityDiff) > 0) {
            impacts.push({
                type: 'resource',
                severity: Math.abs(capacityDiff) > 200 ? 'high' : 'medium',
                description: capacityDiff > 0
                    ? `Total capacity will increase by ${capacityDiff} hours`
                    : `Total capacity will decrease by ${Math.abs(capacityDiff)} hours`,
                affectedEntities: [],
                metrics: {
                    baselineCapacity: baseline.totalCapacity,
                    projectedCapacity: projected.totalCapacity,
                    difference: capacityDiff
                }
            });
        }
        // Check cost impact
        const costDiff = projected.totalCost - baseline.totalCost;
        if (Math.abs(costDiff) > 0) {
            impacts.push({
                type: 'budget',
                severity: Math.abs(costDiff) > 50000 ? 'high' :
                    Math.abs(costDiff) > 20000 ? 'medium' : 'low',
                description: costDiff > 0
                    ? `Total cost will increase by $${costDiff.toFixed(2)}`
                    : `Total cost will decrease by $${Math.abs(costDiff).toFixed(2)}`,
                affectedEntities: [],
                metrics: {
                    baselineCost: baseline.totalCost,
                    projectedCost: projected.totalCost,
                    difference: costDiff
                }
            });
        }
        // Check for overallocation risks
        if (projected.utilizationRate > 100) {
            impacts.push({
                type: 'resource',
                severity: 'critical',
                description: 'Resources will be overallocated',
                affectedEntities: [],
                metrics: {
                    overallocationPercentage: projected.utilizationRate - 100
                }
            });
        }
        // Check for underutilization
        if (projected.utilizationRate < 50) {
            impacts.push({
                type: 'resource',
                severity: 'medium',
                description: 'Resources will be significantly underutilized',
                affectedEntities: [],
                metrics: {
                    underutilizationPercentage: 50 - projected.utilizationRate
                }
            });
        }
        return impacts;
    }
    async generateRecommendations(impacts, scenario) {
        const recommendations = [];
        // Check for overallocation
        const overallocation = impacts.find(i => i.type === 'resource' && i.description.includes('overallocated'));
        if (overallocation) {
            recommendations.push({
                priority: 'high',
                action: 'Hire additional resources or redistribute workload',
                expectedOutcome: 'Reduce resource utilization to sustainable levels',
                effort: 'high',
                risk: 'medium'
            });
        }
        // Check for underutilization
        const underutilization = impacts.find(i => i.type === 'resource' && i.description.includes('underutilized'));
        if (underutilization) {
            recommendations.push({
                priority: 'medium',
                action: 'Identify additional projects or reduce resource capacity',
                expectedOutcome: 'Improve resource utilization efficiency',
                effort: 'medium',
                risk: 'low'
            });
        }
        // Check for cost increases
        const costIncrease = impacts.find(i => i.type === 'budget' && i.description.includes('increase'));
        if (costIncrease) {
            recommendations.push({
                priority: 'high',
                action: 'Review and optimize resource allocation for cost efficiency',
                expectedOutcome: 'Minimize budget impact while maintaining productivity',
                effort: 'medium',
                risk: 'low'
            });
        }
        // Add general optimization recommendation if multiple impacts
        if (impacts.length > 3) {
            recommendations.push({
                priority: 'medium',
                action: 'Consider phased implementation to minimize disruption',
                expectedOutcome: 'Gradual transition with reduced risk',
                effort: 'low',
                risk: 'low'
            });
        }
        return recommendations;
    }
    async identifyRisks(scenario, impacts) {
        const risks = [];
        // High utilization risk
        const highUtilization = impacts.find(i => i.metrics?.projectedUtilization > 90);
        if (highUtilization) {
            risks.push({
                description: 'High resource utilization may lead to burnout and quality issues',
                probability: 70,
                impact: 'high',
                mitigation: 'Implement resource rotation and hire additional staff'
            });
        }
        // Budget overrun risk
        const budgetImpact = impacts.find(i => i.type === 'budget');
        if (budgetImpact && budgetImpact.metrics?.difference > 0) {
            risks.push({
                description: 'Budget may exceed allocated funds',
                probability: 60,
                impact: 'medium',
                mitigation: 'Establish budget controls and approval processes'
            });
        }
        // Timeline risk for project changes
        if (scenario.parameters.projectChanges?.some(c => c.action === 'add')) {
            risks.push({
                description: 'New projects may impact existing project timelines',
                probability: 50,
                impact: 'medium',
                mitigation: 'Conduct thorough resource planning and timeline review'
            });
        }
        // Skill gap risk
        if (scenario.parameters.resourceChanges?.some(c => c.action === 'remove')) {
            risks.push({
                description: 'Loss of key skills may impact project delivery',
                probability: 40,
                impact: 'high',
                mitigation: 'Document knowledge and cross-train team members'
            });
        }
        return risks;
    }
    calculateConfidenceScore(scenario, impacts) {
        let score = 100;
        // Reduce confidence based on time horizon
        const daysInFuture = (0, date_fns_1.differenceInDays)(scenario.startDate, new Date());
        if (daysInFuture > 90)
            score -= 10;
        if (daysInFuture > 180)
            score -= 10;
        if (daysInFuture > 365)
            score -= 20;
        // Reduce confidence based on number of changes
        const totalChanges = (scenario.parameters.projectChanges?.length || 0) +
            (scenario.parameters.resourceChanges?.length || 0) +
            (scenario.parameters.capacityAdjustments?.length || 0);
        if (totalChanges > 5)
            score -= 10;
        if (totalChanges > 10)
            score -= 15;
        // Reduce confidence based on impact severity
        const criticalImpacts = impacts.filter(i => i.severity === 'critical').length;
        const highImpacts = impacts.filter(i => i.severity === 'high').length;
        score -= criticalImpacts * 10;
        score -= highImpacts * 5;
        // Factor in assumptions confidence
        if (scenario.assumptions) {
            const avgAssumptionConfidence = scenario.assumptions.reduce((sum, a) => sum + a.confidence, 0) / scenario.assumptions.length;
            score = (score * avgAssumptionConfidence) / 100;
        }
        return Math.max(0, Math.min(100, score));
    }
    // ============================================
    // SCENARIO COMPARISON
    // ============================================
    async compareScenarios(scenarioIds) {
        if (scenarioIds.length < 2) {
            throw new api_error_1.ApiError(400, 'At least two scenarios are required for comparison');
        }
        const scenarios = await Promise.all(scenarioIds.map(id => this.getScenarioById(id)));
        if (scenarios.some(s => !s)) {
            throw new api_error_1.ApiError(404, 'One or more scenarios not found');
        }
        const validScenarios = scenarios.filter(s => s !== null);
        // Get impact analyses for all scenarios
        const impacts = await Promise.all(validScenarios.map(s => this.analyzeImpact(s.id)));
        // Compare metrics
        const metrics = [
            {
                name: 'Utilization Rate',
                values: Object.fromEntries(impacts.map((impact, i) => [
                    validScenarios[i].id,
                    impact.projected.utilizationRate
                ]))
            },
            {
                name: 'Total Cost',
                values: Object.fromEntries(impacts.map((impact, i) => [
                    validScenarios[i].id,
                    impact.projected.totalCost || 0
                ]))
            },
            {
                name: 'Resource Count',
                values: Object.fromEntries(impacts.map((impact, i) => [
                    validScenarios[i].id,
                    impact.projected.resourceCount
                ]))
            },
            {
                name: 'Project Count',
                values: Object.fromEntries(impacts.map((impact, i) => [
                    validScenarios[i].id,
                    impact.projected.projectCount
                ]))
            },
            {
                name: 'Confidence Score',
                values: Object.fromEntries(impacts.map((impact, i) => [
                    validScenarios[i].id,
                    impact.confidenceScore
                ]))
            }
        ];
        // Determine winner based on scoring
        const scores = validScenarios.map((scenario, i) => {
            const impact = impacts[i];
            let score = 0;
            // Optimal utilization (70-90%)
            if (impact.projected.utilizationRate >= 70 && impact.projected.utilizationRate <= 90) {
                score += 30;
            }
            else if (impact.projected.utilizationRate < 70) {
                score += 10;
            }
            // Lower cost is better
            const costs = impacts.map(i => i.projected.totalCost || 0);
            const minCost = Math.min(...costs);
            const maxCost = Math.max(...costs);
            if (maxCost > minCost) {
                score += 20 * (1 - (impact.projected.totalCost - minCost) / (maxCost - minCost));
            }
            // Higher confidence is better
            score += impact.confidenceScore * 0.3;
            // Fewer high/critical impacts is better
            const severeImpacts = impact.impacts.filter(imp => imp.severity === 'high' || imp.severity === 'critical').length;
            score -= severeImpacts * 5;
            return {
                scenarioId: scenario.id,
                score,
                scenario
            };
        });
        scores.sort((a, b) => b.score - a.score);
        const winner = scores[0].score > 0 ? {
            scenarioId: scores[0].scenarioId,
            score: scores[0].score,
            reasons: this.generateWinnerReasons(scores[0].scenario, impacts[0])
        } : undefined;
        // Generate tradeoffs
        const tradeoffs = validScenarios.map((scenario, i) => {
            const impact = impacts[i];
            return {
                scenarioId: scenario.id,
                pros: this.identifyPros(scenario, impact),
                cons: this.identifyCons(scenario, impact)
            };
        });
        return {
            scenarios: validScenarios,
            metrics,
            winner,
            tradeoffs
        };
    }
    generateWinnerReasons(scenario, impact) {
        const reasons = [];
        if (impact.projected.utilizationRate >= 70 && impact.projected.utilizationRate <= 90) {
            reasons.push('Optimal resource utilization');
        }
        if (impact.confidenceScore > 80) {
            reasons.push('High confidence in projections');
        }
        if (impact.impacts.filter(i => i.severity === 'critical').length === 0) {
            reasons.push('No critical impacts identified');
        }
        if (impact.recommendations.filter(r => r.priority === 'high').length < 2) {
            reasons.push('Minimal high-priority interventions required');
        }
        return reasons;
    }
    identifyPros(scenario, impact) {
        const pros = [];
        if (impact.projected.utilizationRate > impact.baseline.utilizationRate) {
            pros.push('Improved resource utilization');
        }
        if (impact.projected.projectCount > impact.baseline.projectCount) {
            pros.push('Increased project capacity');
        }
        if (impact.risks.filter(r => r.probability > 70).length === 0) {
            pros.push('Low risk profile');
        }
        if (impact.confidenceScore > 75) {
            pros.push('High confidence projections');
        }
        return pros;
    }
    identifyCons(scenario, impact) {
        const cons = [];
        if (impact.projected.utilizationRate > 95) {
            cons.push('Risk of resource overallocation');
        }
        if (impact.projected.totalCost > impact.baseline.totalCost * 1.2) {
            cons.push('Significant cost increase');
        }
        if (impact.impacts.filter(i => i.severity === 'critical').length > 0) {
            cons.push('Contains critical impacts');
        }
        if (impact.risks.filter(r => r.probability > 70).length > 2) {
            cons.push('Multiple high-probability risks');
        }
        return cons;
    }
    // ============================================
    // SCENARIO APPLICATION
    // ============================================
    async applyScenario(scenarioId, applyDate) {
        const scenario = await this.getScenarioById(scenarioId);
        if (!scenario) {
            throw new api_error_1.ApiError(404, 'Scenario not found');
        }
        if (scenario.status !== 'active') {
            throw new api_error_1.ApiError(400, 'Only active scenarios can be applied');
        }
        const effectiveDate = applyDate || new Date();
        const client = await this.db.connect();
        try {
            await client.query('BEGIN');
            // Apply project changes
            if (scenario.parameters.projectChanges) {
                for (const change of scenario.parameters.projectChanges) {
                    await this.applyProjectChange(change, effectiveDate, client);
                }
            }
            // Apply resource changes
            if (scenario.parameters.resourceChanges) {
                for (const change of scenario.parameters.resourceChanges) {
                    await this.applyResourceChange(change, effectiveDate, client);
                }
            }
            // Apply capacity adjustments
            if (scenario.parameters.capacityAdjustments) {
                for (const adjustment of scenario.parameters.capacityAdjustments) {
                    await this.applyCapacityAdjustment(adjustment, client);
                }
            }
            // Update scenario status
            await client.query(`UPDATE scenarios
         SET status = 'applied',
             applied_at = $1,
             metadata = jsonb_set(
               COALESCE(metadata, '{}'),
               '{appliedDate}',
               $2::jsonb
             )
         WHERE id = $3`, [effectiveDate, JSON.stringify(effectiveDate), scenarioId]);
            // Create audit log
            await client.query(`INSERT INTO scenario_audit_log (scenario_id, action, details, created_at)
         VALUES ($1, 'applied', $2, $3)`, [scenarioId, JSON.stringify({ effectiveDate }), new Date()]);
            await client.query('COMMIT');
            // Clear relevant caches
            await this.cacheService.delete('capacity:*');
            await this.cacheService.delete('allocations:*');
            // Broadcast application
            this.wsService.broadcast('scenario:applied', {
                scenarioId,
                effectiveDate,
                timestamp: new Date()
            });
            logger_1.logger.info(`Scenario ${scenarioId} applied successfully`);
        }
        catch (error) {
            await client.query('ROLLBACK');
            logger_1.logger.error('Error applying scenario:', error);
            throw new api_error_1.ApiError(500, 'Failed to apply scenario');
        }
        finally {
            client.release();
        }
    }
    async applyProjectChange(change, effectiveDate, client) {
        if (change.action === 'add') {
            // Create new project
            await client.query(`INSERT INTO projects (name, description, start_date, status, metadata)
         VALUES ($1, $2, $3, 'planned', $4)`, [
                change.changes?.name || 'New Project',
                change.changes?.description || 'Created from scenario',
                effectiveDate,
                JSON.stringify({ fromScenario: true, ...change.changes })
            ]);
        }
        else if (change.action === 'remove') {
            // Archive project
            await client.query(`UPDATE projects
         SET status = 'archived',
             archived_at = $1
         WHERE id = $2`, [effectiveDate, change.projectId]);
        }
        else if (change.action === 'modify') {
            // Update project
            const updates = change.changes || {};
            const setClause = [];
            const values = [];
            if (updates.name) {
                setClause.push(`name = $${values.length + 1}`);
                values.push(updates.name);
            }
            if (updates.endDate) {
                setClause.push(`end_date = $${values.length + 1}`);
                values.push(updates.endDate);
            }
            if (updates.status) {
                setClause.push(`status = $${values.length + 1}`);
                values.push(updates.status);
            }
            if (setClause.length > 0) {
                values.push(change.projectId);
                await client.query(`UPDATE projects SET ${setClause.join(', ')} WHERE id = $${values.length}`, values);
            }
        }
    }
    async applyResourceChange(change, effectiveDate, client) {
        if (change.action === 'add') {
            // Add new resource (simplified - would normally involve more complex hiring process)
            await client.query(`INSERT INTO employees (first_name, last_name, email, role, weekly_capacity, is_active)
         VALUES ($1, $2, $3, $4, $5, true)`, [
                change.details?.firstName || 'New',
                change.details?.lastName || 'Resource',
                change.details?.email || `resource${Date.now()}@company.com`,
                change.details?.role || 'Developer',
                change.details?.weeklyCapacity || 40
            ]);
        }
        else if (change.action === 'remove') {
            // Deactivate resource
            await client.query(`UPDATE employees
         SET is_active = false,
             deactivated_at = $1
         WHERE id = $2`, [effectiveDate, change.employeeId]);
            // Remove future allocations
            await client.query(`DELETE FROM resource_allocations
         WHERE employee_id = $1 AND allocation_date > $2`, [change.employeeId, effectiveDate]);
        }
        else if (change.action === 'adjust_capacity') {
            // Adjust capacity
            await client.query(`UPDATE employees
         SET weekly_capacity = weekly_capacity + $1
         WHERE id = $2`, [change.details?.adjustment || 0, change.employeeId]);
        }
    }
    async applyCapacityAdjustment(adjustment, client) {
        if (adjustment.departmentId) {
            // Apply department-wide adjustment
            await client.query(`UPDATE employees
         SET weekly_capacity = weekly_capacity + $1
         WHERE department_id = $2
           AND is_active = true`, [adjustment.adjustment, adjustment.departmentId]);
        }
        else if (adjustment.teamId) {
            // Apply team-wide adjustment
            await client.query(`UPDATE employees e
         SET weekly_capacity = weekly_capacity + $1
         FROM team_members tm
         WHERE e.id = tm.employee_id
           AND tm.team_id = $2
           AND e.is_active = true`, [adjustment.adjustment, adjustment.teamId]);
        }
    }
    // ============================================
    // WHAT-IF ANALYSIS
    // ============================================
    async runWhatIfAnalysis(params) {
        // Create temporary scenario
        const tempScenario = await this.createScenario({
            name: 'What-If Analysis',
            description: 'Temporary scenario for what-if analysis',
            type: 'mixed',
            status: 'draft',
            baselineDate: new Date(),
            startDate: new Date(),
            endDate: (0, date_fns_1.addWeeks)(new Date(), 12),
            parameters: {
                projectChanges: params.changes.filter(c => c.type === 'project'),
                resourceChanges: params.changes.filter(c => c.type === 'resource'),
                capacityAdjustments: params.changes.filter(c => c.type === 'capacity'),
                constraints: params.constraints
            },
            createdBy: 'system',
            metadata: { isTemporary: true }
        });
        try {
            // Analyze impact
            const impact = await this.analyzeImpact(tempScenario.id);
            // Check constraints
            const violations = [];
            const suggestions = [];
            if (params.constraints?.maxBudget && impact.projected.totalCost > params.constraints.maxBudget) {
                violations.push(`Budget exceeds maximum of $${params.constraints.maxBudget}`);
                suggestions.push('Consider reducing resource hours or using lower-cost resources');
            }
            if (params.constraints?.maxResourceUtilization &&
                impact.projected.utilizationRate > params.constraints.maxResourceUtilization) {
                violations.push(`Utilization exceeds maximum of ${params.constraints.maxResourceUtilization}%`);
                suggestions.push('Add more resources or extend timeline');
            }
            if (params.constraints?.minResourceUtilization &&
                impact.projected.utilizationRate < params.constraints.minResourceUtilization) {
                violations.push(`Utilization below minimum of ${params.constraints.minResourceUtilization}%`);
                suggestions.push('Reduce resources or add more projects');
            }
            const feasible = violations.length === 0;
            return {
                feasible,
                violations,
                suggestions,
                metrics: {
                    utilization: impact.projected.utilizationRate,
                    cost: impact.projected.totalCost,
                    capacity: impact.projected.totalCapacity,
                    confidence: impact.confidenceScore
                }
            };
        }
        finally {
            // Clean up temporary scenario
            await this.deleteScenario(tempScenario.id);
        }
    }
    // ============================================
    // HELPER METHODS
    // ============================================
    formatScenario(row) {
        return {
            id: row.id,
            name: row.name,
            description: row.description,
            type: row.type,
            status: row.status,
            baselineDate: row.baseline_date,
            startDate: row.start_date,
            endDate: row.end_date,
            parameters: row.parameters,
            assumptions: row.assumptions,
            createdBy: row.created_by,
            approvedBy: row.approved_by,
            metadata: row.metadata,
            createdAt: row.created_at,
            updatedAt: row.updated_at
        };
    }
    async cloneScenario(scenarioId, newName) {
        const original = await this.getScenarioById(scenarioId);
        if (!original) {
            throw new api_error_1.ApiError(404, 'Scenario not found');
        }
        const cloned = await this.createScenario({
            ...original,
            id: undefined,
            name: newName,
            status: 'draft',
            createdAt: undefined,
            updatedAt: undefined,
            metadata: {
                ...original.metadata,
                clonedFrom: scenarioId,
                clonedAt: new Date()
            }
        });
        return cloned;
    }
    async getScenarioHistory(scenarioId) {
        const result = await this.db.query(`SELECT * FROM scenario_audit_log
       WHERE scenario_id = $1
       ORDER BY created_at DESC`, [scenarioId]);
        return result.rows;
    }
}
exports.ScenarioPlanner = ScenarioPlanner;
