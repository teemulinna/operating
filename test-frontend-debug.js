const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  // Listen for console logs and errors
  page.on('console', msg => console.log('BROWSER:', msg.text()));
  page.on('pageerror', err => console.log('ERROR:', err.message));
  
  try {
    console.log('Navigating to http://localhost:3000...');
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle', timeout: 10000 });
    
    console.log('Taking screenshot...');
    await page.screenshot({ path: 'frontend-debug.png', fullPage: true });
    
    console.log('Getting page content...');
    const title = await page.title();
    const content = await page.content();
    const rootContent = await page.locator('#root').innerHTML().catch(() => 'Root element not found');
    
    console.log('=== FRONTEND DEBUG RESULTS ===');
    console.log('Title:', title);
    console.log('Root content length:', rootContent.length);
    console.log('Root content preview:', rootContent.substring(0, 200));
    
    // Wait a bit to see any delayed rendering
    await page.waitForTimeout(5000);
    await page.screenshot({ path: 'frontend-debug-final.png', fullPage: true });
    
  } catch (error) {
    console.log('ERROR during test:', error.message);
  } finally {
    await browser.close();
  }
})();