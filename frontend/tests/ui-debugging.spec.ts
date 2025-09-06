import { test, expect, Page, BrowserContext } from '@playwright/test';

/**
 * Comprehensive UI Debugging Test Suite
 * Purpose: Analyze Employee Management System UI state and functionality
 */

test.describe('Employee Management System UI Debugging', () => {
  let consoleMessages: string[] = [];
  let networkFailures: any[] = [];
  let networkResponses: any[] = [];

  test.beforeEach(async ({ page }) => {
    consoleMessages = [];
    networkFailures = [];
    networkResponses = [];

    // Capture console messages
    page.on('console', (msg) => {
      const message = `[${msg.type().toUpperCase()}] ${msg.text()}`;
      consoleMessages.push(message);
      console.log('Console:', message);
    });

    // Capture network requests
    page.on('request', (request) => {
      console.log('Request:', request.method(), request.url());
    });

    // Capture network responses 
    page.on('response', async (response) => {
      const url = response.url();
      const status = response.status();
      const contentType = response.headers()['content-type'] || 'unknown';
      
      let responseBody = '';
      try {
        if (url.includes('/api/')) {
          responseBody = await response.text();
        }
      } catch (e) {
        responseBody = 'Could not read response body';
      }

      const responseData = {
        url,
        status,
        contentType,
        body: responseBody,
        statusText: response.statusText()
      };

      networkResponses.push(responseData);

      if (status >= 400) {
        networkFailures.push(responseData);
        console.log('Network Failure:', JSON.stringify(responseData, null, 2));
      } else {
        console.log('Network Success:', `${response.method()} ${url} - ${status}`);
      }
    });

    // Capture page errors
    page.on('pageerror', (error) => {
      consoleMessages.push(`[PAGE_ERROR] ${error.message}`);
      console.log('Page Error:', error.message);
    });
  });

  test('should load homepage and capture initial rendering state', async ({ page }) => {
    console.log('\n🔍 TEST: Loading homepage and analyzing initial state...');
    
    // Navigate to homepage
    await page.goto('http://localhost:3002');
    
    // Wait for page to potentially load
    await page.waitForTimeout(3000);
    
    // Take initial screenshot
    await page.screenshot({ 
      path: '/Users/teemulinna/code/operating/frontend/tests/screenshots/homepage-initial.png',
      fullPage: true 
    });

    // Check if React app root exists
    const rootElement = await page.locator('#root');
    await expect(rootElement).toBeVisible();

    // Check what's actually rendered in the root
    const rootContent = await page.locator('#root').innerHTML();
    console.log('Root element content:', rootContent);

    // Check for common React/Vite indicators
    const reactRefreshScript = await page.locator('script[src*="@vite/client"]').count();
    console.log('Vite client script found:', reactRefreshScript > 0);

    // Check page title
    const title = await page.title();
    console.log('Page title:', title);

    // Look for any visible text or components
    const bodyText = await page.locator('body').textContent();
    console.log('Body text content:', bodyText);

    // Check for loading states or error messages
    const loadingElements = await page.locator('[data-testid*="loading"], .loading, .spinner').count();
    const errorElements = await page.locator('[data-testid*="error"], .error, .alert-error').count();
    
    console.log('Loading elements found:', loadingElements);
    console.log('Error elements found:', errorElements);

    // Log findings
    console.log('\n📊 INITIAL RENDERING ANALYSIS:');
    console.log('- Root element exists:', await rootElement.isVisible());
    console.log('- Root content length:', rootContent.length);
    console.log('- Page title:', title);
    console.log('- Body text length:', bodyText?.length || 0);
    console.log('- Console messages:', consoleMessages.length);
    console.log('- Network failures:', networkFailures.length);
  });

  test('should analyze React component mounting and rendering', async ({ page }) => {
    console.log('\n⚛️ TEST: Analyzing React component mounting...');
    
    await page.goto('http://localhost:3002');
    
    // Wait for potential React hydration
    await page.waitForTimeout(5000);

    // Check for React DevTools indicators
    const reactDevTools = await page.evaluate(() => {
      return {
        hasReact: !!(window as any).React,
        hasReactDOM: !!(window as any).ReactDOM,
        reactDevTools: !!(window as any).__REACT_DEVTOOLS_GLOBAL_HOOK__
      };
    });

    console.log('React environment:', reactDevTools);

    // Look for common React component patterns
    const reactComponents = await page.locator('[data-react-component], [class*="App"], [class*="component"]').count();
    console.log('React-like components found:', reactComponents);

    // Check for React error boundaries
    const errorBoundaries = await page.locator('[data-testid*="error-boundary"], .error-boundary').count();
    console.log('Error boundaries found:', errorBoundaries);

    // Take component analysis screenshot
    await page.screenshot({ 
      path: '/Users/teemulinna/code/operating/frontend/tests/screenshots/react-analysis.png',
      fullPage: true 
    });

    // Check if main app component loaded
    const appComponent = await page.locator('.App, [data-testid="app"], main').count();
    console.log('Main app components found:', appComponent);
  });

  test('should test employee management interface functionality', async ({ page }) => {
    console.log('\n👥 TEST: Testing employee management interface...');
    
    await page.goto('http://localhost:3002');
    await page.waitForTimeout(3000);

    // Look for employee-related elements
    const employeeElements = await page.locator('[data-testid*="employee"], [class*="employee"], h1:has-text("Employee"), h2:has-text("Employee")').count();
    console.log('Employee-related elements found:', employeeElements);

    // Look for table or list elements
    const tableElements = await page.locator('table, [role="table"], .table, [data-testid*="table"]').count();
    const listElements = await page.locator('ul, ol, [role="list"], .list, [data-testid*="list"]').count();
    
    console.log('Table elements found:', tableElements);
    console.log('List elements found:', listElements);

    // Look for navigation elements
    const navElements = await page.locator('nav, [role="navigation"], .nav, .navbar, [data-testid*="nav"]').count();
    console.log('Navigation elements found:', navElements);

    // Look for buttons and interactive elements
    const buttons = await page.locator('button, [role="button"], input[type="button"], input[type="submit"]').count();
    console.log('Interactive buttons found:', buttons);

    // Check for form elements
    const forms = await page.locator('form, [role="form"], .form').count();
    console.log('Form elements found:', forms);

    // Take interface analysis screenshot
    await page.screenshot({ 
      path: '/Users/teemulinna/code/operating/frontend/tests/screenshots/interface-analysis.png',
      fullPage: true 
    });

    // Try to find any text content that might indicate the app state
    const headings = await page.locator('h1, h2, h3').allTextContents();
    const paragraphs = await page.locator('p').allTextContents();
    
    console.log('Headings found:', headings);
    console.log('Paragraphs found:', paragraphs.slice(0, 5)); // First 5 paragraphs
  });

  test('should test API connectivity and data loading', async ({ page }) => {
    console.log('\n🌐 TEST: Testing API connectivity from frontend...');
    
    await page.goto('http://localhost:3002');
    
    // Wait for any initial API calls
    await page.waitForTimeout(5000);

    // Check for loading states
    const loadingStates = await page.locator('[data-testid*="loading"], .loading, .spinner, [aria-busy="true"]').count();
    console.log('Loading states found:', loadingStates);

    // Check for error states
    const errorStates = await page.locator('[data-testid*="error"], .error, .alert, .notification').count();
    console.log('Error states found:', errorStates);

    // Try to trigger API calls by looking for refresh buttons or similar
    const refreshButtons = await page.locator('button:has-text("Refresh"), button:has-text("Load"), [data-testid*="refresh"]').count();
    if (refreshButtons > 0) {
      console.log('Attempting to trigger API calls...');
      await page.click('button:has-text("Refresh")').catch(() => console.log('Could not click refresh button'));
      await page.waitForTimeout(2000);
    }

    // Take API connectivity screenshot
    await page.screenshot({ 
      path: '/Users/teemulinna/code/operating/frontend/tests/screenshots/api-connectivity.png',
      fullPage: true 
    });

    // Analyze network activity
    console.log('\n📡 NETWORK ANALYSIS:');
    console.log('- Total network responses:', networkResponses.length);
    console.log('- Network failures:', networkFailures.length);
    
    if (networkFailures.length > 0) {
      console.log('- Failed requests:');
      networkFailures.forEach((failure, index) => {
        console.log(`  ${index + 1}. ${failure.url} - ${failure.status} ${failure.statusText}`);
        if (failure.body) {
          console.log(`     Body: ${failure.body.slice(0, 200)}...`);
        }
      });
    }

    if (networkResponses.length > 0) {
      console.log('- Successful requests:');
      networkResponses.filter(r => r.status < 400).forEach((response, index) => {
        console.log(`  ${index + 1}. ${response.url} - ${response.status}`);
      });
    }
  });

  test('should perform comprehensive UI state analysis', async ({ page }) => {
    console.log('\n🔬 TEST: Comprehensive UI state analysis...');
    
    await page.goto('http://localhost:3002');
    await page.waitForTimeout(5000);

    // Get detailed DOM analysis
    const domAnalysis = await page.evaluate(() => {
      const root = document.getElementById('root');
      return {
        rootExists: !!root,
        rootChildrenCount: root?.children.length || 0,
        rootInnerHTML: root?.innerHTML.slice(0, 500) || '',
        totalElements: document.querySelectorAll('*').length,
        scriptsCount: document.querySelectorAll('script').length,
        stylesheetsCount: document.querySelectorAll('link[rel="stylesheet"]').length,
        imagesCount: document.querySelectorAll('img').length,
        hasViteScripts: !!document.querySelector('script[src*="vite"]'),
        bodyClasses: document.body.className,
        htmlClasses: document.documentElement.className
      };
    });

    console.log('\n🏗️ DOM STRUCTURE ANALYSIS:', JSON.stringify(domAnalysis, null, 2));

    // Check for CSS and styling
    const stylingAnalysis = await page.evaluate(() => {
      const computedStyle = window.getComputedStyle(document.body);
      return {
        bodyBackgroundColor: computedStyle.backgroundColor,
        bodyColor: computedStyle.color,
        fontFamily: computedStyle.fontFamily,
        fontSize: computedStyle.fontSize,
        hasCustomStyles: document.querySelectorAll('style').length > 0
      };
    });

    console.log('\n🎨 STYLING ANALYSIS:', JSON.stringify(stylingAnalysis, null, 2));

    // Take final comprehensive screenshot
    await page.screenshot({ 
      path: '/Users/teemulinna/code/operating/frontend/tests/screenshots/comprehensive-analysis.png',
      fullPage: true 
    });

    // Create summary report
    const summaryReport = {
      timestamp: new Date().toISOString(),
      url: 'http://localhost:3002',
      domAnalysis,
      stylingAnalysis,
      consoleMessagesCount: consoleMessages.length,
      networkFailuresCount: networkFailures.length,
      networkResponsesCount: networkResponses.length,
      consoleMessages: consoleMessages.slice(0, 10), // First 10 messages
      networkFailures: networkFailures.slice(0, 5)   // First 5 failures
    };

    console.log('\n📋 COMPREHENSIVE SUMMARY REPORT:');
    console.log(JSON.stringify(summaryReport, null, 2));
  });

  test.afterEach(async () => {
    console.log('\n📊 TEST SUMMARY:');
    console.log('- Console messages captured:', consoleMessages.length);
    console.log('- Network failures detected:', networkFailures.length);
    console.log('- Total network responses:', networkResponses.length);

    if (consoleMessages.length > 0) {
      console.log('\n📝 CONSOLE MESSAGES:');
      consoleMessages.forEach((msg, index) => {
        console.log(`${index + 1}. ${msg}`);
      });
    }
  });
});