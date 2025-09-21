/**
 * Data Integration Service for Capacity Forecasting
 * 
 * Connects to real allocation APIs, processes historical data,
 * and prepares training datasets for forecasting models.
 */

import { TimeSeriesData, ForecastResult, forecastingService } from './forecasting.service';
import { ProjectDemandProfile, DemandForecast, demandPredictor } from './demand-predictor';

export interface AllocationData {
  id: string;
  employeeId: string;
  projectId: string;
  startDate: string;
  endDate: string;
  allocation: number; // percentage (0-100)
  skills: string[];
  role: string;
}

export interface ProjectData {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  status: 'active' | 'completed' | 'planned';
  teamSize: number;
  budget?: number;
  projectType: string;
  phases?: Array<{
    name: string;
    startDate: string;
    endDate: string;
  }>;
}

export interface EmployeeData {
  id: string;
  name: string;
  skills: string[];
  role: string;
  maxAllocation: number; // percentage (typically 100)
}

export interface ForecastData {
  historical: {
    allocations: TimeSeriesData[];
    utilization: TimeSeriesData[];
    demandBySkill: Record<string, TimeSeriesData[]>;
  };
  predictions: {
    capacityForecast: ForecastResult;
    demandForecast: DemandForecast;
  };
  insights: {
    trendAnalysis: string[];
    skillBottlenecks: string[];
    recommendations: string[];
  };
}

export class DataIntegrationService {
  private readonly API_BASE_URL = 'http://localhost:3001/api';
  private readonly CACHE_DURATION_MS = 5 * 60 * 1000; // 5 minutes
  private cache = new Map<string, { data: any; timestamp: number }>();

  /**
   * Fetch all historical allocations from API
   */
  async fetchHistoricalAllocations(
    startDate?: string,
    endDate?: string
  ): Promise<AllocationData[]> {
    const cacheKey = `allocations-${startDate || 'all'}-${endDate || 'all'}`;
    
    if (this.isCached(cacheKey)) {
      return this.getFromCache(cacheKey);
    }

    try {
      const url = new URL(`${this.API_BASE_URL}/allocations`);
      if (startDate) url.searchParams.set('startDate', startDate);
      if (endDate) url.searchParams.set('endDate', endDate);

      const response = await fetch(url.toString());
      if (!response.ok) {
        throw new Error(`Failed to fetch allocations: ${response.statusText}`);
      }

      const allocations: AllocationData[] = await response.json();
      this.setCache(cacheKey, allocations);
      return allocations;
    } catch (error) {
      console.error('Error fetching historical allocations:', error);
      // Return empty array instead of sample data
      return [];
    }
  }

  /**
   * Fetch project data from API
   */
  async fetchProjects(): Promise<ProjectData[]> {
    const cacheKey = 'projects';
    
    if (this.isCached(cacheKey)) {
      return this.getFromCache(cacheKey);
    }

    try {
      const response = await fetch(`${this.API_BASE_URL}/projects`);
      if (!response.ok) {
        throw new Error(`Failed to fetch projects: ${response.statusText}`);
      }

      const projects: ProjectData[] = await response.json();
      this.setCache(cacheKey, projects);
      return projects;
    } catch (error) {
      console.error('Error fetching projects:', error);
      // Return empty array instead of sample data
      return [];
    }
  }

  /**
   * Fetch employee data from API
   */
  async fetchEmployees(): Promise<EmployeeData[]> {
    const cacheKey = 'employees';
    
    if (this.isCached(cacheKey)) {
      return this.getFromCache(cacheKey);
    }

    try {
      const response = await fetch(`${this.API_BASE_URL}/employees`);
      if (!response.ok) {
        throw new Error(`Failed to fetch employees: ${response.statusText}`);
      }

      const employees: EmployeeData[] = await response.json();
      this.setCache(cacheKey, employees);
      return employees;
    } catch (error) {
      console.error('Error fetching employees:', error);
      // Return empty array instead of sample data
      return [];
    }
  }

  /**
   * Process historical allocations into time series data
   */
  processAllocationHistory(allocations: AllocationData[]): {
    totalUtilization: TimeSeriesData[];
    skillUtilization: Record<string, TimeSeriesData[]>;
    projectDemand: TimeSeriesData[];
  } {
    // Group allocations by date
    const dateGroups: Record<string, AllocationData[]> = {};
    
    allocations.forEach(allocation => {
      const startDate = new Date(allocation.startDate);
      const endDate = new Date(allocation.endDate);
      
      // Create daily entries for the allocation period
      for (let date = new Date(startDate); date <= endDate; date.setDate(date.getDate() + 1)) {
        const dateKey = date.toISOString().split('T')[0];
        if (!dateGroups[dateKey]) {
          dateGroups[dateKey] = [];
        }
        dateGroups[dateKey].push(allocation);
      }
    });

    // Process total utilization
    const totalUtilization: TimeSeriesData[] = Object.entries(dateGroups)
      .map(([date, allocs]) => ({
        date,
        value: allocs.reduce((sum, a) => sum + (a.allocation / 100), 0),
        category: 'total_utilization'
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Process skill utilization
    const skillUtilization: Record<string, TimeSeriesData[]> = {};
    Object.entries(dateGroups).forEach(([date, allocs]) => {
      allocs.forEach(allocation => {
        allocation.skills.forEach(skill => {
          if (!skillUtilization[skill]) {
            skillUtilization[skill] = [];
          }
          
          const existingEntry = skillUtilization[skill].find(entry => entry.date === date);
          if (existingEntry) {
            existingEntry.value += allocation.allocation / 100;
          } else {
            skillUtilization[skill].push({
              date,
              value: allocation.allocation / 100,
              category: `skill_${skill}`
            });
          }
        });
      });
    });

    // Sort skill utilization data
    Object.keys(skillUtilization).forEach(skill => {
      skillUtilization[skill].sort((a, b) => a.date.localeCompare(b.date));
    });

    // Process project demand (simplified)
    const projectDemand: TimeSeriesData[] = Object.entries(dateGroups)
      .map(([date, allocs]) => {
        const uniqueProjects = new Set(allocs.map(a => a.projectId));
        return {
          date,
          value: uniqueProjects.size,
          category: 'project_count'
        };
      })
      .sort((a, b) => a.date.localeCompare(b.date));

    return {
      totalUtilization,
      skillUtilization,
      projectDemand
    };
  }

  /**
   * Convert projects to demand profiles for forecasting
   */
  convertProjectsToDemandProfiles(
    projects: ProjectData[],
    employees: EmployeeData[]
  ): ProjectDemandProfile[] {
    return projects.map(project => {
      // Generate phases if not provided
      const phases = project.phases && project.phases.length > 0
        ? this.convertProjectPhasesToDemandPhases(project.phases, project.teamSize, employees)
        : demandPredictor.generateProjectTemplate(
            project.projectType || 'software_development',
            {
              duration: this.calculateProjectDuration(project.startDate, project.endDate),
              teamSize: project.teamSize
            }
          );

      return {
        projectId: project.id,
        projectName: project.name,
        phases,
        totalDuration: this.calculateProjectDuration(project.startDate, project.endDate),
        peakTeamSize: Math.max(...phases.map(p => p.expectedTeamSize)),
        averageUtilization: phases.reduce((sum, p) => sum + p.utilizationRate, 0) / phases.length
      };
    });
  }

  /**
   * Generate comprehensive forecast data
   */
  async generateForecastData(forecastDays: number = 60): Promise<ForecastData> {
    // Fetch all required data
    const [allocations, projects, employees] = await Promise.all([
      this.fetchHistoricalAllocations(),
      this.fetchProjects(),
      this.fetchEmployees()
    ]);

    // Process historical data
    const historicalData = this.processAllocationHistory(allocations);

    // Generate capacity forecast
    const capacityForecast = await forecastingService.generateForecast(
      historicalData.totalUtilization,
      forecastDays
    );

    // Convert projects to demand profiles and generate demand forecast
    const demandProfiles = this.convertProjectsToDemandProfiles(projects, employees);
    const demandForecast = demandPredictor.generateDemandForecast(demandProfiles, forecastDays);

    // Generate insights
    const insights = this.generateInsights(
      historicalData,
      capacityForecast,
      demandForecast,
      employees
    );

    return {
      historical: {
        allocations: historicalData.totalUtilization,
        utilization: historicalData.totalUtilization,
        demandBySkill: historicalData.skillUtilization
      },
      predictions: {
        capacityForecast,
        demandForecast
      },
      insights
    };
  }

  /**
   * Generate insights and recommendations
   */
  private generateInsights(
    historical: { totalUtilization: TimeSeriesData[]; skillUtilization: Record<string, TimeSeriesData[]> },
    capacityForecast: ForecastResult,
    demandForecast: DemandForecast,
    employees: EmployeeData[]
  ): { trendAnalysis: string[]; skillBottlenecks: string[]; recommendations: string[] } {
    const insights: { trendAnalysis: string[]; skillBottlenecks: string[]; recommendations: string[] } = {
      trendAnalysis: [],
      skillBottlenecks: [],
      recommendations: []
    };

    // Trend analysis
    const trendDirection = capacityForecast.metadata.trendDirection;
    insights.trendAnalysis.push(`Overall capacity trend is ${trendDirection}`);
    
    if (capacityForecast.metadata.seasonality) {
      insights.trendAnalysis.push('Seasonal patterns detected in historical data');
    }

    const avgPredicted = capacityForecast.predictions.reduce((sum, p) => sum + p.predicted, 0) / capacityForecast.predictions.length;
    const lastHistorical = historical.totalUtilization[historical.totalUtilization.length - 1]?.value || 0;
    
    if (avgPredicted > lastHistorical * 1.2) {
      insights.trendAnalysis.push('Significant capacity increase predicted');
    } else if (avgPredicted < lastHistorical * 0.8) {
      insights.trendAnalysis.push('Capacity decrease expected');
    }

    // Skill bottlenecks
    demandForecast.skillBottlenecks.forEach(bottleneck => {
      insights.skillBottlenecks.push(
        `${bottleneck.skill} shortage expected on ${bottleneck.peakDate} (demand: ${bottleneck.demandValue.toFixed(1)})`
      );
    });

    // Recommendations
    if (demandForecast.peakDemand.value > avgPredicted * 1.5) {
      insights.recommendations.push(
        `Consider hiring additional resources for ${demandForecast.peakDemand.date} peak demand`
      );
    }

    if (demandForecast.skillBottlenecks.length > 0) {
      const topBottleneck = demandForecast.skillBottlenecks[0];
      insights.recommendations.push(
        `Prioritize ${topBottleneck.skill} skill development or hiring`
      );
    }

    if (capacityForecast.metadata.confidence < 0.7) {
      insights.recommendations.push('Low forecast confidence - consider collecting more historical data');
    }

    // Project-specific recommendations
    if (demandForecast.peakDemand.projects.length > 3) {
      insights.recommendations.push(
        `Consider staggering project schedules to reduce peak demand on ${demandForecast.peakDemand.date}`
      );
    }

    return insights;
  }

  /**
   * Convert project phases to demand phases
   */
  private convertProjectPhasesToDemandPhases(
    phases: Array<{ name: string; startDate: string; endDate: string }>,
    teamSize: number,
    employees: EmployeeData[]
  ) {
    return phases.map(phase => ({
      name: phase.name,
      startDate: phase.startDate,
      endDate: phase.endDate,
      expectedTeamSize: teamSize,
      skillRequirements: this.inferSkillsFromTeam(employees, teamSize),
      utilizationRate: 0.8 // Default utilization rate
    }));
  }

  /**
   * Infer skills from employee team composition
   */
  private inferSkillsFromTeam(employees: EmployeeData[], teamSize: number): string[] {
    // Get most common skills from employee base
    const skillCounts: Record<string, number> = {};
    employees.forEach(emp => {
      emp.skills.forEach(skill => {
        skillCounts[skill] = (skillCounts[skill] || 0) + 1;
      });
    });

    // Return top skills up to reasonable number for team
    return Object.entries(skillCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, Math.min(5, teamSize))
      .map(([skill]) => skill);
  }

  /**
   * Calculate project duration in days
   */
  private calculateProjectDuration(startDate: string, endDate: string): number {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  /**
   * Cache management
   */
  private isCached(key: string): boolean {
    const cached = this.cache.get(key);
    return cached ? (Date.now() - cached.timestamp) < this.CACHE_DURATION_MS : false;
  }

  private getFromCache<T>(key: string): T {
    return this.cache.get(key)!.data as T;
  }

  private setCache(key: string, data: any): void {
    this.cache.set(key, { data, timestamp: Date.now() });
  }

}

export const dataIntegrationService = new DataIntegrationService();