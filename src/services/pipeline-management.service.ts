import { DatabaseService } from '../database/database.service';
import { 
  PipelineProject, 
  CreatePipelineProjectRequest, 
  UpdatePipelineProjectRequest,
  PipelineFilters,
  PipelineAnalytics
} from '../types/pipeline';

export class PipelineManagementService {
  private db: DatabaseService;

  constructor() {
    this.db = DatabaseService.getInstance();
  }

  async createPipelineProject(data: CreatePipelineProjectRequest): Promise<PipelineProject> {
    const project = {
      ...data,
      syncStatus: 'pending' as const,
      riskFactors: data.riskFactors || [],
      tags: data.tags || []
    };

    const query = `
      INSERT INTO pipeline_projects 
      (name, description, client_name, client_contact, stage, priority, probability, 
       estimated_value, estimated_start_date, estimated_duration, required_skills, 
       resource_demand, competitor_info, risk_factors, notes, tags, sync_status)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
      RETURNING *
    `;

    const values = [
      project.name,
      project.description,
      project.clientName,
      JSON.stringify(project.clientContact),
      project.stage,
      project.priority,
      project.probability,
      project.estimatedValue,
      project.estimatedStartDate,
      project.estimatedDuration,
      JSON.stringify(project.requiredSkills),
      JSON.stringify(project.resourceDemand),
      JSON.stringify(project.competitorInfo),
      JSON.stringify(project.riskFactors),
      project.notes,
      JSON.stringify(project.tags),
      project.syncStatus
    ];

    const result = await this.db.query(query, values);
    return this.mapRowToPipelineProject(result.rows[0]);
  }

  async getPipelineProjects(filters: PipelineFilters): Promise<{ projects: PipelineProject[]; total: number }> {
    let query = 'SELECT * FROM pipeline_projects WHERE 1=1';
    const values: any[] = [];
    let paramIndex = 1;

    if (filters.stage) {
      if (Array.isArray(filters.stage)) {
        query += ` AND stage = ANY($${paramIndex})`;
        values.push(filters.stage);
      } else {
        query += ` AND stage = $${paramIndex}`;
        values.push(filters.stage);
      }
      paramIndex++;
    }

    if (filters.priority) {
      if (Array.isArray(filters.priority)) {
        query += ` AND priority = ANY($${paramIndex})`;
        values.push(filters.priority);
      } else {
        query += ` AND priority = $${paramIndex}`;
        values.push(filters.priority);
      }
      paramIndex++;
    }

    if (filters.clientName) {
      query += ` AND LOWER(client_name) ILIKE LOWER($${paramIndex})`;
      values.push(`%${filters.clientName}%`);
      paramIndex++;
    }

    if (filters.search) {
      query += ` AND (LOWER(name) ILIKE LOWER($${paramIndex}) OR LOWER(description) ILIKE LOWER($${paramIndex}))`;
      values.push(`%${filters.search}%`);
      paramIndex++;
    }

    query += ' ORDER BY created_at DESC';

    const result = await this.db.query(query, values);
    const projects = result.rows.map(row => this.mapRowToPipelineProject(row));

    return {
      projects,
      total: projects.length
    };
  }

  async getPipelineProject(id: string): Promise<PipelineProject | null> {
    const query = 'SELECT * FROM pipeline_projects WHERE id = $1';
    const result = await this.db.query(query, [id]);
    
    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRowToPipelineProject(result.rows[0]);
  }

  async updatePipelineProject(id: string, updateData: Partial<CreatePipelineProjectRequest>): Promise<PipelineProject> {
    
    const setClauses: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    Object.entries(updateData).forEach(([key, value]) => {
      if (value !== undefined) {
        const columnName = this.camelToSnake(key);
        setClauses.push(`${columnName} = $${paramIndex}`);
        
        if (typeof value === 'object') {
          values.push(JSON.stringify(value));
        } else {
          values.push(value);
        }
        paramIndex++;
      }
    });

    setClauses.push(`updated_at = NOW()`);

    const query = `
      UPDATE pipeline_projects 
      SET ${setClauses.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `;

    values.push(id);
    const result = await this.db.query(query, values);
    
    if (result.rows.length === 0) {
      throw new Error('Pipeline project not found');
    }

    return this.mapRowToPipelineProject(result.rows[0]);
  }

  async deletePipelineProject(id: string): Promise<void> {
    const query = 'DELETE FROM pipeline_projects WHERE id = $1';
    const result = await this.db.query(query, [id]);
    
    if (result.rowCount === 0) {
      throw new Error('Pipeline project not found');
    }
  }

  async getPipelineAnalytics(filters: Partial<PipelineFilters>): Promise<PipelineAnalytics & { averageProbability: number; projectsByStage: Record<string, number>; winRate: number; averageCycleTime: number; topClients: Array<{ name: string; value: number; count: number }> }> {
    // This is a simplified implementation - in production would be more complex
    const projects = await this.getPipelineProjects(filters);

    const totalValue = projects.projects.reduce((sum, p) => sum + p.estimatedValue, 0);
    const weightedValue = projects.projects.reduce((sum, p) => sum + (p.estimatedValue * p.probability / 100), 0);
    const averageProbability = projects.projects.length > 0
      ? projects.projects.reduce((sum, p) => sum + p.probability, 0) / projects.projects.length / 100
      : 0;

    // Calculate projects by stage
    const projectsByStage = projects.projects.reduce((acc, p) => {
      acc[p.stage] = (acc[p.stage] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Calculate win rate
    const wonCount = projects.projects.filter(p => p.stage === 'won').length;
    const lostCount = projects.projects.filter(p => p.stage === 'lost').length;
    const winRate = (wonCount + lostCount) > 0 ? wonCount / (wonCount + lostCount) : 0;

    // Calculate top clients
    const clientData = projects.projects.reduce((acc, p) => {
      if (!acc[p.clientName]) {
        acc[p.clientName] = { value: 0, count: 0 };
      }
      acc[p.clientName].value += p.estimatedValue;
      acc[p.clientName].count += 1;
      return acc;
    }, {} as Record<string, { value: number; count: number }>);

    const topClients = Object.entries(clientData)
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);

    return {
      totalValue,
      weightedValue,
      averageProbability,
      projectsByStage,
      winRate,
      averageCycleTime: 30, // Mock average cycle time in days
      topClients,
      conversionRates: [],
      forecastAccuracy: [],
      resourceDemandForecast: [],
      capacityUtilization: [],
      winLossAnalysis: {
        totalOpportunities: projects.total,
        wonCount,
        lostCount,
        winRate,
        avgDealSize: totalValue / projects.total || 0,
        avgSalesCycle: 30,
        lossReasons: [],
        competitorAnalysis: []
      },
      trends: []
    };
  }

  private mapRowToPipelineProject(row: any): PipelineProject {
    const safeJsonParse = (value: any, fallback: any = null) => {
      if (!value) return fallback;
      if (typeof value === 'object') return value;
      if (typeof value === 'string') {
        if (value === '[object Object]') return fallback;
        try {
          return JSON.parse(value);
        } catch {
          return fallback;
        }
      }
      return fallback;
    };

    return {
      id: String(row.id), // Convert to string to match interface
      crmId: row.crm_id,
      crmSource: row.crm_source,
      name: row.name,
      description: row.description,
      clientName: row.client_name,
      clientContact: safeJsonParse(row.client_contact, undefined),
      stage: row.stage,
      priority: row.priority,
      probability: row.probability,
      estimatedValue: parseFloat(row.estimated_value || 0),
      estimatedStartDate: row.estimated_start_date,
      estimatedDuration: row.estimated_duration,
      requiredSkills: safeJsonParse(row.required_skills, []),
      resourceDemand: safeJsonParse(row.resource_demand, []),
      competitorInfo: safeJsonParse(row.competitor_info, []),
      riskFactors: safeJsonParse(row.risk_factors, []),
      notes: row.notes,
      tags: safeJsonParse(row.tags, []),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      lastSyncAt: row.last_sync_at,
      syncStatus: row.sync_status,
      estimatedEndDate: row.estimated_end_date,
      weightedValue: parseFloat(row.weighted_value || 0),
      resourceCost: parseFloat(row.resource_cost || 0),
      availabilityScore: parseFloat(row.availability_score || 0)
    };
  }

  async getWinLossRates(filters?: Partial<PipelineFilters>): Promise<{ winRate: number; lossRate: number; totalDeals: number }> {
    const projects = await this.getPipelineProjects(filters || {});
    const wonCount = projects.projects.filter(p => p.stage === 'won').length;
    const lostCount = projects.projects.filter(p => p.stage === 'lost').length;
    const totalDeals = wonCount + lostCount;

    return {
      winRate: totalDeals > 0 ? wonCount / totalDeals : 0,
      lossRate: totalDeals > 0 ? lostCount / totalDeals : 0,
      totalDeals
    };
  }

  async getPipelineHistory(startDate: Date, endDate: Date): Promise<Array<{ date: Date; stage: string; count: number; value: number }>> {
    // Mock implementation - in real application would query historical data
    const projects = await this.getPipelineProjects({});

    return projects.projects.map(p => ({
      date: new Date(p.createdAt),
      stage: p.stage,
      count: 1,
      value: p.estimatedValue
    })).filter(entry => {
      return entry.date >= startDate && entry.date <= endDate;
    });
  }

  async getPipelineMetrics(): Promise<{
    totalProjects: number;
    totalValue: number;
    avgProbability: number;
    stageDistribution: Record<string, number>;
  }> {
    const projects = await this.getPipelineProjects({});
    const avgProbability = projects.projects.length > 0
      ? projects.projects.reduce((sum, p) => sum + p.probability, 0) / projects.projects.length
      : 0;

    const stageDistribution = projects.projects.reduce((acc, p) => {
      acc[p.stage] = (acc[p.stage] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      totalProjects: projects.total,
      totalValue: projects.projects.reduce((sum, p) => sum + p.estimatedValue, 0),
      avgProbability,
      stageDistribution
    };
  }

  private camelToSnake(str: string): string {
    return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
  }
}