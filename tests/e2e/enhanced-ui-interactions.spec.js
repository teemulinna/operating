"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const test_1 = require("@playwright/test");
test_1.test.describe('Enhanced UI Components', () => {
    test_1.test.beforeEach(async ({ page }) => {
        await page.goto('/');
        await page.waitForSelector('[data-testid="app-loaded"]', { timeout: 10000 });
    });
    test_1.test.describe('Button Component Enhancements', () => {
        (0, test_1.test)('should display ripple effect on click', async ({ page }) => {
            const button = page.locator('button').first();
            await button.click();
            await (0, test_1.expect)(button).toHaveClass(/ripple/);
            await page.waitForTimeout(600);
        });
        (0, test_1.test)('should show loading state correctly', async ({ page }) => {
            const loadingButton = page.locator('[data-testid="loading-button"]');
            if (await loadingButton.isVisible()) {
                await (0, test_1.expect)(loadingButton.locator('.animate-spin')).toBeVisible();
                await (0, test_1.expect)(loadingButton).toContainText('Loading');
                await (0, test_1.expect)(loadingButton).toBeDisabled();
            }
        });
        (0, test_1.test)('should support keyboard navigation', async ({ page }) => {
            const firstButton = page.locator('button').first();
            await page.keyboard.press('Tab');
            await (0, test_1.expect)(firstButton).toBeFocused();
            await page.keyboard.press('Enter');
            await page.keyboard.press('Space');
        });
        (0, test_1.test)('should have proper hover animations', async ({ page }) => {
            const button = page.locator('button').first();
            await button.hover();
            const transform = await button.evaluate(el => window.getComputedStyle(el).transform);
            (0, test_1.expect)(transform).not.toBe('none');
        });
    });
    test_1.test.describe('Card Component Enhancements', () => {
        (0, test_1.test)('should animate card entrance', async ({ page }) => {
            const card = page.locator('[data-testid="resource-card"]').first();
            if (await card.isVisible()) {
                const opacity = await card.evaluate(el => window.getComputedStyle(el).opacity);
                (0, test_1.expect)(parseFloat(opacity)).toBeGreaterThan(0);
            }
        });
        (0, test_1.test)('should have hover lift effect', async ({ page }) => {
            const interactiveCard = page.locator('.card-interactive').first();
            if (await interactiveCard.isVisible()) {
                await interactiveCard.hover();
                const transform = await interactiveCard.evaluate(el => window.getComputedStyle(el).transform);
                (0, test_1.expect)(transform).toContain('translateY');
            }
        });
    });
    test_1.test.describe('Enhanced Dashboard', () => {
        (0, test_1.test)('should display all metric cards with animations', async ({ page }) => {
            await page.click('[data-testid="dashboard-tab"]');
            const metricCards = page.locator('[data-testid="metric-card"]');
            await (0, test_1.expect)(metricCards).toHaveCount(4);
            for (let i = 0; i < 4; i++) {
                const card = metricCards.nth(i);
                await (0, test_1.expect)(card).toBeVisible();
                await (0, test_1.expect)(card.locator('.text-3xl')).toBeVisible();
                await (0, test_1.expect)(card.locator('svg')).toBeVisible();
            }
        });
        (0, test_1.test)('should show interactive charts', async ({ page }) => {
            await page.click('[data-testid="dashboard-tab"]');
            await page.waitForSelector('canvas', { timeout: 5000 });
            const charts = page.locator('canvas');
            const chartCount = await charts.count();
            (0, test_1.expect)(chartCount).toBeGreaterThan(0);
            const firstChart = charts.first();
            await firstChart.hover();
            await page.waitForSelector('[data-testid="chart-tooltip"]', {
                timeout: 2000
            }).catch(() => {
            });
        });
        (0, test_1.test)('should handle period filter changes', async ({ page }) => {
            await page.click('[data-testid="dashboard-tab"]');
            const sevenDayButton = page.locator('button', { hasText: '7d' });
            const thirtyDayButton = page.locator('button', { hasText: '30d' });
            if (await sevenDayButton.isVisible()) {
                await sevenDayButton.click();
                await (0, test_1.expect)(sevenDayButton).toHaveClass(/bg-white/);
                await thirtyDayButton.click();
                await (0, test_1.expect)(thirtyDayButton).toHaveClass(/bg-white/);
            }
        });
    });
    test_1.test.describe('Drag and Drop Resource Planning', () => {
        (0, test_1.test)('should handle drag and drop operations', async ({ page }) => {
            await page.click('[data-testid="resources-tab"]');
            await page.waitForSelector('[data-testid="resource-planner"]', { timeout: 5000 });
            const employee = page.locator('[data-testid="draggable-employee"]').first();
            const project = page.locator('[data-testid="project-drop-zone"]').first();
            if (await employee.isVisible() && await project.isVisible()) {
                const employeeBox = await employee.boundingBox();
                const projectBox = await project.boundingBox();
                if (employeeBox && projectBox) {
                    await page.mouse.move(employeeBox.x + employeeBox.width / 2, employeeBox.y + employeeBox.height / 2);
                    await page.mouse.down();
                    await page.mouse.move(projectBox.x + projectBox.width / 2, projectBox.y + projectBox.height / 2, { steps: 10 });
                    await (0, test_1.expect)(project).toHaveClass(/border-blue-400/);
                    await page.mouse.up();
                    await (0, test_1.expect)(project.locator('[data-testid="assigned-employee"]')).toBeVisible();
                }
            }
        });
        (0, test_1.test)('should show drag feedback', async ({ page }) => {
            await page.click('[data-testid="resources-tab"]');
            const employee = page.locator('[data-testid="draggable-employee"]').first();
            if (await employee.isVisible()) {
                await employee.hover();
                await page.mouse.down();
                const opacity = await employee.evaluate(el => window.getComputedStyle(el).opacity);
                (0, test_1.expect)(parseFloat(opacity)).toBeLessThan(1);
                await page.mouse.up();
            }
        });
    });
    test_1.test.describe('Mobile Responsive Design', () => {
        (0, test_1.test)('should display mobile navigation on small screens', async ({ page }) => {
            await page.setViewportSize({ width: 375, height: 667 });
            const menuButton = page.locator('[data-testid="mobile-menu-button"]');
            await (0, test_1.expect)(menuButton).toBeVisible();
            const desktopNav = page.locator('[data-testid="desktop-navigation"]');
            await (0, test_1.expect)(desktopNav).toBeHidden();
        });
        (0, test_1.test)('should open and close mobile menu', async ({ page }) => {
            await page.setViewportSize({ width: 375, height: 667 });
            const menuButton = page.locator('[data-testid="mobile-menu-button"]');
            const mobileMenu = page.locator('[data-testid="mobile-menu"]');
            if (await menuButton.isVisible()) {
                await menuButton.click();
                await (0, test_1.expect)(mobileMenu).toBeVisible();
                const closeButton = page.locator('[data-testid="mobile-menu-close"]');
                await closeButton.click();
                await (0, test_1.expect)(mobileMenu).toBeHidden();
                await menuButton.click();
                await (0, test_1.expect)(mobileMenu).toBeVisible();
                const backdrop = page.locator('[data-testid="mobile-menu-backdrop"]');
                await backdrop.click();
                await (0, test_1.expect)(mobileMenu).toBeHidden();
            }
        });
        (0, test_1.test)('should have touch-friendly button sizes', async ({ page }) => {
            await page.setViewportSize({ width: 375, height: 667 });
            const buttons = page.locator('button');
            const buttonCount = await buttons.count();
            for (let i = 0; i < Math.min(buttonCount, 5); i++) {
                const button = buttons.nth(i);
                const box = await button.boundingBox();
                if (box) {
                    (0, test_1.expect)(box.height).toBeGreaterThanOrEqual(44);
                    (0, test_1.expect)(box.width).toBeGreaterThanOrEqual(44);
                }
            }
        });
    });
    test_1.test.describe('Loading States and Skeletons', () => {
        (0, test_1.test)('should display skeleton screens while loading', async ({ page }) => {
            await page.route('**/api/**', route => {
                setTimeout(() => route.continue(), 1000);
            });
            await page.goto('/');
            const skeletons = page.locator('[data-testid*="skeleton"]');
            await (0, test_1.expect)(skeletons.first()).toBeVisible();
            await page.waitForSelector('[data-testid="app-loaded"]', { timeout: 10000 });
            await (0, test_1.expect)(skeletons.first()).toBeHidden();
        });
        (0, test_1.test)('should show proper loading animations', async ({ page }) => {
            const loadingSpinner = page.locator('.animate-spin');
            if (await loadingSpinner.isVisible()) {
                const animationName = await loadingSpinner.evaluate(el => window.getComputedStyle(el).animationName);
                (0, test_1.expect)(animationName).toBe('spin');
            }
        });
    });
    test_1.test.describe('Error Handling', () => {
        (0, test_1.test)('should display error messages appropriately', async ({ page }) => {
            await page.route('**/api/employees', route => {
                route.abort('failed');
            });
            await page.goto('/employees');
            const errorMessage = page.locator('[data-testid="error-message"]');
            await (0, test_1.expect)(errorMessage).toBeVisible();
            const retryButton = page.locator('[data-testid="retry-button"]');
            await (0, test_1.expect)(retryButton).toBeVisible();
        });
        (0, test_1.test)('should handle retry functionality', async ({ page }) => {
            let requestCount = 0;
            await page.route('**/api/employees', route => {
                requestCount++;
                if (requestCount === 1) {
                    route.abort('failed');
                }
                else {
                    route.continue();
                }
            });
            await page.goto('/employees');
            const retryButton = page.locator('[data-testid="retry-button"]');
            if (await retryButton.isVisible()) {
                await retryButton.click();
                await page.waitForSelector('[data-testid="employees-loaded"]', { timeout: 5000 });
            }
        });
    });
    test_1.test.describe('Accessibility Features', () => {
        (0, test_1.test)('should have proper focus management', async ({ page }) => {
            await page.keyboard.press('Tab');
            const focusedElement = page.locator(':focus');
            await (0, test_1.expect)(focusedElement).toBeVisible();
            const skipLink = page.locator('text="Skip to main content"');
            if (await skipLink.isVisible()) {
                await skipLink.click();
                const mainContent = page.locator('#main-content');
                await (0, test_1.expect)(mainContent).toBeFocused();
            }
        });
        (0, test_1.test)('should have proper ARIA labels', async ({ page }) => {
            const buttons = page.locator('button[aria-label]');
            const buttonCount = await buttons.count();
            (0, test_1.expect)(buttonCount).toBeGreaterThan(0);
            for (let i = 0; i < Math.min(buttonCount, 5); i++) {
                const button = buttons.nth(i);
                const ariaLabel = await button.getAttribute('aria-label');
                (0, test_1.expect)(ariaLabel).toBeTruthy();
                (0, test_1.expect)(ariaLabel.length).toBeGreaterThan(3);
            }
        });
        (0, test_1.test)('should support keyboard navigation in modals', async ({ page }) => {
            const modalTrigger = page.locator('[data-testid="open-modal"]');
            if (await modalTrigger.isVisible()) {
                await modalTrigger.click();
                const modal = page.locator('[role="dialog"]');
                await (0, test_1.expect)(modal).toBeVisible();
                await page.keyboard.press('Tab');
                const focusedElement = page.locator(':focus');
                const isWithinModal = await focusedElement.evaluate((el, modal) => {
                    return modal.contains(el);
                }, await modal.elementHandle());
                (0, test_1.expect)(isWithinModal).toBe(true);
                await page.keyboard.press('Escape');
                await (0, test_1.expect)(modal).toBeHidden();
            }
        });
        (0, test_1.test)('should announce dynamic content changes', async ({ page }) => {
            const liveRegions = page.locator('[aria-live]');
            const liveRegionCount = await liveRegions.count();
            if (liveRegionCount > 0) {
                const firstLiveRegion = liveRegions.first();
                const politeness = await firstLiveRegion.getAttribute('aria-live');
                (0, test_1.expect)(['polite', 'assertive', 'off']).toContain(politeness);
            }
        });
    });
    test_1.test.describe('Performance Optimizations', () => {
        (0, test_1.test)('should lazy load components', async ({ page }) => {
            const heavyComponent = page.locator('[data-testid="heavy-component"]');
            await (0, test_1.expect)(heavyComponent).toBeHidden();
            await page.click('[data-testid="analytics-tab"]');
            await (0, test_1.expect)(heavyComponent).toBeVisible({ timeout: 5000 });
        });
        (0, test_1.test)('should virtualize long lists', async ({ page }) => {
            await page.goto('/employees');
            const virtualizedList = page.locator('[data-testid="virtualized-list"]');
            if (await virtualizedList.isVisible()) {
                const renderedItems = virtualizedList.locator('[data-testid="list-item"]');
                const itemCount = await renderedItems.count();
                (0, test_1.expect)(itemCount).toBeLessThan(100);
                (0, test_1.expect)(itemCount).toBeGreaterThan(0);
            }
        });
        (0, test_1.test)('should handle smooth scrolling', async ({ page }) => {
            const scrollContainer = page.locator('[data-testid="scroll-container"]');
            if (await scrollContainer.isVisible()) {
                await scrollContainer.evaluate(el => {
                    el.scrollTo({ top: 500, behavior: 'smooth' });
                });
                await page.waitForTimeout(500);
                const scrollTop = await scrollContainer.evaluate(el => el.scrollTop);
                (0, test_1.expect)(scrollTop).toBeGreaterThan(400);
            }
        });
    });
    test_1.test.describe('Animation Preferences', () => {
        (0, test_1.test)('should respect prefers-reduced-motion', async ({ page }) => {
            await page.emulateMedia({ reducedMotion: 'reduce' });
            const animatedElement = page.locator('.animate-fade-in');
            if (await animatedElement.isVisible()) {
                const animationDuration = await animatedElement.evaluate(el => window.getComputedStyle(el).animationDuration);
                const duration = parseFloat(animationDuration);
                (0, test_1.expect)(duration).toBeLessThan(0.1);
            }
        });
    });
});
//# sourceMappingURL=enhanced-ui-interactions.spec.js.map