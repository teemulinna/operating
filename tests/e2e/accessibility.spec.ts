import { test, expect } from '@playwright/test';
import { injectAxe, checkA11y, getAxeResults } from 'axe-playwright';

test.describe('Accessibility Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await injectAxe(page);
  });

  test.describe('WCAG Compliance', () => {
    test('should meet WCAG AA standards on main page', async ({ page }) => {
      await checkA11y(page, null, {
        detailedReport: true,
        detailedReportOptions: { html: true }
      });
    });

    test('should meet WCAG AA standards on employee form', async ({ page }) => {
      await page.click('[data-testid="add-employee-button"]');
      await page.waitForSelector('[data-testid="employee-form"]');
      
      await checkA11y(page, '[data-testid="employee-form"]', {
        detailedReport: true,
        detailedReportOptions: { html: true }
      });
    });

    test('should meet WCAG AA standards on employee list', async ({ page }) => {
      await page.waitForSelector('[data-testid="employee-list"]');
      
      await checkA11y(page, '[data-testid="employee-list"]', {
        detailedReport: true,
        detailedReportOptions: { html: true }
      });
    });

    test('should meet WCAG AA standards on search and filters', async ({ page }) => {
      await checkA11y(page, '[data-testid="search-section"]', {
        detailedReport: true,
        detailedReportOptions: { html: true }
      });
    });
  });

  test.describe('Keyboard Navigation', () => {
    test('should navigate through form using keyboard only', async ({ page }) => {
      await page.click('[data-testid="add-employee-button"]');
      
      // Tab through form fields
      await page.keyboard.press('Tab'); // First name
      await expect(page.locator('[data-testid="first-name-input"]')).toBeFocused();
      
      await page.keyboard.press('Tab'); // Last name
      await expect(page.locator('[data-testid="last-name-input"]')).toBeFocused();
      
      await page.keyboard.press('Tab'); // Email
      await expect(page.locator('[data-testid="email-input"]')).toBeFocused();
      
      await page.keyboard.press('Tab'); // Phone
      await expect(page.locator('[data-testid="phone-input"]')).toBeFocused();
      
      await page.keyboard.press('Tab'); // Position
      await expect(page.locator('[data-testid="position-input"]')).toBeFocused();
      
      // Test reverse tabbing
      await page.keyboard.press('Shift+Tab');
      await expect(page.locator('[data-testid="phone-input"]')).toBeFocused();
    });

    test('should handle dropdown navigation with keyboard', async ({ page }) => {
      await page.click('[data-testid="add-employee-button"]');
      
      // Navigate to department dropdown
      await page.focus('[data-testid="department-select"]');
      await page.keyboard.press('Enter'); // Open dropdown
      
      await page.keyboard.press('ArrowDown'); // Navigate to first option
      await page.keyboard.press('ArrowDown'); // Navigate to second option
      await page.keyboard.press('Enter'); // Select option
      
      // Verify selection was made
      await expect(page.locator('[data-testid="department-select"]')).toContainText('Engineering');
    });

    test('should support skip links for main content', async ({ page }) => {
      // Focus should start at skip link
      await page.keyboard.press('Tab');
      await expect(page.locator('[data-testid="skip-to-main"]')).toBeFocused();
      
      // Pressing enter on skip link should jump to main content
      await page.keyboard.press('Enter');
      await expect(page.locator('[data-testid="main-content"]')).toBeFocused();
    });

    test('should handle modal dialog keyboard interactions', async ({ page }) => {
      // Open modal
      await page.click('[data-testid="add-employee-button"]');
      await page.waitForSelector('[data-testid="employee-form-modal"]');
      
      // Focus should be trapped within modal
      await page.keyboard.press('Tab');
      const focusedElement = page.locator(':focus');
      
      // Should be focused on an element within the modal
      await expect(focusedElement).toBeVisible();
      
      // Escape should close modal
      await page.keyboard.press('Escape');
      await expect(page.locator('[data-testid="employee-form-modal"]')).not.toBeVisible();
    });
  });

  test.describe('Screen Reader Support', () => {
    test('should have proper heading hierarchy', async ({ page }) => {
      // Check that headings follow proper hierarchy (h1 -> h2 -> h3, etc.)
      const headings = await page.locator('h1, h2, h3, h4, h5, h6').allTextContents();
      
      const headingLevels = await page.locator('h1, h2, h3, h4, h5, h6').evaluateAll(elements =>
        elements.map(el => parseInt(el.tagName.charAt(1)))
      );
      
      // Should start with h1
      expect(headingLevels[0]).toBe(1);
      
      // Check for proper hierarchy (no skipping levels)
      for (let i = 1; i < headingLevels.length; i++) {
        const current = headingLevels[i];
        const previous = headingLevels[i - 1];
        
        // Should not skip more than one level
        expect(current - previous).toBeLessThanOrEqual(1);
      }
    });

    test('should have proper form labels and descriptions', async ({ page }) => {
      await page.click('[data-testid="add-employee-button"]');
      
      // Check that all form inputs have associated labels
      const inputs = page.locator('input, select, textarea');
      const inputCount = await inputs.count();
      
      for (let i = 0; i < inputCount; i++) {
        const input = inputs.nth(i);
        const id = await input.getAttribute('id');
        
        if (id) {
          // Should have associated label
          const label = page.locator(`label[for="${id}"]`);
          await expect(label).toBeVisible();
          
          // Label should have meaningful text
          const labelText = await label.textContent();
          expect(labelText?.length).toBeGreaterThan(0);
        }
        
        // Check for aria-describedby if present
        const describedBy = await input.getAttribute('aria-describedby');
        if (describedBy) {
          const description = page.locator(`#${describedBy}`);
          await expect(description).toBeVisible();
        }
      }
    });

    test('should provide proper ARIA labels for interactive elements', async ({ page }) => {
      // Check buttons have appropriate labels
      const buttons = page.locator('button');
      const buttonCount = await buttons.count();
      
      for (let i = 0; i < buttonCount; i++) {
        const button = buttons.nth(i);
        const ariaLabel = await button.getAttribute('aria-label');
        const buttonText = await button.textContent();
        
        // Button should have either visible text or aria-label
        expect(ariaLabel || buttonText?.trim()).toBeTruthy();
      }
    });

    test('should announce dynamic content changes', async ({ page }) => {
      // Add live region for announcements
      await page.evaluate(() => {
        const liveRegion = document.createElement('div');
        liveRegion.setAttribute('aria-live', 'polite');
        liveRegion.setAttribute('aria-atomic', 'true');
        liveRegion.setAttribute('id', 'live-region');
        liveRegion.style.position = 'absolute';
        liveRegion.style.left = '-10000px';
        document.body.appendChild(liveRegion);
      });
      
      // Trigger an action that should announce something
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
      
      // Check that success message is announced
      await page.waitForSelector('[data-testid="success-message"]');
      
      // Live region should contain the announcement
      const liveRegionContent = await page.locator('#live-region').textContent();
      expect(liveRegionContent).toContain('Employee added successfully');
    });
  });

  test.describe('Focus Management', () => {
    test('should maintain focus when modal opens and closes', async ({ page }) => {
      const addButton = page.locator('[data-testid="add-employee-button"]');
      
      // Focus the add button
      await addButton.focus();
      await expect(addButton).toBeFocused();
      
      // Open modal
      await addButton.press('Enter');
      await page.waitForSelector('[data-testid="employee-form-modal"]');
      
      // Focus should move to modal
      const modalFirstInput = page.locator('[data-testid="first-name-input"]');
      await expect(modalFirstInput).toBeFocused();
      
      // Close modal
      await page.keyboard.press('Escape');
      
      // Focus should return to add button
      await expect(addButton).toBeFocused();
    });

    test('should handle focus on error messages', async ({ page }) => {
      await page.click('[data-testid="add-employee-button"]');
      
      // Try to submit empty form
      await page.click('[data-testid="submit-employee-form"]');
      
      // Focus should move to first error field
      await expect(page.locator('[data-testid="first-name-input"]')).toBeFocused();
      
      // Error message should be associated with the field
      const errorId = await page.locator('[data-testid="first-name-error"]').getAttribute('id');
      const inputDescribedBy = await page.locator('[data-testid="first-name-input"]').getAttribute('aria-describedby');
      
      expect(inputDescribedBy).toContain(errorId);
    });

    test('should provide visible focus indicators', async ({ page }) => {
      // Check that focused elements have visible focus indicators
      const focusableElements = page.locator('button, input, select, textarea, a[href]');
      const count = await focusableElements.count();
      
      for (let i = 0; i < Math.min(count, 10); i++) { // Check first 10 elements
        const element = focusableElements.nth(i);
        await element.focus();
        
        // Check that element has focus styles
        const computedStyle = await element.evaluate(el => {
          return window.getComputedStyle(el);
        });
        
        // Should have some form of focus indication (outline, border, box-shadow)
        const hasFocusStyle = 
          computedStyle.outline !== 'none' ||
          computedStyle.outlineWidth !== '0px' ||
          computedStyle.boxShadow !== 'none' ||
          computedStyle.borderColor !== 'transparent';
        
        expect(hasFocusStyle).toBeTruthy();
      }
    });
  });

  test.describe('Color and Contrast', () => {
    test('should meet color contrast requirements', async ({ page }) => {
      await checkA11y(page, null, {
        rules: {
          'color-contrast': { enabled: true }
        }
      });
    });

    test('should not rely solely on color for information', async ({ page }) => {
      // Test that validation errors have more than just color indication
      await page.click('[data-testid="add-employee-button"]');
      await page.click('[data-testid="submit-employee-form"]');
      
      // Error fields should have text messages, not just red borders
      await expect(page.locator('[data-testid="first-name-error"]')).toBeVisible();
      await expect(page.locator('[data-testid="first-name-error"]')).toContainText('required');
      
      // Check for error icons or other visual indicators
      const errorIcon = page.locator('[data-testid="first-name-error"] svg, [data-testid="first-name-error"] .error-icon');
      if (await errorIcon.isVisible()) {
        // Icon should have proper alt text or aria-label
        const ariaLabel = await errorIcon.getAttribute('aria-label');
        expect(ariaLabel).toBeTruthy();
      }
    });

    test('should work in high contrast mode', async ({ page }) => {
      // Simulate high contrast mode
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
      
      // Elements should still be visible and functional
      await expect(page.locator('[data-testid="employee-list"]')).toBeVisible();
      await expect(page.locator('[data-testid="add-employee-button"]')).toBeVisible();
      
      // Test that interactive elements still work
      await page.click('[data-testid="add-employee-button"]');
      await expect(page.locator('[data-testid="employee-form"]')).toBeVisible();
    });
  });

  test.describe('Motion and Animation', () => {
    test('should respect reduced motion preferences', async ({ page }) => {
      // Set reduced motion preference
      await page.emulateMedia({ reducedMotion: 'reduce' });
      
      await page.reload();
      
      // Check that animations are disabled or reduced
      const animatedElements = page.locator('[class*="animate"], [class*="transition"]');
      const count = await animatedElements.count();
      
      for (let i = 0; i < count; i++) {
        const element = animatedElements.nth(i);
        const computedStyle = await element.evaluate(el => {
          return window.getComputedStyle(el);
        });
        
        // Animations should be disabled or very short
        expect(
          computedStyle.animationDuration === '0s' ||
          computedStyle.transitionDuration === '0s' ||
          parseFloat(computedStyle.animationDuration) < 0.1
        ).toBeTruthy();
      }
    });

    test('should not have auto-playing content without controls', async ({ page }) => {
      // Check for auto-playing videos or animations
      const videos = page.locator('video[autoplay]');
      const videoCount = await videos.count();
      
      for (let i = 0; i < videoCount; i++) {
        const video = videos.nth(i);
        
        // Auto-playing videos should have controls or be very short
        const hasControls = await video.getAttribute('controls');
        const duration = await video.evaluate(v => v.duration);
        
        expect(hasControls !== null || duration < 5).toBeTruthy();
      }
    });
  });

  test.describe('Responsive and Mobile Accessibility', () => {
    test('should be accessible on mobile viewport', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await page.reload();
      
      await checkA11y(page, null, {
        detailedReport: true
      });
    });

    test('should have proper touch targets on mobile', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      
      const interactiveElements = page.locator('button, a, input, select');
      const count = await interactiveElements.count();
      
      for (let i = 0; i < Math.min(count, 20); i++) { // Check first 20 elements
        const element = interactiveElements.nth(i);
        
        if (await element.isVisible()) {
          const boundingBox = await element.boundingBox();
          
          if (boundingBox) {
            // Touch targets should be at least 44x44px
            expect(boundingBox.width).toBeGreaterThanOrEqual(44);
            expect(boundingBox.height).toBeGreaterThanOrEqual(44);
          }
        }
      }
    });
  });

  test.describe('Language and Internationalization', () => {
    test('should have proper language attributes', async ({ page }) => {
      // HTML should have lang attribute
      const htmlLang = await page.getAttribute('html', 'lang');
      expect(htmlLang).toBeTruthy();
      expect(htmlLang).toMatch(/^[a-z]{2}(-[A-Z]{2})?$/); // e.g., 'en' or 'en-US'
      
      // Check for any elements with different languages
      const elementsWithLang = page.locator('[lang]');
      const count = await elementsWithLang.count();
      
      for (let i = 0; i < count; i++) {
        const element = elementsWithLang.nth(i);
        const lang = await element.getAttribute('lang');
        expect(lang).toMatch(/^[a-z]{2}(-[A-Z]{2})?$/);
      }
    });

    test('should provide text alternatives for non-text content', async ({ page }) => {
      // All images should have alt text
      const images = page.locator('img');
      const imageCount = await images.count();
      
      for (let i = 0; i < imageCount; i++) {
        const img = images.nth(i);
        const alt = await img.getAttribute('alt');
        const ariaLabel = await img.getAttribute('aria-label');
        const ariaLabelledBy = await img.getAttribute('aria-labelledby');
        
        // Should have alt text or aria labeling
        expect(alt !== null || ariaLabel !== null || ariaLabelledBy !== null).toBeTruthy();
      }
      
      // Icons should have text alternatives
      const icons = page.locator('svg, [class*="icon"]');
      const iconCount = await icons.count();
      
      for (let i = 0; i < iconCount; i++) {
        const icon = icons.nth(i);
        const ariaLabel = await icon.getAttribute('aria-label');
        const title = await icon.locator('title').textContent();
        const ariaHidden = await icon.getAttribute('aria-hidden');
        
        // Icon should have label, title, or be hidden from screen readers
        expect(ariaLabel !== null || title !== null || ariaHidden === 'true').toBeTruthy();
      }
    });
  });
});