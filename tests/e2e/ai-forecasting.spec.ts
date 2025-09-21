/**
 * End-to-End Tests for AI Forecasting UI Workflow
 * Tests complete user journeys for AI-powered resource forecasting features
 */

import { test, expect, Page } from '@playwright/test';

test.describe('AI Forecasting Features', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the application and ensure it's loaded
    await page.goto('http://localhost:3003/');
    await page.waitForLoadState('networkidle');
    
    // Login if required (assumes test user exists)
    await loginIfNeeded(page);
    
    // Navigate to forecasting section
    await page.click('[data-testid="navigation-forecasting"]');
    await expect(page).toHaveURL(/.*forecasting/);
  });

  test.describe('Demand Forecasting Workflow', () => {
    test('should generate weekly demand forecast with real data', async ({ page }) => {
      // Navigate to demand forecasting page
      await page.click('[data-testid="demand-forecasting-tab"]');
      await expect(page.locator('h1')).toContainText('Resource Demand Forecasting');

      // Configure forecast parameters
      await page.selectOption('[data-testid="forecast-timeframe"]', 'weekly');
      await page.check('[data-testid="include-seasonality"]');
      await page.check('[data-testid="include-trends"]');
      
      // Select skill categories
      await page.click('[data-testid="skill-categories-select"]');
      await page.check('[data-testid="skill-category-frontend"]');
      await page.check('[data-testid="skill-category-backend"]');
      await page.check('[data-testid="skill-category-fullstack"]');
      await page.click('[data-testid="skill-categories-apply"]');

      // Select departments
      await page.click('[data-testid="departments-select"]');
      await page.check('[data-testid="department-engineering"]');
      await page.check('[data-testid="department-data-science"]');
      await page.click('[data-testid="departments-apply"]');

      // Set confidence level
      await page.fill('[data-testid="confidence-level"]', '95');

      // Generate forecast
      await page.click('[data-testid="generate-forecast"]');
      
      // Wait for forecast generation (should show loading state)
      await expect(page.locator('[data-testid="forecast-loading"]')).toBeVisible();
      await expect(page.locator('[data-testid="forecast-loading"]')).not.toBeVisible({ timeout: 30000 });

      // Validate forecast results
      await expect(page.locator('[data-testid="forecast-results"]')).toBeVisible();
      await expect(page.locator('[data-testid="forecast-id"]')).toContainText(/forecast_\d+/);
      await expect(page.locator('[data-testid="forecast-timeframe"]')).toContainText('weekly');

      // Check skill demand forecasts table
      await expect(page.locator('[data-testid="skill-forecasts-table"]')).toBeVisible();
      const skillRows = page.locator('[data-testid="skill-forecast-row"]');
      await expect(skillRows).toHaveCountGreaterThan(0);

      // Validate individual skill forecast data
      const firstSkillRow = skillRows.first();
      await expect(firstSkillRow.locator('[data-testid="skill-name"]')).not.toBeEmpty();
      await expect(firstSkillRow.locator('[data-testid="current-demand"]')).toContainText(/\d+/);
      await expect(firstSkillRow.locator('[data-testid="predicted-demand"]')).toContainText(/\d+/);
      await expect(firstSkillRow.locator('[data-testid="demand-change"]')).toContainText(/%/);
      await expect(firstSkillRow.locator('[data-testid="trend-indicator"]')).toHaveClass(/trend-(increasing|decreasing|stable|volatile)/);
      await expect(firstSkillRow.locator('[data-testid="confidence-interval"]')).toContainText(/\d+ - \d+/);

      // Check overall metrics
      await expect(page.locator('[data-testid="total-current-demand"]')).toContainText(/\d+/);
      await expect(page.locator('[data-testid="total-predicted-demand"]')).toContainText(/\d+/);
      await expect(page.locator('[data-testid="overall-growth-rate"]')).toContainText(/%/);
      await expect(page.locator('[data-testid="model-accuracy"]')).toContainText(/\d+%/);
      await expect(page.locator('[data-testid="forecast-reliability"]')).toContainText(/(high|medium|low)/);

      // Check confidence visualization
      await expect(page.locator('[data-testid="confidence-chart"]')).toBeVisible();
      const overallConfidence = await page.locator('[data-testid="overall-confidence"]').textContent();
      expect(parseInt(overallConfidence || '0')).toBeGreaterThan(0);
      expect(parseInt(overallConfidence || '100')).toBeLessThanOrEqual(100);
    });

    test('should generate and compare multiple forecast scenarios', async ({ page }) => {
      // Navigate to scenario comparison
      await page.click('[data-testid="scenario-forecasting-tab"]');
      await expect(page.locator('h2')).toContainText('Scenario Forecasting');

      // Create optimistic scenario
      await page.click('[data-testid="add-scenario"]');
      await page.fill('[data-testid="scenario-name-0"]', 'Optimistic Growth');
      await page.fill('[data-testid="scenario-description-0"]', 'High market demand with aggressive expansion');
      await page.fill('[data-testid="growth-rate-0"]', '25');
      await page.selectOption('[data-testid="market-conditions-0"]', 'optimistic');
      await page.fill('[data-testid="budget-constraints-0"]', '1000000');

      // Create conservative scenario
      await page.click('[data-testid="add-scenario"]');
      await page.fill('[data-testid="scenario-name-1"]', 'Conservative Plan');
      await page.fill('[data-testid="scenario-description-1"]', 'Steady growth with risk-averse approach');
      await page.fill('[data-testid="growth-rate-1"]', '5');
      await page.selectOption('[data-testid="market-conditions-1"]', 'realistic');
      await page.fill('[data-testid="budget-constraints-1"]', '500000');

      // Create pessimistic scenario
      await page.click('[data-testid="add-scenario"]');
      await page.fill('[data-testid="scenario-name-2"]', 'Economic Downturn');
      await page.fill('[data-testid="scenario-description-2"]', 'Reduced demand with cost-cutting measures');
      await page.fill('[data-testid="growth-rate-2"]', '-10');
      await page.selectOption('[data-testid="market-conditions-2"]', 'pessimistic');
      await page.fill('[data-testid="budget-constraints-2"]', '200000');

      // Generate scenario forecasts
      await page.click('[data-testid="generate-scenario-forecasts"]');
      
      // Wait for generation to complete
      await expect(page.locator('[data-testid="scenario-loading"]')).toBeVisible();
      await expect(page.locator('[data-testid="scenario-loading"]')).not.toBeVisible({ timeout: 45000 });

      // Validate scenario results
      await expect(page.locator('[data-testid="scenario-results"]')).toBeVisible();
      
      // Check that all three scenarios are displayed
      await expect(page.locator('[data-testid="scenario-optimistic-growth"]')).toBeVisible();
      await expect(page.locator('[data-testid="scenario-conservative-plan"]')).toBeVisible();
      await expect(page.locator('[data-testid="scenario-economic-downturn"]')).toBeVisible();

      // Validate scenario comparison chart
      await expect(page.locator('[data-testid="scenario-comparison-chart"]')).toBeVisible();
      
      // Check that optimistic scenario shows higher demand than pessimistic
      const optimisticDemand = await page.locator('[data-testid="optimistic-total-demand"]').textContent();
      const pessimisticDemand = await page.locator('[data-testid="pessimistic-total-demand"]').textContent();
      
      expect(parseInt(optimisticDemand || '0')).toBeGreaterThan(parseInt(pessimisticDemand || '0'));

      // Validate recommendations section
      await expect(page.locator('[data-testid="scenario-recommendations"]')).toBeVisible();
      const recommendations = page.locator('[data-testid="scenario-recommendation"]');
      await expect(recommendations).toHaveCountGreaterThan(0);

      // Check first recommendation has required fields
      const firstRecommendation = recommendations.first();
      await expect(firstRecommendation.locator('[data-testid="recommendation-title"]')).not.toBeEmpty();
      await expect(firstRecommendation.locator('[data-testid="recommendation-description"]')).not.toBeEmpty();
      await expect(firstRecommendation.locator('[data-testid="recommendation-priority"]')).toContainText(/(low|medium|high|critical)/);
    });

    test('should handle pipeline-based resource demand forecasting', async ({ page }) => {
      // Navigate to pipeline forecasting
      await page.click('[data-testid="pipeline-forecasting-tab"]');
      await expect(page.locator('h2')).toContainText('Pipeline Resource Forecasting');

      // Configure pipeline filters
      await page.fill('[data-testid="probability-threshold"]', '70');
      
      // Select client types
      await page.click('[data-testid="client-types-select"]');
      await page.check('[data-testid="client-type-enterprise"]');
      await page.check('[data-testid="client-type-smb"]');
      await page.click('[data-testid="client-types-apply"]');

      // Select project types
      await page.click('[data-testid="project-types-select"]');
      await page.check('[data-testid="project-type-web-development"]');
      await page.check('[data-testid="project-type-mobile-app"]');
      await page.click('[data-testid="project-types-apply"]');

      // Set budget range
      await page.fill('[data-testid="budget-min"]', '50000');
      await page.fill('[data-testid="budget-max"]', '500000');

      // Set time range
      const futureDate = new Date();
      futureDate.setMonth(futureDate.getMonth() + 6);
      await page.fill('[data-testid="time-range-start"]', new Date().toISOString().split('T')[0]);
      await page.fill('[data-testid="time-range-end"]', futureDate.toISOString().split('T')[0]);

      // Generate pipeline forecast
      await page.click('[data-testid="generate-pipeline-forecast"]');
      
      // Wait for generation
      await expect(page.locator('[data-testid="pipeline-loading"]')).toBeVisible();
      await expect(page.locator('[data-testid="pipeline-loading"]')).not.toBeVisible({ timeout: 30000 });

      // Validate pipeline forecast results
      await expect(page.locator('[data-testid="pipeline-results"]')).toBeVisible();

      // Check aggregated demand section
      await expect(page.locator('[data-testid="aggregated-demand-table"]')).toBeVisible();
      const demandRows = page.locator('[data-testid="aggregated-demand-row"]');
      await expect(demandRows).toHaveCountGreaterThan(0);

      // Validate demand row data
      const firstDemandRow = demandRows.first();
      await expect(firstDemandRow.locator('[data-testid="skill-name"]')).not.toBeEmpty();
      await expect(firstDemandRow.locator('[data-testid="current-demand"]')).toContainText(/\d+/);
      await expect(firstDemandRow.locator('[data-testid="forecasted-demand"]')).toContainText(/\d+/);
      await expect(firstDemandRow.locator('[data-testid="trend-direction"]')).toContainText(/(increasing|decreasing|stable|volatile)/);

      // Check capacity requirements
      await expect(page.locator('[data-testid="capacity-requirements"]')).toBeVisible();
      const capacityItems = page.locator('[data-testid="capacity-requirement-item"]');
      await expect(capacityItems).toHaveCountGreaterThanOrEqual(0);

      // Check risk assessment
      await expect(page.locator('[data-testid="pipeline-risk-assessment"]')).toBeVisible();
      await expect(page.locator('[data-testid="overall-risk-level"]')).toContainText(/(low|medium|high|critical)/);
      
      const riskFactors = page.locator('[data-testid="risk-factor"]');
      riskFactors.forEach(async (factor) => {
        await expect(factor.locator('[data-testid="risk-description"]')).not.toBeEmpty();
        await expect(factor.locator('[data-testid="risk-probability"]')).toContainText(/\d+%/);
        await expect(factor.locator('[data-testid="risk-impact"]')).not.toBeEmpty();
      });
    });

    test('should update forecasts with real-time data', async ({ page }) => {
      // First generate a base forecast
      await page.click('[data-testid="demand-forecasting-tab"]');
      await page.selectOption('[data-testid="forecast-timeframe"]', 'monthly');
      await page.click('[data-testid="generate-forecast"]');
      
      // Wait for initial forecast
      await expect(page.locator('[data-testid="forecast-loading"]')).not.toBeVisible({ timeout: 30000 });
      
      // Get the initial forecast ID
      const initialForecastId = await page.locator('[data-testid="forecast-id"]').textContent();
      expect(initialForecastId).toBeTruthy();

      // Navigate to real-time updates section
      await page.click('[data-testid="realtime-updates-tab"]');
      await expect(page.locator('h2')).toContainText('Real-Time Forecast Updates');

      // Simulate new project addition
      await page.click('[data-testid="add-realtime-change"]');
      await page.selectOption('[data-testid="change-type-0"]', 'new_project');
      await page.fill('[data-testid="project-name-0"]', 'Emergency Frontend Project');
      await page.fill('[data-testid="team-size-0"]', '3');
      await page.fill('[data-testid="project-duration-0"]', '8');
      
      // Add required skills
      await page.click('[data-testid="add-required-skill-0"]');
      await page.selectOption('[data-testid="required-skill-0-0"]', 'React');
      await page.selectOption('[data-testid="required-skill-0-1"]', 'TypeScript');

      // Simulate resource change
      await page.click('[data-testid="add-realtime-change"]');
      await page.selectOption('[data-testid="change-type-1"]', 'resource_change');
      await page.selectOption('[data-testid="change-subtype-1"]', 'new_hire');
      await page.selectOption('[data-testid="skill-id-1"]', 'React');
      await page.fill('[data-testid="capacity-change-1"]', '160');

      // Add market indicator
      await page.click('[data-testid="add-realtime-change"]');
      await page.selectOption('[data-testid="change-type-2"]', 'market_indicator');
      await page.fill('[data-testid="indicator-name-2"]', 'frontend_demand_spike');
      await page.fill('[data-testid="indicator-value-2"]', '1.2');
      await page.fill('[data-testid="indicator-source-2"]', 'market_analysis');

      // Update forecast with real-time data
      await page.fill('[data-testid="forecast-id-to-update"]', initialForecastId || '');
      await page.click('[data-testid="update-forecast-realtime"]');

      // Wait for update to complete
      await expect(page.locator('[data-testid="realtime-update-loading"]')).toBeVisible();
      await expect(page.locator('[data-testid="realtime-update-loading"]')).not.toBeVisible({ timeout: 30000 });

      // Validate updated forecast
      await expect(page.locator('[data-testid="updated-forecast-results"]')).toBeVisible();
      
      // Check that forecast date is updated
      const updatedForecastDate = await page.locator('[data-testid="updated-forecast-date"]').textContent();
      expect(new Date(updatedForecastDate || '')).toBeInstanceOf(Date);
      
      // Check that frontend skills show increased demand
      const frontendSkillRow = page.locator('[data-testid="skill-forecast-row"]').filter({ hasText: 'React' }).first();
      if (await frontendSkillRow.count() > 0) {
        const predictedDemand = await frontendSkillRow.locator('[data-testid="predicted-demand"]').textContent();
        expect(parseInt(predictedDemand || '0')).toBeGreaterThan(0);
      }

      // Validate change impact summary
      await expect(page.locator('[data-testid="change-impact-summary"]')).toBeVisible();
      await expect(page.locator('[data-testid="demand-impact"]')).toContainText(/\d+/);
      await expect(page.locator('[data-testid="capacity-impact"]')).toContainText(/\d+/);
    });
  });

  test.describe('Forecast Analysis and Validation', () => {
    test('should evaluate forecast accuracy against historical data', async ({ page }) => {
      // Navigate to forecast validation
      await page.click('[data-testid="forecast-validation-tab"]');
      await expect(page.locator('h2')).toContainText('Forecast Accuracy Analysis');

      // Select a historical forecast for validation
      await page.click('[data-testid="select-historical-forecast"]');
      const historicalForecasts = page.locator('[data-testid="historical-forecast-option"]');
      await expect(historicalForecasts).toHaveCountGreaterThan(0);
      await historicalForecasts.first().click();

      // Upload or input actual historical data for comparison
      await page.click('[data-testid="input-actual-data"]');
      
      // Input skill demand actuals
      await page.click('[data-testid="add-skill-actual"]');
      await page.selectOption('[data-testid="actual-skill-0"]', 'JavaScript');
      await page.fill('[data-testid="actual-value-0"]', '150');
      await page.fill('[data-testid="actual-date-0"]', '2024-01-01');

      await page.click('[data-testid="add-skill-actual"]');
      await page.selectOption('[data-testid="actual-skill-1"]', 'React');
      await page.fill('[data-testid="actual-value-1"]', '120');
      await page.fill('[data-testid="actual-date-1"]', '2024-01-01');

      // Input department utilization actuals
      await page.click('[data-testid="add-dept-actual"]');
      await page.selectOption('[data-testid="actual-dept-0"]', 'Engineering');
      await page.fill('[data-testid="actual-utilization-0"]', '85');
      await page.fill('[data-testid="actual-dept-date-0"]', '2024-01-01');

      // Run accuracy evaluation
      await page.click('[data-testid="evaluate-forecast-accuracy"]');
      
      // Wait for evaluation to complete
      await expect(page.locator('[data-testid="accuracy-loading"]')).toBeVisible();
      await expect(page.locator('[data-testid="accuracy-loading"]')).not.toBeVisible({ timeout: 20000 });

      // Validate accuracy results
      await expect(page.locator('[data-testid="accuracy-results"]')).toBeVisible();
      
      // Check overall accuracy score
      const overallAccuracy = await page.locator('[data-testid="overall-accuracy"]').textContent();
      expect(parseInt(overallAccuracy?.replace('%', '') || '0')).toBeGreaterThan(0);
      expect(parseInt(overallAccuracy?.replace('%', '') || '100')).toBeLessThanOrEqual(100);

      // Check error metrics
      await expect(page.locator('[data-testid="mae-value"]')).toContainText(/\d+/);
      await expect(page.locator('[data-testid="rmse-value"]')).toContainText(/\d+/);
      await expect(page.locator('[data-testid="mape-value"]')).toContainText(/\d+%/);

      // Check skill-specific accuracies
      await expect(page.locator('[data-testid="skill-accuracies-table"]')).toBeVisible();
      const skillAccuracyRows = page.locator('[data-testid="skill-accuracy-row"]');
      await expect(skillAccuracyRows).toHaveCountGreaterThan(0);

      // Validate first skill accuracy row
      const firstSkillAccuracy = skillAccuracyRows.first();
      await expect(firstSkillAccuracy.locator('[data-testid="skill-name"]')).not.toBeEmpty();
      await expect(firstSkillAccuracy.locator('[data-testid="skill-accuracy"]')).toContainText(/\d+%/);
      
      // Check improvement suggestions
      await expect(page.locator('[data-testid="improvement-suggestions"]')).toBeVisible();
      const suggestions = page.locator('[data-testid="improvement-suggestion"]');
      suggestions.forEach(async (suggestion) => {
        await expect(suggestion).not.toBeEmpty();
      });
    });

    test('should display forecast uncertainty and confidence bounds', async ({ page }) => {
      // Generate a forecast first
      await page.click('[data-testid="demand-forecasting-tab"]');
      await page.selectOption('[data-testid="forecast-timeframe"]', 'quarterly');
      await page.check('[data-testid="include-seasonality"]');
      await page.click('[data-testid="generate-forecast"]');
      
      await expect(page.locator('[data-testid="forecast-loading"]')).not.toBeVisible({ timeout: 30000 });

      // Navigate to uncertainty analysis
      await page.click('[data-testid="uncertainty-analysis-tab"]');
      await expect(page.locator('h3')).toContainText('Forecast Uncertainty Analysis');

      // Check confidence intervals visualization
      await expect(page.locator('[data-testid="confidence-intervals-chart"]')).toBeVisible();
      
      // Validate confidence bounds for each skill
      const skillConfidenceRows = page.locator('[data-testid="skill-confidence-row"]');
      await expect(skillConfidenceRows).toHaveCountGreaterThan(0);

      skillConfidenceRows.forEach(async (row) => {
        const lowerBound = await row.locator('[data-testid="confidence-lower"]').textContent();
        const upperBound = await row.locator('[data-testid="confidence-upper"]').textContent();
        const predicted = await row.locator('[data-testid="predicted-value"]').textContent();
        
        expect(parseInt(lowerBound || '0')).toBeLessThanOrEqual(parseInt(predicted || '0'));
        expect(parseInt(predicted || '0')).toBeLessThanOrEqual(parseInt(upperBound || '0'));
      });

      // Check uncertainty factors
      await expect(page.locator('[data-testid="uncertainty-factors"]')).toBeVisible();
      const uncertaintyFactors = page.locator('[data-testid="uncertainty-factor"]');
      
      uncertaintyFactors.forEach(async (factor) => {
        await expect(factor.locator('[data-testid="factor-name"]')).not.toBeEmpty();
        await expect(factor.locator('[data-testid="factor-impact"]')).toContainText(/\d+%/);
        await expect(factor.locator('[data-testid="factor-description"]')).not.toBeEmpty();
      });

      // Check risk indicators
      await expect(page.locator('[data-testid="forecast-risks"]')).toBeVisible();
      const riskIndicators = page.locator('[data-testid="risk-indicator"]');
      
      riskIndicators.forEach(async (indicator) => {
        await expect(indicator.locator('[data-testid="risk-type"]')).toContainText(/(market|technology|seasonal|economic|competitive)/);
        await expect(indicator.locator('[data-testid="risk-probability"]')).toContainText(/\d+%/);
        await expect(indicator.locator('[data-testid="risk-impact"]')).not.toBeEmpty();
      });
    });

    test('should export forecast results in multiple formats', async ({ page }) => {
      // Generate a forecast first
      await page.click('[data-testid="demand-forecasting-tab"]');
      await page.selectOption('[data-testid="forecast-timeframe"]', 'monthly');
      await page.click('[data-testid="generate-forecast"]');
      
      await expect(page.locator('[data-testid="forecast-loading"]')).not.toBeVisible({ timeout: 30000 });

      // Test CSV export
      const [csvDownload] = await Promise.all([
        page.waitForEvent('download'),
        page.click('[data-testid="export-csv"]')
      ]);
      
      expect(csvDownload.suggestedFilename()).toMatch(/forecast.*\.csv$/);
      await csvDownload.saveAs(`./test-results/${csvDownload.suggestedFilename()}`);

      // Test Excel export
      const [excelDownload] = await Promise.all([
        page.waitForEvent('download'),
        page.click('[data-testid="export-excel"]')
      ]);
      
      expect(excelDownload.suggestedFilename()).toMatch(/forecast.*\.xlsx$/);
      await excelDownload.saveAs(`./test-results/${excelDownload.suggestedFilename()}`);

      // Test PDF report export
      const [pdfDownload] = await Promise.all([
        page.waitForEvent('download'),
        page.click('[data-testid="export-pdf"]')
      ]);
      
      expect(pdfDownload.suggestedFilename()).toMatch(/forecast.*\.pdf$/);
      await pdfDownload.saveAs(`./test-results/${pdfDownload.suggestedFilename()}`);

      // Test JSON data export
      const [jsonDownload] = await Promise.all([
        page.waitForEvent('download'),
        page.click('[data-testid="export-json"]')
      ]);
      
      expect(jsonDownload.suggestedFilename()).toMatch(/forecast.*\.json$/);
      await jsonDownload.saveAs(`./test-results/${jsonDownload.suggestedFilename()}`);

      // Validate export options are available
      await expect(page.locator('[data-testid="export-options"]')).toBeVisible();
      await expect(page.locator('[data-testid="export-csv"]')).toBeEnabled();
      await expect(page.locator('[data-testid="export-excel"]')).toBeEnabled();
      await expect(page.locator('[data-testid="export-pdf"]')).toBeEnabled();
      await expect(page.locator('[data-testid="export-json"]')).toBeEnabled();
    });
  });

  test.describe('Error Handling and Edge Cases', () => {
    test('should handle forecast generation failures gracefully', async ({ page }) => {
      // Navigate to forecasting
      await page.click('[data-testid="demand-forecasting-tab"]');

      // Try to generate forecast with invalid parameters
      await page.selectOption('[data-testid="forecast-timeframe"]', 'weekly');
      await page.fill('[data-testid="confidence-level"]', '150'); // Invalid confidence level > 100

      await page.click('[data-testid="generate-forecast"]');

      // Should show validation error
      await expect(page.locator('[data-testid="validation-error"]')).toBeVisible();
      await expect(page.locator('[data-testid="validation-error"]')).toContainText(/confidence level must be between/i);

      // Correct the validation error
      await page.fill('[data-testid="confidence-level"]', '95');

      // Mock a server error by intercepting the API call
      await page.route('**/api/forecasting/demand', async route => {
        await route.fulfill({
          status: 500,
          body: JSON.stringify({ error: 'Internal server error' })
        });
      });

      await page.click('[data-testid="generate-forecast"]');

      // Should show error message
      await expect(page.locator('[data-testid="forecast-error"]')).toBeVisible();
      await expect(page.locator('[data-testid="forecast-error"]')).toContainText(/failed to generate forecast/i);

      // Should show retry option
      await expect(page.locator('[data-testid="retry-forecast"]')).toBeVisible();
      await expect(page.locator('[data-testid="retry-forecast"]')).toBeEnabled();
    });

    test('should handle empty or insufficient data scenarios', async ({ page }) => {
      // Mock API to return empty data
      await page.route('**/api/forecasting/demand', async route => {
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

      await expect(page.locator('[data-testid="forecast-loading"]')).not.toBeVisible({ timeout: 10000 });

      // Should show appropriate message for insufficient data
      await expect(page.locator('[data-testid="insufficient-data-warning"]')).toBeVisible();
      await expect(page.locator('[data-testid="insufficient-data-warning"]')).toContainText(/insufficient historical data/i);

      // Should suggest data collection improvements
      await expect(page.locator('[data-testid="data-improvement-suggestions"]')).toBeVisible();
      const suggestions = page.locator('[data-testid="data-suggestion"]');
      await expect(suggestions).toHaveCountGreaterThan(0);
    });

    test('should handle network connectivity issues', async ({ page }) => {
      // Navigate to forecasting page
      await page.click('[data-testid="demand-forecasting-tab"]');

      // Simulate network failure
      await page.setOffline(true);

      await page.click('[data-testid="generate-forecast"]');

      // Should show network error
      await expect(page.locator('[data-testid="network-error"]')).toBeVisible();
      await expect(page.locator('[data-testid="network-error"]')).toContainText(/network error|connection failed/i);

      // Should show offline mode indicator
      await expect(page.locator('[data-testid="offline-indicator"]')).toBeVisible();

      // Restore network connectivity
      await page.setOffline(false);

      // Should automatically retry or show retry option
      await expect(page.locator('[data-testid="network-restored"]')).toBeVisible({ timeout: 5000 });
      await expect(page.locator('[data-testid="retry-online"]')).toBeVisible();
    });
  });
});

// Helper functions
async function loginIfNeeded(page: Page): Promise<void> {
  // Check if already logged in
  const isLoggedIn = await page.locator('[data-testid="user-profile"]').isVisible();
  
  if (!isLoggedIn) {
    // Look for login form or button
    const loginButton = page.locator('[data-testid="login-button"]');
    if (await loginButton.isVisible()) {
      await loginButton.click();
      
      // Fill in test credentials
      await page.fill('[data-testid="email-input"]', 'test@example.com');
      await page.fill('[data-testid="password-input"]', 'testpassword');
      await page.click('[data-testid="submit-login"]');
      
      // Wait for login to complete
      await expect(page.locator('[data-testid="user-profile"]')).toBeVisible();
    }
  }
}