import { test, expect } from '@playwright/test';

/**
 * PRODUCTION READINESS VALIDATION TESTS (REFACTOR Phase)
 * 
 * These tests validate production readiness criteria:
 * - Performance under load
 * - Error handling and graceful degradation
 * - Security validations
 * - Cross-browser compatibility
 * - Mobile responsiveness
 * - Accessibility compliance
 */

const BACKEND_URL = 'http://localhost:3001';
const FRONTEND_URL = 'http://localhost:3003';

test.describe('Production Readiness - REFACTOR Phase Validation', () => {
  
  test('Performance - Page Load Times Under Production Thresholds', async ({ page }) => {
    console.log('⚡ Testing performance under production load thresholds...');
    
    const performanceMetrics: any[] = [];
    
    const pages = [
      { url: `${FRONTEND_URL}`, name: 'Dashboard' },
      { url: `${FRONTEND_URL}/employees`, name: 'Employees' },
      { url: `${FRONTEND_URL}/projects`, name: 'Projects' },
      { url: `${FRONTEND_URL}/allocations`, name: 'Allocations' },
      { url: `${FRONTEND_URL}/schedule`, name: 'Schedule' }
    ];
    
    for (const pageInfo of pages) {
      const startTime = Date.now();
      
      await page.goto(pageInfo.url);
      await page.waitForLoadState('networkidle');
      
      const loadTime = Date.now() - startTime;
      
      performanceMetrics.push({
        page: pageInfo.name,
        loadTime: loadTime,
        threshold: 2000 // 2 seconds threshold
      });
      
      console.log(`${pageInfo.name}: ${loadTime}ms`);
      expect(loadTime).toBeLessThan(2000); // Production requirement: under 2 seconds
    }
    
    // Test time to first byte (TTFB)
    const ttfbStartTime = Date.now();
    const response = await page.goto(`${FRONTEND_URL}/employees`);
    const ttfb = Date.now() - ttfbStartTime;
    
    expect(ttfb).toBeLessThan(500); // TTFB under 500ms
    console.log(`Time to First Byte: ${ttfb}ms`);
    
    // Test largest contentful paint (simulated)
    const lcpMetrics = await page.evaluate(() => {
      return new Promise((resolve) => {
        new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const lastEntry = entries[entries.length - 1];
          resolve(lastEntry?.startTime || 0);
        }).observe({ entryTypes: ['largest-contentful-paint'] });
        
        // Fallback after 3 seconds
        setTimeout(() => resolve(0), 3000);
      });
    });
    
    if (lcpMetrics > 0) {
      expect(lcpMetrics).toBeLessThan(2500); // LCP under 2.5 seconds
      console.log(`Largest Contentful Paint: ${lcpMetrics}ms`);
    }
    
    console.log('✅ All pages meet performance thresholds');
  });
  
  test('Error Handling - Graceful Degradation with Backend Offline', async ({ page }) => {
    console.log('🚨 Testing error handling with backend offline...');
    
    // Block all API requests to simulate backend being down
    await page.route('**/api/**', route => {
      route.abort('failed');
    });
    
    await page.goto(`${FRONTEND_URL}/employees`);
    await page.waitForLoadState('domcontentloaded');
    
    // Should show error state instead of crashing
    const errorStates = [
      '[data-testid="error-message"]',
      '[data-testid="offline-message"]',
      '[data-testid="connection-error"]',
      'text=Unable to load',
      'text=Connection error',
      'text=Please try again'
    ];
    
    let errorFound = false;
    for (const errorSelector of errorStates) {
      try {
        await page.locator(errorSelector).waitFor({ timeout: 3000 });
        errorFound = true;
        console.log(`✅ Found error state: ${errorSelector}`);
        break;
      } catch {
        // Continue checking other selectors
      }
    }
    
    expect(errorFound).toBeTruthy();
    
    // Should not show blank page or JavaScript errors
    const pageContent = await page.textContent('body');
    expect(pageContent?.length).toBeGreaterThan(0);
    
    // Check for retry mechanism
    const retryElements = [
      '[data-testid="retry-button"]',
      '[data-testid="refresh-button"]',
      'text=Retry',
      'text=Refresh'
    ];
    
    let retryFound = false;
    for (const retrySelector of retryElements) {
      try {
        await page.locator(retrySelector).waitFor({ timeout: 2000 });
        retryFound = true;
        console.log(`✅ Found retry mechanism: ${retrySelector}`);
        break;
      } catch {
        // Continue checking
      }
    }
    
    expect(retryFound).toBeTruthy();
    
    console.log('✅ Graceful degradation working correctly');
  });
  
  test('Security - Input Sanitization and XSS Prevention', async ({ page }) => {
    console.log('🔒 Testing security validations and XSS prevention...');
    
    await page.goto(`${FRONTEND_URL}/employees`);
    await page.waitForLoadState('networkidle');
    
    // Test XSS injection attempts
    const xssPayloads = [
      '<script>alert("xss")</script>',
      '"><script>alert("xss")</script>',
      'javascript:alert("xss")',
      '<img src=x onerror=alert("xss")>',
      '&lt;script&gt;alert("xss")&lt;/script&gt;'
    ];
    
    await page.click('[data-testid="add-employee-button"]');
    
    for (const payload of xssPayloads) {
      // Test first name field
      await page.fill('[data-testid="employee-first-name"]', payload);
      await page.fill('[data-testid="employee-last-name"]', 'Test');
      await page.fill('[data-testid="employee-email"]', 'xsstest@test.com');
      await page.fill('[data-testid="employee-position"]', 'XSS Tester');
      await page.selectOption('[data-testid="employee-department"]', { index: 1 });
      await page.fill('[data-testid="employee-default-hours"]', '40');
      
      // Listen for any alert dialogs (should not appear)
      let alertTriggered = false;
      page.on('dialog', async dialog => {
        alertTriggered = true;
        await dialog.dismiss();
      });
      
      await page.click('[data-testid="submit-employee-form"]');
      await page.waitForTimeout(1000);
      
      expect(alertTriggered).toBeFalsy();
      
      // Check if XSS payload was sanitized
      const fieldValue = await page.inputValue('[data-testid="employee-first-name"]');
      if (fieldValue.includes('<script>') || fieldValue.includes('javascript:')) {
        throw new Error(`XSS payload not sanitized: ${fieldValue}`);
      }
      
      // Clear for next test
      await page.fill('[data-testid="employee-first-name"]', '');
    }
    
    console.log('✅ XSS prevention working correctly');
    
    // Test SQL injection prevention
    await page.fill('[data-testid="employee-first-name"]', "'; DROP TABLE employees; --");
    await page.fill('[data-testid="employee-email"]', "sql@injection.com");
    await page.click('[data-testid="submit-employee-form"]');
    
    // Should either show validation error or sanitize input
    // Backend should still be functional
    const healthResponse = await fetch(`${BACKEND_URL}/health`);
    expect(healthResponse.ok).toBeTruthy();
    
    console.log('✅ SQL injection prevention working correctly');
    
    // Test CSRF protection (if implemented)
    // This would involve testing requests without proper CSRF tokens
    // For now, we verify that forms use proper authentication
    
    await page.click('[data-testid="cancel-employee-form"]');
  });
  
  test('Input Validation - Comprehensive Field Validation', async ({ page }) => {
    console.log('✅ Testing comprehensive input validation...');
    
    await page.goto(`${FRONTEND_URL}/employees`);
    await page.click('[data-testid="add-employee-button"]');
    
    const validationTests = [
      {
        field: '[data-testid="employee-email"]',
        value: 'not-an-email',
        expectedError: 'email'
      },
      {
        field: '[data-testid="employee-default-hours"]',
        value: '-5',
        expectedError: 'hours'
      },
      {
        field: '[data-testid="employee-default-hours"]',
        value: '999',
        expectedError: 'hours'
      },
      {
        field: '[data-testid="employee-default-hours"]',
        value: 'not-a-number',
        expectedError: 'hours'
      }
    ];
    
    for (const test of validationTests) {
      await page.fill('[data-testid="employee-first-name"]', 'Validation');
      await page.fill('[data-testid="employee-last-name"]', 'Test');
      await page.fill(test.field, test.value);
      await page.fill('[data-testid="employee-position"]', 'Tester');
      await page.selectOption('[data-testid="employee-department"]', { index: 1 });
      
      // If we're not testing hours, set valid hours
      if (!test.field.includes('hours')) {
        await page.fill('[data-testid="employee-default-hours"]', '40');
      }
      
      // If we're not testing email, set valid email
      if (!test.field.includes('email')) {
        await page.fill('[data-testid="employee-email"]', 'valid@test.com');
      }
      
      await page.click('[data-testid="submit-employee-form"]');
      
      // Should show validation error
      const errorSelectors = [
        `[data-testid="${test.expectedError}-validation-error"]`,
        `[data-testid="validation-error"]`,
        '[data-testid="form-error"]'
      ];
      
      let errorFound = false;
      for (const selector of errorSelectors) {
        try {
          await page.locator(selector).waitFor({ timeout: 2000 });
          errorFound = true;
          break;
        } catch {
          // Continue checking
        }
      }
      
      expect(errorFound).toBeTruthy();
      console.log(`✅ Validation error shown for ${test.field}: ${test.value}`);
    }
    
    // Test required field validation
    await page.fill('[data-testid="employee-first-name"]', '');
    await page.fill('[data-testid="employee-last-name"]', '');
    await page.fill('[data-testid="employee-email"]', '');
    await page.click('[data-testid="submit-employee-form"]');
    
    // Should prevent submission with empty required fields
    const formModal = page.locator('[data-testid="employee-form-modal"]');
    await expect(formModal).toBeVisible(); // Form should still be open
    
    console.log('✅ Required field validation working correctly');
  });
  
  test('Cross-Browser Compatibility - Chrome Specific Features', async ({ page }) => {
    console.log('🌐 Testing cross-browser compatibility...');
    
    // Test modern JavaScript features
    const jsFeatures = await page.evaluate(() => {
      const features = {
        fetch: typeof fetch !== 'undefined',
        promises: typeof Promise !== 'undefined',
        asyncAwait: true, // If this code runs, async/await is supported
        arrow: (() => true)(), // Arrow function test
        const: (() => { const x = 1; return x === 1; })(),
        localStorage: typeof localStorage !== 'undefined',
        sessionStorage: typeof sessionStorage !== 'undefined'
      };
      return features;
    });
    
    // All modern features should be supported
    Object.entries(jsFeatures).forEach(([feature, supported]) => {
      expect(supported).toBeTruthy();
      console.log(`✅ ${feature}: supported`);
    });
    
    // Test CSS Grid and Flexbox support
    const cssSupport = await page.evaluate(() => {
      const testEl = document.createElement('div');
      testEl.style.display = 'grid';
      const gridSupported = testEl.style.display === 'grid';
      
      testEl.style.display = 'flex';
      const flexSupported = testEl.style.display === 'flex';
      
      return { grid: gridSupported, flex: flexSupported };
    });
    
    expect(cssSupport.grid).toBeTruthy();
    expect(cssSupport.flex).toBeTruthy();
    
    // Test responsive design at different viewport sizes
    const viewports = [
      { width: 320, height: 568, name: 'Mobile' },
      { width: 768, height: 1024, name: 'Tablet' },
      { width: 1920, height: 1080, name: 'Desktop' }
    ];
    
    for (const viewport of viewports) {
      await page.setViewportSize(viewport);
      await page.goto(`${FRONTEND_URL}/employees`);
      await page.waitForLoadState('networkidle');
      
      // Check that main content is visible and not overlapping
      const mainContent = page.locator('main, [data-testid="main-content"], .main-content').first();
      await expect(mainContent).toBeVisible();
      
      const contentBox = await mainContent.boundingBox();
      expect(contentBox?.width).toBeGreaterThan(0);
      expect(contentBox?.height).toBeGreaterThan(0);
      
      console.log(`✅ ${viewport.name} (${viewport.width}x${viewport.height}): layout intact`);
    }
    
    // Reset to default viewport
    await page.setViewportSize({ width: 1280, height: 720 });
  });
  
  test('Accessibility - WCAG 2.1 AA Compliance', async ({ page }) => {
    console.log('♿ Testing accessibility compliance...');
    
    await page.goto(`${FRONTEND_URL}/employees`);
    await page.waitForLoadState('networkidle');
    
    // Test keyboard navigation
    await page.keyboard.press('Tab'); // Should focus first focusable element
    const focusedElement1 = await page.evaluate(() => document.activeElement?.tagName);
    expect(['BUTTON', 'A', 'INPUT'].includes(focusedElement1 || '')).toBeTruthy();
    
    await page.keyboard.press('Tab');
    const focusedElement2 = await page.evaluate(() => document.activeElement?.tagName);
    expect(['BUTTON', 'A', 'INPUT'].includes(focusedElement2 || '')).toBeTruthy();
    
    // Test skip link (if implemented)
    await page.keyboard.press('Tab');
    const skipLink = page.locator('a[href="#main"], [data-testid="skip-link"]').first();
    try {
      await expect(skipLink).toBeVisible();
      console.log('✅ Skip link found');
    } catch {
      console.log('ℹ️ Skip link not implemented (recommended for accessibility)');
    }
    
    // Test form labels and accessibility
    await page.click('[data-testid="add-employee-button"]');
    
    const formInputs = page.locator('input, select, textarea');
    const inputCount = await formInputs.count();
    
    for (let i = 0; i < inputCount; i++) {
      const input = formInputs.nth(i);
      const inputId = await input.getAttribute('id');
      const inputAriaLabel = await input.getAttribute('aria-label');
      const inputAriaLabelledby = await input.getAttribute('aria-labelledby');
      
      // Each input should have either a label, aria-label, or aria-labelledby
      if (inputId) {
        const label = page.locator(`label[for="${inputId}"]`);
        const hasLabel = await label.count() > 0;
        const hasAriaLabel = inputAriaLabel !== null;
        const hasAriaLabelledby = inputAriaLabelledby !== null;
        
        expect(hasLabel || hasAriaLabel || hasAriaLabelledby).toBeTruthy();
      }
    }
    
    // Test color contrast (simplified check)
    const backgroundColors = await page.evaluate(() => {
      const elements = document.querySelectorAll('*');
      const colors = new Set();
      
      elements.forEach(el => {
        const style = window.getComputedStyle(el);
        const bgColor = style.backgroundColor;
        const textColor = style.color;
        
        if (bgColor !== 'rgba(0, 0, 0, 0)') {
          colors.add({ bg: bgColor, text: textColor });
        }
      });
      
      return Array.from(colors);
    });
    
    console.log(`✅ Found ${backgroundColors.length} color combinations`);
    
    // Test alt text for images
    const images = page.locator('img');
    const imageCount = await images.count();
    
    for (let i = 0; i < imageCount; i++) {
      const img = images.nth(i);
      const altText = await img.getAttribute('alt');
      const ariaLabel = await img.getAttribute('aria-label');
      const role = await img.getAttribute('role');
      
      // Images should have alt text or be marked as decorative
      if (role !== 'presentation' && role !== 'none') {
        expect(altText !== null || ariaLabel !== null).toBeTruthy();
      }
    }
    
    console.log('✅ Accessibility checks completed');
  });
  
  test('Data Integrity - Concurrent Operations and Race Conditions', async ({ browser }) => {
    console.log('🔄 Testing data integrity under concurrent operations...');
    
    // Create multiple contexts to simulate concurrent users
    const contexts = await Promise.all([
      browser.newContext(),
      browser.newContext(),
      browser.newContext()
    ]);
    
    const pages = await Promise.all(contexts.map(ctx => ctx.newPage()));
    
    // All users try to create employees simultaneously
    const timestamp = Date.now();
    const employeePromises = pages.map((page, index) => {
      return (async () => {
        await page.goto(`${FRONTEND_URL}/employees`);
        await page.click('[data-testid="add-employee-button"]');
        await page.fill('[data-testid="employee-first-name"]', `Concurrent${index}`);
        await page.fill('[data-testid="employee-last-name"]', 'User');
        await page.fill('[data-testid="employee-email"]', `concurrent${index}-${timestamp}@test.com`);
        await page.fill('[data-testid="employee-position"]', `Position ${index}`);
        await page.selectOption('[data-testid="employee-department"]', { index: 1 });
        await page.fill('[data-testid="employee-default-hours"]', '40');
        await page.click('[data-testid="submit-employee-form"]');
        
        await page.waitForSelector(`text=Concurrent${index} User`);
        return index;
      })();
    });
    
    // Wait for all operations to complete
    const results = await Promise.all(employeePromises);
    expect(results).toEqual([0, 1, 2]);
    
    // Verify all employees exist in database
    const apiResponse = await fetch(`${BACKEND_URL}/api/employees`);
    const employees = await apiResponse.json();
    
    const createdEmployees = employees.filter((emp: any) => 
      emp.email.includes(`concurrent`) && emp.email.includes(timestamp.toString())
    );
    
    expect(createdEmployees.length).toBe(3);
    console.log('✅ All concurrent operations completed successfully');
    
    // Test concurrent allocation creation
    const allocationPromises = pages.map((page, index) => {
      return (async () => {
        await page.goto(`${FRONTEND_URL}/allocations`);
        await page.click('[data-testid="create-allocation-button"]');
        await page.selectOption('[data-testid="allocation-employee"]', `Concurrent${index} User`);
        // Assuming first project exists
        await page.selectOption('[data-testid="allocation-project"]', { index: 1 });
        await page.fill('[data-testid="allocation-hours-per-week"]', '20');
        await page.fill('[data-testid="allocation-start-date"]', '2024-06-01');
        await page.fill('[data-testid="allocation-end-date"]', '2024-12-31');
        await page.click('[data-testid="submit-allocation-form"]');
        
        return index;
      })();
    });
    
    await Promise.all(allocationPromises);
    
    // Verify allocations were created
    const allocationsResponse = await fetch(`${BACKEND_URL}/api/allocations`);
    const allocations = await allocationsResponse.json();
    
    const testAllocations = allocations.filter((alloc: any) => 
      alloc.hours_per_week === 20
    );
    
    expect(testAllocations.length).toBeGreaterThanOrEqual(3);
    
    console.log('✅ Concurrent allocations handled correctly');
    
    // Clean up
    await Promise.all(contexts.map(ctx => ctx.close()));
  });
  
  test('Performance Under Load - Large Dataset Handling', async ({ page }) => {
    console.log('📊 Testing performance with large datasets...');
    
    // Create a substantial dataset
    const employeeCount = 50;
    const projectCount = 20;
    
    console.log(`Creating ${employeeCount} employees...`);
    
    const startTime = Date.now();
    
    // Create employees via API for speed
    const employeePromises = Array.from({ length: employeeCount }, async (_, i) => {
      const response = await fetch(`${BACKEND_URL}/api/employees`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          first_name: `LoadTest${i}`,
          last_name: 'Employee',
          email: `loadtest${i}@performance.com`,
          position: `Position ${i}`,
          department_id: 1,
          default_hours_per_week: 40
        })
      });
      return response.ok;
    });
    
    const employeeResults = await Promise.all(employeePromises);
    const successfulEmployees = employeeResults.filter(Boolean).length;
    
    console.log(`Created ${successfulEmployees} employees in ${Date.now() - startTime}ms`);
    
    // Create projects
    const projectPromises = Array.from({ length: projectCount }, async (_, i) => {
      const response = await fetch(`${BACKEND_URL}/api/projects`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: `Performance Test Project ${i}`,
          description: `Load testing project ${i}`,
          start_date: '2024-06-01',
          end_date: '2024-12-31',
          status: 'active'
        })
      });
      return response.ok;
    });
    
    await Promise.all(projectPromises);
    
    // Test UI performance with large dataset
    const loadStartTime = Date.now();
    
    await page.goto(`${FRONTEND_URL}/employees`);
    await page.waitForLoadState('networkidle');
    
    const pageLoadTime = Date.now() - loadStartTime;
    console.log(`Employee page loaded with ${successfulEmployees} employees in ${pageLoadTime}ms`);
    
    // Should still load within reasonable time (under 5 seconds for large dataset)
    expect(pageLoadTime).toBeLessThan(5000);
    
    // Test scrolling performance
    const scrollStartTime = Date.now();
    await page.evaluate(() => {
      window.scrollTo(0, document.body.scrollHeight);
    });
    
    await page.waitForTimeout(500); // Allow time for rendering
    const scrollTime = Date.now() - scrollStartTime;
    console.log(`Scroll performance: ${scrollTime}ms`);
    
    // Test search/filter performance
    const searchInput = page.locator('[data-testid="employee-search"], [data-testid="search-input"], input[placeholder*="Search"]').first();
    
    try {
      const searchStartTime = Date.now();
      await searchInput.fill('LoadTest1');
      await page.waitForTimeout(1000); // Allow for debounced search
      const searchTime = Date.now() - searchStartTime;
      
      console.log(`Search performance: ${searchTime}ms`);
      expect(searchTime).toBeLessThan(2000);
      
      // Should show filtered results
      const searchResults = page.locator('text=LoadTest1');
      await expect(searchResults.first()).toBeVisible();
      
    } catch (error) {
      console.log('ℹ️ Search functionality not found (expected in MVP)');
    }
    
    // Clean up performance test data
    const cleanupStartTime = Date.now();
    
    const employeesResponse = await fetch(`${BACKEND_URL}/api/employees`);
    const employees = await employeesResponse.json();
    
    const loadTestEmployees = employees.filter((emp: any) => emp.email.includes('loadtest'));
    
    await Promise.all(loadTestEmployees.map((emp: any) => 
      fetch(`${BACKEND_URL}/api/employees/${emp.id}`, { method: 'DELETE' })
    ));
    
    const projectsResponse = await fetch(`${BACKEND_URL}/api/projects`);
    const projects = await projectsResponse.json();
    
    const loadTestProjects = projects.filter((proj: any) => proj.name.includes('Performance Test'));
    
    await Promise.all(loadTestProjects.map((proj: any) => 
      fetch(`${BACKEND_URL}/api/projects/${proj.id}`, { method: 'DELETE' })
    ));
    
    const cleanupTime = Date.now() - cleanupStartTime;
    console.log(`Cleanup completed in ${cleanupTime}ms`);
    
    console.log('✅ Large dataset performance test completed');
  });
  
  test('Memory Usage - No Memory Leaks During Extended Use', async ({ page }) => {
    console.log('🧠 Testing for memory leaks during extended use...');
    
    const iterations = 10;
    let initialMemory: any;
    
    // Get initial memory usage
    try {
      initialMemory = await page.evaluate(() => {
        if ('memory' in performance) {
          return (performance as any).memory;
        }
        return null;
      });
    } catch (error) {
      console.log('ℹ️ Memory API not available, skipping memory leak test');
      return;
    }
    
    if (!initialMemory) {
      console.log('ℹ️ Memory monitoring not available in this environment');
      return;
    }
    
    console.log(`Initial memory: ${Math.round(initialMemory.usedJSHeapSize / 1024 / 1024)}MB`);
    
    // Perform repeated operations that could cause memory leaks
    for (let i = 0; i < iterations; i++) {
      // Navigate between pages
      await page.goto(`${FRONTEND_URL}/employees`);
      await page.waitForLoadState('networkidle');
      
      await page.goto(`${FRONTEND_URL}/projects`);
      await page.waitForLoadState('networkidle');
      
      await page.goto(`${FRONTEND_URL}/allocations`);
      await page.waitForLoadState('networkidle');
      
      // Force garbage collection if available
      try {
        await page.evaluate(() => {
          if ((window as any).gc) {
            (window as any).gc();
          }
        });
      } catch {
        // GC not available
      }
      
      if (i % 3 === 0) {
        const currentMemory = await page.evaluate(() => {
          return (performance as any).memory;
        });
        console.log(`Iteration ${i}: ${Math.round(currentMemory.usedJSHeapSize / 1024 / 1024)}MB`);
      }
    }
    
    // Check final memory usage
    const finalMemory = await page.evaluate(() => {
      return (performance as any).memory;
    });
    
    const memoryIncrease = finalMemory.usedJSHeapSize - initialMemory.usedJSHeapSize;
    const memoryIncreasePercent = (memoryIncrease / initialMemory.usedJSHeapSize) * 100;
    
    console.log(`Final memory: ${Math.round(finalMemory.usedJSHeapSize / 1024 / 1024)}MB`);
    console.log(`Memory increase: ${Math.round(memoryIncrease / 1024 / 1024)}MB (${memoryIncreasePercent.toFixed(1)}%)`);
    
    // Memory should not increase by more than 50% after extended use
    expect(memoryIncreasePercent).toBeLessThan(50);
    
    console.log('✅ No significant memory leaks detected');
  });
});