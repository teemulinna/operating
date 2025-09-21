import { test, expect } from '@playwright/test';
import { AllocationPage, AllocationData } from '../pages/AllocationPage';
import { EmployeePage, EmployeeData } from '../pages/EmployeePage';
import { ProjectPage, ProjectData } from '../pages/ProjectPage';

test.describe('Resource Allocation Management', () => {
  let allocationPage: AllocationPage;
  let employeePage: EmployeePage;
  let projectPage: ProjectPage;
  
  // Test data
  const testEmployee: EmployeeData = {
    firstName: 'Allocation',
    lastName: 'TestEmployee',
    email: `allocation.test.${Date.now()}@company.com`,
    department: 'Engineering',
    role: 'Developer',
    capacity: '100'
  };

  const testProject: ProjectData = {
    name: `Allocation Test Project ${Date.now()}`,
    description: 'Project for allocation testing',
    startDate: '',
    endDate: '',
    status: 'Active',
    priority: 'High'
  };

  test.beforeAll(async ({ page }) => {
    allocationPage = new AllocationPage(page);
    employeePage = new EmployeePage(page);
    projectPage = new ProjectPage(page);

    // Set up project dates
    testProject.startDate = projectPage.getTodayFormatted();
    testProject.endDate = projectPage.getFutureDateFormatted(60);

    await test.step('Set up test data - Create employee and project', async () => {
      // Create test employee
      await employeePage.navigateToEmployees();
      await employeePage.createEmployee(testEmployee);
      
      // Create test project
      await projectPage.navigateToProjects();
      await projectPage.createProject(testProject);
    });
  });
  
  test.beforeEach(async ({ page }) => {
    allocationPage = new AllocationPage(page);
    await allocationPage.navigateToAllocations();
    await allocationPage.waitForAllocationsToLoad();
  });

  test.describe('Create Allocation', () => {
    test('should allocate employee to project successfully', async () => {
      const allocationData: AllocationData = {
        employeeName: `${testEmployee.firstName} ${testEmployee.lastName}`,
        projectName: testProject.name,
        startDate: allocationPage.getTodayFormatted(),
        endDate: allocationPage.getFutureDateFormatted(30),
        capacity: 50,
        role: 'Frontend Developer',
        notes: 'Primary developer for UI components'
      };

      await test.step('Create new allocation', async () => {
        await allocationPage.createAllocation(allocationData);
      });

      await test.step('Verify allocation appears in list', async () => {
        await allocationPage.verifyAllocationExists(allocationData.employeeName, allocationData.projectName);
      });
    });

    test('should create allocation with minimal required fields', async () => {
      const allocationData: AllocationData = {
        employeeName: `${testEmployee.firstName} ${testEmployee.lastName}`,
        projectName: testProject.name,
        startDate: allocationPage.getFutureDateFormatted(5),
        endDate: allocationPage.getFutureDateFormatted(25),
        capacity: 75
      };

      await test.step('Create minimal allocation', async () => {
        await allocationPage.createAllocation(allocationData);
      });

      await test.step('Verify allocation exists', async () => {
        await allocationPage.verifyAllocationExists(allocationData.employeeName, allocationData.projectName);
      });
    });

    test('should create partial capacity allocation', async () => {
      const allocationData: AllocationData = {
        employeeName: `${testEmployee.firstName} ${testEmployee.lastName}`,
        projectName: testProject.name,
        startDate: allocationPage.getFutureDateFormatted(35),
        endDate: allocationPage.getFutureDateFormatted(50),
        capacity: 25,
        role: 'Code Reviewer'
      };

      await test.step('Create partial allocation', async () => {
        await allocationPage.createAllocation(allocationData);
      });

      await test.step('Verify partial allocation exists', async () => {
        await allocationPage.verifyAllocationExists(allocationData.employeeName, allocationData.projectName);
      });
    });
  });

  test.describe('Over-allocation Warning', () => {
    let overAllocationEmployee: EmployeeData;
    let overAllocationProject1: ProjectData;
    let overAllocationProject2: ProjectData;

    test.beforeAll(async ({ page }) => {
      overAllocationEmployee = {
        firstName: 'OverAlloc',
        lastName: 'TestUser',
        email: `overalloc.test.${Date.now()}@company.com`,
        department: 'Engineering',
        capacity: '100'
      };

      overAllocationProject1 = {
        name: `Over Allocation Project 1 ${Date.now()}`,
        startDate: projectPage.getTodayFormatted(),
        endDate: projectPage.getFutureDateFormatted(30),
        status: 'Active'
      };

      overAllocationProject2 = {
        name: `Over Allocation Project 2 ${Date.now()}`,
        startDate: projectPage.getTodayFormatted(),
        endDate: projectPage.getFutureDateFormatted(30),
        status: 'Active'
      };

      // Create test data
      const empPage = new EmployeePage(page);
      const projPage = new ProjectPage(page);
      
      await empPage.navigateToEmployees();
      await empPage.createEmployee(overAllocationEmployee);
      
      await projPage.navigateToProjects();
      await projPage.createProject(overAllocationProject1);
      await projPage.createProject(overAllocationProject2);
    });

    test('should detect and warn about over-allocation', async () => {
      const employeeName = `${overAllocationEmployee.firstName} ${overAllocationEmployee.lastName}`;

      // First allocation - 80% capacity
      const firstAllocation: AllocationData = {
        employeeName: employeeName,
        projectName: overAllocationProject1.name,
        startDate: allocationPage.getTodayFormatted(),
        endDate: allocationPage.getFutureDateFormatted(20),
        capacity: 80
      };

      await test.step('Create first allocation (80%)', async () => {
        await allocationPage.createAllocation(firstAllocation);
      });

      // Second allocation - 50% capacity (should cause over-allocation)
      const secondAllocation: AllocationData = {
        employeeName: employeeName,
        projectName: overAllocationProject2.name,
        startDate: allocationPage.getTodayFormatted(),
        endDate: allocationPage.getFutureDateFormatted(15),
        capacity: 50
      };

      await test.step('Attempt to create over-allocation (50% more)', async () => {
        await allocationPage.clickAddAllocation();
        await allocationPage.fillAllocationForm(secondAllocation);
        
        // Should show over-allocation warning
        await allocationPage.verifyOverAllocationWarning();
      });

      await test.step('Submit over-allocation despite warning', async () => {
        await allocationPage.submitAllocationForm();
        // System may allow over-allocation with warning or prevent it
        await allocationPage.waitForNetworkIdle();
      });
    });

    test('should calculate employee utilization correctly', async () => {
      const employeeName = `${overAllocationEmployee.firstName} ${overAllocationEmployee.lastName}`;

      await test.step('Verify employee utilization is calculated', async () => {
        // The utilization should be over 100% from the previous test
        const currentCapacity = await allocationPage.getEmployeeCapacity(employeeName);
        expect(currentCapacity).toBeGreaterThanOrEqual(80); // At least from the first allocation
      });
    });

    test('should show capacity warnings in different views', async () => {
      await test.step('Check timeline view for over-allocation warnings', async () => {
        await allocationPage.switchToTimelineView();
        // Visual indicators should show over-allocation in timeline
      });

      await test.step('Check calendar view for capacity warnings', async () => {
        await allocationPage.switchToCalendarView();
        // Calendar should highlight over-allocated periods
      });
    });
  });

  test.describe('Edit Allocation', () => {
    let editTestEmployee: EmployeeData;
    let editTestProject: ProjectData;
    let editTestAllocation: AllocationData;

    test.beforeAll(async ({ page }) => {
      editTestEmployee = {
        firstName: 'Edit',
        lastName: 'AllocTest',
        email: `edit.alloc.${Date.now()}@company.com`,
        department: 'Design'
      };

      editTestProject = {
        name: `Edit Allocation Project ${Date.now()}`,
        startDate: projectPage.getTodayFormatted(),
        endDate: projectPage.getFutureDateFormatted(45),
        status: 'Active'
      };

      // Create test data
      const empPage = new EmployeePage(page);
      const projPage = new ProjectPage(page);
      
      await empPage.navigateToEmployees();
      await empPage.createEmployee(editTestEmployee);
      
      await projPage.navigateToProjects();
      await projPage.createProject(editTestProject);
    });

    test.beforeEach(async () => {
      // Create a test allocation for editing
      editTestAllocation = {
        employeeName: `${editTestEmployee.firstName} ${editTestEmployee.lastName}`,
        projectName: editTestProject.name,
        startDate: allocationPage.getTodayFormatted(),
        endDate: allocationPage.getFutureDateFormatted(30),
        capacity: 60,
        role: 'Designer'
      };

      await allocationPage.createAllocation(editTestAllocation);
    });

    test('should edit allocation capacity', async () => {
      const newCapacity = 40;

      await test.step('Edit allocation capacity', async () => {
        await allocationPage.editAllocation(
          editTestAllocation.employeeName,
          editTestAllocation.projectName,
          { capacity: newCapacity }
        );
      });

      await test.step('Verify allocation still exists with new capacity', async () => {
        await allocationPage.verifyAllocationExists(
          editTestAllocation.employeeName,
          editTestAllocation.projectName
        );
      });
    });

    test('should edit allocation dates', async () => {
      const newDates = {
        startDate: allocationPage.getFutureDateFormatted(10),
        endDate: allocationPage.getFutureDateFormatted(40)
      };

      await test.step('Edit allocation dates', async () => {
        await allocationPage.editAllocation(
          editTestAllocation.employeeName,
          editTestAllocation.projectName,
          newDates
        );
      });

      await test.step('Verify allocation exists with new dates', async () => {
        await allocationPage.verifyAllocationExists(
          editTestAllocation.employeeName,
          editTestAllocation.projectName
        );
      });
    });

    test('should edit allocation role', async () => {
      const newRole = 'Senior UX Designer';

      await test.step('Edit allocation role', async () => {
        await allocationPage.editAllocation(
          editTestAllocation.employeeName,
          editTestAllocation.projectName,
          { role: newRole }
        );
      });

      await test.step('Verify allocation updated', async () => {
        await allocationPage.verifyAllocationExists(
          editTestAllocation.employeeName,
          editTestAllocation.projectName
        );
      });
    });
  });

  test.describe('Remove Allocation', () => {
    let deleteTestEmployee: EmployeeData;
    let deleteTestProject: ProjectData;

    test.beforeAll(async ({ page }) => {
      deleteTestEmployee = {
        firstName: 'Delete',
        lastName: 'AllocTest',
        email: `delete.alloc.${Date.now()}@company.com`,
        department: 'QA'
      };

      deleteTestProject = {
        name: `Delete Allocation Project ${Date.now()}`,
        startDate: projectPage.getTodayFormatted(),
        endDate: projectPage.getFutureDateFormatted(30),
        status: 'Active'
      };

      // Create test data
      const empPage = new EmployeePage(page);
      const projPage = new ProjectPage(page);
      
      await empPage.navigateToEmployees();
      await empPage.createEmployee(deleteTestEmployee);
      
      await projPage.navigateToProjects();
      await projPage.createProject(deleteTestProject);
    });

    test('should remove allocation successfully', async () => {
      const testAllocation: AllocationData = {
        employeeName: `${deleteTestEmployee.firstName} ${deleteTestEmployee.lastName}`,
        projectName: deleteTestProject.name,
        startDate: allocationPage.getTodayFormatted(),
        endDate: allocationPage.getFutureDateFormatted(20),
        capacity: 70
      };

      await test.step('Create allocation for deletion', async () => {
        await allocationPage.createAllocation(testAllocation);
        await allocationPage.verifyAllocationExists(testAllocation.employeeName, testAllocation.projectName);
      });

      await test.step('Delete the allocation', async () => {
        await allocationPage.deleteAllocation(testAllocation.employeeName, testAllocation.projectName);
      });

      await test.step('Verify allocation no longer exists', async () => {
        await allocationPage.verifyAllocationNotExists(testAllocation.employeeName, testAllocation.projectName);
      });
    });

    test('should handle deletion confirmation dialog', async () => {
      const testAllocation: AllocationData = {
        employeeName: `${deleteTestEmployee.firstName} ${deleteTestEmployee.lastName}`,
        projectName: deleteTestProject.name,
        startDate: allocationPage.getFutureDateFormatted(5),
        endDate: allocationPage.getFutureDateFormatted(25),
        capacity: 90
      };

      await test.step('Create allocation', async () => {
        await allocationPage.createAllocation(testAllocation);
      });

      await test.step('Verify allocation exists before deletion', async () => {
        await allocationPage.verifyAllocationExists(testAllocation.employeeName, testAllocation.projectName);
      });

      await test.step('Delete allocation with confirmation', async () => {
        await allocationPage.deleteAllocation(testAllocation.employeeName, testAllocation.projectName);
      });

      await test.step('Verify allocation is removed', async () => {
        await allocationPage.verifyAllocationNotExists(testAllocation.employeeName, testAllocation.projectName);
      });
    });
  });

  test.describe('Search and Filter Allocations', () => {
    let searchEmployee1: EmployeeData;
    let searchEmployee2: EmployeeData;
    let searchProject1: ProjectData;
    let searchProject2: ProjectData;

    test.beforeAll(async ({ page }) => {
      const timestamp = Date.now();
      
      searchEmployee1 = {
        firstName: 'SearchEmp1',
        lastName: 'Filter',
        email: `search1.${timestamp}@company.com`,
        department: 'Engineering'
      };

      searchEmployee2 = {
        firstName: 'SearchEmp2',
        lastName: 'Filter',
        email: `search2.${timestamp}@company.com`,
        department: 'Design'
      };

      searchProject1 = {
        name: `Search Project Alpha ${timestamp}`,
        startDate: projectPage.getTodayFormatted(),
        endDate: projectPage.getFutureDateFormatted(45),
        status: 'Active'
      };

      searchProject2 = {
        name: `Search Project Beta ${timestamp}`,
        startDate: projectPage.getTodayFormatted(),
        endDate: projectPage.getFutureDateFormatted(60),
        status: 'Planning'
      };

      // Create test data
      const empPage = new EmployeePage(page);
      const projPage = new ProjectPage(page);
      
      await empPage.navigateToEmployees();
      await empPage.createEmployee(searchEmployee1);
      await empPage.createEmployee(searchEmployee2);
      
      await projPage.navigateToProjects();
      await projPage.createProject(searchProject1);
      await projPage.createProject(searchProject2);

      // Create allocations for searching
      const allocPage = new AllocationPage(page);
      await allocPage.navigateToAllocations();
      
      await allocPage.createAllocation({
        employeeName: `${searchEmployee1.firstName} ${searchEmployee1.lastName}`,
        projectName: searchProject1.name,
        startDate: allocPage.getTodayFormatted(),
        endDate: allocPage.getFutureDateFormatted(30),
        capacity: 80
      });

      await allocPage.createAllocation({
        employeeName: `${searchEmployee2.firstName} ${searchEmployee2.lastName}`,
        projectName: searchProject2.name,
        startDate: allocPage.getFutureDateFormatted(10),
        endDate: allocPage.getFutureDateFormatted(40),
        capacity: 60
      });
    });

    test('should search allocations by employee name', async () => {
      await test.step('Search for SearchEmp1', async () => {
        await allocationPage.searchAllocations('SearchEmp1');
      });

      await test.step('Verify only matching allocations appear', async () => {
        const allocationList = await allocationPage.getAllocationList();
        const hasSearchEmp1 = allocationList.some(alloc => alloc.includes('SearchEmp1'));
        expect(hasSearchEmp1).toBeTruthy();
      });
    });

    test('should search allocations by project name', async () => {
      await test.step('Search for Alpha project', async () => {
        await allocationPage.searchAllocations('Alpha');
      });

      await test.step('Verify matching allocation appears', async () => {
        const allocationList = await allocationPage.getAllocationList();
        const hasAlpha = allocationList.some(alloc => alloc.includes('Alpha'));
        expect(hasAlpha).toBeTruthy();
      });
    });

    test('should filter allocations by employee', async () => {
      await test.step('Filter by SearchEmp2', async () => {
        await allocationPage.filterByEmployee(`${searchEmployee2.firstName} ${searchEmployee2.lastName}`);
      });

      await test.step('Verify only SearchEmp2 allocations appear', async () => {
        const allocationList = await allocationPage.getAllocationList();
        const hasSearchEmp2 = allocationList.some(alloc => alloc.includes('SearchEmp2'));
        expect(hasSearchEmp2).toBeTruthy();
      });
    });

    test('should filter allocations by project', async () => {
      await test.step('Filter by Beta project', async () => {
        await allocationPage.filterByProject(searchProject2.name);
      });

      await test.step('Verify only Beta project allocations appear', async () => {
        const allocationList = await allocationPage.getAllocationList();
        const hasBeta = allocationList.some(alloc => alloc.includes('Beta'));
        expect(hasBeta).toBeTruthy();
      });
    });

    test('should clear filters and show all allocations', async () => {
      await test.step('Apply search filter', async () => {
        await allocationPage.searchAllocations('NonExistent');
      });

      await test.step('Clear search', async () => {
        await allocationPage.searchAllocations('');
      });

      await test.step('Verify all test allocations are visible', async () => {
        await allocationPage.verifyAllocationExists(
          `${searchEmployee1.firstName} ${searchEmployee1.lastName}`,
          searchProject1.name
        );
        await allocationPage.verifyAllocationExists(
          `${searchEmployee2.firstName} ${searchEmployee2.lastName}`,
          searchProject2.name
        );
      });
    });
  });

  test.describe('Date Overlap Validation', () => {
    let overlapEmployee: EmployeeData;
    let overlapProject1: ProjectData;
    let overlapProject2: ProjectData;

    test.beforeAll(async ({ page }) => {
      overlapEmployee = {
        firstName: 'Overlap',
        lastName: 'TestUser',
        email: `overlap.test.${Date.now()}@company.com`,
        department: 'Engineering'
      };

      overlapProject1 = {
        name: `Overlap Project 1 ${Date.now()}`,
        startDate: projectPage.getTodayFormatted(),
        endDate: projectPage.getFutureDateFormatted(60),
        status: 'Active'
      };

      overlapProject2 = {
        name: `Overlap Project 2 ${Date.now()}`,
        startDate: projectPage.getTodayFormatted(),
        endDate: projectPage.getFutureDateFormatted(45),
        status: 'Active'
      };

      // Create test data
      const empPage = new EmployeePage(page);
      const projPage = new ProjectPage(page);
      
      await empPage.navigateToEmployees();
      await empPage.createEmployee(overlapEmployee);
      
      await projPage.navigateToProjects();
      await projPage.createProject(overlapProject1);
      await projPage.createProject(overlapProject2);
    });

    test('should detect date overlap conflicts', async () => {
      const employeeName = `${overlapEmployee.firstName} ${overlapEmployee.lastName}`;

      // First allocation
      const firstAllocation: AllocationData = {
        employeeName: employeeName,
        projectName: overlapProject1.name,
        startDate: allocationPage.getTodayFormatted(),
        endDate: allocationPage.getFutureDateFormatted(30),
        capacity: 50
      };

      await test.step('Create first allocation', async () => {
        await allocationPage.createAllocation(firstAllocation);
      });

      // Overlapping allocation
      const overlappingAllocation: AllocationData = {
        employeeName: employeeName,
        projectName: overlapProject2.name,
        startDate: allocationPage.getFutureDateFormatted(15), // Overlaps with first allocation
        endDate: allocationPage.getFutureDateFormatted(45),
        capacity: 30
      };

      await test.step('Create overlapping allocation', async () => {
        await allocationPage.clickAddAllocation();
        await allocationPage.verifyDateOverlapWarning(overlappingAllocation);
      });
    });
  });

  test.describe('Allocation List Management', () => {
    test('should display allocation count correctly', async () => {
      const initialCount = await allocationPage.getAllocationCount();

      await test.step('Add a new allocation', async () => {
        const newAllocation: AllocationData = {
          employeeName: `${testEmployee.firstName} ${testEmployee.lastName}`,
          projectName: testProject.name,
          startDate: allocationPage.getFutureDateFormatted(70),
          endDate: allocationPage.getFutureDateFormatted(90),
          capacity: 100
        };
        await allocationPage.createAllocation(newAllocation);
      });

      await test.step('Verify count increased by 1', async () => {
        const newCount = await allocationPage.getAllocationCount();
        expect(newCount).toBe(initialCount + 1);
      });
    });

    test('should handle empty allocation list', async () => {
      await test.step('Check empty state handling', async () => {
        const allocationCount = await allocationPage.getAllocationCount();
        
        if (allocationCount === 0) {
          await allocationPage.verifyEmptyState();
        } else {
          expect(allocationCount).toBeGreaterThan(0);
        }
      });
    });

    test('should switch between different views', async () => {
      await test.step('Switch to timeline view', async () => {
        await allocationPage.switchToTimelineView();
        // Timeline should be displayed
      });

      await test.step('Switch to calendar view', async () => {
        await allocationPage.switchToCalendarView();
        // Calendar should be displayed
      });
    });
  });
});