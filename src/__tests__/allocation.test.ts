import { describe, test, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { Pool } from 'pg';
import { AllocationModel, AllocationStatus } from '../models/allocation.model';
import { AllocationService } from '../services/allocation.service';
import { EmployeeModel } from '../models/Employee';
import { ProjectModel } from '../models/Project';
import { DepartmentModel } from '../models/Department';
import { DatabaseConnection } from '../database/connection';
import { 
  CreateResourceAllocationInput, 
  CreateEmployeeInput,
  CreateProjectInput,
  CreateDepartmentInput,
  ProjectStatus,
  ProjectPriority 
} from '../types';

describe('Allocation System - TDD Tests', () => {
  let pool: Pool;
  let connection: DatabaseConnection;
  let testDepartmentId: string;
  let testEmployeeId: string;
  let testProjectId: string;

  beforeAll(async () => {
    // Setup test database connection
    connection = new DatabaseConnection({
      host: process.env.TEST_DB_HOST || 'localhost',
      port: parseInt(process.env.TEST_DB_PORT || '5432'),
      database: process.env.TEST_DB_NAME || 'operating_test',
      user: process.env.TEST_DB_USER || 'postgres',
      password: process.env.TEST_DB_PASSWORD || 'password',
      ssl: false
    });

    await connection.connect();
    pool = connection.getPool();

    // Initialize models
    AllocationModel.initialize(pool);
    EmployeeModel.initialize(pool);
    ProjectModel.initialize(pool);
    DepartmentModel.initialize(pool);

    // Setup test data
    await setupTestData();
  });

  afterAll(async () => {
    await cleanupTestData();
    await connection.disconnect();
  });

  beforeEach(async () => {
    // Clean allocations before each test
    await pool.query('DELETE FROM allocations WHERE created_by = -999');
  });

  // Helper function to setup test data
  async function setupTestData() {
    // Create test department
    const deptInput: CreateDepartmentInput = {
      name: 'Test Department',
      description: 'Test department for allocation tests'
    };
    const department = await DepartmentModel.create(deptInput);
    testDepartmentId = department.id;

    // Create test employee
    const empInput: CreateEmployeeInput = {
      firstName: 'John',
      lastName: 'Doe',
      email: 'john.doe.allocation.test@company.com',
      departmentId: testDepartmentId,
      position: 'Software Developer',
      hireDate: new Date('2023-01-01')
    };
    const employee = await EmployeeModel.create(empInput);
    testEmployeeId = employee.id;

    // Create test project
    const projectInput: CreateProjectInput = {
      name: 'Test Project - Allocation System',
      description: 'Test project for allocation system',
      status: ProjectStatus.ACTIVE,
      priority: ProjectPriority.HIGH,
      startDate: new Date('2024-01-01'),
      endDate: new Date('2024-12-31'),
      estimatedHours: 1000,
      managerId: testEmployeeId,
      createdBy: -999
    };
    const project = await ProjectModel.create(projectInput);
    testProjectId = project.id;
  }

  async function cleanupTestData() {
    if (pool) {
      await pool.query('DELETE FROM allocations WHERE created_by = -999');
      await pool.query('DELETE FROM projects WHERE created_by = -999');
      await pool.query('DELETE FROM employees WHERE email LIKE \'%allocation.test%\'');
      await pool.query('DELETE FROM departments WHERE name LIKE \'%Test%\'');
    }
  }

  describe('Allocation Creation - TDD', () => {
    test('should create a basic allocation successfully', async () => {
      const input: CreateResourceAllocationInput = {
        employeeId: testEmployeeId,
        projectId: testProjectId,
        allocatedHours: 40,
        roleOnProject: 'Lead Developer',
        startDate: new Date('2024-02-01'),
        endDate: new Date('2024-02-29'),
        notes: 'Test allocation'
      };

      const allocation = await AllocationService.createAllocation(input);

      expect(allocation).toBeDefined();
      expect(allocation.employeeId).toBe(testEmployeeId);
      expect(allocation.projectId).toBe(testProjectId);
      expect(allocation.allocatedHours).toBe(40);
      expect(allocation.roleOnProject).toBe('Lead Developer');
      expect(allocation.isActive).toBe(false); // Should be tentative initially
    });

    test('should fail to create allocation with invalid employee ID', async () => {
      const input: CreateResourceAllocationInput = {
        employeeId: '99999',
        projectId: testProjectId,
        allocatedHours: 40,
        roleOnProject: 'Developer',
        startDate: new Date('2024-03-01'),
        endDate: new Date('2024-03-31')
      };

      await expect(AllocationService.createAllocation(input))
        .rejects.toThrow('Employee not found');
    });

    test('should fail to create allocation with invalid project ID', async () => {
      const input: CreateResourceAllocationInput = {
        employeeId: testEmployeeId,
        projectId: '99999',
        allocatedHours: 40,
        roleOnProject: 'Developer',
        startDate: new Date('2024-03-01'),
        endDate: new Date('2024-03-31')
      };

      await expect(AllocationService.createAllocation(input))
        .rejects.toThrow('Project not found');
    });

    test('should fail with invalid date range (end before start)', async () => {
      const input: CreateResourceAllocationInput = {
        employeeId: testEmployeeId,
        projectId: testProjectId,
        allocatedHours: 40,
        roleOnProject: 'Developer',
        startDate: new Date('2024-03-31'),
        endDate: new Date('2024-03-01')
      };

      await expect(AllocationService.createAllocation(input))
        .rejects.toThrow('End date must be after start date');
    });

    test('should fail with zero or negative hours', async () => {
      const input: CreateResourceAllocationInput = {
        employeeId: testEmployeeId,
        projectId: testProjectId,
        allocatedHours: 0,
        roleOnProject: 'Developer',
        startDate: new Date('2024-04-01'),
        endDate: new Date('2024-04-30')
      };

      await expect(AllocationService.createAllocation(input))
        .rejects.toThrow('Allocated hours must be greater than 0');
    });
  });

  describe('Overlap Detection - TDD', () => {
    test('should detect overlapping allocations', async () => {
      // Create first allocation
      const input1: CreateResourceAllocationInput = {
        employeeId: testEmployeeId,
        projectId: testProjectId,
        allocatedHours: 30,
        roleOnProject: 'Developer',
        startDate: new Date('2024-05-01'),
        endDate: new Date('2024-05-15')
      };

      const allocation1 = await AllocationService.createAllocation(input1);
      await AllocationService.confirmAllocation(allocation1.id);

      // Try to create overlapping allocation
      const input2: CreateResourceAllocationInput = {
        employeeId: testEmployeeId,
        projectId: testProjectId,
        allocatedHours: 20,
        roleOnProject: 'Tester',
        startDate: new Date('2024-05-10'), // Overlaps with first allocation
        endDate: new Date('2024-05-25')
      };

      await expect(AllocationService.createAllocation(input2))
        .rejects.toThrow('Allocation conflicts detected');
    });

    test('should allow forced creation of overlapping allocation', async () => {
      // Create first allocation
      const input1: CreateResourceAllocationInput = {
        employeeId: testEmployeeId,
        projectId: testProjectId,
        allocatedHours: 30,
        roleOnProject: 'Developer',
        startDate: new Date('2024-06-01'),
        endDate: new Date('2024-06-15')
      };

      const allocation1 = await AllocationService.createAllocation(input1);
      await AllocationService.confirmAllocation(allocation1.id);

      // Force create overlapping allocation
      const input2: CreateResourceAllocationInput = {
        employeeId: testEmployeeId,
        projectId: testProjectId,
        allocatedHours: 20,
        roleOnProject: 'Tester',
        startDate: new Date('2024-06-10'),
        endDate: new Date('2024-06-25')
      };

      const allocation2 = await AllocationService.createAllocation(input2, true); // force = true

      expect(allocation2).toBeDefined();
      expect(allocation2.employeeId).toBe(testEmployeeId);
    });

    test('should provide detailed conflict information', async () => {
      // Create existing allocation
      const input1: CreateResourceAllocationInput = {
        employeeId: testEmployeeId,
        projectId: testProjectId,
        allocatedHours: 40,
        roleOnProject: 'Lead Developer',
        startDate: new Date('2024-07-01'),
        endDate: new Date('2024-07-31')
      };

      const allocation1 = await AllocationService.createAllocation(input1);
      await AllocationService.confirmAllocation(allocation1.id);

      // Check for conflicts
      const conflictReport = await AllocationService.checkAllocationConflicts(
        testEmployeeId,
        new Date('2024-07-15'),
        new Date('2024-08-15')
      );

      expect(conflictReport.hasConflicts).toBe(true);
      expect(conflictReport.conflicts.length).toBe(1);
      expect(conflictReport.conflicts[0].projectName).toContain('Test Project');
      expect(conflictReport.suggestions.length).toBeGreaterThan(0);
    });

    test('should not detect conflicts with cancelled allocations', async () => {
      // Create and cancel an allocation
      const input1: CreateResourceAllocationInput = {
        employeeId: testEmployeeId,
        projectId: testProjectId,
        allocatedHours: 30,
        roleOnProject: 'Developer',
        startDate: new Date('2024-08-01'),
        endDate: new Date('2024-08-15')
      };

      const allocation1 = await AllocationService.createAllocation(input1);
      await AllocationService.cancelAllocation(allocation1.id);

      // Create new allocation in same time period
      const input2: CreateResourceAllocationInput = {
        employeeId: testEmployeeId,
        projectId: testProjectId,
        allocatedHours: 20,
        roleOnProject: 'Tester',
        startDate: new Date('2024-08-05'),
        endDate: new Date('2024-08-20')
      };

      const allocation2 = await AllocationService.createAllocation(input2);
      expect(allocation2).toBeDefined();
    });
  });

  describe('Capacity Validation - TDD', () => {
    test('should calculate utilization rate correctly', async () => {
      const validation = await AllocationService.validateCapacity(
        testEmployeeId,
        40, // 40 hours
        new Date('2024-09-01'),
        new Date('2024-09-30')
      );

      expect(validation.maxCapacityHours).toBe(40);
      expect(validation.utilizationRate).toBe(100); // 40/40 * 100 = 100%
      expect(validation.isValid).toBe(true);
    });

    test('should warn about over-allocation', async () => {
      const validation = await AllocationService.validateCapacity(
        testEmployeeId,
        60, // Over 40 hours standard
        new Date('2024-10-01'),
        new Date('2024-10-31')
      );

      expect(validation.utilizationRate).toBe(150); // 60/40 * 100 = 150%
      expect(validation.isValid).toBe(false);
      expect(validation.warnings.length).toBeGreaterThan(0);
      expect(validation.warnings[0]).toContain('Over-allocation detected');
    });

    test('should warn about high utilization', async () => {
      const validation = await AllocationService.validateCapacity(
        testEmployeeId,
        35, // 87.5% utilization
        new Date('2024-11-01'),
        new Date('2024-11-30')
      );

      expect(validation.utilizationRate).toBe(87.5);
      expect(validation.isValid).toBe(true);
      expect(validation.warnings.length).toBeGreaterThan(0);
      expect(validation.warnings[0]).toContain('High utilization');
    });
  });

  describe('Utilization Metrics - TDD', () => {
    test('should generate utilization summary', async () => {
      // Create multiple allocations
      const inputs = [
        {
          employeeId: testEmployeeId,
          projectId: testProjectId,
          allocatedHours: 20,
          roleOnProject: 'Developer',
          startDate: new Date('2024-12-01'),
          endDate: new Date('2024-12-15')
        },
        {
          employeeId: testEmployeeId,
          projectId: testProjectId,
          allocatedHours: 30,
          roleOnProject: 'Tester',
          startDate: new Date('2024-12-16'),
          endDate: new Date('2024-12-31')
        }
      ];

      for (const input of inputs) {
        await AllocationService.createAllocation(input, true); // Force to allow creation
      }

      const summary = await AllocationService.getUtilizationSummary(
        new Date('2024-12-01'),
        new Date('2024-12-31')
      );

      expect(summary).toBeDefined();
      expect(summary.totalEmployees).toBeGreaterThan(0);
      expect(summary.totalAllocations).toBeGreaterThan(0);
    });

    test('should get capacity metrics for specific employee', async () => {
      // Create allocation for metrics
      const input: CreateResourceAllocationInput = {
        employeeId: testEmployeeId,
        projectId: testProjectId,
        allocatedHours: 35,
        roleOnProject: 'Senior Developer',
        startDate: new Date('2025-01-01'),
        endDate: new Date('2025-01-31')
      };

      await AllocationService.createAllocation(input);

      const metrics = await AllocationService.getCapacityMetrics(
        testEmployeeId,
        new Date('2025-01-01'),
        new Date('2025-01-31')
      );

      expect(metrics.length).toBeGreaterThan(0);
      const employeeMetric = metrics.find(m => m.employeeId === testEmployeeId);
      expect(employeeMetric).toBeDefined();
      expect(employeeMetric?.totalAllocatedHours).toBe(35);
      expect(employeeMetric?.activeAllocations).toBe(1);
    });
  });

  describe('Allocation Status Management - TDD', () => {
    test('should confirm allocation and change status', async () => {
      const input: CreateResourceAllocationInput = {
        employeeId: testEmployeeId,
        projectId: testProjectId,
        allocatedHours: 25,
        roleOnProject: 'QA Engineer',
        startDate: new Date('2025-02-01'),
        endDate: new Date('2025-02-28')
      };

      const allocation = await AllocationService.createAllocation(input);
      expect(allocation.isActive).toBe(false); // Tentative initially

      const confirmed = await AllocationService.confirmAllocation(allocation.id);
      expect(confirmed.isActive).toBe(true);
    });

    test('should complete allocation with actual hours', async () => {
      const input: CreateResourceAllocationInput = {
        employeeId: testEmployeeId,
        projectId: testProjectId,
        allocatedHours: 30,
        roleOnProject: 'DevOps Engineer',
        startDate: new Date('2025-03-01'),
        endDate: new Date('2025-03-31')
      };

      const allocation = await AllocationService.createAllocation(input);
      const completed = await AllocationService.completeAllocation(allocation.id, 32);

      expect(completed.actualHours).toBe(32);
      expect(completed.isActive).toBe(false); // Completed status
    });

    test('should cancel allocation', async () => {
      const input: CreateResourceAllocationInput = {
        employeeId: testEmployeeId,
        projectId: testProjectId,
        allocatedHours: 15,
        roleOnProject: 'UI Designer',
        startDate: new Date('2025-04-01'),
        endDate: new Date('2025-04-30')
      };

      const allocation = await AllocationService.createAllocation(input);
      const cancelled = await AllocationService.cancelAllocation(allocation.id);

      expect(cancelled.isActive).toBe(false);
    });
  });

  describe('CRUD Operations - TDD', () => {
    test('should retrieve allocation with full details', async () => {
      const input: CreateResourceAllocationInput = {
        employeeId: testEmployeeId,
        projectId: testProjectId,
        allocatedHours: 20,
        roleOnProject: 'Business Analyst',
        startDate: new Date('2025-05-01'),
        endDate: new Date('2025-05-31')
      };

      const allocation = await AllocationService.createAllocation(input);
      const withDetails = await AllocationService.getAllocationWithDetails(allocation.id);

      expect(withDetails).toBeDefined();
      expect(withDetails?.employee).toBeDefined();
      expect(withDetails?.project).toBeDefined();
      expect(withDetails?.employee.firstName).toBe('John');
      expect(withDetails?.project.name).toContain('Test Project');
    });

    test('should update allocation successfully', async () => {
      const input: CreateResourceAllocationInput = {
        employeeId: testEmployeeId,
        projectId: testProjectId,
        allocatedHours: 25,
        roleOnProject: 'Original Role',
        startDate: new Date('2025-06-01'),
        endDate: new Date('2025-06-30')
      };

      const allocation = await AllocationService.createAllocation(input);
      
      const updated = await AllocationService.updateAllocation(allocation.id, {
        roleOnProject: 'Updated Role',
        allocatedHours: 35
      });

      expect(updated.roleOnProject).toBe('Updated Role');
      expect(updated.allocatedHours).toBe(35);
    });

    test('should delete allocation (soft delete)', async () => {
      const input: CreateResourceAllocationInput = {
        employeeId: testEmployeeId,
        projectId: testProjectId,
        allocatedHours: 10,
        roleOnProject: 'Temporary Role',
        startDate: new Date('2025-07-01'),
        endDate: new Date('2025-07-31')
      };

      const allocation = await AllocationService.createAllocation(input);
      const deleted = await AllocationService.deleteAllocation(allocation.id);

      expect(deleted.isActive).toBe(false);
      
      // Should still be able to retrieve it
      const retrieved = await AllocationService.getAllocation(allocation.id);
      expect(retrieved).toBeDefined();
    });

    test('should get paginated employee allocations', async () => {
      // Create multiple allocations for the same employee
      const baseDate = new Date('2025-08-01');
      for (let i = 0; i < 5; i++) {
        const startDate = new Date(baseDate.getTime() + (i * 7 * 24 * 60 * 60 * 1000));
        const endDate = new Date(startDate.getTime() + (7 * 24 * 60 * 60 * 1000));
        
        const input: CreateResourceAllocationInput = {
          employeeId: testEmployeeId,
          projectId: testProjectId,
          allocatedHours: 8,
          roleOnProject: `Role ${i}`,
          startDate,
          endDate
        };
        
        await AllocationService.createAllocation(input, true);
      }

      const result = await AllocationService.getEmployeeAllocations(testEmployeeId, {}, 1, 3);

      expect(result.data.length).toBeLessThanOrEqual(3);
      expect(result.total).toBeGreaterThanOrEqual(5);
      expect(result.totalPages).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Business Rule Validation - TDD', () => {
    test('should prevent allocation outside project dates', async () => {
      // Try to create allocation that starts before project start date
      const input: CreateResourceAllocationInput = {
        employeeId: testEmployeeId,
        projectId: testProjectId,
        allocatedHours: 20,
        roleOnProject: 'Early Bird',
        startDate: new Date('2023-12-01'), // Before project start (2024-01-01)
        endDate: new Date('2024-01-15')
      };

      await expect(AllocationService.createAllocation(input))
        .rejects.toThrow('Allocation start date cannot be before project start date');
    });

    test('should prevent allocation beyond project end date', async () => {
      // Try to create allocation that ends after project end date  
      const input: CreateResourceAllocationInput = {
        employeeId: testEmployeeId,
        projectId: testProjectId,
        allocatedHours: 20,
        roleOnProject: 'Late Finisher',
        startDate: new Date('2024-12-01'),
        endDate: new Date('2025-01-15') // After project end (2024-12-31)
      };

      await expect(AllocationService.createAllocation(input))
        .rejects.toThrow('Allocation end date cannot be after project end date');
    });
  });
});