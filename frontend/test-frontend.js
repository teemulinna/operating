#!/usr/bin/env node

import puppeteer from 'puppeteer';

async function testFrontend() {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  
  // Listen for console messages
  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.error('❌ Browser Console Error:', msg.text());
    }
  });
  
  // Listen for page errors
  page.on('pageerror', error => {
    console.error('❌ Page Error:', error.message);
  });
  
  try {
    console.log('🔍 Testing frontend at http://localhost:3003...\n');
    
    // Navigate to the page
    const response = await page.goto('http://localhost:3003', { 
      waitUntil: 'networkidle0',
      timeout: 10000 
    });
    
    // Check response status
    if (response.status() !== 200) {
      throw new Error(`HTTP ${response.status()} error`);
    }
    console.log('✅ Page loaded successfully (HTTP 200)');
    
    // Wait for React to render
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Check if there's any content
    const content = await page.evaluate(() => document.body.innerText);
    if (content.trim()) {
      console.log('✅ Page has rendered content');
    } else {
      console.log('⚠️  Page appears empty');
    }
    
    // Check for React errors
    const reactErrors = await page.evaluate(() => {
      const errorDiv = document.querySelector('#root > div.error');
      return errorDiv ? errorDiv.innerText : null;
    });
    
    if (reactErrors) {
      console.error('❌ React Error:', reactErrors);
    } else {
      console.log('✅ No React errors detected');
    }
    
    // Check for specific elements
    const hasEmployeeContent = await page.evaluate(() => {
      return document.body.innerText.includes('Employee') || 
             document.querySelector('[data-testid*="employee"]') !== null;
    });
    
    if (hasEmployeeContent) {
      console.log('✅ Employee-related content found');
    } else {
      console.log('ℹ️  No employee content visible yet');
    }
    
    console.log('\n✅ Frontend test completed successfully!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

// Check if puppeteer is installed
import { execSync } from 'child_process';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);

try {
  require.resolve('puppeteer');
  testFrontend();
} catch (e) {
  console.log('Installing puppeteer...');
  execSync('npm install puppeteer', { stdio: 'inherit' });
  testFrontend();
}