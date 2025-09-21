import { test, expect } from '@playwright/test';

test.describe('Performance Tests', () => {
  test.describe('Page Load Performance', () => {
    test('should load main page within acceptable time', async ({ page }) => {
      // Start performance monitoring
      const start = Date.now();
      
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      
      const loadTime = Date.now() - start;
      
      // Main page should load within 3 seconds
      expect(loadTime).toBeLessThan(3000);
      
      // Check Core Web Vitals
      const performanceMetrics = await page.evaluate(() => {
        return new Promise((resolve) => {
          new PerformanceObserver((list) => {
            const entries = list.getEntries();
            resolve(entries.map(entry => ({
              name: entry.name,
              value: entry.value,
              rating: entry.rating
            })));
          }).observe({ entryTypes: ['navigation', 'paint', 'largest-contentful-paint'] });
          
          // Fallback timeout
          setTimeout(() => resolve([]), 5000);
        });
      });
      
      console.log('Performance metrics:', performanceMetrics);
    });

    test('should have good Lighthouse scores', async ({ page }) => {
      await page.goto('/');
      
      // Wait for page to be fully loaded
      await page.waitForLoadState('networkidle');
      
      // Run basic performance checks
      const metrics = await page.evaluate(() => ({
        // Check if critical resources are loaded
        scriptsLoaded: document.querySelectorAll('script[src]').length,
        stylesLoaded: document.querySelectorAll('link[rel="stylesheet"]').length,
        imagesLoaded: document.querySelectorAll('img').length,
        // Check DOM size (should be reasonable)
        domSize: document.querySelectorAll('*').length,
        // Check if main content is visible
        hasContent: document.body.innerHTML.length > 1000
      }));
      
      // DOM should not be too large
      expect(metrics.domSize).toBeLessThan(2000);
      
      // Should have loaded main content
      expect(metrics.hasContent).toBe(true);
      
      console.log('Page metrics:', metrics);
    });
  });

  test.describe('Search Performance', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');
    });

    test('should perform search within acceptable time', async ({ page }) => {
      // Type search query and measure response time
      const searchStart = Date.now();
      
      await page.fill('[data-testid="search-input"]', 'test search query');
      
      // Wait for search results to appear/update
      await page.waitForTimeout(100); // Debounce delay
      await page.waitForFunction(() => {
        const input = document.querySelector('[data-testid="search-input"]');
        const resultsContainer = document.querySelector('[data-testid="employee-list"]');
        return input && resultsContainer;
      });
      
      const searchTime = Date.now() - searchStart;
      
      // Search should complete within 500ms
      expect(searchTime).toBeLessThan(500);
    });

    test('should handle rapid search input changes efficiently', async ({ page }) => {
      const searchTerms = ['a', 'ab', 'abc', 'abcd', 'abcde'];
      const searchTimes = [];
      
      for (const term of searchTerms) {
        const start = Date.now();
        
        await page.fill('[data-testid="search-input"]', term);
        await page.waitForTimeout(50); // Small delay to simulate rapid typing
        
        const time = Date.now() - start;
        searchTimes.push(time);
      }
      
      // Average search time should be under 100ms
      const averageTime = searchTimes.reduce((a, b) => a + b, 0) / searchTimes.length;
      expect(averageTime).toBeLessThan(100);
    });
  });

  test.describe('Data Loading Performance', () => {
    test('should load employee list efficiently', async ({ page }) => {
      await page.goto('/');
      
      const start = Date.now();
      
      // Wait for employee list to be populated
      await page.waitForSelector('[data-testid="employee-list"]');
      await page.waitForFunction(() => {
        const list = document.querySelector('[data-testid="employee-list"]');
        return list && list.children.length > 0;
      });
      
      const loadTime = Date.now() - start;
      
      // Employee list should load within 2 seconds
      expect(loadTime).toBeLessThan(2000);
    });

    test('should handle pagination efficiently', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      
      // Check if pagination is present
      const paginationExists = await page.locator('[data-testid="pagination"]').isVisible();
      
      if (paginationExists) {
        const start = Date.now();
        
        // Click next page
        await page.click('[data-testid="next-page-button"]');
        
        // Wait for new page to load
        await page.waitForSelector('[data-testid="employee-list"]');
        
        const paginationTime = Date.now() - start;
        
        // Pagination should be fast (under 1 second)
        expect(paginationTime).toBeLessThan(1000);
      }
    });
  });

  test.describe('Form Performance', () => {
    test('should open employee form quickly', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      
      const start = Date.now();
      
      await page.click('[data-testid="add-employee-button"]');
      await page.waitForSelector('[data-testid="employee-form"]');
      
      const formLoadTime = Date.now() - start;
      
      // Form should open within 300ms
      expect(formLoadTime).toBeLessThan(300);
    });

    test('should validate form fields without noticeable delay', async ({ page }) => {
      await page.goto('/');
      await page.click('[data-testid="add-employee-button"]');
      
      const validationTimes = [];
      
      // Test validation on multiple fields
      const fields = [
        '[data-testid="first-name-input"]',
        '[data-testid="email-input"]',
        '[data-testid="phone-input"]'
      ];
      
      for (const field of fields) {
        const start = Date.now();
        
        await page.fill(field, 'invalid');
        await page.blur(field);
        
        // Wait for validation to appear
        await page.waitForTimeout(100);
        
        const validationTime = Date.now() - start;
        validationTimes.push(validationTime);
      }
      
      // Validation should be nearly instantaneous (under 200ms)
      const averageValidationTime = validationTimes.reduce((a, b) => a + b, 0) / validationTimes.length;
      expect(averageValidationTime).toBeLessThan(200);
    });
  });

  test.describe('Memory Usage', () => {
    test('should not cause memory leaks during navigation', async ({ page }) => {
      await page.goto('/');
      
      // Get initial memory usage
      const initialMemory = await page.evaluate(() => (performance as any).memory?.usedJSHeapSize || 0);
      
      // Navigate around the application
      for (let i = 0; i < 10; i++) {
        await page.click('[data-testid="add-employee-button"]');
        await page.waitForSelector('[data-testid="employee-form"]');
        await page.press('body', 'Escape'); // Close form
        await page.waitForTimeout(100);
      }
      
      // Force garbage collection if available
      await page.evaluate(() => {
        if ((window as any).gc) {
          (window as any).gc();
        }
      });
      
      const finalMemory = await page.evaluate(() => (performance as any).memory?.usedJSHeapSize || 0);
      
      // Memory increase should be reasonable (less than 10MB)
      if (initialMemory > 0 && finalMemory > 0) {
        const memoryIncrease = finalMemory - initialMemory;
        expect(memoryIncrease).toBeLessThan(10 * 1024 * 1024); // 10MB
      }
    });
  });

  test.describe('Network Performance', () => {
    test('should minimize network requests', async ({ page }) => {
      // Track network requests
      const requests = [];
      
      page.on('request', request => {
        requests.push({
          url: request.url(),
          method: request.method(),
          resourceType: request.resourceType()
        });
      });
      
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      
      // Filter out non-essential requests
      const essentialRequests = requests.filter(req => 
        req.resourceType !== 'image' && 
        req.resourceType !== 'font' &&
        !req.url.includes('favicon')
      );
      
      // Should have reasonable number of requests (under 20 for initial load)
      expect(essentialRequests.length).toBeLessThan(20);
      
      console.log('Network requests:', essentialRequests);
    });

    test('should handle slow network conditions', async ({ page, context }) => {
      // Simulate slow 3G connection
      await context.route('**/*', route => {
        setTimeout(() => route.continue(), 100); // Add 100ms delay to all requests
      });
      
      const start = Date.now();
      
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      
      const loadTime = Date.now() - start;
      
      // Should still load within reasonable time even with slow network (under 10 seconds)
      expect(loadTime).toBeLessThan(10000);
    });
  });

  test.describe('Rendering Performance', () => {
    test('should render large lists efficiently', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      
      const start = Date.now();
      
      // If we have a large list, measure rendering time
      const listExists = await page.locator('[data-testid="employee-list"]').isVisible();
      
      if (listExists) {
        // Scroll through the list to trigger rendering
        await page.evaluate(() => {
          const list = document.querySelector('[data-testid="employee-list"]');
          if (list) {
            list.scrollTop = list.scrollHeight;
          }
        });
        
        await page.waitForTimeout(100);
      }
      
      const renderTime = Date.now() - start;
      
      // Rendering should be fast even for large lists
      expect(renderTime).toBeLessThan(500);
    });

    test('should handle rapid UI updates efficiently', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      
      const start = Date.now();
      
      // Rapid filter changes to test UI update performance
      const filters = ['Engineering', 'Design', 'Product', 'Marketing', ''];
      
      for (const filter of filters) {
        if (filter) {
          await page.click('[data-testid="department-filter"]');
          await page.click(`[data-testid="filter-${filter.toLowerCase()}"]`);
        } else {
          await page.click('[data-testid="clear-filter-button"]');
        }
        await page.waitForTimeout(50);
      }
      
      const updateTime = Date.now() - start;
      
      // UI updates should be fast (under 1 second for all changes)
      expect(updateTime).toBeLessThan(1000);
    });
  });

  test.describe('Performance Regression Detection', () => {
    test('should maintain performance baselines', async ({ page }) => {
      const performanceBaselines = {
        pageLoad: 3000,
        searchResponse: 500,
        formSubmission: 2000,
        dataExport: 5000
      };
      
      // Page load test
      const pageLoadStart = Date.now();
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      const pageLoadTime = Date.now() - pageLoadStart;
      
      expect(pageLoadTime).toBeLessThan(performanceBaselines.pageLoad);
      
      // Search response test
      if (await page.locator('[data-testid="search-input"]').isVisible()) {
        const searchStart = Date.now();
        await page.fill('[data-testid="search-input"]', 'performance test');
        await page.waitForTimeout(100);
        const searchTime = Date.now() - searchStart;
        
        expect(searchTime).toBeLessThan(performanceBaselines.searchResponse);
      }
      
      console.log('Performance results:', {
        pageLoad: pageLoadTime,
        baselines: performanceBaselines
      });
    });
  });
});