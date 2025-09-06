const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  console.log('🧪 TESTING FRONTEND-TO-BACKEND INTEGRATION');
  console.log('================================================');
  
  // Listen for all console messages and network requests
  const consoleMessages = [];
  const networkRequests = [];
  const networkErrors = [];
  
  page.on('console', msg => {
    const message = `${msg.type().toUpperCase()}: ${msg.text()}`;
    consoleMessages.push(message);
    console.log(`🖥️  ${message}`);
  });
  
  page.on('request', request => {
    if (request.url().includes('localhost:3001')) {
      networkRequests.push({
        method: request.method(),
        url: request.url(),
        headers: request.headers()
      });
      console.log(`📡 REQUEST: ${request.method()} ${request.url()}`);
    }
  });
  
  page.on('response', response => {
    if (response.url().includes('localhost:3001')) {
      console.log(`📡 RESPONSE: ${response.status()} ${response.url()}`);
      if (response.status() !== 200) {
        networkErrors.push({
          status: response.status(),
          url: response.url(),
          statusText: response.statusText()
        });
      }
    }
  });
  
  page.on('pageerror', err => {
    console.log(`❌ PAGE ERROR: ${err.message}`);
  });

  try {
    console.log('🌐 Navigating to http://localhost:3002...');
    await page.goto('http://localhost:3002', { 
      waitUntil: 'networkidle',
      timeout: 30000 
    });
    
    console.log('📸 Taking initial screenshot...');
    await page.screenshot({ path: 'integration-test-1-loaded.png', fullPage: true });
    
    // Wait for React to mount and make API calls
    console.log('⏱️  Waiting for React app to load and make API requests...');
    await page.waitForTimeout(5000);
    
    // Check if employees are loaded
    console.log('🔍 Checking for employee data...');
    const rootContent = await page.locator('#root').innerHTML();
    const hasEmployeeData = rootContent.includes('John') || rootContent.includes('Jane') || rootContent.includes('Mike');
    
    console.log(`📊 Root content length: ${rootContent.length} characters`);
    console.log(`👥 Has employee data: ${hasEmployeeData}`);
    
    // Take final screenshot
    await page.screenshot({ path: 'integration-test-2-final.png', fullPage: true });
    
    // Check for specific employee management UI elements
    const title = await page.locator('h1').textContent().catch(() => 'No title found');
    const buttons = await page.locator('button').count();
    const inputs = await page.locator('input').count();
    
    console.log('\n🎯 INTEGRATION TEST RESULTS:');
    console.log('================================');
    console.log(`📱 Page title: "${title}"`);
    console.log(`🔘 Buttons found: ${buttons}`);
    console.log(`📝 Inputs found: ${inputs}`);
    console.log(`📡 Network requests made: ${networkRequests.length}`);
    console.log(`❌ Network errors: ${networkErrors.length}`);
    console.log(`📜 Console messages: ${consoleMessages.length}`);
    console.log(`👥 Employee data visible: ${hasEmployeeData}`);
    
    if (networkRequests.length > 0) {
      console.log('\n📊 API REQUESTS MADE:');
      networkRequests.forEach((req, i) => {
        console.log(`  ${i + 1}. ${req.method} ${req.url}`);
      });
    }
    
    if (networkErrors.length > 0) {
      console.log('\n❌ NETWORK ERRORS:');
      networkErrors.forEach((err, i) => {
        console.log(`  ${i + 1}. ${err.status} ${err.url} - ${err.statusText}`);
      });
    }
    
    console.log('\n📸 Screenshots saved:');
    console.log('  - integration-test-1-loaded.png (initial page load)');
    console.log('  - integration-test-2-final.png (after API calls)');
    
    const isIntegrationWorking = hasEmployeeData && networkRequests.length > 0 && networkErrors.length === 0;
    console.log(`\n🎯 INTEGRATION STATUS: ${isIntegrationWorking ? '✅ SUCCESS' : '❌ NEEDS FIXING'}`);
    
  } catch (error) {
    console.log(`❌ TEST FAILED: ${error.message}`);
  } finally {
    await browser.close();
  }
})();