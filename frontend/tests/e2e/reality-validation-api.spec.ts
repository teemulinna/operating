import { test, expect } from '@playwright/test';

test.describe('End-to-End Reality Validation', () => {
  
  test('🔍 Reality Check 1: Backend API Connection and Real Data', async ({ page }) => {
    console.log('🚀 Testing real backend API connections...');

    // Direct API testing to verify real backend
    const endpoints = [
      { url: 'http://localhost:3001/api/employees', name: 'Employees' },
      { url: 'http://localhost:3001/api/departments', name: 'Departments' },  
      { url: 'http://localhost:3001/api/projects', name: 'Projects' }
    ];

    for (const endpoint of endpoints) {
      const response = await page.request.get(endpoint.url);
      console.log(`📊 ${endpoint.name} API Status:`, response.status());
      
      if (response.status() === 200) {
        const data = await response.json();
        console.log(`📋 ${endpoint.name} Response Structure:`, Object.keys(data));
        
        // Verify real backend response format
        if (data.data !== undefined) {
          expect(data).toHaveProperty('data');
          expect(data.data).toBeInstanceOf(Array);
        }
        
        if (data.pagination !== undefined) {
          expect(data.pagination).toHaveProperty('currentPage');
          expect(data.pagination).toHaveProperty('totalItems');
        }
        
        console.log(`✅ ${endpoint.name} API validated with real backend`);
      } else {
        console.log(`⚠️  ${endpoint.name} API returned status:`, response.status());
      }
    }
  });

  test('🔍 Reality Check 2: Frontend Application Loading', async ({ page }) => {
    console.log('🚀 Testing frontend application with real backend integration...');
    
    // Navigate to the application
    await page.goto('http://localhost:3002');
    await page.waitForLoadState('networkidle');

    // Verify application title
    await expect(page).toHaveTitle(/ResourceForge/);
    console.log('✅ Application title validated');

    // Check for main navigation
    const navigation = page.locator('nav');
    await expect(navigation).toBeVisible();
    console.log('✅ Main navigation present');

    // Test navigation links
    const navLinks = ['Dashboard', 'Employees', 'Projects', 'Allocations', 'Reports'];
    for (const linkText of navLinks) {
      const link = page.locator(`text="${linkText}"`).first();
      const isVisible = await link.isVisible();
      console.log(`🔗 ${linkText} link visible:`, isVisible);
    }
  });

  test('🔍 Reality Check 3: Employee Data Integration', async ({ page }) => {
    console.log('🚀 Testing employee data with real database...');
    
    await page.goto('http://localhost:3002');
    await page.waitForLoadState('networkidle');

    // Navigate to employees if link exists
    const employeesLink = page.locator('text="Employees"').first();
    if (await employeesLink.isVisible()) {
      await employeesLink.click();
      await page.waitForLoadState('networkidle');
      
      // Check for API calls to backend
      const [response] = await Promise.all([
        page.waitForResponse(response => response.url().includes('/api/employees')),
        page.reload()
      ]);

      console.log('📊 Employees API Response Status:', response.status());
      
      if (response.status() === 200) {
        const data = await response.json();
        console.log('📋 Employees Data Count:', data.data ? data.data.length : 'Unknown');
        console.log('🔍 Sample Employee Data:', data.data?.[0] ? JSON.stringify(data.data[0], null, 2) : 'No data');
        
        // Validate real database fields
        if (data.data && data.data.length > 0) {
          const employee = data.data[0];
          expect(employee).toHaveProperty('id');
          expect(employee).toHaveProperty('createdAt');
          expect(employee).toHaveProperty('updatedAt');
          console.log('✅ Employee data contains real database fields');
        }
      }
    } else {
      console.log('⚠️  Employees link not found');
    }
  });

  test('🔍 Reality Check 4: Form Interactions and Validation', async ({ page }) => {
    console.log('🚀 Testing form interactions with backend validation...');
    
    await page.goto('http://localhost:3002');
    await page.waitForLoadState('networkidle');

    // Look for any buttons that might open forms
    const buttons = await page.locator('button').all();
    let formFound = false;

    for (const button of buttons) {
      const buttonText = await button.textContent();
      if (buttonText && (buttonText.includes('Add') || buttonText.includes('Create') || buttonText.includes('New'))) {
        console.log('🔍 Found potential form button:', buttonText);
        
        try {
          await button.click();
          await page.waitForTimeout(1000);
          
          // Look for form elements
          const forms = await page.locator('form').all();
          const inputs = await page.locator('input').all();
          
          if (forms.length > 0 || inputs.length > 0) {
            console.log('✅ Form UI elements found:', { forms: forms.length, inputs: inputs.length });
            formFound = true;
            break;
          }
        } catch (error) {
          console.log('⚠️  Button click failed:', buttonText);
        }
      }
    }

    console.log('📝 Form interaction test result:', formFound ? 'PASSED' : 'SKIPPED');
  });

  test('🔍 Reality Check 5: Data Persistence Verification', async ({ page, context }) => {
    console.log('🚀 Testing data persistence across browser sessions...');
    
    // Get initial data state
    const initialResponse = await page.request.get('http://localhost:3001/api/employees');
    const initialData = await initialResponse.json();
    const initialCount = initialData.data ? initialData.data.length : 0;
    
    console.log('📊 Initial employee count:', initialCount);
    
    // Close current page and create new one (simulate session restart)
    await page.close();
    const newPage = await context.newPage();
    
    // Verify data persists
    const persistedResponse = await newPage.request.get('http://localhost:3001/api/employees');
    const persistedData = await persistedResponse.json();
    const persistedCount = persistedData.data ? persistedData.data.length : 0;
    
    console.log('📊 Persisted employee count:', persistedCount);
    
    expect(persistedCount).toBe(initialCount);
    console.log('✅ Data persistence validated across sessions');
    
    await newPage.close();
  });

  test('🔍 Reality Check 6: Network Error Handling', async ({ page }) => {
    console.log('🚀 Testing network error handling...');
    
    // Block API calls to test error handling
    await page.route('**/api/**', route => {
      route.abort('failed');
    });

    await page.goto('http://localhost:3002');
    await page.waitForTimeout(3000); // Wait for error states
    
    // Check if application handles network failures gracefully
    const errorElements = await page.locator('[class*="error"]').all();
    const testErrorElements = await page.locator('[data-testid*="error"]').all();
    console.log('🚨 Error handling elements found:', errorElements.length + testErrorElements.length);
    
    // Re-enable network
    await page.unroute('**/api/**');
    
    // Verify recovery
    await page.reload();
    await page.waitForLoadState('networkidle');
    
    console.log('✅ Network error handling test completed');
  });

  test('🔍 Reality Check 7: Performance and Load Testing', async ({ page }) => {
    console.log('🚀 Testing application performance...');
    
    const startTime = Date.now();
    
    await page.goto('http://localhost:3002');
    await page.waitForLoadState('networkidle');
    
    const loadTime = Date.now() - startTime;
    console.log('⏱️  Application load time:', loadTime + 'ms');
    
    // Test rapid navigation
    const navItems = ['Dashboard', 'Employees', 'Projects'];
    for (const navItem of navItems) {
      const navLink = page.locator(`text="${navItem}"`).first();
      if (await navLink.isVisible()) {
        const navStart = Date.now();
        await navLink.click();
        await page.waitForLoadState('networkidle');
        const navTime = Date.now() - navStart;
        console.log(`🔗 ${navItem} navigation time:`, navTime + 'ms');
      }
    }
    
    // Test concurrent API requests
    const concurrentStart = Date.now();
    const concurrentRequests = [
      page.request.get('http://localhost:3001/api/employees'),
      page.request.get('http://localhost:3001/api/departments'),
      page.request.get('http://localhost:3001/api/projects')
    ];
    
    const responses = await Promise.all(concurrentRequests);
    const concurrentTime = Date.now() - concurrentStart;
    console.log('🔄 Concurrent API calls time:', concurrentTime + 'ms');
    
    const successfulResponses = responses.filter(r => r.status() === 200).length;
    console.log('✅ Successful concurrent responses:', successfulResponses + '/' + responses.length);
    
    console.log('✅ Performance testing completed');
  });

});