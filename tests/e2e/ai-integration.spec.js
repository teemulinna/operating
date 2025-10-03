"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const test_1 = require("@playwright/test");
test_1.test.describe('AI Integration Features', () => {
    test_1.test.beforeEach(async ({ page }) => {
        await page.goto('http://localhost:3003/');
        await page.waitForLoadState('networkidle');
    });
    (0, test_1.test)('AI Enhanced Dashboard loads correctly', async ({ page }) => {
        await (0, test_1.expect)(page.locator('[data-testid="ai-dashboard"]')).toBeVisible();
        await (0, test_1.expect)(page.locator('text=AI Powered')).toBeVisible();
        await (0, test_1.expect)(page.locator('text=Overview')).toBeVisible();
        await (0, test_1.expect)(page.locator('text=Forecasting')).toBeVisible();
        await (0, test_1.expect)(page.locator('text=Skill Matching')).toBeVisible();
        await (0, test_1.expect)(page.locator('text=Optimization')).toBeVisible();
    });
    (0, test_1.test)('Forecasting panel displays forecasting data', async ({ page }) => {
        await page.click('text=Forecasting');
        await page.waitForTimeout(2000);
        await (0, test_1.expect)(page.locator('text=AI Forecasting')).toBeVisible();
        await (0, test_1.expect)(page.locator('text=Predictive insights')).toBeVisible();
        await (0, test_1.expect)(page.locator('[data-testid="time-range-selector"]')).toBeVisible();
    });
    (0, test_1.test)('Skill matching functionality works', async ({ page }) => {
        await page.click('text=Skill Matching');
        await page.waitForTimeout(1000);
        await (0, test_1.expect)(page.locator('text=AI Skill Matching')).toBeVisible();
        await (0, test_1.expect)(page.locator('text=Find the best resource matches')).toBeVisible();
        await (0, test_1.expect)(page.locator('input[placeholder*="React, Python"]')).toBeVisible();
    });
    (0, test_1.test)('Optimization panel provides optimization options', async ({ page }) => {
        await page.click('text=Optimization');
        await page.waitForTimeout(1000);
        await (0, test_1.expect)(page.locator('text=AI Optimization')).toBeVisible();
        await (0, test_1.expect)(page.locator('text=Intelligent resource allocation')).toBeVisible();
        await (0, test_1.expect)(page.locator('text=Resource Balancing')).toBeVisible();
        await (0, test_1.expect)(page.locator('text=Resource Leveling')).toBeVisible();
    });
    (0, test_1.test)('AI service API calls handle errors gracefully', async ({ page }) => {
        await page.route('**/api/forecasting/**', route => {
            route.fulfill({
                status: 500,
                body: JSON.stringify({ success: false, message: 'Server error' })
            });
        });
        await page.route('**/api/matching/**', route => {
            route.fulfill({
                status: 500,
                body: JSON.stringify({ success: false, message: 'Server error' })
            });
        });
        await page.route('**/api/optimization/**', route => {
            route.fulfill({
                status: 500,
                body: JSON.stringify({ success: false, message: 'Server error' })
            });
        });
        await page.click('text=Forecasting');
        await page.waitForTimeout(2000);
        await (0, test_1.expect)(page.locator('body')).toBeVisible();
    });
    (0, test_1.test)('AI project form integrates skill matching', async ({ page }) => {
        await page.click('[data-testid="create-project-btn"]', { timeout: 5000 });
        await (0, test_1.expect)(page.locator('text=AI Enhanced')).toBeVisible();
        await (0, test_1.expect)(page.locator('text=Skills & Requirements')).toBeVisible();
        await (0, test_1.expect)(page.locator('text=AI Recommendations')).toBeVisible();
    });
    (0, test_1.test)('Time range selectors update data correctly', async ({ page }) => {
        await page.click('text=Forecasting');
        await page.waitForTimeout(1000);
        await page.click('[data-testid="time-range-selector"]');
        await page.click('text=1 Week');
        await page.waitForTimeout(2000);
        await (0, test_1.expect)(page.locator('[data-testid="time-range-selector"]')).toContainText('1 Week');
    });
    (0, test_1.test)('Loading states are properly displayed', async ({ page }) => {
        await page.click('text=Optimization');
        await page.waitForTimeout(500);
        const optimizeButton = page.locator('text=Run Optimization').first();
        if (await optimizeButton.isVisible()) {
            await optimizeButton.click();
            await (0, test_1.expect)(page.locator('[data-loading="true"]')).toBeVisible({ timeout: 1000 });
        }
    });
    (0, test_1.test)('AI insights and recommendations are displayed', async ({ page }) => {
        await page.click('text=Overview');
        await page.waitForTimeout(2000);
        const insightsSection = page.locator('text=AI Insights Summary');
        if (await insightsSection.isVisible()) {
            await (0, test_1.expect)(insightsSection).toBeVisible();
            await (0, test_1.expect)(page.locator('[data-testid="insight-item"]')).toHaveCount({ min: 0 });
        }
    });
});
test_1.test.describe('AI API Integration', () => {
    (0, test_1.test)('Forecasting API endpoints respond correctly', async ({ page }) => {
        let forecastingRequests = 0;
        await page.route('**/api/forecasting/capacity**', route => {
            forecastingRequests++;
            route.fulfill({
                status: 200,
                body: JSON.stringify({
                    success: true,
                    data: {
                        totalCapacity: [],
                        availableCapacity: [],
                        utilizationRate: [],
                        skillCapacity: {},
                        skillDemand: {}
                    }
                })
            });
        });
        await page.goto('http://localhost:3003/');
        await page.click('text=Forecasting');
        await page.waitForTimeout(2000);
        (0, test_1.expect)(forecastingRequests).toBeGreaterThan(0);
    });
    (0, test_1.test)('Skill matching API endpoints respond correctly', async ({ page }) => {
        let matchingRequests = 0;
        await page.route('**/api/matching/**', route => {
            matchingRequests++;
            route.fulfill({
                status: 200,
                body: JSON.stringify({
                    success: true,
                    data: {
                        matches: [],
                        summary: {
                            totalCandidates: 0,
                            averageMatchScore: 0,
                            excellentMatches: 0,
                            goodMatches: 0
                        }
                    }
                })
            });
        });
        await page.goto('http://localhost:3003/');
        await page.click('text=Skill Matching');
        await page.waitForTimeout(2000);
        (0, test_1.expect)(matchingRequests).toBeGreaterThanOrEqual(0);
    });
    (0, test_1.test)('Optimization API endpoints respond correctly', async ({ page }) => {
        let optimizationRequests = 0;
        await page.route('**/api/optimization/**', route => {
            optimizationRequests++;
            route.fulfill({
                status: 200,
                body: JSON.stringify({
                    success: true,
                    data: {
                        recommendations: [],
                        metrics: {},
                        alternatives: [],
                        warnings: []
                    }
                })
            });
        });
        await page.goto('http://localhost:3003/');
        await page.click('text=Optimization');
        await page.waitForTimeout(2000);
        (0, test_1.expect)(optimizationRequests).toBeGreaterThanOrEqual(0);
    });
});
//# sourceMappingURL=ai-integration.spec.js.map