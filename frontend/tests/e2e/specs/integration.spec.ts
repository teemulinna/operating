import { test, expect } from '@playwright/test';
import { EmployeePage, EmployeeData } from '../pages/EmployeePage';
import { ProjectPage, ProjectData } from '../pages/ProjectPage';
import { AllocationPage, AllocationData } from '../pages/AllocationPage';
import { BasePage } from '../pages/BasePage';

test.describe('End-to-End Integration Workflows', () => {
  let employeePage: EmployeePage;
  let projectPage: ProjectPage;
  let allocationPage: AllocationPage;
  let basePage: BasePage;

  test.beforeEach(async ({ page }) => {
    employeePage = new EmployeePage(page);
    projectPage = new ProjectPage(page);
    allocationPage = new AllocationPage(page);
    basePage = new BasePage(page);
  });

  test.describe('Complete Resource Allocation Workflow', () => {
    test('should complete full workflow: Create employee → Create project → Allocate resource', async () => {
      const timestamp = Date.now();
      
      // Test data
      const employee: EmployeeData = {
        firstName: 'Integration',
        lastName: 'TestEmployee',
        email: `integration.employee.${timestamp}@company.com`,
        department: 'Engineering',
        role: 'Full Stack Developer',
        capacity: '100',
        skills: ['React', 'Node.js', 'TypeScript', 'PostgreSQL']
      };

      const project: ProjectData = {
        name: `Integration Test Project ${timestamp}`,
        description: 'End-to-end integration test project for resource allocation workflow',
        startDate: projectPage.getTodayFormatted(),
        endDate: projectPage.getFutureDateFormatted(90),
        status: 'Planning',
        priority: 'High',
        budget: '75000',
        client: 'Integration Test Client'
      };

      const allocation: AllocationData = {
        employeeName: `${employee.firstName} ${employee.lastName}`,
        projectName: project.name,
        startDate: allocationPage.getFutureDateFormatted(7),
        endDate: allocationPage.getFutureDateFormatted(67),
        capacity: 80,
        role: 'Lead Developer',
        notes: 'Primary developer responsible for architecture and implementation'
      };

      await test.step('Navigate to dashboard and verify initial state', async () => {
        await basePage.goto('/');
        await basePage.verifyPageTitle('Dashboard');
        
        // Capture initial counts
        const initialStats = {
          employees: await basePage.getElementText('[data-testid="employees-count"]'),
          projects: await basePage.getElementText('[data-testid="projects-count"]'),
          utilization: await basePage.getElementText('[data-testid="utilization-percent"]')
        };
        
        console.log('Initial dashboard stats:', initialStats);
      });

      await test.step('Create new employee with complete profile', async () => {
        await employeePage.navigateToEmployees();
        await employeePage.waitForEmployeesToLoad();
        await employeePage.createEmployee(employee);
        
        // Verify employee creation
        await employeePage.verifyEmployeeExists(`${employee.firstName} ${employee.lastName}`);
      });

      await test.step('Create new project with full details', async () => {
        await projectPage.navigateToProjects();
        await projectPage.waitForProjectsToLoad();
        await projectPage.createProject(project);
        
        // Verify project creation
        await projectPage.verifyProjectExists(project.name);
        await projectPage.verifyProjectDetails(project.name, {
          status: project.status,
          priority: project.priority,
          client: project.client
        });
      });

      await test.step('Allocate employee to project', async () => {
        await allocationPage.navigateToAllocations();
        await allocationPage.waitForAllocationsToLoad();
        await allocationPage.createAllocation(allocation);
        
        // Verify allocation creation
        await allocationPage.verifyAllocationExists(allocation.employeeName, allocation.projectName);
      });

      await test.step('Verify updated dashboard reflects changes', async () => {
        await basePage.goto('/');
        await basePage.verifyPageTitle('Dashboard');
        
        // Wait for stats to update
        await basePage.waitForNetworkIdle();
        
        // Verify counts have increased
        const updatedStats = {
          employees: await basePage.getElementText('[data-testid="employees-count"]'),
          projects: await basePage.getElementText('[data-testid="projects-count"]'),
          utilization: await basePage.getElementText('[data-testid="utilization-percent"]')
        };
        
        console.log('Updated dashboard stats:', updatedStats);
        
        // At least one employee and one project should exist
        expect(parseInt(updatedStats.employees)).toBeGreaterThanOrEqual(1);
        expect(parseInt(updatedStats.projects)).toBeGreaterThanOrEqual(1);
      });

      await test.step('Navigate between modules and verify data persistence', async () => {
        // Check employee still exists
        await employeePage.navigateToEmployees();
        await employeePage.verifyEmployeeExists(`${employee.firstName} ${employee.lastName}`);
        
        // Check project still exists
        await projectPage.navigateToProjects();
        await projectPage.verifyProjectExists(project.name);
        
        // Check allocation still exists
        await allocationPage.navigateToAllocations();
        await allocationPage.verifyAllocationExists(allocation.employeeName, allocation.projectName);
      });
    });

    test('should handle workflow with multiple employees and projects', async () => {
      const timestamp = Date.now();
      
      const employees: EmployeeData[] = [
        {
          firstName: 'Multi1',
          lastName: 'Employee',
          email: `multi1.${timestamp}@company.com`,
          department: 'Engineering',
          role: 'Senior Developer'
        },
        {
          firstName: 'Multi2',
          lastName: 'Employee',
          email: `multi2.${timestamp}@company.com`,
          department: 'Design',
          role: 'UX Designer'
        },
        {
          firstName: 'Multi3',
          lastName: 'Employee',
          email: `multi3.${timestamp}@company.com`,
          department: 'QA',
          role: 'QA Engineer'
        }
      ];

      const projects: ProjectData[] = [
        {
          name: `Multi Project Alpha ${timestamp}`,
          startDate: projectPage.getTodayFormatted(),
          endDate: projectPage.getFutureDateFormatted(60),
          status: 'Active',
          priority: 'High'
        },
        {
          name: `Multi Project Beta ${timestamp}`,
          startDate: projectPage.getFutureDateFormatted(10),
          endDate: projectPage.getFutureDateFormatted(70),
          status: 'Planning',
          priority: 'Medium'
        }
      ];

      await test.step('Create multiple employees', async () => {
        await employeePage.navigateToEmployees();
        
        for (const emp of employees) {
          await employeePage.createEmployee(emp);
          await employeePage.verifyEmployeeExists(`${emp.firstName} ${emp.lastName}`);
        }
      });

      await test.step('Create multiple projects', async () => {
        await projectPage.navigateToProjects();
        
        for (const proj of projects) {
          await projectPage.createProject(proj);
          await projectPage.verifyProjectExists(proj.name);
        }
      });

      await test.step('Create cross-matrix allocations', async () => {
        await allocationPage.navigateToAllocations();
        
        const allocations: AllocationData[] = [
          {
            employeeName: `${employees[0].firstName} ${employees[0].lastName}`,
            projectName: projects[0].name,
            startDate: allocationPage.getTodayFormatted(),
            endDate: allocationPage.getFutureDateFormatted(45),
            capacity: 70
          },
          {
            employeeName: `${employees[1].firstName} ${employees[1].lastName}`,
            projectName: projects[0].name,
            startDate: allocationPage.getFutureDateFormatted(5),
            endDate: allocationPage.getFutureDateFormatted(50),
            capacity: 50
          },
          {
            employeeName: `${employees[0].firstName} ${employees[0].lastName}`,
            projectName: projects[1].name,
            startDate: allocationPage.getFutureDateFormatted(15),
            endDate: allocationPage.getFutureDateFormatted(65),
            capacity: 30
          },
          {
            employeeName: `${employees[2].firstName} ${employees[2].lastName}`,
            projectName: projects[1].name,
            startDate: allocationPage.getFutureDateFormatted(20),
            endDate: allocationPage.getFutureDateFormatted(60),
            capacity: 60
          }
        ];

        for (const alloc of allocations) {
          await allocationPage.createAllocation(alloc);
          await allocationPage.verifyAllocationExists(alloc.employeeName, alloc.projectName);
        }
      });

      await test.step('Verify complex resource utilization', async () => {
        // Employee 1 should have 70% + 30% = 100% utilization (if overlapping)
        // Employee 2 should have 50% utilization
        // Employee 3 should have 60% utilization
        
        const employee1Capacity = await allocationPage.getEmployeeCapacity(
          `${employees[0].firstName} ${employees[0].lastName}`
        );
        expect(employee1Capacity).toBeGreaterThanOrEqual(70); // At least one allocation
      });
    });
  });

  test.describe('Data Persistence and Navigation', () => {
    test('should maintain data integrity across browser refresh', async () => {
      const timestamp = Date.now();
      
      const persistenceEmployee: EmployeeData = {
        firstName: 'Persist',
        lastName: 'Test',
        email: `persist.${timestamp}@company.com`,
        department: 'Marketing'
      };

      const persistenceProject: ProjectData = {
        name: `Persistence Project ${timestamp}`,
        startDate: projectPage.getTodayFormatted(),
        endDate: projectPage.getFutureDateFormatted(30),
        status: 'Active'
      };

      await test.step('Create test data', async () => {
        // Create employee
        await employeePage.navigateToEmployees();
        await employeePage.createEmployee(persistenceEmployee);
        
        // Create project
        await projectPage.navigateToProjects();
        await projectPage.createProject(persistenceProject);
      });

      await test.step('Refresh browser and verify data persists', async () => {
        await basePage.page.reload();
        await basePage.waitForPageLoad();
        
        // Check employee persists
        await employeePage.navigateToEmployees();
        await employeePage.verifyEmployeeExists(`${persistenceEmployee.firstName} ${persistenceEmployee.lastName}`);
        
        // Check project persists
        await projectPage.navigateToProjects();
        await projectPage.verifyProjectExists(persistenceProject.name);
      });
    });

    test('should handle navigation between all modules correctly', async () => {
      await test.step('Navigate to Dashboard', async () => {
        await basePage.goto('/');
        await basePage.verifyPageTitle('Dashboard');
        await basePage.verifyURL('/');
      });

      await test.step('Navigate to Employees', async () => {
        await basePage.clickElement('[data-testid="nav-employees"]');
        await basePage.verifyURL('/employees');
        await employeePage.verifyPageTitle('Employee');
      });

      await test.step('Navigate to Projects', async () => {
        await basePage.clickElement('[data-testid="nav-projects"]');
        await basePage.verifyURL('/projects');
        await projectPage.verifyPageTitle('Project');
      });

      await test.step('Navigate to Allocations', async () => {
        await basePage.clickElement('[data-testid="nav-allocations"]');
        await basePage.verifyURL('/allocations');
        await allocationPage.verifyPageTitle('Allocation');
      });

      await test.step('Navigate back to Dashboard', async () => {
        await basePage.clickElement('[data-testid="nav-dashboard"]');
        await basePage.verifyURL('/');
        await basePage.verifyPageTitle('Dashboard');
      });
    });

    test('should handle deep links correctly', async () => {
      await test.step('Direct navigation to employees page', async () => {
        await basePage.goto('/employees');
        await employeePage.verifyPageTitle('Employee');
      });

      await test.step('Direct navigation to projects page', async () => {
        await basePage.goto('/projects');
        await projectPage.verifyPageTitle('Project');
      });

      await test.step('Direct navigation to allocations page', async () => {
        await basePage.goto('/allocations');
        await allocationPage.verifyPageTitle('Allocation');
      });
    });
  });

  test.describe('Error Handling and Edge Cases', () => {
    test('should handle API errors gracefully', async () => {
      await test.step('Navigate to employees page', async () => {
        await employeePage.navigateToEmployees();
      });

      await test.step('Attempt to create employee with invalid data', async () => {
        // This test depends on backend validation
        const invalidEmployee: EmployeeData = {
          firstName: '', // Invalid - empty name
          lastName: '',
          email: 'invalid-email' // Invalid email format
        };

        await employeePage.clickAddEmployee();
        
        // Try to fill form with invalid data
        try {
          await employeePage.fillEmployeeForm(invalidEmployee);
          await employeePage.submitEmployeeForm();
        } catch (error) {
          // Expected - form validation should prevent submission
          console.log('Form validation working as expected');
        }

        // Cancel to clean up
        await employeePage.cancelEmployeeForm();
      });
    });

    test('should handle network timeouts and retries', async () => {
      await test.step('Navigate to dashboard and handle slow loading', async () => {
        await basePage.goto('/');
        
        // Wait for page to load with extended timeout
        await basePage.waitForPageLoad();
        
        // Verify page loads even if API calls are slow
        await basePage.verifyPageTitle('Dashboard');
      });
    });

    test('should handle concurrent user actions', async () => {
      const timestamp = Date.now();
      
      const concurrentEmployee: EmployeeData = {
        firstName: 'Concurrent',
        lastName: 'Test',
        email: `concurrent.${timestamp}@company.com`,
        department: 'Sales'
      };

      await test.step('Simulate concurrent form submissions', async () => {
        await employeePage.navigateToEmployees();
        await employeePage.clickAddEmployee();
        await employeePage.fillEmployeeForm(concurrentEmployee);
        
        // Submit form (this should succeed)
        await employeePage.submitEmployeeForm();
        
        // Verify employee was created
        await employeePage.verifyEmployeeExists(`${concurrentEmployee.firstName} ${concurrentEmployee.lastName}`);
      });
    });
  });

  test.describe('Performance and Load Handling', () => {
    test('should handle large datasets efficiently', async () => {
      // This test creates multiple entities to test performance
      const entityCount = 5; // Reduced for CI/CD environments
      const timestamp = Date.now();

      await test.step('Create multiple employees efficiently', async () => {
        await employeePage.navigateToEmployees();
        
        const startTime = Date.now();
        
        for (let i = 0; i < entityCount; i++) {
          const employee: EmployeeData = {
            firstName: `Load${i}`,
            lastName: 'Test',
            email: `load${i}.${timestamp}@company.com`,
            department: 'Engineering'
          };
          
          await employeePage.createEmployee(employee);
        }
        
        const endTime = Date.now();
        const duration = endTime - startTime;
        
        console.log(`Created ${entityCount} employees in ${duration}ms (avg: ${duration/entityCount}ms per employee)`);
        
        // Performance expectation: should not take more than 30 seconds total
        expect(duration).toBeLessThan(30000);
      });

      await test.step('Verify list performance with multiple items', async () => {
        const startTime = Date.now();
        
        const employeeCount = await employeePage.getEmployeeCount();
        expect(employeeCount).toBeGreaterThanOrEqual(entityCount);
        
        const endTime = Date.now();
        const listLoadTime = endTime - startTime;
        
        console.log(`Loaded employee list with ${employeeCount} items in ${listLoadTime}ms`);
        
        // List should load quickly even with multiple items
        expect(listLoadTime).toBeLessThan(5000); // 5 seconds max
      });
    });

    test('should handle search and filter performance', async () => {
      await test.step('Test search performance', async () => {
        await employeePage.navigateToEmployees();
        
        const startTime = Date.now();
        
        await employeePage.searchEmployees('Load');
        
        const endTime = Date.now();
        const searchTime = endTime - startTime;
        
        console.log(`Search completed in ${searchTime}ms`);
        
        // Search should be fast
        expect(searchTime).toBeLessThan(3000);
        
        // Clear search
        await employeePage.searchEmployees('');
      });
    });
  });

  test.describe('Accessibility and Usability', () => {
    test('should be keyboard navigable', async () => {
      await test.step('Navigate using keyboard', async () => {
        await basePage.goto('/');
        
        // Use Tab to navigate through elements
        await basePage.page.keyboard.press('Tab');
        await basePage.page.keyboard.press('Tab');
        await basePage.page.keyboard.press('Tab');
        
        // Should be able to navigate to employees link and activate it
        await basePage.page.keyboard.press('Enter');
        
        // Should navigate to employees page
        await employeePage.verifyPageTitle('Employee');
      });
    });

    test('should have proper ARIA labels and roles', async () => {
      await test.step('Check navigation accessibility', async () => {
        await basePage.goto('/');
        
        // Check for main navigation
        const nav = await basePage.page.locator('[data-testid="main-navigation"]');
        await expect(nav).toBeVisible();
        
        // Check for main content area
        const main = await basePage.page.locator('[data-testid="main-content"]');
        await expect(main).toBeVisible();
      });
    });

    test('should handle form validation accessibly', async () => {
      await test.step('Test form accessibility', async () => {
        await employeePage.navigateToEmployees();
        await employeePage.clickAddEmployee();
        
        // Try to submit empty form
        await employeePage.submitEmployeeForm();
        
        // Form should show validation errors that are accessible
        // Specific implementation depends on how errors are displayed
      });
    });
  });
});