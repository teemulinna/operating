import { CapacityEngineService } from '../../src/services/capacity-engine.service';
import { ResourceAssignmentService } from '../../src/services/resource-assignment.service';
import { ProjectService } from '../../src/services/project.service';

// Mock dependencies
jest.mock('../../src/services/resource-assignment.service');
jest.mock('../../src/services/project.service');

describe('CapacityEngineService', () => {
  let capacityEngine: CapacityEngineService;
  let mockResourceAssignmentService: jest.Mocked<ResourceAssignmentService>;
  let mockProjectService: jest.Mocked<ProjectService>;

  beforeEach(() => {
    mockResourceAssignmentService = new ResourceAssignmentService() as jest.Mocked<ResourceAssignmentService>;
    mockProjectService = new ProjectService() as jest.Mocked<ProjectService>;
    capacityEngine = new CapacityEngineService(mockResourceAssignmentService, mockProjectService);
  });

  describe('calculateEmployeeAvailability', () => {
    it('should calculate available hours for employee across date range', async () => {
      const employeeId = 1;
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');
      
      mockResourceAssignmentService.getAssignmentsByEmployee.mockResolvedValue([
        {
          id: 1,
          employeeId,
          projectId: 1,
          startDate: new Date('2024-01-01'),
          endDate: new Date('2024-01-15'),
          allocatedHours: 40,
          role: 'Developer'
        }
      ]);

      const availability = await capacityEngine.calculateEmployeeAvailability(employeeId, startDate, endDate);

      expect(availability).toHaveProperty('totalHours');
      expect(availability).toHaveProperty('allocatedHours');
      expect(availability).toHaveProperty('availableHours');
      expect(availability.availableHours).toBeGreaterThanOrEqual(0);
    });

    it('should handle overlapping assignments correctly', async () => {
      const employeeId = 1;
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');
      
      mockResourceAssignmentService.getAssignmentsByEmployee.mockResolvedValue([
        {
          id: 1,
          employeeId,
          projectId: 1,
          startDate: new Date('2024-01-01'),
          endDate: new Date('2024-01-15'),
          allocatedHours: 30,
          role: 'Developer'
        },
        {
          id: 2,
          employeeId,
          projectId: 2,
          startDate: new Date('2024-01-10'),
          endDate: new Date('2024-01-20'),
          allocatedHours: 20,
          role: 'Designer'
        }
      ]);

      const availability = await capacityEngine.calculateEmployeeAvailability(employeeId, startDate, endDate);

      expect(availability.conflicts).toHaveLength(1);
      expect(availability.conflicts[0]).toHaveProperty('overlapDays');
    });
  });

  describe('findSkillMatches', () => {
    it('should match employees with required skills', async () => {
      const requiredSkills = ['TypeScript', 'React', 'Node.js'];
      const employees = [
        { id: 1, name: 'John Doe', skills: ['TypeScript', 'React', 'Vue.js'] },
        { id: 2, name: 'Jane Smith', skills: ['TypeScript', 'Node.js', 'Python'] }
      ];

      const matches = await capacityEngine.findSkillMatches(requiredSkills, employees);

      expect(matches).toHaveLength(2);
      expect(matches[0]).toHaveProperty('employee');
      expect(matches[0]).toHaveProperty('matchScore');
      expect(matches[0]).toHaveProperty('matchedSkills');
      expect(matches[0]).toHaveProperty('missingSkills');
    });

    it('should calculate accurate match scores', async () => {
      const requiredSkills = ['TypeScript', 'React'];
      const employees = [
        { id: 1, name: 'Perfect Match', skills: ['TypeScript', 'React'] },
        { id: 2, name: 'Partial Match', skills: ['TypeScript'] }
      ];

      const matches = await capacityEngine.findSkillMatches(requiredSkills, employees);

      expect(matches[0].matchScore).toBe(1.0); // 100% match
      expect(matches[1].matchScore).toBe(0.5); // 50% match
    });
  });

  describe('optimizeResourceAllocation', () => {
    it('should suggest optimal resource allocation for project', async () => {
      const projectRequirements = {
        projectId: 1,
        requiredSkills: ['TypeScript', 'React'],
        duration: 30,
        effortHours: 160
      };

      mockResourceAssignmentService.getAvailableEmployees.mockResolvedValue([
        { id: 1, name: 'John Doe', skills: ['TypeScript', 'React'], weeklyCapacity: 40 },
        { id: 2, name: 'Jane Smith', skills: ['TypeScript'], weeklyCapacity: 40 }
      ]);

      const optimization = await capacityEngine.optimizeResourceAllocation(projectRequirements);

      expect(optimization).toHaveProperty('recommendations');
      expect(optimization).toHaveProperty('totalCost');
      expect(optimization).toHaveProperty('completionTime');
      expect(optimization.recommendations).toBeInstanceOf(Array);
    });

    it('should detect resource conflicts', async () => {
      const projectRequirements = {
        projectId: 1,
        requiredSkills: ['TypeScript'],
        duration: 30,
        effortHours: 200
      };

      mockResourceAssignmentService.getAvailableEmployees.mockResolvedValue([
        { id: 1, name: 'John Doe', skills: ['TypeScript'], weeklyCapacity: 40 }
      ]);

      const optimization = await capacityEngine.optimizeResourceAllocation(projectRequirements);

      expect(optimization.conflicts).toBeDefined();
      expect(optimization.feasible).toBe(false);
    });
  });

  describe('detectConflicts', () => {
    it('should identify overlapping resource assignments', async () => {
      const assignments = [
        {
          id: 1,
          employeeId: 1,
          projectId: 1,
          startDate: new Date('2024-01-01'),
          endDate: new Date('2024-01-15'),
          allocatedHours: 40
        },
        {
          id: 2,
          employeeId: 1,
          projectId: 2,
          startDate: new Date('2024-01-10'),
          endDate: new Date('2024-01-20'),
          allocatedHours: 30
        }
      ];

      const conflicts = await capacityEngine.detectConflicts(assignments);

      expect(conflicts).toHaveLength(1);
      expect(conflicts[0]).toHaveProperty('employeeId', 1);
      expect(conflicts[0]).toHaveProperty('conflictingAssignments');
      expect(conflicts[0]).toHaveProperty('overlapPeriod');
    });

    it('should calculate total over-allocation hours', async () => {
      const assignments = [
        {
          id: 1,
          employeeId: 1,
          projectId: 1,
          startDate: new Date('2024-01-01'),
          endDate: new Date('2024-01-07'),
          allocatedHours: 50 // Over 40h standard week
        }
      ];

      const conflicts = await capacityEngine.detectConflicts(assignments);

      expect(conflicts[0].overAllocationHours).toBe(10);
    });
  });
});