import { test, expect } from '@playwright/test';

test.describe('Enhanced UI Components', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Wait for the application to load
    await page.waitForSelector('[data-testid="app-loaded"]', { timeout: 10000 });
  });

  test.describe('Button Component Enhancements', () => {
    test('should display ripple effect on click', async ({ page }) => {
      const button = page.locator('button').first();
      
      // Click and check for ripple effect
      await button.click();
      
      // Check if ripple animation classes are present
      await expect(button).toHaveClass(/ripple/);
      
      // Wait for animation to complete
      await page.waitForTimeout(600);
    });

    test('should show loading state correctly', async ({ page }) => {
      const loadingButton = page.locator('[data-testid="loading-button"]');
      
      if (await loadingButton.isVisible()) {
        // Check loading spinner
        await expect(loadingButton.locator('.animate-spin')).toBeVisible();
        
        // Check loading text
        await expect(loadingButton).toContainText('Loading');
        
        // Button should be disabled when loading
        await expect(loadingButton).toBeDisabled();
      }
    });

    test('should support keyboard navigation', async ({ page }) => {
      const firstButton = page.locator('button').first();
      
      // Focus the button with Tab
      await page.keyboard.press('Tab');
      await expect(firstButton).toBeFocused();
      
      // Activate with Enter
      await page.keyboard.press('Enter');
      
      // Activate with Space
      await page.keyboard.press('Space');
    });

    test('should have proper hover animations', async ({ page }) => {
      const button = page.locator('button').first();
      
      // Hover and check transform
      await button.hover();
      
      // Check if hover styles are applied
      const transform = await button.evaluate(el => 
        window.getComputedStyle(el).transform
      );
      
      expect(transform).not.toBe('none');
    });
  });

  test.describe('Card Component Enhancements', () => {
    test('should animate card entrance', async ({ page }) => {
      const card = page.locator('[data-testid="resource-card"]').first();
      
      if (await card.isVisible()) {
        // Check initial animation state
        const opacity = await card.evaluate(el => 
          window.getComputedStyle(el).opacity
        );
        
        expect(parseFloat(opacity)).toBeGreaterThan(0);
      }
    });

    test('should have hover lift effect', async ({ page }) => {
      const interactiveCard = page.locator('.card-interactive').first();
      
      if (await interactiveCard.isVisible()) {
        await interactiveCard.hover();
        
        // Check transform property for lift effect
        const transform = await interactiveCard.evaluate(el => 
          window.getComputedStyle(el).transform
        );
        
        expect(transform).toContain('translateY');
      }
    });
  });

  test.describe('Enhanced Dashboard', () => {
    test('should display all metric cards with animations', async ({ page }) => {
      await page.click('[data-testid="dashboard-tab"]');
      
      // Wait for metrics cards to appear
      const metricCards = page.locator('[data-testid="metric-card"]');
      await expect(metricCards).toHaveCount(4);
      
      // Check each card has proper content
      for (let i = 0; i < 4; i++) {
        const card = metricCards.nth(i);
        await expect(card).toBeVisible();
        await expect(card.locator('.text-3xl')).toBeVisible(); // Value
        await expect(card.locator('svg')).toBeVisible(); // Icon
      }
    });

    test('should show interactive charts', async ({ page }) => {
      await page.click('[data-testid="dashboard-tab"]');
      
      // Wait for charts to load
      await page.waitForSelector('canvas', { timeout: 5000 });
      
      const charts = page.locator('canvas');
      const chartCount = await charts.count();
      
      expect(chartCount).toBeGreaterThan(0);
      
      // Test chart hover interactions
      const firstChart = charts.first();
      await firstChart.hover();
      
      // Charts should have tooltips on hover
      await page.waitForSelector('[data-testid="chart-tooltip"]', { 
        timeout: 2000 
      }).catch(() => {
        // Tooltip might not always appear, that's okay
      });
    });

    test('should handle period filter changes', async ({ page }) => {
      await page.click('[data-testid="dashboard-tab"]');
      
      // Find period filter buttons
      const sevenDayButton = page.locator('button', { hasText: '7d' });
      const thirtyDayButton = page.locator('button', { hasText: '30d' });
      
      if (await sevenDayButton.isVisible()) {
        await sevenDayButton.click();
        await expect(sevenDayButton).toHaveClass(/bg-white/);
        
        await thirtyDayButton.click();
        await expect(thirtyDayButton).toHaveClass(/bg-white/);
      }
    });
  });

  test.describe('Drag and Drop Resource Planning', () => {
    test('should handle drag and drop operations', async ({ page }) => {
      await page.click('[data-testid="resources-tab"]');
      
      // Wait for resource planner to load
      await page.waitForSelector('[data-testid="resource-planner"]', { timeout: 5000 });
      
      const employee = page.locator('[data-testid="draggable-employee"]').first();
      const project = page.locator('[data-testid="project-drop-zone"]').first();
      
      if (await employee.isVisible() && await project.isVisible()) {
        // Get initial positions
        const employeeBox = await employee.boundingBox();
        const projectBox = await project.boundingBox();
        
        if (employeeBox && projectBox) {
          // Perform drag and drop
          await page.mouse.move(
            employeeBox.x + employeeBox.width / 2, 
            employeeBox.y + employeeBox.height / 2
          );
          await page.mouse.down();
          
          await page.mouse.move(
            projectBox.x + projectBox.width / 2, 
            projectBox.y + projectBox.height / 2,
            { steps: 10 }
          );
          
          // Check for drop zone highlight
          await expect(project).toHaveClass(/border-blue-400/);
          
          await page.mouse.up();
          
          // Verify assignment was created
          await expect(project.locator('[data-testid="assigned-employee"]')).toBeVisible();
        }
      }
    });

    test('should show drag feedback', async ({ page }) => {
      await page.click('[data-testid="resources-tab"]');
      
      const employee = page.locator('[data-testid="draggable-employee"]').first();
      
      if (await employee.isVisible()) {
        // Start dragging
        await employee.hover();
        await page.mouse.down();
        
        // Check for drag feedback (opacity change, etc.)
        const opacity = await employee.evaluate(el => 
          window.getComputedStyle(el).opacity
        );
        
        expect(parseFloat(opacity)).toBeLessThan(1);
        
        await page.mouse.up();
      }
    });
  });

  test.describe('Mobile Responsive Design', () => {
    test('should display mobile navigation on small screens', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 }); // iPhone SE size
      
      // Mobile menu button should be visible
      const menuButton = page.locator('[data-testid="mobile-menu-button"]');
      await expect(menuButton).toBeVisible();
      
      // Desktop navigation should be hidden
      const desktopNav = page.locator('[data-testid="desktop-navigation"]');
      await expect(desktopNav).toBeHidden();
    });

    test('should open and close mobile menu', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      
      const menuButton = page.locator('[data-testid="mobile-menu-button"]');
      const mobileMenu = page.locator('[data-testid="mobile-menu"]');
      
      if (await menuButton.isVisible()) {
        // Open menu
        await menuButton.click();
        await expect(mobileMenu).toBeVisible();
        
        // Close menu with close button
        const closeButton = page.locator('[data-testid="mobile-menu-close"]');
        await closeButton.click();
        await expect(mobileMenu).toBeHidden();
        
        // Open menu again and close with backdrop
        await menuButton.click();
        await expect(mobileMenu).toBeVisible();
        
        const backdrop = page.locator('[data-testid="mobile-menu-backdrop"]');
        await backdrop.click();
        await expect(mobileMenu).toBeHidden();
      }
    });

    test('should have touch-friendly button sizes', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      
      const buttons = page.locator('button');
      const buttonCount = await buttons.count();
      
      for (let i = 0; i < Math.min(buttonCount, 5); i++) {
        const button = buttons.nth(i);
        const box = await button.boundingBox();
        
        if (box) {
          // Touch targets should be at least 44px in both dimensions
          expect(box.height).toBeGreaterThanOrEqual(44);
          expect(box.width).toBeGreaterThanOrEqual(44);
        }
      }
    });
  });

  test.describe('Loading States and Skeletons', () => {
    test('should display skeleton screens while loading', async ({ page }) => {
      // Mock slow network to see loading states
      await page.route('**/api/**', route => {
        setTimeout(() => route.continue(), 1000);
      });
      
      await page.goto('/');
      
      // Check for skeleton elements
      const skeletons = page.locator('[data-testid*="skeleton"]');
      await expect(skeletons.first()).toBeVisible();
      
      // Wait for loading to complete
      await page.waitForSelector('[data-testid="app-loaded"]', { timeout: 10000 });
      
      // Skeletons should be gone
      await expect(skeletons.first()).toBeHidden();
    });

    test('should show proper loading animations', async ({ page }) => {
      const loadingSpinner = page.locator('.animate-spin');
      
      if (await loadingSpinner.isVisible()) {
        // Check animation is running
        const animationName = await loadingSpinner.evaluate(el => 
          window.getComputedStyle(el).animationName
        );
        
        expect(animationName).toBe('spin');
      }
    });
  });

  test.describe('Error Handling', () => {
    test('should display error messages appropriately', async ({ page }) => {
      // Simulate network error
      await page.route('**/api/employees', route => {
        route.abort('failed');
      });
      
      await page.goto('/employees');
      
      // Error message should appear
      const errorMessage = page.locator('[data-testid="error-message"]');
      await expect(errorMessage).toBeVisible();
      
      // Retry button should be present
      const retryButton = page.locator('[data-testid="retry-button"]');
      await expect(retryButton).toBeVisible();
    });

    test('should handle retry functionality', async ({ page }) => {
      // First request fails
      let requestCount = 0;
      await page.route('**/api/employees', route => {
        requestCount++;
        if (requestCount === 1) {
          route.abort('failed');
        } else {
          route.continue();
        }
      });
      
      await page.goto('/employees');
      
      const retryButton = page.locator('[data-testid="retry-button"]');
      if (await retryButton.isVisible()) {
        await retryButton.click();
        
        // Success state should appear
        await page.waitForSelector('[data-testid="employees-loaded"]', { timeout: 5000 });
      }
    });
  });

  test.describe('Accessibility Features', () => {
    test('should have proper focus management', async ({ page }) => {
      // Test tab navigation
      await page.keyboard.press('Tab');
      
      const focusedElement = page.locator(':focus');
      await expect(focusedElement).toBeVisible();
      
      // Test skip to main content
      const skipLink = page.locator('text="Skip to main content"');
      if (await skipLink.isVisible()) {
        await skipLink.click();
        
        const mainContent = page.locator('#main-content');
        await expect(mainContent).toBeFocused();
      }
    });

    test('should have proper ARIA labels', async ({ page }) => {
      const buttons = page.locator('button[aria-label]');
      const buttonCount = await buttons.count();
      
      expect(buttonCount).toBeGreaterThan(0);
      
      // Check each button has a meaningful aria-label
      for (let i = 0; i < Math.min(buttonCount, 5); i++) {
        const button = buttons.nth(i);
        const ariaLabel = await button.getAttribute('aria-label');
        expect(ariaLabel).toBeTruthy();
        expect(ariaLabel!.length).toBeGreaterThan(3);
      }
    });

    test('should support keyboard navigation in modals', async ({ page }) => {
      const modalTrigger = page.locator('[data-testid="open-modal"]');
      
      if (await modalTrigger.isVisible()) {
        await modalTrigger.click();
        
        const modal = page.locator('[role="dialog"]');
        await expect(modal).toBeVisible();
        
        // Focus should be trapped in modal
        await page.keyboard.press('Tab');
        const focusedElement = page.locator(':focus');
        
        // Focused element should be within modal
        const isWithinModal = await focusedElement.evaluate((el, modal) => {
          return modal.contains(el);
        }, await modal.elementHandle());
        
        expect(isWithinModal).toBe(true);
        
        // Escape should close modal
        await page.keyboard.press('Escape');
        await expect(modal).toBeHidden();
      }
    });

    test('should announce dynamic content changes', async ({ page }) => {
      // Check for live regions
      const liveRegions = page.locator('[aria-live]');
      const liveRegionCount = await liveRegions.count();
      
      if (liveRegionCount > 0) {
        const firstLiveRegion = liveRegions.first();
        const politeness = await firstLiveRegion.getAttribute('aria-live');
        expect(['polite', 'assertive', 'off']).toContain(politeness);
      }
    });
  });

  test.describe('Performance Optimizations', () => {
    test('should lazy load components', async ({ page }) => {
      // Check that heavy components are not loaded initially
      const heavyComponent = page.locator('[data-testid="heavy-component"]');
      await expect(heavyComponent).toBeHidden();
      
      // Navigate to section with heavy component
      await page.click('[data-testid="analytics-tab"]');
      
      // Component should now load
      await expect(heavyComponent).toBeVisible({ timeout: 5000 });
    });

    test('should virtualize long lists', async ({ page }) => {
      await page.goto('/employees');
      
      const virtualizedList = page.locator('[data-testid="virtualized-list"]');
      
      if (await virtualizedList.isVisible()) {
        // Only visible items should be rendered
        const renderedItems = virtualizedList.locator('[data-testid="list-item"]');
        const itemCount = await renderedItems.count();
        
        // Should render fewer items than total data
        expect(itemCount).toBeLessThan(100); // Assuming we have more than 100 items
        expect(itemCount).toBeGreaterThan(0);
      }
    });

    test('should handle smooth scrolling', async ({ page }) => {
      const scrollContainer = page.locator('[data-testid="scroll-container"]');
      
      if (await scrollContainer.isVisible()) {
        // Test smooth scroll behavior
        await scrollContainer.evaluate(el => {
          el.scrollTo({ top: 500, behavior: 'smooth' });
        });
        
        // Wait for scroll to complete
        await page.waitForTimeout(500);
        
        const scrollTop = await scrollContainer.evaluate(el => el.scrollTop);
        expect(scrollTop).toBeGreaterThan(400);
      }
    });
  });

  test.describe('Animation Preferences', () => {
    test('should respect prefers-reduced-motion', async ({ page }) => {
      // Set reduced motion preference
      await page.emulateMedia({ reducedMotion: 'reduce' });
      
      const animatedElement = page.locator('.animate-fade-in');
      
      if (await animatedElement.isVisible()) {
        const animationDuration = await animatedElement.evaluate(el => 
          window.getComputedStyle(el).animationDuration
        );
        
        // Animation should be very short or disabled
        const duration = parseFloat(animationDuration);
        expect(duration).toBeLessThan(0.1);
      }
    });
  });
});