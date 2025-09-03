import { test, expect } from '@playwright/test';
import { Pool } from 'pg';
import { mockPersons } from '../fixtures/testData';

test.describe('UI to Database Complete Workflows', () => {
  let pool: Pool;

  test.beforeAll(async () => {
    pool = new Pool({
      user: process.env.TEST_DB_USER || 'postgres',
      host: process.env.TEST_DB_HOST || 'localhost',
      database: process.env.TEST_DB_NAME || 'test_person_manager',
      password: process.env.TEST_DB_PASSWORD || 'password',
      port: parseInt(process.env.TEST_DB_PORT || '5432'),
    });
  });

  test.afterAll(async () => {
    await pool.end();
  });

  test.beforeEach(async ({ page }) => {
    // Clean database
    await pool.query('DELETE FROM persons');
    
    // Navigate to app
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('Complete user registration workflow: UI → API → Database', async ({ page }) => {
    const person = mockPersons[0];

    // Step 1: User fills form in UI
    await page.click('[data-testid="add-person-btn"]');
    await page.waitForSelector('[data-testid="person-form"]');

    await page.fill('[data-testid="name-input"]', person.name);
    await page.fill('[data-testid="age-input"]', person.age.toString());
    await page.fill('[data-testid="occupation-input"]', person.occupation);
    await page.fill('[data-testid="email-input"]', person.email);
    await page.fill('[data-testid="phone-input"]', person.phone || '');
    await page.fill('[data-testid="address-input"]', person.address || '');

    // Step 2: Submit form (UI → API)
    await page.click('[data-testid="save-person-btn"]');
    
    // Step 3: Verify UI feedback
    await expect(page.locator('[data-testid="success-message"]')).toBeVisible();
    await expect(page.locator(`text=${person.name}`)).toBeVisible();

    // Step 4: Verify data reached database
    const dbResult = await pool.query('SELECT * FROM persons WHERE email = $1', [person.email]);
    expect(dbResult.rows).toHaveLength(1);
    expect(dbResult.rows[0].name).toBe(person.name);
    expect(dbResult.rows[0].age).toBe(person.age);
    expect(dbResult.rows[0].occupation).toBe(person.occupation);
    expect(dbResult.rows[0].email).toBe(person.email);
    expect(dbResult.rows[0].phone).toBe(person.phone);
    expect(dbResult.rows[0].address).toBe(person.address);
    expect(dbResult.rows[0].created_at).toBeDefined();
    expect(dbResult.rows[0].updated_at).toBeDefined();
  });

  test('Search workflow: UI input → API query → Database search → UI results', async ({ page }) => {
    // Setup: Add test data to database
    const testPersons = mockPersons.slice(0, 3);
    for (const person of testPersons) {
      await pool.query(`
        INSERT INTO persons (name, age, occupation, email, phone, address)
        VALUES ($1, $2, $3, $4, $5, $6)
      `, [person.name, person.age, person.occupation, person.email, person.phone, person.address]);
    }

    // Reload to show data
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Verify all persons visible initially
    await expect(page.locator('[data-testid="person-row"]')).toHaveCount(3);

    // Step 1: User enters search term in UI
    await page.fill('[data-testid="search-input"]', 'Software Engineer');
    await page.waitForTimeout(500); // Debounce delay

    // Step 2: Verify UI shows filtered results
    await expect(page.locator('[data-testid="person-row"]')).toHaveCount(1);
    await expect(page.locator('text=John Doe')).toBeVisible();

    // Step 3: Verify database query was executed correctly
    // (We can infer this worked because we got the right UI results)
    
    // Test another search
    await page.fill('[data-testid="search-input"]', 'Data');
    await page.waitForTimeout(500);

    await expect(page.locator('[data-testid="person-row"]')).toHaveCount(1);
    await expect(page.locator('text=Jane Smith')).toBeVisible();

    // Clear search
    await page.fill('[data-testid="search-input"]', '');
    await page.waitForTimeout(500);

    // Should show all again
    await expect(page.locator('[data-testid="person-row"]')).toHaveCount(3);
  });

  test('Update workflow: UI edit → API update → Database modification → UI refresh', async ({ page }) => {
    // Setup: Add person to database
    const person = mockPersons[0];
    const dbResult = await pool.query(`
      INSERT INTO persons (name, age, occupation, email, phone, address)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `, [person.name, person.age, person.occupation, person.email, person.phone, person.address]);

    const insertedPerson = dbResult.rows[0];
    const originalUpdatedAt = insertedPerson.updated_at;

    // Reload to show data
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Step 1: User clicks edit in UI
    await page.click(`[data-testid="edit-person-btn"]:near([data-testid="person-row"]:has-text("${person.name}"))`);
    await page.waitForSelector('[data-testid="person-form"]');

    // Step 2: User modifies data
    const updatedName = `${person.name} (Updated)`;
    const updatedAge = 35;
    await page.fill('[data-testid="name-input"]', updatedName);
    await page.fill('[data-testid="age-input"]', updatedAge.toString());

    // Step 3: Submit update (UI → API → Database)
    await page.click('[data-testid="save-person-btn"]');

    // Step 4: Verify UI shows updated data
    await expect(page.locator('[data-testid="success-message"]')).toBeVisible();
    await expect(page.locator(`text=${updatedName}`)).toBeVisible();
    await expect(page.locator(`text=${updatedAge}`)).toBeVisible();

    // Step 5: Verify database was updated
    const updatedDbResult = await pool.query('SELECT * FROM persons WHERE id = $1', [insertedPerson.id]);
    expect(updatedDbResult.rows).toHaveLength(1);
    expect(updatedDbResult.rows[0].name).toBe(updatedName);
    expect(updatedDbResult.rows[0].age).toBe(updatedAge);
    expect(updatedDbResult.rows[0].occupation).toBe(person.occupation); // Unchanged
    expect(updatedDbResult.rows[0].updated_at).not.toEqual(originalUpdatedAt); // Should be updated
  });

  test('Delete workflow: UI delete → API delete → Database removal → UI update', async ({ page }) => {
    // Setup: Add person to database
    const person = mockPersons[0];
    const dbResult = await pool.query(`
      INSERT INTO persons (name, age, occupation, email, phone, address)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `, [person.name, person.age, person.occupation, person.email, person.phone, person.address]);

    const insertedPerson = dbResult.rows[0];

    // Reload to show data
    await page.reload();
    await page.waitForLoadState('networkidle');
    await expect(page.locator(`text=${person.name}`)).toBeVisible();

    // Step 1: User clicks delete in UI
    await page.click(`[data-testid="delete-person-btn"]:near([data-testid="person-row"]:has-text("${person.name}"))`);
    
    // Step 2: Confirm deletion
    await page.waitForSelector('[data-testid="confirm-delete-btn"]');
    await page.click('[data-testid="confirm-delete-btn"]');

    // Step 3: Verify UI shows success and person is removed
    await expect(page.locator('[data-testid="success-message"]')).toBeVisible();
    await expect(page.locator(`text=${person.name}`)).not.toBeVisible();

    // Step 4: Verify person was removed from database
    const checkResult = await pool.query('SELECT * FROM persons WHERE id = $1', [insertedPerson.id]);
    expect(checkResult.rows).toHaveLength(0);
  });

  test('Bulk operations workflow: UI bulk select → API batch operations → Database bulk changes', async ({ page }) => {
    // Setup: Add multiple persons to database
    const testPersons = mockPersons.slice(0, 3);
    for (const person of testPersons) {
      await pool.query(`
        INSERT INTO persons (name, age, occupation, email, phone, address)
        VALUES ($1, $2, $3, $4, $5, $6)
      `, [person.name, person.age, person.occupation, person.email, person.phone, person.address]);
    }

    // Reload to show data
    await page.reload();
    await page.waitForLoadState('networkidle');
    await expect(page.locator('[data-testid="person-row"]')).toHaveCount(3);

    // Step 1: User selects all persons in UI
    await page.check('[data-testid="select-all-checkbox"]');
    
    // Verify all checkboxes are checked
    const checkboxes = page.locator('[data-testid="person-checkbox"]');
    const count = await checkboxes.count();
    for (let i = 0; i < count; i++) {
      await expect(checkboxes.nth(i)).toBeChecked();
    }

    // Step 2: User performs bulk delete
    await page.click('[data-testid="bulk-delete-btn"]');
    await page.waitForSelector('[data-testid="confirm-bulk-delete-btn"]');
    await page.click('[data-testid="confirm-bulk-delete-btn"]');

    // Step 3: Verify UI shows success and all persons are removed
    await expect(page.locator('[data-testid="success-message"]')).toBeVisible();
    await expect(page.locator('[data-testid="person-row"]')).toHaveCount(0);
    await expect(page.locator('[data-testid="empty-state"]')).toBeVisible();

    // Step 4: Verify all persons were removed from database
    const countResult = await pool.query('SELECT COUNT(*) FROM persons');
    expect(parseInt(countResult.rows[0].count)).toBe(0);
  });

  test('Filter workflow: UI filter controls → API filtered query → Database indexed search → UI filtered results', async ({ page }) => {
    // Setup: Add diverse test data
    const testData = [
      { ...mockPersons[0], age: 25 }, // Young software engineer
      { ...mockPersons[1], age: 35 }, // Older data scientist
      { ...mockPersons[2], age: 45 }, // Older product manager
    ];

    for (const person of testData) {
      await pool.query(`
        INSERT INTO persons (name, age, occupation, email, phone, address)
        VALUES ($1, $2, $3, $4, $5, $6)
      `, [person.name, person.age, person.occupation, person.email, person.phone, person.address]);
    }

    // Reload to show data
    await page.reload();
    await page.waitForLoadState('networkidle');
    await expect(page.locator('[data-testid="person-row"]')).toHaveCount(3);

    // Step 1: User sets age filter in UI
    await page.fill('[data-testid="min-age-input"]', '30');
    await page.waitForTimeout(500);

    // Step 2: Verify UI shows filtered results (age >= 30)
    await expect(page.locator('[data-testid="person-row"]')).toHaveCount(2);
    await expect(page.locator('text=Jane Smith')).toBeVisible(); // 35
    await expect(page.locator('text=Bob Johnson')).toBeVisible(); // 45
    await expect(page.locator('text=John Doe')).not.toBeVisible(); // 25

    // Step 3: Add max age filter
    await page.fill('[data-testid="max-age-input"]', '40');
    await page.waitForTimeout(500);

    // Should show only age 35 (between 30-40)
    await expect(page.locator('[data-testid="person-row"]')).toHaveCount(1);
    await expect(page.locator('text=Jane Smith')).toBeVisible();

    // Step 4: Clear filters
    await page.fill('[data-testid="min-age-input"]', '');
    await page.fill('[data-testid="max-age-input"]', '');
    await page.waitForTimeout(500);

    // Should show all again
    await expect(page.locator('[data-testid="person-row"]')).toHaveCount(3);
  });

  test('Sort workflow: UI sort controls → API sorted query → Database ordered results → UI sorted display', async ({ page }) => {
    // Setup: Add test data with different names
    const testData = [
      { ...mockPersons[0], name: 'Charlie Brown' },
      { ...mockPersons[1], name: 'Alice Smith' },
      { ...mockPersons[2], name: 'Bob Johnson' },
    ];

    for (const person of testData) {
      await pool.query(`
        INSERT INTO persons (name, age, occupation, email, phone, address)
        VALUES ($1, $2, $3, $4, $5, $6)
      `, [person.name, person.age, person.occupation, person.email, person.phone, person.address]);
    }

    // Reload to show data
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Step 1: User clicks sort by name
    await page.click('[data-testid="sort-name-btn"]');
    await page.waitForTimeout(500);

    // Step 2: Verify UI shows sorted results (ascending)
    const rows = page.locator('[data-testid="person-row"]');
    await expect(rows.nth(0)).toContainText('Alice Smith');
    await expect(rows.nth(1)).toContainText('Bob Johnson');
    await expect(rows.nth(2)).toContainText('Charlie Brown');

    // Step 3: Click again for descending sort
    await page.click('[data-testid="sort-name-btn"]');
    await page.waitForTimeout(500);

    // Should be reversed
    await expect(rows.nth(0)).toContainText('Charlie Brown');
    await expect(rows.nth(1)).toContainText('Bob Johnson');
    await expect(rows.nth(2)).toContainText('Alice Smith');
  });

  test('Form validation workflow: UI validation → No API call on invalid data → Database integrity maintained', async ({ page }) => {
    // Step 1: User tries to submit invalid form
    await page.click('[data-testid="add-person-btn"]');
    await page.waitForSelector('[data-testid="person-form"]');

    // Submit empty form
    await page.click('[data-testid="save-person-btn"]');

    // Step 2: Verify UI shows validation errors
    await expect(page.locator('[data-testid="name-error"]')).toBeVisible();
    await expect(page.locator('[data-testid="age-error"]')).toBeVisible();
    await expect(page.locator('[data-testid="email-error"]')).toBeVisible();

    // Step 3: Verify no API call was made and database is clean
    const countResult = await pool.query('SELECT COUNT(*) FROM persons');
    expect(parseInt(countResult.rows[0].count)).toBe(0);

    // Step 4: Fill invalid email
    await page.fill('[data-testid="name-input"]', 'Test Name');
    await page.fill('[data-testid="age-input"]', '25');
    await page.fill('[data-testid="email-input"]', 'invalid-email');
    await page.fill('[data-testid="occupation-input"]', 'Test Job');
    
    await page.click('[data-testid="save-person-btn"]');

    // Should still show email error
    await expect(page.locator('[data-testid="email-error"]')).toBeVisible();
    
    // Database should still be clean
    const countResult2 = await pool.query('SELECT COUNT(*) FROM persons');
    expect(parseInt(countResult2.rows[0].count)).toBe(0);

    // Step 5: Fix validation and submit successfully
    await page.fill('[data-testid="email-input"]', 'valid@email.com');
    await page.click('[data-testid="save-person-btn"]');

    // Should succeed
    await expect(page.locator('[data-testid="success-message"]')).toBeVisible();
    
    // Database should now have the record
    const finalCount = await pool.query('SELECT COUNT(*) FROM persons');
    expect(parseInt(finalCount.rows[0].count)).toBe(1);
  });
});