import { ResourceAnalyticsService } from '../../src/services/resource-analytics.service';
import { ResourceAssignmentService } from '../../src/services/resource-assignment.service';
import { CapacityEngineService } from '../../src/services/capacity-engine.service';

// Mock dependencies
jest.mock('../../src/services/resource-assignment.service');
jest.mock('../../src/services/capacity-engine.service');

describe('ResourceAnalyticsService', () => {
  let analyticsService: ResourceAnalyticsService;
  let mockResourceAssignmentService: jest.Mocked<ResourceAssignmentService>;
  let mockCapacityEngine: jest.Mocked<CapacityEngineService>;

  beforeEach(() => {
    mockResourceAssignmentService = new ResourceAssignmentService() as jest.Mocked<ResourceAssignmentService>;
    mockCapacityEngine = new CapacityEngineService(mockResourceAssignmentService, null as any) as jest.Mocked<CapacityEngineService>;
    analyticsService = new ResourceAnalyticsService(mockResourceAssignmentService, mockCapacityEngine);
  });

  describe('generateUtilizationReport', () => {
    it('should calculate utilization rates for date range', async () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');

      mockResourceAssignmentService.getAssignmentsInPeriod.mockResolvedValue([
        {
          id: 1,
          employeeId: 1,
          projectId: 1,
          startDate: new Date('2024-01-01'),
          endDate: new Date('2024-01-31'),
          allocatedHours: 160,
          actualHours: 150
        }
      ]);

      const report = await analyticsService.generateUtilizationReport(startDate, endDate);

      expect(report).toHaveProperty('overallUtilization');
      expect(report).toHaveProperty('employeeUtilization');
      expect(report).toHaveProperty('projectUtilization');
      expect(report.overallUtilization).toBeGreaterThanOrEqual(0);
      expect(report.overallUtilization).toBeLessThanOrEqual(1);
    });

    it('should identify under-utilized and over-utilized employees', async () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');

      mockResourceAssignmentService.getAssignmentsInPeriod.mockResolvedValue([
        {
          id: 1,
          employeeId: 1,
          projectId: 1,
          startDate,
          endDate,
          allocatedHours: 80, // Under-utilized (50%)
          actualHours: 75
        },
        {
          id: 2,
          employeeId: 2,
          projectId: 2,
          startDate,
          endDate,
          allocatedHours: 180, // Over-utilized (112.5%)
          actualHours: 185
        }
      ]);

      const report = await analyticsService.generateUtilizationReport(startDate, endDate);

      expect(report.underUtilized).toHaveLength(1);
      expect(report.overUtilized).toHaveLength(1);
      expect(report.underUtilized[0].employeeId).toBe(1);
      expect(report.overUtilized[0].employeeId).toBe(2);
    });
  });

  describe('analyzeSkillGaps', () => {
    it('should identify missing skills across projects', async () => {
      const projects = [
        {
          id: 1,
          name: 'Project A',
          requiredSkills: ['TypeScript', 'React', 'GraphQL']
        },
        {
          id: 2,
          name: 'Project B',
          requiredSkills: ['Python', 'Django', 'PostgreSQL']
        }
      ];

      const employees = [
        { id: 1, name: 'John Doe', skills: ['TypeScript', 'React'] },
        { id: 2, name: 'Jane Smith', skills: ['Python', 'Django'] }
      ];

      const gapAnalysis = await analyticsService.analyzeSkillGaps(projects, employees);

      expect(gapAnalysis).toHaveProperty('skillGaps');
      expect(gapAnalysis).toHaveProperty('recommendations');
      expect(gapAnalysis).toHaveProperty('criticalMissingSkills');
      expect(gapAnalysis.skillGaps).toBeInstanceOf(Array);
    });

    it('should prioritize skill gaps by project importance', async () => {
      const projects = [
        {
          id: 1,
          name: 'Critical Project',
          requiredSkills: ['Kubernetes'],
          priority: 'high'
        },
        {
          id: 2,
          name: 'Minor Project',
          requiredSkills: ['Docker'],
          priority: 'low'
        }
      ];

      const employees = [
        { id: 1, name: 'John Doe', skills: ['TypeScript'] }
      ];

      const gapAnalysis = await analyticsService.analyzeSkillGaps(projects, employees);

      expect(gapAnalysis.criticalMissingSkills).toContain('Kubernetes');
      expect(gapAnalysis.criticalMissingSkills.indexOf('Kubernetes')).toBeLessThan(
        gapAnalysis.criticalMissingSkills.indexOf('Docker')
      );
    });
  });

  describe('generateForecast', () => {
    it('should predict future resource needs based on historical data', async () => {
      const historicalData = [
        { month: '2023-01', totalHours: 1000 },
        { month: '2023-02', totalHours: 1100 },
        { month: '2023-03', totalHours: 1200 }
      ];

      const forecast = await analyticsService.generateForecast(historicalData, 3);

      expect(forecast).toHaveProperty('predictions');
      expect(forecast).toHaveProperty('confidence');
      expect(forecast).toHaveProperty('trend');
      expect(forecast.predictions).toHaveLength(3);
    });

    it('should identify seasonal patterns', async () => {
      const historicalData = Array.from({ length: 24 }, (_, i) => ({
        month: `2022-${String(i % 12 + 1).padStart(2, '0')}`,
        totalHours: 1000 + (i % 12 < 6 ? 200 : 0) // Higher in first half of year
      }));

      const forecast = await analyticsService.generateForecast(historicalData, 6);

      expect(forecast.seasonalPattern).toBeDefined();
      expect(forecast.trend).toBe('seasonal');
    });
  });

  describe('optimizeAllocation', () => {
    it('should suggest reallocation to improve efficiency', async () => {
      const currentAllocations = [
        {
          employeeId: 1,
          projectId: 1,
          allocatedHours: 40,
          skills: ['TypeScript', 'React'],
          efficiency: 0.8
        },
        {
          employeeId: 2,
          projectId: 2,
          allocatedHours: 40,
          skills: ['Python', 'Django'],
          efficiency: 0.9
        }
      ];

      const optimization = await analyticsService.optimizeAllocation(currentAllocations);

      expect(optimization).toHaveProperty('suggestions');
      expect(optimization).toHaveProperty('expectedImprovement');
      expect(optimization).toHaveProperty('riskAssessment');
      expect(optimization.suggestions).toBeInstanceOf(Array);
    });

    it('should consider skill matching in optimization', async () => {
      const currentAllocations = [
        {
          employeeId: 1,
          projectId: 1,
          allocatedHours: 40,
          skills: ['TypeScript'],
          requiredSkills: ['Python'], // Skill mismatch
          efficiency: 0.6
        }
      ];

      const optimization = await analyticsService.optimizeAllocation(currentAllocations);

      expect(optimization.suggestions[0]).toHaveProperty('reason');
      expect(optimization.suggestions[0].reason).toContain('skill mismatch');
    });
  });
});