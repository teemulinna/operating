const { chromium } = require('playwright');

async function testEmployeeList() {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  try {
    console.log('🔍 Testing Employee Management System...');
    
    // Navigate to the application
    console.log('📍 Navigating to http://localhost:3002...');
    await page.goto('http://localhost:3002', { waitUntil: 'networkidle' });
    
    // Wait for the employee list to load
    console.log('⏳ Waiting for Employee Directory...');
    await page.waitForSelector('[data-testid="employee-directory"], .employee-directory, h1:has-text("Employee Directory"), [role="main"]', { timeout: 10000 });
    
    // Check if employees are displayed
    console.log('👥 Checking for employee data...');
    
    // Wait for table rows or employee cards
    try {
      await page.waitForSelector('table tbody tr, .employee-card, [data-testid="employee-item"]', { timeout: 5000 });
      console.log('✅ SUCCESS: Employees are displayed!');
      
      // Count employees
      const employeeCount = await page.locator('table tbody tr, .employee-card, [data-testid="employee-item"]').count();
      console.log(`📊 Found ${employeeCount} employees`);
      
      // Check for specific employee data
      const johnDoe = await page.locator('text=John').first().isVisible();
      if (johnDoe) {
        console.log('✅ SUCCESS: John Doe employee found!');
      }
      
      // Take screenshot of success
      await page.screenshot({ path: '/Users/teemulinna/code/operating/employee-list-success.png' });
      console.log('📸 Screenshot saved: employee-list-success.png');
      
    } catch (error) {
      console.log('❌ FAILED: No employees displayed');
      console.log('Error:', error.message);
      
      // Check for error messages
      const errorElement = await page.locator('[data-testid="error"], .error, text=/error/i').first();
      if (await errorElement.isVisible()) {
        const errorText = await errorElement.textContent();
        console.log('🚨 Error message found:', errorText);
      }
      
      // Check for loading states
      const loadingElement = await page.locator('[data-testid="loading"], .loading, text=/loading/i').first();
      if (await loadingElement.isVisible()) {
        console.log('⏳ Still loading...');
      }
      
      // Take screenshot of issue
      await page.screenshot({ path: '/Users/teemulinna/code/operating/employee-list-error.png' });
      console.log('📸 Screenshot saved: employee-list-error.png');
    }
    
    // Check network requests
    const responses = [];
    page.on('response', response => {
      if (response.url().includes('/api/employees')) {
        responses.push({
          url: response.url(),
          status: response.status(),
          statusText: response.statusText()
        });
      }
    });
    
    // Refresh to capture network calls
    await page.reload({ waitUntil: 'networkidle' });
    
    console.log('🌐 API Responses:', responses);
    
  } catch (error) {
    console.error('💥 Test failed:', error.message);
    await page.screenshot({ path: '/Users/teemulinna/code/operating/test-failure.png' });
    console.log('📸 Failure screenshot saved: test-failure.png');
  } finally {
    await browser.close();
    console.log('🔚 Test completed');
  }
}

testEmployeeList().catch(console.error);