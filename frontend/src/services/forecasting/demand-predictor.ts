import { TimeSeriesData } from './forecasting.service';

export interface ProjectPhase {
  name: string;
  startDate: string;
  endDate: string;
  expectedTeamSize: number;
  skillRequirements: string[];
  utilizationRate: number; // 0-1
}

export interface ProjectDemandProfile {
  projectId: string;
  projectName: string;
  phases: ProjectPhase[];
  totalDuration: number; // days
  peakTeamSize: number;
  averageUtilization: number;
}

export interface DemandCurve {
  date: string;
  totalDemand: number;
  skillDemand: Record<string, number>;
  projectBreakdown: Record<string, number>;
  utilizationRate: number;
}

export interface DemandForecast {
  curves: DemandCurve[];
  peakDemand: {
    date: string;
    value: number;
    projects: string[];
  };
  averageDemand: number;
  skillBottlenecks: Array<{
    skill: string;
    peakDate: string;
    demandValue: number;
    currentCapacity?: number;
  }>;
}

export class DemandPredictor {
  private readonly PHASE_TEMPLATES: Record<string, Partial<ProjectPhase>[]> = {
    software_development: [
      {
        name: 'Planning',
        expectedTeamSize: 3,
        utilizationRate: 0.6,
        skillRequirements: ['product_manager', 'architect', 'analyst']
      },
      {
        name: 'Design',
        expectedTeamSize: 4,
        utilizationRate: 0.7,
        skillRequirements: ['architect', 'ui_designer', 'frontend_dev']
      },
      {
        name: 'Implementation',
        expectedTeamSize: 8,
        utilizationRate: 0.9,
        skillRequirements: ['frontend_dev', 'backend_dev', 'qa_engineer']
      },
      {
        name: 'Testing',
        expectedTeamSize: 5,
        utilizationRate: 0.8,
        skillRequirements: ['qa_engineer', 'backend_dev', 'devops']
      },
      {
        name: 'Deployment',
        expectedTeamSize: 3,
        utilizationRate: 0.7,
        skillRequirements: ['devops', 'backend_dev', 'qa_engineer']
      }
    ],
    data_analytics: [
      {
        name: 'Discovery',
        expectedTeamSize: 2,
        utilizationRate: 0.5,
        skillRequirements: ['data_analyst', 'domain_expert']
      },
      {
        name: 'Data Collection',
        expectedTeamSize: 3,
        utilizationRate: 0.8,
        skillRequirements: ['data_engineer', 'backend_dev']
      },
      {
        name: 'Analysis',
        expectedTeamSize: 4,
        utilizationRate: 0.9,
        skillRequirements: ['data_scientist', 'data_analyst', 'statistician']
      },
      {
        name: 'Visualization',
        expectedTeamSize: 3,
        utilizationRate: 0.7,
        skillRequirements: ['data_analyst', 'frontend_dev', 'ui_designer']
      }
    ]
  };

  /**
   * Generate demand forecast from project pipeline
   */
  generateDemandForecast(
    projects: ProjectDemandProfile[],
    forecastDays: number = 90
  ): DemandForecast {
    const startDate = new Date();
    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + forecastDays);

    const curves: DemandCurve[] = [];
    const skillDemandAccumulator: Record<string, Array<{ date: string; value: number }>> = {};

    // Generate daily demand curves
    for (let d = 0; d < forecastDays; d++) {
      const currentDate = new Date(startDate);
      currentDate.setDate(startDate.getDate() + d);
      const dateStr = currentDate.toISOString().split('T')[0];

      const dailyDemand = this.calculateDailyDemand(projects, currentDate);
      curves.push(dailyDemand);

      // Accumulate skill demand for bottleneck analysis
      Object.entries(dailyDemand.skillDemand).forEach(([skill, demand]) => {
        if (!skillDemandAccumulator[skill]) {
          skillDemandAccumulator[skill] = [];
        }
        skillDemandAccumulator[skill].push({ date: dateStr, value: demand });
      });
    }

    // Calculate peak demand
    const peakDemand = this.findPeakDemand(curves);

    // Calculate average demand
    const averageDemand = curves.reduce((acc, curve) => acc + curve.totalDemand, 0) / curves.length;

    // Identify skill bottlenecks
    const skillBottlenecks = this.identifySkillBottlenecks(skillDemandAccumulator);

    return {
      curves,
      peakDemand,
      averageDemand,
      skillBottlenecks
    };
  }

  /**
   * Analyze historical project patterns
   */
  analyzeHistoricalPatterns(
    historicalProjects: Array<{
      projectType: string;
      actualPhases: ProjectPhase[];
      completedDate: string;
    }>
  ): {
    phasePatterns: Record<string, {
      averageDuration: number;
      averageTeamSize: number;
      averageUtilization: number;
      skillFrequency: Record<string, number>;
    }>;
    projectTypePatterns: Record<string, {
      totalDuration: number;
      peakTeamSize: number;
      phaseCount: number;
      skillDistribution: Record<string, number>;
    }>;
  } {
    const phasePatterns: Record<string, any> = {};
    const projectTypePatterns: Record<string, any> = {};

    // Analyze phase patterns
    historicalProjects.forEach(project => {
      project.actualPhases.forEach(phase => {
        if (!phasePatterns[phase.name]) {
          phasePatterns[phase.name] = {
            durations: [],
            teamSizes: [],
            utilizations: [],
            skills: {}
          };
        }

        const duration = this.calculateDaysBetween(phase.startDate, phase.endDate);
        phasePatterns[phase.name].durations.push(duration);
        phasePatterns[phase.name].teamSizes.push(phase.expectedTeamSize);
        phasePatterns[phase.name].utilizations.push(phase.utilizationRate);

        phase.skillRequirements.forEach(skill => {
          phasePatterns[phase.name].skills[skill] = 
            (phasePatterns[phase.name].skills[skill] || 0) + 1;
        });
      });

      // Analyze project type patterns
      if (!projectTypePatterns[project.projectType]) {
        projectTypePatterns[project.projectType] = {
          totalDurations: [],
          peakTeamSizes: [],
          phaseCounts: [],
          skillDistributions: {}
        };
      }

      const totalDuration = project.actualPhases.reduce((acc, phase) => 
        acc + this.calculateDaysBetween(phase.startDate, phase.endDate), 0
      );
      const peakTeamSize = Math.max(...project.actualPhases.map(p => p.expectedTeamSize));

      projectTypePatterns[project.projectType].totalDurations.push(totalDuration);
      projectTypePatterns[project.projectType].peakTeamSizes.push(peakTeamSize);
      projectTypePatterns[project.projectType].phaseCounts.push(project.actualPhases.length);

      // Aggregate skill usage
      project.actualPhases.forEach(phase => {
        phase.skillRequirements.forEach(skill => {
          if (!projectTypePatterns[project.projectType].skillDistributions[skill]) {
            projectTypePatterns[project.projectType].skillDistributions[skill] = 0;
          }
          projectTypePatterns[project.projectType].skillDistributions[skill]++;
        });
      });
    });

    // Calculate averages for phases
    const finalPhasePatterns: Record<string, any> = {};
    Object.entries(phasePatterns).forEach(([phaseName, data]: [string, any]) => {
      finalPhasePatterns[phaseName] = {
        averageDuration: data.durations.reduce((a: number, b: number) => a + b, 0) / data.durations.length,
        averageTeamSize: data.teamSizes.reduce((a: number, b: number) => a + b, 0) / data.teamSizes.length,
        averageUtilization: data.utilizations.reduce((a: number, b: number) => a + b, 0) / data.utilizations.length,
        skillFrequency: data.skills
      };
    });

    // Calculate averages for project types
    const finalProjectTypePatterns: Record<string, any> = {};
    Object.entries(projectTypePatterns).forEach(([projectType, data]: [string, any]) => {
      finalProjectTypePatterns[projectType] = {
        totalDuration: data.totalDurations.reduce((a: number, b: number) => a + b, 0) / data.totalDurations.length,
        peakTeamSize: data.peakTeamSizes.reduce((a: number, b: number) => a + b, 0) / data.peakTeamSizes.length,
        phaseCount: data.phaseCounts.reduce((a: number, b: number) => a + b, 0) / data.phaseCounts.length,
        skillDistribution: data.skillDistributions
      };
    });

    return {
      phasePatterns: finalPhasePatterns,
      projectTypePatterns: finalProjectTypePatterns
    };
  }

  /**
   * Aggregate pipeline demand across multiple projects
   */
  aggregatePipelineDemand(projects: ProjectDemandProfile[]): TimeSeriesData[] {
    const demandMap: Record<string, number> = {};
    
    projects.forEach(project => {
      project.phases.forEach(phase => {
        const startDate = new Date(phase.startDate);
        const endDate = new Date(phase.endDate);
        
        // Distribute demand across phase duration
        const phaseDays = this.calculateDaysBetween(phase.startDate, phase.endDate);
        const dailyDemand = (phase.expectedTeamSize * phase.utilizationRate) / phaseDays;

        for (let d = 0; d < phaseDays; d++) {
          const currentDate = new Date(startDate);
          currentDate.setDate(startDate.getDate() + d);
          const dateKey = currentDate.toISOString().split('T')[0];

          demandMap[dateKey] = (demandMap[dateKey] || 0) + dailyDemand;
        }
      });
    });

    // Convert to TimeSeriesData format
    return Object.entries(demandMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, value]) => ({
        date,
        value,
        category: 'pipeline_demand'
      }));
  }

  /**
   * Generate project template based on type
   */
  generateProjectTemplate(
    projectType: string,
    customization?: {
      duration?: number;
      teamSize?: number;
      skills?: string[];
    }
  ): ProjectPhase[] {
    const template = this.PHASE_TEMPLATES[projectType] || this.PHASE_TEMPLATES.software_development;
    const phases: ProjectPhase[] = [];
    
    let currentDate = new Date();
    const phaseDuration = customization?.duration ? 
      Math.floor(customization.duration / template.length) : 14; // Default 2 weeks per phase

    template.forEach((phaseTemplate, index) => {
      const startDate = new Date(currentDate);
      const endDate = new Date(currentDate);
      endDate.setDate(startDate.getDate() + phaseDuration);

      phases.push({
        name: phaseTemplate.name || `Phase ${index + 1}`,
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0],
        expectedTeamSize: customization?.teamSize || phaseTemplate.expectedTeamSize || 5,
        skillRequirements: customization?.skills || phaseTemplate.skillRequirements || ['developer'],
        utilizationRate: phaseTemplate.utilizationRate || 0.8
      });

      currentDate = new Date(endDate);
      currentDate.setDate(currentDate.getDate() + 1); // Next phase starts next day
    });

    return phases;
  }

  /**
   * Calculate daily demand for a specific date
   */
  private calculateDailyDemand(projects: ProjectDemandProfile[], date: Date): DemandCurve {
    let totalDemand = 0;
    const skillDemand: Record<string, number> = {};
    const projectBreakdown: Record<string, number> = {};
    let totalUtilization = 0;
    let activeProjects = 0;

    projects.forEach(project => {
      let projectDemand = 0;
      let projectUtilization = 0;

      project.phases.forEach(phase => {
        const phaseStart = new Date(phase.startDate);
        const phaseEnd = new Date(phase.endDate);

        if (date >= phaseStart && date <= phaseEnd) {
          const phaseDemand = phase.expectedTeamSize * phase.utilizationRate;
          projectDemand += phaseDemand;
          projectUtilization += phase.utilizationRate;

          // Accumulate skill demand
          phase.skillRequirements.forEach(skill => {
            skillDemand[skill] = (skillDemand[skill] || 0) + 
              (phaseDemand / phase.skillRequirements.length);
          });
        }
      });

      if (projectDemand > 0) {
        totalDemand += projectDemand;
        projectBreakdown[project.projectName] = projectDemand;
        totalUtilization += projectUtilization;
        activeProjects++;
      }
    });

    return {
      date: date.toISOString().split('T')[0],
      totalDemand,
      skillDemand,
      projectBreakdown,
      utilizationRate: activeProjects > 0 ? totalUtilization / activeProjects : 0
    };
  }

  /**
   * Find peak demand across all curves
   */
  private findPeakDemand(curves: DemandCurve[]): {
    date: string;
    value: number;
    projects: string[];
  } {
    let peakCurve = curves[0];
    let maxDemand = curves[0]?.totalDemand || 0;

    curves.forEach(curve => {
      if (curve.totalDemand > maxDemand) {
        maxDemand = curve.totalDemand;
        peakCurve = curve;
      }
    });

    return {
      date: peakCurve.date,
      value: maxDemand,
      projects: Object.keys(peakCurve.projectBreakdown)
    };
  }

  /**
   * Identify skill bottlenecks from accumulated demand
   */
  private identifySkillBottlenecks(
    skillDemandAccumulator: Record<string, Array<{ date: string; value: number }>>
  ): Array<{
    skill: string;
    peakDate: string;
    demandValue: number;
  }> {
    const bottlenecks: Array<{
      skill: string;
      peakDate: string;
      demandValue: number;
    }> = [];

    Object.entries(skillDemandAccumulator).forEach(([skill, demandPoints]) => {
      // Find peak demand for this skill
      let peakPoint = demandPoints[0];
      let maxDemand = demandPoints[0]?.value || 0;

      demandPoints.forEach(point => {
        if (point.value > maxDemand) {
          maxDemand = point.value;
          peakPoint = point;
        }
      });

      // Consider it a bottleneck if peak demand > average * 1.5
      const averageDemand = demandPoints.reduce((acc, p) => acc + p.value, 0) / demandPoints.length;
      if (maxDemand > averageDemand * 1.5) {
        bottlenecks.push({
          skill,
          peakDate: peakPoint.date,
          demandValue: maxDemand
        });
      }
    });

    return bottlenecks.sort((a, b) => b.demandValue - a.demandValue);
  }

  /**
   * Calculate days between two date strings
   */
  private calculateDaysBetween(startDate: string, endDate: string): number {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }
}

export const demandPredictor = new DemandPredictor();