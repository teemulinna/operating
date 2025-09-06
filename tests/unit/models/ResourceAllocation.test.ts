import { Pool } from 'pg';
import { ResourceAllocationModel } from '../../../src/models/ResourceAllocation';
import { 
  CreateResourceAllocationInput, 
  UpdateResourceAllocationInput, 
  ResourceAllocationFilters 
} from '../../../src/types';

// Mock pool
const mockPool = {
  query: jest.fn(),
  connect: jest.fn(),
} as unknown as Pool;

describe('ResourceAllocationModel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    ResourceAllocationModel.initialize(mockPool);
  });

  describe('create', () => {
    it('should create resource allocation successfully', async () => {
      const mockAllocationData = {
        id: '1',
        project_id: 'project-1',
        employee_id: 'emp-1',
        allocated_hours: 40,
        hourly_rate: 75.00,
        role_on_project: 'Developer',
        start_date: new Date('2024-01-01'),
        end_date: new Date('2024-01-31'),
        actual_hours: null as any,
        notes: 'Initial allocation',
        is_active: true,
        created_at: new Date(),
        updated_at: new Date()
      };

      (mockPool.query as jest.Mock).mockResolvedValue({
        rows: [mockAllocationData]
      });

      const input: CreateResourceAllocationInput = {
        projectId: 'project-1',
        employeeId: 'emp-1',
        allocatedHours: 40,
        hourlyRate: 75.00,
        roleOnProject: 'Developer',
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-31'),
        notes: 'Initial allocation'
      };

      const result = await ResourceAllocationModel.create(input);

      expect(result).toEqual({
        id: '1',
        projectId: 'project-1',
        employeeId: 'emp-1',
        allocatedHours: 40,
        hourlyRate: 75.00,
        roleOnProject: 'Developer',
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-31'),
        actualHours: undefined,
        notes: 'Initial allocation',
        isActive: true,
        createdAt: mockAllocationData.created_at,
        updatedAt: mockAllocationData.updated_at
      });
    });

    it('should handle overlapping allocation conflict', async () => {
      const error = new Error('Overlapping allocation') as any;
      error.code = '23P01'; // serialization failure
      
      (mockPool.query as jest.Mock).mockRejectedValue(error);

      const input: CreateResourceAllocationInput = {
        projectId: 'project-1',
        employeeId: 'emp-1',
        allocatedHours: 40,
        roleOnProject: 'Developer',
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-31')
      };

      await expect(ResourceAllocationModel.create(input)).rejects.toThrow(
        'Employee has overlapping resource allocation for the specified period'
      );
    });

    it('should handle foreign key constraint error', async () => {
      const error = new Error('Foreign key violation') as any;
      error.code = '23503';
      
      (mockPool.query as jest.Mock).mockRejectedValue(error);

      const input: CreateResourceAllocationInput = {
        projectId: 'invalid-project',
        employeeId: 'emp-1',
        allocatedHours: 40,
        roleOnProject: 'Developer',
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-31')
      };

      await expect(ResourceAllocationModel.create(input)).rejects.toThrow(
        'Invalid project ID or employee ID'
      );
    });
  });

  describe('findByProject', () => {
    it('should find allocations by project with employee details', async () => {
      const mockAllocationsData = [
        {
          id: '1',
          project_id: 'project-1',
          employee_id: 'emp-1',
          allocated_hours: 40,
          hourly_rate: 75.00,
          role_on_project: 'Developer',
          start_date: new Date('2024-01-01'),
          end_date: new Date('2024-01-31'),
          actual_hours: 35,
          is_active: true,
          created_at: new Date(),
          updated_at: new Date(),
          employee: {
            id: 'emp-1',
            first_name: 'John',
            last_name: 'Doe',
            email: 'john.doe@company.com',
            position: 'Senior Developer'
          }
        }
      ];

      (mockPool.query as jest.Mock).mockResolvedValue({
        rows: mockAllocationsData
      });

      const result = await ResourceAllocationModel.findByProject('project-1');

      expect(result).toHaveLength(1);
      expect(result[0].employee).toEqual({
        id: 'emp-1',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@company.com',
        position: 'Senior Developer'
      });
      expect(result[0].allocatedHours).toBe(40);
      expect(result[0].actualHours).toBe(35);
    });

    it('should return empty array when no allocations found', async () => {
      (mockPool.query as jest.Mock).mockResolvedValue({ rows: [] });

      const result = await ResourceAllocationModel.findByProject('nonexistent');

      expect(result).toHaveLength(0);
    });
  });

  describe('findByEmployee', () => {
    it('should find allocations by employee with project details', async () => {
      const mockAllocationsData = [
        {
          id: '1',
          project_id: 'project-1',
          employee_id: 'emp-1',
          allocated_hours: 40,
          role_on_project: 'Developer',
          start_date: new Date('2024-01-01'),
          end_date: new Date('2024-01-31'),
          is_active: true,
          created_at: new Date(),
          updated_at: new Date(),
          project: {
            id: 'project-1',
            name: 'Test Project',
            status: 'active',
            priority: 'high'
          }
        }
      ];

      (mockPool.query as jest.Mock).mockResolvedValue({
        rows: mockAllocationsData
      });

      const result = await ResourceAllocationModel.findByEmployee('emp-1');

      expect(result).toHaveLength(1);
      expect(result[0].project).toEqual({
        id: 'project-1',
        name: 'Test Project',
        status: 'active',
        priority: 'high'
      });
    });
  });

  describe('findOverlapping', () => {
    it('should find overlapping allocations', async () => {
      const mockOverlappingData = [
        {
          id: '2',
          project_id: 'project-2',
          employee_id: 'emp-1',
          allocated_hours: 20,
          start_date: new Date('2024-01-15'),
          end_date: new Date('2024-02-15'),
          is_active: true
        }
      ];

      (mockPool.query as jest.Mock).mockResolvedValue({
        rows: mockOverlappingData
      });

      const result = await ResourceAllocationModel.findOverlapping(
        'emp-1',
        new Date('2024-01-01'),
        new Date('2024-01-31'),
        'allocation-1'
      );

      expect(result).toHaveLength(1);
      expect(result[0].projectId).toBe('project-2');
      expect(result[0].allocatedHours).toBe(20);
    });

    it('should return empty array when no overlapping allocations', async () => {
      (mockPool.query as jest.Mock).mockResolvedValue({ rows: [] });

      const result = await ResourceAllocationModel.findOverlapping(
        'emp-1',
        new Date('2024-03-01'),
        new Date('2024-03-31')
      );

      expect(result).toHaveLength(0);
    });
  });

  describe('update', () => {
    it('should update allocation successfully', async () => {
      const mockUpdatedAllocation = {
        id: '1',
        project_id: 'project-1',
        employee_id: 'emp-1',
        allocated_hours: 35,
        hourly_rate: 80.00,
        role_on_project: 'Senior Developer',
        actual_hours: 35,
        is_active: true,
        created_at: new Date(),
        updated_at: new Date()
      };

      (mockPool.query as jest.Mock).mockResolvedValue({
        rows: [mockUpdatedAllocation]
      });

      const updates: UpdateResourceAllocationInput = {
        allocatedHours: 35,
        hourlyRate: 80.00,
        roleOnProject: 'Senior Developer',
        actualHours: 35
      };

      const result = await ResourceAllocationModel.update('1', updates);

      expect(result.allocatedHours).toBe(35);
      expect(result.hourlyRate).toBe(80.00);
      expect(result.roleOnProject).toBe('Senior Developer');
      expect(result.actualHours).toBe(35);
    });

    it('should throw error when allocation not found', async () => {
      (mockPool.query as jest.Mock).mockResolvedValue({ rows: [] });

      const updates: UpdateResourceAllocationInput = { allocatedHours: 35 };

      await expect(ResourceAllocationModel.update('nonexistent', updates))
        .rejects.toThrow('Resource allocation not found or already deleted');
    });
  });

  describe('delete', () => {
    it('should soft delete allocation successfully', async () => {
      const mockDeletedAllocation = {
        id: '1',
        project_id: 'project-1',
        employee_id: 'emp-1',
        is_active: false,
        created_at: new Date(),
        updated_at: new Date()
      };

      (mockPool.query as jest.Mock).mockResolvedValue({
        rows: [mockDeletedAllocation]
      });

      const result = await ResourceAllocationModel.delete('1');

      expect(result.isActive).toBe(false);
    });
  });

  describe('getUtilizationByEmployee', () => {
    it('should calculate employee utilization', async () => {
      const mockUtilizationData = [
        {
          employee_id: 'emp-1',
          employee_name: 'John Doe',
          total_allocated_hours: '80',
          total_actual_hours: '75',
          active_projects: '2',
          utilization_rate: '0.9375'
        }
      ];

      (mockPool.query as jest.Mock).mockResolvedValue({
        rows: mockUtilizationData
      });

      const result = await ResourceAllocationModel.getUtilizationByEmployee(
        new Date('2024-01-01'),
        new Date('2024-01-31')
      );

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        employeeId: 'emp-1',
        employeeName: 'John Doe',
        totalAllocatedHours: 80,
        totalActualHours: 75,
        activeProjects: 2,
        utilizationRate: 0.9375
      });
    });
  });

  describe('getCapacityConflicts', () => {
    it('should identify capacity conflicts', async () => {
      const mockConflicts = [
        {
          employee_id: 'emp-1',
          employee_name: 'John Doe',
          conflict_date: new Date('2024-01-15'),
          total_allocated_hours: '50',
          max_capacity_hours: '40',
          over_allocation: '10'
        }
      ];

      (mockPool.query as jest.Mock).mockResolvedValue({
        rows: mockConflicts
      });

      const result = await ResourceAllocationModel.getCapacityConflicts(
        new Date('2024-01-01'),
        new Date('2024-01-31')
      );

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        employeeId: 'emp-1',
        employeeName: 'John Doe',
        conflictDate: new Date('2024-01-15'),
        totalAllocatedHours: 50,
        maxCapacityHours: 40,
        overAllocation: 10
      });
    });
  });

  describe('getBillableHoursSummary', () => {
    it('should calculate billable hours summary by project', async () => {
      const mockBillableData = [
        {
          project_id: 'project-1',
          project_name: 'Test Project',
          total_allocated_hours: '100',
          total_actual_hours: '95',
          total_billable_amount: '7125.00',
          completion_rate: '0.95'
        }
      ];

      (mockPool.query as jest.Mock).mockResolvedValue({
        rows: mockBillableData
      });

      const result = await ResourceAllocationModel.getBillableHoursSummary(
        new Date('2024-01-01'),
        new Date('2024-01-31')
      );

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        projectId: 'project-1',
        projectName: 'Test Project',
        totalAllocatedHours: 100,
        totalActualHours: 95,
        totalBillableAmount: 7125,
        completionRate: 0.95
      });
    });
  });
});