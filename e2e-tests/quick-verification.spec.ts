import { test, expect } from '@playwright/test';

test('FINAL VERIFICATION: Critical Issues Fixed', async ({ page }) => {
  console.log('🧪 FINAL TEST: Verifying all critical fixes');
  
  const consoleErrors: string[] = [];
  const criticalErrors: string[] = [];
  
  // Capture console messages
  page.on('console', msg => {
    if (msg.type() === 'error') {
      const errorText = msg.text();
      consoleErrors.push(errorText);
      
      // Track the specific errors we fixed
      if (errorText.includes('isDeleting is not defined') ||
          errorText.includes('Maximum update depth exceeded') ||
          (errorText.includes('WebSocket') && errorText.includes('failed'))) {
        criticalErrors.push(errorText);
        console.log('❌ Critical Error:', errorText.substring(0, 100));
      }
    }
  });
  
  // Test 1: Frontend loads
  console.log('📡 Testing frontend loading...');
  await page.goto('http://localhost:3002');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(5000); // Allow time for WebSocket initialization
  
  console.log('📊 Total console errors:', consoleErrors.length);
  console.log('📊 Critical errors (target: 0):', criticalErrors.length);
  
  // Test 2: Backend API works
  console.log('📡 Testing backend API...');
  const healthResponse = await page.request.get('http://localhost:3001/health');
  const backendHealthy = healthResponse.ok();
  
  const apiResponse = await page.request.get('http://localhost:3001/api/employees');
  const apiWorking = apiResponse.ok();
  
  console.log('✅ Backend healthy:', backendHealthy);
  console.log('✅ API working:', apiWorking);
  
  // Test 3: Real data verification
  if (apiWorking) {
    const apiData = await apiResponse.json();
    console.log('📊 Real employees in database:', apiData.data.length);
    
    if (apiData.data.length > 0) {
      const employee = apiData.data[0];
      const hasUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(employee.id);
      console.log('✅ Real database UUIDs:', hasUUID);
    }
  }
  
  // FINAL VERIFICATION
  console.log('\n🏆 EMPIRICAL VERIFICATION RESULTS:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`✅ Backend Status: ${backendHealthy ? 'HEALTHY' : 'FAILED'}`);
  console.log(`✅ API Endpoints: ${apiWorking ? 'WORKING' : 'FAILED'}`);
  console.log(`✅ Critical Errors: ${criticalErrors.length === 0 ? 'FIXED' : 'STILL PRESENT (' + criticalErrors.length + ')'}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  // Pass/Fail criteria
  expect(backendHealthy).toBeTruthy();
  expect(apiWorking).toBeTruthy();
  expect(criticalErrors.length).toBeLessThanOrEqual(0); // Allow 0 critical errors
  
  if (criticalErrors.length === 0 && backendHealthy && apiWorking) {
    console.log('🎯 FINAL VERDICT: ALL CRITICAL ISSUES RESOLVED ✅');
  } else {
    console.log('🚨 FINAL VERDICT: SOME ISSUES REMAIN ❌');
  }
});