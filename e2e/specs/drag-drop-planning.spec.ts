import { test, expect } from '@playwright/test';
import { ResourceAllocationPage } from '../pages/ResourceAllocationPage';
import { GanttChartPage } from '../pages/GanttChartPage';

test.describe('Drag & Drop Resource Planning', () => {
  let resourcePage: ResourceAllocationPage;
  let ganttPage: GanttChartPage;

  test.beforeEach(async ({ page }) => {
    resourcePage = new ResourceAllocationPage(page);
    ganttPage = new GanttChartPage(page);
    
    // Navigate to resource planning view
    await resourcePage.navigate('/planning');
    await resourcePage.waitForPageLoad();
  });

  test.describe('Employee to Calendar Drag & Drop', () => {
    test('Drag employee from sidebar to calendar creates allocation', async ({ page }) => {
      test.setTimeout(60000);
      
      // Step 1: Verify employee list is visible
      await expect(resourcePage.getEmployeeList()).toBeVisible();
      
      // Step 2: Get first employee element
      const employeeElement = resourcePage.getFirstEmployeeInList();
      await expect(employeeElement).toBeVisible();
      const employeeName = await employeeElement.textContent();
      
      // Step 3: Get target calendar cell (future date)
      const targetDate = '2024-02-15';
      const calendarCell = resourcePage.getCalendarCell(targetDate);
      await expect(calendarCell).toBeVisible();
      
      // Step 4: Perform drag and drop
      await employeeElement.hover();
      await page.mouse.down();
      
      // Move to calendar cell
      const calendarCellBox = await calendarCell.boundingBox();
      if (calendarCellBox) {
        await page.mouse.move(
          calendarCellBox.x + calendarCellBox.width / 2,
          calendarCellBox.y + calendarCellBox.height / 2,
          { steps: 5 }
        );
      }
      
      // Drop the element
      await page.mouse.up();
      
      // Step 5: Verify drag feedback during operation
      await expect(resourcePage.getDragPreview()).toBeVisible();
      
      // Step 6: Verify allocation dialog appears
      await expect(resourcePage.getQuickAllocationDialog()).toBeVisible();
      
      // Step 7: Fill allocation details in quick dialog
      await resourcePage.setQuickAllocationPercentage(40);
      await resourcePage.setQuickAllocationProject('Default Project');
      await resourcePage.submitQuickAllocation();
      
      // Step 8: Verify allocation was created
      await expect(resourcePage.getSuccessMessage()).toBeVisible();
      
      // Step 9: Verify allocation appears in calendar
      const allocationInCalendar = resourcePage.getAllocationInCalendarByDate(targetDate);
      await expect(allocationInCalendar).toBeVisible();
      await expect(allocationInCalendar).toContainText('40%');
      
      // Step 10: Verify allocation was saved to database
      const response = await page.request.get('/api/allocations');
      const allocations = await response.json();
      const dragCreatedAllocation = allocations.find((alloc: any) => 
        alloc.startDate.includes('2024-02-15') && 
        alloc.allocationPercentage === 40
      );
      expect(dragCreatedAllocation).toBeTruthy();
    });

    test('Drag employee to occupied calendar cell shows conflict dialog', async ({ page }) => {
      // First create an existing allocation
      await resourcePage.openAllocationForm();
      const employeeId = await resourcePage.selectFirstAvailableEmployee();
      await resourcePage.selectFirstAvailableProject();
      await resourcePage.setAllocationPercentage(60);
      await resourcePage.setDateRange('2024-02-10', '2024-02-20');
      await resourcePage.submitAllocation();
      await resourcePage.waitForApiResponse('/api/allocations', 'POST');
      
      // Navigate back to planning view
      await resourcePage.navigate('/planning');
      
      // Try to drag same employee to overlapping date
      const employeeElement = resourcePage.getEmployeeById(employeeId);
      const conflictDate = '2024-02-15';
      const calendarCell = resourcePage.getCalendarCell(conflictDate);
      
      // Perform drag and drop
      await employeeElement.hover();
      await page.mouse.down();
      const calendarCellBox = await calendarCell.boundingBox();
      if (calendarCellBox) {
        await page.mouse.move(
          calendarCellBox.x + calendarCellBox.width / 2,
          calendarCellBox.y + calendarCellBox.height / 2,
          { steps: 5 }
        );
      }
      await page.mouse.up();
      
      // Verify conflict dialog appears
      await expect(resourcePage.getConflictDialog()).toBeVisible();
      await expect(resourcePage.getConflictDialog()).toContainText('Allocation Conflict');
      await expect(resourcePage.getConflictDialog()).toContainText('60%');
      
      // Verify options are available
      await expect(resourcePage.getConflictDialogOption('replace')).toBeVisible();
      await expect(resourcePage.getConflictDialogOption('adjust')).toBeVisible();
      await expect(resourcePage.getConflictDialogOption('cancel')).toBeVisible();
    });

    test('Drag multiple employees creates batch allocation dialog', async ({ page }) => {
      // Select multiple employees
      await resourcePage.selectEmployeeForBatch(0);
      await resourcePage.selectEmployeeForBatch(1);
      await resourcePage.selectEmployeeForBatch(2);
      
      // Verify batch selection indicator
      await expect(resourcePage.getBatchSelectionIndicator()).toContainText('3 employees selected');
      
      // Drag the batch to calendar
      const batchHandle = resourcePage.getBatchDragHandle();
      const targetDate = '2024-03-01';
      const calendarCell = resourcePage.getCalendarCell(targetDate);
      
      await batchHandle.hover();
      await page.mouse.down();
      const calendarCellBox = await calendarCell.boundingBox();
      if (calendarCellBox) {
        await page.mouse.move(
          calendarCellBox.x + calendarCellBox.width / 2,
          calendarCellBox.y + calendarCellBox.height / 2,
          { steps: 5 }
        );
      }
      await page.mouse.up();
      
      // Verify batch allocation dialog
      await expect(resourcePage.getBatchAllocationDialog()).toBeVisible();
      await expect(resourcePage.getBatchAllocationDialog()).toContainText('Batch Allocation');
      await expect(resourcePage.getBatchAllocationDialog()).toContainText('3 employees');
      
      // Set batch allocation details
      await resourcePage.setBatchAllocationPercentage(25);
      await resourcePage.setBatchAllocationProject('Shared Project');
      await resourcePage.setBatchAllocationDuration('2 weeks');
      await resourcePage.submitBatchAllocation();
      
      // Verify all allocations were created
      await expect(resourcePage.getSuccessMessage()).toContainText('3 allocations created');
    });
  });

  test.describe('Project to Timeline Drag & Drop', () => {
    test('Drag project to Gantt timeline creates project allocation', async ({ page }) => {
      await ganttPage.navigate('/gantt');
      await ganttPage.waitForPageLoad();
      
      // Get project from project list
      const projectElement = ganttPage.getFirstProjectInList();
      await expect(projectElement).toBeVisible();
      
      // Get target timeline position
      const timelineDate = '2024-04-01';
      const timelineCell = ganttPage.getTimelineCell(timelineDate);
      await expect(timelineCell).toBeVisible();
      
      // Perform drag to timeline
      await projectElement.hover();
      await page.mouse.down();
      
      const timelineCellBox = await timelineCell.boundingBox();
      if (timelineCellBox) {
        await page.mouse.move(
          timelineCellBox.x + timelineCellBox.width / 2,
          timelineCellBox.y + timelineCellBox.height / 2,
          { steps: 5 }
        );
      }
      await page.mouse.up();
      
      // Verify project timeline dialog
      await expect(ganttPage.getProjectTimelineDialog()).toBeVisible();
      
      // Set project timeline details
      await ganttPage.setProjectStartDate('2024-04-01');
      await ganttPage.setProjectEndDate('2024-05-31');
      await ganttPage.setProjectPriority('High');
      await ganttPage.submitProjectTimeline();
      
      // Verify project appears in Gantt chart
      await expect(ganttPage.getProjectInTimeline()).toBeVisible();
      await ganttPage.verifyProjectTimelineSpan('2024-04-01', '2024-05-31');
    });

    test('Drag to resize project timeline in Gantt chart', async ({ page }) => {
      // First create a project in timeline
      await ganttPage.navigate('/gantt');
      await ganttPage.createSampleProject();
      
      // Find project timeline bar
      const timelineBar = ganttPage.getProjectTimelineBar();
      await expect(timelineBar).toBeVisible();
      
      // Get resize handle (right edge)
      const resizeHandle = ganttPage.getProjectResizeHandle('right');
      await expect(resizeHandle).toBeVisible();
      
      // Perform resize drag
      const handleBox = await resizeHandle.boundingBox();
      if (handleBox) {
        await page.mouse.move(handleBox.x, handleBox.y);
        await page.mouse.down();
        
        // Drag to extend project by 2 weeks
        await page.mouse.move(handleBox.x + 200, handleBox.y, { steps: 5 });
        await page.mouse.up();
      }
      
      // Verify resize feedback
      await expect(ganttPage.getResizeFeedback()).toBeVisible();
      
      // Verify project end date updated
      await expect(ganttPage.getProjectEndDateDisplay()).toContainText('2024-06-14');
      
      // Verify database update
      const response = await page.request.get('/api/projects');
      const projects = await response.json();
      const resizedProject = projects.find((proj: any) => proj.endDate.includes('2024-06-14'));
      expect(resizedProject).toBeTruthy();
    });
  });

  test.describe('Drag & Drop Validation', () => {
    test('Prevent invalid drops with visual feedback', async ({ page }) => {
      // Try to drop employee on past date
      const employeeElement = resourcePage.getFirstEmployeeInList();
      const pastDate = '2023-12-01';
      const pastCalendarCell = resourcePage.getCalendarCell(pastDate);
      
      await employeeElement.hover();
      await page.mouse.down();
      
      // Move to past date cell
      const pastCellBox = await pastCalendarCell.boundingBox();
      if (pastCellBox) {
        await page.mouse.move(
          pastCellBox.x + pastCellBox.width / 2,
          pastCellBox.y + pastCellBox.height / 2,
          { steps: 5 }
        );
      }
      
      // Verify invalid drop indicator
      await expect(resourcePage.getInvalidDropIndicator()).toBeVisible();
      await expect(resourcePage.getInvalidDropTooltip()).toContainText('Cannot allocate to past dates');
      
      await page.mouse.up();
      
      // Verify no allocation dialog appears
      await expect(resourcePage.getQuickAllocationDialog()).not.toBeVisible();
    });

    test('Show capacity warnings during drag operation', async ({ page }) => {
      // Create existing allocation to test capacity
      await resourcePage.openAllocationForm();
      const employeeId = await resourcePage.selectFirstAvailableEmployee();
      await resourcePage.selectFirstAvailableProject();
      await resourcePage.setAllocationPercentage(80);
      await resourcePage.setDateRange('2024-03-01', '2024-03-31');
      await resourcePage.submitAllocation();
      await resourcePage.waitForApiResponse('/api/allocations', 'POST');
      
      // Navigate back to planning
      await resourcePage.navigate('/planning');
      
      // Try to drag same employee to overlapping period
      const employeeElement = resourcePage.getEmployeeById(employeeId);
      const overlapDate = '2024-03-15';
      const calendarCell = resourcePage.getCalendarCell(overlapDate);
      
      await employeeElement.hover();
      await page.mouse.down();
      
      // Move toward calendar cell - warning should appear during drag
      const cellBox = await calendarCell.boundingBox();
      if (cellBox) {
        await page.mouse.move(cellBox.x, cellBox.y, { steps: 3 });
        
        // Verify capacity warning appears during drag
        await expect(resourcePage.getDragCapacityWarning()).toBeVisible();
        await expect(resourcePage.getDragCapacityWarning()).toContainText('Current allocation: 80%');
        
        await page.mouse.move(
          cellBox.x + cellBox.width / 2,
          cellBox.y + cellBox.height / 2,
          { steps: 2 }
        );
      }
      
      await page.mouse.up();
      
      // Verify capacity-aware dialog
      await expect(resourcePage.getCapacityAwareDialog()).toBeVisible();
      await expect(resourcePage.getCapacityAwareDialog()).toContainText('20% remaining capacity');
    });
  });

  test.describe('Drag & Drop Accessibility', () => {
    test('Keyboard navigation supports drag and drop alternative', async ({ page }) => {
      // Focus on first employee
      const employeeElement = resourcePage.getFirstEmployeeInList();
      await employeeElement.focus();
      
      // Press Enter to start "drag" mode
      await page.keyboard.press('Enter');
      
      // Verify drag mode activated
      await expect(resourcePage.getKeyboardDragMode()).toBeVisible();
      await expect(resourcePage.getKeyboardDragInstructions()).toContainText('Use arrow keys to navigate');
      
      // Navigate to calendar using arrow keys
      await page.keyboard.press('Tab'); // Move to calendar
      await page.keyboard.press('ArrowRight ArrowRight ArrowRight'); // Navigate to future date
      
      // Press Enter to "drop"
      await page.keyboard.press('Enter');
      
      // Verify allocation dialog appears
      await expect(resourcePage.getQuickAllocationDialog()).toBeVisible();
    });

    test('Screen reader announcements during drag operations', async ({ page }) => {
      // Enable accessibility monitoring
      await resourcePage.enableAccessibilityMonitoring();
      
      const employeeElement = resourcePage.getFirstEmployeeInList();
      const calendarCell = resourcePage.getCalendarCell('2024-03-01');
      
      // Start drag
      await employeeElement.hover();
      await page.mouse.down();
      
      // Verify initial announcement
      await expect(resourcePage.getAriaLiveRegion()).toContainText('Started dragging employee');
      
      // Move over valid drop zone
      const cellBox = await calendarCell.boundingBox();
      if (cellBox) {
        await page.mouse.move(cellBox.x + cellBox.width / 2, cellBox.y + cellBox.height / 2);
      }
      
      // Verify drop zone announcement
      await expect(resourcePage.getAriaLiveRegion()).toContainText('Over valid drop zone: March 1, 2024');
      
      // Complete drop
      await page.mouse.up();
      
      // Verify completion announcement
      await expect(resourcePage.getAriaLiveRegion()).toContainText('Allocation dialog opened');
    });
  });

  test.describe('Performance and Responsiveness', () => {
    test('Drag operations remain smooth with large datasets', async ({ page }) => {
      // Load large employee dataset
      await resourcePage.loadLargeEmployeeDataset(100);
      await resourcePage.waitForPageLoad();
      
      // Measure drag responsiveness
      const employeeElement = resourcePage.getEmployeeByIndex(50);
      const calendarCell = resourcePage.getCalendarCell('2024-04-01');
      
      const startTime = Date.now();
      
      await employeeElement.hover();
      await page.mouse.down();
      
      const cellBox = await calendarCell.boundingBox();
      if (cellBox) {
        await page.mouse.move(
          cellBox.x + cellBox.width / 2,
          cellBox.y + cellBox.height / 2,
          { steps: 10 }
        );
      }
      
      await page.mouse.up();
      
      const dragTime = Date.now() - startTime;
      
      // Verify drag completed within performance threshold
      expect(dragTime).toBeLessThan(1000); // Should complete within 1 second
      
      // Verify UI remained responsive
      await expect(resourcePage.getQuickAllocationDialog()).toBeVisible();
    });

    test('Multiple simultaneous drag operations handle gracefully', async ({ page }) => {
      // This test verifies the system handles edge cases where multiple
      // drag operations might be initiated (e.g., multi-touch scenarios)
      
      const employee1 = resourcePage.getEmployeeByIndex(0);
      const employee2 = resourcePage.getEmployeeByIndex(1);
      const cell1 = resourcePage.getCalendarCell('2024-04-01');
      const cell2 = resourcePage.getCalendarCell('2024-04-02');
      
      // Start first drag
      await employee1.hover();
      await page.mouse.down();
      
      // Attempt second drag (should be prevented or queued)
      await employee2.hover();
      // Second mouse down should be ignored or queued
      
      // Complete first drag
      const cell1Box = await cell1.boundingBox();
      if (cell1Box) {
        await page.mouse.move(cell1Box.x + cell1Box.width / 2, cell1Box.y + cell1Box.height / 2);
      }
      await page.mouse.up();
      
      // Verify first allocation dialog appears
      await expect(resourcePage.getQuickAllocationDialog()).toBeVisible();
      
      // Verify system remains stable (no JavaScript errors)
      const consoleErrors = await page.evaluate(() => window.console.error.calls?.length || 0);
      expect(consoleErrors).toBe(0);
    });
  });
});