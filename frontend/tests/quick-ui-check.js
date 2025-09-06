#!/usr/bin/env node

/**
 * Quick UI Health Check Script
 * Performs rapid verification of Employee Management System UI status
 */

const { chromium } = require('playwright');

async function quickUICheck() {
  console.log('🔍 Employee Management System - Quick UI Health Check');
  console.log('=' .repeat(60));
  
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  const errors = [];
  const successes = [];
  
  // Capture console messages
  page.on('console', msg => {
    if (msg.type() === 'error') {
      errors.push(`Console Error: ${msg.text()}`);
    }
  });

  try {
    console.log('📡 Navigating to http://localhost:3002...');
    await page.goto('http://localhost:3002', { waitUntil: 'networkidle' });
    successes.push('✅ Page loads successfully');

    // Check if React app root exists
    const root = await page.locator('#root');
    if (await root.isVisible()) {
      successes.push('✅ React app root element found');
    }

    // Check for main title
    const title = await page.textContent('h1');
    if (title && title.includes('Employee Management System')) {
      successes.push('✅ Main title renders correctly');
    }

    // Check for employee directory
    const employeeDir = await page.getByText('Employee Directory').count();
    if (employeeDir > 0) {
      successes.push('✅ Employee Directory section found');
    }

    // Check for buttons
    const importBtn = await page.getByText('Import CSV').count();
    const exportBtn = await page.getByText('Export CSV').count();
    const addBtn = await page.getByText('Add Employee').count();
    
    if (importBtn > 0 && exportBtn > 0 && addBtn > 0) {
      successes.push('✅ All action buttons present');
    }

    // Check for loading state
    await page.waitForTimeout(2000);
    const loadingElements = await page.locator('.loading, [aria-busy="true"]').count();
    if (loadingElements > 0) {
      errors.push('⚠️  Loading state detected - likely API issues');
    }

    // Take screenshot
    await page.screenshot({ 
      path: '/Users/teemulinna/code/operating/frontend/tests/quick-check-screenshot.png',
      fullPage: true 
    });
    successes.push('✅ Screenshot captured');

  } catch (error) {
    errors.push(`❌ Navigation error: ${error.message}`);
  }

  await browser.close();

  // Report results
  console.log('\n📊 RESULTS SUMMARY');
  console.log('=' .repeat(60));
  
  console.log('\n✅ SUCCESSES:');
  successes.forEach(success => console.log(`  ${success}`));
  
  if (errors.length > 0) {
    console.log('\n❌ ISSUES:');
    errors.forEach(error => console.log(`  ${error}`));
  }

  console.log('\n🎯 QUICK DIAGNOSIS:');
  if (successes.length >= 4 && errors.length <= 2) {
    console.log('  ✅ UI is rendering correctly');
    console.log('  ⚠️  Check backend API connectivity for data loading');
    console.log('  🔧 Recommendation: Fix CORS and database issues');
  } else if (successes.length < 2) {
    console.log('  ❌ UI has significant rendering issues');
    console.log('  🔧 Recommendation: Check React app setup');
  } else {
    console.log('  ⚠️  UI partially working, some issues detected');
    console.log('  🔧 Recommendation: Review error details above');
  }

  console.log('\n📸 Screenshot saved to: tests/quick-check-screenshot.png');
  console.log('📋 Full report available at: tests/ui-debug-report.md');
}

quickUICheck().catch(console.error);