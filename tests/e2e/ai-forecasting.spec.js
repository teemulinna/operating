"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const test_1 = require("@playwright/test");
test_1.test.describe('AI Forecasting Features', () => {
    test_1.test.beforeEach(async ({ page }) => {
        await page.goto('http://localhost:3003/');
        await page.waitForLoadState('networkidle');
        await loginIfNeeded(page);
        await page.click('[data-testid="navigation-forecasting"]');
        await (0, test_1.expect)(page).toHaveURL(/.*forecasting/);
    });
    test_1.test.describe('Demand Forecasting Workflow', () => {
        (0, test_1.test)('should generate weekly demand forecast with real data', async ({ page }) => {
            await page.click('[data-testid="demand-forecasting-tab"]');
            await (0, test_1.expect)(page.locator('h1')).toContainText('Resource Demand Forecasting');
            await page.selectOption('[data-testid="forecast-timeframe"]', 'weekly');
            await page.check('[data-testid="include-seasonality"]');
            await page.check('[data-testid="include-trends"]');
            await page.click('[data-testid="skill-categories-select"]');
            await page.check('[data-testid="skill-category-frontend"]');
            await page.check('[data-testid="skill-category-backend"]');
            await page.check('[data-testid="skill-category-fullstack"]');
            await page.click('[data-testid="skill-categories-apply"]');
            await page.click('[data-testid="departments-select"]');
            await page.check('[data-testid="department-engineering"]');
            await page.check('[data-testid="department-data-science"]');
            await page.click('[data-testid="departments-apply"]');
            await page.fill('[data-testid="confidence-level"]', '95');
            await page.click('[data-testid="generate-forecast"]');
            await (0, test_1.expect)(page.locator('[data-testid="forecast-loading"]')).toBeVisible();
            await (0, test_1.expect)(page.locator('[data-testid="forecast-loading"]')).not.toBeVisible({ timeout: 30000 });
            await (0, test_1.expect)(page.locator('[data-testid="forecast-results"]')).toBeVisible();
            await (0, test_1.expect)(page.locator('[data-testid="forecast-id"]')).toContainText(/forecast_\d+/);
            await (0, test_1.expect)(page.locator('[data-testid="forecast-timeframe"]')).toContainText('weekly');
            await (0, test_1.expect)(page.locator('[data-testid="skill-forecasts-table"]')).toBeVisible();
            const skillRows = page.locator('[data-testid="skill-forecast-row"]');
            await (0, test_1.expect)(skillRows).toHaveCountGreaterThan(0);
            const firstSkillRow = skillRows.first();
            await (0, test_1.expect)(firstSkillRow.locator('[data-testid="skill-name"]')).not.toBeEmpty();
            await (0, test_1.expect)(firstSkillRow.locator('[data-testid="current-demand"]')).toContainText(/\d+/);
            await (0, test_1.expect)(firstSkillRow.locator('[data-testid="predicted-demand"]')).toContainText(/\d+/);
            await (0, test_1.expect)(firstSkillRow.locator('[data-testid="demand-change"]')).toContainText(/%/);
            await (0, test_1.expect)(firstSkillRow.locator('[data-testid="trend-indicator"]')).toHaveClass(/trend-(increasing|decreasing|stable|volatile)/);
            await (0, test_1.expect)(firstSkillRow.locator('[data-testid="confidence-interval"]')).toContainText(/\d+ - \d+/);
            await (0, test_1.expect)(page.locator('[data-testid="total-current-demand"]')).toContainText(/\d+/);
            await (0, test_1.expect)(page.locator('[data-testid="total-predicted-demand"]')).toContainText(/\d+/);
            await (0, test_1.expect)(page.locator('[data-testid="overall-growth-rate"]')).toContainText(/%/);
            await (0, test_1.expect)(page.locator('[data-testid="model-accuracy"]')).toContainText(/\d+%/);
            await (0, test_1.expect)(page.locator('[data-testid="forecast-reliability"]')).toContainText(/(high|medium|low)/);
            await (0, test_1.expect)(page.locator('[data-testid="confidence-chart"]')).toBeVisible();
            const overallConfidence = await page.locator('[data-testid="overall-confidence"]').textContent();
            (0, test_1.expect)(parseInt(overallConfidence || '0')).toBeGreaterThan(0);
            (0, test_1.expect)(parseInt(overallConfidence || '100')).toBeLessThanOrEqual(100);
        });
        (0, test_1.test)('should generate and compare multiple forecast scenarios', async ({ page }) => {
            await page.click('[data-testid="scenario-forecasting-tab"]');
            await (0, test_1.expect)(page.locator('h2')).toContainText('Scenario Forecasting');
            await page.click('[data-testid="add-scenario"]');
            await page.fill('[data-testid="scenario-name-0"]', 'Optimistic Growth');
            await page.fill('[data-testid="scenario-description-0"]', 'High market demand with aggressive expansion');
            await page.fill('[data-testid="growth-rate-0"]', '25');
            await page.selectOption('[data-testid="market-conditions-0"]', 'optimistic');
            await page.fill('[data-testid="budget-constraints-0"]', '1000000');
            await page.click('[data-testid="add-scenario"]');
            await page.fill('[data-testid="scenario-name-1"]', 'Conservative Plan');
            await page.fill('[data-testid="scenario-description-1"]', 'Steady growth with risk-averse approach');
            await page.fill('[data-testid="growth-rate-1"]', '5');
            await page.selectOption('[data-testid="market-conditions-1"]', 'realistic');
            await page.fill('[data-testid="budget-constraints-1"]', '500000');
            await page.click('[data-testid="add-scenario"]');
            await page.fill('[data-testid="scenario-name-2"]', 'Economic Downturn');
            await page.fill('[data-testid="scenario-description-2"]', 'Reduced demand with cost-cutting measures');
            await page.fill('[data-testid="growth-rate-2"]', '-10');
            await page.selectOption('[data-testid="market-conditions-2"]', 'pessimistic');
            await page.fill('[data-testid="budget-constraints-2"]', '200000');
            await page.click('[data-testid="generate-scenario-forecasts"]');
            await (0, test_1.expect)(page.locator('[data-testid="scenario-loading"]')).toBeVisible();
            await (0, test_1.expect)(page.locator('[data-testid="scenario-loading"]')).not.toBeVisible({ timeout: 45000 });
            await (0, test_1.expect)(page.locator('[data-testid="scenario-results"]')).toBeVisible();
            await (0, test_1.expect)(page.locator('[data-testid="scenario-optimistic-growth"]')).toBeVisible();
            await (0, test_1.expect)(page.locator('[data-testid="scenario-conservative-plan"]')).toBeVisible();
            await (0, test_1.expect)(page.locator('[data-testid="scenario-economic-downturn"]')).toBeVisible();
            await (0, test_1.expect)(page.locator('[data-testid="scenario-comparison-chart"]')).toBeVisible();
            const optimisticDemand = await page.locator('[data-testid="optimistic-total-demand"]').textContent();
            const pessimisticDemand = await page.locator('[data-testid="pessimistic-total-demand"]').textContent();
            (0, test_1.expect)(parseInt(optimisticDemand || '0')).toBeGreaterThan(parseInt(pessimisticDemand || '0'));
            await (0, test_1.expect)(page.locator('[data-testid="scenario-recommendations"]')).toBeVisible();
            const recommendations = page.locator('[data-testid="scenario-recommendation"]');
            await (0, test_1.expect)(recommendations).toHaveCountGreaterThan(0);
            const firstRecommendation = recommendations.first();
            await (0, test_1.expect)(firstRecommendation.locator('[data-testid="recommendation-title"]')).not.toBeEmpty();
            await (0, test_1.expect)(firstRecommendation.locator('[data-testid="recommendation-description"]')).not.toBeEmpty();
            await (0, test_1.expect)(firstRecommendation.locator('[data-testid="recommendation-priority"]')).toContainText(/(low|medium|high|critical)/);
        });
        (0, test_1.test)('should handle pipeline-based resource demand forecasting', async ({ page }) => {
            await page.click('[data-testid="pipeline-forecasting-tab"]');
            await (0, test_1.expect)(page.locator('h2')).toContainText('Pipeline Resource Forecasting');
            await page.fill('[data-testid="probability-threshold"]', '70');
            await page.click('[data-testid="client-types-select"]');
            await page.check('[data-testid="client-type-enterprise"]');
            await page.check('[data-testid="client-type-smb"]');
            await page.click('[data-testid="client-types-apply"]');
            await page.click('[data-testid="project-types-select"]');
            await page.check('[data-testid="project-type-web-development"]');
            await page.check('[data-testid="project-type-mobile-app"]');
            await page.click('[data-testid="project-types-apply"]');
            await page.fill('[data-testid="budget-min"]', '50000');
            await page.fill('[data-testid="budget-max"]', '500000');
            const futureDate = new Date();
            futureDate.setMonth(futureDate.getMonth() + 6);
            await page.fill('[data-testid="time-range-start"]', new Date().toISOString().split('T')[0]);
            await page.fill('[data-testid="time-range-end"]', futureDate.toISOString().split('T')[0]);
            await page.click('[data-testid="generate-pipeline-forecast"]');
            await (0, test_1.expect)(page.locator('[data-testid="pipeline-loading"]')).toBeVisible();
            await (0, test_1.expect)(page.locator('[data-testid="pipeline-loading"]')).not.toBeVisible({ timeout: 30000 });
            await (0, test_1.expect)(page.locator('[data-testid="pipeline-results"]')).toBeVisible();
            await (0, test_1.expect)(page.locator('[data-testid="aggregated-demand-table"]')).toBeVisible();
            const demandRows = page.locator('[data-testid="aggregated-demand-row"]');
            await (0, test_1.expect)(demandRows).toHaveCountGreaterThan(0);
            const firstDemandRow = demandRows.first();
            await (0, test_1.expect)(firstDemandRow.locator('[data-testid="skill-name"]')).not.toBeEmpty();
            await (0, test_1.expect)(firstDemandRow.locator('[data-testid="current-demand"]')).toContainText(/\d+/);
            await (0, test_1.expect)(firstDemandRow.locator('[data-testid="forecasted-demand"]')).toContainText(/\d+/);
            await (0, test_1.expect)(firstDemandRow.locator('[data-testid="trend-direction"]')).toContainText(/(increasing|decreasing|stable|volatile)/);
            await (0, test_1.expect)(page.locator('[data-testid="capacity-requirements"]')).toBeVisible();
            const capacityItems = page.locator('[data-testid="capacity-requirement-item"]');
            await (0, test_1.expect)(capacityItems).toHaveCountGreaterThanOrEqual(0);
            await (0, test_1.expect)(page.locator('[data-testid="pipeline-risk-assessment"]')).toBeVisible();
            await (0, test_1.expect)(page.locator('[data-testid="overall-risk-level"]')).toContainText(/(low|medium|high|critical)/);
            const riskFactors = page.locator('[data-testid="risk-factor"]');
            riskFactors.forEach(async (factor) => {
                await (0, test_1.expect)(factor.locator('[data-testid="risk-description"]')).not.toBeEmpty();
                await (0, test_1.expect)(factor.locator('[data-testid="risk-probability"]')).toContainText(/\d+%/);
                await (0, test_1.expect)(factor.locator('[data-testid="risk-impact"]')).not.toBeEmpty();
            });
        });
        (0, test_1.test)('should update forecasts with real-time data', async ({ page }) => {
            await page.click('[data-testid="demand-forecasting-tab"]');
            await page.selectOption('[data-testid="forecast-timeframe"]', 'monthly');
            await page.click('[data-testid="generate-forecast"]');
            await (0, test_1.expect)(page.locator('[data-testid="forecast-loading"]')).not.toBeVisible({ timeout: 30000 });
            const initialForecastId = await page.locator('[data-testid="forecast-id"]').textContent();
            (0, test_1.expect)(initialForecastId).toBeTruthy();
            await page.click('[data-testid="realtime-updates-tab"]');
            await (0, test_1.expect)(page.locator('h2')).toContainText('Real-Time Forecast Updates');
            await page.click('[data-testid="add-realtime-change"]');
            await page.selectOption('[data-testid="change-type-0"]', 'new_project');
            await page.fill('[data-testid="project-name-0"]', 'Emergency Frontend Project');
            await page.fill('[data-testid="team-size-0"]', '3');
            await page.fill('[data-testid="project-duration-0"]', '8');
            await page.click('[data-testid="add-required-skill-0"]');
            await page.selectOption('[data-testid="required-skill-0-0"]', 'React');
            await page.selectOption('[data-testid="required-skill-0-1"]', 'TypeScript');
            await page.click('[data-testid="add-realtime-change"]');
            await page.selectOption('[data-testid="change-type-1"]', 'resource_change');
            await page.selectOption('[data-testid="change-subtype-1"]', 'new_hire');
            await page.selectOption('[data-testid="skill-id-1"]', 'React');
            await page.fill('[data-testid="capacity-change-1"]', '160');
            await page.click('[data-testid="add-realtime-change"]');
            await page.selectOption('[data-testid="change-type-2"]', 'market_indicator');
            await page.fill('[data-testid="indicator-name-2"]', 'frontend_demand_spike');
            await page.fill('[data-testid="indicator-value-2"]', '1.2');
            await page.fill('[data-testid="indicator-source-2"]', 'market_analysis');
            await page.fill('[data-testid="forecast-id-to-update"]', initialForecastId || '');
            await page.click('[data-testid="update-forecast-realtime"]');
            await (0, test_1.expect)(page.locator('[data-testid="realtime-update-loading"]')).toBeVisible();
            await (0, test_1.expect)(page.locator('[data-testid="realtime-update-loading"]')).not.toBeVisible({ timeout: 30000 });
            await (0, test_1.expect)(page.locator('[data-testid="updated-forecast-results"]')).toBeVisible();
            const updatedForecastDate = await page.locator('[data-testid="updated-forecast-date"]').textContent();
            (0, test_1.expect)(new Date(updatedForecastDate || '')).toBeInstanceOf(Date);
            const frontendSkillRow = page.locator('[data-testid="skill-forecast-row"]').filter({ hasText: 'React' }).first();
            if (await frontendSkillRow.count() > 0) {
                const predictedDemand = await frontendSkillRow.locator('[data-testid="predicted-demand"]').textContent();
                (0, test_1.expect)(parseInt(predictedDemand || '0')).toBeGreaterThan(0);
            }
            await (0, test_1.expect)(page.locator('[data-testid="change-impact-summary"]')).toBeVisible();
            await (0, test_1.expect)(page.locator('[data-testid="demand-impact"]')).toContainText(/\d+/);
            await (0, test_1.expect)(page.locator('[data-testid="capacity-impact"]')).toContainText(/\d+/);
        });
    });
    test_1.test.describe('Forecast Analysis and Validation', () => {
        (0, test_1.test)('should evaluate forecast accuracy against historical data', async ({ page }) => {
            await page.click('[data-testid="forecast-validation-tab"]');
            await (0, test_1.expect)(page.locator('h2')).toContainText('Forecast Accuracy Analysis');
            await page.click('[data-testid="select-historical-forecast"]');
            const historicalForecasts = page.locator('[data-testid="historical-forecast-option"]');
            await (0, test_1.expect)(historicalForecasts).toHaveCountGreaterThan(0);
            await historicalForecasts.first().click();
            await page.click('[data-testid="input-actual-data"]');
            await page.click('[data-testid="add-skill-actual"]');
            await page.selectOption('[data-testid="actual-skill-0"]', 'JavaScript');
            await page.fill('[data-testid="actual-value-0"]', '150');
            await page.fill('[data-testid="actual-date-0"]', '2024-01-01');
            await page.click('[data-testid="add-skill-actual"]');
            await page.selectOption('[data-testid="actual-skill-1"]', 'React');
            await page.fill('[data-testid="actual-value-1"]', '120');
            await page.fill('[data-testid="actual-date-1"]', '2024-01-01');
            await page.click('[data-testid="add-dept-actual"]');
            await page.selectOption('[data-testid="actual-dept-0"]', 'Engineering');
            await page.fill('[data-testid="actual-utilization-0"]', '85');
            await page.fill('[data-testid="actual-dept-date-0"]', '2024-01-01');
            await page.click('[data-testid="evaluate-forecast-accuracy"]');
            await (0, test_1.expect)(page.locator('[data-testid="accuracy-loading"]')).toBeVisible();
            await (0, test_1.expect)(page.locator('[data-testid="accuracy-loading"]')).not.toBeVisible({ timeout: 20000 });
            await (0, test_1.expect)(page.locator('[data-testid="accuracy-results"]')).toBeVisible();
            const overallAccuracy = await page.locator('[data-testid="overall-accuracy"]').textContent();
            (0, test_1.expect)(parseInt(overallAccuracy?.replace('%', '') || '0')).toBeGreaterThan(0);
            (0, test_1.expect)(parseInt(overallAccuracy?.replace('%', '') || '100')).toBeLessThanOrEqual(100);
            await (0, test_1.expect)(page.locator('[data-testid="mae-value"]')).toContainText(/\d+/);
            await (0, test_1.expect)(page.locator('[data-testid="rmse-value"]')).toContainText(/\d+/);
            await (0, test_1.expect)(page.locator('[data-testid="mape-value"]')).toContainText(/\d+%/);
            await (0, test_1.expect)(page.locator('[data-testid="skill-accuracies-table"]')).toBeVisible();
            const skillAccuracyRows = page.locator('[data-testid="skill-accuracy-row"]');
            await (0, test_1.expect)(skillAccuracyRows).toHaveCountGreaterThan(0);
            const firstSkillAccuracy = skillAccuracyRows.first();
            await (0, test_1.expect)(firstSkillAccuracy.locator('[data-testid="skill-name"]')).not.toBeEmpty();
            await (0, test_1.expect)(firstSkillAccuracy.locator('[data-testid="skill-accuracy"]')).toContainText(/\d+%/);
            await (0, test_1.expect)(page.locator('[data-testid="improvement-suggestions"]')).toBeVisible();
            const suggestions = page.locator('[data-testid="improvement-suggestion"]');
            suggestions.forEach(async (suggestion) => {
                await (0, test_1.expect)(suggestion).not.toBeEmpty();
            });
        });
        (0, test_1.test)('should display forecast uncertainty and confidence bounds', async ({ page }) => {
            await page.click('[data-testid="demand-forecasting-tab"]');
            await page.selectOption('[data-testid="forecast-timeframe"]', 'quarterly');
            await page.check('[data-testid="include-seasonality"]');
            await page.click('[data-testid="generate-forecast"]');
            await (0, test_1.expect)(page.locator('[data-testid="forecast-loading"]')).not.toBeVisible({ timeout: 30000 });
            await page.click('[data-testid="uncertainty-analysis-tab"]');
            await (0, test_1.expect)(page.locator('h3')).toContainText('Forecast Uncertainty Analysis');
            await (0, test_1.expect)(page.locator('[data-testid="confidence-intervals-chart"]')).toBeVisible();
            const skillConfidenceRows = page.locator('[data-testid="skill-confidence-row"]');
            await (0, test_1.expect)(skillConfidenceRows).toHaveCountGreaterThan(0);
            skillConfidenceRows.forEach(async (row) => {
                const lowerBound = await row.locator('[data-testid="confidence-lower"]').textContent();
                const upperBound = await row.locator('[data-testid="confidence-upper"]').textContent();
                const predicted = await row.locator('[data-testid="predicted-value"]').textContent();
                (0, test_1.expect)(parseInt(lowerBound || '0')).toBeLessThanOrEqual(parseInt(predicted || '0'));
                (0, test_1.expect)(parseInt(predicted || '0')).toBeLessThanOrEqual(parseInt(upperBound || '0'));
            });
            await (0, test_1.expect)(page.locator('[data-testid="uncertainty-factors"]')).toBeVisible();
            const uncertaintyFactors = page.locator('[data-testid="uncertainty-factor"]');
            uncertaintyFactors.forEach(async (factor) => {
                await (0, test_1.expect)(factor.locator('[data-testid="factor-name"]')).not.toBeEmpty();
                await (0, test_1.expect)(factor.locator('[data-testid="factor-impact"]')).toContainText(/\d+%/);
                await (0, test_1.expect)(factor.locator('[data-testid="factor-description"]')).not.toBeEmpty();
            });
            await (0, test_1.expect)(page.locator('[data-testid="forecast-risks"]')).toBeVisible();
            const riskIndicators = page.locator('[data-testid="risk-indicator"]');
            riskIndicators.forEach(async (indicator) => {
                await (0, test_1.expect)(indicator.locator('[data-testid="risk-type"]')).toContainText(/(market|technology|seasonal|economic|competitive)/);
                await (0, test_1.expect)(indicator.locator('[data-testid="risk-probability"]')).toContainText(/\d+%/);
                await (0, test_1.expect)(indicator.locator('[data-testid="risk-impact"]')).not.toBeEmpty();
            });
        });
        (0, test_1.test)('should export forecast results in multiple formats', async ({ page }) => {
            await page.click('[data-testid="demand-forecasting-tab"]');
            await page.selectOption('[data-testid="forecast-timeframe"]', 'monthly');
            await page.click('[data-testid="generate-forecast"]');
            await (0, test_1.expect)(page.locator('[data-testid="forecast-loading"]')).not.toBeVisible({ timeout: 30000 });
            const [csvDownload] = await Promise.all([
                page.waitForEvent('download'),
                page.click('[data-testid="export-csv"]')
            ]);
            (0, test_1.expect)(csvDownload.suggestedFilename()).toMatch(/forecast.*\.csv$/);
            await csvDownload.saveAs(`./test-results/${csvDownload.suggestedFilename()}`);
            const [excelDownload] = await Promise.all([
                page.waitForEvent('download'),
                page.click('[data-testid="export-excel"]')
            ]);
            (0, test_1.expect)(excelDownload.suggestedFilename()).toMatch(/forecast.*\.xlsx$/);
            await excelDownload.saveAs(`./test-results/${excelDownload.suggestedFilename()}`);
            const [pdfDownload] = await Promise.all([
                page.waitForEvent('download'),
                page.click('[data-testid="export-pdf"]')
            ]);
            (0, test_1.expect)(pdfDownload.suggestedFilename()).toMatch(/forecast.*\.pdf$/);
            await pdfDownload.saveAs(`./test-results/${pdfDownload.suggestedFilename()}`);
            const [jsonDownload] = await Promise.all([
                page.waitForEvent('download'),
                page.click('[data-testid="export-json"]')
            ]);
            (0, test_1.expect)(jsonDownload.suggestedFilename()).toMatch(/forecast.*\.json$/);
            await jsonDownload.saveAs(`./test-results/${jsonDownload.suggestedFilename()}`);
            await (0, test_1.expect)(page.locator('[data-testid="export-options"]')).toBeVisible();
            await (0, test_1.expect)(page.locator('[data-testid="export-csv"]')).toBeEnabled();
            await (0, test_1.expect)(page.locator('[data-testid="export-excel"]')).toBeEnabled();
            await (0, test_1.expect)(page.locator('[data-testid="export-pdf"]')).toBeEnabled();
            await (0, test_1.expect)(page.locator('[data-testid="export-json"]')).toBeEnabled();
        });
    });
    test_1.test.describe('Error Handling and Edge Cases', () => {
        (0, test_1.test)('should handle forecast generation failures gracefully', async ({ page }) => {
            await page.click('[data-testid="demand-forecasting-tab"]');
            await page.selectOption('[data-testid="forecast-timeframe"]', 'weekly');
            await page.fill('[data-testid="confidence-level"]', '150');
            await page.click('[data-testid="generate-forecast"]');
            await (0, test_1.expect)(page.locator('[data-testid="validation-error"]')).toBeVisible();
            await (0, test_1.expect)(page.locator('[data-testid="validation-error"]')).toContainText(/confidence level must be between/i);
            await page.fill('[data-testid="confidence-level"]', '95');
            await page.route('**/api/forecasting/demand', async (route) => {
                await route.fulfill({
                    status: 500,
                    body: JSON.stringify({ error: 'Internal server error' })
                });
            });
            await page.click('[data-testid="generate-forecast"]');
            await (0, test_1.expect)(page.locator('[data-testid="forecast-error"]')).toBeVisible();
            await (0, test_1.expect)(page.locator('[data-testid="forecast-error"]')).toContainText(/failed to generate forecast/i);
            await (0, test_1.expect)(page.locator('[data-testid="retry-forecast"]')).toBeVisible();
            await (0, test_1.expect)(page.locator('[data-testid="retry-forecast"]')).toBeEnabled();
        });
        (0, test_1.test)('should handle empty or insufficient data scenarios', async ({ page }) => {
            await page.route('**/api/forecasting/demand', async (route) => {
                await route.fulfill({
                    status: 200,
                    body: JSON.stringify({
                        forecastId: 'empty-data-test',
                        skillDemandForecasts: [],
                        overallMetrics: {
                            totalCurrentDemand: 0,
                            totalPredictedDemand: 0,
                            overallGrowthRate: 0,
                            modelAccuracy: 0.5,
                            forecastReliability: 'low'
                        },
                        confidence: { overall: 30 }
                    })
                });
            });
            await page.click('[data-testid="demand-forecasting-tab"]');
            await page.click('[data-testid="generate-forecast"]');
            await (0, test_1.expect)(page.locator('[data-testid="forecast-loading"]')).not.toBeVisible({ timeout: 10000 });
            await (0, test_1.expect)(page.locator('[data-testid="insufficient-data-warning"]')).toBeVisible();
            await (0, test_1.expect)(page.locator('[data-testid="insufficient-data-warning"]')).toContainText(/insufficient historical data/i);
            await (0, test_1.expect)(page.locator('[data-testid="data-improvement-suggestions"]')).toBeVisible();
            const suggestions = page.locator('[data-testid="data-suggestion"]');
            await (0, test_1.expect)(suggestions).toHaveCountGreaterThan(0);
        });
        (0, test_1.test)('should handle network connectivity issues', async ({ page }) => {
            await page.click('[data-testid="demand-forecasting-tab"]');
            await page.setOffline(true);
            await page.click('[data-testid="generate-forecast"]');
            await (0, test_1.expect)(page.locator('[data-testid="network-error"]')).toBeVisible();
            await (0, test_1.expect)(page.locator('[data-testid="network-error"]')).toContainText(/network error|connection failed/i);
            await (0, test_1.expect)(page.locator('[data-testid="offline-indicator"]')).toBeVisible();
            await page.setOffline(false);
            await (0, test_1.expect)(page.locator('[data-testid="network-restored"]')).toBeVisible({ timeout: 5000 });
            await (0, test_1.expect)(page.locator('[data-testid="retry-online"]')).toBeVisible();
        });
    });
});
async function loginIfNeeded(page) {
    const isLoggedIn = await page.locator('[data-testid="user-profile"]').isVisible();
    if (!isLoggedIn) {
        const loginButton = page.locator('[data-testid="login-button"]');
        if (await loginButton.isVisible()) {
            await loginButton.click();
            await page.fill('[data-testid="email-input"]', 'test@example.com');
            await page.fill('[data-testid="password-input"]', 'testpassword');
            await page.click('[data-testid="submit-login"]');
            await (0, test_1.expect)(page.locator('[data-testid="user-profile"]')).toBeVisible();
        }
    }
}
//# sourceMappingURL=ai-forecasting.spec.js.map