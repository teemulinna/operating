"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PipelineScenarioIntegrationService = void 0;
const database_service_1 = require("../database/database.service");
const api_error_1 = require("../utils/api-error");
const pipeline_management_service_1 = require("./pipeline-management.service");
const scenario_planning_service_1 = require("../../frontend/src/services/scenario-planning.service");
class PipelineScenarioIntegrationService {
    constructor() {
        this.db = database_service_1.DatabaseService.getInstance();
        this.pipelineService = new pipeline_management_service_1.PipelineManagementService();
        this.scenarioService = new scenario_planning_service_1.ScenarioPlanningService(this.db);
    }
    async createScenarioFromPipeline(request) {
        try {
            const client = await this.db.connect();
            try {
                await client.query('BEGIN');
                const defaultConversionRates = {
                    lead: 0.2,
                    prospect: 0.3,
                    opportunity: 0.5,
                    proposal: 0.7,
                    negotiation: 0.8,
                    won: 1.0,
                    lost: 0.0,
                    'on-hold': 0.1
                };
                const conversionRates = { ...defaultConversionRates, ...request.conversionRates };
                const scenarioRequest = {
                    name: request.name,
                    description: request.description || `Scenario generated from ${request.pipelineProjectIds.length} pipeline projects`,
                    type: 'forecast',
                    baseDate: new Date().toISOString().split('T')[0],
                    forecastPeriodMonths: request.forecastPeriodMonths || 12,
                    metadata: {
                        sourceType: 'pipeline',
                        pipelineProjectIds: request.pipelineProjectIds,
                        conversionRates,
                        createdBy: 'pipeline-integration'
                    }
                };
                const scenario = await this.scenarioService.createScenario(scenarioRequest);
                const projects = await Promise.all(request.pipelineProjectIds.map(id => this.pipelineService.getPipelineProject(id)));
                for (const project of projects) {
                    await this.createScenarioAllocationsFromProject(scenario.id, project, conversionRates);
                }
                await client.query(`
          INSERT INTO pipeline_scenario_links (pipeline_project_id, scenario_id, conversion_probability)
          SELECT unnest($1::uuid[]), $2, 50.0
        `, [request.pipelineProjectIds, scenario.id]);
                await client.query('COMMIT');
                return scenario;
            }
            catch (error) {
                await client.query('ROLLBACK');
                throw error;
            }
            finally {
                client.release();
            }
        }
        catch (error) {
            console.error('Error creating scenario from pipeline:', error);
            throw new api_error_1.ApiError(500, 'Failed to create scenario from pipeline projects');
        }
    }
    async syncProjectToScenarios(projectId, scenarioIds) {
        try {
            const project = await this.pipelineService.getPipelineProject(projectId);
            let scenarios;
            if (scenarioIds) {
                scenarios = await Promise.all(scenarioIds.map(id => this.scenarioService.getScenario(id))).then(results => results.filter(s => s !== null));
            }
            else {
                const linkQuery = `
          SELECT scenario_id FROM pipeline_scenario_links 
          WHERE pipeline_project_id = $1
        `;
                const linkResult = await this.db.query(linkQuery, [projectId]);
                const linkedScenarioIds = linkResult.rows.map(row => row.scenario_id);
                if (linkedScenarioIds.length === 0)
                    return;
                scenarios = await Promise.all(linkedScenarioIds.map(id => this.scenarioService.getScenario(id))).then(results => results.filter(s => s !== null));
            }
            for (const scenario of scenarios) {
                await this.updateScenarioAllocationsFromProject(scenario.id, project);
            }
        }
        catch (error) {
            console.error('Error syncing project to scenarios:', error);
            throw new api_error_1.ApiError(500, 'Failed to sync project to scenarios');
        }
    }
    async generateResourceForecast(options = {}) {
        try {
            const { includeActiveScenariosOnly = true, forecastMonths = 12, confidenceThreshold = 0.5 } = options;
            const pipelineQuery = `
        SELECT 
          pp.*,
          json_agg(
            json_build_object(
              'skillCategory', prd.skill_category,
              'experienceLevel', prd.experience_level,
              'requiredCount', prd.required_count,
              'allocationPercentage', prd.allocation_percentage,
              'startDate', prd.start_date,
              'endDate', prd.end_date,
              'hourlyRate', prd.hourly_rate,
              'isCritical', prd.is_critical
            )
          ) as resource_demands
        FROM pipeline_projects pp
        LEFT JOIN pipeline_resource_demands prd ON pp.id = prd.pipeline_project_id
        WHERE pp.stage NOT IN ('won', 'lost')
          AND pp.probability >= $1
        GROUP BY pp.id
      `;
            const pipelineResult = await this.db.query(pipelineQuery, [confidenceThreshold * 100]);
            const pipelineProjects = pipelineResult.rows;
            const scenarioQuery = `
        SELECT 
          s.id as scenario_id,
          s.name as scenario_name,
          s.type,
          sa.skill_category,
          sa.experience_level,
          sa.allocation_percentage,
          sa.start_date,
          sa.end_date,
          sa.estimated_hours,
          sa.confidence_level
        FROM scenarios s
        JOIN scenario_allocations sa ON s.id = sa.scenario_id
        ${includeActiveScenariosOnly ? "WHERE s.status = 'active'" : ''}
        AND sa.start_date <= $1
      `;
            const forecastEndDate = new Date();
            forecastEndDate.setMonth(forecastEndDate.getMonth() + forecastMonths);
            const scenarioResult = await this.db.query(scenarioQuery, [forecastEndDate.toISOString().split('T')[0]]);
            const scenarioAllocations = scenarioResult.rows;
            const forecast = await this.calculateCombinedResourceForecast(pipelineProjects, scenarioAllocations, forecastMonths);
            return forecast;
        }
        catch (error) {
            console.error('Error generating resource forecast:', error);
            throw new api_error_1.ApiError(500, 'Failed to generate resource demand forecast');
        }
    }
    async runWhatIfAnalysis(request) {
        try {
            const scenarios = [];
            for (const conversionScenario of request.conversionScenarios) {
                const scenario = await this.createScenarioFromPipeline({
                    name: conversionScenario.name,
                    description: `What-if analysis: ${conversionScenario.name}`,
                    pipelineProjectIds: request.pipelineProjectIds,
                    conversionRates: conversionScenario.conversionRates,
                    forecastPeriodMonths: 6
                });
                scenarios.push(scenario);
            }
            const comparison = await this.compareScenarios(scenarios.map(s => s.id));
            return { scenarios, comparison };
        }
        catch (error) {
            console.error('Error running what-if analysis:', error);
            throw new api_error_1.ApiError(500, 'Failed to run what-if analysis');
        }
    }
    async createScenarioAllocationsFromProject(scenarioId, project, conversionRates) {
        const conversionProbability = conversionRates[project.stage] || 0;
        const adjustedProbability = (project.probability / 100) * conversionProbability;
        for (const demand of project.resourceDemand || []) {
            const employeesQuery = `
        SELECT id, skills, experience_level 
        FROM employees 
        WHERE is_active = true 
          AND $1 = ANY(skills)
          AND experience_level = $2
        LIMIT $3
      `;
            const employeesResult = await this.db.query(employeesQuery, [
                demand.skillCategory,
                demand.experienceLevel,
                demand.requiredCount
            ]);
            for (const employee of employeesResult.rows) {
                const allocationType = adjustedProbability > 0.7 ? 'confirmed' :
                    adjustedProbability > 0.4 ? 'probable' : 'tentative';
                const allocationRequest = {
                    scenarioId,
                    projectId: project.id,
                    employeeId: employee.id,
                    allocationType,
                    allocationPercentage: demand.allocationPercentage,
                    startDate: demand.startDate,
                    endDate: demand.endDate,
                    estimatedHours: this.calculateEstimatedHours(demand.startDate, demand.endDate, demand.allocationPercentage),
                    hourlyRate: demand.hourlyRate,
                    confidenceLevel: Math.round(adjustedProbability * 5),
                    notes: `Generated from pipeline project: ${project.name}`
                };
                await this.scenarioService.createScenarioAllocation(allocationRequest);
            }
        }
    }
    async updateScenarioAllocationsFromProject(scenarioId, project) {
        const existingAllocations = await this.scenarioService.getScenarioAllocations(scenarioId, {
            projectId: project.id
        });
        for (const allocation of existingAllocations) {
            const updatedConfidence = Math.round((project.probability / 100) * 5);
            await this.scenarioService.updateScenarioAllocation({
                id: allocation.id,
                confidenceLevel: updatedConfidence,
                notes: `Updated from pipeline sync: ${new Date().toISOString()}`
            });
        }
    }
    async calculateCombinedResourceForecast(pipelineProjects, scenarioAllocations, forecastMonths) {
        const forecast = [];
        const skillLevelCombinations = new Set();
        pipelineProjects.forEach(project => {
            project.resource_demands?.forEach((demand) => {
                skillLevelCombinations.add(`${demand.skillCategory}:${demand.experienceLevel}`);
            });
        });
        scenarioAllocations.forEach(allocation => {
            skillLevelCombinations.add(`${allocation.skill_category}:${allocation.experience_level}`);
        });
        for (let month = 0; month < forecastMonths; month++) {
            const forecastDate = new Date();
            forecastDate.setMonth(forecastDate.getMonth() + month);
            const period = forecastDate.toISOString().slice(0, 7);
            for (const combination of skillLevelCombinations) {
                const [skillCategory, experienceLevel] = combination.split(':');
                const pipelineDemand = this.calculatePipelineDemandForPeriod(pipelineProjects, skillCategory, experienceLevel, forecastDate);
                const scenarioDemand = this.calculateScenarioDemandForPeriod(scenarioAllocations, skillCategory, experienceLevel, forecastDate);
                const supply = await this.getCurrentSupply(skillCategory, experienceLevel);
                const totalDemand = pipelineDemand + scenarioDemand;
                const gapHours = totalDemand - supply;
                const utilizationRate = supply > 0 ? (totalDemand / supply) * 100 : 0;
                forecast.push({
                    period,
                    skillCategory,
                    experienceLevel,
                    demandHours: totalDemand,
                    supplyHours: supply,
                    gapHours,
                    utilizationRate,
                    hiringRecommendation: Math.max(0, Math.ceil(gapHours / (40 * 4.33))),
                    confidence: this.calculateForecastConfidence(pipelineDemand, scenarioDemand)
                });
            }
        }
        return forecast.sort((a, b) => a.period.localeCompare(b.period));
    }
    calculatePipelineDemandForPeriod(pipelineProjects, skillCategory, experienceLevel, forecastDate) {
        let totalDemand = 0;
        for (const project of pipelineProjects) {
            const demands = project.resource_demands || [];
            for (const demand of demands) {
                if (demand.skillCategory === skillCategory &&
                    demand.experienceLevel === experienceLevel) {
                    const startDate = new Date(demand.startDate);
                    const endDate = new Date(demand.endDate);
                    if (forecastDate >= startDate && forecastDate <= endDate) {
                        const monthlyHours = (demand.requiredCount * demand.allocationPercentage * 40 * 4.33) / 100;
                        const probabilityFactor = project.probability / 100;
                        totalDemand += monthlyHours * probabilityFactor;
                    }
                }
            }
        }
        return totalDemand;
    }
    calculateScenarioDemandForPeriod(scenarioAllocations, skillCategory, experienceLevel, forecastDate) {
        let totalDemand = 0;
        for (const allocation of scenarioAllocations) {
            if (allocation.skill_category === skillCategory &&
                allocation.experience_level === experienceLevel) {
                const startDate = new Date(allocation.start_date);
                const endDate = new Date(allocation.end_date);
                if (forecastDate >= startDate && forecastDate <= endDate) {
                    const monthlyHours = allocation.estimated_hours /
                        Math.max(1, Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24 * 30)));
                    const confidenceFactor = allocation.confidence_level / 5;
                    totalDemand += monthlyHours * confidenceFactor;
                }
            }
        }
        return totalDemand;
    }
    async getCurrentSupply(skillCategory, experienceLevel) {
        const query = `
      SELECT COUNT(*) * 40 * 4.33 as supply_hours
      FROM employees
      WHERE is_active = true
        AND $1 = ANY(skills)
        AND experience_level = $2
    `;
        const result = await this.db.query(query, [skillCategory, experienceLevel]);
        return parseFloat(result.rows[0]?.supply_hours || 0);
    }
    calculateForecastConfidence(pipelineDemand, scenarioDemand) {
        const totalDemand = pipelineDemand + scenarioDemand;
        if (totalDemand === 0)
            return 50;
        const scenarioWeight = scenarioDemand / totalDemand;
        return Math.min(100, 40 + (scenarioWeight * 60));
    }
    async compareScenarios(scenarioIds) {
        const comparison = {
            totalResourceDemand: {},
            skillGaps: {},
            costAnalysis: {}
        };
        for (const scenarioId of scenarioIds) {
            const allocations = await this.scenarioService.getScenarioAllocations(scenarioId);
            const totalHours = allocations.reduce((sum, alloc) => sum + (alloc.estimatedHours || 0), 0);
            const totalCost = allocations.reduce((sum, alloc) => sum + ((alloc.estimatedHours || 0) * (alloc.hourlyRate || 75)), 0);
            comparison.totalResourceDemand[scenarioId] = totalHours;
            comparison.costAnalysis[scenarioId] = totalCost;
        }
        return comparison;
    }
    calculateEstimatedHours(startDate, endDate, allocationPercentage) {
        const start = new Date(startDate);
        const end = new Date(endDate);
        const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
        const workDays = Math.floor(days * 5 / 7);
        return Math.round((workDays * 8 * allocationPercentage) / 100);
    }
}
exports.PipelineScenarioIntegrationService = PipelineScenarioIntegrationService;
//# sourceMappingURL=pipeline-scenario-integration.service.js.map