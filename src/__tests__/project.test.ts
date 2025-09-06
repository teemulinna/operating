import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import { DatabaseService } from '../database/database.service';
import { ProjectService } from '../services/project.service';
import { ProjectModel } from '../models/project.model';
import { 
  Project, 
  CreateProjectInput, 
  UpdateProjectInput,
  ProjectStatus,
  DatabaseError 
} from '../types';

describe('Project Management System', () => {
  let dbService: DatabaseService;
  let projectService: ProjectService;

  beforeAll(async () => {
    // Set test environment
    process.env.NODE_ENV = 'test';
    
    // Initialize database service
    dbService = DatabaseService.getInstance();
    await dbService.connect();
    
    // Initialize project model with pool
    ProjectModel.initialize(dbService.getPool()!);
    
    // Create project service
    projectService = new ProjectService();
    
    // Ensure test database is clean and has required schema
    await dbService.query('DROP TABLE IF EXISTS projects CASCADE');
    await dbService.query(`
      CREATE TABLE projects (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL UNIQUE,
        description TEXT,
        client_name VARCHAR(255),
        status VARCHAR(50) NOT NULL DEFAULT 'planning',
        start_date DATE NOT NULL,
        end_date DATE NOT NULL,
        budget DECIMAL(12,2),
        hourly_rate DECIMAL(8,2),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_by INTEGER,
        CONSTRAINT chk_status CHECK (status IN ('planning', 'active', 'completed', 'on-hold')),
        CONSTRAINT chk_dates CHECK (end_date >= start_date),
        CONSTRAINT chk_budget CHECK (budget >= 0),
        CONSTRAINT chk_hourly_rate CHECK (hourly_rate >= 0)
      )
    `);
    
    // Create indexes
    await dbService.query('CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status)');
    await dbService.query('CREATE INDEX IF NOT EXISTS idx_projects_client ON projects(client_name)');
    await dbService.query('CREATE INDEX IF NOT EXISTS idx_projects_dates ON projects(start_date, end_date)');
  });

  afterAll(async () => {
    if (dbService) {
      await DatabaseService.disconnect();
    }
  });

  beforeEach(async () => {
    // Clean up test data before each test
    await dbService.query('DELETE FROM projects');
    await dbService.query('ALTER SEQUENCE projects_id_seq RESTART WITH 1');
  });

  describe('Project Model Validation', () => {
    it('should create a project with valid data', async () => {
      const validProject: CreateProjectInput = {
        name: 'Test Project',
        description: 'A test project description',
        clientName: 'Test Client',
        status: ProjectStatus.PLANNING,
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-06-30'),
        budget: 50000,
        hourlyRate: 100,
        createdBy: 1
      };

      const project = await projectService.createProject(validProject);

      expect(project).toBeDefined();
      expect(project.name).toBe(validProject.name);
      expect(project.clientName).toBe(validProject.clientName);
      expect(project.status).toBe(ProjectStatus.PLANNING);
      expect(project.budget).toBe(50000);
      expect(project.hourlyRate).toBe(100);
      expect(project.id).toBeDefined();
      expect(project.createdAt).toBeDefined();
    });

    it('should reject project with end date before start date', async () => {
      const invalidProject: CreateProjectInput = {
        name: 'Invalid Date Project',
        description: 'Project with invalid date range',
        clientName: 'Test Client',
        status: ProjectStatus.PLANNING,
        startDate: new Date('2024-06-30'),
        endDate: new Date('2024-01-01'), // Invalid: end before start
        budget: 10000,
        hourlyRate: 75
      };

      await expect(projectService.createProject(invalidProject))
        .rejects.toThrow('End date must be after start date');
    });

    it('should reject project with negative budget', async () => {
      const invalidProject: CreateProjectInput = {
        name: 'Negative Budget Project',
        description: 'Project with negative budget',
        clientName: 'Test Client',
        status: ProjectStatus.PLANNING,
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-06-30'),
        budget: -1000, // Invalid: negative budget
        hourlyRate: 100
      };

      await expect(projectService.createProject(invalidProject))
        .rejects.toThrow('Budget must be positive');
    });

    it('should reject project with negative hourly rate', async () => {
      const invalidProject: CreateProjectInput = {
        name: 'Negative Rate Project',
        description: 'Project with negative hourly rate',
        clientName: 'Test Client',
        status: ProjectStatus.PLANNING,
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-06-30'),
        budget: 10000,
        hourlyRate: -50 // Invalid: negative hourly rate
      };

      await expect(projectService.createProject(invalidProject))
        .rejects.toThrow('Hourly rate must be positive');
    });

    it('should reject project with duplicate name', async () => {
      const project1: CreateProjectInput = {
        name: 'Duplicate Name Project',
        description: 'First project',
        clientName: 'Client 1',
        status: ProjectStatus.PLANNING,
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-06-30'),
        budget: 10000,
        hourlyRate: 100
      };

      const project2: CreateProjectInput = {
        name: 'Duplicate Name Project', // Same name
        description: 'Second project',
        clientName: 'Client 2',
        status: ProjectStatus.PLANNING,
        startDate: new Date('2024-07-01'),
        endDate: new Date('2024-12-31'),
        budget: 15000,
        hourlyRate: 120
      };

      await projectService.createProject(project1);
      
      await expect(projectService.createProject(project2))
        .rejects.toThrow('already exists');
    });
  });

  describe('Project CRUD Operations', () => {
    let testProject: Project;

    beforeEach(async () => {
      const projectInput: CreateProjectInput = {
        name: 'CRUD Test Project',
        description: 'Project for testing CRUD operations',
        clientName: 'CRUD Client',
        status: ProjectStatus.PLANNING,
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-06-30'),
        budget: 25000,
        hourlyRate: 90
      };

      testProject = await projectService.createProject(projectInput);
    });

    it('should retrieve project by ID', async () => {
      const retrievedProject = await projectService.getProjectById(testProject.id);

      expect(retrievedProject).toBeDefined();
      expect(retrievedProject!.id).toBe(testProject.id);
      expect(retrievedProject!.name).toBe(testProject.name);
      expect(retrievedProject!.clientName).toBe(testProject.clientName);
    });

    it('should return null for non-existent project ID', async () => {
      const nonExistentProject = await projectService.getProjectById('999');

      expect(nonExistentProject).toBeNull();
    });

    it('should update project successfully', async () => {
      const updateData: UpdateProjectInput = {
        name: 'Updated CRUD Project',
        description: 'Updated description',
        status: ProjectStatus.ACTIVE,
        budget: 30000,
        hourlyRate: 110
      };

      const updatedProject = await projectService.updateProject(testProject.id, updateData);

      expect(updatedProject).toBeDefined();
      expect(updatedProject.name).toBe(updateData.name);
      expect(updatedProject.description).toBe(updateData.description);
      expect(updatedProject.status).toBe(ProjectStatus.ACTIVE);
      expect(updatedProject.budget).toBe(30000);
      expect(updatedProject.hourlyRate).toBe(110);
      expect(updatedProject.updatedAt.getTime()).toBeGreaterThan(testProject.updatedAt.getTime());
    });

    it('should delete project successfully', async () => {
      const deletedProject = await projectService.deleteProject(testProject.id);

      expect(deletedProject).toBeDefined();
      expect(deletedProject.id).toBe(testProject.id);

      // Verify project is deleted
      const retrievedProject = await projectService.getProjectById(testProject.id);
      expect(retrievedProject).toBeNull();
    });

    it('should throw error when updating non-existent project', async () => {
      const updateData: UpdateProjectInput = {
        name: 'Updated Non-Existent Project'
      };

      await expect(projectService.updateProject('999', updateData))
        .rejects.toThrow('Project not found');
    });

    it('should throw error when deleting non-existent project', async () => {
      await expect(projectService.deleteProject('999'))
        .rejects.toThrow('Project not found');
    });
  });

  describe('Project Status Transitions', () => {
    let testProject: Project;

    beforeEach(async () => {
      const projectInput: CreateProjectInput = {
        name: 'Status Transition Test',
        description: 'Testing status transitions',
        clientName: 'Status Client',
        status: ProjectStatus.PLANNING,
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-06-30'),
        budget: 20000,
        hourlyRate: 85
      };

      testProject = await projectService.createProject(projectInput);
    });

    it('should allow valid status transitions', async () => {
      // Planning -> Active
      let updated = await projectService.updateProject(testProject.id, { 
        status: ProjectStatus.ACTIVE 
      });
      expect(updated.status).toBe(ProjectStatus.ACTIVE);

      // Active -> On Hold
      updated = await projectService.updateProject(testProject.id, { 
        status: ProjectStatus.ON_HOLD 
      });
      expect(updated.status).toBe(ProjectStatus.ON_HOLD);

      // On Hold -> Active
      updated = await projectService.updateProject(testProject.id, { 
        status: ProjectStatus.ACTIVE 
      });
      expect(updated.status).toBe(ProjectStatus.ACTIVE);

      // Active -> Completed
      updated = await projectService.updateProject(testProject.id, { 
        status: ProjectStatus.COMPLETED 
      });
      expect(updated.status).toBe(ProjectStatus.COMPLETED);
    });

    it('should prevent invalid status transitions', async () => {
      // Planning -> Completed (invalid)
      await expect(projectService.updateProject(testProject.id, { 
        status: ProjectStatus.COMPLETED 
      })).rejects.toThrow('Invalid status transition');

      // Set to Active first
      await projectService.updateProject(testProject.id, { 
        status: ProjectStatus.ACTIVE 
      });

      // Complete the project
      await projectService.updateProject(testProject.id, { 
        status: ProjectStatus.COMPLETED 
      });

      // Try to revert from Completed to Active (invalid)
      await expect(projectService.updateProject(testProject.id, { 
        status: ProjectStatus.ACTIVE 
      })).rejects.toThrow('Cannot change status from completed');
    });
  });

  describe('Project Query and Filtering', () => {
    beforeEach(async () => {
      // Create multiple test projects
      const projects: CreateProjectInput[] = [
        {
          name: 'Project Alpha',
          description: 'First test project',
          clientName: 'Client A',
          status: ProjectStatus.PLANNING,
          startDate: new Date('2024-01-01'),
          endDate: new Date('2024-06-30'),
          budget: 10000,
          hourlyRate: 80
        },
        {
          name: 'Project Beta',
          description: 'Second test project',
          clientName: 'Client B',
          status: ProjectStatus.ACTIVE,
          startDate: new Date('2024-02-01'),
          endDate: new Date('2024-08-31'),
          budget: 25000,
          hourlyRate: 100
        },
        {
          name: 'Project Gamma',
          description: 'Third test project',
          clientName: 'Client A',
          status: ProjectStatus.COMPLETED,
          startDate: new Date('2024-03-01'),
          endDate: new Date('2024-09-30'),
          budget: 15000,
          hourlyRate: 90
        }
      ];

      for (const project of projects) {
        await projectService.createProject(project);
      }
    });

    it('should get all projects with pagination', async () => {
      const result = await projectService.getProjects({}, 1, 10);

      expect(result).toBeDefined();
      expect(result.data).toHaveLength(3);
      expect(result.total).toBe(3);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(10);
      expect(result.totalPages).toBe(1);
    });

    it('should filter projects by status', async () => {
      const result = await projectService.getProjects({ status: ProjectStatus.ACTIVE });

      expect(result.data).toHaveLength(1);
      expect(result.data[0].name).toBe('Project Beta');
      expect(result.data[0].status).toBe(ProjectStatus.ACTIVE);
    });

    it('should filter projects by client name', async () => {
      const result = await projectService.getProjects({ clientName: 'Client A' });

      expect(result.data).toHaveLength(2);
      expect(result.data.every(p => p.clientName === 'Client A')).toBeTruthy();
    });

    it('should sort projects correctly', async () => {
      const result = await projectService.getProjects(
        {}, 1, 10, 'name', 'ASC'
      );

      expect(result.data).toHaveLength(3);
      expect(result.data[0].name).toBe('Project Alpha');
      expect(result.data[1].name).toBe('Project Beta');
      expect(result.data[2].name).toBe('Project Gamma');
    });

    it('should support pagination correctly', async () => {
      const page1 = await projectService.getProjects({}, 1, 2);
      expect(page1.data).toHaveLength(2);
      expect(page1.totalPages).toBe(2);

      const page2 = await projectService.getProjects({}, 2, 2);
      expect(page2.data).toHaveLength(1);
      expect(page2.page).toBe(2);
    });
  });

  describe('Project Statistics', () => {
    beforeEach(async () => {
      // Create projects for statistics testing
      const projects: CreateProjectInput[] = [
        {
          name: 'Stats Project 1',
          clientName: 'Client X',
          status: ProjectStatus.PLANNING,
          startDate: new Date('2024-01-01'),
          endDate: new Date('2024-06-30'),
          budget: 10000,
          hourlyRate: 80
        },
        {
          name: 'Stats Project 2',
          clientName: 'Client Y',
          status: ProjectStatus.ACTIVE,
          startDate: new Date('2024-02-01'),
          endDate: new Date('2024-08-31'),
          budget: 25000,
          hourlyRate: 100
        },
        {
          name: 'Stats Project 3',
          clientName: 'Client Z',
          status: ProjectStatus.COMPLETED,
          startDate: new Date('2024-03-01'),
          endDate: new Date('2024-09-30'),
          budget: 15000,
          hourlyRate: 90
        },
        {
          name: 'Stats Project 4',
          clientName: 'Client W',
          status: ProjectStatus.ON_HOLD,
          startDate: new Date('2024-04-01'),
          endDate: new Date('2024-10-31'),
          budget: 20000,
          hourlyRate: 95
        }
      ];

      for (const project of projects) {
        await projectService.createProject(project);
      }
    });

    it('should calculate project statistics correctly', async () => {
      const stats = await projectService.getProjectStatistics();

      expect(stats).toBeDefined();
      expect(stats.totalProjects).toBe(4);
      expect(stats.projectsByStatus.planning).toBe(1);
      expect(stats.projectsByStatus.active).toBe(1);
      expect(stats.projectsByStatus.completed).toBe(1);
      expect(stats.projectsByStatus['on-hold']).toBe(1);
      
      expect(stats.totalBudget).toBe(70000); // 10k + 25k + 15k + 20k
      expect(stats.averageBudget).toBe(17500); // 70k / 4
      expect(stats.averageHourlyRate).toBe(91.25); // (80 + 100 + 90 + 95) / 4
    });
  });

  describe('Project Budget Calculations', () => {
    it('should calculate project costs correctly', async () => {
      const projectInput: CreateProjectInput = {
        name: 'Budget Calc Project',
        description: 'Testing budget calculations',
        clientName: 'Budget Client',
        status: ProjectStatus.PLANNING,
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-06-30'),
        budget: 50000,
        hourlyRate: 100
      };

      const project = await projectService.createProject(projectInput);
      
      // Test budget utilization calculation (this would typically involve time tracking)
      expect(project.budget).toBe(50000);
      expect(project.hourlyRate).toBe(100);
      
      // In a full implementation, we'd have methods to calculate:
      // - Total hours worked vs budgeted hours (budget/hourlyRate)
      // - Budget utilization percentage
      // - Remaining budget
      const budgetedHours = project.budget! / project.hourlyRate!;
      expect(budgetedHours).toBe(500); // 50,000 / 100 = 500 hours
    });
  });
});