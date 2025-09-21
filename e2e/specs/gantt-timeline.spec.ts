import { test, expect } from '@playwright/test';
import { GanttChartPage } from '../pages/GanttChartPage';
import { ResourceAllocationPage } from '../pages/ResourceAllocationPage';

test.describe('Gantt Timeline and Scheduling', () => {
  let ganttPage: GanttChartPage;
  let resourcePage: ResourceAllocationPage;

  test.beforeEach(async ({ page }) => {
    ganttPage = new GanttChartPage(page);
    resourcePage = new ResourceAllocationPage(page);
    
    // Navigate to Gantt chart view
    await ganttPage.navigate('/gantt');
    await ganttPage.waitForPageLoad();
  });

  test.describe('Gantt Chart Rendering and Navigation', () => {
    test('Gantt chart displays project timelines correctly', async ({ page }) => {
      test.setTimeout(60000);
      
      // Verify Gantt chart container is visible
      await expect(ganttPage.getGanttContainer()).toBeVisible();
      
      // Verify timeline headers are present
      await expect(ganttPage.getTimelineHeader()).toBeVisible();
      await ganttPage.verifyTimelineMonths(['February', 'March', 'April']);
      
      // Create a sample project for timeline visualization
      await ganttPage.createSampleProject({
        name: 'Timeline Test Project',
        startDate: '2024-02-15',
        endDate: '2024-04-30',
        priority: 'High'
      });
      
      // Verify project appears in Gantt chart
      const projectBar = ganttPage.getProjectBar('Timeline Test Project');
      await expect(projectBar).toBeVisible();
      
      // Verify project bar spans correct duration
      const barWidth = await projectBar.evaluate(el => el.getBoundingClientRect().width);
      const expectedDuration = ganttPage.calculateExpectedBarWidth('2024-02-15', '2024-04-30');
      expect(barWidth).toBeCloseTo(expectedDuration, 10); // Allow 10px tolerance
      
      // Verify project bar color indicates priority
      await expect(projectBar).toHaveCSS('background-color', /rgb\(255, 87, 87\)/); // High priority red
    });

    test('Timeline navigation and zoom functionality', async ({ page }) => {
      // Test zoom out to yearly view
      await ganttPage.setTimelineZoom('year');
      await expect(ganttPage.getTimelineHeader()).toContainText('2024');
      
      // Test zoom in to weekly view
      await ganttPage.setTimelineZoom('week');
      await ganttPage.verifyTimelineWeeks();
      
      // Test horizontal scrolling
      const initialScrollPosition = await ganttPage.getHorizontalScrollPosition();
      await ganttPage.scrollTimelineRight();
      const afterScrollPosition = await ganttPage.getHorizontalScrollPosition();
      expect(afterScrollPosition).toBeGreaterThan(initialScrollPosition);
      
      // Test "Today" navigation
      await ganttPage.clickTodayButton();
      await ganttPage.verifyTodayIsVisible();
      
      // Test date navigation
      await ganttPage.navigateToDate('2024-06-01');
      await expect(ganttPage.getTimelineHeader()).toContainText('June');
    });

    test('Project dependencies visualization', async ({ page }) => {
      // Create two related projects
      const project1Id = await ganttPage.createSampleProject({
        name: 'Foundation Project',
        startDate: '2024-02-01',
        endDate: '2024-03-15'
      });
      
      const project2Id = await ganttPage.createSampleProject({
        name: 'Dependent Project',
        startDate: '2024-03-16',
        endDate: '2024-05-01'
      });
      
      // Create dependency relationship
      await ganttPage.createDependency(project1Id, project2Id, 'finish-to-start');
      
      // Verify dependency arrow is visible
      const dependencyArrow = ganttPage.getDependencyArrow(project1Id, project2Id);
      await expect(dependencyArrow).toBeVisible();
      
      // Verify dependency hover shows details
      await dependencyArrow.hover();
      await expect(ganttPage.getDependencyTooltip()).toBeVisible();
      await expect(ganttPage.getDependencyTooltip()).toContainText('Finish-to-Start');
      
      // Test dependency validation
      await ganttPage.editProject(project2Id);
      await ganttPage.setProjectStartDate('2024-03-01'); // Invalid - before predecessor ends
      await ganttPage.saveProjectChanges();
      
      // Verify dependency validation warning
      await expect(ganttPage.getDependencyWarning()).toBeVisible();
      await expect(ganttPage.getDependencyWarning()).toContainText('violates dependency');
    });
  });

  test.describe('Interactive Timeline Editing', () => {
    test('Drag to reschedule project timeline', async ({ page }) => {
      // Create project
      const projectId = await ganttPage.createSampleProject({
        name: 'Draggable Project',
        startDate: '2024-03-01',
        endDate: '2024-04-01'
      });
      
      const projectBar = ganttPage.getProjectBar('Draggable Project');
      await expect(projectBar).toBeVisible();
      
      // Get initial position
      const initialBox = await projectBar.boundingBox();
      expect(initialBox).toBeTruthy();
      
      // Drag project to new position (2 weeks later)
      await projectBar.hover();
      await page.mouse.down();
      
      if (initialBox) {
        const newX = initialBox.x + 200; // Move right by 200px (approximately 2 weeks)
        await page.mouse.move(newX, initialBox.y, { steps: 5 });
      }
      
      await page.mouse.up();
      
      // Verify drag feedback during operation
      await expect(ganttPage.getDragFeedback()).toHaveBeenVisible();
      
      // Verify project dates updated
      const updatedProject = await ganttPage.getProjectDetails(projectId);
      expect(new Date(updatedProject.startDate)).toBeGreaterThan(new Date('2024-03-01'));
      
      // Verify database was updated
      const response = await page.request.get(`/api/projects/${projectId}`);
      const projectData = await response.json();
      expect(new Date(projectData.startDate)).toBeGreaterThan(new Date('2024-03-01'));
    });

    test('Resize project timeline by dragging edges', async ({ page }) => {
      const projectId = await ganttPage.createSampleProject({
        name: 'Resizable Project',
        startDate: '2024-03-01',
        endDate: '2024-04-01'
      });
      
      const projectBar = ganttPage.getProjectBar('Resizable Project');
      await expect(projectBar).toBeVisible();
      
      // Test right edge resize (extend end date)
      const rightHandle = ganttPage.getProjectResizeHandle(projectId, 'right');
      await expect(rightHandle).toBeVisible();
      
      const handleBox = await rightHandle.boundingBox();
      expect(handleBox).toBeTruthy();
      
      if (handleBox) {
        await page.mouse.move(handleBox.x, handleBox.y);
        await page.mouse.down();
        await page.mouse.move(handleBox.x + 150, handleBox.y, { steps: 5 }); // Extend by ~1.5 weeks
        await page.mouse.up();
      }
      
      // Verify resize feedback
      await expect(ganttPage.getResizeFeedback()).toHaveBeenVisible();
      
      // Verify end date was extended
      const updatedProject = await ganttPage.getProjectDetails(projectId);
      expect(new Date(updatedProject.endDate)).toBeGreaterThan(new Date('2024-04-01'));
      
      // Test left edge resize (change start date)
      const leftHandle = ganttPage.getProjectResizeHandle(projectId, 'left');
      const leftHandleBox = await leftHandle.boundingBox();
      
      if (leftHandleBox) {
        await page.mouse.move(leftHandleBox.x, leftHandleBox.y);
        await page.mouse.down();
        await page.mouse.move(leftHandleBox.x - 100, leftHandleBox.y, { steps: 5 }); // Start earlier by ~1 week
        await page.mouse.up();
      }
      
      // Verify start date was moved earlier
      const finalProject = await ganttPage.getProjectDetails(projectId);
      expect(new Date(finalProject.startDate)).toBeLessThan(new Date('2024-03-01'));
    });

    test('Create new project by dragging on empty timeline', async ({ page }) => {
      // Click and drag on empty timeline area to create new project
      const emptyTimelineArea = ganttPage.getEmptyTimelineArea('2024-05-01');
      await expect(emptyTimelineArea).toBeVisible();
      
      const areaBox = await emptyTimelineArea.boundingBox();
      expect(areaBox).toBeTruthy();
      
      if (areaBox) {
        // Start drag for new project
        await page.mouse.move(areaBox.x + 50, areaBox.y + 20);
        await page.mouse.down();
        await page.mouse.move(areaBox.x + 250, areaBox.y + 20, { steps: 5 }); // 2-week project
        await page.mouse.up();
      }
      
      // Verify new project creation dialog
      await expect(ganttPage.getNewProjectDialog()).toBeVisible();
      
      // Fill project details
      await ganttPage.fillNewProjectForm({
        name: 'Drag Created Project',
        description: 'Project created by timeline drag',
        priority: 'Medium'
      });
      
      await ganttPage.submitNewProject();
      
      // Verify project appears in timeline
      const newProjectBar = ganttPage.getProjectBar('Drag Created Project');
      await expect(newProjectBar).toBeVisible();
      
      // Verify project was saved to database
      const response = await page.request.get('/api/projects');
      const projects = await response.json();
      const dragCreatedProject = projects.find((p: any) => p.name === 'Drag Created Project');
      expect(dragCreatedProject).toBeTruthy();
    });
  });

  test.describe('Resource Allocation Integration', () => {
    test('Gantt chart shows resource allocation indicators', async ({ page, context }) => {
      // Create project
      const projectId = await ganttPage.createSampleProject({
        name: 'Resource Integrated Project',
        startDate: '2024-03-01',
        endDate: '2024-04-15'
      });
      
      // Create resource allocation in separate tab
      const allocationTab = await context.newPage();
      const tabResourcePage = new ResourceAllocationPage(allocationTab);
      await tabResourcePage.navigate();
      
      await tabResourcePage.openAllocationForm();
      const employeeId = await tabResourcePage.selectFirstAvailableEmployee();
      await tabResourcePage.selectProjectById(projectId);
      await tabResourcePage.setAllocationPercentage(75);
      await tabResourcePage.setDateRange('2024-03-01', '2024-04-15');
      await tabResourcePage.submitAllocation();
      await tabResourcePage.waitForApiResponse('/api/allocations', 'POST');
      
      // Wait for real-time update in Gantt chart
      await page.waitForTimeout(2000);
      
      // Verify resource indicator appears on project bar
      const projectBar = ganttPage.getProjectBar('Resource Integrated Project');
      const resourceIndicator = ganttPage.getProjectResourceIndicator(projectId);
      await expect(resourceIndicator).toBeVisible();
      await expect(resourceIndicator).toContainText('75%');
      
      // Test resource indicator hover
      await resourceIndicator.hover();
      await expect(ganttPage.getResourceTooltip()).toBeVisible();
      await expect(ganttPage.getResourceTooltip()).toContainText('1 team member');
      
      await allocationTab.close();
    });

    test('Resource conflicts highlighted in timeline', async ({ page, context }) => {
      // Create two overlapping projects
      const project1Id = await ganttPage.createSampleProject({
        name: 'Project Alpha',
        startDate: '2024-03-01',
        endDate: '2024-04-01'
      });
      
      const project2Id = await ganttPage.createSampleProject({
        name: 'Project Beta',
        startDate: '2024-03-15',
        endDate: '2024-04-15'
      });
      
      // Create allocations for same employee on both projects
      const allocationTab = await context.newPage();
      const tabResourcePage = new ResourceAllocationPage(allocationTab);
      await tabResourcePage.navigate();
      
      // First allocation
      await tabResourcePage.openAllocationForm();
      const employeeId = await tabResourcePage.selectFirstAvailableEmployee();
      await tabResourcePage.selectProjectById(project1Id);
      await tabResourcePage.setAllocationPercentage(60);
      await tabResourcePage.setDateRange('2024-03-01', '2024-04-01');
      await tabResourcePage.submitAllocation();
      await tabResourcePage.waitForApiResponse('/api/allocations', 'POST');
      
      // Second allocation (creates conflict)
      await tabResourcePage.openAllocationForm();
      await tabResourcePage.selectEmployeeById(employeeId);
      await tabResourcePage.selectProjectById(project2Id);
      await tabResourcePage.setAllocationPercentage(60);
      await tabResourcePage.setDateRange('2024-03-15', '2024-04-15');
      await tabResourcePage.forceSubmitAllocation(); // Force to create over-allocation
      await tabResourcePage.waitForApiResponse('/api/allocations', 'POST');
      
      // Wait for Gantt chart update
      await page.waitForTimeout(2000);
      
      // Verify conflict indicators in timeline
      const conflict1 = ganttPage.getProjectConflictIndicator(project1Id);
      const conflict2 = ganttPage.getProjectConflictIndicator(project2Id);
      
      await expect(conflict1).toBeVisible();
      await expect(conflict2).toBeVisible();
      
      // Verify conflict period is highlighted
      const conflictPeriod = ganttPage.getConflictPeriodHighlight('2024-03-15', '2024-04-01');
      await expect(conflictPeriod).toBeVisible();
      await expect(conflictPeriod).toHaveCSS('background-color', /rgb\(255, 235, 235\)/); // Light red
      
      // Test conflict resolution suggestion
      await conflict1.click();
      await expect(ganttPage.getConflictResolutionDialog()).toBeVisible();
      await expect(ganttPage.getConflictResolutionDialog()).toContainText('Resource over-allocation');
      
      await allocationTab.close();
    });

    test('Capacity planning view in Gantt timeline', async ({ page }) => {
      // Switch to capacity planning mode
      await ganttPage.switchToCapacityMode();
      
      // Verify capacity timeline is visible
      await expect(ganttPage.getCapacityTimeline()).toBeVisible();
      
      // Create multiple projects with different resource requirements
      const projects = [
        { name: 'Small Project', teamSize: 2, startDate: '2024-03-01', endDate: '2024-03-31' },
        { name: 'Medium Project', teamSize: 5, startDate: '2024-03-15', endDate: '2024-05-01' },
        { name: 'Large Project', teamSize: 8, startDate: '2024-04-01', endDate: '2024-06-30' }
      ];
      
      for (const project of projects) {
        await ganttPage.createProjectWithCapacityRequirement(project);
      }
      
      // Verify capacity utilization bars
      const capacityBars = ganttPage.getCapacityUtilizationBars();
      await expect(capacityBars).toHaveCount(3);
      
      // Test capacity threshold warnings
      const overCapacityPeriod = ganttPage.getOverCapacityPeriod();
      if (await overCapacityPeriod.isVisible()) {
        await expect(overCapacityPeriod).toHaveCSS('background-color', /rgb\(255, 205, 210\)/); // Over-capacity red
        
        await overCapacityPeriod.hover();
        await expect(ganttPage.getCapacityWarningTooltip()).toBeVisible();
        await expect(ganttPage.getCapacityWarningTooltip()).toContainText('exceeds available capacity');
      }
    });
  });

  test.describe('Critical Path Analysis', () => {
    test('Critical path highlighting in timeline', async ({ page }) => {
      // Create project sequence with dependencies
      const projects = [
        { name: 'Phase 1', startDate: '2024-03-01', endDate: '2024-03-31', duration: 30 },
        { name: 'Phase 2', startDate: '2024-04-01', endDate: '2024-04-21', duration: 21 },
        { name: 'Phase 3', startDate: '2024-04-22', endDate: '2024-05-15', duration: 24 }
      ];
      
      const projectIds = [];
      for (const project of projects) {
        const projectId = await ganttPage.createSampleProject(project);
        projectIds.push(projectId);
      }
      
      // Create dependencies
      await ganttPage.createDependency(projectIds[0], projectIds[1], 'finish-to-start');
      await ganttPage.createDependency(projectIds[1], projectIds[2], 'finish-to-start');
      
      // Calculate and display critical path
      await ganttPage.calculateCriticalPath();
      
      // Verify critical path is highlighted
      for (const projectId of projectIds) {
        const projectBar = ganttPage.getProjectBar(projectId);
        await expect(projectBar).toHaveCSS('border-color', /rgb\(255, 87, 87\)/); // Critical path red border
      }
      
      // Verify critical path legend
      await expect(ganttPage.getCriticalPathLegend()).toBeVisible();
      await expect(ganttPage.getCriticalPathLegend()).toContainText('Critical Path');
      
      // Test critical path impact analysis
      await ganttPage.selectProject(projectIds[1]);
      await ganttPage.extendProjectDuration(5); // Add 5 days
      
      // Verify impact on downstream projects
      const impactWarning = ganttPage.getCriticalPathImpactWarning();
      await expect(impactWarning).toBeVisible();
      await expect(impactWarning).toContainText('will delay project completion by 5 days');
    });

    test('Slack time visualization', async ({ page }) => {
      // Create projects with different slack times
      const mainPath = await ganttPage.createSampleProject({
        name: 'Critical Task',
        startDate: '2024-03-01',
        endDate: '2024-04-01'
      });
      
      const slackTask = await ganttPage.createSampleProject({
        name: 'Task with Slack',
        startDate: '2024-03-01',
        endDate: '2024-03-15' // Finishes early
      });
      
      // Both feed into final project
      const finalProject = await ganttPage.createSampleProject({
        name: 'Final Phase',
        startDate: '2024-04-02',
        endDate: '2024-04-30'
      });
      
      await ganttPage.createDependency(mainPath, finalProject, 'finish-to-start');
      await ganttPage.createDependency(slackTask, finalProject, 'finish-to-start');
      
      // Calculate and show slack
      await ganttPage.showSlackTime();
      
      // Verify slack visualization
      const slackIndicator = ganttPage.getSlackTimeIndicator(slackTask);
      await expect(slackIndicator).toBeVisible();
      await expect(slackIndicator).toHaveCSS('background-color', /rgb\(144, 238, 144\)/); // Light green for slack
      
      // Test slack time tooltip
      await slackIndicator.hover();
      await expect(ganttPage.getSlackTooltip()).toBeVisible();
      await expect(ganttPage.getSlackTooltip()).toContainText('16 days of slack');
    });
  });

  test.describe('Timeline Performance and Optimization', () => {
    test('Large project dataset rendering performance', async ({ page }) => {
      const startTime = Date.now();
      
      // Create large number of projects
      const projectPromises = [];
      for (let i = 0; i < 50; i++) {
        const startDate = new Date('2024-03-01');
        startDate.setDate(startDate.getDate() + (i * 7)); // Stagger start dates
        
        const endDate = new Date(startDate);
        endDate.setDate(endDate.getDate() + (Math.random() * 30 + 14)); // Random duration 2-6 weeks
        
        projectPromises.push(
          ganttPage.createSampleProject({
            name: `Project ${i + 1}`,
            startDate: startDate.toISOString().split('T')[0],
            endDate: endDate.toISOString().split('T')[0]
          })
        );
      }
      
      await Promise.all(projectPromises);
      
      // Wait for timeline to render
      await ganttPage.waitForTimelineRender();
      const renderTime = Date.now() - startTime;
      
      // Verify rendering performance
      expect(renderTime).toBeLessThan(10000); // Should render within 10 seconds
      
      // Test scrolling performance
      const scrollStartTime = Date.now();
      await ganttPage.scrollTimelineToEnd();
      const scrollTime = Date.now() - scrollStartTime;
      
      expect(scrollTime).toBeLessThan(2000); // Scrolling should be smooth
      
      // Verify all projects visible
      const visibleProjects = await ganttPage.getVisibleProjectBars();
      expect(visibleProjects.length).toBeGreaterThan(0);
    });

    test('Real-time updates performance with active timeline', async ({ page, context }) => {
      // Load timeline with moderate number of projects
      for (let i = 0; i < 20; i++) {
        await ganttPage.createSampleProject({
          name: `Timeline Project ${i}`,
          startDate: '2024-03-01',
          endDate: '2024-04-01'
        });
      }
      
      // Monitor performance during real-time updates
      const performanceObserver = await page.evaluate(() => {
        const entries: any[] = [];
        const observer = new PerformanceObserver((list) => {
          entries.push(...list.getEntries());
        });
        observer.observe({ entryTypes: ['measure', 'navigation'] });
        return entries;
      });
      
      // Create resource allocations in background tab
      const allocationTab = await context.newPage();
      const tabResourcePage = new ResourceAllocationPage(allocationTab);
      await tabResourcePage.navigate();
      
      // Create multiple rapid allocations
      for (let i = 0; i < 10; i++) {
        await tabResourcePage.openAllocationForm();
        await tabResourcePage.selectEmployeeByIndex(i % 5); // Rotate through employees
        await tabResourcePage.selectProjectByIndex(i % 20); // Rotate through projects
        await tabResourcePage.setAllocationPercentage(25);
        await tabResourcePage.setDateRange('2024-03-01', '2024-04-01');
        await tabResourcePage.submitAllocation();
        await tabResourcePage.waitForApiResponse('/api/allocations', 'POST');
        
        // Brief pause between allocations
        await page.waitForTimeout(200);
      }
      
      // Verify timeline remained responsive
      const timelineInteraction = ganttPage.getGanttContainer();
      await expect(timelineInteraction).toBeVisible();
      
      // Test interaction responsiveness
      const interactionStartTime = Date.now();
      await ganttPage.scrollTimelineRight();
      await ganttPage.scrollTimelineLeft();
      const interactionTime = Date.now() - interactionStartTime;
      
      expect(interactionTime).toBeLessThan(1000); // Interactions should remain snappy
      
      await allocationTab.close();
    });

    test('Timeline memory usage optimization', async ({ page }) => {
      // Measure initial memory usage
      const initialMemory = await page.evaluate(() => {
        return (performance as any).memory?.usedJSHeapSize || 0;
      });
      
      // Create and destroy projects to test memory management
      const createdProjectIds = [];
      
      // Create projects
      for (let i = 0; i < 30; i++) {
        const projectId = await ganttPage.createSampleProject({
          name: `Memory Test Project ${i}`,
          startDate: '2024-03-01',
          endDate: '2024-04-01'
        });
        createdProjectIds.push(projectId);
      }
      
      // Delete half the projects
      for (let i = 0; i < 15; i++) {
        await ganttPage.deleteProject(createdProjectIds[i]);
      }
      
      // Force garbage collection if available
      await page.evaluate(() => {
        if ((window as any).gc) {
          (window as any).gc();
        }
      });
      
      // Measure final memory usage
      const finalMemory = await page.evaluate(() => {
        return (performance as any).memory?.usedJSHeapSize || 0;
      });
      
      // Memory should not have increased excessively
      const memoryIncrease = finalMemory - initialMemory;
      expect(memoryIncrease).toBeLessThan(20 * 1024 * 1024); // Less than 20MB increase
      
      // Verify timeline still functional
      await expect(ganttPage.getGanttContainer()).toBeVisible();
      await ganttPage.scrollTimelineRight();
      
      const remainingProjects = await ganttPage.getVisibleProjectBars();
      expect(remainingProjects.length).toBe(15); // Should show remaining 15 projects
    });
  });
});