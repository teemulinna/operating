/**
 * End-to-End Tests for AI Optimization Features
 * Tests complete user journeys for AI-powered resource optimization
 */

import { test, expect, Page } from '@playwright/test';

test.describe('AI Resource Optimization Features', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    await loginIfNeeded(page);
    
    // Navigate to optimization section
    await page.click('[data-testid="navigation-optimization"]');
    await expect(page).toHaveURL(/.*optimization/);
  });

  test.describe('Resource Allocation Optimization Workflow', () => {
    test('should optimize resource allocation using genetic algorithm', async ({ page }) => {
      await page.click('[data-testid="resource-allocation-optimization-tab"]');
      await expect(page.locator('h1')).toContainText('AI Resource Allocation Optimization');

      // Configure optimization scope
      await page.click('[data-testid="configure-optimization-scope"]');
      
      // Select projects for optimization
      await page.click('[data-testid="select-projects"]');
      await page.check('[data-testid="project-checkbox-1"]');
      await page.check('[data-testid="project-checkbox-2"]');
      await page.check('[data-testid="project-checkbox-3"]');
      await page.click('[data-testid="apply-project-selection"]');

      // Select time range
      await page.fill('[data-testid="optimization-start-date"]', '2024-01-01');
      await page.fill('[data-testid="optimization-end-date"]', '2024-06-30');

      // Configure optimization objectives
      await page.click('[data-testid="configure-objectives"]');
      await page.fill('[data-testid="maximize-utilization-weight"]', '35');
      await page.fill('[data-testid="minimize-conflicts-weight"]', '30');
      await page.fill('[data-testid="maximize-skill-match-weight"]', '20');
      await page.fill('[data-testid="minimize-costs-weight"]', '10');
      await page.fill('[data-testid="balance-workload-weight"]', '5');

      // Verify weights sum to 100
      const totalWeight = await page.locator('[data-testid="total-objectives-weight"]').textContent();
      expect(totalWeight).toBe('100');

      // Configure constraints
      await page.click('[data-testid="configure-constraints"]');
      await page.fill('[data-testid="max-utilization-per-employee"]', '100');
      await page.fill('[data-testid="min-skill-match-threshold"]', '70');
      await page.fill('[data-testid="budget-limit"]', '500000');
      await page.check('[data-testid="time-constraints"]');
      await page.check('[data-testid="skill-constraints"]');
      await page.check('[data-testid="availability-constraints"]');

      // Select optimization algorithm
      await page.selectOption('[data-testid="optimization-algorithm"]', 'genetic');
      
      // Configure algorithm parameters
      await page.fill('[data-testid="max-iterations"]', '100');
      await page.fill('[data-testid="convergence-threshold"]', '0.001');
      await page.fill('[data-testid="population-size"]', '30');
      await page.fill('[data-testid="mutation-rate"]', '0.1');

      // Start optimization
      await page.click('[data-testid="start-optimization"]');
      
      // Wait for optimization to complete (show progress)
      await expect(page.locator('[data-testid="optimization-loading"]')).toBeVisible();
      await expect(page.locator('[data-testid="optimization-progress-bar"]')).toBeVisible();
      await expect(page.locator('[data-testid="optimization-status"]')).toContainText('Running genetic algorithm');
      
      // Wait for completion (may take longer for genetic algorithm)
      await expect(page.locator('[data-testid="optimization-loading"]')).not.toBeVisible({ timeout: 60000 });

      // Validate optimization results
      await expect(page.locator('[data-testid="optimization-results"]')).toBeVisible();
      
      // Check optimization metadata
      const optimizationId = await page.locator('[data-testid="optimization-id"]').textContent();
      expect(optimizationId).toMatch(/opt_\d+_\w+/);
      
      await expect(page.locator('[data-testid="algorithm-used"]')).toContainText('genetic');
      await expect(page.locator('[data-testid="convergence-achieved"]')).toContainText('true');
      
      const iterations = await page.locator('[data-testid="iterations-completed"]').textContent();
      expect(parseInt(iterations || '0')).toBeGreaterThan(0);
      expect(parseInt(iterations || '101')).toBeLessThanOrEqual(100);

      // Validate current vs optimized state comparison
      await expect(page.locator('[data-testid="state-comparison"]')).toBeVisible();
      
      const currentUtilization = await page.locator('[data-testid="current-utilization"]').textContent();
      const optimizedUtilization = await page.locator('[data-testid="optimized-utilization"]').textContent();
      expect(parseFloat(currentUtilization || '0')).toBeGreaterThanOrEqual(0);
      expect(parseFloat(optimizedUtilization || '0')).toBeGreaterThanOrEqual(0);

      const currentConflicts = await page.locator('[data-testid="current-conflicts"]').textContent();
      const optimizedConflicts = await page.locator('[data-testid="optimized-conflicts"]').textContent();
      expect(parseInt(currentConflicts || '0')).toBeGreaterThanOrEqual(0);
      expect(parseInt(optimizedConflicts || '0')).toBeGreaterThanOrEqual(0);

      // Should show improvement in at least one metric
      const utilizationImprovement = parseFloat(optimizedUtilization || '0') - parseFloat(currentUtilization || '0');
      const conflictReduction = parseInt(currentConflicts || '0') - parseInt(optimizedConflicts || '0');
      
      expect(utilizationImprovement >= -5 || conflictReduction >= 0).toBe(true); // Allow small decreases in utilization if conflicts reduced

      // Check improvements summary
      await expect(page.locator('[data-testid="improvements-summary"]')).toBeVisible();
      await expect(page.locator('[data-testid="utilization-improvement"]')).toContainText(/[+-]?\d+(\.\d+)?/);
      await expect(page.locator('[data-testid="conflict-reduction"]')).toContainText(/\d+/);
      await expect(page.locator('[data-testid="skill-match-improvement"]')).toContainText(/[+-]?\d+(\.\d+)?/);

      // Check performance metrics
      await expect(page.locator('[data-testid="performance-metrics"]')).toBeVisible();
      const objectiveScore = await page.locator('[data-testid="objective-score"]').textContent();
      expect(parseInt(objectiveScore || '0')).toBeGreaterThan(0);
      expect(parseInt(objectiveScore || '100')).toBeLessThanOrEqual(100);

      const constraintViolations = await page.locator('[data-testid="constraint-violations"]').textContent();
      expect(parseInt(constraintViolations || '0')).toBeGreaterThanOrEqual(0);

      const feasibilityScore = await page.locator('[data-testid="feasibility-score"]').textContent();
      expect(parseInt(feasibilityScore || '0')).toBeGreaterThan(50); // Should be reasonably feasible

      // Check resource changes recommendations
      await expect(page.locator('[data-testid="resource-changes"]')).toBeVisible();
      const changes = page.locator('[data-testid="resource-change-item"]');
      
      if (await changes.count() > 0) {
        const firstChange = changes.first();
        await expect(firstChange.locator('[data-testid="change-type"]')).toContainText(/(add|remove|modify|reassign)/);
        await expect(firstChange.locator('[data-testid="employee-name"]')).not.toBeEmpty();
        await expect(firstChange.locator('[data-testid="project-name"]')).not.toBeEmpty();
        await expect(firstChange.locator('[data-testid="change-priority"]')).toContainText(/(low|medium|high|critical)/);
        await expect(firstChange.locator('[data-testid="change-confidence"]')).toContainText(/\d+%/);
      }
    });

    test('should compare different optimization algorithms', async ({ page }) => {
      await page.click('[data-testid="algorithm-comparison-tab"]');
      await expect(page.locator('h2')).toContainText('Algorithm Performance Comparison');

      // Set up comparison scope (smaller scope for multiple algorithms)
      await page.click('[data-testid="select-projects-for-comparison"]');
      await page.check('[data-testid="project-checkbox-1"]');
      await page.check('[data-testid="project-checkbox-2"]');
      await page.click('[data-testid="apply-project-selection"]');

      // Configure objectives for comparison
      await page.fill('[data-testid="comparison-maximize-utilization"]', '40');
      await page.fill('[data-testid="comparison-minimize-conflicts"]', '30');
      await page.fill('[data-testid="comparison-maximize-skill-match"]', '20');
      await page.fill('[data-testid="comparison-minimize-costs"]', '10');

      // Select algorithms to compare
      await page.check('[data-testid="algorithm-genetic"]');
      await page.check('[data-testid="algorithm-simulated-annealing"]');
      await page.check('[data-testid="algorithm-constraint-satisfaction"]');
      await page.check('[data-testid="algorithm-hybrid"]');

      // Set comparison parameters
      await page.fill('[data-testid="comparison-max-iterations"]', '50'); // Reduced for comparison
      await page.fill('[data-testid="comparison-runs-per-algorithm"]', '3'); // Multiple runs for reliability

      // Start algorithm comparison
      await page.click('[data-testid="run-algorithm-comparison"]');
      
      // Wait for all algorithms to complete
      await expect(page.locator('[data-testid="comparison-loading"]')).toBeVisible();
      await expect(page.locator('[data-testid="comparison-progress"]')).toBeVisible();
      
      // This will take longer as it runs multiple algorithms
      await expect(page.locator('[data-testid="comparison-loading"]')).not.toBeVisible({ timeout: 120000 });

      // Validate comparison results
      await expect(page.locator('[data-testid="algorithm-comparison-results"]')).toBeVisible();
      
      // Check results table
      await expect(page.locator('[data-testid="comparison-results-table"]')).toBeVisible();
      const algorithmRows = page.locator('[data-testid="algorithm-result-row"]');
      await expect(algorithmRows).toHaveCount(4); // Four algorithms tested

      // Validate each algorithm result
      for (let i = 0; i < 4; i++) {
        const row = algorithmRows.nth(i);
        await expect(row.locator('[data-testid="algorithm-name"]')).toContainText(/(genetic|simulated_annealing|constraint_satisfaction|hybrid)/);
        await expect(row.locator('[data-testid="avg-objective-score"]')).toContainText(/\d+(\.\d+)?/);
        await expect(row.locator('[data-testid="avg-execution-time"]')).toContainText(/\d+(\.\d+)?\s*(ms|s)/);
        await expect(row.locator('[data-testid="convergence-rate"]')).toContainText(/\d+%/);
        await expect(row.locator('[data-testid="consistency-score"]')).toContainText(/\d+(\.\d+)?/);
      }

      // Check performance visualization
      await expect(page.locator('[data-testid="performance-comparison-chart"]')).toBeVisible();
      await expect(page.locator('[data-testid="execution-time-chart"]')).toBeVisible();
      await expect(page.locator('[data-testid="convergence-comparison-chart"]')).toBeVisible();

      // Check algorithm recommendations
      await expect(page.locator('[data-testid="algorithm-recommendations"]')).toBeVisible();
      await expect(page.locator('[data-testid="best-overall-algorithm"]')).not.toBeEmpty();
      await expect(page.locator('[data-testid="best-speed-algorithm"]')).not.toBeEmpty();
      await expect(page.locator('[data-testid="best-accuracy-algorithm"]')).not.toBeEmpty();

      // Check detailed analysis
      await expect(page.locator('[data-testid="detailed-analysis"]')).toBeVisible();
      const analysisPoints = page.locator('[data-testid="analysis-point"]');
      await expect(analysisPoints).toHaveCountGreaterThan(0);

      analysisPoints.forEach(async (point) => {
        await expect(point).not.toBeEmpty();
      });
    });

    test('should handle constraint satisfaction optimization', async ({ page }) => {
      await page.click('[data-testid="constraint-satisfaction-tab"]');
      await expect(page.locator('h2')).toContainText('Constraint Satisfaction Optimization');

      // Create a scenario with known constraint violations
      await page.click('[data-testid="create-constraint-scenario"]');
      
      // Set up over-allocation scenario
      await page.click('[data-testid="add-constraint-violation"]');
      await page.selectOption('[data-testid="violation-type-0"]', 'over_allocation');
      await page.selectOption('[data-testid="affected-employee-0"]', 'emp-1');
      await page.fill('[data-testid="violation-severity-0"]', '120'); // 120% allocated

      await page.click('[data-testid="add-constraint-violation"]');
      await page.selectOption('[data-testid="violation-type-1"]', 'skill_mismatch');
      await page.selectOption('[data-testid="affected-project-1"]', 'project-1');
      await page.fill('[data-testid="required-skill-level-1"]', '90');
      await page.fill('[data-testid="available-skill-level-1"]', '60');

      // Configure constraint satisfaction priorities
      await page.fill('[data-testid="allocation-constraint-priority"]', '50'); // High priority
      await page.fill('[data-testid="skill-constraint-priority"]', '30');
      await page.fill('[data-testid="timeline-constraint-priority"]', '20');

      // Set strict constraint limits
      await page.fill('[data-testid="max-employee-utilization"]', '100');
      await page.fill('[data-testid="min-skill-match-required"]', '75');
      await page.check('[data-testid="strict-constraint-mode"]');

      // Select constraint satisfaction algorithm
      await page.selectOption('[data-testid="cs-algorithm"]', 'constraint_satisfaction');
      await page.fill('[data-testid="cs-max-iterations"]', '150');

      // Run constraint satisfaction
      await page.click('[data-testid="run-constraint-satisfaction"]');
      
      await expect(page.locator('[data-testid="cs-optimization-loading"]')).toBeVisible();
      await expect(page.locator('[data-testid="cs-status"]')).toContainText('Resolving constraints');
      await expect(page.locator('[data-testid="cs-optimization-loading"]')).not.toBeVisible({ timeout: 45000 });

      // Validate constraint resolution results
      await expect(page.locator('[data-testid="constraint-resolution-results"]')).toBeVisible();
      
      // Check constraint violation resolution
      await expect(page.locator('[data-testid="constraints-resolved-count"]')).toContainText(/\d+/);
      await expect(page.locator('[data-testid="remaining-violations-count"]')).toContainText(/\d+/);

      const resolvedCount = await page.locator('[data-testid="constraints-resolved-count"]').textContent();
      expect(parseInt(resolvedCount || '0')).toBeGreaterThan(0);

      // Check individual constraint resolutions
      await expect(page.locator('[data-testid="constraint-resolutions"]')).toBeVisible();
      const resolutions = page.locator('[data-testid="constraint-resolution-item"]');
      
      if (await resolutions.count() > 0) {
        const firstResolution = resolutions.first();
        await expect(firstResolution.locator('[data-testid="constraint-type"]')).not.toBeEmpty();
        await expect(firstResolution.locator('[data-testid="resolution-action"]')).not.toBeEmpty();
        await expect(firstResolution.locator('[data-testid="resolution-status"]')).toContainText(/(resolved|partially_resolved|unresolved)/);
      }

      // Verify employee utilization is within limits
      await expect(page.locator('[data-testid="post-optimization-utilization"]')).toBeVisible();
      const employeeUtilizations = page.locator('[data-testid="employee-utilization-item"]');
      
      employeeUtilizations.forEach(async (utilization) => {
        const utilizationValue = await utilization.locator('[data-testid="utilization-percentage"]').textContent();
        expect(parseInt(utilizationValue?.replace('%', '') || '0')).toBeLessThanOrEqual(105); // Allow small margin for rounding
      });

      // Check optimization quality
      const feasibilityScore = await page.locator('[data-testid="cs-feasibility-score"]').textContent();
      expect(parseInt(feasibilityScore || '0')).toBeGreaterThan(70); // Should achieve reasonable feasibility
    });

    test('should provide alternative optimization solutions', async ({ page }) => {
      await page.click('[data-testid="alternative-solutions-tab"]');
      await expect(page.locator('h2')).toContainText('Alternative Optimization Solutions');

      // Set up optimization for alternatives generation
      await page.click('[data-testid="select-projects-for-alternatives"]');
      await page.check('[data-testid="project-checkbox-1"]');
      await page.check('[data-testid="project-checkbox-2"]');
      await page.check('[data-testid="project-checkbox-3"]');
      await page.click('[data-testid="apply-selection"]');

      // Configure to generate multiple alternatives
      await page.fill('[data-testid="num-alternatives-requested"]', '5');
      await page.check('[data-testid="explore-tradeoffs"]');
      await page.check('[data-testid="generate-hybrid-solutions"]');

      // Set varied objective weightings for alternatives
      await page.selectOption('[data-testid="alternative-strategy"]', 'diverse_objectives');
      
      // Run optimization for alternatives
      await page.click('[data-testid="generate-alternatives"]');
      
      await expect(page.locator('[data-testid="alternatives-loading"]')).toBeVisible();
      await expect(page.locator('[data-testid="alternatives-loading"]')).not.toBeVisible({ timeout: 60000 });

      // Validate alternative solutions
      await expect(page.locator('[data-testid="alternative-solutions-results"]')).toBeVisible();
      
      const alternatives = page.locator('[data-testid="alternative-solution-card"]');
      await expect(alternatives).toHaveCountGreaterThan(1);
      await expect(alternatives).toHaveCountLessThanOrEqual(5);

      // Validate first alternative solution
      const firstAlternative = alternatives.first();
      await expect(firstAlternative.locator('[data-testid="solution-id"]')).not.toBeEmpty();
      await expect(firstAlternative.locator('[data-testid="solution-score"]')).toContainText(/\d+(\.\d+)?/);
      await expect(firstAlternative.locator('[data-testid="solution-description"]')).not.toBeEmpty();
      await expect(firstAlternative.locator('[data-testid="feasibility-rating"]')).toContainText(/\d+(\.\d+)?/);
      await expect(firstAlternative.locator('[data-testid="implementation-complexity"]')).toContainText(/(low|medium|high)/);

      // Check tradeoffs analysis
      await firstAlternative.locator('[data-testid="expand-tradeoffs"]').click();
      await expect(firstAlternative.locator('[data-testid="tradeoffs-section"]')).toBeVisible();
      
      const tradeoffs = firstAlternative.locator('[data-testid="tradeoff-item"]');
      if (await tradeoffs.count() > 0) {
        const firstTradeoff = tradeoffs.first();
        await expect(firstTradeoff.locator('[data-testid="tradeoff-aspect"]')).not.toBeEmpty();
        await expect(firstTradeoff.locator('[data-testid="tradeoff-gain"]')).toContainText(/[+-]?\d+(\.\d+)?/);
        await expect(firstTradeoff.locator('[data-testid="tradeoff-loss"]')).toContainText(/[+-]?\d+(\.\d+)?/);
      }

      // Check solution comparison
      await expect(page.locator('[data-testid="solutions-comparison"]')).toBeVisible();
      await expect(page.locator('[data-testid="comparison-chart"]')).toBeVisible();

      // Should be able to select preferred solution
      await firstAlternative.locator('[data-testid="select-solution"]').click();
      await expect(page.locator('[data-testid="selected-solution-confirmation"]')).toBeVisible();
      await expect(page.locator('[data-testid="implement-solution"]')).toBeEnabled();
    });
  });

  test.describe('Real-time Optimization Updates', () => {
    test('should adapt optimization based on real-time changes', async ({ page }) => {
      // First run initial optimization
      await page.click('[data-testid="resource-allocation-optimization-tab"]');
      
      // Quick setup
      await page.click('[data-testid="select-projects"]');
      await page.check('[data-testid="project-checkbox-1"]');
      await page.check('[data-testid="project-checkbox-2"]');
      await page.click('[data-testid="apply-project-selection"]');
      
      await page.selectOption('[data-testid="optimization-algorithm"]', 'genetic');
      await page.click('[data-testid="start-optimization"]');
      await expect(page.locator('[data-testid="optimization-loading"]')).not.toBeVisible({ timeout: 60000 });

      // Get initial optimization ID
      const initialOptimizationId = await page.locator('[data-testid="optimization-id"]').textContent();

      // Navigate to real-time updates
      await page.click('[data-testid="realtime-optimization-tab"]');
      await expect(page.locator('h2')).toContainText('Real-Time Optimization Updates');

      // Set up real-time scenario changes
      await page.fill('[data-testid="base-optimization-id"]', initialOptimizationId || '');

      // Simulate new project addition
      await page.click('[data-testid="add-realtime-change"]');
      await page.selectOption('[data-testid="change-type-0"]', 'new_project');
      await page.fill('[data-testid="project-name-0"]', 'Urgent Client Request');
      await page.fill('[data-testid="project-priority-0"]', 'high');
      await page.fill('[data-testid="project-team-size-0"]', '4');
      await page.fill('[data-testid="project-duration-0"]', '6');

      // Simulate employee availability change
      await page.click('[data-testid="add-realtime-change"]');
      await page.selectOption('[data-testid="change-type-1"]', 'availability_change');
      await page.selectOption('[data-testid="affected-employee-1"]', 'emp-1');
      await page.fill('[data-testid="new-availability-1"]', '50'); // Reduced availability

      // Simulate skill update
      await page.click('[data-testid="add-realtime-change"]');
      await page.selectOption('[data-testid="change-type-2"]', 'skill_update');
      await page.selectOption('[data-testid="employee-2"]', 'emp-2');
      await page.selectOption('[data-testid="skill-updated-2"]', 'React');
      await page.selectOption('[data-testid="new-proficiency-2"]', 'expert');

      // Run real-time re-optimization
      await page.click('[data-testid="run-realtime-reoptimization"]');
      
      await expect(page.locator('[data-testid="realtime-loading"]')).toBeVisible();
      await expect(page.locator('[data-testid="realtime-status"]')).toContainText('Adapting to changes');
      await expect(page.locator('[data-testid="realtime-loading"]')).not.toBeVisible({ timeout: 45000 });

      // Validate real-time optimization results
      await expect(page.locator('[data-testid="realtime-optimization-results"]')).toBeVisible();
      
      // Check that new optimization ID is different
      const newOptimizationId = await page.locator('[data-testid="updated-optimization-id"]').textContent();
      expect(newOptimizationId).not.toBe(initialOptimizationId);

      // Check impact analysis
      await expect(page.locator('[data-testid="change-impact-analysis"]')).toBeVisible();
      await expect(page.locator('[data-testid="total-changes-processed"]')).toContainText('3');
      
      const impactSummary = page.locator('[data-testid="impact-summary-item"]');
      await expect(impactSummary).toHaveCountGreaterThan(0);

      // Check re-allocation recommendations
      await expect(page.locator('[data-testid="reallocation-recommendations"]')).toBeVisible();
      const reallocations = page.locator('[data-testid="reallocation-item"]');
      
      reallocations.forEach(async (reallocation) => {
        await expect(reallocation.locator('[data-testid="reallocation-type"]')).not.toBeEmpty();
        await expect(reallocation.locator('[data-testid="reallocation-reason"]')).not.toBeEmpty();
        await expect(reallocation.locator('[data-testid="reallocation-impact"]')).toContainText(/\d+/);
      });

      // Should show before/after comparison
      await expect(page.locator('[data-testid="before-after-comparison"]')).toBeVisible();
      await expect(page.locator('[data-testid="before-optimization-metrics"]')).toBeVisible();
      await expect(page.locator('[data-testid="after-optimization-metrics"]')).toBeVisible();
    });
  });

  test.describe('Optimization Analytics and Reporting', () => {
    test('should generate optimization performance reports', async ({ page }) => {
      await page.click('[data-testid="optimization-analytics-tab"]');
      await expect(page.locator('h2')).toContainText('Optimization Analytics & Reporting');

      // Set up reporting parameters
      await page.fill('[data-testid="report-start-date"]', '2024-01-01');
      await page.fill('[data-testid="report-end-date"]', '2024-06-30');
      
      await page.check('[data-testid="include-algorithm-performance"]');
      await page.check('[data-testid="include-constraint-analysis"]');
      await page.check('[data-testid="include-improvement-trends"]');
      await page.check('[data-testid="include-cost-analysis"]');

      // Select report format
      await page.selectOption('[data-testid="report-format"]', 'comprehensive');

      // Generate report
      await page.click('[data-testid="generate-analytics-report"]');
      
      await expect(page.locator('[data-testid="report-generation-loading"]')).toBeVisible();
      await expect(page.locator('[data-testid="report-generation-loading"]')).not.toBeVisible({ timeout: 30000 });

      // Validate report sections
      await expect(page.locator('[data-testid="analytics-report"]')).toBeVisible();
      
      // Check executive summary
      await expect(page.locator('[data-testid="executive-summary"]')).toBeVisible();
      await expect(page.locator('[data-testid="total-optimizations-run"]')).toContainText(/\d+/);
      await expect(page.locator('[data-testid="average-improvement"]')).toContainText(/\d+(\.\d+)?%/);
      await expect(page.locator('[data-testid="total-cost-savings"]')).toContainText(/\$[\d,]+/);

      // Check algorithm performance section
      await expect(page.locator('[data-testid="algorithm-performance-section"]')).toBeVisible();
      await expect(page.locator('[data-testid="algorithm-comparison-table"]')).toBeVisible();
      
      const algorithmRows = page.locator('[data-testid="algorithm-performance-row"]');
      algorithmRows.forEach(async (row) => {
        await expect(row.locator('[data-testid="algorithm-name"]')).not.toBeEmpty();
        await expect(row.locator('[data-testid="success-rate"]')).toContainText(/\d+%/);
        await expect(row.locator('[data-testid="avg-execution-time"]')).toContainText(/\d+(\.\d+)?\s*(ms|s)/);
        await expect(row.locator('[data-testid="avg-improvement"]')).toContainText(/\d+(\.\d+)?%/);
      });

      // Check constraint analysis
      await expect(page.locator('[data-testid="constraint-analysis-section"]')).toBeVisible();
      await expect(page.locator('[data-testid="most-common-violations"]')).toBeVisible();
      await expect(page.locator('[data-testid="resolution-success-rates"]')).toBeVisible();

      // Check improvement trends
      await expect(page.locator('[data-testid="improvement-trends-section"]')).toBeVisible();
      await expect(page.locator('[data-testid="trends-chart"]')).toBeVisible();
      
      // Check cost analysis
      await expect(page.locator('[data-testid="cost-analysis-section"]')).toBeVisible();
      await expect(page.locator('[data-testid="cost-savings-breakdown"]')).toBeVisible();
      
      const costSavingsCategories = page.locator('[data-testid="cost-saving-category"]');
      costSavingsCategories.forEach(async (category) => {
        await expect(category.locator('[data-testid="category-name"]')).not.toBeEmpty();
        await expect(category.locator('[data-testid="category-savings"]')).toContainText(/\$[\d,]+/);
        await expect(category.locator('[data-testid="category-percentage"]')).toContainText(/\d+%/);
      });
    });

    test('should export optimization results in multiple formats', async ({ page }) => {
      // First generate some optimization results
      await page.click('[data-testid="resource-allocation-optimization-tab"]');
      
      await page.click('[data-testid="select-projects"]');
      await page.check('[data-testid="project-checkbox-1"]');
      await page.click('[data-testid="apply-project-selection"]');
      
      await page.selectOption('[data-testid="optimization-algorithm"]', 'hybrid');
      await page.click('[data-testid="start-optimization"]');
      await expect(page.locator('[data-testid="optimization-loading"]')).not.toBeVisible({ timeout: 60000 });

      // Test CSV export
      const [csvDownload] = await Promise.all([
        page.waitForEvent('download'),
        page.click('[data-testid="export-optimization-csv"]')
      ]);
      
      expect(csvDownload.suggestedFilename()).toMatch(/optimization.*results.*\.csv$/);
      await csvDownload.saveAs(`./test-results/${csvDownload.suggestedFilename()}`);

      // Test detailed Excel export
      const [excelDownload] = await Promise.all([
        page.waitForEvent('download'),
        page.click('[data-testid="export-optimization-excel"]')
      ]);
      
      expect(excelDownload.suggestedFilename()).toMatch(/optimization.*analysis.*\.xlsx$/);
      await excelDownload.saveAs(`./test-results/${excelDownload.suggestedFilename()}`);

      // Test comprehensive PDF report
      const [pdfDownload] = await Promise.all([
        page.waitForEvent('download'),
        page.click('[data-testid="export-optimization-pdf"]')
      ]);
      
      expect(pdfDownload.suggestedFilename()).toMatch(/optimization.*report.*\.pdf$/);
      await pdfDownload.saveAs(`./test-results/${pdfDownload.suggestedFilename()}`);

      // Test JSON data export
      const [jsonDownload] = await Promise.all([
        page.waitForEvent('download'),
        page.click('[data-testid="export-optimization-json"]')
      ]);
      
      expect(jsonDownload.suggestedFilename()).toMatch(/optimization.*data.*\.json$/);
      await jsonDownload.saveAs(`./test-results/${jsonDownload.suggestedFilename()}`);
    });
  });

  test.describe('Error Handling and Edge Cases', () => {
    test('should handle optimization failures gracefully', async ({ page }) => {
      // Mock API failure
      await page.route('**/api/optimization/**', async route => {
        await route.fulfill({
          status: 500,
          body: JSON.stringify({ error: 'Optimization service temporarily unavailable' })
        });
      });

      await page.click('[data-testid="resource-allocation-optimization-tab"]');
      
      await page.click('[data-testid="select-projects"]');
      await page.check('[data-testid="project-checkbox-1"]');
      await page.click('[data-testid="apply-project-selection"]');

      await page.click('[data-testid="start-optimization"]');

      // Should show error message
      await expect(page.locator('[data-testid="optimization-error"]')).toBeVisible();
      await expect(page.locator('[data-testid="optimization-error"]')).toContainText(/optimization service temporarily unavailable|failed to optimize/i);

      // Should show retry and fallback options
      await expect(page.locator('[data-testid="retry-optimization"]')).toBeVisible();
      await expect(page.locator('[data-testid="fallback-options"]')).toBeVisible();
      await expect(page.locator('[data-testid="manual-adjustment-option"]')).toBeVisible();
    });

    test('should validate optimization parameters', async ({ page }) => {
      await page.click('[data-testid="resource-allocation-optimization-tab"]');

      // Try to start optimization without selecting projects
      await page.click('[data-testid="start-optimization"]');
      
      await expect(page.locator('[data-testid="validation-error"]')).toBeVisible();
      await expect(page.locator('[data-testid="validation-error"]')).toContainText(/please select at least one project/i);

      // Select project but use invalid objective weights
      await page.click('[data-testid="select-projects"]');
      await page.check('[data-testid="project-checkbox-1"]');
      await page.click('[data-testid="apply-project-selection"]');

      // Set weights that don't sum to 100
      await page.fill('[data-testid="maximize-utilization-weight"]', '50');
      await page.fill('[data-testid="minimize-conflicts-weight"]', '30');
      await page.fill('[data-testid="maximize-skill-match-weight"]', '30'); // Total = 110%

      await page.click('[data-testid="start-optimization"]');
      await expect(page.locator('[data-testid="validation-error"]')).toContainText(/objective weights must sum to 100/i);

      // Test invalid constraint values
      await page.fill('[data-testid="maximize-skill-match-weight"]', '20'); // Fix weights
      await page.fill('[data-testid="max-utilization-per-employee"]', '150'); // Invalid > 100%

      await page.click('[data-testid="start-optimization"]');
      await expect(page.locator('[data-testid="validation-error"]')).toContainText(/maximum utilization cannot exceed 100%/i);
    });

    test('should handle timeout scenarios', async ({ page }) => {
      // Mock slow API response
      await page.route('**/api/optimization/resource-allocation', async route => {
        // Delay response to simulate timeout
        await new Promise(resolve => setTimeout(resolve, 10000));
        await route.fulfill({
          status: 200,
          body: JSON.stringify({
            optimizationId: 'timeout-test',
            status: 'running'
          })
        });
      });

      await page.click('[data-testid="resource-allocation-optimization-tab"]');
      
      await page.click('[data-testid="select-projects"]');
      await page.check('[data-testid="project-checkbox-1"]');
      await page.click('[data-testid="apply-project-selection"]');

      // Set very low timeout for testing
      await page.fill('[data-testid="optimization-timeout"]', '5'); // 5 seconds

      await page.click('[data-testid="start-optimization"]');

      // Should show timeout message
      await expect(page.locator('[data-testid="optimization-timeout-warning"]')).toBeVisible({ timeout: 8000 });
      await expect(page.locator('[data-testid="optimization-timeout-warning"]')).toContainText(/optimization is taking longer than expected/i);

      // Should offer options to continue or cancel
      await expect(page.locator('[data-testid="continue-optimization"]')).toBeVisible();
      await expect(page.locator('[data-testid="cancel-optimization"]')).toBeVisible();
    });
  });
});

// Helper function
async function loginIfNeeded(page: Page): Promise<void> {
  const isLoggedIn = await page.locator('[data-testid="user-profile"]').isVisible();
  
  if (!isLoggedIn) {
    const loginButton = page.locator('[data-testid="login-button"]');
    if (await loginButton.isVisible()) {
      await loginButton.click();
      await page.fill('[data-testid="email-input"]', 'test@example.com');
      await page.fill('[data-testid="password-input"]', 'testpassword');
      await page.click('[data-testid="submit-login"]');
      await expect(page.locator('[data-testid="user-profile"]')).toBeVisible();
    }
  }
}