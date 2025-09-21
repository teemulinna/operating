import { test, expect, Page } from '@playwright/test';
import { mockPersons, invalidPersonData } from '../fixtures/test-data';

test.describe('Complete User Workflows', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the app
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('Complete CRUD workflow: Create, Read, Update, Delete', async ({ page }) => {
    const testPerson = mockPersons[0];

    // 1. CREATE: Add a new person
    await page.click('[data-testid="add-person-btn"]');
    await page.waitForSelector('[data-testid="person-form"]');

    await page.fill('[data-testid="name-input"]', testPerson.name);
    await page.fill('[data-testid="age-input"]', testPerson.age.toString());
    await page.fill('[data-testid="occupation-input"]', testPerson.occupation);
    await page.fill('[data-testid="email-input"]', testPerson.email);
    await page.fill('[data-testid="phone-input"]', testPerson.phone || '');
    await page.fill('[data-testid="address-input"]', testPerson.address || '');

    await page.click('[data-testid="save-person-btn"]');
    
    // Wait for success message and form to close
    await expect(page.locator('[data-testid="success-message"]')).toBeVisible();
    await page.waitForSelector('[data-testid="person-form"]', { state: 'hidden' });

    // 2. READ: Verify person appears in the list
    await expect(page.locator(`[data-testid="person-row"]:has-text("${testPerson.name}")`)).toBeVisible();
    await expect(page.locator(`text=${testPerson.email}`)).toBeVisible();
    await expect(page.locator(`text=${testPerson.occupation}`)).toBeVisible();

    // 3. UPDATE: Edit the person
    await page.click(`[data-testid="edit-person-btn"]:near([data-testid="person-row"]:has-text("${testPerson.name}"))`);
    await page.waitForSelector('[data-testid="person-form"]');

    const updatedName = `${testPerson.name} (Updated)`;
    await page.fill('[data-testid="name-input"]', updatedName);
    await page.fill('[data-testid="age-input"]', '35');
    await page.click('[data-testid="save-person-btn"]');

    // Verify update
    await expect(page.locator('[data-testid="success-message"]')).toBeVisible();
    await expect(page.locator(`text=${updatedName}`)).toBeVisible();
    await expect(page.locator(`text=35`)).toBeVisible();

    // 4. DELETE: Remove the person
    await page.click(`[data-testid="delete-person-btn"]:near([data-testid="person-row"]:has-text("${updatedName}"))`);
    
    // Confirm deletion
    await page.click('[data-testid="confirm-delete-btn"]');
    
    // Verify deletion
    await expect(page.locator('[data-testid="success-message"]')).toBeVisible();
    await expect(page.locator(`text=${updatedName}`)).not.toBeVisible();
  });

  test('Search and filter workflow', async ({ page }) => {
    // First, add some test data
    for (const person of mockPersons.slice(0, 3)) {
      await addPersonViaUI(page, person);
    }

    // Test search functionality
    await page.fill('[data-testid="search-input"]', 'Software Engineer');
    await page.waitForTimeout(500); // Debounce delay

    // Should show only software engineers
    await expect(page.locator('[data-testid="person-row"]')).toHaveCount(1);
    await expect(page.locator('text=John Doe')).toBeVisible();

    // Test age filter
    await page.fill('[data-testid="search-input"]', '');
    await page.fill('[data-testid="min-age-input"]', '30');
    await page.waitForTimeout(500);

    // Should filter by age
    const visibleRows = page.locator('[data-testid="person-row"]');
    await expect(visibleRows).toHaveCount(2); // John (30) and Bob (35)

    // Clear filters
    await page.fill('[data-testid="min-age-input"]', '');
    await page.fill('[data-testid="max-age-input"]', '');
    await page.waitForTimeout(500);

    // Should show all persons again
    await expect(page.locator('[data-testid="person-row"]')).toHaveCount(3);
  });

  test('Bulk operations workflow', async ({ page }) => {
    // Add test data
    for (const person of mockPersons.slice(0, 3)) {
      await addPersonViaUI(page, person);
    }

    // Select multiple persons
    await page.check('[data-testid="select-all-checkbox"]');
    
    // Verify all are selected
    const checkboxes = page.locator('[data-testid="person-checkbox"]');
    const count = await checkboxes.count();
    for (let i = 0; i < count; i++) {
      await expect(checkboxes.nth(i)).toBeChecked();
    }

    // Bulk delete
    await page.click('[data-testid="bulk-delete-btn"]');
    await page.click('[data-testid="confirm-bulk-delete-btn"]');

    // Verify all deleted
    await expect(page.locator('[data-testid="success-message"]')).toBeVisible();
    await expect(page.locator('[data-testid="person-row"]')).toHaveCount(0);
  });

  test('Form validation workflow', async ({ page }) => {
    await page.click('[data-testid="add-person-btn"]');
    await page.waitForSelector('[data-testid="person-form"]');

    // Try to submit empty form
    await page.click('[data-testid="save-person-btn"]');
    
    // Should show validation errors
    await expect(page.locator('[data-testid="name-error"]')).toBeVisible();
    await expect(page.locator('[data-testid="age-error"]')).toBeVisible();
    await expect(page.locator('[data-testid="email-error"]')).toBeVisible();

    // Test invalid data
    const invalidData = invalidPersonData[0];
    await page.fill('[data-testid="name-input"]', invalidData.name); // Empty
    await page.fill('[data-testid="age-input"]', invalidData.age.toString());
    await page.fill('[data-testid="email-input"]', 'invalid-email');
    
    await page.click('[data-testid="save-person-btn"]');
    
    // Should still show errors
    await expect(page.locator('[data-testid="name-error"]')).toBeVisible();
    await expect(page.locator('[data-testid="email-error"]')).toBeVisible();

    // Fill with valid data
    await page.fill('[data-testid="name-input"]', 'Valid Name');
    await page.fill('[data-testid="email-input"]', 'valid@email.com');
    await page.fill('[data-testid="occupation-input"]', 'Valid Job');
    
    await page.click('[data-testid="save-person-btn"]');
    
    // Should succeed
    await expect(page.locator('[data-testid="success-message"]')).toBeVisible();
  });

  test('Responsive design workflow', async ({ page }) => {
    // Add test data
    await addPersonViaUI(page, mockPersons[0]);

    // Test desktop view
    await page.setViewportSize({ width: 1200, height: 800 });
    await expect(page.locator('[data-testid="person-table"]')).toBeVisible();

    // Test tablet view
    await page.setViewportSize({ width: 768, height: 1024 });
    await expect(page.locator('[data-testid="person-list"]')).toBeVisible();

    // Test mobile view
    await page.setViewportSize({ width: 375, height: 667 });
    await expect(page.locator('[data-testid="mobile-menu-btn"]')).toBeVisible();
    
    // Test mobile navigation
    await page.click('[data-testid="mobile-menu-btn"]');
    await expect(page.locator('[data-testid="mobile-menu"]')).toBeVisible();
  });
});

// Helper function to add person via UI
async function addPersonViaUI(page: Page, person: typeof mockPersons[0]) {
  await page.click('[data-testid="add-person-btn"]');
  await page.waitForSelector('[data-testid="person-form"]');

  await page.fill('[data-testid="name-input"]', person.name);
  await page.fill('[data-testid="age-input"]', person.age.toString());
  await page.fill('[data-testid="occupation-input"]', person.occupation);
  await page.fill('[data-testid="email-input"]', person.email);
  await page.fill('[data-testid="phone-input"]', person.phone || '');
  await page.fill('[data-testid="address-input"]', person.address || '');

  await page.click('[data-testid="save-person-btn"]');
  await page.waitForSelector('[data-testid="person-form"]', { state: 'hidden' });
}