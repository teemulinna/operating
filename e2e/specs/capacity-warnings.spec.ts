import { test, expect } from '@playwright/test';
import { ResourceAllocationPage } from '../pages/ResourceAllocationPage';
import { TeamDashboardPage } from '../pages/TeamDashboardPage';

test.describe('Capacity Warning System', () => {
  let resourcePage: ResourceAllocationPage;
  let dashboardPage: TeamDashboardPage;

  test.beforeEach(async ({ page }) => {
    resourcePage = new ResourceAllocationPage(page);
    dashboardPage = new TeamDashboardPage(page);
    
    // Navigate to allocation page
    await resourcePage.navigate();
    await resourcePage.waitForPageLoad();
  });

  test.describe('Over-allocation Prevention', () => {
    test('System prevents creating over 100% allocation', async ({ page }) => {
      test.setTimeout(90000);
      
      // Create first allocation at 70%
      await resourcePage.openAllocationForm();
      const employeeId = await resourcePage.selectFirstAvailableEmployee();
      const employeeName = await resourcePage.getSelectedEmployeeName();
      await resourcePage.selectFirstAvailableProject();
      await resourcePage.setAllocationPercentage(70);
      await resourcePage.setDateRange('2024-03-01', '2024-03-31');
      await resourcePage.submitAllocation();
      await resourcePage.waitForApiResponse('/api/allocations', 'POST');
      
      // Try to create second allocation at 40% (would result in 110%)
      await resourcePage.openAllocationForm();
      await resourcePage.selectEmployeeById(employeeId);
      await resourcePage.selectSecondAvailableProject();
      await resourcePage.setAllocationPercentage(40);
      await resourcePage.setDateRange('2024-03-15', '2024-04-15'); // Overlapping period
      
      // Verify over-allocation warning appears
      await expect(resourcePage.getOverAllocationWarning()).toBeVisible();
      await expect(resourcePage.getOverAllocationWarning()).toContainText('This allocation would exceed 100% capacity');
      await expect(resourcePage.getOverAllocationWarning()).toContainText('Current: 70%');
      await expect(resourcePage.getOverAllocationWarning()).toContainText('Proposed: 40%');
      await expect(resourcePage.getOverAllocationWarning()).toContainText('Total would be: 110%');
      
      // Verify submit button is disabled
      await expect(resourcePage.getSubmitButton()).toBeDisabled();
      
      // Verify warning style
      await expect(resourcePage.getOverAllocationWarning()).toHaveCSS('background-color', /rgb\(254, 242, 242\)/);
      await expect(resourcePage.getOverAllocationWarning()).toHaveCSS('border-color', /rgb\(239, 68, 68\)/);
    });

    test('System allows exactly 100% allocation', async ({ page }) => {
      // Create first allocation at 60%
      await resourcePage.openAllocationForm();
      const employeeId = await resourcePage.selectFirstAvailableEmployee();
      await resourcePage.selectFirstAvailableProject();
      await resourcePage.setAllocationPercentage(60);
      await resourcePage.setDateRange('2024-03-01', '2024-03-31');
      await resourcePage.submitAllocation();
      await resourcePage.waitForApiResponse('/api/allocations', 'POST');
      
      // Create second allocation at 40% (total = 100%)
      await resourcePage.openAllocationForm();
      await resourcePage.selectEmployeeById(employeeId);
      await resourcePage.selectSecondAvailableProject();
      await resourcePage.setAllocationPercentage(40);
      await resourcePage.setDateRange('2024-03-15', '2024-04-15');
      
      // Verify 100% warning is informational, not blocking
      await expect(resourcePage.getCapacityInfoMessage()).toBeVisible();
      await expect(resourcePage.getCapacityInfoMessage()).toContainText('This will utilize 100% of available capacity');
      
      // Verify submit button remains enabled
      await expect(resourcePage.getSubmitButton()).toBeEnabled();
      
      // Submit allocation
      await resourcePage.submitAllocation();
      await expect(resourcePage.getSuccessMessage()).toBeVisible();
    });

    test('System shows progressive warning levels', async ({ page }) => {
      const employeeId = await resourcePage.selectFirstAvailableEmployee();
      
      // Test different warning levels
      const testCases = [
        { percentage: 30, expectedLevel: 'info', expectedColor: 'blue' },
        { percentage: 50, expectedLevel: 'info', expectedColor: 'blue' },
        { percentage: 75, expectedLevel: 'warning', expectedColor: 'orange' },
        { percentage: 90, expectedLevel: 'warning', expectedColor: 'orange' },
        { percentage: 100, expectedLevel: 'info', expectedColor: 'green' }
      ];
      
      for (const testCase of testCases) {
        await resourcePage.openAllocationForm();
        await resourcePage.selectEmployeeById(employeeId);
        await resourcePage.selectFirstAvailableProject();
        await resourcePage.setAllocationPercentage(testCase.percentage);
        await resourcePage.setDateRange('2024-04-01', '2024-04-30');
        
        // Check warning level
        const warningElement = resourcePage.getCapacityWarningByLevel(testCase.expectedLevel);
        await expect(warningElement).toBeVisible();
        
        // Check color coding
        if (testCase.expectedColor === 'blue') {
          await expect(warningElement).toHaveCSS('border-color', /rgb\(59, 130, 246\)/);
        } else if (testCase.expectedColor === 'orange') {
          await expect(warningElement).toHaveCSS('border-color', /rgb\(245, 158, 11\)/);
        } else if (testCase.expectedColor === 'green') {
          await expect(warningElement).toHaveCSS('border-color', /rgb\(34, 197, 94\)/);
        }
        
        // Cancel to test next case
        await resourcePage.cancelAllocationForm();
      }
    });
  });

  test.describe('Real-time Capacity Calculation', () => {
    test('Warning updates as user modifies allocation percentage', async ({ page }) => {
      // Create existing allocation
      const employeeId = await resourcePage.selectFirstAvailableEmployee();
      await resourcePage.openAllocationForm();
      await resourcePage.selectEmployeeById(employeeId);
      await resourcePage.selectFirstAvailableProject();
      await resourcePage.setAllocationPercentage(50);
      await resourcePage.setDateRange('2024-03-01', '2024-03-31');
      await resourcePage.submitAllocation();
      await resourcePage.waitForApiResponse('/api/allocations', 'POST');
      
      // Open new allocation form for same employee
      await resourcePage.openAllocationForm();
      await resourcePage.selectEmployeeById(employeeId);
      await resourcePage.selectSecondAvailableProject();
      await resourcePage.setDateRange('2024-03-15', '2024-04-15'); // Overlapping
      
      // Test incremental percentage changes
      await resourcePage.setAllocationPercentage(30);
      await expect(resourcePage.getTotalAllocationDisplay()).toContainText('Total: 80%');
      await expect(resourcePage.getCapacityWarningByLevel('info')).toBeVisible();
      
      await resourcePage.setAllocationPercentage(45);
      await expect(resourcePage.getTotalAllocationDisplay()).toContainText('Total: 95%');
      await expect(resourcePage.getCapacityWarningByLevel('warning')).toBeVisible();
      
      await resourcePage.setAllocationPercentage(50);
      await expect(resourcePage.getTotalAllocationDisplay()).toContainText('Total: 100%');
      await expect(resourcePage.getCapacityWarningByLevel('info')).toContainText('Full capacity');
      
      await resourcePage.setAllocationPercentage(60);
      await expect(resourcePage.getTotalAllocationDisplay()).toContainText('Total: 110%');
      await expect(resourcePage.getOverAllocationWarning()).toBeVisible();
      await expect(resourcePage.getSubmitButton()).toBeDisabled();
    });

    test('Warning updates when date range changes', async ({ page }) => {
      // Create existing allocation
      const employeeId = await resourcePage.selectFirstAvailableEmployee();
      await resourcePage.openAllocationForm();
      await resourcePage.selectEmployeeById(employeeId);
      await resourcePage.selectFirstAvailableProject();
      await resourcePage.setAllocationPercentage(80);
      await resourcePage.setDateRange('2024-03-01', '2024-03-15');
      await resourcePage.submitAllocation();
      await resourcePage.waitForApiResponse('/api/allocations', 'POST');
      
      // Open new allocation form
      await resourcePage.openAllocationForm();
      await resourcePage.selectEmployeeById(employeeId);
      await resourcePage.selectSecondAvailableProject();
      await resourcePage.setAllocationPercentage(50);
      
      // Test different date ranges
      
      // No overlap - should be fine
      await resourcePage.setDateRange('2024-03-16', '2024-03-31');
      await expect(resourcePage.getOverAllocationWarning()).not.toBeVisible();
      await expect(resourcePage.getSubmitButton()).toBeEnabled();
      
      // Partial overlap - should show conflict
      await resourcePage.setDateRange('2024-03-10', '2024-03-25');
      await expect(resourcePage.getPartialOverlapWarning()).toBeVisible();
      await expect(resourcePage.getPartialOverlapWarning()).toContainText('Overlaps existing allocation');
      
      // Complete overlap - should show over-allocation
      await resourcePage.setDateRange('2024-03-01', '2024-03-15');
      await expect(resourcePage.getOverAllocationWarning()).toBeVisible();
      await expect(resourcePage.getSubmitButton()).toBeDisabled();
    });

    test('Multiple overlapping allocations calculated correctly', async ({ page }) => {
      const employeeId = await resourcePage.selectFirstAvailableEmployee();
      
      // Create three overlapping allocations
      const allocations = [
        { percentage: 30, startDate: '2024-03-01', endDate: '2024-03-31', projectIndex: 0 },
        { percentage: 25, startDate: '2024-03-15', endDate: '2024-04-15', projectIndex: 1 },
        { percentage: 20, startDate: '2024-03-20', endDate: '2024-04-05', projectIndex: 2 }
      ];
      
      // Create first two allocations
      for (let i = 0; i < 2; i++) {
        const alloc = allocations[i];
        await resourcePage.openAllocationForm();
        await resourcePage.selectEmployeeById(employeeId);
        await resourcePage.selectProjectByIndex(alloc.projectIndex);
        await resourcePage.setAllocationPercentage(alloc.percentage);
        await resourcePage.setDateRange(alloc.startDate, alloc.endDate);
        await resourcePage.submitAllocation();
        await resourcePage.waitForApiResponse('/api/allocations', 'POST');
      }
      
      // Create third allocation and verify complex overlap calculation
      await resourcePage.openAllocationForm();
      await resourcePage.selectEmployeeById(employeeId);
      await resourcePage.selectProjectByIndex(2);
      await resourcePage.setAllocationPercentage(20);
      await resourcePage.setDateRange('2024-03-20', '2024-04-05');
      
      // Verify complex overlap calculation
      await expect(resourcePage.getComplexOverlapWarning()).toBeVisible();
      await expect(resourcePage.getComplexOverlapWarning()).toContainText('Multiple overlapping periods');
      
      // Verify detailed breakdown
      await resourcePage.viewDetailedCapacityBreakdown();
      const breakdownModal = resourcePage.getCapacityBreakdownModal();
      await expect(breakdownModal).toBeVisible();
      await expect(breakdownModal).toContainText('Mar 1-14: 30%');
      await expect(breakdownModal).toContainText('Mar 15-19: 55%'); // 30% + 25%
      await expect(breakdownModal).toContainText('Mar 20-31: 75%'); // 30% + 25% + 20%
      await expect(breakdownModal).toContainText('Apr 1-5: 45%'); // 25% + 20%
    });
  });

  test.describe('Dashboard Capacity Warnings', () => {
    test('Dashboard shows over-allocation alerts in real-time', async ({ page, context }) => {
      test.setTimeout(120000);
      
      // Open dashboard in separate tab
      const dashboardTab = await context.newPage();
      const tabDashboardPage = new TeamDashboardPage(dashboardTab);
      await tabDashboardPage.navigate('/dashboard');
      await tabDashboardPage.waitForPageLoad();
      
      // Create over-allocation scenario in main tab
      await resourcePage.openAllocationForm();
      const employeeId = await resourcePage.selectFirstAvailableEmployee();
      const employeeName = await resourcePage.getSelectedEmployeeName();
      
      // First allocation
      await resourcePage.selectFirstAvailableProject();
      await resourcePage.setAllocationPercentage(70);
      await resourcePage.setDateRange('2024-03-01', '2024-03-31');
      await resourcePage.submitAllocation();
      await resourcePage.waitForApiResponse('/api/allocations', 'POST');
      
      // Second allocation (creates over-allocation)
      await resourcePage.openAllocationForm();
      await resourcePage.selectEmployeeById(employeeId);
      await resourcePage.selectSecondAvailableProject();
      await resourcePage.setAllocationPercentage(50);
      await resourcePage.setDateRange('2024-03-15', '2024-04-15');
      await resourcePage.forceSubmitAllocation(); // Override validation
      await resourcePage.waitForApiResponse('/api/allocations', 'POST');
      
      // Wait for dashboard real-time update
      await dashboardTab.waitForTimeout(3000);
      
      // Verify over-allocation alert in dashboard
      await expect(tabDashboardPage.getOverAllocationAlert()).toBeVisible();
      await expect(tabDashboardPage.getOverAllocationAlert()).toContainText(employeeName);
      await expect(tabDashboardPage.getOverAllocationAlert()).toContainText('120%'); // 70% + 50%
      
      // Verify employee widget shows over-allocation
      const employeeWidget = tabDashboardPage.getEmployeeUtilizationWidget(employeeId);
      await expect(employeeWidget).toHaveCSS('border-color', /rgb\(239, 68, 68\)/); // Red border
      await expect(employeeWidget).toContainText('⚠️'); // Warning icon
      
      await dashboardTab.close();
    });

    test('Capacity threshold alerts for team utilization', async ({ page, context }) => {
      // Set up multiple employees with high allocations
      const dashboardTab = await context.newPage();
      const tabDashboardPage = new TeamDashboardPage(dashboardTab);
      await tabDashboardPage.navigate('/dashboard');
      
      // Configure capacity threshold alerts
      await tabDashboardPage.openCapacitySettings();
      await tabDashboardPage.setCapacityThreshold('team', 85); // Alert when team >85%
      await tabDashboardPage.setCapacityThreshold('individual', 90); // Alert when individual >90%
      await tabDashboardPage.saveCapacitySettings();
      
      // Create high utilization scenario
      const employees = await resourcePage.getAvailableEmployees();
      const totalEmployees = employees.length;
      
      // Allocate most employees to high utilization
      for (let i = 0; i < Math.min(totalEmployees - 2, 5); i++) {
        await resourcePage.openAllocationForm();
        await resourcePage.selectEmployeeByIndex(i);
        await resourcePage.selectFirstAvailableProject();
        await resourcePage.setAllocationPercentage(95);
        await resourcePage.setDateRange('2024-03-01', '2024-03-31');
        await resourcePage.submitAllocation();
        await resourcePage.waitForApiResponse('/api/allocations', 'POST');
      }
      
      // Wait for dashboard update
      await dashboardTab.waitForTimeout(5000);
      
      // Verify team threshold alert
      await expect(tabDashboardPage.getTeamCapacityAlert()).toBeVisible();
      await expect(tabDashboardPage.getTeamCapacityAlert()).toContainText('Team utilization exceeds 85%');
      
      // Verify individual threshold alerts
      const individualAlerts = tabDashboardPage.getIndividualCapacityAlerts();
      const alertCount = await individualAlerts.count();
      expect(alertCount).toBeGreaterThan(0);
      
      await dashboardTab.close();
    });

    test('Capacity alerts include actionable suggestions', async ({ page, context }) => {
      // Create over-allocation
      const employeeId = await resourcePage.selectFirstAvailableEmployee();
      await resourcePage.createOverAllocation(employeeId, 120);
      
      // Open dashboard
      const dashboardTab = await context.newPage();
      const tabDashboardPage = new TeamDashboardPage(dashboardTab);
      await tabDashboardPage.navigate('/dashboard');
      await tabDashboardPage.waitForPageLoad();
      
      // Click on over-allocation alert
      await tabDashboardPage.clickOverAllocationAlert();
      
      // Verify suggestions modal
      const suggestionsModal = tabDashboardPage.getCapacitySuggestionsModal();
      await expect(suggestionsModal).toBeVisible();
      
      // Verify actionable suggestions
      await expect(suggestionsModal).toContainText('Suggested Actions');
      await expect(tabDashboardPage.getSuggestion('reduce-allocation')).toBeVisible();
      await expect(tabDashboardPage.getSuggestion('redistribute-work')).toBeVisible();
      await expect(tabDashboardPage.getSuggestion('hire-additional')).toBeVisible();
      
      // Test suggestion actions
      await tabDashboardPage.clickSuggestion('reduce-allocation');
      await expect(tabDashboardPage.getAllocationAdjustmentForm()).toBeVisible();
      
      await dashboardTab.close();
    });
  });

  test.describe('Warning Customization and Configuration', () => {
    test('Users can configure warning thresholds', async ({ page }) => {
      // Open capacity settings
      await resourcePage.openCapacitySettings();
      
      // Verify default thresholds
      await expect(resourcePage.getThresholdInput('warning')).toHaveValue('80');
      await expect(resourcePage.getThresholdInput('critical')).toHaveValue('95');
      
      // Modify thresholds
      await resourcePage.setCapacityThreshold('warning', 75);
      await resourcePage.setCapacityThreshold('critical', 90);
      await resourcePage.saveCapacitySettings();
      
      // Test new thresholds
      await resourcePage.openAllocationForm();
      const employeeId = await resourcePage.selectFirstAvailableEmployee();
      await resourcePage.selectFirstAvailableProject();
      
      // Test warning threshold (75%)
      await resourcePage.setAllocationPercentage(78);
      await resourcePage.setDateRange('2024-03-01', '2024-03-31');
      await expect(resourcePage.getCapacityWarningByLevel('warning')).toBeVisible();
      
      // Test critical threshold (90%)
      await resourcePage.setAllocationPercentage(92);
      await expect(resourcePage.getCapacityWarningByLevel('critical')).toBeVisible();
      
      // Reset thresholds
      await resourcePage.openCapacitySettings();
      await resourcePage.resetCapacityThresholds();
      await resourcePage.saveCapacitySettings();
    });

    test('Warning notifications can be enabled/disabled', async ({ page }) => {
      // Enable email notifications
      await resourcePage.openNotificationSettings();
      await resourcePage.enableNotification('over-allocation-email');
      await resourcePage.enableNotification('capacity-threshold-email');
      await resourcePage.saveNotificationSettings();
      
      // Create over-allocation
      const employeeId = await resourcePage.selectFirstAvailableEmployee();
      await resourcePage.createOverAllocation(employeeId, 110);
      
      // Verify notification preferences were applied
      const notificationLog = await page.request.get('/api/notifications/log');
      const notifications = await notificationLog.json();
      const overAllocationNotification = notifications.find((n: any) => 
        n.type === 'over-allocation-warning' && n.employeeId === employeeId
      );
      expect(overAllocationNotification).toBeTruthy();
      
      // Disable notifications
      await resourcePage.openNotificationSettings();
      await resourcePage.disableNotification('over-allocation-email');
      await resourcePage.saveNotificationSettings();
      
      // Create another over-allocation
      const secondEmployeeId = await resourcePage.selectSecondAvailableEmployee();
      await resourcePage.createOverAllocation(secondEmployeeId, 105);
      
      // Verify no new email notification
      const updatedLog = await page.request.get('/api/notifications/log');
      const updatedNotifications = await updatedLog.json();
      const shouldNotExist = updatedNotifications.find((n: any) => 
        n.type === 'over-allocation-warning' && 
        n.employeeId === secondEmployeeId &&
        n.method === 'email'
      );
      expect(shouldNotExist).toBeFalsy();
    });
  });

  test.describe('Performance with Large Datasets', () => {
    test('Warning calculations remain fast with many allocations', async ({ page }) => {
      // Create large dataset
      const employees = await resourcePage.getAvailableEmployees();
      const projects = await resourcePage.getAvailableProjects();
      
      // Create 100+ allocations
      const allocationPromises = [];
      for (let i = 0; i < 100; i++) {
        const employeeIndex = i % employees.length;
        const projectIndex = i % projects.length;
        const percentage = Math.floor(Math.random() * 40) + 20; // 20-60%
        
        const startDate = new Date('2024-03-01');
        startDate.setDate(startDate.getDate() + (i * 2));
        
        const endDate = new Date(startDate);
        endDate.setDate(endDate.getDate() + 14); // 2 week projects
        
        allocationPromises.push(
          resourcePage.createAllocationViaAPI({
            employeeId: employees[employeeIndex].id,
            projectId: projects[projectIndex].id,
            percentage: percentage,
            startDate: startDate.toISOString().split('T')[0],
            endDate: endDate.toISOString().split('T')[0]
          })
        );
      }
      
      await Promise.all(allocationPromises);
      
      // Test warning calculation performance
      const startTime = Date.now();
      
      await resourcePage.openAllocationForm();
      await resourcePage.selectFirstAvailableEmployee();
      await resourcePage.selectFirstAvailableProject();
      await resourcePage.setAllocationPercentage(50);
      await resourcePage.setDateRange('2024-03-15', '2024-04-15');
      
      // Wait for capacity calculation
      await expect(resourcePage.getCapacityCalculationIndicator()).toBeVisible();
      await resourcePage.waitForCapacityCalculation();
      
      const calculationTime = Date.now() - startTime;
      
      // Should calculate within reasonable time even with large dataset
      expect(calculationTime).toBeLessThan(3000); // 3 second threshold
      
      // Verify warning still appears correctly
      if (await resourcePage.getOverAllocationWarning().isVisible()) {
        await expect(resourcePage.getOverAllocationWarning()).toContainText('exceed');
      }
    });

    test('Memory usage remains stable during warning calculations', async ({ page }) => {
      // Monitor memory usage
      const initialMemory = await page.evaluate(() => {
        return (performance as any).memory?.usedJSHeapSize || 0;
      });
      
      // Perform multiple warning calculations
      for (let i = 0; i < 20; i++) {
        await resourcePage.openAllocationForm();
        await resourcePage.selectEmployeeByIndex(i % 5);
        await resourcePage.selectProjectByIndex(i % 3);
        await resourcePage.setAllocationPercentage(Math.floor(Math.random() * 60) + 30);
        await resourcePage.setDateRange('2024-03-01', '2024-04-01');
        
        // Wait for warning calculation
        await resourcePage.waitForCapacityCalculation();
        
        // Cancel form
        await resourcePage.cancelAllocationForm();
      }
      
      // Force garbage collection
      await page.evaluate(() => {
        if ((window as any).gc) {
          (window as any).gc();
        }
      });
      
      // Check final memory usage
      const finalMemory = await page.evaluate(() => {
        return (performance as any).memory?.usedJSHeapSize || 0;
      });
      
      const memoryIncrease = finalMemory - initialMemory;
      
      // Memory usage should not increase significantly
      expect(memoryIncrease).toBeLessThan(10 * 1024 * 1024); // Less than 10MB increase
    });
  });
});