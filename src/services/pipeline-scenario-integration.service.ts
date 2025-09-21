// Pipeline-Scenario Integration Service
import { DatabaseService } from '../database/database.service';
import { ApiError } from '../utils/api-error';
import { PipelineManagementService } from './pipeline-management.service';
import {
  PipelineProject,
  PipelineStage,
  ResourceDemandForecast
} from '../types/pipeline';

// Define scenario types locally to avoid path issues
interface Scenario {
  id: string;
  name: string;
  description?: string;
  type: 'what-if' | 'forecast' | 'template';
  status: 'draft' | 'active' | 'archived';
  baseDate: string;
  forecastPeriodMonths: number;
  createdBy?: string;
  metadata: Record<string, any>;
  isTemplate: boolean;
  templateCategory?: string;
  createdAt: string;
  updatedAt: string;
}

interface CreateScenarioRequest {
  name: string;
  description?: string;
  type: 'what-if' | 'forecast' | 'template';
  baseDate: string;
  forecastPeriodMonths: number;
  metadata?: Record<string, any>;
  isTemplate?: boolean;
  templateCategory?: string;
}

interface ScenarioAllocation {
  id: string;
  scenarioId: string;
  projectId: string;
  employeeId: string;
  roleId?: string;
  allocationType: 'tentative' | 'probable' | 'confirmed';
  allocationPercentage: number;
  startDate: string;
  endDate?: string;
  estimatedHours?: number;
  hourlyRate?: number;
  confidenceLevel: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

interface CreateScenarioAllocationRequest {
  scenarioId: string;
  projectId: string;
  employeeId: string;
  roleId?: string;
  allocationType: 'tentative' | 'probable' | 'confirmed';
  allocationPercentage: number;
  startDate: string;
  endDate?: string;
  estimatedHours?: number;
  hourlyRate?: number;
  confidenceLevel: number;
  notes?: string;
}

// Mock scenario service for compilation
class MockScenarioPlanningService {
  async createScenario(request: CreateScenarioRequest): Promise<Scenario> {
    return {
      id: 'mock-id',
      name: request.name,
      description: request.description,
      type: request.type,
      status: 'draft',
      baseDate: request.baseDate,
      forecastPeriodMonths: request.forecastPeriodMonths,
      metadata: request.metadata || {},
      isTemplate: request.isTemplate || false,
      templateCategory: request.templateCategory,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
  }

  async getScenario(id: string): Promise<Scenario | null> {
    return null;
  }

  async createScenarioAllocation(request: CreateScenarioAllocationRequest): Promise<ScenarioAllocation> {
    return {
      id: 'mock-allocation-id',
      ...request,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
  }

  async getScenarioAllocations(scenarioId: string, filters?: any): Promise<ScenarioAllocation[]> {
    return [];
  }

  async updateScenarioAllocation(request: any): Promise<ScenarioAllocation> {
    return {
      id: request.id,
      scenarioId: '',
      projectId: '',
      employeeId: '',
      allocationType: 'tentative',
      allocationPercentage: 0,
      startDate: '',
      confidenceLevel: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
  }
}

export class PipelineScenarioIntegrationService {
  private db: DatabaseService;
  private pipelineService: PipelineManagementService;
  private scenarioService: MockScenarioPlanningService;

  constructor() {
    this.db = DatabaseService.getInstance();
    this.pipelineService = new PipelineManagementService();
    this.scenarioService = new MockScenarioPlanningService();
  }

  // Create scenario from pipeline projects
  async createScenarioFromPipeline(request: {
    name: string;
    description?: string;
    pipelineProjectIds: string[];
    conversionRates?: Record<PipelineStage, number>;
    forecastPeriodMonths?: number;
  }): Promise<Scenario> {
    try {
      const client = await this.db.getClient();
      
      try {
        await client.query('BEGIN');

        // Default conversion rates by stage
        const defaultConversionRates: Record<PipelineStage, number> = {
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

        // Create the scenario
        const scenarioRequest: CreateScenarioRequest = {
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

        // Get pipeline projects
        const projects = await Promise.all(
          request.pipelineProjectIds.map(id => this.pipelineService.getPipelineProject(id))
        );

        // Create scenario allocations for each project
        for (const project of projects) {
          if (project) {
            await this.createScenarioAllocationsFromProject(scenario.id, project, conversionRates);
          }
        }

        // Create pipeline-scenario link
        await client.query(`
          INSERT INTO pipeline_scenario_links (pipeline_project_id, scenario_id, conversion_probability)
          SELECT unnest($1::uuid[]), $2, 50.0
        `, [request.pipelineProjectIds, scenario.id]);

        await client.query('COMMIT');
        return scenario;
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
    } catch (error) {
      console.error('Error creating scenario from pipeline:', error);
      throw new ApiError(500, 'Failed to create scenario from pipeline projects');
    }
  }

  // Sync pipeline project to existing scenarios
  async syncProjectToScenarios(projectId: string, scenarioIds?: string[]): Promise<void> {
    try {
      const project = await this.pipelineService.getPipelineProject(projectId);

      if (!project) {
        throw new ApiError(404, `Pipeline project ${projectId} not found`);
      }

      // Get scenarios to sync to
      let scenarios: Scenario[];
      if (scenarioIds) {
        scenarios = await Promise.all(
          scenarioIds.map(id => this.scenarioService.getScenario(id))
        ).then(results => results.filter(s => s !== null) as Scenario[]);
      } else {
        // Get all scenarios linked to this project
        const linkQuery = `
          SELECT scenario_id FROM pipeline_scenario_links 
          WHERE pipeline_project_id = $1
        `;
        const linkResult = await this.db.query(linkQuery, [projectId]);
        const linkedScenarioIds = linkResult.rows.map(row => row.scenario_id);
        
        if (linkedScenarioIds.length === 0) return;
        
        scenarios = await Promise.all(
          linkedScenarioIds.map(id => this.scenarioService.getScenario(id))
        ).then(results => results.filter(s => s !== null) as Scenario[]);
      }

      // Update allocations in each scenario
      for (const scenario of scenarios) {
        await this.updateScenarioAllocationsFromProject(scenario.id, project);
      }
    } catch (error) {
      console.error('Error syncing project to scenarios:', error);
      throw new ApiError(500, 'Failed to sync project to scenarios');
    }
  }

  // Generate resource demand forecast from pipeline and scenarios
  async generateResourceForecast(options: {
    includeActiveScenariosOnly?: boolean;
    forecastMonths?: number;
    confidenceThreshold?: number;
  } = {}): Promise<ResourceDemandForecast[]> {
    try {
      const {
        includeActiveScenariosOnly = true,
        forecastMonths = 12,
        confidenceThreshold = 0.5
      } = options;

      // Get pipeline projects with resource demands
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

      // Get scenario allocations
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

      // Combine pipeline and scenario data
      const forecast = await this.calculateCombinedResourceForecast(
        pipelineProjects,
        scenarioAllocations,
        forecastMonths
      );

      return forecast;
    } catch (error) {
      console.error('Error generating resource forecast:', error);
      throw new ApiError(500, 'Failed to generate resource demand forecast');
    }
  }

  // What-if analysis: convert pipeline to scenario allocations
  async runWhatIfAnalysis(request: {
    pipelineProjectIds: string[];
    conversionScenarios: {
      name: string;
      conversionRates: Record<PipelineStage, number>;
    }[];
    baselineScenarioId?: string;
  }): Promise<{
    scenarios: Scenario[];
    comparison: {
      totalResourceDemand: Record<string, number>;
      skillGaps: Record<string, any[]>;
      costAnalysis: Record<string, number>;
    };
  }> {
    try {
      const scenarios: Scenario[] = [];

      // Create scenarios for each conversion rate set
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

      // Generate comparison analysis
      const comparison = await this.compareScenarios(scenarios.map(s => s.id));

      return { scenarios, comparison };
    } catch (error) {
      console.error('Error running what-if analysis:', error);
      throw new ApiError(500, 'Failed to run what-if analysis');
    }
  }

  // Private helper methods
  private async createScenarioAllocationsFromProject(
    scenarioId: string,
    project: PipelineProject,
    conversionRates: Record<PipelineStage, number>
  ): Promise<void> {
    const conversionProbability = conversionRates[project.stage] || 0;
    const adjustedProbability = (project.probability / 100) * conversionProbability;

    // Create allocations for each resource demand
    for (const demand of project.resourceDemand || []) {
      // Find employees with matching skills
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

      // Create allocation for each matched employee
      for (const employee of employeesResult.rows) {
        const allocationType: 'tentative' | 'probable' | 'confirmed' = 
          adjustedProbability > 0.7 ? 'confirmed' :
          adjustedProbability > 0.4 ? 'probable' : 'tentative';

        const allocationRequest: CreateScenarioAllocationRequest = {
          scenarioId,
          projectId: project.id, // This would need to be mapped to a regular project
          employeeId: employee.id,
          allocationType,
          allocationPercentage: demand.allocationPercentage,
          startDate: demand.startDate,
          endDate: demand.endDate,
          estimatedHours: this.calculateEstimatedHours(
            demand.startDate,
            demand.endDate,
            demand.allocationPercentage
          ),
          hourlyRate: demand.hourlyRate,
          confidenceLevel: Math.round(adjustedProbability * 5), // Scale to 1-5
          notes: `Generated from pipeline project: ${project.name}`
        };

        await this.scenarioService.createScenarioAllocation(allocationRequest);
      }
    }
  }

  private async updateScenarioAllocationsFromProject(
    scenarioId: string,
    project: PipelineProject
  ): Promise<void> {
    // Get existing allocations for this project in the scenario
    const existingAllocations = await this.scenarioService.getScenarioAllocations(scenarioId, {
      projectId: project.id
    });

    // Update or create allocations based on current project state
    // This is a simplified implementation - in practice, you'd need more sophisticated logic
    // to handle changes in resource demands, timeline adjustments, etc.

    for (const allocation of existingAllocations) {
      // Update confidence level based on current project probability
      const updatedConfidence = Math.round((project.probability / 100) * 5);
      
      await this.scenarioService.updateScenarioAllocation({
        id: allocation.id,
        confidenceLevel: updatedConfidence,
        notes: `Updated from pipeline sync: ${new Date().toISOString()}`
      });
    }
  }

  private async calculateCombinedResourceForecast(
    pipelineProjects: any[],
    scenarioAllocations: any[],
    forecastMonths: number
  ): Promise<ResourceDemandForecast[]> {
    const forecast: ResourceDemandForecast[] = [];
    const skillLevelCombinations = new Set<string>();

    // Collect all skill-level combinations
    pipelineProjects.forEach(project => {
      project.resource_demands?.forEach((demand: any) => {
        skillLevelCombinations.add(`${demand.skillCategory}:${demand.experienceLevel}`);
      });
    });

    scenarioAllocations.forEach(allocation => {
      skillLevelCombinations.add(`${allocation.skill_category}:${allocation.experience_level}`);
    });

    // Calculate forecast for each month and skill combination
    for (let month = 0; month < forecastMonths; month++) {
      const forecastDate = new Date();
      forecastDate.setMonth(forecastDate.getMonth() + month);
      const period = forecastDate.toISOString().slice(0, 7); // YYYY-MM

      for (const combination of skillLevelCombinations) {
        const [skillCategory, experienceLevel] = combination.split(':');

        // Calculate pipeline demand
        const pipelineDemand = this.calculatePipelineDemandForPeriod(
          pipelineProjects,
          skillCategory,
          experienceLevel,
          forecastDate
        );

        // Calculate scenario demand
        const scenarioDemand = this.calculateScenarioDemandForPeriod(
          scenarioAllocations,
          skillCategory,
          experienceLevel,
          forecastDate
        );

        // Get current supply
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
          hiringRecommendation: Math.max(0, Math.ceil(gapHours / (40 * 4.33))), // Assuming 40h/week
          confidence: this.calculateForecastConfidence(pipelineDemand, scenarioDemand)
        });
      }
    }

    return forecast.sort((a, b) => a.period.localeCompare(b.period));
  }

  private calculatePipelineDemandForPeriod(
    pipelineProjects: any[],
    skillCategory: string,
    experienceLevel: string,
    forecastDate: Date
  ): number {
    let totalDemand = 0;

    for (const project of pipelineProjects) {
      const demands = project.resource_demands || [];
      
      for (const demand of demands) {
        if (demand.skillCategory === skillCategory && 
            demand.experienceLevel === experienceLevel) {
          
          const startDate = new Date(demand.startDate);
          const endDate = new Date(demand.endDate);
          
          // Check if forecast period overlaps with demand period
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

  private calculateScenarioDemandForPeriod(
    scenarioAllocations: any[],
    skillCategory: string,
    experienceLevel: string,
    forecastDate: Date
  ): number {
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

  private async getCurrentSupply(skillCategory: string, experienceLevel: string): Promise<number> {
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

  private calculateForecastConfidence(pipelineDemand: number, scenarioDemand: number): number {
    // Higher confidence when more demand comes from committed scenarios vs uncertain pipeline
    const totalDemand = pipelineDemand + scenarioDemand;
    if (totalDemand === 0) return 50;
    
    const scenarioWeight = scenarioDemand / totalDemand;
    return Math.min(100, 40 + (scenarioWeight * 60));
  }

  private async compareScenarios(scenarioIds: string[]): Promise<any> {
    // Simplified comparison implementation
    const comparison = {
      totalResourceDemand: {},
      skillGaps: {},
      costAnalysis: {}
    };

    for (const scenarioId of scenarioIds) {
      const allocations = await this.scenarioService.getScenarioAllocations(scenarioId);
      
      // Calculate totals for this scenario
      const totalHours = allocations.reduce((sum, alloc) => sum + (alloc.estimatedHours || 0), 0);
      const totalCost = allocations.reduce((sum, alloc) => 
        sum + ((alloc.estimatedHours || 0) * (alloc.hourlyRate || 75)), 0
      );

      (comparison.totalResourceDemand as any)[scenarioId] = totalHours;
      (comparison.costAnalysis as any)[scenarioId] = totalCost;
    }

    return comparison;
  }

  private calculateEstimatedHours(startDate: string, endDate: string, allocationPercentage: number): number {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    const workDays = Math.floor(days * 5/7); // Assume 5-day work week
    return Math.round((workDays * 8 * allocationPercentage) / 100);
  }
}