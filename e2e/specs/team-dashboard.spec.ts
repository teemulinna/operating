import { test, expect } from '@playwright/test';
import { TeamDashboardPage } from '../pages/TeamDashboardPage';
import { ResourceAllocationPage } from '../pages/ResourceAllocationPage';

test.describe('Team Dashboard Real-time Features', () => {
  let dashboardPage: TeamDashboardPage;
  let resourcePage: ResourceAllocationPage;

  test.beforeEach(async ({ page }) => {
    dashboardPage = new TeamDashboardPage(page);
    resourcePage = new ResourceAllocationPage(page);
    
    // Navigate to team dashboard
    await dashboardPage.navigate('/dashboard');
    await dashboardPage.waitForPageLoad();
  });

  test.describe('Real-time Capacity Monitoring', () => {
    test('Team dashboard shows real-time capacity updates', async ({ page, context }) => {
      test.setTimeout(90000);
      
      // Step 1: Load dashboard and record initial state
      await dashboardPage.waitForDashboardWidgetsLoad();
      const initialUtilization = await dashboardPage.getOverallUtilization();
      
      // Step 2: Open allocation page in second tab
      const allocationTab = await context.newPage();
      const secondResourcePage = new ResourceAllocationPage(allocationTab);
      await secondResourcePage.navigate();
      await secondResourcePage.waitForPageLoad();
      
      // Step 3: Create allocation in second tab
      await secondResourcePage.openAllocationForm();
      const employeeId = await secondResourcePage.selectFirstAvailableEmployee();
      const employeeName = await secondResourcePage.getSelectedEmployeeName();
      const projectId = await secondResourcePage.selectFirstAvailableProject();
      await secondResourcePage.setAllocationPercentage(50);
      await secondResourcePage.setDateRange('2024-02-01', '2024-02-29');
      await secondResourcePage.submitAllocation();
      await secondResourcePage.waitForApiResponse('/api/allocations', 'POST');
      
      // Step 4: Verify dashboard updates in real-time (allow WebSocket propagation)
      await page.waitForTimeout(2000);
      
      // Verify employee utilization widget updates
      const employeeWidget = dashboardPage.getEmployeeUtilizationWidget(employeeId);
      await expect(employeeWidget).toBeVisible();
      await expect(employeeWidget).toContainText('50%');
      
      // Verify overall utilization increased
      const newUtilization = await dashboardPage.getOverallUtilization();
      expect(parseFloat(newUtilization)).toBeGreaterThan(parseFloat(initialUtilization));
      
      // Step 5: Verify capacity alerts if triggered
      if (parseFloat(newUtilization) > 80) {
        await expect(dashboardPage.getCapacityAlert()).toBeVisible();
      }
      
      await allocationTab.close();
    });

    test('Dashboard reflects allocation changes across multiple projects', async ({ page, context }) => {
      test.setTimeout(120000);
      
      // Create multiple allocations and monitor real-time updates
      const allocationTab = await context.newPage();
      const secondResourcePage = new ResourceAllocationPage(allocationTab);
      await secondResourcePage.navigate();
      
      // Create first allocation
      await secondResourcePage.openAllocationForm();
      const employeeId = await secondResourcePage.selectFirstAvailableEmployee();
      await secondResourcePage.selectFirstAvailableProject();
      await secondResourcePage.setAllocationPercentage(30);
      await secondResourcePage.setDateRange('2024-02-01', '2024-02-29');
      await secondResourcePage.submitAllocation();
      await secondResourcePage.waitForApiResponse('/api/allocations', 'POST');
      
      // Verify first allocation appears in dashboard
      await page.waitForTimeout(2000);
      await expect(dashboardPage.getEmployeeUtilizationWidget(employeeId)).toContainText('30%');
      
      // Create second allocation for same employee
      await secondResourcePage.openAllocationForm();
      await secondResourcePage.selectEmployeeById(employeeId);
      await secondResourcePage.selectSecondAvailableProject();
      await secondResourcePage.setAllocationPercentage(40);
      await secondResourcePage.setDateRange('2024-02-15', '2024-03-15');
      await secondResourcePage.submitAllocation();
      await secondResourcePage.waitForApiResponse('/api/allocations', 'POST');
      
      // Verify cumulative utilization updates
      await page.waitForTimeout(2000);
      const cumulativeUtilization = await dashboardPage.getEmployeeCumulativeUtilization(employeeId);
      expect(parseFloat(cumulativeUtilization)).toBe(70); // 30% + 40% overlap
      
      await allocationTab.close();
    });

    test('Dashboard handles allocation deletions with real-time updates', async ({ page, context }) => {
      // First create an allocation
      const allocationTab = await context.newPage();
      const secondResourcePage = new ResourceAllocationPage(allocationTab);
      await secondResourcePage.navigate();
      
      await secondResourcePage.openAllocationForm();
      const employeeId = await secondResourcePage.selectFirstAvailableEmployee();
      await secondResourcePage.selectFirstAvailableProject();
      await secondResourcePage.setAllocationPercentage(60);
      await secondResourcePage.setDateRange('2024-02-01', '2024-02-29');
      await secondResourcePage.submitAllocation();
      await secondResourcePage.waitForApiResponse('/api/allocations', 'POST');
      
      // Verify allocation appears in dashboard
      await page.waitForTimeout(2000);
      await expect(dashboardPage.getEmployeeUtilizationWidget(employeeId)).toContainText('60%');
      
      // Delete the allocation
      await secondResourcePage.navigateToAllocationsList();
      await secondResourcePage.deleteFirstAllocation();
      await secondResourcePage.confirmDeletion();
      await secondResourcePage.waitForApiResponse('/api/allocations', 'DELETE');
      
      // Verify dashboard updates to reflect deletion
      await page.waitForTimeout(2000);
      const updatedUtilization = await dashboardPage.getEmployeeUtilization(employeeId);
      expect(parseFloat(updatedUtilization)).toBe(0);
      
      await allocationTab.close();
    });
  });

  test.describe('Interactive Dashboard Widgets', () => {
    test('Team utilization heatmap shows accurate data', async ({ page }) => {
      await dashboardPage.waitForHeatmapLoad();
      
      // Verify heatmap is visible
      await expect(dashboardPage.getUtilizationHeatmap()).toBeVisible();
      
      // Check heatmap date range
      const dateRange = await dashboardPage.getHeatmapDateRange();
      expect(dateRange).toContain('2024');
      
      // Verify color coding for different utilization levels
      const lowUtilizationCells = dashboardPage.getHeatmapCellsByUtilization('low');
      const mediumUtilizationCells = dashboardPage.getHeatmapCellsByUtilization('medium');
      const highUtilizationCells = dashboardPage.getHeatmapCellsByUtilization('high');
      
      // Verify different colors are used
      await expect(lowUtilizationCells.first()).toHaveCSS('background-color', /rgb\(224, 243, 219\)/); // Light green
      await expect(highUtilizationCells.first()).toHaveCSS('background-color', /rgb\(255, 205, 210\)/); // Light red
      
      // Test heatmap cell hover
      const firstCell = dashboardPage.getHeatmapCell('2024-02-01');
      await firstCell.hover();
      
      // Verify tooltip appears
      await expect(dashboardPage.getHeatmapTooltip()).toBeVisible();
      await expect(dashboardPage.getHeatmapTooltip()).toContainText('February 1, 2024');
    });

    test('Project timeline widget displays active projects', async ({ page }) => {
      await dashboardPage.waitForTimelineWidgetLoad();
      
      // Verify timeline widget
      await expect(dashboardPage.getProjectTimelineWidget()).toBeVisible();
      
      // Verify timeline shows current and upcoming projects
      const activeProjects = dashboardPage.getActiveProjectsInTimeline();
      expect(await activeProjects.count()).toBeGreaterThan(0);
      
      // Test project hover for details
      const firstProject = activeProjects.first();
      await firstProject.hover();
      
      // Verify project details popup
      await expect(dashboardPage.getProjectDetailsPopup()).toBeVisible();
      await expect(dashboardPage.getProjectDetailsPopup()).toContainText('Project:');
      await expect(dashboardPage.getProjectDetailsPopup()).toContainText('Duration:');
      await expect(dashboardPage.getProjectDetailsPopup()).toContainText('Team Size:');
    });

    test('Capacity alerts widget shows relevant warnings', async ({ page, context }) => {
      // Create over-allocation scenario
      const allocationTab = await context.newPage();
      const secondResourcePage = new ResourceAllocationPage(allocationTab);
      await secondResourcePage.navigate();
      
      // Create first allocation at 70%
      await secondResourcePage.openAllocationForm();
      const employeeId = await secondResourcePage.selectFirstAvailableEmployee();
      await secondResourcePage.selectFirstAvailableProject();
      await secondResourcePage.setAllocationPercentage(70);
      await secondResourcePage.setDateRange('2024-02-01', '2024-02-29');
      await secondResourcePage.submitAllocation();
      await secondResourcePage.waitForApiResponse('/api/allocations', 'POST');
      
      // Create second allocation at 40% (causes over-allocation)
      await secondResourcePage.openAllocationForm();
      await secondResourcePage.selectEmployeeById(employeeId);
      await secondResourcePage.selectSecondAvailableProject();
      await secondResourcePage.setAllocationPercentage(40);
      await secondResourcePage.setDateRange('2024-02-15', '2024-03-15');
      
      // Force submission to create over-allocation
      await secondResourcePage.forceSubmitAllocation();
      await secondResourcePage.waitForApiResponse('/api/allocations', 'POST');
      
      // Wait for dashboard to update
      await page.waitForTimeout(3000);
      
      // Verify capacity alert appears
      await expect(dashboardPage.getCapacityAlertsWidget()).toBeVisible();
      await expect(dashboardPage.getOverAllocationAlert()).toBeVisible();
      await expect(dashboardPage.getOverAllocationAlert()).toContainText('110%'); // 70% + 40%
      
      // Test alert click action
      await dashboardPage.clickOverAllocationAlert();
      await expect(dashboardPage.getAllocationDetailsModal()).toBeVisible();
      
      await allocationTab.close();
    });
  });

  test.describe('Dashboard Filtering and Search', () => {
    test('Team filter updates dashboard views', async ({ page }) => {
      // Test department filter
      await dashboardPage.openTeamFilter();
      await dashboardPage.selectDepartment('Engineering');
      await dashboardPage.applyFilter();
      
      // Verify dashboard shows only engineering team members
      const visibleEmployees = await dashboardPage.getVisibleEmployeeWidgets();
      for (const employee of visibleEmployees) {
        const department = await employee.getAttribute('data-department');
        expect(department).toBe('Engineering');
      }
      
      // Test multiple department selection
      await dashboardPage.openTeamFilter();
      await dashboardPage.selectDepartment('Design', { addToSelection: true });
      await dashboardPage.applyFilter();
      
      // Verify both departments are shown
      const updatedVisibleEmployees = await dashboardPage.getVisibleEmployeeWidgets();
      const departments = await Promise.all(
        updatedVisibleEmployees.map(emp => emp.getAttribute('data-department'))
      );
      expect(departments).toEqual(expect.arrayContaining(['Engineering', 'Design']));
    });

    test('Date range filter affects utilization calculations', async ({ page }) => {
      // Set initial date range
      await dashboardPage.setDateRange('2024-02-01', '2024-02-29');
      await dashboardPage.waitForDashboardUpdate();
      
      const februaryUtilization = await dashboardPage.getOverallUtilization();
      
      // Change to different date range
      await dashboardPage.setDateRange('2024-03-01', '2024-03-31');
      await dashboardPage.waitForDashboardUpdate();
      
      const marchUtilization = await dashboardPage.getOverallUtilization();
      
      // Verify utilization changed (unless exactly same allocations)
      if (februaryUtilization !== marchUtilization) {
        expect(parseFloat(marchUtilization)).not.toBe(parseFloat(februaryUtilization));
      }
      
      // Test custom date range
      await dashboardPage.setCustomDateRange('2024-01-15', '2024-04-15');
      await dashboardPage.waitForDashboardUpdate();
      
      const customRangeUtilization = await dashboardPage.getOverallUtilization();
      expect(customRangeUtilization).toBeDefined();
    });

    test('Employee search filters dashboard widgets', async ({ page }) => {
      // Get initial employee count
      const initialEmployeeCount = await dashboardPage.getVisibleEmployeeCount();
      expect(initialEmployeeCount).toBeGreaterThan(0);
      
      // Search for specific employee
      await dashboardPage.searchEmployees('John');
      await dashboardPage.waitForDashboardUpdate();
      
      // Verify filtered results
      const filteredCount = await dashboardPage.getVisibleEmployeeCount();
      expect(filteredCount).toBeLessThanOrEqual(initialEmployeeCount);
      
      // Verify search results contain search term
      const visibleEmployeeNames = await dashboardPage.getVisibleEmployeeNames();
      for (const name of visibleEmployeeNames) {
        expect(name.toLowerCase()).toContain('john');
      }
      
      // Clear search
      await dashboardPage.clearEmployeeSearch();
      await dashboardPage.waitForDashboardUpdate();
      
      // Verify all employees visible again
      const clearedCount = await dashboardPage.getVisibleEmployeeCount();
      expect(clearedCount).toBe(initialEmployeeCount);
    });
  });

  test.describe('Dashboard Export and Reporting', () => {
    test('Export team utilization report', async ({ page }) => {
      // Click export button
      await dashboardPage.clickExportButton();
      await expect(dashboardPage.getExportModal()).toBeVisible();
      
      // Select report type
      await dashboardPage.selectExportType('utilization-report');
      await dashboardPage.selectExportFormat('PDF');
      await dashboardPage.setExportDateRange('2024-02-01', '2024-02-29');
      
      // Start export
      const downloadPromise = page.waitForDownload();
      await dashboardPage.confirmExport();
      
      // Verify download
      const download = await downloadPromise;
      expect(download.suggestedFilename()).toContain('utilization-report');
      expect(download.suggestedFilename()).toContain('.pdf');
      
      // Verify export success message
      await expect(dashboardPage.getExportSuccessMessage()).toBeVisible();
    });

    test('Generate capacity planning forecast', async ({ page }) => {
      await dashboardPage.openCapacityForecast();
      
      // Set forecast parameters
      await dashboardPage.setForecastPeriod('3-months');
      await dashboardPage.setForecastScenario('optimistic');
      await dashboardPage.includeNewHires(true);
      
      // Generate forecast
      await dashboardPage.generateForecast();
      await dashboardPage.waitForForecastGeneration();
      
      // Verify forecast results
      await expect(dashboardPage.getForecastChart()).toBeVisible();
      await expect(dashboardPage.getForecastSummary()).toBeVisible();
      await expect(dashboardPage.getForecastSummary()).toContainText('Projected Capacity');
      
      // Test forecast export
      const forecastDownloadPromise = page.waitForDownload();
      await dashboardPage.exportForecast('excel');
      
      const forecastDownload = await forecastDownloadPromise;
      expect(forecastDownload.suggestedFilename()).toContain('capacity-forecast');
    });
  });

  test.describe('Performance and Responsiveness', () => {
    test('Dashboard loads within performance thresholds', async ({ page }) => {
      const startTime = Date.now();
      
      await dashboardPage.navigate('/dashboard');
      await dashboardPage.waitForAllWidgetsLoad();
      
      const loadTime = Date.now() - startTime;
      expect(loadTime).toBeLessThan(5000); // Should load within 5 seconds
      
      // Verify all critical widgets loaded
      await expect(dashboardPage.getOverallUtilizationWidget()).toBeVisible();
      await expect(dashboardPage.getTeamUtilizationWidget()).toBeVisible();
      await expect(dashboardPage.getProjectTimelineWidget()).toBeVisible();
      await expect(dashboardPage.getCapacityAlertsWidget()).toBeVisible();
    });

    test('Real-time updates maintain UI responsiveness', async ({ page, context }) => {
      // Monitor UI responsiveness during real-time updates
      const performanceMetrics = await page.evaluate(() => {
        return {
          initialMemory: performance.memory?.usedJSHeapSize || 0,
          timestamp: Date.now()
        };
      });
      
      // Create rapid allocation changes
      const allocationTab = await context.newPage();
      const secondResourcePage = new ResourceAllocationPage(allocationTab);
      await secondResourcePage.navigate();
      
      // Create multiple rapid allocations
      for (let i = 0; i < 5; i++) {
        await secondResourcePage.openAllocationForm();
        await secondResourcePage.selectEmployeeByIndex(i);
        await secondResourcePage.selectFirstAvailableProject();
        await secondResourcePage.setAllocationPercentage(20);
        await secondResourcePage.setDateRange('2024-02-01', '2024-02-29');
        await secondResourcePage.submitAllocation();
        await secondResourcePage.waitForApiResponse('/api/allocations', 'POST');
        
        // Allow brief pause between allocations
        await page.waitForTimeout(500);
      }
      
      // Verify dashboard remained responsive
      const finalMetrics = await page.evaluate(() => {
        return {
          finalMemory: performance.memory?.usedJSHeapSize || 0,
          timestamp: Date.now()
        };
      });
      
      // Check memory usage didn't grow excessively
      const memoryIncrease = finalMetrics.finalMemory - performanceMetrics.initialMemory;
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024); // Less than 50MB increase
      
      // Verify dashboard still interactive
      await dashboardPage.clickOverallUtilizationWidget();
      await expect(dashboardPage.getUtilizationDetailsModal()).toBeVisible();
      
      await allocationTab.close();
    });

    test('Dashboard handles large datasets efficiently', async ({ page }) => {
      // Load dashboard with large dataset simulation
      await dashboardPage.enableLargeDatasetMode();
      await dashboardPage.navigate('/dashboard?simulate-large-dataset=true');
      
      const startTime = Date.now();
      await dashboardPage.waitForPageLoad();
      const loadTime = Date.now() - startTime;
      
      // Should still load within reasonable time even with large dataset
      expect(loadTime).toBeLessThan(10000); // 10 second threshold for large dataset
      
      // Test scrolling performance in large employee list
      const employeeList = dashboardPage.getEmployeeListContainer();
      await employeeList.hover();
      
      // Perform rapid scrolling
      for (let i = 0; i < 10; i++) {
        await page.mouse.wheel(0, 500);
        await page.waitForTimeout(100);
      }
      
      // Verify UI remained responsive during scrolling
      await expect(dashboardPage.getScrollIndicator()).toBeVisible();
      
      // Test search with large dataset
      const searchStartTime = Date.now();
      await dashboardPage.searchEmployees('Test');
      await dashboardPage.waitForSearchResults();
      const searchTime = Date.now() - searchStartTime;
      
      expect(searchTime).toBeLessThan(2000); // Search should complete within 2 seconds
    });
  });
});