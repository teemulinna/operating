// Playwright E2E Tests for Scenario Planning
import { test, expect, Page, BrowserContext } from '@playwright/test';

// Test data setup
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

// Helper functions for test setup
async function setupTestData(page: Page) {
  // Navigate to scenarios page
  await page.goto('/scenarios');
  await page.waitForLoadState('networkidle');
  
  // Clean up any existing test scenarios
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

async function createTestScenario(page: Page) {
  await page.locator('[data-testid="create-scenario-btn"]').click();
  
  // Fill scenario form
  await page.locator('[data-testid="scenario-name"]').fill(testScenario.name);
  await page.locator('[data-testid="scenario-description"]').fill(testScenario.description);
  await page.locator('[data-testid="scenario-type"]').selectOption(testScenario.type);
  await page.locator('[data-testid="scenario-base-date"]').fill(testScenario.baseDate);
  await page.locator('[data-testid="scenario-forecast-period"]').fill(testScenario.forecastPeriodMonths.toString());
  
  // Submit form
  await page.locator('[data-testid="create-scenario-submit"]').click();
  await page.waitForResponse(response => 
    response.url().includes('/api/scenarios') && response.request().method() === 'POST'
  );
  
  return page.locator('[data-testid="scenario-card"]', {
    hasText: testScenario.name
  });
}

// Scenario Management Tests
test.describe('Scenario Management', () => {
  test.beforeEach(async ({ page }) => {
    await setupTestData(page);
  });

  test('should create a new scenario successfully', async ({ page }) => {
    await page.goto('/scenarios');
    
    // Create scenario
    const scenarioCard = await createTestScenario(page);
    
    // Verify scenario appears in list
    await expect(scenarioCard).toBeVisible();
    await expect(scenarioCard.locator('.scenario-name')).toHaveText(testScenario.name);
    await expect(scenarioCard.locator('.scenario-type')).toHaveText(testScenario.type);
    
    // Verify scenario details
    await scenarioCard.click();
    await page.waitForURL(/.*scenarios\/[^\/]+$/);
    await expect(page.locator('[data-testid="scenario-detail-name"]')).toHaveText(testScenario.name);
    await expect(page.locator('[data-testid="scenario-detail-description"]')).toHaveText(testScenario.description);
  });

  test('should edit scenario details', async ({ page }) => {
    await page.goto('/scenarios');
    
    // Create scenario
    const scenarioCard = await createTestScenario(page);
    
    // Edit scenario
    await scenarioCard.locator('[data-testid="edit-scenario"]').click();
    
    const updatedName = testScenario.name + ' (Updated)';
    await page.locator('[data-testid="scenario-name"]').fill(updatedName);
    await page.locator('[data-testid="save-scenario-btn"]').click();
    
    await page.waitForResponse(response => 
      response.url().includes('/api/scenarios') && response.request().method() === 'PUT'
    );
    
    // Verify update
    await expect(page.locator('[data-testid="scenario-detail-name"]')).toHaveText(updatedName);
  });

  test('should duplicate scenario with all allocations', async ({ page }) => {
    await page.goto('/scenarios');
    
    // Create scenario
    const scenarioCard = await createTestScenario(page);
    
    // Add an allocation first
    await scenarioCard.click();
    await page.locator('[data-testid="add-allocation-btn"]').click();
    
    await page.locator('[data-testid="allocation-project"]').selectOption({ index: 1 });
    await page.locator('[data-testid="allocation-employee"]').selectOption({ index: 1 });
    await page.locator('[data-testid="allocation-percentage"]').fill(testAllocation.allocationPercentage.toString());
    await page.locator('[data-testid="allocation-start-date"]').fill(testAllocation.startDate);
    await page.locator('[data-testid="allocation-end-date"]').fill(testAllocation.endDate);
    
    await page.locator('[data-testid="save-allocation-btn"]').click();
    await page.waitForResponse(response => response.url().includes('/allocations'));
    
    // Duplicate scenario
    await page.locator('[data-testid="duplicate-scenario-btn"]').click();
    await page.locator('[data-testid="duplicate-scenario-name"]').fill(testScenario.name + ' (Copy)');
    await page.locator('[data-testid="confirm-duplicate-btn"]').click();
    
    await page.waitForResponse(response => 
      response.url().includes('/api/scenarios') && response.url().includes('/duplicate')
    );
    
    // Verify duplication
    await expect(page.locator('[data-testid="scenario-detail-name"]')).toHaveText(testScenario.name + ' (Copy)');
    
    // Verify allocations were copied
    const allocations = page.locator('[data-testid="allocation-row"]');
    await expect(allocations).toHaveCount(1);
  });

  test('should delete scenario with confirmation', async ({ page }) => {
    await page.goto('/scenarios');
    
    // Create scenario
    const scenarioCard = await createTestScenario(page);
    
    // Delete scenario
    await scenarioCard.locator('[data-testid="delete-scenario"]').click();
    
    // Confirm deletion in modal
    await page.locator('[data-testid="confirm-delete"]').click();
    await page.waitForResponse(response => 
      response.url().includes('/api/scenarios') && response.request().method() === 'DELETE'
    );
    
    // Verify scenario is removed from list
    await expect(page.locator('[data-testid="scenario-card"]', {
      hasText: testScenario.name
    })).not.toBeVisible();
  });
});

// Scenario Allocation Tests
test.describe('Scenario Allocations', () => {
  let scenarioCard: any;

  test.beforeEach(async ({ page }) => {
    await setupTestData(page);
    scenarioCard = await createTestScenario(page);
    await scenarioCard.click();
  });

  test('should create resource allocation', async ({ page }) => {
    // Add allocation
    await page.locator('[data-testid="add-allocation-btn"]').click();
    
    // Fill allocation form
    await page.locator('[data-testid="allocation-project"]').selectOption({ index: 1 });
    await page.locator('[data-testid="allocation-employee"]').selectOption({ index: 1 });
    await page.locator('[data-testid="allocation-type"]').selectOption('probable');
    await page.locator('[data-testid="allocation-percentage"]').fill(testAllocation.allocationPercentage.toString());
    await page.locator('[data-testid="allocation-start-date"]').fill(testAllocation.startDate);
    await page.locator('[data-testid="allocation-end-date"]').fill(testAllocation.endDate);
    await page.locator('[data-testid="allocation-confidence"]').selectOption(testAllocation.confidenceLevel.toString());
    await page.locator('[data-testid="allocation-estimated-hours"]').fill(testAllocation.estimatedHours.toString());
    await page.locator('[data-testid="allocation-notes"]').fill(testAllocation.notes);
    
    // Save allocation
    await page.locator('[data-testid="save-allocation-btn"]').click();
    await page.waitForResponse(response => response.url().includes('/allocations'));
    
    // Verify allocation appears
    const allocationRow = page.locator('[data-testid="allocation-row"]').first();
    await expect(allocationRow).toBeVisible();
    await expect(allocationRow.locator('[data-testid="allocation-percentage"]')).toHaveText(`${testAllocation.allocationPercentage}%`);
  });

  test('should detect allocation conflicts', async ({ page }) => {
    // Create first allocation (75%)
    await page.locator('[data-testid="add-allocation-btn"]').click();
    await page.locator('[data-testid="allocation-project"]').selectOption({ index: 1 });
    await page.locator('[data-testid="allocation-employee"]').selectOption({ index: 1 });
    await page.locator('[data-testid="allocation-percentage"]').fill('75');
    await page.locator('[data-testid="allocation-start-date"]').fill('2025-01-15');
    await page.locator('[data-testid="allocation-end-date"]').fill('2025-02-15');
    await page.locator('[data-testid="save-allocation-btn"]').click();
    await page.waitForResponse(response => response.url().includes('/allocations'));
    
    // Create conflicting allocation (50% for same employee, overlapping dates)
    await page.locator('[data-testid="add-allocation-btn"]').click();
    await page.locator('[data-testid="allocation-project"]').selectOption({ index: 2 }); // Different project
    await page.locator('[data-testid="allocation-employee"]').selectOption({ index: 1 }); // Same employee
    await page.locator('[data-testid="allocation-percentage"]').fill('50');
    await page.locator('[data-testid="allocation-start-date"]').fill('2025-02-01');
    await page.locator('[data-testid="allocation-end-date"]').fill('2025-03-01');
    await page.locator('[data-testid="save-allocation-btn"]').click();
    await page.waitForResponse(response => response.url().includes('/allocations'));
    
    // Check conflicts view
    await page.locator('[data-testid="view-conflicts-btn"]').click();
    await page.waitForResponse(response => response.url().includes('/conflicts'));
    
    // Verify conflict is detected
    const conflicts = page.locator('[data-testid="conflict-row"]');
    await expect(conflicts).toHaveCount(1);
    await expect(conflicts.first().locator('[data-testid="total-allocation"]')).toHaveText('125%');
  });

  test('should update allocation with validation', async ({ page }) => {
    // Create initial allocation
    await page.locator('[data-testid="add-allocation-btn"]').click();
    await page.locator('[data-testid="allocation-project"]').selectOption({ index: 1 });
    await page.locator('[data-testid="allocation-employee"]').selectOption({ index: 1 });
    await page.locator('[data-testid="allocation-percentage"]').fill('50');
    await page.locator('[data-testid="allocation-start-date"]').fill('2025-01-15');
    await page.locator('[data-testid="save-allocation-btn"]').click();
    await page.waitForResponse(response => response.url().includes('/allocations'));
    
    // Edit allocation
    await page.locator('[data-testid="edit-allocation"]').first().click();
    
    // Update to tentative status
    await page.locator('[data-testid="allocation-type"]').selectOption('tentative');
    await page.locator('[data-testid="allocation-percentage"]').fill('80');
    await page.locator('[data-testid="allocation-confidence"]').selectOption('2'); // Lower confidence for tentative
    
    await page.locator('[data-testid="save-allocation-btn"]').click();
    await page.waitForResponse(response => 
      response.url().includes('/allocations') && response.request().method() === 'PUT'
    );
    
    // Verify update
    const allocationRow = page.locator('[data-testid="allocation-row"]').first();
    await expect(allocationRow.locator('[data-testid="allocation-type-badge"]')).toHaveText('Tentative');
    await expect(allocationRow.locator('[data-testid="allocation-percentage"]')).toHaveText('80%');
  });

  test('should validate allocation constraints', async ({ page }) => {
    // Try to create allocation exceeding 100%
    await page.locator('[data-testid="add-allocation-btn"]').click();
    await page.locator('[data-testid="allocation-project"]').selectOption({ index: 1 });
    await page.locator('[data-testid="allocation-employee"]').selectOption({ index: 1 });
    await page.locator('[data-testid="allocation-percentage"]').fill('150'); // Invalid percentage
    await page.locator('[data-testid="allocation-start-date"]').fill('2025-01-15');
    
    await page.locator('[data-testid="save-allocation-btn"]').click();
    
    // Verify validation error
    await expect(page.locator('[data-testid="validation-error"]')).toBeVisible();
    await expect(page.locator('[data-testid="validation-error"]')).toContainText('exceed 100%');
  });
});

// Scenario Comparison Tests
test.describe('Scenario Comparison', () => {
  let scenarioCardA: any;
  let scenarioCardB: any;

  test.beforeEach(async ({ page }) => {
    await setupTestData(page);
    
    // Create first scenario
    scenarioCardA = await createTestScenario(page);
    
    // Create second scenario
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

  test('should compare two scenarios side by side', async ({ page }) => {
    await page.goto('/scenarios');
    
    // Select first scenario for comparison
    await scenarioCardA.locator('[data-testid="compare-scenario"]').click();
    
    // Select second scenario for comparison
    await scenarioCardB.locator('[data-testid="compare-scenario"]').click();
    
    // Navigate to comparison view
    await page.locator('[data-testid="view-comparison-btn"]').click();
    await page.waitForURL(/.*scenarios\/compare/);
    await page.waitForResponse(response => response.url().includes('/compare'));
    
    // Verify comparison interface
    await expect(page.locator('[data-testid="scenario-a-name"]')).toHaveText(testScenario.name);
    await expect(page.locator('[data-testid="scenario-b-name"]')).toHaveText(testScenario.name + ' B');
    
    // Check comparison metrics
    await expect(page.locator('[data-testid="cost-comparison"]')).toBeVisible();
    await expect(page.locator('[data-testid="utilization-comparison"]')).toBeVisible();
    await expect(page.locator('[data-testid="risk-comparison"]')).toBeVisible();
  });

  test('should show detailed comparison metrics', async ({ page }) => {
    // Start comparison
    await page.goto('/scenarios');
    await scenarioCardA.locator('[data-testid="compare-scenario"]').click();
    await scenarioCardB.locator('[data-testid="compare-scenario"]').click();
    await page.locator('[data-testid="view-comparison-btn"]').click();
    await page.waitForResponse(response => response.url().includes('/compare'));
    
    // Check detailed metrics sections
    await page.locator('[data-testid="detailed-metrics-tab"]').click();
    
    // Verify detailed comparison sections
    await expect(page.locator('[data-testid="resource-utilization-chart"]')).toBeVisible();
    await expect(page.locator('[data-testid="skill-gaps-comparison"]')).toBeVisible();
    await expect(page.locator('[data-testid="timeline-conflicts-comparison"]')).toBeVisible();
    await expect(page.locator('[data-testid="cost-breakdown-chart"]')).toBeVisible();
    
    // Test interactive elements
    await page.locator('[data-testid="show-skill-details"]').first().click();
    await expect(page.locator('[data-testid="skill-detail-modal"]')).toBeVisible();
  });

  test('should export comparison report', async ({ page }) => {
    // Navigate to comparison
    await page.goto('/scenarios');
    await scenarioCardA.locator('[data-testid="compare-scenario"]').click();
    await scenarioCardB.locator('[data-testid="compare-scenario"]').click();
    await page.locator('[data-testid="view-comparison-btn"]').click();
    await page.waitForResponse(response => response.url().includes('/compare'));
    
    // Start download
    const downloadPromise = page.waitForEvent('download');
    await page.locator('[data-testid="export-comparison-pdf"]').click();
    
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toBe(`scenario-comparison-${new Date().toISOString().split('T')[0]}.pdf`);
  });
});

// Skill Gap Analysis Tests
test.describe('Skill Gap Analysis', () => {
  let scenarioCard: any;

  test.beforeEach(async ({ page }) => {
    await setupTestData(page);
    scenarioCard = await createTestScenario(page);
    await scenarioCard.click();
    
    // Add some allocations for meaningful skill gap analysis
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

  test('should analyze skill gaps with prioritization', async ({ page }) => {
    // Navigate to skill gaps analysis
    await page.locator('[data-testid="analyze-skill-gaps-btn"]').click();
    await page.waitForResponse(response => response.url().includes('/skill-gaps'));
    
    // Verify skill gaps are displayed
    const skillGaps = page.locator('[data-testid="skill-gap-row"]');
    await expect(skillGaps).toHaveCountGreaterThan(0);
    
    // Check gap details
    const firstGap = skillGaps.first();
    await expect(firstGap.locator('[data-testid="skill-category"]')).toBeVisible();
    await expect(firstGap.locator('[data-testid="gap-hours"]')).toBeVisible();
    await expect(firstGap.locator('[data-testid="priority-badge"]')).toBeVisible();
    await expect(firstGap.locator('[data-testid="hiring-recommendation"]')).toBeVisible();
  });

  test('should show hiring recommendations based on skill gaps', async ({ page }) => {
    await page.locator('[data-testid="analyze-skill-gaps-btn"]').click();
    await page.waitForResponse(response => response.url().includes('/skill-gaps'));
    
    // Navigate to hiring recommendations
    await page.locator('[data-testid="hiring-recommendations-tab"]').click();
    
    // Verify recommendations
    const recommendations = page.locator('[data-testid="hiring-recommendation-card"]');
    await expect(recommendations).toHaveCountGreaterThan(0);
    
    // Check recommendation details
    const firstRecommendation = recommendations.first();
    await expect(firstRecommendation.locator('[data-testid="skill-category"]')).toBeVisible();
    await expect(firstRecommendation.locator('[data-testid="recommended-hires"]')).toBeVisible();
    await expect(firstRecommendation.locator('[data-testid="urgency-badge"]')).toBeVisible();
    await expect(firstRecommendation.locator('[data-testid="estimated-cost"]')).toBeVisible();
  });

  test('should filter and sort skill gaps', async ({ page }) => {
    await page.locator('[data-testid="analyze-skill-gaps-btn"]').click();
    await page.waitForResponse(response => response.url().includes('/skill-gaps'));
    
    // Filter by priority
    await page.locator('[data-testid="priority-filter"]').selectOption('critical');
    await page.waitForResponse(response => response.url().includes('/skill-gaps'));
    
    // Verify filtering
    const criticalGaps = page.locator('[data-testid="skill-gap-row"]');
    for (let i = 0; i < await criticalGaps.count(); i++) {
      await expect(criticalGaps.nth(i).locator('[data-testid="priority-badge"]')).toHaveText('Critical');
    }
    
    // Sort by gap hours descending
    await page.locator('[data-testid="sort-by-gap-hours"]').click();
    
    // Verify sorting (first gap should have highest hours)
    const gapHours = await page.locator('[data-testid="gap-hours"]').allTextContents();
    const numericGaps = gapHours.map(text => parseInt(text.replace(/\D/g, '')));
    expect(numericGaps).toEqual([...numericGaps].sort((a, b) => b - a));
  });
});

// Performance and Load Tests
test.describe('Performance Tests', () => {
  test('should handle large scenario with many allocations', async ({ page }) => {
    await setupTestData(page);
    const scenarioCard = await createTestScenario(page);
    await scenarioCard.click();
    
    // Measure time to load scenario with many allocations
    const startTime = Date.now();
    
    // Create 50+ allocations programmatically (simulating large scenario)
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
    
    // Verify performance (should load within reasonable time)
    expect(loadTime).toBeLessThan(30000); // 30 seconds max for 50 allocations
    
    // Verify all allocations are visible
    const allocations = page.locator('[data-testid="allocation-row"]');
    await expect(allocations).toHaveCount(50);
  });

  test('should handle concurrent scenario operations', async ({ browser }) => {
    // Test concurrent scenario creation/editing
    const contexts = await Promise.all([
      browser.newContext(),
      browser.newContext(),
      browser.newContext()
    ]);
    
    const pages = await Promise.all(contexts.map(context => context.newPage()));
    
    // Perform concurrent operations
    await Promise.all([
      createTestScenario(pages[0]),
      createTestScenario(pages[1]),
      createTestScenario(pages[2])
    ]);
    
    // Verify all scenarios were created successfully
    for (const page of pages) {
      await page.goto('/scenarios');
      const scenarios = page.locator('[data-testid="scenario-card"]');
      await expect(scenarios).toHaveCountGreaterThanOrEqual(1);
    }
    
    // Cleanup
    await Promise.all(contexts.map(context => context.close()));
  });
});

// Accessibility Tests
test.describe('Accessibility', () => {
  test('should be accessible with keyboard navigation', async ({ page }) => {
    await setupTestData(page);
    await page.goto('/scenarios');
    
    // Test keyboard navigation
    await page.keyboard.press('Tab'); // Should focus on create scenario button
    await expect(page.locator('[data-testid="create-scenario-btn"]')).toBeFocused();
    
    // Navigate through scenario cards
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    
    // Open scenario with Enter key
    await page.keyboard.press('Enter');
    
    // Should navigate to scenario detail
    await page.waitForURL(/.*scenarios\/[^\/]+$/);
  });

  test('should have proper ARIA labels and roles', async ({ page }) => {
    await setupTestData(page);
    const scenarioCard = await createTestScenario(page);
    await scenarioCard.click();
    
    // Check ARIA labels
    await expect(page.locator('[data-testid="scenario-detail"]')).toHaveAttribute('role', 'main');
    await expect(page.locator('[data-testid="allocations-table"]')).toHaveAttribute('role', 'table');
    await expect(page.locator('[data-testid="add-allocation-btn"]')).toHaveAttribute('aria-label');
    
    // Check heading structure
    await expect(page.locator('h1')).toBeVisible();
    await expect(page.locator('h2')).toBeVisible();
  });
});