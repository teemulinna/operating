"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const test_1 = require("@playwright/test");
const test_data_1 = require("../fixtures/test-data");
test_1.test.describe('Complete User Workflows', () => {
    test_1.test.beforeEach(async ({ page }) => {
        await page.goto('/');
        await page.waitForLoadState('networkidle');
    });
    (0, test_1.test)('Complete CRUD workflow: Create, Read, Update, Delete', async ({ page }) => {
        const testPerson = test_data_1.mockPersons[0];
        await page.click('[data-testid="add-person-btn"]');
        await page.waitForSelector('[data-testid="person-form"]');
        await page.fill('[data-testid="name-input"]', testPerson.name);
        await page.fill('[data-testid="age-input"]', testPerson.age.toString());
        await page.fill('[data-testid="occupation-input"]', testPerson.occupation);
        await page.fill('[data-testid="email-input"]', testPerson.email);
        await page.fill('[data-testid="phone-input"]', testPerson.phone || '');
        await page.fill('[data-testid="address-input"]', testPerson.address || '');
        await page.click('[data-testid="save-person-btn"]');
        await (0, test_1.expect)(page.locator('[data-testid="success-message"]')).toBeVisible();
        await page.waitForSelector('[data-testid="person-form"]', { state: 'hidden' });
        await (0, test_1.expect)(page.locator(`[data-testid="person-row"]:has-text("${testPerson.name}")`)).toBeVisible();
        await (0, test_1.expect)(page.locator(`text=${testPerson.email}`)).toBeVisible();
        await (0, test_1.expect)(page.locator(`text=${testPerson.occupation}`)).toBeVisible();
        await page.click(`[data-testid="edit-person-btn"]:near([data-testid="person-row"]:has-text("${testPerson.name}"))`);
        await page.waitForSelector('[data-testid="person-form"]');
        const updatedName = `${testPerson.name} (Updated)`;
        await page.fill('[data-testid="name-input"]', updatedName);
        await page.fill('[data-testid="age-input"]', '35');
        await page.click('[data-testid="save-person-btn"]');
        await (0, test_1.expect)(page.locator('[data-testid="success-message"]')).toBeVisible();
        await (0, test_1.expect)(page.locator(`text=${updatedName}`)).toBeVisible();
        await (0, test_1.expect)(page.locator(`text=35`)).toBeVisible();
        await page.click(`[data-testid="delete-person-btn"]:near([data-testid="person-row"]:has-text("${updatedName}"))`);
        await page.click('[data-testid="confirm-delete-btn"]');
        await (0, test_1.expect)(page.locator('[data-testid="success-message"]')).toBeVisible();
        await (0, test_1.expect)(page.locator(`text=${updatedName}`)).not.toBeVisible();
    });
    (0, test_1.test)('Search and filter workflow', async ({ page }) => {
        for (const person of test_data_1.mockPersons.slice(0, 3)) {
            await addPersonViaUI(page, person);
        }
        await page.fill('[data-testid="search-input"]', 'Software Engineer');
        await page.waitForTimeout(500);
        await (0, test_1.expect)(page.locator('[data-testid="person-row"]')).toHaveCount(1);
        await (0, test_1.expect)(page.locator('text=John Doe')).toBeVisible();
        await page.fill('[data-testid="search-input"]', '');
        await page.fill('[data-testid="min-age-input"]', '30');
        await page.waitForTimeout(500);
        const visibleRows = page.locator('[data-testid="person-row"]');
        await (0, test_1.expect)(visibleRows).toHaveCount(2);
        await page.fill('[data-testid="min-age-input"]', '');
        await page.fill('[data-testid="max-age-input"]', '');
        await page.waitForTimeout(500);
        await (0, test_1.expect)(page.locator('[data-testid="person-row"]')).toHaveCount(3);
    });
    (0, test_1.test)('Bulk operations workflow', async ({ page }) => {
        for (const person of test_data_1.mockPersons.slice(0, 3)) {
            await addPersonViaUI(page, person);
        }
        await page.check('[data-testid="select-all-checkbox"]');
        const checkboxes = page.locator('[data-testid="person-checkbox"]');
        const count = await checkboxes.count();
        for (let i = 0; i < count; i++) {
            await (0, test_1.expect)(checkboxes.nth(i)).toBeChecked();
        }
        await page.click('[data-testid="bulk-delete-btn"]');
        await page.click('[data-testid="confirm-bulk-delete-btn"]');
        await (0, test_1.expect)(page.locator('[data-testid="success-message"]')).toBeVisible();
        await (0, test_1.expect)(page.locator('[data-testid="person-row"]')).toHaveCount(0);
    });
    (0, test_1.test)('Form validation workflow', async ({ page }) => {
        await page.click('[data-testid="add-person-btn"]');
        await page.waitForSelector('[data-testid="person-form"]');
        await page.click('[data-testid="save-person-btn"]');
        await (0, test_1.expect)(page.locator('[data-testid="name-error"]')).toBeVisible();
        await (0, test_1.expect)(page.locator('[data-testid="age-error"]')).toBeVisible();
        await (0, test_1.expect)(page.locator('[data-testid="email-error"]')).toBeVisible();
        const invalidData = test_data_1.invalidPersonData[0];
        await page.fill('[data-testid="name-input"]', invalidData.name);
        await page.fill('[data-testid="age-input"]', invalidData.age.toString());
        await page.fill('[data-testid="email-input"]', 'invalid-email');
        await page.click('[data-testid="save-person-btn"]');
        await (0, test_1.expect)(page.locator('[data-testid="name-error"]')).toBeVisible();
        await (0, test_1.expect)(page.locator('[data-testid="email-error"]')).toBeVisible();
        await page.fill('[data-testid="name-input"]', 'Valid Name');
        await page.fill('[data-testid="email-input"]', 'valid@email.com');
        await page.fill('[data-testid="occupation-input"]', 'Valid Job');
        await page.click('[data-testid="save-person-btn"]');
        await (0, test_1.expect)(page.locator('[data-testid="success-message"]')).toBeVisible();
    });
    (0, test_1.test)('Responsive design workflow', async ({ page }) => {
        await addPersonViaUI(page, test_data_1.mockPersons[0]);
        await page.setViewportSize({ width: 1200, height: 800 });
        await (0, test_1.expect)(page.locator('[data-testid="person-table"]')).toBeVisible();
        await page.setViewportSize({ width: 768, height: 1024 });
        await (0, test_1.expect)(page.locator('[data-testid="person-list"]')).toBeVisible();
        await page.setViewportSize({ width: 375, height: 667 });
        await (0, test_1.expect)(page.locator('[data-testid="mobile-menu-btn"]')).toBeVisible();
        await page.click('[data-testid="mobile-menu-btn"]');
        await (0, test_1.expect)(page.locator('[data-testid="mobile-menu"]')).toBeVisible();
    });
});
async function addPersonViaUI(page, person) {
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
//# sourceMappingURL=01-complete-workflows.spec.js.map