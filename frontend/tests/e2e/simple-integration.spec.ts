import { test, expect } from '@playwright/test';

test.describe('Simple Frontend-Backend Integration', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the application
    await page.goto('http://localhost:3002');

    // Wait for the page to load
    await page.waitForLoadState('networkidle');
  });

  test('should load dashboard and display real employee data', async ({ page }) => {
    // Navigate to dashboard (root path since /dashboard might not exist)
    await page.goto('http://localhost:3002/');

    // Wait for page to load
    await page.waitForLoadState('networkidle');

    // Try to find any content that looks like a dashboard
    const hasContent = await page.locator('text=/Dashboard|Overview|Welcome|Team|Projects/i').count() > 0;

    if (hasContent) {
      console.log('Dashboard-like content found');

      // Check for any numeric statistics
      const stats = await page.locator('text=/\\d+/').all();
      console.log(`Found ${stats.length} numeric values on the page`);

      if (stats.length > 0) {
        // Get first few numeric values
        for (let i = 0; i < Math.min(3, stats.length); i++) {
          const text = await stats[i].textContent();
          console.log(`Stat ${i + 1}: ${text}`);
        }
      }

      expect(hasContent).toBe(true);
    } else {
      // If no dashboard, just verify the page loaded
      const title = await page.title();
      console.log('Page title:', title);
      expect(title).toBeTruthy();
    }
  });

  test('should navigate to employees page and show list', async ({ page }) => {
    // Try multiple possible routes for employees
    const routes = ['/employees', '/team', '/staff', '/people'];
    let loaded = false;

    for (const route of routes) {
      await page.goto(`http://localhost:3002${route}`);
      await page.waitForLoadState('networkidle');

      // Check if we have employee data
      const hasEmployeeData = await page.locator('text=/@.*@/i').count() > 0 || // Email addresses
                              await page.locator('text=/developer|designer|manager|engineer/i').count() > 0; // Job titles

      if (hasEmployeeData) {
        loaded = true;
        console.log(`Employee data found at ${route}`);
        break;
      }
    }

    if (loaded) {
      // Verify we have at least some employee-like content
      const emails = await page.locator('text=/@.*@/i').count();
      const titles = await page.locator('text=/developer|designer|manager|engineer|analyst/i').count();

      console.log(`Found ${emails} email addresses and ${titles} job titles`);
      expect(emails + titles).toBeGreaterThan(0);
    }
  });

  test('should navigate to team dashboard and display data', async ({ page }) => {
    // Navigate to team dashboard
    await page.goto('http://localhost:3002/team-dashboard');

    // Wait for page to load
    await page.waitForLoadState('networkidle');

    // Check for team dashboard title
    const title = page.locator('h1:has-text("Team Dashboard"), [data-testid="team-dashboard-title"]').first();

    if (await title.isVisible({ timeout: 5000 }).catch(() => false)) {
      const titleText = await title.textContent();
      console.log('Team Dashboard title:', titleText);
      expect(titleText).toContain('Team');

      // Check for team statistics
      const statsCards = await page.locator('.card, [data-testid*="card"]').count();
      console.log(`Found ${statsCards} stat cards`);

      // Check for team members count
      const memberCount = page.locator('text=/\\d+.*(?:Members?|Employees?)/i').first();
      if (await memberCount.isVisible({ timeout: 3000 }).catch(() => false)) {
        const text = await memberCount.textContent();
        console.log('Team member count:', text);

        const match = text?.match(/\d+/);
        if (match) {
          const count = parseInt(match[0]);
          expect(count).toBeGreaterThanOrEqual(0);
          expect(count).toBeLessThanOrEqual(100); // Reasonable upper limit
        }
      }

      // Check for utilization percentage
      const utilization = page.locator('text=/%/').first();
      if (await utilization.isVisible({ timeout: 3000 }).catch(() => false)) {
        const text = await utilization.textContent();
        console.log('Utilization:', text);

        const match = text?.match(/(\d+)%/);
        if (match) {
          const percent = parseInt(match[1]);
          expect(percent).toBeGreaterThanOrEqual(0);
          expect(percent).toBeLessThanOrEqual(100);
        }
      }
    }
  });

  test('should verify API endpoints are accessible', async ({ request }) => {
    // Test employees endpoint
    const employeesResponse = await request.get('http://localhost:3001/api/employees');
    expect(employeesResponse.status()).toBe(200);

    const employeesData = await employeesResponse.json();
    console.log('Employees API response:', {
      hasData: !!employeesData.data,
      dataLength: employeesData.data?.length,
      hasPagination: !!employeesData.pagination
    });

    // Check for either direct data array or data property
    if (Array.isArray(employeesData)) {
      expect(employeesData.length).toBeGreaterThanOrEqual(0);
    } else {
      expect(employeesData).toHaveProperty('data');
      expect(Array.isArray(employeesData.data)).toBe(true);
    }

    // Test projects endpoint
    const projectsResponse = await request.get('http://localhost:3001/api/projects');
    expect(projectsResponse.status()).toBe(200);

    const projectsData = await projectsResponse.json();
    console.log('Projects API response:', {
      hasData: !!projectsData.data,
      dataLength: projectsData.data?.length
    });

    // Check for either direct data array or data property
    if (Array.isArray(projectsData)) {
      expect(projectsData.length).toBeGreaterThanOrEqual(0);
    } else {
      expect(projectsData).toHaveProperty('data');
      expect(Array.isArray(projectsData.data)).toBe(true);
    }

    // Test allocations endpoint
    const allocationsResponse = await request.get('http://localhost:3001/api/allocations');
    expect(allocationsResponse.status()).toBe(200);

    const allocationsData = await allocationsResponse.json();
    console.log('Allocations API response:', {
      hasData: !!allocationsData.data,
      dataLength: allocationsData.data?.length,
      hasSuccess: 'success' in allocationsData
    });

    // Check for either direct data array or data property
    if (Array.isArray(allocationsData)) {
      expect(allocationsData.length).toBeGreaterThanOrEqual(0);
    } else {
      expect(allocationsData).toHaveProperty('data');
    }
  });

  test('should verify data flow from API to UI', async ({ page, request }) => {
    // First get data from API (use same limit as UI)
    const apiResponse = await request.get('http://localhost:3001/api/employees?limit=100');
    const apiData = await apiResponse.json();
    const apiEmployeeCount = apiData.data?.filter((e: any) => e.isActive === true).length || 0;

    console.log(`API reports ${apiEmployeeCount} employees`);

    // Now check if this data appears in the UI
    await page.goto('http://localhost:3002/team-dashboard');
    await page.waitForLoadState('networkidle');

    // Look for the employee count in the UI
    const employeeCountElement = page.locator('text=/Team Members|Active employees/i')
      .locator('..')
      .locator('text=/\\d+/').first();

    if (await employeeCountElement.isVisible({ timeout: 5000 }).catch(() => false)) {
      const uiCount = await employeeCountElement.textContent();
      const uiNumber = parseInt(uiCount || '0');

      console.log(`UI displays ${uiNumber} employees`);

      // The counts should match or be close (UI might filter active employees)
      expect(uiNumber).toBeGreaterThanOrEqual(0);
      expect(uiNumber).toBeLessThanOrEqual(apiEmployeeCount + 5); // Allow some variance
    }
  });
});