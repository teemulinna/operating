"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const test_1 = require("@playwright/test");
test_1.test.describe('AI Resource Optimization Features', () => {
    test_1.test.beforeEach(async ({ page }) => {
        await page.goto('/');
        await page.waitForLoadState('networkidle');
        await loginIfNeeded(page);
        await page.click('[data-testid="navigation-optimization"]');
        await (0, test_1.expect)(page).toHaveURL(/.*optimization/);
    });
    test_1.test.describe('Resource Allocation Optimization Workflow', () => {
        (0, test_1.test)('should optimize resource allocation using genetic algorithm', async ({ page }) => {
            await page.click('[data-testid="resource-allocation-optimization-tab"]');
            await (0, test_1.expect)(page.locator('h1')).toContainText('AI Resource Allocation Optimization');
            await page.click('[data-testid="configure-optimization-scope"]');
            await page.click('[data-testid="select-projects"]');
            await page.check('[data-testid="project-checkbox-1"]');
            await page.check('[data-testid="project-checkbox-2"]');
            await page.check('[data-testid="project-checkbox-3"]');
            await page.click('[data-testid="apply-project-selection"]');
            await page.fill('[data-testid="optimization-start-date"]', '2024-01-01');
            await page.fill('[data-testid="optimization-end-date"]', '2024-06-30');
            await page.click('[data-testid="configure-objectives"]');
            await page.fill('[data-testid="maximize-utilization-weight"]', '35');
            await page.fill('[data-testid="minimize-conflicts-weight"]', '30');
            await page.fill('[data-testid="maximize-skill-match-weight"]', '20');
            await page.fill('[data-testid="minimize-costs-weight"]', '10');
            await page.fill('[data-testid="balance-workload-weight"]', '5');
            const totalWeight = await page.locator('[data-testid="total-objectives-weight"]').textContent();
            (0, test_1.expect)(totalWeight).toBe('100');
            await page.click('[data-testid="configure-constraints"]');
            await page.fill('[data-testid="max-utilization-per-employee"]', '100');
            await page.fill('[data-testid="min-skill-match-threshold"]', '70');
            await page.fill('[data-testid="budget-limit"]', '500000');
            await page.check('[data-testid="time-constraints"]');
            await page.check('[data-testid="skill-constraints"]');
            await page.check('[data-testid="availability-constraints"]');
            await page.selectOption('[data-testid="optimization-algorithm"]', 'genetic');
            await page.fill('[data-testid="max-iterations"]', '100');
            await page.fill('[data-testid="convergence-threshold"]', '0.001');
            await page.fill('[data-testid="population-size"]', '30');
            await page.fill('[data-testid="mutation-rate"]', '0.1');
            await page.click('[data-testid="start-optimization"]');
            await (0, test_1.expect)(page.locator('[data-testid="optimization-loading"]')).toBeVisible();
            await (0, test_1.expect)(page.locator('[data-testid="optimization-progress-bar"]')).toBeVisible();
            await (0, test_1.expect)(page.locator('[data-testid="optimization-status"]')).toContainText('Running genetic algorithm');
            await (0, test_1.expect)(page.locator('[data-testid="optimization-loading"]')).not.toBeVisible({ timeout: 60000 });
            await (0, test_1.expect)(page.locator('[data-testid="optimization-results"]')).toBeVisible();
            const optimizationId = await page.locator('[data-testid="optimization-id"]').textContent();
            (0, test_1.expect)(optimizationId).toMatch(/opt_\d+_\w+/);
            await (0, test_1.expect)(page.locator('[data-testid="algorithm-used"]')).toContainText('genetic');
            await (0, test_1.expect)(page.locator('[data-testid="convergence-achieved"]')).toContainText('true');
            const iterations = await page.locator('[data-testid="iterations-completed"]').textContent();
            (0, test_1.expect)(parseInt(iterations || '0')).toBeGreaterThan(0);
            (0, test_1.expect)(parseInt(iterations || '101')).toBeLessThanOrEqual(100);
            await (0, test_1.expect)(page.locator('[data-testid="state-comparison"]')).toBeVisible();
            const currentUtilization = await page.locator('[data-testid="current-utilization"]').textContent();
            const optimizedUtilization = await page.locator('[data-testid="optimized-utilization"]').textContent();
            (0, test_1.expect)(parseFloat(currentUtilization || '0')).toBeGreaterThanOrEqual(0);
            (0, test_1.expect)(parseFloat(optimizedUtilization || '0')).toBeGreaterThanOrEqual(0);
            const currentConflicts = await page.locator('[data-testid="current-conflicts"]').textContent();
            const optimizedConflicts = await page.locator('[data-testid="optimized-conflicts"]').textContent();
            (0, test_1.expect)(parseInt(currentConflicts || '0')).toBeGreaterThanOrEqual(0);
            (0, test_1.expect)(parseInt(optimizedConflicts || '0')).toBeGreaterThanOrEqual(0);
            const utilizationImprovement = parseFloat(optimizedUtilization || '0') - parseFloat(currentUtilization || '0');
            const conflictReduction = parseInt(currentConflicts || '0') - parseInt(optimizedConflicts || '0');
            (0, test_1.expect)(utilizationImprovement >= -5 || conflictReduction >= 0).toBe(true);
            await (0, test_1.expect)(page.locator('[data-testid="improvements-summary"]')).toBeVisible();
            await (0, test_1.expect)(page.locator('[data-testid="utilization-improvement"]')).toContainText(/[+-]?\d+(\.\d+)?/);
            await (0, test_1.expect)(page.locator('[data-testid="conflict-reduction"]')).toContainText(/\d+/);
            await (0, test_1.expect)(page.locator('[data-testid="skill-match-improvement"]')).toContainText(/[+-]?\d+(\.\d+)?/);
            await (0, test_1.expect)(page.locator('[data-testid="performance-metrics"]')).toBeVisible();
            const objectiveScore = await page.locator('[data-testid="objective-score"]').textContent();
            (0, test_1.expect)(parseInt(objectiveScore || '0')).toBeGreaterThan(0);
            (0, test_1.expect)(parseInt(objectiveScore || '100')).toBeLessThanOrEqual(100);
            const constraintViolations = await page.locator('[data-testid="constraint-violations"]').textContent();
            (0, test_1.expect)(parseInt(constraintViolations || '0')).toBeGreaterThanOrEqual(0);
            const feasibilityScore = await page.locator('[data-testid="feasibility-score"]').textContent();
            (0, test_1.expect)(parseInt(feasibilityScore || '0')).toBeGreaterThan(50);
            await (0, test_1.expect)(page.locator('[data-testid="resource-changes"]')).toBeVisible();
            const changes = page.locator('[data-testid="resource-change-item"]');
            if (await changes.count() > 0) {
                const firstChange = changes.first();
                await (0, test_1.expect)(firstChange.locator('[data-testid="change-type"]')).toContainText(/(add|remove|modify|reassign)/);
                await (0, test_1.expect)(firstChange.locator('[data-testid="employee-name"]')).not.toBeEmpty();
                await (0, test_1.expect)(firstChange.locator('[data-testid="project-name"]')).not.toBeEmpty();
                await (0, test_1.expect)(firstChange.locator('[data-testid="change-priority"]')).toContainText(/(low|medium|high|critical)/);
                await (0, test_1.expect)(firstChange.locator('[data-testid="change-confidence"]')).toContainText(/\d+%/);
            }
        });
        (0, test_1.test)('should compare different optimization algorithms', async ({ page }) => {
            await page.click('[data-testid="algorithm-comparison-tab"]');
            await (0, test_1.expect)(page.locator('h2')).toContainText('Algorithm Performance Comparison');
            await page.click('[data-testid="select-projects-for-comparison"]');
            await page.check('[data-testid="project-checkbox-1"]');
            await page.check('[data-testid="project-checkbox-2"]');
            await page.click('[data-testid="apply-project-selection"]');
            await page.fill('[data-testid="comparison-maximize-utilization"]', '40');
            await page.fill('[data-testid="comparison-minimize-conflicts"]', '30');
            await page.fill('[data-testid="comparison-maximize-skill-match"]', '20');
            await page.fill('[data-testid="comparison-minimize-costs"]', '10');
            await page.check('[data-testid="algorithm-genetic"]');
            await page.check('[data-testid="algorithm-simulated-annealing"]');
            await page.check('[data-testid="algorithm-constraint-satisfaction"]');
            await page.check('[data-testid="algorithm-hybrid"]');
            await page.fill('[data-testid="comparison-max-iterations"]', '50');
            await page.fill('[data-testid="comparison-runs-per-algorithm"]', '3');
            await page.click('[data-testid="run-algorithm-comparison"]');
            await (0, test_1.expect)(page.locator('[data-testid="comparison-loading"]')).toBeVisible();
            await (0, test_1.expect)(page.locator('[data-testid="comparison-progress"]')).toBeVisible();
            await (0, test_1.expect)(page.locator('[data-testid="comparison-loading"]')).not.toBeVisible({ timeout: 120000 });
            await (0, test_1.expect)(page.locator('[data-testid="algorithm-comparison-results"]')).toBeVisible();
            await (0, test_1.expect)(page.locator('[data-testid="comparison-results-table"]')).toBeVisible();
            const algorithmRows = page.locator('[data-testid="algorithm-result-row"]');
            await (0, test_1.expect)(algorithmRows).toHaveCount(4);
            for (let i = 0; i < 4; i++) {
                const row = algorithmRows.nth(i);
                await (0, test_1.expect)(row.locator('[data-testid="algorithm-name"]')).toContainText(/(genetic|simulated_annealing|constraint_satisfaction|hybrid)/);
                await (0, test_1.expect)(row.locator('[data-testid="avg-objective-score"]')).toContainText(/\d+(\.\d+)?/);
                await (0, test_1.expect)(row.locator('[data-testid="avg-execution-time"]')).toContainText(/\d+(\.\d+)?\s*(ms|s)/);
                await (0, test_1.expect)(row.locator('[data-testid="convergence-rate"]')).toContainText(/\d+%/);
                await (0, test_1.expect)(row.locator('[data-testid="consistency-score"]')).toContainText(/\d+(\.\d+)?/);
            }
            await (0, test_1.expect)(page.locator('[data-testid="performance-comparison-chart"]')).toBeVisible();
            await (0, test_1.expect)(page.locator('[data-testid="execution-time-chart"]')).toBeVisible();
            await (0, test_1.expect)(page.locator('[data-testid="convergence-comparison-chart"]')).toBeVisible();
            await (0, test_1.expect)(page.locator('[data-testid="algorithm-recommendations"]')).toBeVisible();
            await (0, test_1.expect)(page.locator('[data-testid="best-overall-algorithm"]')).not.toBeEmpty();
            await (0, test_1.expect)(page.locator('[data-testid="best-speed-algorithm"]')).not.toBeEmpty();
            await (0, test_1.expect)(page.locator('[data-testid="best-accuracy-algorithm"]')).not.toBeEmpty();
            await (0, test_1.expect)(page.locator('[data-testid="detailed-analysis"]')).toBeVisible();
            const analysisPoints = page.locator('[data-testid="analysis-point"]');
            await (0, test_1.expect)(analysisPoints).toHaveCountGreaterThan(0);
            analysisPoints.forEach(async (point) => {
                await (0, test_1.expect)(point).not.toBeEmpty();
            });
        });
        (0, test_1.test)('should handle constraint satisfaction optimization', async ({ page }) => {
            await page.click('[data-testid="constraint-satisfaction-tab"]');
            await (0, test_1.expect)(page.locator('h2')).toContainText('Constraint Satisfaction Optimization');
            await page.click('[data-testid="create-constraint-scenario"]');
            await page.click('[data-testid="add-constraint-violation"]');
            await page.selectOption('[data-testid="violation-type-0"]', 'over_allocation');
            await page.selectOption('[data-testid="affected-employee-0"]', 'emp-1');
            await page.fill('[data-testid="violation-severity-0"]', '120');
            await page.click('[data-testid="add-constraint-violation"]');
            await page.selectOption('[data-testid="violation-type-1"]', 'skill_mismatch');
            await page.selectOption('[data-testid="affected-project-1"]', 'project-1');
            await page.fill('[data-testid="required-skill-level-1"]', '90');
            await page.fill('[data-testid="available-skill-level-1"]', '60');
            await page.fill('[data-testid="allocation-constraint-priority"]', '50');
            await page.fill('[data-testid="skill-constraint-priority"]', '30');
            await page.fill('[data-testid="timeline-constraint-priority"]', '20');
            await page.fill('[data-testid="max-employee-utilization"]', '100');
            await page.fill('[data-testid="min-skill-match-required"]', '75');
            await page.check('[data-testid="strict-constraint-mode"]');
            await page.selectOption('[data-testid="cs-algorithm"]', 'constraint_satisfaction');
            await page.fill('[data-testid="cs-max-iterations"]', '150');
            await page.click('[data-testid="run-constraint-satisfaction"]');
            await (0, test_1.expect)(page.locator('[data-testid="cs-optimization-loading"]')).toBeVisible();
            await (0, test_1.expect)(page.locator('[data-testid="cs-status"]')).toContainText('Resolving constraints');
            await (0, test_1.expect)(page.locator('[data-testid="cs-optimization-loading"]')).not.toBeVisible({ timeout: 45000 });
            await (0, test_1.expect)(page.locator('[data-testid="constraint-resolution-results"]')).toBeVisible();
            await (0, test_1.expect)(page.locator('[data-testid="constraints-resolved-count"]')).toContainText(/\d+/);
            await (0, test_1.expect)(page.locator('[data-testid="remaining-violations-count"]')).toContainText(/\d+/);
            const resolvedCount = await page.locator('[data-testid="constraints-resolved-count"]').textContent();
            (0, test_1.expect)(parseInt(resolvedCount || '0')).toBeGreaterThan(0);
            await (0, test_1.expect)(page.locator('[data-testid="constraint-resolutions"]')).toBeVisible();
            const resolutions = page.locator('[data-testid="constraint-resolution-item"]');
            if (await resolutions.count() > 0) {
                const firstResolution = resolutions.first();
                await (0, test_1.expect)(firstResolution.locator('[data-testid="constraint-type"]')).not.toBeEmpty();
                await (0, test_1.expect)(firstResolution.locator('[data-testid="resolution-action"]')).not.toBeEmpty();
                await (0, test_1.expect)(firstResolution.locator('[data-testid="resolution-status"]')).toContainText(/(resolved|partially_resolved|unresolved)/);
            }
            await (0, test_1.expect)(page.locator('[data-testid="post-optimization-utilization"]')).toBeVisible();
            const employeeUtilizations = page.locator('[data-testid="employee-utilization-item"]');
            employeeUtilizations.forEach(async (utilization) => {
                const utilizationValue = await utilization.locator('[data-testid="utilization-percentage"]').textContent();
                (0, test_1.expect)(parseInt(utilizationValue?.replace('%', '') || '0')).toBeLessThanOrEqual(105);
            });
            const feasibilityScore = await page.locator('[data-testid="cs-feasibility-score"]').textContent();
            (0, test_1.expect)(parseInt(feasibilityScore || '0')).toBeGreaterThan(70);
        });
        (0, test_1.test)('should provide alternative optimization solutions', async ({ page }) => {
            await page.click('[data-testid="alternative-solutions-tab"]');
            await (0, test_1.expect)(page.locator('h2')).toContainText('Alternative Optimization Solutions');
            await page.click('[data-testid="select-projects-for-alternatives"]');
            await page.check('[data-testid="project-checkbox-1"]');
            await page.check('[data-testid="project-checkbox-2"]');
            await page.check('[data-testid="project-checkbox-3"]');
            await page.click('[data-testid="apply-selection"]');
            await page.fill('[data-testid="num-alternatives-requested"]', '5');
            await page.check('[data-testid="explore-tradeoffs"]');
            await page.check('[data-testid="generate-hybrid-solutions"]');
            await page.selectOption('[data-testid="alternative-strategy"]', 'diverse_objectives');
            await page.click('[data-testid="generate-alternatives"]');
            await (0, test_1.expect)(page.locator('[data-testid="alternatives-loading"]')).toBeVisible();
            await (0, test_1.expect)(page.locator('[data-testid="alternatives-loading"]')).not.toBeVisible({ timeout: 60000 });
            await (0, test_1.expect)(page.locator('[data-testid="alternative-solutions-results"]')).toBeVisible();
            const alternatives = page.locator('[data-testid="alternative-solution-card"]');
            await (0, test_1.expect)(alternatives).toHaveCountGreaterThan(1);
            await (0, test_1.expect)(alternatives).toHaveCountLessThanOrEqual(5);
            const firstAlternative = alternatives.first();
            await (0, test_1.expect)(firstAlternative.locator('[data-testid="solution-id"]')).not.toBeEmpty();
            await (0, test_1.expect)(firstAlternative.locator('[data-testid="solution-score"]')).toContainText(/\d+(\.\d+)?/);
            await (0, test_1.expect)(firstAlternative.locator('[data-testid="solution-description"]')).not.toBeEmpty();
            await (0, test_1.expect)(firstAlternative.locator('[data-testid="feasibility-rating"]')).toContainText(/\d+(\.\d+)?/);
            await (0, test_1.expect)(firstAlternative.locator('[data-testid="implementation-complexity"]')).toContainText(/(low|medium|high)/);
            await firstAlternative.locator('[data-testid="expand-tradeoffs"]').click();
            await (0, test_1.expect)(firstAlternative.locator('[data-testid="tradeoffs-section"]')).toBeVisible();
            const tradeoffs = firstAlternative.locator('[data-testid="tradeoff-item"]');
            if (await tradeoffs.count() > 0) {
                const firstTradeoff = tradeoffs.first();
                await (0, test_1.expect)(firstTradeoff.locator('[data-testid="tradeoff-aspect"]')).not.toBeEmpty();
                await (0, test_1.expect)(firstTradeoff.locator('[data-testid="tradeoff-gain"]')).toContainText(/[+-]?\d+(\.\d+)?/);
                await (0, test_1.expect)(firstTradeoff.locator('[data-testid="tradeoff-loss"]')).toContainText(/[+-]?\d+(\.\d+)?/);
            }
            await (0, test_1.expect)(page.locator('[data-testid="solutions-comparison"]')).toBeVisible();
            await (0, test_1.expect)(page.locator('[data-testid="comparison-chart"]')).toBeVisible();
            await firstAlternative.locator('[data-testid="select-solution"]').click();
            await (0, test_1.expect)(page.locator('[data-testid="selected-solution-confirmation"]')).toBeVisible();
            await (0, test_1.expect)(page.locator('[data-testid="implement-solution"]')).toBeEnabled();
        });
    });
    test_1.test.describe('Real-time Optimization Updates', () => {
        (0, test_1.test)('should adapt optimization based on real-time changes', async ({ page }) => {
            await page.click('[data-testid="resource-allocation-optimization-tab"]');
            await page.click('[data-testid="select-projects"]');
            await page.check('[data-testid="project-checkbox-1"]');
            await page.check('[data-testid="project-checkbox-2"]');
            await page.click('[data-testid="apply-project-selection"]');
            await page.selectOption('[data-testid="optimization-algorithm"]', 'genetic');
            await page.click('[data-testid="start-optimization"]');
            await (0, test_1.expect)(page.locator('[data-testid="optimization-loading"]')).not.toBeVisible({ timeout: 60000 });
            const initialOptimizationId = await page.locator('[data-testid="optimization-id"]').textContent();
            await page.click('[data-testid="realtime-optimization-tab"]');
            await (0, test_1.expect)(page.locator('h2')).toContainText('Real-Time Optimization Updates');
            await page.fill('[data-testid="base-optimization-id"]', initialOptimizationId || '');
            await page.click('[data-testid="add-realtime-change"]');
            await page.selectOption('[data-testid="change-type-0"]', 'new_project');
            await page.fill('[data-testid="project-name-0"]', 'Urgent Client Request');
            await page.fill('[data-testid="project-priority-0"]', 'high');
            await page.fill('[data-testid="project-team-size-0"]', '4');
            await page.fill('[data-testid="project-duration-0"]', '6');
            await page.click('[data-testid="add-realtime-change"]');
            await page.selectOption('[data-testid="change-type-1"]', 'availability_change');
            await page.selectOption('[data-testid="affected-employee-1"]', 'emp-1');
            await page.fill('[data-testid="new-availability-1"]', '50');
            await page.click('[data-testid="add-realtime-change"]');
            await page.selectOption('[data-testid="change-type-2"]', 'skill_update');
            await page.selectOption('[data-testid="employee-2"]', 'emp-2');
            await page.selectOption('[data-testid="skill-updated-2"]', 'React');
            await page.selectOption('[data-testid="new-proficiency-2"]', 'expert');
            await page.click('[data-testid="run-realtime-reoptimization"]');
            await (0, test_1.expect)(page.locator('[data-testid="realtime-loading"]')).toBeVisible();
            await (0, test_1.expect)(page.locator('[data-testid="realtime-status"]')).toContainText('Adapting to changes');
            await (0, test_1.expect)(page.locator('[data-testid="realtime-loading"]')).not.toBeVisible({ timeout: 45000 });
            await (0, test_1.expect)(page.locator('[data-testid="realtime-optimization-results"]')).toBeVisible();
            const newOptimizationId = await page.locator('[data-testid="updated-optimization-id"]').textContent();
            (0, test_1.expect)(newOptimizationId).not.toBe(initialOptimizationId);
            await (0, test_1.expect)(page.locator('[data-testid="change-impact-analysis"]')).toBeVisible();
            await (0, test_1.expect)(page.locator('[data-testid="total-changes-processed"]')).toContainText('3');
            const impactSummary = page.locator('[data-testid="impact-summary-item"]');
            await (0, test_1.expect)(impactSummary).toHaveCountGreaterThan(0);
            await (0, test_1.expect)(page.locator('[data-testid="reallocation-recommendations"]')).toBeVisible();
            const reallocations = page.locator('[data-testid="reallocation-item"]');
            reallocations.forEach(async (reallocation) => {
                await (0, test_1.expect)(reallocation.locator('[data-testid="reallocation-type"]')).not.toBeEmpty();
                await (0, test_1.expect)(reallocation.locator('[data-testid="reallocation-reason"]')).not.toBeEmpty();
                await (0, test_1.expect)(reallocation.locator('[data-testid="reallocation-impact"]')).toContainText(/\d+/);
            });
            await (0, test_1.expect)(page.locator('[data-testid="before-after-comparison"]')).toBeVisible();
            await (0, test_1.expect)(page.locator('[data-testid="before-optimization-metrics"]')).toBeVisible();
            await (0, test_1.expect)(page.locator('[data-testid="after-optimization-metrics"]')).toBeVisible();
        });
    });
    test_1.test.describe('Optimization Analytics and Reporting', () => {
        (0, test_1.test)('should generate optimization performance reports', async ({ page }) => {
            await page.click('[data-testid="optimization-analytics-tab"]');
            await (0, test_1.expect)(page.locator('h2')).toContainText('Optimization Analytics & Reporting');
            await page.fill('[data-testid="report-start-date"]', '2024-01-01');
            await page.fill('[data-testid="report-end-date"]', '2024-06-30');
            await page.check('[data-testid="include-algorithm-performance"]');
            await page.check('[data-testid="include-constraint-analysis"]');
            await page.check('[data-testid="include-improvement-trends"]');
            await page.check('[data-testid="include-cost-analysis"]');
            await page.selectOption('[data-testid="report-format"]', 'comprehensive');
            await page.click('[data-testid="generate-analytics-report"]');
            await (0, test_1.expect)(page.locator('[data-testid="report-generation-loading"]')).toBeVisible();
            await (0, test_1.expect)(page.locator('[data-testid="report-generation-loading"]')).not.toBeVisible({ timeout: 30000 });
            await (0, test_1.expect)(page.locator('[data-testid="analytics-report"]')).toBeVisible();
            await (0, test_1.expect)(page.locator('[data-testid="executive-summary"]')).toBeVisible();
            await (0, test_1.expect)(page.locator('[data-testid="total-optimizations-run"]')).toContainText(/\d+/);
            await (0, test_1.expect)(page.locator('[data-testid="average-improvement"]')).toContainText(/\d+(\.\d+)?%/);
            await (0, test_1.expect)(page.locator('[data-testid="total-cost-savings"]')).toContainText(/\$[\d,]+/);
            await (0, test_1.expect)(page.locator('[data-testid="algorithm-performance-section"]')).toBeVisible();
            await (0, test_1.expect)(page.locator('[data-testid="algorithm-comparison-table"]')).toBeVisible();
            const algorithmRows = page.locator('[data-testid="algorithm-performance-row"]');
            algorithmRows.forEach(async (row) => {
                await (0, test_1.expect)(row.locator('[data-testid="algorithm-name"]')).not.toBeEmpty();
                await (0, test_1.expect)(row.locator('[data-testid="success-rate"]')).toContainText(/\d+%/);
                await (0, test_1.expect)(row.locator('[data-testid="avg-execution-time"]')).toContainText(/\d+(\.\d+)?\s*(ms|s)/);
                await (0, test_1.expect)(row.locator('[data-testid="avg-improvement"]')).toContainText(/\d+(\.\d+)?%/);
            });
            await (0, test_1.expect)(page.locator('[data-testid="constraint-analysis-section"]')).toBeVisible();
            await (0, test_1.expect)(page.locator('[data-testid="most-common-violations"]')).toBeVisible();
            await (0, test_1.expect)(page.locator('[data-testid="resolution-success-rates"]')).toBeVisible();
            await (0, test_1.expect)(page.locator('[data-testid="improvement-trends-section"]')).toBeVisible();
            await (0, test_1.expect)(page.locator('[data-testid="trends-chart"]')).toBeVisible();
            await (0, test_1.expect)(page.locator('[data-testid="cost-analysis-section"]')).toBeVisible();
            await (0, test_1.expect)(page.locator('[data-testid="cost-savings-breakdown"]')).toBeVisible();
            const costSavingsCategories = page.locator('[data-testid="cost-saving-category"]');
            costSavingsCategories.forEach(async (category) => {
                await (0, test_1.expect)(category.locator('[data-testid="category-name"]')).not.toBeEmpty();
                await (0, test_1.expect)(category.locator('[data-testid="category-savings"]')).toContainText(/\$[\d,]+/);
                await (0, test_1.expect)(category.locator('[data-testid="category-percentage"]')).toContainText(/\d+%/);
            });
        });
        (0, test_1.test)('should export optimization results in multiple formats', async ({ page }) => {
            await page.click('[data-testid="resource-allocation-optimization-tab"]');
            await page.click('[data-testid="select-projects"]');
            await page.check('[data-testid="project-checkbox-1"]');
            await page.click('[data-testid="apply-project-selection"]');
            await page.selectOption('[data-testid="optimization-algorithm"]', 'hybrid');
            await page.click('[data-testid="start-optimization"]');
            await (0, test_1.expect)(page.locator('[data-testid="optimization-loading"]')).not.toBeVisible({ timeout: 60000 });
            const [csvDownload] = await Promise.all([
                page.waitForEvent('download'),
                page.click('[data-testid="export-optimization-csv"]')
            ]);
            (0, test_1.expect)(csvDownload.suggestedFilename()).toMatch(/optimization.*results.*\.csv$/);
            await csvDownload.saveAs(`./test-results/${csvDownload.suggestedFilename()}`);
            const [excelDownload] = await Promise.all([
                page.waitForEvent('download'),
                page.click('[data-testid="export-optimization-excel"]')
            ]);
            (0, test_1.expect)(excelDownload.suggestedFilename()).toMatch(/optimization.*analysis.*\.xlsx$/);
            await excelDownload.saveAs(`./test-results/${excelDownload.suggestedFilename()}`);
            const [pdfDownload] = await Promise.all([
                page.waitForEvent('download'),
                page.click('[data-testid="export-optimization-pdf"]')
            ]);
            (0, test_1.expect)(pdfDownload.suggestedFilename()).toMatch(/optimization.*report.*\.pdf$/);
            await pdfDownload.saveAs(`./test-results/${pdfDownload.suggestedFilename()}`);
            const [jsonDownload] = await Promise.all([
                page.waitForEvent('download'),
                page.click('[data-testid="export-optimization-json"]')
            ]);
            (0, test_1.expect)(jsonDownload.suggestedFilename()).toMatch(/optimization.*data.*\.json$/);
            await jsonDownload.saveAs(`./test-results/${jsonDownload.suggestedFilename()}`);
        });
    });
    test_1.test.describe('Error Handling and Edge Cases', () => {
        (0, test_1.test)('should handle optimization failures gracefully', async ({ page }) => {
            await page.route('**/api/optimization/**', async (route) => {
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
            await (0, test_1.expect)(page.locator('[data-testid="optimization-error"]')).toBeVisible();
            await (0, test_1.expect)(page.locator('[data-testid="optimization-error"]')).toContainText(/optimization service temporarily unavailable|failed to optimize/i);
            await (0, test_1.expect)(page.locator('[data-testid="retry-optimization"]')).toBeVisible();
            await (0, test_1.expect)(page.locator('[data-testid="fallback-options"]')).toBeVisible();
            await (0, test_1.expect)(page.locator('[data-testid="manual-adjustment-option"]')).toBeVisible();
        });
        (0, test_1.test)('should validate optimization parameters', async ({ page }) => {
            await page.click('[data-testid="resource-allocation-optimization-tab"]');
            await page.click('[data-testid="start-optimization"]');
            await (0, test_1.expect)(page.locator('[data-testid="validation-error"]')).toBeVisible();
            await (0, test_1.expect)(page.locator('[data-testid="validation-error"]')).toContainText(/please select at least one project/i);
            await page.click('[data-testid="select-projects"]');
            await page.check('[data-testid="project-checkbox-1"]');
            await page.click('[data-testid="apply-project-selection"]');
            await page.fill('[data-testid="maximize-utilization-weight"]', '50');
            await page.fill('[data-testid="minimize-conflicts-weight"]', '30');
            await page.fill('[data-testid="maximize-skill-match-weight"]', '30');
            await page.click('[data-testid="start-optimization"]');
            await (0, test_1.expect)(page.locator('[data-testid="validation-error"]')).toContainText(/objective weights must sum to 100/i);
            await page.fill('[data-testid="maximize-skill-match-weight"]', '20');
            await page.fill('[data-testid="max-utilization-per-employee"]', '150');
            await page.click('[data-testid="start-optimization"]');
            await (0, test_1.expect)(page.locator('[data-testid="validation-error"]')).toContainText(/maximum utilization cannot exceed 100%/i);
        });
        (0, test_1.test)('should handle timeout scenarios', async ({ page }) => {
            await page.route('**/api/optimization/resource-allocation', async (route) => {
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
            await page.fill('[data-testid="optimization-timeout"]', '5');
            await page.click('[data-testid="start-optimization"]');
            await (0, test_1.expect)(page.locator('[data-testid="optimization-timeout-warning"]')).toBeVisible({ timeout: 8000 });
            await (0, test_1.expect)(page.locator('[data-testid="optimization-timeout-warning"]')).toContainText(/optimization is taking longer than expected/i);
            await (0, test_1.expect)(page.locator('[data-testid="continue-optimization"]')).toBeVisible();
            await (0, test_1.expect)(page.locator('[data-testid="cancel-optimization"]')).toBeVisible();
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
//# sourceMappingURL=optimization.spec.js.map