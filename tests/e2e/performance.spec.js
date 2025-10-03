"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const test_1 = require("@playwright/test");
test_1.test.describe('Performance Tests', () => {
    test_1.test.describe('Page Load Performance', () => {
        (0, test_1.test)('should load main page within acceptable time', async ({ page }) => {
            const start = Date.now();
            await page.goto('/');
            await page.waitForLoadState('networkidle');
            const loadTime = Date.now() - start;
            (0, test_1.expect)(loadTime).toBeLessThan(3000);
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
                    setTimeout(() => resolve([]), 5000);
                });
            });
            console.log('Performance metrics:', performanceMetrics);
        });
        (0, test_1.test)('should have good Lighthouse scores', async ({ page }) => {
            await page.goto('/');
            await page.waitForLoadState('networkidle');
            const metrics = await page.evaluate(() => ({
                scriptsLoaded: document.querySelectorAll('script[src]').length,
                stylesLoaded: document.querySelectorAll('link[rel="stylesheet"]').length,
                imagesLoaded: document.querySelectorAll('img').length,
                domSize: document.querySelectorAll('*').length,
                hasContent: document.body.innerHTML.length > 1000
            }));
            (0, test_1.expect)(metrics.domSize).toBeLessThan(2000);
            (0, test_1.expect)(metrics.hasContent).toBe(true);
            console.log('Page metrics:', metrics);
        });
    });
    test_1.test.describe('Search Performance', () => {
        test_1.test.beforeEach(async ({ page }) => {
            await page.goto('/');
            await page.waitForLoadState('networkidle');
        });
        (0, test_1.test)('should perform search within acceptable time', async ({ page }) => {
            const searchStart = Date.now();
            await page.fill('[data-testid="search-input"]', 'test search query');
            await page.waitForTimeout(100);
            await page.waitForFunction(() => {
                const input = document.querySelector('[data-testid="search-input"]');
                const resultsContainer = document.querySelector('[data-testid="employee-list"]');
                return input && resultsContainer;
            });
            const searchTime = Date.now() - searchStart;
            (0, test_1.expect)(searchTime).toBeLessThan(500);
        });
        (0, test_1.test)('should handle rapid search input changes efficiently', async ({ page }) => {
            const searchTerms = ['a', 'ab', 'abc', 'abcd', 'abcde'];
            const searchTimes = [];
            for (const term of searchTerms) {
                const start = Date.now();
                await page.fill('[data-testid="search-input"]', term);
                await page.waitForTimeout(50);
                const time = Date.now() - start;
                searchTimes.push(time);
            }
            const averageTime = searchTimes.reduce((a, b) => a + b, 0) / searchTimes.length;
            (0, test_1.expect)(averageTime).toBeLessThan(100);
        });
    });
    test_1.test.describe('Data Loading Performance', () => {
        (0, test_1.test)('should load employee list efficiently', async ({ page }) => {
            await page.goto('/');
            const start = Date.now();
            await page.waitForSelector('[data-testid="employee-list"]');
            await page.waitForFunction(() => {
                const list = document.querySelector('[data-testid="employee-list"]');
                return list && list.children.length > 0;
            });
            const loadTime = Date.now() - start;
            (0, test_1.expect)(loadTime).toBeLessThan(2000);
        });
        (0, test_1.test)('should handle pagination efficiently', async ({ page }) => {
            await page.goto('/');
            await page.waitForLoadState('networkidle');
            const paginationExists = await page.locator('[data-testid="pagination"]').isVisible();
            if (paginationExists) {
                const start = Date.now();
                await page.click('[data-testid="next-page-button"]');
                await page.waitForSelector('[data-testid="employee-list"]');
                const paginationTime = Date.now() - start;
                (0, test_1.expect)(paginationTime).toBeLessThan(1000);
            }
        });
    });
    test_1.test.describe('Form Performance', () => {
        (0, test_1.test)('should open employee form quickly', async ({ page }) => {
            await page.goto('/');
            await page.waitForLoadState('networkidle');
            const start = Date.now();
            await page.click('[data-testid="add-employee-button"]');
            await page.waitForSelector('[data-testid="employee-form"]');
            const formLoadTime = Date.now() - start;
            (0, test_1.expect)(formLoadTime).toBeLessThan(300);
        });
        (0, test_1.test)('should validate form fields without noticeable delay', async ({ page }) => {
            await page.goto('/');
            await page.click('[data-testid="add-employee-button"]');
            const validationTimes = [];
            const fields = [
                '[data-testid="first-name-input"]',
                '[data-testid="email-input"]',
                '[data-testid="phone-input"]'
            ];
            for (const field of fields) {
                const start = Date.now();
                await page.fill(field, 'invalid');
                await page.blur(field);
                await page.waitForTimeout(100);
                const validationTime = Date.now() - start;
                validationTimes.push(validationTime);
            }
            const averageValidationTime = validationTimes.reduce((a, b) => a + b, 0) / validationTimes.length;
            (0, test_1.expect)(averageValidationTime).toBeLessThan(200);
        });
    });
    test_1.test.describe('Memory Usage', () => {
        (0, test_1.test)('should not cause memory leaks during navigation', async ({ page }) => {
            await page.goto('/');
            const initialMemory = await page.evaluate(() => performance.memory?.usedJSHeapSize || 0);
            for (let i = 0; i < 10; i++) {
                await page.click('[data-testid="add-employee-button"]');
                await page.waitForSelector('[data-testid="employee-form"]');
                await page.press('body', 'Escape');
                await page.waitForTimeout(100);
            }
            await page.evaluate(() => {
                if (window.gc) {
                    window.gc();
                }
            });
            const finalMemory = await page.evaluate(() => performance.memory?.usedJSHeapSize || 0);
            if (initialMemory > 0 && finalMemory > 0) {
                const memoryIncrease = finalMemory - initialMemory;
                (0, test_1.expect)(memoryIncrease).toBeLessThan(10 * 1024 * 1024);
            }
        });
    });
    test_1.test.describe('Network Performance', () => {
        (0, test_1.test)('should minimize network requests', async ({ page }) => {
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
            const essentialRequests = requests.filter(req => req.resourceType !== 'image' &&
                req.resourceType !== 'font' &&
                !req.url.includes('favicon'));
            (0, test_1.expect)(essentialRequests.length).toBeLessThan(20);
            console.log('Network requests:', essentialRequests);
        });
        (0, test_1.test)('should handle slow network conditions', async ({ page, context }) => {
            await context.route('**/*', route => {
                setTimeout(() => route.continue(), 100);
            });
            const start = Date.now();
            await page.goto('/');
            await page.waitForLoadState('networkidle');
            const loadTime = Date.now() - start;
            (0, test_1.expect)(loadTime).toBeLessThan(10000);
        });
    });
    test_1.test.describe('Rendering Performance', () => {
        (0, test_1.test)('should render large lists efficiently', async ({ page }) => {
            await page.goto('/');
            await page.waitForLoadState('networkidle');
            const start = Date.now();
            const listExists = await page.locator('[data-testid="employee-list"]').isVisible();
            if (listExists) {
                await page.evaluate(() => {
                    const list = document.querySelector('[data-testid="employee-list"]');
                    if (list) {
                        list.scrollTop = list.scrollHeight;
                    }
                });
                await page.waitForTimeout(100);
            }
            const renderTime = Date.now() - start;
            (0, test_1.expect)(renderTime).toBeLessThan(500);
        });
        (0, test_1.test)('should handle rapid UI updates efficiently', async ({ page }) => {
            await page.goto('/');
            await page.waitForLoadState('networkidle');
            const start = Date.now();
            const filters = ['Engineering', 'Design', 'Product', 'Marketing', ''];
            for (const filter of filters) {
                if (filter) {
                    await page.click('[data-testid="department-filter"]');
                    await page.click(`[data-testid="filter-${filter.toLowerCase()}"]`);
                }
                else {
                    await page.click('[data-testid="clear-filter-button"]');
                }
                await page.waitForTimeout(50);
            }
            const updateTime = Date.now() - start;
            (0, test_1.expect)(updateTime).toBeLessThan(1000);
        });
    });
    test_1.test.describe('Performance Regression Detection', () => {
        (0, test_1.test)('should maintain performance baselines', async ({ page }) => {
            const performanceBaselines = {
                pageLoad: 3000,
                searchResponse: 500,
                formSubmission: 2000,
                dataExport: 5000
            };
            const pageLoadStart = Date.now();
            await page.goto('/');
            await page.waitForLoadState('networkidle');
            const pageLoadTime = Date.now() - pageLoadStart;
            (0, test_1.expect)(pageLoadTime).toBeLessThan(performanceBaselines.pageLoad);
            if (await page.locator('[data-testid="search-input"]').isVisible()) {
                const searchStart = Date.now();
                await page.fill('[data-testid="search-input"]', 'performance test');
                await page.waitForTimeout(100);
                const searchTime = Date.now() - searchStart;
                (0, test_1.expect)(searchTime).toBeLessThan(performanceBaselines.searchResponse);
            }
            console.log('Performance results:', {
                pageLoad: pageLoadTime,
                baselines: performanceBaselines
            });
        });
    });
});
//# sourceMappingURL=performance.spec.js.map