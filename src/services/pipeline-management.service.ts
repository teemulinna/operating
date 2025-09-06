// Pipeline Management Service for CRM Integration
import { DatabaseService } from '../database/database.service';
import { ApiError } from '../utils/api-error';
import {
  PipelineProject,
  CreatePipelineProjectRequest,
  UpdatePipelineProjectRequest,
  PipelineFilters,
  PipelineAnalytics,
  ResourceDemandForecast,
  CapacityUtilization,
  WinLossAnalysis,
  PipelineTrend,
  PipelineStage,
  PipelinePriority
} from '../types/pipeline';

export class PipelineManagementService {
  private db: DatabaseService;

  constructor() {
    this.db = DatabaseService.getInstance();
  }

  // Pipeline Project CRUD Operations
  async createPipelineProject(request: CreatePipelineProjectRequest): Promise<PipelineProject> {
    try {
      const client = await this.db.connect();
      
      try {
        await client.query('BEGIN');

        // Create the main project record
        const projectQuery = `
          INSERT INTO pipeline_projects (
            name, description, client_name, client_contact, stage, priority,
            probability, estimated_value, estimated_start_date, estimated_duration,
            required_skills, risk_factors, notes, tags
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
          RETURNING *
        `;

        const projectValues = [
          request.name,
          request.description,
          request.clientName,
          JSON.stringify(request.clientContact),
          request.stage,
          request.priority,
          request.probability,
          request.estimatedValue,
          request.estimatedStartDate,
          request.estimatedDuration,
          JSON.stringify(request.requiredSkills),
          JSON.stringify(request.riskFactors),
          request.notes,
          JSON.stringify(request.tags)
        ];

        const projectResult = await client.query(projectQuery, projectValues);
        const project = projectResult.rows[0];

        // Create resource demand records
        if (request.resourceDemand && request.resourceDemand.length > 0) {
          const demandQuery = `
            INSERT INTO pipeline_resource_demands (
              pipeline_project_id, skill_category, experience_level, required_count,
              allocation_percentage, start_date, end_date, hourly_rate, is_critical, alternatives
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
          `;

          for (const demand of request.resourceDemand) {
            await client.query(demandQuery, [
              project.id,
              demand.skillCategory,
              demand.experienceLevel,
              demand.requiredCount,
              demand.allocationPercentage,
              demand.startDate,
              demand.endDate,
              demand.hourlyRate,
              demand.isCritical,
              JSON.stringify(demand.alternatives || [])
            ]);
          }
        }

        // Create competitor info records
        if (request.competitorInfo && request.competitorInfo.length > 0) {
          const competitorQuery = `
            INSERT INTO pipeline_competitors (
              pipeline_project_id, name, strengths, weaknesses, estimated_price, likelihood
            )
            VALUES ($1, $2, $3, $4, $5, $6)
          `;

          for (const competitor of request.competitorInfo) {
            await client.query(competitorQuery, [
              project.id,
              competitor.name,
              JSON.stringify(competitor.strengths),
              JSON.stringify(competitor.weaknesses),
              competitor.estimatedPrice,
              competitor.likelihood
            ]);
          }
        }

        await client.query('COMMIT');
        
        return await this.getPipelineProject(project.id);
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
    } catch (error) {
      console.error('Error creating pipeline project:', error);
      throw new ApiError(500, 'Failed to create pipeline project');
    }
  }

  async getPipelineProject(id: string): Promise<PipelineProject> {
    try {
      const query = `
        SELECT 
          pp.*,
          COALESCE(
            json_agg(
              DISTINCT jsonb_build_object(
                'id', prd.id,
                'skillCategory', prd.skill_category,
                'experienceLevel', prd.experience_level,
                'requiredCount', prd.required_count,
                'allocationPercentage', prd.allocation_percentage,
                'startDate', prd.start_date,
                'endDate', prd.end_date,
                'hourlyRate', prd.hourly_rate,
                'isCritical', prd.is_critical,
                'alternatives', prd.alternatives
              )
            ) FILTER (WHERE prd.id IS NOT NULL), '[]'::json
          ) as resource_demand,
          COALESCE(
            json_agg(
              DISTINCT jsonb_build_object(
                'name', pc.name,
                'strengths', pc.strengths,
                'weaknesses', pc.weaknesses,
                'estimatedPrice', pc.estimated_price,
                'likelihood', pc.likelihood
              )
            ) FILTER (WHERE pc.id IS NOT NULL), '[]'::json
          ) as competitor_info
        FROM pipeline_projects pp
        LEFT JOIN pipeline_resource_demands prd ON pp.id = prd.pipeline_project_id
        LEFT JOIN pipeline_competitors pc ON pp.id = pc.pipeline_project_id
        WHERE pp.id = $1
        GROUP BY pp.id
      `;

      const result = await this.db.query(query, [id]);
      
      if (!result.rows.length) {
        throw new ApiError(404, 'Pipeline project not found');
      }

      return this.transformPipelineProject(result.rows[0]);
    } catch (error) {
      console.error('Error fetching pipeline project:', error);
      if (error instanceof ApiError) throw error;
      throw new ApiError(500, 'Failed to fetch pipeline project');
    }
  }

  async getPipelineProjects(filters: PipelineFilters = {}): Promise<{ projects: PipelineProject[]; total: number }> {
    try {
      let whereConditions: string[] = [];
      let queryParams: any[] = [];
      let paramIndex = 1;

      // Build WHERE conditions
      if (filters.stage) {
        if (Array.isArray(filters.stage)) {
          whereConditions.push(`pp.stage = ANY($${paramIndex})`);
          queryParams.push(filters.stage);
        } else {
          whereConditions.push(`pp.stage = $${paramIndex}`);
          queryParams.push(filters.stage);
        }
        paramIndex++;
      }

      if (filters.priority) {
        if (Array.isArray(filters.priority)) {
          whereConditions.push(`pp.priority = ANY($${paramIndex})`);
          queryParams.push(filters.priority);
        } else {
          whereConditions.push(`pp.priority = $${paramIndex}`);
          queryParams.push(filters.priority);
        }
        paramIndex++;
      }

      if (filters.clientName) {
        whereConditions.push(`pp.client_name ILIKE $${paramIndex}`);
        queryParams.push(`%${filters.clientName}%`);
        paramIndex++;
      }

      if (filters.probabilityMin !== undefined) {
        whereConditions.push(`pp.probability >= $${paramIndex}`);
        queryParams.push(filters.probabilityMin);
        paramIndex++;
      }

      if (filters.probabilityMax !== undefined) {
        whereConditions.push(`pp.probability <= $${paramIndex}`);
        queryParams.push(filters.probabilityMax);
        paramIndex++;
      }

      if (filters.valueMin !== undefined) {
        whereConditions.push(`pp.estimated_value >= $${paramIndex}`);
        queryParams.push(filters.valueMin);
        paramIndex++;
      }

      if (filters.valueMax !== undefined) {
        whereConditions.push(`pp.estimated_value <= $${paramIndex}`);
        queryParams.push(filters.valueMax);
        paramIndex++;
      }

      if (filters.startDateFrom) {
        whereConditions.push(`pp.estimated_start_date >= $${paramIndex}`);
        queryParams.push(filters.startDateFrom);
        paramIndex++;
      }

      if (filters.startDateTo) {
        whereConditions.push(`pp.estimated_start_date <= $${paramIndex}`);
        queryParams.push(filters.startDateTo);
        paramIndex++;
      }

      if (filters.skills && filters.skills.length > 0) {
        whereConditions.push(`pp.required_skills ?| $${paramIndex}`);
        queryParams.push(filters.skills);
        paramIndex++;
      }

      if (filters.tags && filters.tags.length > 0) {
        whereConditions.push(`pp.tags ?| $${paramIndex}`);
        queryParams.push(filters.tags);
        paramIndex++;
      }

      if (filters.syncStatus) {
        whereConditions.push(`pp.sync_status = $${paramIndex}`);
        queryParams.push(filters.syncStatus);
        paramIndex++;
      }

      if (filters.search) {
        whereConditions.push(`(pp.name ILIKE $${paramIndex} OR pp.description ILIKE $${paramIndex})`);
        queryParams.push(`%${filters.search}%`);
        paramIndex++;
      }

      const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

      // Count total records
      const countQuery = `SELECT COUNT(*) FROM pipeline_projects pp ${whereClause}`;
      const countResult = await this.db.query(countQuery, queryParams);
      const total = parseInt(countResult.rows[0].count);

      // Get projects with related data
      const query = `
        SELECT 
          pp.*,
          (pp.estimated_value * pp.probability / 100) as weighted_value,
          (pp.estimated_start_date + INTERVAL '1 day' * pp.estimated_duration) as estimated_end_date,
          COALESCE(resource_summary.total_cost, 0) as resource_cost,
          COALESCE(availability_score.score, 0) as availability_score
        FROM pipeline_projects pp
        LEFT JOIN (
          SELECT 
            pipeline_project_id,
            SUM(required_count * allocation_percentage * COALESCE(hourly_rate, 75) * 40 / 100) as total_cost
          FROM pipeline_resource_demands
          GROUP BY pipeline_project_id
        ) resource_summary ON pp.id = resource_summary.pipeline_project_id
        LEFT JOIN (
          SELECT 
            pipeline_project_id,
            AVG(
              CASE 
                WHEN is_critical THEN 60 
                ELSE 80 
              END
            ) as score
          FROM pipeline_resource_demands
          GROUP BY pipeline_project_id
        ) availability_score ON pp.id = availability_score.pipeline_project_id
        ${whereClause}
        ORDER BY pp.created_at DESC
      `;

      const result = await this.db.query(query, queryParams);
      const projects = result.rows.map(row => this.transformPipelineProjectSummary(row));

      return { projects, total };
    } catch (error) {
      console.error('Error fetching pipeline projects:', error);
      throw new ApiError(500, 'Failed to fetch pipeline projects');
    }
  }

  async updatePipelineProject(request: UpdatePipelineProjectRequest): Promise<PipelineProject> {
    try {
      const updateFields: string[] = [];
      const queryParams: any[] = [];
      let paramIndex = 1;

      // Build update fields
      if (request.name) {
        updateFields.push(`name = $${paramIndex}`);
        queryParams.push(request.name);
        paramIndex++;
      }

      if (request.description !== undefined) {
        updateFields.push(`description = $${paramIndex}`);
        queryParams.push(request.description);
        paramIndex++;
      }

      if (request.stage) {
        updateFields.push(`stage = $${paramIndex}`);
        queryParams.push(request.stage);
        paramIndex++;
      }

      if (request.priority) {
        updateFields.push(`priority = $${paramIndex}`);
        queryParams.push(request.priority);
        paramIndex++;
      }

      if (request.probability !== undefined) {
        updateFields.push(`probability = $${paramIndex}`);
        queryParams.push(request.probability);
        paramIndex++;
      }

      if (request.estimatedValue !== undefined) {
        updateFields.push(`estimated_value = $${paramIndex}`);
        queryParams.push(request.estimatedValue);
        paramIndex++;
      }

      if (request.estimatedStartDate) {
        updateFields.push(`estimated_start_date = $${paramIndex}`);
        queryParams.push(request.estimatedStartDate);
        paramIndex++;
      }

      if (request.estimatedDuration !== undefined) {
        updateFields.push(`estimated_duration = $${paramIndex}`);
        queryParams.push(request.estimatedDuration);
        paramIndex++;
      }

      if (request.requiredSkills) {
        updateFields.push(`required_skills = $${paramIndex}`);
        queryParams.push(JSON.stringify(request.requiredSkills));
        paramIndex++;
      }

      if (request.notes !== undefined) {
        updateFields.push(`notes = $${paramIndex}`);
        queryParams.push(request.notes);
        paramIndex++;
      }

      if (request.tags) {
        updateFields.push(`tags = $${paramIndex}`);
        queryParams.push(JSON.stringify(request.tags));
        paramIndex++;
      }

      if (updateFields.length === 0) {
        throw new ApiError(400, 'No fields to update');
      }

      updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
      queryParams.push(request.id);

      const query = `
        UPDATE pipeline_projects 
        SET ${updateFields.join(', ')}
        WHERE id = $${paramIndex}
        RETURNING *
      `;

      const result = await this.db.query(query, queryParams);
      
      if (!result.rows.length) {
        throw new ApiError(404, 'Pipeline project not found');
      }

      return await this.getPipelineProject(request.id);
    } catch (error) {
      console.error('Error updating pipeline project:', error);
      if (error instanceof ApiError) throw error;
      throw new ApiError(500, 'Failed to update pipeline project');
    }
  }

  async deletePipelineProject(id: string): Promise<void> {
    try {
      const query = `DELETE FROM pipeline_projects WHERE id = $1`;
      const result = await this.db.query(query, [id]);
      
      if (result.rowCount === 0) {
        throw new ApiError(404, 'Pipeline project not found');
      }
    } catch (error) {
      console.error('Error deleting pipeline project:', error);
      if (error instanceof ApiError) throw error;
      throw new ApiError(500, 'Failed to delete pipeline project');
    }
  }

  // Pipeline Analytics
  async getPipelineAnalytics(filters: PipelineFilters = {}): Promise<PipelineAnalytics> {
    try {
      const analytics: PipelineAnalytics = {
        totalValue: 0,
        weightedValue: 0,
        conversionRates: [],
        forecastAccuracy: [],
        resourceDemandForecast: [],
        capacityUtilization: [],
        winLossAnalysis: {} as WinLossAnalysis,
        trends: []
      };

      // Get basic metrics
      const metricsQuery = `
        SELECT 
          SUM(estimated_value) as total_value,
          SUM(estimated_value * probability / 100) as weighted_value,
          COUNT(*) as total_count
        FROM pipeline_projects
        WHERE stage NOT IN ('won', 'lost')
      `;

      const metricsResult = await this.db.query(metricsQuery);
      const metrics = metricsResult.rows[0];

      analytics.totalValue = parseFloat(metrics.total_value) || 0;
      analytics.weightedValue = parseFloat(metrics.weighted_value) || 0;

      // Get conversion rates by stage
      const conversionQuery = `
        WITH stage_stats AS (
          SELECT 
            stage,
            COUNT(*) as count,
            AVG(
              CASE 
                WHEN updated_at > created_at 
                THEN EXTRACT(epoch FROM (updated_at - created_at)) / 86400 
                ELSE 0 
              END
            ) as avg_duration
          FROM pipeline_projects
          GROUP BY stage
        ),
        conversion_stats AS (
          SELECT 
            stage,
            count,
            avg_duration,
            CASE 
              WHEN stage = 'lead' THEN count * 0.2
              WHEN stage = 'prospect' THEN count * 0.3
              WHEN stage = 'opportunity' THEN count * 0.5
              WHEN stage = 'proposal' THEN count * 0.7
              WHEN stage = 'negotiation' THEN count * 0.8
              WHEN stage = 'won' THEN count * 1.0
              ELSE count * 0.1
            END as conversion_rate
          FROM stage_stats
        )
        SELECT * FROM conversion_stats ORDER BY 
          CASE stage
            WHEN 'lead' THEN 1
            WHEN 'prospect' THEN 2
            WHEN 'opportunity' THEN 3
            WHEN 'proposal' THEN 4
            WHEN 'negotiation' THEN 5
            WHEN 'won' THEN 6
            WHEN 'lost' THEN 7
            ELSE 8
          END
      `;

      const conversionResult = await this.db.query(conversionQuery);
      analytics.conversionRates = conversionResult.rows.map(row => ({
        stage: row.stage as PipelineStage,
        count: parseInt(row.count),
        conversionRate: parseFloat(row.conversion_rate) || 0,
        avgDuration: parseFloat(row.avg_duration) || 0
      }));

      // Get resource demand forecast
      analytics.resourceDemandForecast = await this.getResourceDemandForecast();

      // Get win/loss analysis
      analytics.winLossAnalysis = await this.getWinLossAnalysis();

      // Get pipeline trends
      analytics.trends = await this.getPipelineTrends();

      return analytics;
    } catch (error) {
      console.error('Error fetching pipeline analytics:', error);
      throw new ApiError(500, 'Failed to fetch pipeline analytics');
    }
  }

  private async getResourceDemandForecast(): Promise<ResourceDemandForecast[]> {
    const query = `
      WITH monthly_demand AS (
        SELECT 
          TO_CHAR(DATE_TRUNC('month', prd.start_date), 'YYYY-MM') as period,
          prd.skill_category,
          prd.experience_level,
          SUM(prd.required_count * prd.allocation_percentage * 40 * 4.33 / 100) as demand_hours
        FROM pipeline_resource_demands prd
        JOIN pipeline_projects pp ON prd.pipeline_project_id = pp.id
        WHERE pp.stage NOT IN ('won', 'lost') 
          AND pp.probability >= 50
        GROUP BY period, prd.skill_category, prd.experience_level
      ),
      supply_data AS (
        SELECT 
          'current' as period,
          UNNEST(skills) as skill_category,
          experience_level,
          COUNT(*) * 40 * 4.33 as supply_hours
        FROM employees
        WHERE is_active = true
        GROUP BY skill_category, experience_level
      )
      SELECT 
        md.period,
        md.skill_category,
        md.experience_level,
        md.demand_hours,
        COALESCE(sd.supply_hours, 0) as supply_hours,
        (md.demand_hours - COALESCE(sd.supply_hours, 0)) as gap_hours,
        CASE 
          WHEN COALESCE(sd.supply_hours, 0) > 0 
          THEN (md.demand_hours / sd.supply_hours * 100)
          ELSE 100
        END as utilization_rate,
        GREATEST(0, CEIL((md.demand_hours - COALESCE(sd.supply_hours, 0)) / (40 * 4.33))) as hiring_recommendation,
        CASE 
          WHEN md.demand_hours <= COALESCE(sd.supply_hours, 0) * 0.8 THEN 90
          WHEN md.demand_hours <= COALESCE(sd.supply_hours, 0) THEN 75
          WHEN md.demand_hours <= COALESCE(sd.supply_hours, 0) * 1.2 THEN 60
          ELSE 40
        END as confidence
      FROM monthly_demand md
      LEFT JOIN supply_data sd ON (
        md.skill_category = sd.skill_category 
        AND md.experience_level = sd.experience_level
      )
      ORDER BY md.period, md.skill_category, md.experience_level
    `;

    const result = await this.db.query(query);
    return result.rows.map(row => ({
      period: row.period,
      skillCategory: row.skill_category,
      experienceLevel: row.experience_level,
      demandHours: parseFloat(row.demand_hours) || 0,
      supplyHours: parseFloat(row.supply_hours) || 0,
      gapHours: parseFloat(row.gap_hours) || 0,
      utilizationRate: parseFloat(row.utilization_rate) || 0,
      hiringRecommendation: parseInt(row.hiring_recommendation) || 0,
      confidence: parseFloat(row.confidence) || 0
    }));
  }

  private async getWinLossAnalysis(): Promise<WinLossAnalysis> {
    const query = `
      SELECT 
        COUNT(*) as total_opportunities,
        COUNT(*) FILTER (WHERE stage = 'won') as won_count,
        COUNT(*) FILTER (WHERE stage = 'lost') as lost_count,
        AVG(estimated_value) FILTER (WHERE stage = 'won') as avg_deal_size,
        AVG(
          EXTRACT(epoch FROM (updated_at - created_at)) / 86400
        ) FILTER (WHERE stage IN ('won', 'lost')) as avg_sales_cycle
      FROM pipeline_projects
      WHERE stage IN ('won', 'lost')
    `;

    const result = await this.db.query(query);
    const data = result.rows[0];

    const totalOpportunities = parseInt(data.total_opportunities) || 0;
    const wonCount = parseInt(data.won_count) || 0;
    const lostCount = parseInt(data.lost_count) || 0;

    return {
      totalOpportunities,
      wonCount,
      lostCount,
      winRate: totalOpportunities > 0 ? (wonCount / totalOpportunities) * 100 : 0,
      avgDealSize: parseFloat(data.avg_deal_size) || 0,
      avgSalesCycle: parseFloat(data.avg_sales_cycle) || 0,
      lossReasons: [], // Would be populated from actual data
      competitorAnalysis: [] // Would be populated from competitor data
    };
  }

  private async getPipelineTrends(): Promise<PipelineTrend[]> {
    const query = `
      SELECT 
        TO_CHAR(DATE_TRUNC('month', created_at), 'YYYY-MM') as period,
        COUNT(*) FILTER (WHERE created_at >= DATE_TRUNC('month', created_at)) as new_opportunities,
        COUNT(*) FILTER (WHERE stage = 'won' AND updated_at >= DATE_TRUNC('month', updated_at)) as closed_won,
        COUNT(*) FILTER (WHERE stage = 'lost' AND updated_at >= DATE_TRUNC('month', updated_at)) as closed_lost,
        SUM(estimated_value) as total_value,
        AVG(probability) as avg_probability
      FROM pipeline_projects
      WHERE created_at >= NOW() - INTERVAL '12 months'
      GROUP BY period
      ORDER BY period
    `;

    const result = await this.db.query(query);
    return result.rows.map(row => {
      const newOpps = parseInt(row.new_opportunities) || 0;
      const won = parseInt(row.closed_won) || 0;
      const lost = parseInt(row.closed_lost) || 0;
      const total = won + lost;

      return {
        period: row.period,
        newOpportunities: newOpps,
        closedWon: won,
        closedLost: lost,
        totalValue: parseFloat(row.total_value) || 0,
        avgProbability: parseFloat(row.avg_probability) || 0,
        conversionRate: total > 0 ? (won / total) * 100 : 0
      };
    });
  }

  // Transform database rows to domain objects
  private transformPipelineProject(row: any): PipelineProject {
    return {
      id: row.id,
      crmId: row.crm_id,
      crmSource: row.crm_source,
      name: row.name,
      description: row.description,
      clientName: row.client_name,
      clientContact: row.client_contact || undefined,
      stage: row.stage,
      priority: row.priority,
      probability: parseFloat(row.probability),
      estimatedValue: parseFloat(row.estimated_value),
      estimatedStartDate: row.estimated_start_date,
      estimatedDuration: parseInt(row.estimated_duration),
      requiredSkills: row.required_skills || [],
      resourceDemand: row.resource_demand || [],
      competitorInfo: row.competitor_info || [],
      riskFactors: row.risk_factors || [],
      notes: row.notes,
      tags: row.tags || [],
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      lastSyncAt: row.last_sync_at,
      syncStatus: row.sync_status || 'pending',
      estimatedEndDate: row.estimated_end_date,
      weightedValue: parseFloat(row.weighted_value) || 0,
      resourceCost: parseFloat(row.resource_cost) || 0,
      availabilityScore: parseFloat(row.availability_score) || 0
    };
  }

  private transformPipelineProjectSummary(row: any): PipelineProject {
    return {
      id: row.id,
      crmId: row.crm_id,
      crmSource: row.crm_source,
      name: row.name,
      description: row.description,
      clientName: row.client_name,
      clientContact: row.client_contact || undefined,
      stage: row.stage,
      priority: row.priority,
      probability: parseFloat(row.probability),
      estimatedValue: parseFloat(row.estimated_value),
      estimatedStartDate: row.estimated_start_date,
      estimatedDuration: parseInt(row.estimated_duration),
      requiredSkills: row.required_skills || [],
      resourceDemand: [],
      competitorInfo: [],
      riskFactors: row.risk_factors || [],
      notes: row.notes,
      tags: row.tags || [],
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      lastSyncAt: row.last_sync_at,
      syncStatus: row.sync_status || 'pending',
      estimatedEndDate: row.estimated_end_date,
      weightedValue: parseFloat(row.weighted_value) || 0,
      resourceCost: parseFloat(row.resource_cost) || 0,
      availabilityScore: parseFloat(row.availability_score) || 0
    };
  }
}