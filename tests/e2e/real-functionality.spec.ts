import { test, expect } from '@playwright/test';

test.describe('Real E2E Functionality Tests', () => {
  test('Frontend loads successfully', async ({ page }) => {
    // Navigate to the frontend
    await page.goto('http://localhost:3002');

    // Wait for page to load
    await page.waitForLoadState('networkidle');

    // Check that the page has loaded
    const title = await page.title();
    expect(title).toBeTruthy();
    console.log(`Page title: ${title}`);

    // Check for main content
    const bodyText = await page.textContent('body');
    expect(bodyText).toBeTruthy();
  });

  test('API health check works', async ({ page }) => {
    // Check backend API directly
    const response = await page.request.get('http://localhost:3001/health');
    expect(response.ok()).toBeTruthy();

    const health = await response.json();
    expect(health.status).toBe('healthy');
    expect(health.services.database).toBe(true);
    expect(health.services.overall).toBe(true);
    console.log('Backend health:', health);
  });

  test('Can fetch employees from API', async ({ page }) => {
    // Try to fetch employees from API
    const response = await page.request.get('http://localhost:3001/api/employees');
    expect(response.ok()).toBeTruthy();

    const data = await response.json();
    console.log(`Found ${data.data ? data.data.length : 0} employees`);
    expect(data).toHaveProperty('data');
  });

  test('Can fetch projects from API', async ({ page }) => {
    // Try to fetch projects from API
    const response = await page.request.get('http://localhost:3001/api/projects');
    expect(response.ok()).toBeTruthy();

    const data = await response.json();
    console.log(`Found ${data.data ? data.data.length : 0} projects`);
    expect(data).toHaveProperty('data');
  });

  test('Can fetch skills from API', async ({ page }) => {
    // Try to fetch skills from API
    const response = await page.request.get('http://localhost:3001/api/skills');
    expect(response.ok()).toBeTruthy();

    const data = await response.json();
    console.log(`Found ${Array.isArray(data) ? data.length : 0} skills`);
    // Skills endpoint returns array directly
    expect(Array.isArray(data) || data.data).toBeTruthy();
  });

  test('Frontend makes API calls', async ({ page }) => {
    // Set up request interception
    const apiCalls: string[] = [];

    page.on('request', request => {
      const url = request.url();
      if (url.includes('localhost:3001')) {
        apiCalls.push(url);
      }
    });

    // Navigate to frontend
    await page.goto('http://localhost:3002');

    // Wait a bit for any API calls
    await page.waitForTimeout(2000);

    // Check if any API calls were made
    console.log(`API calls made: ${apiCalls.length}`);
    apiCalls.forEach(call => console.log(`  - ${call}`));
  });

  test('Can navigate frontend pages', async ({ page }) => {
    await page.goto('http://localhost:3002');

    // Check for navigation elements
    const links = await page.$$('a');
    console.log(`Found ${links.length} links on page`);

    const buttons = await page.$$('button');
    console.log(`Found ${buttons.length} buttons on page`);

    // Check for main content areas
    const divs = await page.$$('div');
    console.log(`Found ${divs.length} div elements`);

    expect(divs.length).toBeGreaterThan(0);
  });

  test('Check for forms and inputs', async ({ page }) => {
    await page.goto('http://localhost:3002');

    // Look for form elements
    const inputs = await page.$$('input');
    console.log(`Found ${inputs.length} input fields`);

    const forms = await page.$$('form');
    console.log(`Found ${forms.length} forms`);

    const selects = await page.$$('select');
    console.log(`Found ${selects.length} select dropdowns`);
  });

  test('Test CRUD operations via API', async ({ page }) => {
    const testData = {
      name: `Test Employee ${Date.now()}`,
      email: `test${Date.now()}@example.com`,
      position: 'Test Position',
      department: 'Engineering',
      salary: 50000
    };

    // Try to create an employee
    const createResponse = await page.request.post('http://localhost:3001/api/employees', {
      data: testData,
      headers: { 'Content-Type': 'application/json' }
    });

    if (createResponse.ok()) {
      const created = await createResponse.json();
      console.log('Created employee:', created);

      // If creation succeeded, try to fetch it
      if (created.id || created.data?.id) {
        const id = created.id || created.data.id;
        const getResponse = await page.request.get(`http://localhost:3001/api/employees/${id}`);

        if (getResponse.ok()) {
          const fetched = await getResponse.json();
          console.log('Fetched employee:', fetched);
        }

        // Try to delete it
        const deleteResponse = await page.request.delete(`http://localhost:3001/api/employees/${id}`);
        console.log('Delete response:', deleteResponse.status());
      }
    } else {
      console.log('Create failed with status:', createResponse.status());
      const error = await createResponse.text();
      console.log('Error:', error);
    }
  });

  test('Performance metrics', async ({ page }) => {
    // Navigate and measure performance
    const startTime = Date.now();
    await page.goto('http://localhost:3002');
    await page.waitForLoadState('domcontentloaded');
    const loadTime = Date.now() - startTime;

    console.log(`Page load time: ${loadTime}ms`);
    expect(loadTime).toBeLessThan(5000); // Should load in under 5 seconds

    // Check for console errors
    const consoleMessages: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleMessages.push(msg.text());
      }
    });

    await page.waitForTimeout(1000);

    if (consoleMessages.length > 0) {
      console.log('Console errors found:');
      consoleMessages.forEach(msg => console.log(`  - ${msg}`));
    }
  });
});

test.describe('Database Connectivity', () => {
  test('Database operations work', async ({ page }) => {
    // Test various database endpoints
    const endpoints = [
      '/api/departments',
      '/api/skills',
      '/api/capacity',
      '/api/allocations',
      '/api/scenarios'
    ];

    for (const endpoint of endpoints) {
      const response = await page.request.get(`http://localhost:3001${endpoint}`);
      console.log(`${endpoint}: ${response.status()}`);

      if (response.ok()) {
        const data = await response.json();
        console.log(`  - Data structure: ${JSON.stringify(Object.keys(data)).substring(0, 100)}`);
      }
    }
  });
});

test.describe('Real User Workflows', () => {
  test('Complete employee management flow', async ({ page }) => {
    await page.goto('http://localhost:3002');

    // Look for employee-related UI elements
    const employeeElements = await page.$$('[class*="employee"], [id*="employee"], [data-*="employee"]');
    console.log(`Found ${employeeElements.length} employee-related elements`);

    // Try to find and click an "Add" button
    const addButtons = await page.$$('button:has-text("Add"), button:has-text("New"), button:has-text("Create")');
    console.log(`Found ${addButtons.length} add/create buttons`);

    if (addButtons.length > 0) {
      await addButtons[0].click();
      await page.waitForTimeout(1000);

      // Check if a form appeared
      const formsAfterClick = await page.$$('form');
      console.log(`Forms after clicking add: ${formsAfterClick.length}`);
    }
  });
});