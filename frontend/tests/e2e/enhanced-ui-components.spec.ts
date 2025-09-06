/**
 * Enhanced UI Components E2E Tests
 * Tests interactive components, drag-and-drop, real-time updates, and animations
 */
import { test, expect } from '@playwright/test';
import { test as base, VIEWPORTS } from '../fixtures/test-fixtures';

const { test: enhancedTest, expect: enhancedExpected } = base;

enhancedTest.describe('Enhanced UI Components', () => {
  
  enhancedTest.describe('Interactive Dashboard Components', () => {
    
    enhancedTest.beforeEach(async ({ page, testHelpers }) => {
      await page.goto('/dashboard');
      await testHelpers.waitForElement('[data-testid="main-dashboard"]');
    });

    enhancedTest('should handle interactive dashboard widgets', async ({ page, testHelpers }) => {
      // Test widget configuration
      await page.click('[data-testid="customize-dashboard"]');
      await testHelpers.waitForElement('[data-testid="widget-customization-panel"]');
      
      // Add new widget
      await page.click('[data-testid="add-widget"]');
      await testHelpers.waitForElement('[data-testid="widget-gallery"]');
      
      // Select resource utilization widget
      await page.click('[data-testid="widget-resource-utilization"]');
      await testHelpers.waitForElement('[data-testid="widget-config-modal"]');
      
      // Configure widget settings
      await page.selectOption('[data-testid="chart-type"]', 'donut');
      await page.selectOption('[data-testid="time-period"]', 'last-30-days');
      await page.check('[data-testid="show-legend"]');
      await page.check('[data-testid="auto-refresh"]');
      
      // Set widget size and position
      await page.selectOption('[data-testid="widget-size"]', 'medium');
      await page.click('[data-testid="save-widget-config"]');
      
      // Verify widget was added to dashboard
      await testHelpers.waitForElement('[data-testid="widget-resource-utilization-chart"]');
      
      // Test widget drag and drop repositioning
      const widget = page.locator('[data-testid="widget-resource-utilization-chart"]');
      const dropZone = page.locator('[data-testid="dashboard-grid-cell-2-1"]');
      
      await testHelpers.dragAndDrop(
        '[data-testid="widget-resource-utilization-chart"]',
        '[data-testid="dashboard-grid-cell-2-1"]'
      );
      
      // Verify widget moved to new position
      await expect(page.locator('[data-testid="dashboard-grid-cell-2-1"] [data-testid="widget-resource-utilization-chart"]')).toBeVisible();
      
      // Test widget resizing
      await widget.click();
      await page.click('[data-testid="resize-widget"]');
      
      // Drag resize handle
      const resizeHandle = page.locator('[data-testid="widget-resize-handle-se"]');
      await resizeHandle.dragTo(page.locator('[data-testid="resize-target"]'), {
        targetPosition: { x: 100, y: 100 }
      });
      
      // Verify widget size changed
      await expect(widget).toHaveAttribute('data-size', 'large');
      
      // Test widget data refresh
      await widget.hover();
      await page.click('[data-testid="refresh-widget"]');
      await testHelpers.waitForElement('[data-testid="widget-loading-indicator"]');
      await testHelpers.waitForElement('[data-testid="widget-data-updated"]');
      
      // Test widget interactions
      const chartSegment = page.locator('[data-testid="chart-segment-frontend"]');
      await chartSegment.hover();
      await expect(page.locator('[data-testid="chart-tooltip"]')).toBeVisible();
      await expect(page.locator('[data-testid="tooltip-value"]')).toContainText('Frontend: ');
      
      // Click segment for drill-down
      await chartSegment.click();
      await testHelpers.waitForElement('[data-testid="drill-down-modal"]');
      await expect(page.locator('[data-testid="frontend-details"]')).toBeVisible();
      
      // Test widget export
      await page.click('[data-testid="export-widget"]');
      await testHelpers.waitForElement('[data-testid="export-options"]');
      await page.click('[data-testid="export-png"]');
      
      // Wait for download
      const downloadPromise = page.waitForEvent('download');
      const download = await downloadPromise;
      expect(download.suggestedFilename()).toMatch(/resource-utilization.*\.png/);
    });

    enhancedTest('should handle real-time data updates and animations', async ({ page, testHelpers }) => {
      // Test real-time project status updates
      await testHelpers.waitForElement('[data-testid="project-status-widget"]');
      
      // Enable real-time mode
      await page.click('[data-testid="enable-real-time"]');
      await testHelpers.waitForElement('[data-testid="real-time-indicator"]');
      
      // Verify WebSocket connection established
      await testHelpers.waitForWebSocket();
      
      // Test animated progress bars
      const progressBar = page.locator('[data-testid="project-progress-bar"]').first();
      await expect(progressBar).toBeVisible();
      
      // Verify progress bar animation
      await testHelpers.waitForAnimation('[data-testid="progress-animation"]');
      
      // Test count-up animations for metrics
      const metricValue = page.locator('[data-testid="total-projects-count"]');
      await expect(metricValue).toBeVisible();
      
      // Wait for count-up animation to complete
      await page.waitForFunction(() => {
        const element = document.querySelector('[data-testid="total-projects-count"]');
        return element && !element.classList.contains('counting');
      });
      
      // Test chart animations
      await page.click('[data-testid="animated-chart-widget"]');
      await testHelpers.waitForAnimation('[data-testid="chart-bars"]');
      
      // Test hover animations
      const dashboardCard = page.locator('[data-testid="project-card"]').first();
      await dashboardCard.hover();
      
      // Verify hover effects
      await expect(dashboardCard).toHaveClass(/.*hover-elevated.*/);
      await testHelpers.waitForAnimation('[data-testid="card-hover-animation"]');
      
      // Test notification animations
      await page.click('[data-testid="trigger-notification"]'); // Simulate notification trigger
      await testHelpers.waitForElement('[data-testid="notification-slide-in"]');
      await testHelpers.waitForAnimation('[data-testid="notification-animation"]');
      
      // Test loading state animations
      await page.click('[data-testid="refresh-data"]');
      await testHelpers.waitForElement('[data-testid="skeleton-loading"]');
      await testHelpers.waitForAnimation('[data-testid="skeleton-pulse"]');
      
      // Wait for data load completion
      await testHelpers.verifyLoading(false);
      await testHelpers.waitForAnimation('[data-testid="content-fade-in"]');
    });
  });

  enhancedTest.describe('Advanced Form Components', () => {
    
    enhancedTest.beforeEach(async ({ page, testHelpers }) => {
      await page.goto('/projects/create');
      await testHelpers.waitForElement('[data-testid="project-creation-form"]');
    });

    enhancedTest('should handle dynamic form fields and validation', async ({ page, testHelpers }) => {
      // Test conditional form fields
      await page.selectOption('[data-testid="project-type"]', 'complex');
      
      // Verify additional fields appear
      await testHelpers.waitForElement('[data-testid="complexity-options"]');
      await expect(page.locator('[data-testid="risk-assessment-field"]')).toBeVisible();
      await expect(page.locator('[data-testid="stakeholder-count-field"]')).toBeVisible();
      
      // Test dynamic skill requirements
      await page.click('[data-testid="add-skill-requirement"]');
      await testHelpers.waitForElement('[data-testid="skill-requirement-0"]');
      
      // Use skill autocomplete
      await page.fill('[data-testid="skill-input-0"]', 'Reac');
      await testHelpers.waitForElement('[data-testid="skill-suggestions"]');
      await expect(page.locator('[data-testid="suggestion-react"]')).toBeVisible();
      await page.click('[data-testid="suggestion-react"]');
      
      // Verify skill was added
      await expect(page.locator('[data-testid="selected-skill-react"]')).toBeVisible();
      
      // Test skill requirement configuration
      await page.selectOption('[data-testid="skill-level-react"]', 'senior');
      await page.fill('[data-testid="skill-weight-react"]', '0.8');
      
      // Add multiple skills
      await page.click('[data-testid="add-skill-requirement"]');
      await page.fill('[data-testid="skill-input-1"]', 'Node.js');
      await page.click('[data-testid="suggestion-nodejs"]');
      
      // Test form validation
      await testHelpers.fillFormField('[data-testid="project-name"]', ''); // Clear required field
      await page.click('[data-testid="validate-form"]');
      
      // Verify validation errors
      await expect(page.locator('[data-testid="error-project-name"]')).toContainText('Project name is required');
      await expect(page.locator('[data-testid="field-error-indicator"]')).toBeVisible();
      
      // Test cross-field validation
      await page.fill('[data-testid="start-date"]', '2024-06-01');
      await page.fill('[data-testid="end-date"]', '2024-05-01'); // End before start
      
      await page.blur(); // Trigger validation
      await expect(page.locator('[data-testid="error-date-range"]')).toContainText('End date must be after start date');
      
      // Fix validation errors
      await testHelpers.fillFormField('[data-testid="project-name"]', 'Test Project');
      await page.fill('[data-testid="end-date"]', '2024-12-31');
      
      // Test budget calculation field
      await testHelpers.fillFormField('[data-testid="hourly-rate"]', '100');
      await testHelpers.fillFormField('[data-testid="estimated-hours"]', '500');
      
      // Verify calculated budget updates automatically
      await expect(page.locator('[data-testid="calculated-budget"]')).toContainText('$50,000');
      
      // Test form auto-save
      await page.waitForTimeout(3000); // Wait for auto-save interval
      await expect(page.locator('[data-testid="auto-save-indicator"]')).toContainText('Draft saved');
    });

    enhancedTest('should handle multi-step form navigation', async ({ page, testHelpers }) => {
      // Navigate through form steps
      await testHelpers.fillFormField('[data-testid="project-name"]', 'Multi-Step Project');
      await testHelpers.fillFormField('[data-testid="client-name"]', 'Test Client');
      
      // Go to next step
      await page.click('[data-testid="next-step"]');
      await testHelpers.waitForElement('[data-testid="form-step-2"]');
      
      // Verify step indicator
      await expect(page.locator('[data-testid="step-indicator-2"]')).toHaveClass(/.*active.*/);
      
      // Test step validation before proceeding
      await page.click('[data-testid="next-step"]');
      await expect(page.locator('[data-testid="step-validation-error"]')).toBeVisible();
      
      // Fill required fields for step 2
      await page.fill('[data-testid="start-date"]', '2024-03-01');
      await page.fill('[data-testid="end-date"]', '2024-09-30');
      
      // Proceed to step 3
      await page.click('[data-testid="next-step"]');
      await testHelpers.waitForElement('[data-testid="form-step-3"]');
      
      // Test going back to previous step
      await page.click('[data-testid="previous-step"]');
      await testHelpers.waitForElement('[data-testid="form-step-2"]');
      
      // Verify data persistence
      await expect(page.locator('[data-testid="start-date"]')).toHaveValue('2024-03-01');
      
      // Test step navigation via step indicator
      await page.click('[data-testid="step-indicator-1"]');
      await testHelpers.waitForElement('[data-testid="form-step-1"]');
      
      // Verify form data preserved
      await expect(page.locator('[data-testid="project-name"]')).toHaveValue('Multi-Step Project');
      
      // Complete all steps
      await page.click('[data-testid="step-indicator-3"]');
      await testHelpers.waitForElement('[data-testid="form-step-3"]');
      
      // Fill final step
      await testHelpers.fillFormField('[data-testid="project-description"]', 'Complete project description');
      await page.check('[data-testid="terms-acceptance"]');
      
      // Submit form
      await testHelpers.clickAndWait('[data-testid="submit-form"]', { waitFor: 'networkidle' });
      await testHelpers.verifyToast('Project created successfully');
    });
  });

  enhancedTest.describe('Data Visualization Components', () => {
    
    enhancedTest.beforeEach(async ({ page, testHelpers }) => {
      await page.goto('/analytics');
      await testHelpers.waitForElement('[data-testid="analytics-page"]');
    });

    enhancedTest('should handle interactive charts and filters', async ({ page, testHelpers }) => {
      // Test chart type switching
      await page.click('[data-testid="chart-type-selector"]');
      await page.click('[data-testid="chart-type-line"]');
      
      // Verify chart updates
      await testHelpers.waitForElement('[data-testid="line-chart-container"]');
      await expect(page.locator('[data-testid="line-chart-svg"]')).toBeVisible();
      
      // Switch to bar chart
      await page.click('[data-testid="chart-type-selector"]');
      await page.click('[data-testid="chart-type-bar"]');
      await testHelpers.waitForElement('[data-testid="bar-chart-container"]');
      
      // Test chart interactions
      const chartBar = page.locator('[data-testid="chart-bar"]').first();
      await chartBar.hover();
      
      // Verify tooltip appears
      await expect(page.locator('[data-testid="chart-tooltip"]')).toBeVisible();
      await expect(page.locator('[data-testid="tooltip-title"]')).toContainText('January 2024');
      
      // Test chart zooming
      await page.mouse.wheel(0, -100); // Zoom in
      await testHelpers.waitForAnimation('[data-testid="chart-zoom-animation"]');
      
      // Test chart panning
      await page.mouse.down();
      await page.mouse.move(100, 0);
      await page.mouse.up();
      await testHelpers.waitForAnimation('[data-testid="chart-pan-animation"]');
      
      // Reset zoom and pan\n      await page.click('[data-testid=\"reset-chart-view\"]');\n      await testHelpers.waitForAnimation('[data-testid=\"chart-reset-animation\"]');\n      \n      // Test data filtering\n      await page.click('[data-testid=\"filter-panel-toggle\"]');\n      await testHelpers.waitForElement('[data-testid=\"chart-filters\"]');\n      \n      // Apply date range filter\n      await page.fill('[data-testid=\"filter-date-start\"]', '2024-01-01');\n      await page.fill('[data-testid=\"filter-date-end\"]', '2024-06-30');\n      await page.click('[data-testid=\"apply-date-filter\"]');\n      \n      // Verify chart updates with filtered data\n      await testHelpers.waitForElement('[data-testid=\"filtered-chart-data\"]');\n      \n      // Test category filtering\n      await page.uncheck('[data-testid=\"category-frontend\"]');\n      await page.uncheck('[data-testid=\"category-backend\"]');\n      \n      // Verify chart reflects category filter\n      await expect(page.locator('[data-testid=\"chart-legend-frontend\"]')).toHaveClass(/.*opacity-50.*/);\n      \n      // Test export chart functionality\n      await page.click('[data-testid=\"export-chart\"]');\n      await testHelpers.waitForElement('[data-testid=\"export-options\"]');\n      \n      // Export as PNG\n      const downloadPromise = page.waitForEvent('download');\n      await page.click('[data-testid=\"export-png\"]');\n      const download = await downloadPromise;\n      expect(download.suggestedFilename()).toMatch(/chart.*\\.png/);\n      \n      // Test chart comparison mode\n      await page.click('[data-testid=\"enable-comparison\"]');\n      await testHelpers.waitForElement('[data-testid=\"comparison-selector\"]');\n      \n      // Select comparison period\n      await page.selectOption('[data-testid=\"comparison-period\"]', 'previous-year');\n      \n      // Verify comparison data displays\n      await expect(page.locator('[data-testid=\"comparison-series\"]')).toBeVisible();\n      await expect(page.locator('[data-testid=\"comparison-legend\"]')).toContainText('2023 vs 2024');\n    });\n\n    enhancedTest('should handle complex data tables with sorting and filtering', async ({ page, testHelpers }) => {\n      // Navigate to data table view\n      await page.click('[data-testid=\"table-view-tab\"]');\n      await testHelpers.waitForElement('[data-testid=\"data-table\"]');\n      \n      // Test table sorting\n      await page.click('[data-testid=\"column-header-project-name\"]');\n      await testHelpers.waitForElement('[data-testid=\"sort-indicator-asc\"]');\n      \n      // Verify sorting applied\n      const firstRow = page.locator('[data-testid=\"table-row\"]').first();\n      const firstProjectName = await firstRow.locator('[data-testid=\"project-name\"]').textContent();\n      \n      // Sort descending\n      await page.click('[data-testid=\"column-header-project-name\"]');\n      await testHelpers.waitForElement('[data-testid=\"sort-indicator-desc\"]');\n      \n      // Verify sort order changed\n      const newFirstProjectName = await firstRow.locator('[data-testid=\"project-name\"]').textContent();\n      expect(newFirstProjectName).not.toBe(firstProjectName);\n      \n      // Test multi-column sorting\n      await page.keyboard.down('Control');\n      await page.click('[data-testid=\"column-header-status\"]');\n      await page.keyboard.up('Control');\n      \n      // Verify multi-sort indicators\n      await expect(page.locator('[data-testid=\"sort-indicator-name\"]')).toContainText('1');\n      await expect(page.locator('[data-testid=\"sort-indicator-status\"]')).toContainText('2');\n      \n      // Test column filtering\n      await page.click('[data-testid=\"filter-icon-status\"]');\n      await testHelpers.waitForElement('[data-testid=\"column-filter-menu\"]');\n      \n      // Apply status filter\n      await page.uncheck('[data-testid=\"filter-status-completed\"]');\n      await page.uncheck('[data-testid=\"filter-status-on-hold\"]');\n      await page.click('[data-testid=\"apply-column-filter\"]');\n      \n      // Verify filtered results\n      const visibleRows = page.locator('[data-testid=\"table-row\"]:visible');\n      const rowCount = await visibleRows.count();\n      \n      for (let i = 0; i < rowCount; i++) {\n        const statusCell = visibleRows.nth(i).locator('[data-testid=\"status-cell\"]');\n        const status = await statusCell.textContent();\n        expect(['Active', 'Planning']).toContain(status.trim());\n      }\n      \n      // Test search functionality\n      await testHelpers.fillFormField('[data-testid=\"table-search\"]', 'mobile');\n      \n      // Verify search results\n      await testHelpers.waitForElement('[data-testid=\"search-results\"]');\n      const searchResultRows = page.locator('[data-testid=\"table-row\"]:visible');\n      const searchRowCount = await searchResultRows.count();\n      \n      for (let i = 0; i < searchRowCount; i++) {\n        const row = searchResultRows.nth(i);\n        const rowText = await row.textContent();\n        expect(rowText.toLowerCase()).toContain('mobile');\n      }\n      \n      // Test pagination\n      await page.selectOption('[data-testid=\"rows-per-page\"]', '10');\n      await testHelpers.waitForElement('[data-testid=\"pagination-info\"]');\n      \n      // Navigate to next page\n      await page.click('[data-testid=\"next-page\"]');\n      await testHelpers.waitForElement('[data-testid=\"page-2-indicator\"]');\n      \n      // Test row selection\n      await page.check('[data-testid=\"row-checkbox-0\"]');\n      await page.check('[data-testid=\"row-checkbox-1\"]');\n      \n      // Verify bulk actions available\n      await expect(page.locator('[data-testid=\"bulk-actions-toolbar\"]')).toBeVisible();\n      await expect(page.locator('[data-testid=\"selected-count\"]')).toContainText('2 selected');\n      \n      // Test bulk export\n      await page.click('[data-testid=\"bulk-export\"]');\n      const bulkDownloadPromise = page.waitForEvent('download');\n      await page.click('[data-testid=\"export-selected-csv\"]');\n      const bulkDownload = await bulkDownloadPromise;\n      expect(bulkDownload.suggestedFilename()).toMatch(/selected.*\\.csv/);\n      \n      // Test column customization\n      await page.click('[data-testid=\"customize-columns\"]');\n      await testHelpers.waitForElement('[data-testid=\"column-selector\"]');\n      \n      // Hide some columns\n      await page.uncheck('[data-testid=\"column-toggle-created-date\"]');\n      await page.uncheck('[data-testid=\"column-toggle-updated-date\"]');\n      await page.click('[data-testid=\"apply-column-changes\"]');\n      \n      // Verify columns hidden\n      await expect(page.locator('[data-testid=\"column-header-created-date\"]')).not.toBeVisible();\n      await expect(page.locator('[data-testid=\"column-header-updated-date\"]')).not.toBeVisible();\n      \n      // Test column reordering\n      await testHelpers.dragAndDrop(\n        '[data-testid=\"column-header-client-name\"]',\n        '[data-testid=\"column-header-project-name\"]'\n      );\n      \n      // Verify column order changed\n      const headers = page.locator('[data-testid^=\"column-header-\"]');\n      const firstHeader = await headers.first().getAttribute('data-testid');\n      expect(firstHeader).toBe('column-header-client-name');\n    });\n  });\n\n  enhancedTest.describe('Drag and Drop Interfaces', () => {\n    \n    enhancedTest.beforeEach(async ({ page, testHelpers }) => {\n      await page.goto('/resource-planning');\n      await testHelpers.waitForElement('[data-testid=\"resource-planning-page\"]');\n    });\n\n    enhancedTest('should handle complex drag and drop operations', async ({ page, testHelpers }) => {\n      // Test dragging employees between projects\n      await page.click('[data-testid=\"kanban-view-toggle\"]');\n      await testHelpers.waitForElement('[data-testid=\"kanban-board\"]');\n      \n      // Verify initial project columns\n      await expect(page.locator('[data-testid=\"project-column\"]')).toHaveCount.greaterThan(2);\n      \n      // Test drag and drop employee assignment\n      const employee = page.locator('[data-testid=\"employee-card-alice\"]');\n      const targetProject = page.locator('[data-testid=\"project-column-mobile-app\"]');\n      \n      await testHelpers.dragAndDrop(\n        '[data-testid=\"employee-card-alice\"]',\n        '[data-testid=\"project-column-mobile-app\"]'\n      );\n      \n      // Verify drop zone highlighting during drag\n      await expect(targetProject).toHaveClass(/.*drop-zone-active.*/);\n      \n      // Verify assignment confirmation modal\n      await testHelpers.waitForElement('[data-testid=\"assignment-confirmation\"]');\n      \n      // Configure assignment details\n      await testHelpers.fillFormField('[data-testid=\"allocation-percentage\"]', '75');\n      await page.fill('[data-testid=\"assignment-start-date\"]', '2024-03-01');\n      await page.click('[data-testid=\"confirm-assignment\"]');\n      \n      // Verify employee appears in target project\n      await expect(targetProject.locator('[data-testid=\"employee-card-alice\"]')).toBeVisible();\n      \n      // Test drag to unassigned pool\n      await testHelpers.dragAndDrop(\n        '[data-testid=\"employee-card-bob\"]',\n        '[data-testid=\"unassigned-employees-column\"]'\n      );\n      \n      // Test conflict detection during drag\n      const overAllocatedEmployee = page.locator('[data-testid=\"employee-card-charlie\"]');\n      await testHelpers.dragAndDrop(\n        '[data-testid=\"employee-card-charlie\"]',\n        '[data-testid=\"project-column-backend-migration\"]'\n      );\n      \n      // Verify conflict warning\n      await testHelpers.waitForElement('[data-testid=\"allocation-conflict-warning\"]');\n      await expect(page.locator('[data-testid=\"over-allocation-message\"]')).toBeVisible();\n      \n      // Test resolution options\n      await page.click('[data-testid=\"view-conflict-details\"]');\n      await testHelpers.waitForElement('[data-testid=\"conflict-resolution-options\"]');\n      \n      // Choose resolution strategy\n      await page.click('[data-testid=\"reduce-other-allocations\"]');\n      await page.click('[data-testid=\"apply-resolution\"]');\n      \n      // Test multi-select drag operations\n      await page.keyboard.down('Control');\n      await page.click('[data-testid=\"employee-card-dave\"]');\n      await page.click('[data-testid=\"employee-card-eve\"]');\n      await page.keyboard.up('Control');\n      \n      // Drag multiple selected employees\n      await testHelpers.dragAndDrop(\n        '[data-testid=\"employee-card-dave\"]', // Drag handle for selection\n        '[data-testid=\"project-column-new-feature\"]'\n      );\n      \n      // Verify both employees were moved\n      const newFeatureColumn = page.locator('[data-testid=\"project-column-new-feature\"]');\n      await expect(newFeatureColumn.locator('[data-testid=\"employee-card-dave\"]')).toBeVisible();\n      await expect(newFeatureColumn.locator('[data-testid=\"employee-card-eve\"]')).toBeVisible();\n      \n      // Test drag and drop with constraints\n      const juniorEmployee = page.locator('[data-testid=\"employee-card-junior\"]');\n      const seniorOnlyProject = page.locator('[data-testid=\"project-column-senior-only\"]');\n      \n      await testHelpers.dragAndDrop(\n        '[data-testid=\"employee-card-junior\"]',\n        '[data-testid=\"project-column-senior-only\"]'\n      );\n      \n      // Verify constraint violation warning\n      await testHelpers.waitForElement('[data-testid=\"constraint-violation-modal\"]');\n      await expect(page.locator('[data-testid=\"skill-requirement-mismatch\"]')).toBeVisible();\n      \n      // Cancel invalid assignment\n      await page.click('[data-testid=\"cancel-assignment\"]');\n      \n      // Verify employee returned to original position\n      await expect(page.locator('[data-testid=\"unassigned-employees-column\"] [data-testid=\"employee-card-junior\"]')).toBeVisible();\n    });\n\n    enhancedTest('should handle timeline drag and drop scheduling', async ({ page, testHelpers }) => {\n      // Switch to timeline view\n      await page.click('[data-testid=\"timeline-view-toggle\"]');\n      await testHelpers.waitForElement('[data-testid=\"timeline-view\"]');\n      \n      // Test project timeline adjustment\n      const projectBar = page.locator('[data-testid=\"timeline-bar-mobile-app\"]');\n      \n      // Drag to extend project duration\n      const rightHandle = projectBar.locator('[data-testid=\"resize-handle-right\"]');\n      await rightHandle.dragTo(page.locator('[data-testid=\"timeline-date-2024-12\"]'));\n      \n      // Verify timeline update confirmation\n      await testHelpers.waitForElement('[data-testid=\"timeline-change-confirmation\"]');\n      await expect(page.locator('[data-testid=\"new-end-date\"]')).toContainText('December 2024');\n      \n      // Confirm timeline change\n      await page.click('[data-testid=\"confirm-timeline-change\"]');\n      \n      // Test dependency constraint validation\n      const dependentProject = page.locator('[data-testid=\"timeline-bar-dependent-project\"]');\n      \n      // Try to move dependent project before its dependency\n      await testHelpers.dragAndDrop(\n        '[data-testid=\"timeline-bar-dependent-project\"]',\n        '[data-testid=\"timeline-date-2024-01\"]'\n      );\n      \n      // Verify dependency violation warning\n      await testHelpers.waitForElement('[data-testid=\"dependency-violation-warning\"]');\n      await expect(page.locator('[data-testid=\"dependency-conflict-message\"]')).toContainText('Cannot start before dependency completes');\n      \n      // Test milestone drag and drop\n      const milestone = page.locator('[data-testid=\"milestone-mvp-release\"]');\n      await testHelpers.dragAndDrop(\n        '[data-testid=\"milestone-mvp-release\"]',\n        '[data-testid=\"timeline-date-2024-06\"]'\n      );\n      \n      // Verify milestone moved\n      await expect(page.locator('[data-testid=\"timeline-date-2024-06\"] [data-testid=\"milestone-mvp-release\"]')).toBeVisible();\n      \n      // Test resource allocation drag on timeline\n      const resourceAllocation = page.locator('[data-testid=\"resource-allocation-alice\"]');\n      \n      // Drag to adjust allocation period\n      await testHelpers.dragAndDrop(\n        '[data-testid=\"allocation-start-handle\"]',\n        '[data-testid=\"timeline-date-2024-04\"]'\n      );\n      \n      // Verify allocation adjustment\n      await testHelpers.waitForElement('[data-testid=\"allocation-updated\"]');\n      \n      // Test conflict detection during timeline drag\n      await testHelpers.dragAndDrop(\n        '[data-testid=\"resource-allocation-bob\"]',\n        '[data-testid=\"timeline-overlap-zone\"]'\n      );\n      \n      // Verify overlap warning\n      await testHelpers.waitForElement('[data-testid=\"resource-conflict-indicator\"]');\n      await expect(page.locator('[data-testid=\"overlap-warning\"]')).toBeVisible();\n    });\n  });\n\n  enhancedTest.describe('Responsive Design and Touch Interactions', () => {\n    \n    enhancedTest('should adapt to different screen sizes', async ({ page, testHelpers }) => {\n      // Test responsive dashboard layout\n      await page.goto('/dashboard');\n      await testHelpers.waitForElement('[data-testid=\"main-dashboard\"]');\n      \n      // Test different viewport sizes\n      const viewports = [\n        VIEWPORTS.DESKTOP,\n        VIEWPORTS.TABLET,\n        VIEWPORTS.MOBILE\n      ];\n      \n      for (const viewport of viewports) {\n        await page.setViewportSize(viewport);\n        await page.waitForTimeout(500); // Allow for responsive adjustments\n        \n        // Take screenshot for visual comparison\n        await page.screenshot({\n          path: `test-results/responsive-${viewport.name}-dashboard.png`,\n          fullPage: true\n        });\n        \n        if (viewport.name === 'mobile') {\n          // Test mobile-specific UI elements\n          await expect(page.locator('[data-testid=\"mobile-menu-trigger\"]')).toBeVisible();\n          await expect(page.locator('[data-testid=\"desktop-sidebar\"]')).not.toBeVisible();\n          \n          // Test mobile navigation\n          await page.click('[data-testid=\"mobile-menu-trigger\"]');\n          await testHelpers.waitForElement('[data-testid=\"mobile-navigation\"]');\n          \n          // Test swipe gestures (simulated)\n          await page.touchscreen.tap(100, 100);\n          await page.mouse.down();\n          await page.mouse.move(300, 100);\n          await page.mouse.up();\n          \n          // Verify mobile navigation closes\n          await expect(page.locator('[data-testid=\"mobile-navigation\"]')).not.toBeVisible();\n          \n          // Test mobile-optimized components\n          await expect(page.locator('[data-testid=\"mobile-widget-stack\"]')).toBeVisible();\n          \n        } else if (viewport.name === 'tablet') {\n          // Test tablet-specific layout\n          await expect(page.locator('[data-testid=\"tablet-sidebar\"]')).toBeVisible();\n          await expect(page.locator('[data-testid=\"tablet-widget-grid\"]')).toBeVisible();\n          \n        } else {\n          // Test desktop layout\n          await expect(page.locator('[data-testid=\"desktop-sidebar\"]')).toBeVisible();\n          await expect(page.locator('[data-testid=\"desktop-widget-grid\"]')).toBeVisible();\n        }\n      }\n      \n      // Reset to desktop for remaining tests\n      await page.setViewportSize(VIEWPORTS.DESKTOP);\n    });\n\n    enhancedTest('should handle touch interactions on mobile devices', async ({ page, testHelpers }) => {\n      // Set mobile viewport\n      await page.setViewportSize(VIEWPORTS.MOBILE);\n      \n      // Navigate to touch-friendly interface\n      await page.goto('/projects');\n      await testHelpers.waitForElement('[data-testid=\"projects-mobile-view\"]');\n      \n      // Test touch scrolling\n      const projectList = page.locator('[data-testid=\"projects-list\"]');\n      \n      // Simulate scroll gesture\n      await projectList.hover();\n      await page.mouse.wheel(0, 300);\n      await page.waitForTimeout(500);\n      \n      // Test pull-to-refresh gesture\n      await page.touchscreen.tap(200, 100);\n      await page.mouse.down();\n      await page.mouse.move(200, 200); // Pull down gesture\n      await page.mouse.up();\n      \n      // Verify refresh indicator\n      await testHelpers.waitForElement('[data-testid=\"pull-refresh-indicator\"]');\n      \n      // Test swipe gestures for navigation\n      const projectCard = page.locator('[data-testid=\"project-card\"]').first();\n      \n      // Swipe left to reveal actions\n      await projectCard.hover();\n      await page.mouse.down();\n      await page.mouse.move(-100, 0); // Swipe left\n      await page.mouse.up();\n      \n      // Verify swipe actions revealed\n      await expect(page.locator('[data-testid=\"swipe-actions\"]')).toBeVisible();\n      await expect(page.locator('[data-testid=\"edit-action\"]')).toBeVisible();\n      await expect(page.locator('[data-testid=\"delete-action\"]')).toBeVisible();\n      \n      // Test tap interactions\n      await page.touchscreen.tap(200, 300);\n      await testHelpers.waitForElement('[data-testid=\"project-detail-mobile\"]');\n      \n      // Test long press for context menu\n      const longPressElement = page.locator('[data-testid=\"long-press-target\"]');\n      await longPressElement.hover();\n      await page.mouse.down();\n      await page.waitForTimeout(800); // Long press duration\n      await page.mouse.up();\n      \n      // Verify context menu appears\n      await testHelpers.waitForElement('[data-testid=\"context-menu\"]');\n      \n      // Test touch-friendly button sizes\n      const touchButton = page.locator('[data-testid=\"touch-optimized-button\"]');\n      const buttonBox = await touchButton.boundingBox();\n      \n      // Verify minimum touch target size (44px recommended)\n      expect(buttonBox.width).toBeGreaterThanOrEqual(44);\n      expect(buttonBox.height).toBeGreaterThanOrEqual(44);\n      \n      // Test pinch-to-zoom on charts\n      await page.goto('/analytics');\n      await testHelpers.waitForElement('[data-testid=\"mobile-chart\"]');\n      \n      const chart = page.locator('[data-testid=\"zoomable-chart\"]');\n      \n      // Simulate pinch gesture\n      await chart.hover();\n      await page.evaluate(() => {\n        const chart = document.querySelector('[data-testid=\"zoomable-chart\"]');\n        const event = new WheelEvent('wheel', { deltaY: -100, ctrlKey: true });\n        chart.dispatchEvent(event);\n      });\n      \n      // Verify zoom applied\n      await expect(chart).toHaveAttribute('data-zoom-level', /[1-9]/);\n    });\n  });\n});"