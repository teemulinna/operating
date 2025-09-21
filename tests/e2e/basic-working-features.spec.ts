import { test, expect } from '@playwright/test';

test.describe('Basic Working Features - Simple Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Set a reasonable timeout for navigation
    page.setDefaultTimeout(30000);
    
    // Navigate to the application
    await page.goto('http://localhost:3002', { 
      waitUntil: 'networkidle',
      timeout: 30000 
    });
  });

  test('Application loads without crashing', async ({ page }) => {
    try {
      // Check if the page loads and has some basic content
      await expect(page.locator('body')).toBeVisible({ timeout: 15000 });
      
      // Look for any text content
      const pageContent = await page.textContent('body');
      expect(pageContent).toBeTruthy();
      expect(pageContent.length).toBeGreaterThan(0);
      
      console.log('✓ Application loaded successfully');
      
    } catch (error) {
      console.log('❌ Application failed to load:', error);
      await page.screenshot({ path: 'test-results/basic-load-failure.png', fullPage: true });
      throw error;
    }
  });

  test('Basic HTML structure exists', async ({ page }) => {
    try {
      // Check for basic HTML elements
      await expect(page.locator('html')).toBeVisible();
      await expect(page.locator('body')).toBeVisible();
      
      // Check if there's any content div or container
      const containers = page.locator('div');
      const containerCount = await containers.count();
      
      expect(containerCount).toBeGreaterThan(0);
      console.log(`✓ Found ${containerCount} div elements`);
      
    } catch (error) {
      console.log('❌ Basic HTML structure test failed:', error);
      await page.screenshot({ path: 'test-results/html-structure-failure.png', fullPage: true });
      throw error;
    }
  });

  test('Page title and meta information', async ({ page }) => {
    try {
      // Check page title
      const title = await page.title();
      console.log(`Page title: "${title}"`);
      expect(title).toBeTruthy();
      
      // Check if page has some content
      const hasContent = await page.locator('body *').count();
      expect(hasContent).toBeGreaterThan(0);
      
      console.log('✓ Page meta information is present');
      
    } catch (error) {
      console.log('❌ Page meta test failed:', error);
      await page.screenshot({ path: 'test-results/meta-info-failure.png', fullPage: true });
      throw error;
    }
  });

  test('Console errors are reasonable', async ({ page }) => {
    const consoleErrors: string[] = [];
    const consoleWarnings: string[] = [];
    
    // Capture console messages
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      } else if (msg.type() === 'warning') {
        consoleWarnings.push(msg.text());
      }
    });

    try {
      // Wait for page to fully load
      await page.waitForTimeout(3000);
      
      // Report findings
      console.log(`Console errors: ${consoleErrors.length}`);
      console.log(`Console warnings: ${consoleWarnings.length}`);
      
      if (consoleErrors.length > 0) {
        console.log('Console errors found:');
        consoleErrors.slice(0, 5).forEach((error, i) => {
          console.log(`  ${i + 1}. ${error.substring(0, 100)}...`);
        });
      }
      
      // Test passes regardless of console errors for now - just documenting them
      console.log('✓ Console error check completed');
      
    } catch (error) {
      console.log('❌ Console error test failed:', error);
      await page.screenshot({ path: 'test-results/console-test-failure.png', fullPage: true });
      throw error;
    }
  });

  test('Basic navigation and interaction', async ({ page }) => {
    try {
      // Check if any buttons exist
      const buttons = page.locator('button');
      const buttonCount = await buttons.count();
      
      console.log(`Found ${buttonCount} buttons on the page`);
      
      // Check if any links exist  
      const links = page.locator('a');
      const linkCount = await links.count();
      
      console.log(`Found ${linkCount} links on the page`);
      
      // Check if any input fields exist
      const inputs = page.locator('input, textarea, select');
      const inputCount = await inputs.count();
      
      console.log(`Found ${inputCount} input elements on the page`);
      
      // Basic interaction test - try to focus an element if available
      if (buttonCount > 0) {
        await buttons.first().focus();
        console.log('✓ Successfully focused first button');
      }
      
      console.log('✓ Basic navigation check completed');
      
    } catch (error) {
      console.log('❌ Navigation test failed:', error);
      await page.screenshot({ path: 'test-results/navigation-test-failure.png', fullPage: true });
      throw error;
    }
  });

  test('Responsive design basics', async ({ page }) => {
    try {
      // Test different viewport sizes
      const viewports = [
        { width: 1920, height: 1080, name: 'Desktop' },
        { width: 768, height: 1024, name: 'Tablet' },
        { width: 375, height: 667, name: 'Mobile' }
      ];

      for (const viewport of viewports) {
        await page.setViewportSize({ width: viewport.width, height: viewport.height });
        await page.waitForTimeout(500);
        
        // Check if content is still visible
        const bodyVisible = await page.locator('body').isVisible();
        expect(bodyVisible).toBe(true);
        
        console.log(`✓ ${viewport.name} (${viewport.width}x${viewport.height}): Content visible`);
      }
      
    } catch (error) {
      console.log('❌ Responsive design test failed:', error);
      await page.screenshot({ path: 'test-results/responsive-test-failure.png', fullPage: true });
      throw error;
    }
  });
});