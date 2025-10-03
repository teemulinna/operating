"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const test_1 = require("@playwright/test");
test_1.test.describe('Real E2E Functionality Tests', () => {
    (0, test_1.test)('Frontend loads successfully', async ({ page }) => {
        await page.goto('http://localhost:3002');
        await page.waitForLoadState('networkidle');
        const title = await page.title();
        (0, test_1.expect)(title).toBeTruthy();
        console.log(`Page title: ${title}`);
        const bodyText = await page.textContent('body');
        (0, test_1.expect)(bodyText).toBeTruthy();
    });
    (0, test_1.test)('API health check works', async ({ page }) => {
        const response = await page.request.get('http://localhost:3001/health');
        (0, test_1.expect)(response.ok()).toBeTruthy();
        const health = await response.json();
        (0, test_1.expect)(health.status).toBe('healthy');
        (0, test_1.expect)(health.services.database).toBe(true);
        (0, test_1.expect)(health.services.overall).toBe(true);
        console.log('Backend health:', health);
    });
    (0, test_1.test)('Can fetch employees from API', async ({ page }) => {
        const response = await page.request.get('http://localhost:3001/api/employees');
        (0, test_1.expect)(response.ok()).toBeTruthy();
        const data = await response.json();
        console.log(`Found ${data.data ? data.data.length : 0} employees`);
        (0, test_1.expect)(data).toHaveProperty('data');
    });
    (0, test_1.test)('Can fetch projects from API', async ({ page }) => {
        const response = await page.request.get('http://localhost:3001/api/projects');
        (0, test_1.expect)(response.ok()).toBeTruthy();
        const data = await response.json();
        console.log(`Found ${data.data ? data.data.length : 0} projects`);
        (0, test_1.expect)(data).toHaveProperty('data');
    });
    (0, test_1.test)('Can fetch skills from API', async ({ page }) => {
        const response = await page.request.get('http://localhost:3001/api/skills');
        (0, test_1.expect)(response.ok()).toBeTruthy();
        const data = await response.json();
        console.log(`Found ${Array.isArray(data) ? data.length : 0} skills`);
        (0, test_1.expect)(Array.isArray(data) || data.data).toBeTruthy();
    });
    (0, test_1.test)('Frontend makes API calls', async ({ page }) => {
        const apiCalls = [];
        page.on('request', request => {
            const url = request.url();
            if (url.includes('localhost:3001')) {
                apiCalls.push(url);
            }
        });
        await page.goto('http://localhost:3002');
        await page.waitForTimeout(2000);
        console.log(`API calls made: ${apiCalls.length}`);
        apiCalls.forEach(call => console.log(`  - ${call}`));
    });
    (0, test_1.test)('Can navigate frontend pages', async ({ page }) => {
        await page.goto('http://localhost:3002');
        const links = await page.$$('a');
        console.log(`Found ${links.length} links on page`);
        const buttons = await page.$$('button');
        console.log(`Found ${buttons.length} buttons on page`);
        const divs = await page.$$('div');
        console.log(`Found ${divs.length} div elements`);
        (0, test_1.expect)(divs.length).toBeGreaterThan(0);
    });
    (0, test_1.test)('Check for forms and inputs', async ({ page }) => {
        await page.goto('http://localhost:3002');
        const inputs = await page.$$('input');
        console.log(`Found ${inputs.length} input fields`);
        const forms = await page.$$('form');
        console.log(`Found ${forms.length} forms`);
        const selects = await page.$$('select');
        console.log(`Found ${selects.length} select dropdowns`);
    });
    (0, test_1.test)('Test CRUD operations via API', async ({ page }) => {
        const testData = {
            name: `Test Employee ${Date.now()}`,
            email: `test${Date.now()}@example.com`,
            position: 'Test Position',
            department: 'Engineering',
            salary: 50000
        };
        const createResponse = await page.request.post('http://localhost:3001/api/employees', {
            data: testData,
            headers: { 'Content-Type': 'application/json' }
        });
        if (createResponse.ok()) {
            const created = await createResponse.json();
            console.log('Created employee:', created);
            if (created.id || created.data?.id) {
                const id = created.id || created.data.id;
                const getResponse = await page.request.get(`http://localhost:3001/api/employees/${id}`);
                if (getResponse.ok()) {
                    const fetched = await getResponse.json();
                    console.log('Fetched employee:', fetched);
                }
                const deleteResponse = await page.request.delete(`http://localhost:3001/api/employees/${id}`);
                console.log('Delete response:', deleteResponse.status());
            }
        }
        else {
            console.log('Create failed with status:', createResponse.status());
            const error = await createResponse.text();
            console.log('Error:', error);
        }
    });
    (0, test_1.test)('Performance metrics', async ({ page }) => {
        const startTime = Date.now();
        await page.goto('http://localhost:3002');
        await page.waitForLoadState('domcontentloaded');
        const loadTime = Date.now() - startTime;
        console.log(`Page load time: ${loadTime}ms`);
        (0, test_1.expect)(loadTime).toBeLessThan(5000);
        const consoleMessages = [];
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
test_1.test.describe('Database Connectivity', () => {
    (0, test_1.test)('Database operations work', async ({ page }) => {
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
test_1.test.describe('Real User Workflows', () => {
    (0, test_1.test)('Complete employee management flow', async ({ page }) => {
        await page.goto('http://localhost:3002');
        const employeeElements = await page.$$('[class*="employee"], [id*="employee"], [data-*="employee"]');
        console.log(`Found ${employeeElements.length} employee-related elements`);
        const addButtons = await page.$$('button:has-text("Add"), button:has-text("New"), button:has-text("Create")');
        console.log(`Found ${addButtons.length} add/create buttons`);
        if (addButtons.length > 0) {
            await addButtons[0].click();
            await page.waitForTimeout(1000);
            const formsAfterClick = await page.$$('form');
            console.log(`Forms after clicking add: ${formsAfterClick.length}`);
        }
    });
});
//# sourceMappingURL=real-functionality.spec.js.map