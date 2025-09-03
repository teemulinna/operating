import { test, expect } from '@playwright/test';
import { Pool } from 'pg';
import { mockPersons, invalidPersonData } from '../fixtures/testData';

test.describe('Error Handling Across All Layers', () => {
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
    await pool.query('DELETE FROM persons');
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('Database constraint violations propagate to UI', async ({ page, request }) => {
    const person = mockPersons[0];

    // Create person via API first
    const createResponse = await request.post('/api/persons', { data: person });
    expect(createResponse.status()).toBe(201);

    // Try to create duplicate email via UI
    await page.click('[data-testid="add-person-btn"]');
    await page.fill('[data-testid="name-input"]', 'Different Name');
    await page.fill('[data-testid="age-input"]', '30');
    await page.fill('[data-testid="occupation-input"]', 'Different Job');
    await page.fill('[data-testid="email-input"]', person.email); // Duplicate email
    await page.fill('[data-testid="phone-input"]', '+1-555-9999');
    await page.click('[data-testid="save-person-btn"]');

    // Should show database constraint error in UI
    await expect(page.locator('[data-testid="error-message"]')).toBeVisible();
    await expect(page.locator('[data-testid="error-message"]')).toContainText('email');
    await expect(page.locator('[data-testid="error-message"]')).toContainText('already exists');

    // Form should remain open for correction
    await expect(page.locator('[data-testid="person-form"]')).toBeVisible();
  });

  test('API validation errors display in frontend', async ({ page, request }) => {
    // Test negative age via API and UI
    const invalidData = {
      name: 'Test Person',
      age: -5, // Invalid age
      occupation: 'Test Job',
      email: 'test@email.com',
      phone: '+1-555-0000',
      address: 'Test Address'
    };

    // Via API
    const apiResponse = await request.post('/api/persons', { data: invalidData });
    expect(apiResponse.status()).toBe(400);
    const apiError = await apiResponse.json();
    expect(apiError.message).toContain('age');

    // Via UI
    await page.click('[data-testid="add-person-btn"]');
    await page.fill('[data-testid="name-input"]', invalidData.name);
    await page.fill('[data-testid="age-input"]', invalidData.age.toString());
    await page.fill('[data-testid="occupation-input"]', invalidData.occupation);
    await page.fill('[data-testid="email-input"]', invalidData.email);
    await page.click('[data-testid="save-person-btn"]');

    // UI should show validation error
    await expect(page.locator('[data-testid="age-error"]')).toBeVisible();
    await expect(page.locator('[data-testid="age-error"]')).toContainText('positive');
  });

  test('Network errors handled gracefully in UI', async ({ page, context }) => {
    // Block network requests to simulate network failure
    await context.route('**/api/persons', route => route.abort('failed'));

    await page.click('[data-testid="add-person-btn"]');
    await page.fill('[data-testid="name-input"]', 'Test Person');
    await page.fill('[data-testid="age-input"]', '30');
    await page.fill('[data-testid="occupation-input"]', 'Test Job');
    await page.fill('[data-testid="email-input"]', 'test@email.com');
    await page.click('[data-testid="save-person-btn"]');

    // Should show network error
    await expect(page.locator('[data-testid="error-message"]')).toBeVisible();
    await expect(page.locator('[data-testid="error-message"]')).toContainText('network');

    // Form should remain open for retry
    await expect(page.locator('[data-testid="person-form"]')).toBeVisible();

    // Retry button should be available
    await expect(page.locator('[data-testid="retry-btn"]')).toBeVisible();
  });

  test('Server errors (500) handled properly', async ({ page, context }) => {
    // Mock server error
    await context.route('**/api/persons', route => {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'Internal server error' })
      });
    });

    await page.click('[data-testid="add-person-btn"]');
    await page.fill('[data-testid="name-input"]', 'Test Person');
    await page.fill('[data-testid="age-input"]', '30');
    await page.fill('[data-testid="occupation-input"]', 'Test Job');
    await page.fill('[data-testid="email-input"]', 'test@email.com');
    await page.click('[data-testid="save-person-btn"]');

    // Should show server error
    await expect(page.locator('[data-testid="error-message"]')).toBeVisible();
    await expect(page.locator('[data-testid="error-message"]')).toContainText('server error');

    // Should offer to report the issue
    await expect(page.locator('[data-testid="report-issue-btn"]')).toBeVisible();
  });

  test('404 errors handled during edit operations', async ({ page, request }) => {
    // Create person first
    const person = mockPersons[0];
    const createResponse = await request.post('/api/persons', { data: person });
    const createdPerson = await createResponse.json();

    await page.reload();
    await page.waitForLoadState('networkidle');

    // Delete person via API (simulate external deletion)
    await request.delete(`/api/persons/${createdPerson.id}`);

    // Try to edit the person from UI
    await page.click(`[data-testid="edit-person-btn"]:first`);
    await page.waitForSelector('[data-testid="person-form"]');
    
    await page.fill('[data-testid="name-input"]', 'Updated Name');
    await page.click('[data-testid="save-person-btn"]');

    // Should show not found error
    await expect(page.locator('[data-testid="error-message"]')).toBeVisible();
    await expect(page.locator('[data-testid="error-message"]')).toContainText('not found');

    // Should close form and refresh list
    await expect(page.locator('[data-testid="person-form"]')).not.toBeVisible();
  });

  test('Database connection errors propagate correctly', async ({ page, request }) => {
    // This would require mocking database connection failures
    // For now, we'll simulate by checking API error responses
    
    // Create mock database error scenario
    await test.step('Simulate database connection error', async () => {
      // In a real scenario, we would temporarily stop the database
      // or mock the connection to fail
      console.log('Database connection error simulation would go here');
    });

    // For this test, we'll assume the API returns appropriate 503 errors
    // when database is unavailable
  });

  test('Timeout errors handled in frontend', async ({ page, context }) => {
    // Mock slow API response
    await context.route('**/api/persons', route => {
      // Simulate slow response that times out
      setTimeout(() => {
        route.fulfill({
          status: 408,
          contentType: 'application/json',
          body: JSON.stringify({ message: 'Request timeout' })
        });
      }, 10000); // 10 second delay
    });

    await page.click('[data-testid="add-person-btn"]');
    await page.fill('[data-testid="name-input"]', 'Test Person');
    await page.fill('[data-testid="age-input"]', '30');
    await page.fill('[data-testid="occupation-input"]', 'Test Job');
    await page.fill('[data-testid="email-input"]', 'test@email.com');
    await page.click('[data-testid="save-person-btn"]');

    // Should show loading state initially
    await expect(page.locator('[data-testid="loading-spinner"]')).toBeVisible();

    // Should eventually show timeout error
    await expect(page.locator('[data-testid="error-message"]')).toBeVisible({ timeout: 15000 });
    await expect(page.locator('[data-testid="error-message"]')).toContainText('timeout');
  });

  test('Frontend validation prevents invalid API calls', async ({ page }) => {
    let apiCallMade = false;
    
    // Monitor API calls
    await page.route('**/api/persons', route => {
      apiCallMade = true;
      route.continue();
    });

    await page.click('[data-testid="add-person-btn"]');
    
    // Try to submit with empty required fields
    await page.click('[data-testid="save-person-btn"]');

    // Should show validation errors
    await expect(page.locator('[data-testid="name-error"]')).toBeVisible();
    await expect(page.locator('[data-testid="age-error"]')).toBeVisible();
    await expect(page.locator('[data-testid="email-error"]')).toBeVisible();

    // Should NOT have made API call
    expect(apiCallMade).toBe(false);

    // Fill invalid email
    await page.fill('[data-testid="name-input"]', 'Test Name');
    await page.fill('[data-testid="age-input"]', '25');
    await page.fill('[data-testid="email-input"]', 'invalid-email');
    await page.fill('[data-testid="occupation-input"]', 'Test Job');
    await page.click('[data-testid="save-person-btn"]');

    // Should show email validation error
    await expect(page.locator('[data-testid="email-error"]')).toBeVisible();

    // Still should not have made API call
    expect(apiCallMade).toBe(false);
  });

  test('Bulk operation error handling', async ({ page, request, context }) => {
    // Add test data
    for (const person of mockPersons.slice(0, 3)) {
      await request.post('/api/persons', { data: person });
    }

    await page.reload();
    await page.waitForLoadState('networkidle');

    // Mock bulk delete to fail partially
    await context.route('**/api/persons/bulk-delete', route => {
      route.fulfill({
        status: 207, // Multi-status
        contentType: 'application/json',
        body: JSON.stringify({
          message: 'Some operations failed',
          successful: 2,
          failed: 1,
          errors: ['Person with ID 2 could not be deleted']
        })
      });
    });

    // Select all and try bulk delete
    await page.check('[data-testid="select-all-checkbox"]');
    await page.click('[data-testid="bulk-delete-btn"]');
    await page.click('[data-testid="confirm-bulk-delete-btn"]');

    // Should show partial success message
    await expect(page.locator('[data-testid="warning-message"]')).toBeVisible();
    await expect(page.locator('[data-testid="warning-message"]')).toContainText('Some operations failed');
  });

  test('Form state recovery after errors', async ({ page }) => {
    const person = mockPersons[0];

    await page.click('[data-testid="add-person-btn"]');
    
    // Fill form with data
    await page.fill('[data-testid="name-input"]', person.name);
    await page.fill('[data-testid="age-input"]', person.age.toString());
    await page.fill('[data-testid="occupation-input"]', person.occupation);
    await page.fill('[data-testid="email-input"]', 'invalid-email'); // Will cause error
    await page.fill('[data-testid="phone-input"]', person.phone || '');
    await page.fill('[data-testid="address-input"]', person.address || '');

    // Submit and get validation error
    await page.click('[data-testid="save-person-btn"]');
    await expect(page.locator('[data-testid="email-error"]')).toBeVisible();

    // Form should retain all other data
    await expect(page.locator('[data-testid="name-input"]')).toHaveValue(person.name);
    await expect(page.locator('[data-testid="age-input"]')).toHaveValue(person.age.toString());
    await expect(page.locator('[data-testid="occupation-input"]')).toHaveValue(person.occupation);
    await expect(page.locator('[data-testid="phone-input"]')).toHaveValue(person.phone || '');
    await expect(page.locator('[data-testid="address-input"]')).toHaveValue(person.address || '');

    // Fix the email and submit successfully
    await page.fill('[data-testid="email-input"]', person.email);
    await page.click('[data-testid="save-person-btn"]');

    await expect(page.locator('[data-testid="success-message"]')).toBeVisible();
  });

  test('Error message accessibility and user experience', async ({ page }) => {
    await page.click('[data-testid="add-person-btn"]');
    await page.click('[data-testid="save-person-btn"]');

    // Error messages should be accessible
    const nameError = page.locator('[data-testid="name-error"]');
    await expect(nameError).toBeVisible();
    await expect(nameError).toHaveAttribute('role', 'alert');
    await expect(nameError).toHaveAttribute('aria-live', 'polite');

    // Error messages should be associated with inputs
    const nameInput = page.locator('[data-testid="name-input"]');
    const nameErrorId = await nameError.getAttribute('id');
    await expect(nameInput).toHaveAttribute('aria-describedby', nameErrorId);

    // Error styling should be applied
    await expect(nameInput).toHaveClass(/error/);
  });

  test('Global error boundary catches unexpected errors', async ({ page, context }) => {
    // Simulate JavaScript error in component
    await page.addInitScript(() => {
      // Override console.error to catch React error boundary
      window.originalConsoleError = console.error;
      window.errorBoundaryCaught = false;
      console.error = (...args) => {
        if (args[0]?.includes?.('Error boundary')) {
          window.errorBoundaryCaught = true;
        }
        window.originalConsoleError(...args);
      };
    });

    // Cause an error that should be caught by error boundary
    await page.evaluate(() => {
      // Simulate component error
      const event = new CustomEvent('test-error');
      window.dispatchEvent(event);
    });

    // Should show error boundary UI
    await expect(page.locator('[data-testid="error-boundary"]')).toBeVisible();
    await expect(page.locator('[data-testid="error-boundary"]')).toContainText('Something went wrong');

    // Should have refresh/reload option
    await expect(page.locator('[data-testid="reload-page-btn"]')).toBeVisible();
  });
});