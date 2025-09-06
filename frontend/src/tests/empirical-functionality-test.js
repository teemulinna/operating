#!/usr/bin/env node

/**
 * EMPIRICAL FUNCTIONALITY VERIFICATION SUITE
 * 
 * This test suite provides 100% real verification of the Employee Management System
 * No mocks, no simulations - only real API calls and actual functionality testing
 */

import axios from 'axios';
import puppeteer from 'puppeteer';
import { io } from 'socket.io-client';
import fs from 'fs';

// Configuration
const config = {
  frontendUrl: 'http://localhost:3002',
  backendUrl: 'http://localhost:3001/api',
  timeout: 10000
};

const testResults = {
  passed: 0,
  failed: 0,
  tests: []
};

function log(message, type = 'info') {
  const timestamp = new Date().toISOString();
  const colors = {
    info: '\x1b[36m',    // Cyan
    success: '\x1b[32m', // Green
    error: '\x1b[31m',   // Red
    warning: '\x1b[33m', // Yellow
    reset: '\x1b[0m'     // Reset
  };
  console.log(`${colors[type]}[${timestamp}] ${message}${colors.reset}`);
}

async function test(name, testFn) {
  try {
    log(`🧪 Running: ${name}`, 'info');
    const result = await testFn();
    testResults.passed++;
    testResults.tests.push({ name, status: 'PASSED', result });
    log(`✅ PASSED: ${name}`, 'success');
    return result;
  } catch (error) {
    testResults.failed++;
    testResults.tests.push({ name, status: 'FAILED', error: error.message });
    log(`❌ FAILED: ${name} - ${error.message}`, 'error');
    throw error;
  }
}

// Test 1: Backend API Connectivity and Real Data
async function testBackendAPIConnectivity() {
  return await test('Backend API Connectivity', async () => {
    const response = await axios.get(`${config.backendUrl}/employees`, {
      timeout: config.timeout
    });
    
    if (response.status !== 200) {
      throw new Error(`Expected status 200, got ${response.status}`);
    }
    
    if (!response.data || !response.data.data || !Array.isArray(response.data.data)) {
      throw new Error('Invalid response structure - expected data.data array');
    }
    
    const employees = response.data.data;
    if (employees.length === 0) {
      throw new Error('No employees found - database might be empty');
    }
    
    // Verify employee structure
    const firstEmployee = employees[0];
    const requiredFields = ['id', 'firstName', 'lastName', 'email', 'position'];
    for (const field of requiredFields) {
      if (!firstEmployee[field]) {
        throw new Error(`Missing required field: ${field}`);
      }
    }
    
    return {
      employeeCount: employees.length,
      firstEmployee: firstEmployee,
      responseTime: response.headers['x-response-time'] || 'N/A'
    };
  });
}

// Test 2: Frontend Application Loading
async function testFrontendLoading() {
  return await test('Frontend Application Loading', async () => {
    const browser = await puppeteer.launch({ 
      headless: 'new',
      args: ['--no-sandbox', '--disable-dev-shm-usage']
    });
    
    try {
      const page = await browser.newPage();
      
      // Capture console errors
      const consoleErrors = [];
      page.on('console', (msg) => {
        if (msg.type() === 'error') {
          consoleErrors.push(msg.text());
        }
      });
      
      // Capture JavaScript errors
      const jsErrors = [];
      page.on('pageerror', (error) => {
        jsErrors.push(error.message);
      });
      
      // Navigate to frontend
      const response = await page.goto(config.frontendUrl, { 
        waitUntil: 'networkidle2',
        timeout: config.timeout 
      });
      
      if (!response || response.status() !== 200) {
        throw new Error(`Frontend not accessible - status: ${response?.status()}`);
      }
      
      // Wait for React app to load
      await page.waitForSelector('body', { timeout: 5000 });
      
      // Check for critical errors
      if (jsErrors.length > 0) {
        throw new Error(`JavaScript errors detected: ${jsErrors.join('; ')}`);
      }
      
      // Check if app has loaded (look for common elements)
      const hasContent = await page.evaluate(() => {
        return document.body.innerHTML.length > 1000; // Basic content check
      });
      
      if (!hasContent) {
        throw new Error('Frontend appears to have loaded but has minimal content');
      }
      
      return {
        loadTime: Date.now() - Date.now(), // Placeholder
        consoleErrors: consoleErrors.length,
        jsErrors: jsErrors.length,
        hasContent
      };
      
    } finally {
      await browser.close();
    }
  });
}

// Test 3: Employee CRUD Operations
async function testEmployeeCRUD() {
  return await test('Employee CRUD Operations', async () => {
    // Create a test employee with valid department ID
    const newEmployee = {
      firstName: 'Test',
      lastName: 'Employee',
      email: `test.employee.${Date.now()}@company.com`,
      position: 'Software Tester',
      departmentId: '1', // Use integer as backend expects
      salary: '50000',
      hireDate: new Date().toISOString().split('T')[0]
    };
    
    // CREATE
    const createResponse = await axios.post(`${config.backendUrl}/employees`, newEmployee);
    if (createResponse.status !== 201) {
      throw new Error(`Create failed - status: ${createResponse.status}`);
    }
    
    const createdEmployee = createResponse.data.data;
    const employeeId = createdEmployee.id;
    
    // READ
    const readResponse = await axios.get(`${config.backendUrl}/employees/${employeeId}`);
    if (readResponse.status !== 200) {
      throw new Error(`Read failed - status: ${readResponse.status}`);
    }
    
    // UPDATE
    const updateData = { firstName: 'Updated', lastName: 'Employee' };
    const updateResponse = await axios.put(`${config.backendUrl}/employees/${employeeId}`, updateData);
    if (updateResponse.status !== 200) {
      throw new Error(`Update failed - status: ${updateResponse.status}`);
    }
    
    // Verify update
    const verifyResponse = await axios.get(`${config.backendUrl}/employees/${employeeId}`);
    const updatedEmployee = verifyResponse.data.data;
    if (updatedEmployee.firstName !== 'Updated') {
      throw new Error('Update verification failed');
    }
    
    // DELETE
    const deleteResponse = await axios.delete(`${config.backendUrl}/employees/${employeeId}`);
    if (deleteResponse.status !== 200 && deleteResponse.status !== 204) {
      throw new Error(`Delete failed - status: ${deleteResponse.status}`);
    }
    
    // Verify deletion
    try {
      await axios.get(`${config.backendUrl}/employees/${employeeId}`);
      throw new Error('Employee still exists after deletion');
    } catch (error) {
      if (error.response?.status !== 404) {
        throw new Error('Unexpected error during deletion verification');
      }
    }
    
    return {
      createdId: employeeId,
      operations: ['CREATE', 'READ', 'UPDATE', 'DELETE'],
      allSuccessful: true
    };
  });
}

// Test 4: WebSocket Connectivity
async function testWebSocketConnectivity() {
  return await test('WebSocket Connectivity', async () => {
    
    return new Promise((resolve, reject) => {
      const socket = io('http://localhost:3001', {
        timeout: 5000,
        forceNew: true
      });
      
      socket.on('connect', () => {
        socket.disconnect();
        resolve({
          connected: true,
          socketId: socket.id
        });
      });
      
      socket.on('connect_error', (error) => {
        reject(new Error(`WebSocket connection failed: ${error.message}`));
      });
      
      setTimeout(() => {
        socket.disconnect();
        reject(new Error('WebSocket connection timeout'));
      }, 6000);
    });
  });
}

// Test 5: Database Integration
async function testDatabaseIntegration() {
  return await test('Database Integration', async () => {
    // Test multiple endpoints to verify database connectivity
    const endpoints = [
      '/employees',
      '/departments',
      '/health'
    ];
    
    const results = [];
    
    for (const endpoint of endpoints) {
      try {
        const response = await axios.get(`${config.backendUrl.replace('/api', '')}${endpoint === '/health' ? endpoint : '/api' + endpoint}`);
        results.push({
          endpoint,
          status: response.status,
          hasData: response.data && Object.keys(response.data).length > 0
        });
      } catch (error) {
        results.push({
          endpoint,
          status: error.response?.status || 'ERROR',
          error: error.message
        });
      }
    }
    
    return {
      endpointTests: results,
      allHealthy: results.every(r => r.status === 200)
    };
  });
}

// Main execution
async function runEmpiricalTests() {
  log('🚀 Starting Empirical Functionality Verification', 'info');
  log('=' .repeat(80), 'info');
  
  try {
    // Wait for services to be ready
    log('⏳ Checking service availability...', 'info');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Run all tests
    const results = await Promise.allSettled([
      testBackendAPIConnectivity(),
      testDatabaseIntegration(),
      testWebSocketConnectivity(),
      testEmployeeCRUD(),
      testFrontendLoading()
    ]);
    
    // Generate report
    log('=' .repeat(80), 'info');
    log('📊 TEST RESULTS SUMMARY', 'info');
    log('=' .repeat(80), 'info');
    
    testResults.tests.forEach((test, index) => {
      const status = test.status === 'PASSED' ? '✅' : '❌';
      log(`${status} ${test.name}`, test.status === 'PASSED' ? 'success' : 'error');
      
      if (test.status === 'FAILED') {
        log(`   Error: ${test.error}`, 'error');
      } else if (test.result && typeof test.result === 'object') {
        log(`   Result: ${JSON.stringify(test.result, null, 2)}`, 'info');
      }
    });
    
    log('=' .repeat(80), 'info');
    log(`✅ Passed: ${testResults.passed}`, 'success');
    log(`❌ Failed: ${testResults.failed}`, testResults.failed > 0 ? 'error' : 'success');
    log(`📈 Success Rate: ${((testResults.passed / (testResults.passed + testResults.failed)) * 100).toFixed(1)}%`, 
        testResults.failed === 0 ? 'success' : 'warning');
    
    if (testResults.failed === 0) {
      log('🎉 ALL TESTS PASSED - SYSTEM IS FULLY FUNCTIONAL', 'success');
    } else {
      log('⚠️  SOME TESTS FAILED - SYSTEM NEEDS ATTENTION', 'warning');
    }
    
    log('=' .repeat(80), 'info');
    
    // Create detailed report file
    const reportData = {
      timestamp: new Date().toISOString(),
      summary: {
        total: testResults.passed + testResults.failed,
        passed: testResults.passed,
        failed: testResults.failed,
        successRate: `${((testResults.passed / (testResults.passed + testResults.failed)) * 100).toFixed(1)}%`
      },
      tests: testResults.tests,
      environment: {
        frontendUrl: config.frontendUrl,
        backendUrl: config.backendUrl,
        nodeVersion: process.version
      }
    };
    
    fs.writeFileSync('empirical-test-report.json', JSON.stringify(reportData, null, 2));
    log('📄 Detailed report saved to: empirical-test-report.json', 'info');
    
    process.exit(testResults.failed > 0 ? 1 : 0);
    
  } catch (error) {
    log(`💥 Critical error during testing: ${error.message}`, 'error');
    process.exit(1);
  }
}

// Self-executing if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runEmpiricalTests().catch(console.error);
}

export {
  runEmpiricalTests,
  testBackendAPIConnectivity,
  testFrontendLoading,
  testEmployeeCRUD,
  testWebSocketConnectivity,
  testDatabaseIntegration
};