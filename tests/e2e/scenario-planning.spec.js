"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const test_1 = require("@playwright/test");
const testScenario = {
    name: 'Q1 2025 Resource Planning',
    description: 'Testing scenario planning functionality with realistic data',
    type: 'what-if',
    baseDate: '2025-01-01',
    forecastPeriodMonths: 6
};
const testAllocation = {
    allocationPercentage: 75,
    startDate: '2025-01-15',
    endDate: '2025-03-31',
    confidenceLevel: 4,
    estimatedHours: 480,
    notes: 'Senior developer allocation for mobile app project'
};
async function setupTestData(page) {
    await page.goto('/scenarios');
    await page.waitForLoadState('networkidle');
    const existingScenarios = page.locator('[data-testid="scenario-card"]', {
        hasText: testScenario.name
    });
    const count = await existingScenarios.count();
    for (let i = 0; i < count; i++) {
        await existingScenarios.first().locator('[data-testid="delete-scenario"]').click();
        await page.locator('[data-testid="confirm-delete"]').click();
        await page.waitForResponse(response => response.url().includes('/api/scenarios'));
    }
}
async function createTestScenario(page) {
    await page.locator('[data-testid="create-scenario-btn"]').click();
    await page.locator('[data-testid="scenario-name"]').fill(testScenario.name);
    await page.locator('[data-testid="scenario-description"]').fill(testScenario.description);
    await page.locator('[data-testid="scenario-type"]').selectOption(testScenario.type);
    await page.locator('[data-testid="scenario-base-date"]').fill(testScenario.baseDate);
    await page.locator('[data-testid="scenario-forecast-period"]').fill(testScenario.forecastPeriodMonths.toString());
    await page.locator('[data-testid="create-scenario-submit"]').click();
    await page.waitForResponse(response => response.url().includes('/api/scenarios') && response.request().method() === 'POST');
    return page.locator('[data-testid="scenario-card"]', {
        hasText: testScenario.name
    });
}
test_1.test.describe('Scenario Management', () => {
    test_1.test.beforeEach(async ({ page }) => {
        await setupTestData(page);
    });
    (0, test_1.test)('should create a new scenario successfully', async ({ page }) => {
        await page.goto('/scenarios');
        const scenarioCard = await createTestScenario(page);
        await (0, test_1.expect)(scenarioCard).toBeVisible();
        await (0, test_1.expect)(scenarioCard.locator('.scenario-name')).toHaveText(testScenario.name);
        await (0, test_1.expect)(scenarioCard.locator('.scenario-type')).toHaveText(testScenario.type);
        await scenarioCard.click();
        await page.waitForURL(/.*scenarios\/[^\/]+$/);
        await (0, test_1.expect)(page.locator('[data-testid="scenario-detail-name"]')).toHaveText(testScenario.name);
        await (0, test_1.expect)(page.locator('[data-testid="scenario-detail-description"]')).toHaveText(testScenario.description);
    });
    (0, test_1.test)('should edit scenario details', async ({ page }) => {
        await page.goto('/scenarios');
        const scenarioCard = await createTestScenario(page);
        await scenarioCard.locator('[data-testid="edit-scenario"]').click();
        const updatedName = testScenario.name + ' (Updated)';
        await page.locator('[data-testid="scenario-name"]').fill(updatedName);
        await page.locator('[data-testid="save-scenario-btn"]').click();
        await page.waitForResponse(response => response.url().includes('/api/scenarios') && response.request().method() === 'PUT');
        await (0, test_1.expect)(page.locator('[data-testid="scenario-detail-name"]')).toHaveText(updatedName);
    });
    (0, test_1.test)('should duplicate scenario with all allocations', async ({ page }) => {
        await page.goto('/scenarios');
        const scenarioCard = await createTestScenario(page);
        await scenarioCard.click();
        await page.locator('[data-testid="add-allocation-btn"]').click();
        await page.locator('[data-testid="allocation-project"]').selectOption({ index: 1 });
        await page.locator('[data-testid="allocation-employee"]').selectOption({ index: 1 });
        await page.locator('[data-testid="allocation-percentage"]').fill(testAllocation.allocationPercentage.toString());
        await page.locator('[data-testid="allocation-start-date"]').fill(testAllocation.startDate);
        await page.locator('[data-testid="allocation-end-date"]').fill(testAllocation.endDate);
        await page.locator('[data-testid="save-allocation-btn"]').click();
        await page.waitForResponse(response => response.url().includes('/allocations'));
        await page.locator('[data-testid="duplicate-scenario-btn"]').click();
        await page.locator('[data-testid="duplicate-scenario-name"]').fill(testScenario.name + ' (Copy)');
        await page.locator('[data-testid="confirm-duplicate-btn"]').click();
        await page.waitForResponse(response => response.url().includes('/api/scenarios') && response.url().includes('/duplicate'));
        await (0, test_1.expect)(page.locator('[data-testid="scenario-detail-name"]')).toHaveText(testScenario.name + ' (Copy)');
        const allocations = page.locator('[data-testid="allocation-row"]');
        await (0, test_1.expect)(allocations).toHaveCount(1);
    });
    (0, test_1.test)('should delete scenario with confirmation', async ({ page }) => {
        await page.goto('/scenarios');
        const scenarioCard = await createTestScenario(page);
        await scenarioCard.locator('[data-testid="delete-scenario"]').click();
        await page.locator('[data-testid="confirm-delete"]').click();
        await page.waitForResponse(response => response.url().includes('/api/scenarios') && response.request().method() === 'DELETE');
        await (0, test_1.expect)(page.locator('[data-testid="scenario-card"]', {
            hasText: testScenario.name
        })).not.toBeVisible();
    });
});
test_1.test.describe('Scenario Allocations', () => {
    let scenarioCard;
    test_1.test.beforeEach(async ({ page }) => {
        await setupTestData(page);
        scenarioCard = await createTestScenario(page);
        await scenarioCard.click();
    });
    (0, test_1.test)('should create resource allocation', async ({ page }) => {
        await page.locator('[data-testid="add-allocation-btn"]').click();
        await page.locator('[data-testid="allocation-project"]').selectOption({ index: 1 });
        await page.locator('[data-testid="allocation-employee"]').selectOption({ index: 1 });
        await page.locator('[data-testid="allocation-type"]').selectOption('probable');
        await page.locator('[data-testid="allocation-percentage"]').fill(testAllocation.allocationPercentage.toString());
        await page.locator('[data-testid="allocation-start-date"]').fill(testAllocation.startDate);
        await page.locator('[data-testid="allocation-end-date"]').fill(testAllocation.endDate);
        await page.locator('[data-testid="allocation-confidence"]').selectOption(testAllocation.confidenceLevel.toString());
        await page.locator('[data-testid="allocation-estimated-hours"]').fill(testAllocation.estimatedHours.toString());
        await page.locator('[data-testid="allocation-notes"]').fill(testAllocation.notes);
        await page.locator('[data-testid="save-allocation-btn"]').click();
        await page.waitForResponse(response => response.url().includes('/allocations'));
        const allocationRow = page.locator('[data-testid="allocation-row"]').first();
        await (0, test_1.expect)(allocationRow).toBeVisible();
        await (0, test_1.expect)(allocationRow.locator('[data-testid="allocation-percentage"]')).toHaveText(`${testAllocation.allocationPercentage}%`);
    });
    (0, test_1.test)('should detect allocation conflicts', async ({ page }) => {
        await page.locator('[data-testid="add-allocation-btn"]').click();
        await page.locator('[data-testid="allocation-project"]').selectOption({ index: 1 });
        await page.locator('[data-testid="allocation-employee"]').selectOption({ index: 1 });
        await page.locator('[data-testid="allocation-percentage"]').fill('75');
        await page.locator('[data-testid="allocation-start-date"]').fill('2025-01-15');
        await page.locator('[data-testid="allocation-end-date"]').fill('2025-02-15');
        await page.locator('[data-testid="save-allocation-btn"]').click();
        await page.waitForResponse(response => response.url().includes('/allocations'));
        await page.locator('[data-testid="add-allocation-btn"]').click();
        await page.locator('[data-testid="allocation-project"]').selectOption({ index: 2 });
        await page.locator('[data-testid="allocation-employee"]').selectOption({ index: 1 });
        await page.locator('[data-testid="allocation-percentage"]').fill('50');
        await page.locator('[data-testid="allocation-start-date"]').fill('2025-02-01');
        await page.locator('[data-testid="allocation-end-date"]').fill('2025-03-01');
        await page.locator('[data-testid="save-allocation-btn"]').click();
        await page.waitForResponse(response => response.url().includes('/allocations'));
        await page.locator('[data-testid="view-conflicts-btn"]').click();
        await page.waitForResponse(response => response.url().includes('/conflicts'));
        const conflicts = page.locator('[data-testid="conflict-row"]');
        await (0, test_1.expect)(conflicts).toHaveCount(1);
        await (0, test_1.expect)(conflicts.first().locator('[data-testid="total-allocation"]')).toHaveText('125%');
    });
    (0, test_1.test)('should update allocation with validation', async ({ page }) => {
        await page.locator('[data-testid="add-allocation-btn"]').click();
        await page.locator('[data-testid="allocation-project"]').selectOption({ index: 1 });
        await page.locator('[data-testid="allocation-employee"]').selectOption({ index: 1 });
        await page.locator('[data-testid="allocation-percentage"]').fill('50');
        await page.locator('[data-testid="allocation-start-date"]').fill('2025-01-15');
        await page.locator('[data-testid="save-allocation-btn"]').click();
        await page.waitForResponse(response => response.url().includes('/allocations'));
        await page.locator('[data-testid="edit-allocation"]').first().click();
        await page.locator('[data-testid="allocation-type"]').selectOption('tentative');
        await page.locator('[data-testid="allocation-percentage"]').fill('80');
        await page.locator('[data-testid="allocation-confidence"]').selectOption('2');
        await page.locator('[data-testid="save-allocation-btn"]').click();
        await page.waitForResponse(response => response.url().includes('/allocations') && response.request().method() === 'PUT');
        const allocationRow = page.locator('[data-testid="allocation-row"]').first();
        await (0, test_1.expect)(allocationRow.locator('[data-testid="allocation-type-badge"]')).toHaveText('Tentative');
        await (0, test_1.expect)(allocationRow.locator('[data-testid="allocation-percentage"]')).toHaveText('80%');
    });
    (0, test_1.test)('should validate allocation constraints', async ({ page }) => {
        await page.locator('[data-testid="add-allocation-btn"]').click();
        await page.locator('[data-testid="allocation-project"]').selectOption({ index: 1 });
        await page.locator('[data-testid="allocation-employee"]').selectOption({ index: 1 });
        await page.locator('[data-testid="allocation-percentage"]').fill('150');
        await page.locator('[data-testid="allocation-start-date"]').fill('2025-01-15');
        await page.locator('[data-testid="save-allocation-btn"]').click();
        await (0, test_1.expect)(page.locator('[data-testid="validation-error"]')).toBeVisible();
        await (0, test_1.expect)(page.locator('[data-testid="validation-error"]')).toContainText('exceed 100%');
    });
});
test_1.test.describe('Scenario Comparison', () => {
    let scenarioCardA;
    let scenarioCardB;
    test_1.test.beforeEach(async ({ page }) => {
        await setupTestData(page);
        scenarioCardA = await createTestScenario(page);
        await page.locator('[data-testid="create-scenario-btn"]').click();
        await page.locator('[data-testid="scenario-name"]').fill(testScenario.name + ' B');
        await page.locator('[data-testid="scenario-description"]').fill('Second scenario for comparison');
        await page.locator('[data-testid="scenario-type"]').selectOption('forecast');
        await page.locator('[data-testid="scenario-base-date"]').fill('2025-02-01');
        await page.locator('[data-testid="scenario-forecast-period"]').fill('12');
        await page.locator('[data-testid="create-scenario-submit"]').click();
        await page.waitForResponse(response => response.url().includes('/api/scenarios'));
        scenarioCardB = page.locator('[data-testid="scenario-card"]', {
            hasText: testScenario.name + ' B'
        });
    });
    (0, test_1.test)('should compare two scenarios side by side', async ({ page }) => {
        await page.goto('/scenarios');
        await scenarioCardA.locator('[data-testid="compare-scenario"]').click();
        await scenarioCardB.locator('[data-testid="compare-scenario"]').click();
        await page.locator('[data-testid="view-comparison-btn"]').click();
        await page.waitForURL(/.*scenarios\/compare/);
        await page.waitForResponse(response => response.url().includes('/compare'));
        await (0, test_1.expect)(page.locator('[data-testid="scenario-a-name"]')).toHaveText(testScenario.name);
        await (0, test_1.expect)(page.locator('[data-testid="scenario-b-name"]')).toHaveText(testScenario.name + ' B');
        await (0, test_1.expect)(page.locator('[data-testid="cost-comparison"]')).toBeVisible();
        await (0, test_1.expect)(page.locator('[data-testid="utilization-comparison"]')).toBeVisible();
        await (0, test_1.expect)(page.locator('[data-testid="risk-comparison"]')).toBeVisible();
    });
    (0, test_1.test)('should show detailed comparison metrics', async ({ page }) => {
        await page.goto('/scenarios');
        await scenarioCardA.locator('[data-testid="compare-scenario"]').click();
        await scenarioCardB.locator('[data-testid="compare-scenario"]').click();
        await page.locator('[data-testid="view-comparison-btn"]').click();
        await page.waitForResponse(response => response.url().includes('/compare'));
        await page.locator('[data-testid="detailed-metrics-tab"]').click();
        await (0, test_1.expect)(page.locator('[data-testid="resource-utilization-chart"]')).toBeVisible();
        await (0, test_1.expect)(page.locator('[data-testid="skill-gaps-comparison"]')).toBeVisible();
        await (0, test_1.expect)(page.locator('[data-testid="timeline-conflicts-comparison"]')).toBeVisible();
        await (0, test_1.expect)(page.locator('[data-testid="cost-breakdown-chart"]')).toBeVisible();
        await page.locator('[data-testid="show-skill-details"]').first().click();
        await (0, test_1.expect)(page.locator('[data-testid="skill-detail-modal"]')).toBeVisible();
    });
    (0, test_1.test)('should export comparison report', async ({ page }) => {
        await page.goto('/scenarios');
        await scenarioCardA.locator('[data-testid="compare-scenario"]').click();
        await scenarioCardB.locator('[data-testid="compare-scenario"]').click();
        await page.locator('[data-testid="view-comparison-btn"]').click();
        await page.waitForResponse(response => response.url().includes('/compare'));
        const downloadPromise = page.waitForEvent('download');
        await page.locator('[data-testid="export-comparison-pdf"]').click();
        const download = await downloadPromise;
        (0, test_1.expect)(download.suggestedFilename()).toBe(`scenario-comparison-${new Date().toISOString().split('T')[0]}.pdf`);
    });
});
test_1.test.describe('Skill Gap Analysis', () => {
    let scenarioCard;
    test_1.test.beforeEach(async ({ page }) => {
        await setupTestData(page);
        scenarioCard = await createTestScenario(page);
        await scenarioCard.click();
        const allocations = [
            { project: 1, employee: 1, percentage: 80, skill: 'React Development' },
            { project: 2, employee: 2, percentage: 60, skill: 'Node.js Backend' },
            { project: 3, employee: 3, percentage: 90, skill: 'DevOps Engineering' }
        ];
        for (const allocation of allocations) {
            await page.locator('[data-testid="add-allocation-btn"]').click();
            await page.locator('[data-testid="allocation-project"]').selectOption({ index: allocation.project });
            await page.locator('[data-testid="allocation-employee"]').selectOption({ index: allocation.employee });
            await page.locator('[data-testid="allocation-percentage"]').fill(allocation.percentage.toString());
            await page.locator('[data-testid="allocation-start-date"]').fill('2025-01-15');
            await page.locator('[data-testid="save-allocation-btn"]').click();
            await page.waitForResponse(response => response.url().includes('/allocations'));
        }
    });
    (0, test_1.test)('should analyze skill gaps with prioritization', async ({ page }) => {
        await page.locator('[data-testid="analyze-skill-gaps-btn"]').click();
        await page.waitForResponse(response => response.url().includes('/skill-gaps'));
        const skillGaps = page.locator('[data-testid="skill-gap-row"]');
        await (0, test_1.expect)(skillGaps).toHaveCountGreaterThan(0);
        const firstGap = skillGaps.first();
        await (0, test_1.expect)(firstGap.locator('[data-testid="skill-category"]')).toBeVisible();
        await (0, test_1.expect)(firstGap.locator('[data-testid="gap-hours"]')).toBeVisible();
        await (0, test_1.expect)(firstGap.locator('[data-testid="priority-badge"]')).toBeVisible();
        await (0, test_1.expect)(firstGap.locator('[data-testid="hiring-recommendation"]')).toBeVisible();
    });
    (0, test_1.test)('should show hiring recommendations based on skill gaps', async ({ page }) => {
        await page.locator('[data-testid="analyze-skill-gaps-btn"]').click();
        await page.waitForResponse(response => response.url().includes('/skill-gaps'));
        await page.locator('[data-testid="hiring-recommendations-tab"]').click();
        const recommendations = page.locator('[data-testid="hiring-recommendation-card"]');
        await (0, test_1.expect)(recommendations).toHaveCountGreaterThan(0);
        const firstRecommendation = recommendations.first();
        await (0, test_1.expect)(firstRecommendation.locator('[data-testid="skill-category"]')).toBeVisible();
        await (0, test_1.expect)(firstRecommendation.locator('[data-testid="recommended-hires"]')).toBeVisible();
        await (0, test_1.expect)(firstRecommendation.locator('[data-testid="urgency-badge"]')).toBeVisible();
        await (0, test_1.expect)(firstRecommendation.locator('[data-testid="estimated-cost"]')).toBeVisible();
    });
    (0, test_1.test)('should filter and sort skill gaps', async ({ page }) => {
        await page.locator('[data-testid="analyze-skill-gaps-btn"]').click();
        await page.waitForResponse(response => response.url().includes('/skill-gaps'));
        await page.locator('[data-testid="priority-filter"]').selectOption('critical');
        await page.waitForResponse(response => response.url().includes('/skill-gaps'));
        const criticalGaps = page.locator('[data-testid="skill-gap-row"]');
        for (let i = 0; i < await criticalGaps.count(); i++) {
            await (0, test_1.expect)(criticalGaps.nth(i).locator('[data-testid="priority-badge"]')).toHaveText('Critical');
        }
        await page.locator('[data-testid="sort-by-gap-hours"]').click();
        const gapHours = await page.locator('[data-testid="gap-hours"]').allTextContents();
        const numericGaps = gapHours.map(text => parseInt(text.replace(/\D/g, '')));
        (0, test_1.expect)(numericGaps).toEqual([...numericGaps].sort((a, b) => b - a));
    });
});
test_1.test.describe('Performance Tests', () => {
    (0, test_1.test)('should handle large scenario with many allocations', async ({ page }) => {
        await setupTestData(page);
        const scenarioCard = await createTestScenario(page);
        await scenarioCard.click();
        const startTime = Date.now();
        for (let i = 0; i < 50; i++) {
            await page.locator('[data-testid="add-allocation-btn"]').click();
            await page.locator('[data-testid="allocation-project"]').selectOption({ index: (i % 5) + 1 });
            await page.locator('[data-testid="allocation-employee"]').selectOption({ index: (i % 10) + 1 });
            await page.locator('[data-testid="allocation-percentage"]').fill((20 + (i % 5) * 10).toString());
            await page.locator('[data-testid="allocation-start-date"]').fill('2025-01-15');
            await page.locator('[data-testid="save-allocation-btn"]').click();
            await page.waitForResponse(response => response.url().includes('/allocations'));
        }
        const endTime = Date.now();
        const loadTime = endTime - startTime;
        (0, test_1.expect)(loadTime).toBeLessThan(30000);
        const allocations = page.locator('[data-testid="allocation-row"]');
        await (0, test_1.expect)(allocations).toHaveCount(50);
    });
    (0, test_1.test)('should handle concurrent scenario operations', async ({ browser }) => {
        const contexts = await Promise.all([
            browser.newContext(),
            browser.newContext(),
            browser.newContext()
        ]);
        const pages = await Promise.all(contexts.map(context => context.newPage()));
        await Promise.all([
            createTestScenario(pages[0]),
            createTestScenario(pages[1]),
            createTestScenario(pages[2])
        ]);
        for (const page of pages) {
            await page.goto('/scenarios');
            const scenarios = page.locator('[data-testid="scenario-card"]');
            await (0, test_1.expect)(scenarios).toHaveCountGreaterThanOrEqual(1);
        }
        await Promise.all(contexts.map(context => context.close()));
    });
});
test_1.test.describe('Accessibility', () => {
    (0, test_1.test)('should be accessible with keyboard navigation', async ({ page }) => {
        await setupTestData(page);
        await page.goto('/scenarios');
        await page.keyboard.press('Tab');
        await (0, test_1.expect)(page.locator('[data-testid="create-scenario-btn"]')).toBeFocused();
        await page.keyboard.press('Tab');
        await page.keyboard.press('Tab');
        await page.keyboard.press('Enter');
        await page.waitForURL(/.*scenarios\/[^\/]+$/);
    });
    (0, test_1.test)('should have proper ARIA labels and roles', async ({ page }) => {
        await setupTestData(page);
        const scenarioCard = await createTestScenario(page);
        await scenarioCard.click();
        await (0, test_1.expect)(page.locator('[data-testid="scenario-detail"]')).toHaveAttribute('role', 'main');
        await (0, test_1.expect)(page.locator('[data-testid="allocations-table"]')).toHaveAttribute('role', 'table');
        await (0, test_1.expect)(page.locator('[data-testid="add-allocation-btn"]')).toHaveAttribute('aria-label');
        await (0, test_1.expect)(page.locator('h1')).toBeVisible();
        await (0, test_1.expect)(page.locator('h2')).toBeVisible();
    });
});
//# sourceMappingURL=scenario-planning.spec.js.map