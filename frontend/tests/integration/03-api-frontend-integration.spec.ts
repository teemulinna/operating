import { test, expect } from '@playwright/test';
import { mockPersons } from '../fixtures/testData';

test.describe('API to Frontend Integration', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('Frontend displays API data correctly', async ({ page, request }) => {
    // Add data via API
    const person = mockPersons[0];
    const createResponse = await request.post('/api/persons', {
      data: person
    });
    expect(createResponse.status()).toBe(201);

    // Refresh frontend and verify data displays
    await page.reload();
    await page.waitForLoadState('networkidle');

    await expect(page.locator(`text=${person.name}`)).toBeVisible();
    await expect(page.locator(`text=${person.email}`)).toBeVisible();
    await expect(page.locator(`text=${person.occupation}`)).toBeVisible();
  });

  test('Frontend CRUD operations sync with API', async ({ page, request }) => {
    const person = mockPersons[0];

    // CREATE via frontend
    await page.click('[data-testid="add-person-btn"]');
    await page.fill('[data-testid="name-input"]', person.name);
    await page.fill('[data-testid="age-input"]', person.age.toString());
    await page.fill('[data-testid="occupation-input"]', person.occupation);
    await page.fill('[data-testid="email-input"]', person.email);
    await page.fill('[data-testid="phone-input"]', person.phone || '');
    await page.fill('[data-testid="address-input"]', person.address || '');
    await page.click('[data-testid="save-person-btn"]');

    // Verify via API
    const getResponse = await request.get('/api/persons');
    const apiData = await getResponse.json();
    expect(apiData.data).toHaveLength(1);
    expect(apiData.data[0].name).toBe(person.name);

    const personId = apiData.data[0].id;

    // UPDATE via frontend
    await page.click(`[data-testid="edit-person-btn"]:near([data-testid="person-row"]:has-text("${person.name}"))`);
    const updatedName = `${person.name} Updated`;
    await page.fill('[data-testid="name-input"]', updatedName);
    await page.click('[data-testid="save-person-btn"]');

    // Verify update via API
    const updateResponse = await request.get(`/api/persons/${personId}`);
    const updatedData = await updateResponse.json();
    expect(updatedData.name).toBe(updatedName);

    // DELETE via frontend
    await page.click(`[data-testid="delete-person-btn"]:near([data-testid="person-row"]:has-text("${updatedName}"))`);
    await page.click('[data-testid="confirm-delete-btn"]');

    // Verify deletion via API
    const deleteResponse = await request.get(`/api/persons/${personId}`);
    expect(deleteResponse.status()).toBe(404);
  });

  test('Frontend search syncs with API filters', async ({ page, request }) => {
    // Add test data via API
    for (const person of mockPersons.slice(0, 3)) {
      await request.post('/api/persons', { data: person });
    }

    await page.reload();
    await page.waitForLoadState('networkidle');

    // Test search
    await page.fill('[data-testid="search-input"]', 'Software');
    await page.waitForTimeout(500);

    // Verify API is called with correct parameters
    const searchResults = page.locator('[data-testid="person-row"]');
    await expect(searchResults).toHaveCount(1);
    await expect(page.locator('text=John Doe')).toBeVisible();

    // Test age filter
    await page.fill('[data-testid="search-input"]', '');
    await page.fill('[data-testid="min-age-input"]', '30');
    await page.waitForTimeout(500);

    // Should show filtered results
    const ageFilteredResults = page.locator('[data-testid="person-row"]');
    await expect(ageFilteredResults).toHaveCount(2); // John (30) and Bob (35)
  });

  test('Frontend pagination controls API requests', async ({ page, request }) => {
    // Add enough data for pagination
    for (let i = 0; i < 25; i++) {
      await request.post('/api/persons', {
        data: {
          name: `Test Person ${i + 1}`,
          age: 20 + i,
          occupation: `Job ${i + 1}`,
          email: `test${i + 1}@example.com`,
          phone: `+1-555-${String(i + 1).padStart(4, '0')}`,
          address: `${i + 1} Test St`
        }
      });
    }

    await page.reload();
    await page.waitForLoadState('networkidle');

    // Verify first page
    await expect(page.locator('[data-testid="person-row"]')).toHaveCount(10);
    await expect(page.locator('[data-testid="current-page"]')).toHaveText('1');

    // Go to next page
    await page.click('[data-testid="next-page-btn"]');
    await page.waitForLoadState('networkidle');

    // Verify second page
    await expect(page.locator('[data-testid="current-page"]')).toHaveText('2');
    await expect(page.locator('[data-testid="person-row"]')).toHaveCount(10);

    // Go to last page
    await page.click('[data-testid="last-page-btn"]');
    await page.waitForLoadState('networkidle');

    // Verify last page
    await expect(page.locator('[data-testid="current-page"]')).toHaveText('3');
    await expect(page.locator('[data-testid="person-row"]')).toHaveCount(5);
  });

  test('Frontend handles API errors gracefully', async ({ page, request }) => {
    // Create person first
    const person = mockPersons[0];
    const createResponse = await request.post('/api/persons', { data: person });
    const createdPerson = await createResponse.json();

    await page.reload();
    await page.waitForLoadState('networkidle');

    // Delete person via API (simulate external deletion)
    await request.delete(`/api/persons/${createdPerson.id}`);

    // Try to edit from frontend (should handle 404)
    await page.click(`[data-testid="edit-person-btn"]:first`);
    await page.waitForSelector('[data-testid="person-form"]');
    
    await page.fill('[data-testid="name-input"]', 'Updated Name');
    await page.click('[data-testid="save-person-btn"]');

    // Should show error message
    await expect(page.locator('[data-testid="error-message"]')).toBeVisible();
    await expect(page.locator('[data-testid="error-message"]')).toContainText('not found');
  });

  test('Frontend real-time updates via WebSocket/polling', async ({ page, request }) => {
    // This test simulates real-time updates
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const person = mockPersons[0];

    // Add person via API (simulate external addition)
    const createResponse = await request.post('/api/persons', { data: person });
    expect(createResponse.status()).toBe(201);

    // Frontend should update automatically (polling or WebSocket)
    // Wait for the update to appear
    await expect(page.locator(`text=${person.name}`)).toBeVisible({ timeout: 5000 });

    const createdPerson = await createResponse.json();

    // Update via API
    await request.put(`/api/persons/${createdPerson.id}`, {
      data: { ...person, name: 'Updated Name' }
    });

    // Frontend should show update
    await expect(page.locator('text=Updated Name')).toBeVisible({ timeout: 5000 });

    // Delete via API
    await request.delete(`/api/persons/${createdPerson.id}`);

    // Frontend should remove person
    await expect(page.locator('text=Updated Name')).not.toBeVisible({ timeout: 5000 });
  });

  test('Frontend optimistic updates with API sync', async ({ page, request }) => {
    const person = mockPersons[0];

    // Add person via frontend
    await page.click('[data-testid="add-person-btn"]');
    await page.fill('[data-testid="name-input"]', person.name);
    await page.fill('[data-testid="age-input"]', person.age.toString());
    await page.fill('[data-testid="occupation-input"]', person.occupation);
    await page.fill('[data-testid="email-input"]', person.email);
    await page.fill('[data-testid="phone-input"]', person.phone || '');
    await page.fill('[data-testid="address-input"]', person.address || '');

    // Click save and immediately verify optimistic update
    await page.click('[data-testid="save-person-btn"]');
    
    // Should show person immediately (optimistic update)
    await expect(page.locator(`text=${person.name}`)).toBeVisible({ timeout: 1000 });

    // Wait for API response to complete
    await page.waitForLoadState('networkidle');

    // Verify person still exists after API sync
    await expect(page.locator(`text=${person.name}`)).toBeVisible();

    // Verify via API
    const getResponse = await request.get('/api/persons');
    const apiData = await getResponse.json();
    expect(apiData.data).toHaveLength(1);
    expect(apiData.data[0].name).toBe(person.name);
  });

  test('Frontend bulk operations sync with API', async ({ page, request }) => {
    // Add test data via API
    for (const person of mockPersons.slice(0, 3)) {
      await request.post('/api/persons', { data: person });
    }

    await page.reload();
    await page.waitForLoadState('networkidle');

    // Select all persons
    await page.check('[data-testid="select-all-checkbox"]');

    // Bulk delete
    await page.click('[data-testid="bulk-delete-btn"]');
    await page.click('[data-testid="confirm-bulk-delete-btn"]');

    // Verify via API
    const getResponse = await request.get('/api/persons');
    const apiData = await getResponse.json();
    expect(apiData.data).toHaveLength(0);

    // Frontend should also show empty state
    await expect(page.locator('[data-testid="empty-state"]')).toBeVisible();
  });

  test('Frontend caching strategy with API', async ({ page, request }) => {
    const person = mockPersons[0];
    
    // Add person via API
    await request.post('/api/persons', { data: person });

    // Load page (should cache data)
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await expect(page.locator(`text=${person.name}`)).toBeVisible();

    // Navigate away and back quickly
    await page.goto('/about'); // Assuming about page exists
    await page.goBack();

    // Should load from cache quickly
    await expect(page.locator(`text=${person.name}`)).toBeVisible({ timeout: 500 });

    // Force refresh to validate cache invalidation
    await page.reload();
    await page.waitForLoadState('networkidle');
    await expect(page.locator(`text=${person.name}`)).toBeVisible();
  });
});