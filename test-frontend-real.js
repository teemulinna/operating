const { chromium } = require('playwright');

async function testFrontendIntegration() {
  console.log('🧪 REAL FRONTEND INTEGRATION TEST');
  console.log('===================================');
  
  const browser = await chromium.launch({ headless: false, devtools: true });
  const page = await browser.newPage();
  
  // Capture everything
  const consoleMessages = [];
  const networkRequests = [];
  const errors = [];
  
  page.on('console', msg => {
    const message = `[${msg.type()}] ${msg.text()}`;
    consoleMessages.push(message);
    if (msg.type() === 'error') {
      console.log(`❌ ${message}`);
    } else {
      console.log(`📱 ${message}`);
    }
  });
  
  page.on('request', req => {
    if (req.url().includes('3001')) {
      console.log(`📡 REQUEST: ${req.method()} ${req.url()}`);
      networkRequests.push({ method: req.method(), url: req.url() });
    }
  });
  
  page.on('response', res => {
    if (res.url().includes('3001')) {
      console.log(`📡 RESPONSE: ${res.status()} ${res.url()}`);
    }
  });
  
  page.on('requestfailed', req => {
    console.log(`🔥 FAILED REQUEST: ${req.url()} - ${req.failure()?.errorText || 'Unknown error'}`);
    errors.push({ url: req.url(), error: req.failure()?.errorText });
  });

  try {
    console.log('🌐 Loading frontend...');
    await page.goto('http://localhost:3002', { waitUntil: 'domcontentloaded', timeout: 10000 });
    
    // Wait for potential API calls
    console.log('⏱️ Waiting for API calls...');
    await page.waitForTimeout(5000);
    
    // Check what's actually rendered
    const pageTitle = await page.title();
    const rootContent = await page.locator('#root').innerHTML().catch(() => '');
    const hasContent = rootContent.length > 100;
    
    console.log('\n📊 RESULTS:');
    console.log(`Title: ${pageTitle}`);
    console.log(`Root content length: ${rootContent.length}`);
    console.log(`Has meaningful content: ${hasContent}`);
    console.log(`Console messages: ${consoleMessages.length}`);
    console.log(`Network requests: ${networkRequests.length}`);
    console.log(`Failed requests: ${errors.length}`);
    
    if (rootContent.length > 0 && rootContent.length < 1000) {
      console.log('\nActual content:');
      console.log(rootContent);
    }
    
    console.log('\n🎯 VERDICT: ' + (hasContent && pageTitle.includes('Employee') ? 'WORKING ✅' : 'NOT WORKING ❌'));
    
  } catch (err) {
    console.log(`❌ Test failed: ${err.message}`);
  }
  
  // Keep browser open for manual inspection
  console.log('\n🔍 Browser left open for manual inspection...');
  await page.waitForTimeout(10000);
  await browser.close();
}

testFrontendIntegration();