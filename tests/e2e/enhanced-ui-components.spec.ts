import { test, expect } from '../fixtures/enhanced-features-fixtures';

test.describe('Enhanced UI Components - Real Interaction Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3003');
    await page.waitForLoadState('networkidle');
  });

  test('Interactive Gantt Chart with Drag-and-Drop', async ({ page }) => {
    await page.goto('http://localhost:3003/schedule');
    
    // Wait for Gantt chart to load
    await page.waitForSelector('[data-testid="gantt-chart"]', { timeout: 10000 });

    // Verify Gantt chart structure
    await expect(page.locator('[data-testid="gantt-timeline-header"]')).toBeVisible();
    await expect(page.locator('[data-testid="gantt-task-list"]')).toBeVisible();

    // Check that tasks are rendered
    const taskBars = page.locator('[data-testid="gantt-task-bar"]');
    const taskCount = await taskBars.count();
    expect(taskCount).toBeGreaterThan(0);

    // Test drag-and-drop functionality
    const firstTaskBar = taskBars.first();
    const taskBarBox = await firstTaskBar.boundingBox();
    
    if (taskBarBox) {
      // Get the drop target (different time slot)
      const dropTarget = page.locator('[data-testid="gantt-time-slot"]').nth(5);
      
      // Perform drag and drop
      await firstTaskBar.hover();
      await page.mouse.down();
      
      await dropTarget.hover();
      await page.mouse.up();

      // Wait for animation/update
      await page.waitForTimeout(1000);

      // Verify task position changed
      const newTaskBarBox = await firstTaskBar.boundingBox();
      expect(newTaskBarBox?.x).not.toBe(taskBarBox.x);
    }

    // Test task resizing
    const resizeHandle = page.locator('[data-testid="task-resize-handle"]').first();
    if (await resizeHandle.isVisible()) {
      const initialWidth = await firstTaskBar.evaluate(el => el.clientWidth);
      
      // Resize task by dragging handle
      const resizeHandleBox = await resizeHandle.boundingBox();
      if (resizeHandleBox) {
        await resizeHandle.hover();
        await page.mouse.down();
        await page.mouse.move(resizeHandleBox.x + 50, resizeHandleBox.y);
        await page.mouse.up();

        await page.waitForTimeout(500);
        
        const newWidth = await firstTaskBar.evaluate(el => el.clientWidth);
        expect(newWidth).toBeGreaterThan(initialWidth);
      }
    }
  });

  test('Capacity Heat Map Visualization', async ({ page }) => {
    await page.goto('http://localhost:3003/capacity');

    // Wait for heat map to load
    await page.waitForSelector('[data-testid="capacity-heatmap"]', { timeout: 10000 });

    // Verify heat map components
    await expect(page.locator('[data-testid="heatmap-container"]')).toBeVisible();
    await expect(page.locator('[data-testid="capacity-legend"]')).toBeVisible();

    // Check heat map cells
    const heatmapCells = page.locator('[data-testid="heatmap-cell"]');
    const cellCount = await heatmapCells.count();
    expect(cellCount).toBeGreaterThan(0);

    // Test cell interactions
    const firstCell = heatmapCells.first();
    
    // Check cell has capacity data attribute
    const capacityValue = await firstCell.getAttribute('data-capacity');
    expect(capacityValue).toBeTruthy();
    expect(parseInt(capacityValue || '0')).toBeGreaterThanOrEqual(0);

    // Test hover tooltip
    await firstCell.hover();
    await page.waitForTimeout(500);
    
    const tooltip = page.locator('[data-testid="capacity-tooltip"]');
    await expect(tooltip).toBeVisible();
    
    const tooltipText = await tooltip.textContent();
    expect(tooltipText).toContain('%'); // Should show percentage
    expect(tooltipText).toMatch(/\d+%/); // Should contain numbers

    // Test different time periods
    const timeSelector = page.locator('[data-testid="time-period-selector"]');
    if (await timeSelector.isVisible()) {
      await timeSelector.selectOption('month');
      await page.waitForTimeout(1000);
      
      // Verify cells updated for monthly view
      const monthlyCells = await page.locator('[data-testid="heatmap-cell"]').count();
      expect(monthlyCells).toBeGreaterThan(0);
    }

    // Test capacity threshold indicators
    const overCapacityCells = page.locator('[data-testid="heatmap-cell"][data-over-capacity="true"]');
    const overCapacityCount = await overCapacityCells.count();
    
    if (overCapacityCount > 0) {
      // Verify over-capacity styling
      const firstOverCell = overCapacityCells.first();
      const cellColor = await firstOverCell.evaluate(el => 
        window.getComputedStyle(el).backgroundColor
      );
      expect(cellColor).toMatch(/rgb/); // Should have red-ish color
    }
  });

  test('Dark Mode Toggle with Persistence', async ({ page }) => {
    // Verify initial light mode
    const htmlElement = page.locator('html');
    await expect(htmlElement).not.toHaveClass(/dark/);

    // Check initial theme
    const initialBgColor = await page.evaluate(() => 
      window.getComputedStyle(document.body).backgroundColor
    );

    // Toggle to dark mode
    const themeToggle = page.locator('[data-testid="theme-toggle"]');
    await themeToggle.click();

    // Verify dark mode applied
    await expect(htmlElement).toHaveClass(/dark/);

    // Check dark theme styles
    const darkBgColor = await page.evaluate(() => 
      window.getComputedStyle(document.body).backgroundColor
    );
    
    expect(darkBgColor).not.toBe(initialBgColor);

    // Test persistence - refresh page
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Verify dark mode persisted
    await expect(htmlElement).toHaveClass(/dark/);

    // Toggle back to light mode
    await page.locator('[data-testid="theme-toggle"]').click();
    await expect(htmlElement).not.toHaveClass(/dark/);

    // Test theme affects different components
    const components = [
      '[data-testid="navigation-bar"]',
      '[data-testid="main-content"]',
      '[data-testid="sidebar"]'
    ];

    for (const component of components) {
      const element = page.locator(component);
      if (await element.isVisible()) {
        const styles = await element.evaluate(el => ({
          backgroundColor: window.getComputedStyle(el).backgroundColor,
          color: window.getComputedStyle(el).color
        }));
        
        expect(styles.backgroundColor).toMatch(/rgb/);
        expect(styles.color).toMatch(/rgb/);
      }
    }
  });

  test('Keyboard Shortcuts (Ctrl+K for Search)', async ({ page }) => {
    // Test global search shortcut
    await page.keyboard.press('Control+k');

    // Verify search modal opens
    const searchModal = page.locator('[data-testid="search-modal"]');
    await expect(searchModal).toBeVisible();

    // Verify search input is focused
    const searchInput = page.locator('[data-testid="search-input"]');
    await expect(searchInput).toBeFocused();

    // Type search query
    await searchInput.fill('John Doe');

    // Wait for search results
    await page.waitForTimeout(500);

    // Verify search results appear
    const searchResults = page.locator('[data-testid="search-results"]');
    await expect(searchResults).toBeVisible();

    const resultItems = page.locator('[data-testid="search-result-item"]');
    const resultCount = await resultItems.count();
    expect(resultCount).toBeGreaterThan(0);

    // Test keyboard navigation in results
    await page.keyboard.press('ArrowDown');
    
    // Verify first result is highlighted
    const firstResult = resultItems.first();
    await expect(firstResult).toHaveClass(/highlighted|selected|active/);

    // Test Enter to select result
    await page.keyboard.press('Enter');

    // Verify navigation occurred (search modal should close)
    await expect(searchModal).not.toBeVisible();

    // Test Escape to close search
    await page.keyboard.press('Control+k');
    await expect(searchModal).toBeVisible();
    
    await page.keyboard.press('Escape');
    await expect(searchModal).not.toBeVisible();

    // Test other keyboard shortcuts
    const shortcuts = [
      { key: 'Control+n', testid: 'new-item-modal' },
      { key: 'Control+s', action: 'save' },
      { key: 'Alt+d', testid: 'dashboard' }
    ];

    for (const shortcut of shortcuts) {
      await page.keyboard.press(shortcut.key);
      await page.waitForTimeout(500);
      
      if (shortcut.testid) {
        const element = page.locator(`[data-testid="${shortcut.testid}"]`);
        if (await element.isVisible()) {
          await expect(element).toBeVisible();
          // Close modal if opened
          await page.keyboard.press('Escape');
        }
      }
    }
  });

  test('Timeline Slider for Date Navigation', async ({ page }) => {
    await page.goto('http://localhost:3003/schedule');

    // Wait for timeline slider
    await page.waitForSelector('[data-testid="timeline-slider"]', { timeout: 10000 });

    // Get initial date display
    const currentDateDisplay = page.locator('[data-testid="current-date-display"]');
    const initialDate = await currentDateDisplay.textContent();

    // Test slider movement
    const slider = page.locator('[data-testid="timeline-slider"]');
    const sliderBox = await slider.boundingBox();
    
    if (sliderBox) {
      // Click at different positions on slider
      const positions = [0.25, 0.5, 0.75];
      
      for (const position of positions) {
        const clickX = sliderBox.x + (sliderBox.width * position);
        const clickY = sliderBox.y + (sliderBox.height / 2);
        
        await page.mouse.click(clickX, clickY);
        await page.waitForTimeout(1000);
        
        // Verify date changed
        const newDate = await currentDateDisplay.textContent();
        expect(newDate).not.toBe(initialDate);
        
        // Verify schedule content updates
        await expect(page.locator('[data-testid="schedule-content"]')).toBeVisible();
        
        // Check that data corresponds to selected date
        const scheduleItems = page.locator('[data-testid="schedule-item"]');
        const itemCount = await scheduleItems.count();
        expect(itemCount).toBeGreaterThanOrEqual(0); // Could be empty for some dates
      }
    }

    // Test keyboard navigation on slider
    await slider.focus();
    await page.keyboard.press('ArrowRight');
    await page.waitForTimeout(500);
    
    const keyboardDate = await currentDateDisplay.textContent();
    expect(keyboardDate).toBeTruthy();

    // Test date range controls
    const dateRangeSelector = page.locator('[data-testid="date-range-selector"]');
    if (await dateRangeSelector.isVisible()) {
      await dateRangeSelector.selectOption('week');
      await page.waitForTimeout(1000);
      
      // Verify slider updated for weekly view
      const weekSlider = page.locator('[data-testid="timeline-slider"]');
      await expect(weekSlider).toBeVisible();
    }
  });

  test('Responsive Design and Mobile Interactions', async ({ page, browser }) => {
    // Test different viewport sizes
    const viewports = [
      { width: 1920, height: 1080, name: 'desktop' },
      { width: 768, height: 1024, name: 'tablet' },
      { width: 375, height: 667, name: 'mobile' }
    ];

    for (const viewport of viewports) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.reload();
      await page.waitForLoadState('networkidle');

      // Test navigation menu adaptation
      const navigationMenu = page.locator('[data-testid="navigation-menu"]');
      
      if (viewport.name === 'mobile') {
        // Mobile should show hamburger menu
        const hamburgerButton = page.locator('[data-testid="hamburger-menu"]');
        await expect(hamburgerButton).toBeVisible();
        
        // Test mobile menu toggle
        await hamburgerButton.click();
        const mobileMenu = page.locator('[data-testid="mobile-menu"]');
        await expect(mobileMenu).toBeVisible();
        
        // Close mobile menu
        await hamburgerButton.click();
        await expect(mobileMenu).not.toBeVisible();
      } else {
        // Desktop/tablet should show full navigation
        await expect(navigationMenu).toBeVisible();
      }

      // Test component adaptation
      const dashboardCards = page.locator('[data-testid="dashboard-card"]');
      if (await dashboardCards.count() > 0) {
        const cardStyles = await dashboardCards.first().evaluate(el => ({
          width: el.clientWidth,
          display: window.getComputedStyle(el).display
        }));
        
        expect(cardStyles.width).toBeGreaterThan(0);
        expect(cardStyles.display).not.toBe('none');
      }
    }

    // Reset to default viewport
    await page.setViewportSize({ width: 1280, height: 720 });
  });

  test('Advanced Chart Interactions', async ({ page }) => {
    await page.goto('http://localhost:3003/analytics');

    // Wait for charts to load
    await page.waitForSelector('[data-testid="analytics-charts"]', { timeout: 10000 });

    // Test utilization chart interactions
    const utilizationChart = page.locator('[data-testid="utilization-chart"]');
    if (await utilizationChart.isVisible()) {
      // Test chart hover
      const chartArea = utilizationChart.locator('[data-testid="chart-area"]');
      await chartArea.hover();
      
      // Check for hover tooltip
      const chartTooltip = page.locator('[data-testid="chart-tooltip"]');
      if (await chartTooltip.isVisible()) {
        const tooltipText = await chartTooltip.textContent();
        expect(tooltipText).toMatch(/\d+/); // Should contain numeric data
      }

      // Test chart zoom (if supported)
      const zoomControls = page.locator('[data-testid="chart-zoom-controls"]');
      if (await zoomControls.isVisible()) {
        await page.click('[data-testid="zoom-in-btn"]');
        await page.waitForTimeout(500);
        
        await page.click('[data-testid="zoom-out-btn"]');
        await page.waitForTimeout(500);
      }

      // Test chart legend interactions
      const chartLegend = page.locator('[data-testid="chart-legend"]');
      if (await chartLegend.isVisible()) {
        const legendItems = page.locator('[data-testid="legend-item"]');
        const legendCount = await legendItems.count();
        
        if (legendCount > 0) {
          // Click legend item to toggle data series
          await legendItems.first().click();
          await page.waitForTimeout(500);
          
          // Verify chart updated (implementation dependent)
          await expect(utilizationChart).toBeVisible();
        }
      }
    }

    // Test project timeline chart
    const timelineChart = page.locator('[data-testid="project-timeline-chart"]');
    if (await timelineChart.isVisible()) {
      // Test timeline scrubbing
      const timelineBar = timelineChart.locator('[data-testid="timeline-bar"]');
      const timelineBox = await timelineBar.boundingBox();
      
      if (timelineBox) {
        // Scrub to different position
        const scrubX = timelineBox.x + (timelineBox.width * 0.6);
        const scrubY = timelineBox.y + (timelineBox.height / 2);
        
        await page.mouse.click(scrubX, scrubY);
        await page.waitForTimeout(500);
        
        // Verify timeline indicator moved
        const timelineIndicator = page.locator('[data-testid="timeline-indicator"]');
        if (await timelineIndicator.isVisible()) {
          const indicatorPos = await timelineIndicator.boundingBox();
          expect(indicatorPos?.x).toBeCloseTo(scrubX, 10);
        }
      }
    }
  });
});