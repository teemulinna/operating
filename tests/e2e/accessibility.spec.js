"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const test_1 = require("@playwright/test");
const axe_playwright_1 = require("axe-playwright");
test_1.test.describe('Accessibility Tests', () => {
    test_1.test.beforeEach(async ({ page }) => {
        await page.goto('/');
        await (0, axe_playwright_1.injectAxe)(page);
    });
    test_1.test.describe('WCAG Compliance', () => {
        (0, test_1.test)('should meet WCAG AA standards on main page', async ({ page }) => {
            await (0, axe_playwright_1.checkA11y)(page, null, {
                detailedReport: true,
                detailedReportOptions: { html: true }
            });
        });
        (0, test_1.test)('should meet WCAG AA standards on employee form', async ({ page }) => {
            await page.click('[data-testid="add-employee-button"]');
            await page.waitForSelector('[data-testid="employee-form"]');
            await (0, axe_playwright_1.checkA11y)(page, '[data-testid="employee-form"]', {
                detailedReport: true,
                detailedReportOptions: { html: true }
            });
        });
        (0, test_1.test)('should meet WCAG AA standards on employee list', async ({ page }) => {
            await page.waitForSelector('[data-testid="employee-list"]');
            await (0, axe_playwright_1.checkA11y)(page, '[data-testid="employee-list"]', {
                detailedReport: true,
                detailedReportOptions: { html: true }
            });
        });
        (0, test_1.test)('should meet WCAG AA standards on search and filters', async ({ page }) => {
            await (0, axe_playwright_1.checkA11y)(page, '[data-testid="search-section"]', {
                detailedReport: true,
                detailedReportOptions: { html: true }
            });
        });
    });
    test_1.test.describe('Keyboard Navigation', () => {
        (0, test_1.test)('should navigate through form using keyboard only', async ({ page }) => {
            await page.click('[data-testid="add-employee-button"]');
            await page.keyboard.press('Tab');
            await (0, test_1.expect)(page.locator('[data-testid="first-name-input"]')).toBeFocused();
            await page.keyboard.press('Tab');
            await (0, test_1.expect)(page.locator('[data-testid="last-name-input"]')).toBeFocused();
            await page.keyboard.press('Tab');
            await (0, test_1.expect)(page.locator('[data-testid="email-input"]')).toBeFocused();
            await page.keyboard.press('Tab');
            await (0, test_1.expect)(page.locator('[data-testid="phone-input"]')).toBeFocused();
            await page.keyboard.press('Tab');
            await (0, test_1.expect)(page.locator('[data-testid="position-input"]')).toBeFocused();
            await page.keyboard.press('Shift+Tab');
            await (0, test_1.expect)(page.locator('[data-testid="phone-input"]')).toBeFocused();
        });
        (0, test_1.test)('should handle dropdown navigation with keyboard', async ({ page }) => {
            await page.click('[data-testid="add-employee-button"]');
            await page.focus('[data-testid="department-select"]');
            await page.keyboard.press('Enter');
            await page.keyboard.press('ArrowDown');
            await page.keyboard.press('ArrowDown');
            await page.keyboard.press('Enter');
            await (0, test_1.expect)(page.locator('[data-testid="department-select"]')).toContainText('Engineering');
        });
        (0, test_1.test)('should support skip links for main content', async ({ page }) => {
            await page.keyboard.press('Tab');
            await (0, test_1.expect)(page.locator('[data-testid="skip-to-main"]')).toBeFocused();
            await page.keyboard.press('Enter');
            await (0, test_1.expect)(page.locator('[data-testid="main-content"]')).toBeFocused();
        });
        (0, test_1.test)('should handle modal dialog keyboard interactions', async ({ page }) => {
            await page.click('[data-testid="add-employee-button"]');
            await page.waitForSelector('[data-testid="employee-form-modal"]');
            await page.keyboard.press('Tab');
            const focusedElement = page.locator(':focus');
            await (0, test_1.expect)(focusedElement).toBeVisible();
            await page.keyboard.press('Escape');
            await (0, test_1.expect)(page.locator('[data-testid="employee-form-modal"]')).not.toBeVisible();
        });
    });
    test_1.test.describe('Screen Reader Support', () => {
        (0, test_1.test)('should have proper heading hierarchy', async ({ page }) => {
            const headings = await page.locator('h1, h2, h3, h4, h5, h6').allTextContents();
            const headingLevels = await page.locator('h1, h2, h3, h4, h5, h6').evaluateAll(elements => elements.map(el => parseInt(el.tagName.charAt(1))));
            (0, test_1.expect)(headingLevels[0]).toBe(1);
            for (let i = 1; i < headingLevels.length; i++) {
                const current = headingLevels[i];
                const previous = headingLevels[i - 1];
                (0, test_1.expect)(current - previous).toBeLessThanOrEqual(1);
            }
        });
        (0, test_1.test)('should have proper form labels and descriptions', async ({ page }) => {
            await page.click('[data-testid="add-employee-button"]');
            const inputs = page.locator('input, select, textarea');
            const inputCount = await inputs.count();
            for (let i = 0; i < inputCount; i++) {
                const input = inputs.nth(i);
                const id = await input.getAttribute('id');
                if (id) {
                    const label = page.locator(`label[for="${id}"]`);
                    await (0, test_1.expect)(label).toBeVisible();
                    const labelText = await label.textContent();
                    (0, test_1.expect)(labelText?.length).toBeGreaterThan(0);
                }
                const describedBy = await input.getAttribute('aria-describedby');
                if (describedBy) {
                    const description = page.locator(`#${describedBy}`);
                    await (0, test_1.expect)(description).toBeVisible();
                }
            }
        });
        (0, test_1.test)('should provide proper ARIA labels for interactive elements', async ({ page }) => {
            const buttons = page.locator('button');
            const buttonCount = await buttons.count();
            for (let i = 0; i < buttonCount; i++) {
                const button = buttons.nth(i);
                const ariaLabel = await button.getAttribute('aria-label');
                const buttonText = await button.textContent();
                (0, test_1.expect)(ariaLabel || buttonText?.trim()).toBeTruthy();
            }
        });
        (0, test_1.test)('should announce dynamic content changes', async ({ page }) => {
            await page.evaluate(() => {
                const liveRegion = document.createElement('div');
                liveRegion.setAttribute('aria-live', 'polite');
                liveRegion.setAttribute('aria-atomic', 'true');
                liveRegion.setAttribute('id', 'live-region');
                liveRegion.style.position = 'absolute';
                liveRegion.style.left = '-10000px';
                document.body.appendChild(liveRegion);
            });
            await page.click('[data-testid="add-employee-button"]');
            await page.fill('[data-testid="first-name-input"]', 'John');
            await page.fill('[data-testid="last-name-input"]', 'Doe');
            await page.fill('[data-testid="email-input"]', 'john.doe@company.com');
            await page.fill('[data-testid="phone-input"]', '+1-555-0101');
            await page.fill('[data-testid="position-input"]', 'Developer');
            await page.click('[data-testid="department-select"]');
            await page.click('[data-testid="department-option-engineering"]');
            await page.fill('[data-testid="salary-input"]', '70000');
            await page.fill('[data-testid="hire-date-input"]', '2023-01-01');
            await page.click('[data-testid="status-select"]');
            await page.click('[data-testid="status-option-active"]');
            await page.click('[data-testid="submit-employee-form"]');
            await page.waitForSelector('[data-testid="success-message"]');
            const liveRegionContent = await page.locator('#live-region').textContent();
            (0, test_1.expect)(liveRegionContent).toContain('Employee added successfully');
        });
    });
    test_1.test.describe('Focus Management', () => {
        (0, test_1.test)('should maintain focus when modal opens and closes', async ({ page }) => {
            const addButton = page.locator('[data-testid="add-employee-button"]');
            await addButton.focus();
            await (0, test_1.expect)(addButton).toBeFocused();
            await addButton.press('Enter');
            await page.waitForSelector('[data-testid="employee-form-modal"]');
            const modalFirstInput = page.locator('[data-testid="first-name-input"]');
            await (0, test_1.expect)(modalFirstInput).toBeFocused();
            await page.keyboard.press('Escape');
            await (0, test_1.expect)(addButton).toBeFocused();
        });
        (0, test_1.test)('should handle focus on error messages', async ({ page }) => {
            await page.click('[data-testid="add-employee-button"]');
            await page.click('[data-testid="submit-employee-form"]');
            await (0, test_1.expect)(page.locator('[data-testid="first-name-input"]')).toBeFocused();
            const errorId = await page.locator('[data-testid="first-name-error"]').getAttribute('id');
            const inputDescribedBy = await page.locator('[data-testid="first-name-input"]').getAttribute('aria-describedby');
            (0, test_1.expect)(inputDescribedBy).toContain(errorId);
        });
        (0, test_1.test)('should provide visible focus indicators', async ({ page }) => {
            const focusableElements = page.locator('button, input, select, textarea, a[href]');
            const count = await focusableElements.count();
            for (let i = 0; i < Math.min(count, 10); i++) {
                const element = focusableElements.nth(i);
                await element.focus();
                const computedStyle = await element.evaluate(el => {
                    return window.getComputedStyle(el);
                });
                const hasFocusStyle = computedStyle.outline !== 'none' ||
                    computedStyle.outlineWidth !== '0px' ||
                    computedStyle.boxShadow !== 'none' ||
                    computedStyle.borderColor !== 'transparent';
                (0, test_1.expect)(hasFocusStyle).toBeTruthy();
            }
        });
    });
    test_1.test.describe('Color and Contrast', () => {
        (0, test_1.test)('should meet color contrast requirements', async ({ page }) => {
            await (0, axe_playwright_1.checkA11y)(page, null, {
                rules: {
                    'color-contrast': { enabled: true }
                }
            });
        });
        (0, test_1.test)('should not rely solely on color for information', async ({ page }) => {
            await page.click('[data-testid="add-employee-button"]');
            await page.click('[data-testid="submit-employee-form"]');
            await (0, test_1.expect)(page.locator('[data-testid="first-name-error"]')).toBeVisible();
            await (0, test_1.expect)(page.locator('[data-testid="first-name-error"]')).toContainText('required');
            const errorIcon = page.locator('[data-testid="first-name-error"] svg, [data-testid="first-name-error"] .error-icon');
            if (await errorIcon.isVisible()) {
                const ariaLabel = await errorIcon.getAttribute('aria-label');
                (0, test_1.expect)(ariaLabel).toBeTruthy();
            }
        });
        (0, test_1.test)('should work in high contrast mode', async ({ page }) => {
            await page.emulateMedia({ colorScheme: 'dark' });
            await page.addStyleTag({
                content: `
          @media (prefers-contrast: high) {
            * {
              background-color: black !important;
              color: white !important;
            }
          }
        `
            });
            await page.reload();
            await (0, test_1.expect)(page.locator('[data-testid="employee-list"]')).toBeVisible();
            await (0, test_1.expect)(page.locator('[data-testid="add-employee-button"]')).toBeVisible();
            await page.click('[data-testid="add-employee-button"]');
            await (0, test_1.expect)(page.locator('[data-testid="employee-form"]')).toBeVisible();
        });
    });
    test_1.test.describe('Motion and Animation', () => {
        (0, test_1.test)('should respect reduced motion preferences', async ({ page }) => {
            await page.emulateMedia({ reducedMotion: 'reduce' });
            await page.reload();
            const animatedElements = page.locator('[class*="animate"], [class*="transition"]');
            const count = await animatedElements.count();
            for (let i = 0; i < count; i++) {
                const element = animatedElements.nth(i);
                const computedStyle = await element.evaluate(el => {
                    return window.getComputedStyle(el);
                });
                (0, test_1.expect)(computedStyle.animationDuration === '0s' ||
                    computedStyle.transitionDuration === '0s' ||
                    parseFloat(computedStyle.animationDuration) < 0.1).toBeTruthy();
            }
        });
        (0, test_1.test)('should not have auto-playing content without controls', async ({ page }) => {
            const videos = page.locator('video[autoplay]');
            const videoCount = await videos.count();
            for (let i = 0; i < videoCount; i++) {
                const video = videos.nth(i);
                const hasControls = await video.getAttribute('controls');
                const duration = await video.evaluate(v => v.duration);
                (0, test_1.expect)(hasControls !== null || duration < 5).toBeTruthy();
            }
        });
    });
    test_1.test.describe('Responsive and Mobile Accessibility', () => {
        (0, test_1.test)('should be accessible on mobile viewport', async ({ page }) => {
            await page.setViewportSize({ width: 375, height: 667 });
            await page.reload();
            await (0, axe_playwright_1.checkA11y)(page, null, {
                detailedReport: true
            });
        });
        (0, test_1.test)('should have proper touch targets on mobile', async ({ page }) => {
            await page.setViewportSize({ width: 375, height: 667 });
            const interactiveElements = page.locator('button, a, input, select');
            const count = await interactiveElements.count();
            for (let i = 0; i < Math.min(count, 20); i++) {
                const element = interactiveElements.nth(i);
                if (await element.isVisible()) {
                    const boundingBox = await element.boundingBox();
                    if (boundingBox) {
                        (0, test_1.expect)(boundingBox.width).toBeGreaterThanOrEqual(44);
                        (0, test_1.expect)(boundingBox.height).toBeGreaterThanOrEqual(44);
                    }
                }
            }
        });
    });
    test_1.test.describe('Language and Internationalization', () => {
        (0, test_1.test)('should have proper language attributes', async ({ page }) => {
            const htmlLang = await page.getAttribute('html', 'lang');
            (0, test_1.expect)(htmlLang).toBeTruthy();
            (0, test_1.expect)(htmlLang).toMatch(/^[a-z]{2}(-[A-Z]{2})?$/);
            const elementsWithLang = page.locator('[lang]');
            const count = await elementsWithLang.count();
            for (let i = 0; i < count; i++) {
                const element = elementsWithLang.nth(i);
                const lang = await element.getAttribute('lang');
                (0, test_1.expect)(lang).toMatch(/^[a-z]{2}(-[A-Z]{2})?$/);
            }
        });
        (0, test_1.test)('should provide text alternatives for non-text content', async ({ page }) => {
            const images = page.locator('img');
            const imageCount = await images.count();
            for (let i = 0; i < imageCount; i++) {
                const img = images.nth(i);
                const alt = await img.getAttribute('alt');
                const ariaLabel = await img.getAttribute('aria-label');
                const ariaLabelledBy = await img.getAttribute('aria-labelledby');
                (0, test_1.expect)(alt !== null || ariaLabel !== null || ariaLabelledBy !== null).toBeTruthy();
            }
            const icons = page.locator('svg, [class*="icon"]');
            const iconCount = await icons.count();
            for (let i = 0; i < iconCount; i++) {
                const icon = icons.nth(i);
                const ariaLabel = await icon.getAttribute('aria-label');
                const title = await icon.locator('title').textContent();
                const ariaHidden = await icon.getAttribute('aria-hidden');
                (0, test_1.expect)(ariaLabel !== null || title !== null || ariaHidden === 'true').toBeTruthy();
            }
        });
    });
});
//# sourceMappingURL=accessibility.spec.js.map