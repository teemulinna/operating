import { Pool } from 'pg';
import { ProjectModel } from '../../../src/models/Project';
import { 
  CreateProjectInput, 
  UpdateProjectInput, 
  ProjectStatus, 
  ProjectPriority,
  ProjectFilters 
} from '../../../src/types';

// Mock pool
const mockPool = {
  query: jest.fn(),
  connect: jest.fn(),
} as unknown as Pool;

describe('ProjectModel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    ProjectModel.initialize(mockPool);
  });

  describe('create', () => {
    it('should create a project successfully', async () => {
      const mockProjectData = {
        id: '1',
        name: 'Test Project',
        description: 'A test project',
        status: 'planning',
        priority: 'high',
        start_date: new Date('2024-01-01'),
        end_date: new Date('2024-06-01'),
        estimated_hours: 1000,
        budget: 50000,
        manager_id: 'manager-1',
        is_active: true,
        created_at: new Date(),
        updated_at: new Date()
      };

      (mockPool.query as jest.Mock).mockResolvedValue({
        rows: [mockProjectData]
      });

      const input: CreateProjectInput = {
        name: 'Test Project',
        description: 'A test project',
        status: ProjectStatus.PLANNING,
        priority: ProjectPriority.HIGH,
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-06-01'),
        estimatedHours: 1000,
        budget: 50000,
        managerId: 'manager-1'
      };

      const result = await ProjectModel.create(input);

      expect(result).toEqual({
        id: '1',
        name: 'Test Project',
        description: 'A test project',
        status: ProjectStatus.PLANNING,
        priority: ProjectPriority.HIGH,
        clientId: undefined,
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-06-01'),
        estimatedHours: 1000,
        actualHours: undefined,
        budget: 50000,
        costToDate: undefined,
        managerId: 'manager-1',
        isActive: true,
        createdAt: mockProjectData.created_at,
        updatedAt: mockProjectData.updated_at
      });

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO projects'),
        expect.arrayContaining([
          'Test Project',
          'A test project',
          ProjectStatus.PLANNING,
          ProjectPriority.HIGH,
          null, // clientId
          new Date('2024-01-01'),
          new Date('2024-06-01'),
          1000,
          50000,
          'manager-1',
          true
        ])
      );
    });

    it('should handle duplicate project name error', async () => {
      const error = new Error('Duplicate key value') as any;
      error.code = '23505';
      
      (mockPool.query as jest.Mock).mockRejectedValue(error);

      const input: CreateProjectInput = {
        name: 'Duplicate Project',
        status: ProjectStatus.PLANNING,
        priority: ProjectPriority.MEDIUM,
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-06-01'),
        estimatedHours: 500,
        managerId: 'manager-1'
      };

      await expect(ProjectModel.create(input)).rejects.toThrow(
        "Project with name 'Duplicate Project' already exists"
      );
    });

    it('should handle foreign key constraint error', async () => {
      const error = new Error('Foreign key violation') as any;
      error.code = '23503';
      
      (mockPool.query as jest.Mock).mockRejectedValue(error);

      const input: CreateProjectInput = {
        name: 'Test Project',
        status: ProjectStatus.PLANNING,
        priority: ProjectPriority.MEDIUM,
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-06-01'),
        estimatedHours: 500,
        managerId: 'invalid-manager'
      };

      await expect(ProjectModel.create(input)).rejects.toThrow(
        'Invalid manager ID or client ID'
      );
    });
  });

  describe('findById', () => {
    it('should find project by id', async () => {
      const mockProjectData = {
        id: '1',
        name: 'Test Project',
        description: 'A test project',
        status: 'active',
        priority: 'high',
        client_id: null as any,
        start_date: new Date('2024-01-01'),
        end_date: new Date('2024-06-01'),
        estimated_hours: 1000,
        actual_hours: 500,
        budget: 50000,
        cost_to_date: 25000,
        manager_id: 'manager-1',
        is_active: true,
        created_at: new Date(),
        updated_at: new Date()
      };

      (mockPool.query as jest.Mock).mockResolvedValue({
        rows: [mockProjectData]
      });

      const result = await ProjectModel.findById('1');

      expect(result).toEqual({
        id: '1',
        name: 'Test Project',
        description: 'A test project',
        status: ProjectStatus.ACTIVE,
        priority: ProjectPriority.HIGH,
        clientId: null,
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-06-01'),
        estimatedHours: 1000,
        actualHours: 500,
        budget: 50000,
        costToDate: 25000,
        managerId: 'manager-1',
        isActive: true,
        createdAt: mockProjectData.created_at,
        updatedAt: mockProjectData.updated_at
      });

      expect(mockPool.query).toHaveBeenCalledWith(
        `
      SELECT * FROM projects 
      WHERE id = $1 AND is_active = true
    `,
        ['1']
      );
    });

    it('should return null when project not found', async () => {
      (mockPool.query as jest.Mock).mockResolvedValue({ rows: [] });

      const result = await ProjectModel.findById('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('findAll', () => {
    it('should find projects with filters', async () => {
      const mockProjectsData = [
        {
          id: '1',
          name: 'Project 1',
          status: 'active',
          priority: 'high',
          manager_id: 'manager-1',
          is_active: true,
          created_at: new Date(),
          updated_at: new Date()
        },
        {
          id: '2',
          name: 'Project 2',
          status: 'planning',
          priority: 'medium',
          manager_id: 'manager-2',
          is_active: true,
          created_at: new Date(),
          updated_at: new Date()
        }
      ];

      const mockCountResult = { rows: [{ total: '2' }] };
      const mockDataResult = { rows: mockProjectsData };

      (mockPool.query as jest.Mock)
        .mockResolvedValueOnce(mockCountResult)
        .mockResolvedValueOnce(mockDataResult);

      const filters: ProjectFilters = {
        status: ProjectStatus.ACTIVE,
        priority: ProjectPriority.HIGH,
        managerId: 'manager-1'
      };

      const result = await ProjectModel.findAll(filters, 1, 10);

      expect(result.data).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(10);
      expect(result.totalPages).toBe(1);

      expect(mockPool.query).toHaveBeenCalledTimes(2);
    });

    it('should handle empty results', async () => {
      const mockCountResult = { rows: [{ total: '0' }] };
      const mockDataResult = { rows: [] as any[] };

      (mockPool.query as jest.Mock)
        .mockResolvedValueOnce(mockCountResult)
        .mockResolvedValueOnce(mockDataResult);

      const result = await ProjectModel.findAll({}, 1, 10);

      expect(result.data).toHaveLength(0);
      expect(result.total).toBe(0);
      expect(result.totalPages).toBe(0);
    });
  });

  describe('update', () => {
    it('should update project successfully', async () => {
      const mockUpdatedProject = {
        id: '1',
        name: 'Updated Project',
        description: 'Updated description',
        status: 'active',
        priority: 'critical',
        manager_id: 'new-manager',
        is_active: true,
        created_at: new Date(),
        updated_at: new Date()
      };

      (mockPool.query as jest.Mock).mockResolvedValue({
        rows: [mockUpdatedProject]
      });

      const updates: UpdateProjectInput = {
        name: 'Updated Project',
        description: 'Updated description',
        status: ProjectStatus.ACTIVE,
        priority: ProjectPriority.CRITICAL,
        managerId: 'new-manager'
      };

      const result = await ProjectModel.update('1', updates);

      expect(result.name).toBe('Updated Project');
      expect(result.status).toBe(ProjectStatus.ACTIVE);
      expect(result.priority).toBe(ProjectPriority.CRITICAL);

      expect(mockPool.query).toHaveBeenCalledWith(
        `
      UPDATE projects 
      SET name = $1, description = $2, status = $3, priority = $4, manager_id = $5, updated_at = CURRENT_TIMESTAMP
      WHERE id = $6 AND is_active = true
      RETURNING *
    `,
        ['Updated Project', 'Updated description', 'active', 'critical', 'new-manager', '1']
      );
    });

    it('should throw error when no fields to update', async () => {
      await expect(ProjectModel.update('1', {})).rejects.toThrow('No fields to update');
    });

    it('should throw error when project not found', async () => {
      (mockPool.query as jest.Mock).mockResolvedValue({ rows: [] });

      const updates: UpdateProjectInput = { name: 'Updated' };

      await expect(ProjectModel.update('nonexistent', updates)).rejects.toThrow(
        'Project not found or already deleted'
      );
    });
  });

  describe('delete', () => {
    it('should soft delete project successfully', async () => {
      const mockDeletedProject = {
        id: '1',
        name: 'Deleted Project',
        is_active: false,
        created_at: new Date(),
        updated_at: new Date()
      };

      (mockPool.query as jest.Mock).mockResolvedValue({
        rows: [mockDeletedProject]
      });

      const result = await ProjectModel.delete('1');

      expect(result.isActive).toBe(false);

      expect(mockPool.query).toHaveBeenCalledWith(
        `
      UPDATE projects 
      SET is_active = false, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1 AND is_active = true
      RETURNING *
    `,
        ['1']
      );
    });

    it('should throw error when project not found', async () => {
      (mockPool.query as jest.Mock).mockResolvedValue({ rows: [] });

      await expect(ProjectModel.delete('nonexistent')).rejects.toThrow(
        'Project not found or already deleted'
      );
    });
  });

  describe('getProjectStatistics', () => {
    it('should return project statistics', async () => {
      const mockStatsData = {
        total_projects: '10',
        active_projects: '7',
        projects_by_status: JSON.stringify({
          planning: 2,
          active: 5,
          completed: 2,
          cancelled: 1
        }),
        avg_estimated_hours: '750.5',
        avg_completion_rate: '0.85'
      };

      (mockPool.query as jest.Mock).mockResolvedValue({
        rows: [mockStatsData]
      });

      const result = await ProjectModel.getProjectStatistics();

      expect(result).toEqual({
        totalProjects: 10,
        activeProjects: 7,
        projectsByStatus: {
          planning: 2,
          active: 5,
          completed: 2,
          cancelled: 1
        },
        averageEstimatedHours: 750.5,
        averageCompletionRate: 0.85
      });
    });
  });

  describe('getResourceAllocationSummary', () => {
    it('should return resource allocation summary for project', async () => {
      const mockAllocationData = [
        {
          employee_id: 'emp-1',
          employee_name: 'John Doe',
          allocated_hours: '40',
          actual_hours: '35',
          hourly_rate: '75.00',
          total_cost: '2625.00'
        }
      ];

      (mockPool.query as jest.Mock).mockResolvedValue({
        rows: mockAllocationData
      });

      const result = await ProjectModel.getResourceAllocationSummary('project-1');

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        employeeId: 'emp-1',
        employeeName: 'John Doe',
        allocatedHours: 40,
        actualHours: 35,
        hourlyRate: 75,
        totalCost: 2625
      });
    });
  });
});