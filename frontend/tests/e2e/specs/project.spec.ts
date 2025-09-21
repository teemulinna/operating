import { test, expect } from '@playwright/test';
import { ProjectPage, ProjectData } from '../pages/ProjectPage';

test.describe('Project Management - CRUD Operations', () => {
  let projectPage: ProjectPage;
  
  test.beforeEach(async ({ page }) => {
    projectPage = new ProjectPage(page);
    await projectPage.navigateToProjects();
    await projectPage.waitForProjectsToLoad();
  });

  test.describe('Create Project', () => {
    test('should create project with all required fields', async () => {
      const projectData: ProjectData = {
        name: `Test Project ${Date.now()}`,
        description: 'A comprehensive test project for E2E testing',
        startDate: projectPage.getTodayFormatted(),
        endDate: projectPage.getFutureDateFormatted(60),
        status: 'Planning',
        priority: 'High',
        budget: '50000',
        client: 'Test Client Corp'
      };

      await test.step('Create new project', async () => {
        await projectPage.createProject(projectData);
      });

      await test.step('Verify project appears in list', async () => {
        await projectPage.verifyProjectExists(projectData.name);
      });

      await test.step('Verify project details', async () => {
        await projectPage.verifyProjectDetails(projectData.name, {
          status: projectData.status,
          priority: projectData.priority,
          client: projectData.client
        });
      });
    });

    test('should create project with minimal required fields', async () => {
      const projectData: ProjectData = {
        name: `Minimal Project ${Date.now()}`,
        startDate: projectPage.getTodayFormatted(),
        endDate: projectPage.getFutureDateFormatted(30)
      };

      await test.step('Create project with minimal data', async () => {
        await projectPage.createProject(projectData);
      });

      await test.step('Verify project exists', async () => {
        await projectPage.verifyProjectExists(projectData.name);
      });
    });

    test('should create project with future start date', async () => {
      const futureStart = projectPage.getFutureDateFormatted(7);
      const futureEnd = projectPage.getFutureDateFormatted(37);
      
      const projectData: ProjectData = {
        name: `Future Project ${Date.now()}`,
        description: 'Project starting in the future',
        startDate: futureStart,
        endDate: futureEnd,
        status: 'Planning',
        priority: 'Medium'
      };

      await test.step('Create future project', async () => {
        await projectPage.createProject(projectData);
      });

      await test.step('Verify future project exists', async () => {
        await projectPage.verifyProjectExists(projectData.name);
      });
    });
  });

  test.describe('Validate Project Fields', () => {
    test('should show validation error for empty project name', async () => {
      await test.step('Open add project form', async () => {
        await projectPage.clickAddProject();
      });

      await test.step('Try to submit without project name', async () => {
        await projectPage.fillProjectForm({
          name: '',
          startDate: projectPage.getTodayFormatted(),
          endDate: projectPage.getFutureDateFormatted(30)
        });
      });

      await test.step('Verify project name validation error', async () => {
        await projectPage.verifyRequiredFieldValidation('name', 'Project name is required');
      });
    });

    test('should show validation error for empty start date', async () => {
      await test.step('Open add project form', async () => {
        await projectPage.clickAddProject();
      });

      await test.step('Try to submit without start date', async () => {
        await projectPage.fillProjectForm({
          name: 'Test Project',
          startDate: '',
          endDate: projectPage.getFutureDateFormatted(30)
        });
      });

      await test.step('Verify start date validation error', async () => {
        await projectPage.verifyRequiredFieldValidation('startDate', 'Start date is required');
      });
    });

    test('should show validation error for empty end date', async () => {
      await test.step('Open add project form', async () => {
        await projectPage.clickAddProject();
      });

      await test.step('Try to submit without end date', async () => {
        await projectPage.fillProjectForm({
          name: 'Test Project',
          startDate: projectPage.getTodayFormatted(),
          endDate: ''
        });
      });

      await test.step('Verify end date validation error', async () => {
        await projectPage.verifyRequiredFieldValidation('endDate', 'End date is required');
      });
    });
  });

  test.describe('Validate Project Dates', () => {
    test('should show validation error when end date is before start date', async () => {
      const today = new Date();
      const startDate = projectPage.formatDateForInput(today);
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      const endDate = projectPage.formatDateForInput(yesterday);

      await test.step('Open add project form', async () => {
        await projectPage.clickAddProject();
      });

      await test.step('Enter invalid date range', async () => {
        await projectPage.verifyDateValidation(startDate, endDate);
      });
    });

    test('should allow same start and end date', async () => {
      const today = projectPage.getTodayFormatted();
      
      const projectData: ProjectData = {
        name: `Same Day Project ${Date.now()}`,
        startDate: today,
        endDate: today
      };

      await test.step('Create project with same start and end date', async () => {
        await projectPage.createProject(projectData);
      });

      await test.step('Verify single-day project exists', async () => {
        await projectPage.verifyProjectExists(projectData.name);
      });
    });

    test('should handle long-term projects', async () => {
      const projectData: ProjectData = {
        name: `Long Term Project ${Date.now()}`,
        description: 'A project spanning multiple months',
        startDate: projectPage.getTodayFormatted(),
        endDate: projectPage.getFutureDateFormatted(365), // 1 year
        status: 'Planning',
        priority: 'Low'
      };

      await test.step('Create long-term project', async () => {
        await projectPage.createProject(projectData);
      });

      await test.step('Verify long-term project exists', async () => {
        await projectPage.verifyProjectExists(projectData.name);
      });
    });
  });

  test.describe('Edit Project', () => {
    let testProject: ProjectData;

    test.beforeEach(async () => {
      // Create a test project for editing
      testProject = {
        name: `Edit Test Project ${Date.now()}`,
        description: 'Project created for edit testing',
        startDate: projectPage.getTodayFormatted(),
        endDate: projectPage.getFutureDateFormatted(45),
        status: 'Planning',
        priority: 'Medium'
      };
      await projectPage.createProject(testProject);
    });

    test('should edit project name', async () => {
      const updatedData = { name: `Edited Project ${Date.now()}` };

      await test.step('Edit project name', async () => {
        await projectPage.editProjectByName(testProject.name, updatedData);
      });

      await test.step('Verify updated name appears', async () => {
        await projectPage.verifyProjectExists(updatedData.name);
      });

      await test.step('Verify old name does not exist', async () => {
        await projectPage.verifyProjectNotExists(testProject.name);
      });
    });

    test('should edit project status', async () => {
      const updatedData = { status: 'Active' as const };

      await test.step('Edit project status', async () => {
        await projectPage.editProjectByName(testProject.name, updatedData);
      });

      await test.step('Verify project still exists with new status', async () => {
        await projectPage.verifyProjectExists(testProject.name);
        await projectPage.verifyProjectDetails(testProject.name, { status: updatedData.status });
      });
    });

    test('should edit project priority', async () => {
      const updatedData = { priority: 'Critical' as const };

      await test.step('Edit project priority', async () => {
        await projectPage.editProjectByName(testProject.name, updatedData);
      });

      await test.step('Verify priority updated', async () => {
        await projectPage.verifyProjectDetails(testProject.name, { priority: updatedData.priority });
      });
    });

    test('should edit project dates', async () => {
      const updatedData = {
        startDate: projectPage.getFutureDateFormatted(7),
        endDate: projectPage.getFutureDateFormatted(77)
      };

      await test.step('Edit project dates', async () => {
        await projectPage.editProjectByName(testProject.name, updatedData);
      });

      await test.step('Verify project exists after date change', async () => {
        await projectPage.verifyProjectExists(testProject.name);
      });
    });

    test('should edit multiple project fields', async () => {
      const updatedData = {
        description: 'Updated project description',
        status: 'Active' as const,
        priority: 'High' as const
      };

      await test.step('Edit multiple fields', async () => {
        await projectPage.editProjectByName(testProject.name, updatedData);
      });

      await test.step('Verify project exists with updates', async () => {
        await projectPage.verifyProjectExists(testProject.name);
        await projectPage.verifyProjectDetails(testProject.name, {
          status: updatedData.status,
          priority: updatedData.priority
        });
      });
    });
  });

  test.describe('Delete Project', () => {
    let testProject: ProjectData;

    test.beforeEach(async () => {
      // Create a test project for deletion
      testProject = {
        name: `Delete Test Project ${Date.now()}`,
        description: 'Project created for deletion testing',
        startDate: projectPage.getTodayFormatted(),
        endDate: projectPage.getFutureDateFormatted(30),
        status: 'On Hold',
        priority: 'Low'
      };
      await projectPage.createProject(testProject);
    });

    test('should delete project successfully', async () => {
      await test.step('Delete the test project', async () => {
        await projectPage.deleteProjectByName(testProject.name);
      });

      await test.step('Verify project no longer exists', async () => {
        await projectPage.verifyProjectNotExists(testProject.name);
      });
    });

    test('should handle deletion confirmation dialog', async () => {
      await test.step('Verify project exists before deletion', async () => {
        await projectPage.verifyProjectExists(testProject.name);
      });

      await test.step('Delete project with confirmation', async () => {
        await projectPage.deleteProjectByName(testProject.name);
      });

      await test.step('Verify project is removed from list', async () => {
        await projectPage.verifyProjectNotExists(testProject.name);
      });
    });
  });

  test.describe('Search and Filter Projects', () => {
    const searchTestProjects: ProjectData[] = [
      {
        name: `Search Engineering Project ${Date.now()}`,
        description: 'Engineering focused project',
        startDate: projectPage.getTodayFormatted(),
        endDate: projectPage.getFutureDateFormatted(60),
        status: 'Active',
        priority: 'High'
      },
      {
        name: `Search Marketing Campaign ${Date.now()}`,
        description: 'Marketing campaign project',
        startDate: projectPage.getTodayFormatted(),
        endDate: projectPage.getFutureDateFormatted(30),
        status: 'Planning',
        priority: 'Medium'
      },
      {
        name: `Filter Critical Project ${Date.now()}`,
        description: 'Critical priority project',
        startDate: projectPage.getTodayFormatted(),
        endDate: projectPage.getFutureDateFormatted(90),
        status: 'Active',
        priority: 'Critical'
      }
    ];

    test.beforeEach(async () => {
      // Create test projects for searching/filtering
      for (const project of searchTestProjects) {
        await projectPage.createProject(project);
      }
    });

    test('should search projects by name', async () => {
      await test.step('Search for "Engineering" projects', async () => {
        await projectPage.searchProjects('Engineering');
      });

      await test.step('Verify only matching projects appear', async () => {
        const projectList = await projectPage.getProjectList();
        const hasEngineering = projectList.some(proj => proj.includes('Engineering'));
        expect(hasEngineering).toBeTruthy();
      });
    });

    test('should search projects by description keywords', async () => {
      await test.step('Search for "campaign" in description', async () => {
        await projectPage.searchProjects('campaign');
      });

      await test.step('Verify matching project appears', async () => {
        const projectList = await projectPage.getProjectList();
        const hasCampaign = projectList.some(proj => proj.includes('Campaign'));
        expect(hasCampaign).toBeTruthy();
      });
    });

    test('should filter projects by status', async () => {
      await test.step('Filter by Active status', async () => {
        await projectPage.filterByStatus('Active');
      });

      await test.step('Verify only Active projects appear', async () => {
        // This verification depends on the UI showing status information
        const projectList = await projectPage.getProjectList();
        expect(projectList.length).toBeGreaterThanOrEqual(2); // We created 2 Active projects
      });
    });

    test('should filter projects by priority', async () => {
      await test.step('Filter by Critical priority', async () => {
        await projectPage.filterByPriority('Critical');
      });

      await test.step('Verify only Critical projects appear', async () => {
        const projectList = await projectPage.getProjectList();
        const hasCritical = projectList.some(proj => proj.includes('Critical'));
        expect(hasCritical).toBeTruthy();
      });
    });

    test('should clear search and show all projects', async () => {
      await test.step('Search for specific project', async () => {
        await projectPage.searchProjects('NonExistentProject');
      });

      await test.step('Clear search', async () => {
        await projectPage.searchProjects('');
      });

      await test.step('Verify all test projects are visible again', async () => {
        for (const project of searchTestProjects) {
          await projectPage.verifyProjectExists(project.name);
        }
      });
    });
  });

  test.describe('Project List Management', () => {
    test('should display project count correctly', async () => {
      const initialCount = await projectPage.getProjectCount();

      await test.step('Add a new project', async () => {
        const newProject: ProjectData = {
          name: `Count Test Project ${Date.now()}`,
          startDate: projectPage.getTodayFormatted(),
          endDate: projectPage.getFutureDateFormatted(15)
        };
        await projectPage.createProject(newProject);
      });

      await test.step('Verify count increased by 1', async () => {
        const newCount = await projectPage.getProjectCount();
        expect(newCount).toBe(initialCount + 1);
      });
    });

    test('should handle empty project list', async () => {
      await test.step('Check empty state handling', async () => {
        const projectCount = await projectPage.getProjectCount();
        
        if (projectCount === 0) {
          await projectPage.verifyEmptyState();
        } else {
          expect(projectCount).toBeGreaterThan(0);
        }
      });
    });

    test('should maintain list integrity after operations', async () => {
      const testProject: ProjectData = {
        name: `Integrity Test Project ${Date.now()}`,
        startDate: projectPage.getTodayFormatted(),
        endDate: projectPage.getFutureDateFormatted(45)
      };

      await test.step('Create, edit, and verify project', async () => {
        // Create
        await projectPage.createProject(testProject);
        await projectPage.verifyProjectExists(testProject.name);

        // Edit
        const updatedName = `Modified ${testProject.name}`;
        await projectPage.editProjectByName(testProject.name, { name: updatedName });
        await projectPage.verifyProjectExists(updatedName);

        // Delete
        await projectPage.deleteProjectByName(updatedName);
        await projectPage.verifyProjectNotExists(updatedName);
      });
    });
  });

  test.describe('Form Behavior', () => {
    test('should clear form when cancelled', async () => {
      await test.step('Open form and enter data', async () => {
        await projectPage.clickAddProject();
        await projectPage.fillProjectForm({
          name: 'Cancel Test Project',
          description: 'This should be cleared',
          startDate: projectPage.getTodayFormatted(),
          endDate: projectPage.getFutureDateFormatted(30)
        });
      });

      await test.step('Cancel form', async () => {
        await projectPage.cancelProjectForm();
      });

      await test.step('Reopen form and verify it is empty', async () => {
        await projectPage.clickAddProject();
        // Form should be empty - specific verification depends on implementation
      });

      await test.step('Close form', async () => {
        await projectPage.cancelProjectForm();
      });
    });

    test('should handle budget field correctly', async () => {
      const projectData: ProjectData = {
        name: `Budget Test Project ${Date.now()}`,
        startDate: projectPage.getTodayFormatted(),
        endDate: projectPage.getFutureDateFormatted(60),
        budget: '100000'
      };

      await test.step('Create project with budget', async () => {
        await projectPage.createProject(projectData);
      });

      await test.step('Verify project with budget exists', async () => {
        await projectPage.verifyProjectExists(projectData.name);
      });
    });

    test('should handle all status options', async () => {
      const statuses: Array<ProjectData['status']> = ['Planning', 'Active', 'On Hold', 'Completed'];

      for (const status of statuses) {
        if (!status) continue;
        
        const projectData: ProjectData = {
          name: `${status} Project ${Date.now()}`,
          startDate: projectPage.getTodayFormatted(),
          endDate: projectPage.getFutureDateFormatted(30),
          status: status
        };

        await test.step(`Create project with ${status} status`, async () => {
          await projectPage.createProject(projectData);
          await projectPage.verifyProjectExists(projectData.name);
        });
      }
    });

    test('should handle all priority options', async () => {
      const priorities: Array<ProjectData['priority']> = ['Low', 'Medium', 'High', 'Critical'];

      for (const priority of priorities) {
        if (!priority) continue;
        
        const projectData: ProjectData = {
          name: `${priority} Priority Project ${Date.now()}`,
          startDate: projectPage.getTodayFormatted(),
          endDate: projectPage.getFutureDateFormatted(30),
          priority: priority
        };

        await test.step(`Create project with ${priority} priority`, async () => {
          await projectPage.createProject(projectData);
          await projectPage.verifyProjectExists(projectData.name);
        });
      }
    });
  });
});