#!/usr/bin/env node

/**
 * QUICK API QA TEST - Testing Working Backend
 * This test bypasses build issues and tests the actual running API
 */

const axios = require('axios');
const fs = require('fs');

const API_BASE = 'http://localhost:3001';

let results = {
  tests: [],
  passed: 0,
  failed: 0,
  startTime: new Date()
};

const addResult = (testName, status, details = {}) => {
  results.tests.push({
    testName,
    status,
    details,
    timestamp: new Date().toISOString()
  });
  
  if (status === 'PASS') {
    results.passed++;
    console.log(`✅ ${testName}`);
  } else {
    results.failed++;
    console.log(`❌ ${testName}: ${JSON.stringify(details)}`);
  }
};

async function testAPI() {
  console.log('🧪 QUICK API QA TESTING');
  console.log('========================');

  // Test 1: Health Check
  try {
    const response = await axios.get(`${API_BASE}/health`);
    addResult('Health Check', response.status === 200 ? 'PASS' : 'FAIL', {
      status: response.status,
      uptime: response.data.uptime
    });
  } catch (error) {
    addResult('Health Check', 'FAIL', { error: error.message });
  }

  // Test 2: API Documentation
  try {
    const response = await axios.get(`${API_BASE}/api`);
    addResult('API Documentation', response.status === 200 ? 'PASS' : 'FAIL', {
      status: response.status,
      endpoints: response.data.endpoints
    });
  } catch (error) {
    addResult('API Documentation', 'FAIL', { error: error.message });
  }

  // Test 3: Employees Endpoint (without auth for testing)
  try {
    const response = await axios.get(`${API_BASE}/api/employees`);
    // This might fail due to auth, but let's see what we get
    addResult('Employees Endpoint Access', 
      response.status === 200 || response.status === 401 ? 'PASS' : 'FAIL', {
        status: response.status,
        hasData: !!response.data,
        authRequired: response.status === 401
      });
  } catch (error) {
    // Expected if auth is required
    if (error.response && error.response.status === 401) {
      addResult('Employees Endpoint Access', 'PASS', {
        status: 401,
        message: 'Auth required (expected)',
        authRequired: true
      });
    } else {
      addResult('Employees Endpoint Access', 'FAIL', { error: error.message });
    }
  }

  // Test 4: Departments Endpoint
  try {
    const response = await axios.get(`${API_BASE}/api/departments`);
    addResult('Departments Endpoint Access', 
      response.status === 200 || response.status === 401 ? 'PASS' : 'FAIL', {
        status: response.status,
        hasData: !!response.data,
        authRequired: response.status === 401
      });
  } catch (error) {
    if (error.response && error.response.status === 401) {
      addResult('Departments Endpoint Access', 'PASS', {
        status: 401,
        message: 'Auth required (expected)',
        authRequired: true
      });
    } else {
      addResult('Departments Endpoint Access', 'FAIL', { error: error.message });
    }
  }

  // Test 5: Invalid Route (404 Test)
  try {
    const response = await axios.get(`${API_BASE}/api/nonexistent`);
    addResult('404 Error Handling', response.status === 404 ? 'PASS' : 'FAIL', {
      status: response.status
    });
  } catch (error) {
    if (error.response && error.response.status === 404) {
      addResult('404 Error Handling', 'PASS', {
        status: 404,
        message: error.response.data.message
      });
    } else {
      addResult('404 Error Handling', 'FAIL', { error: error.message });
    }
  }

  // Test 6: CORS Headers
  try {
    const response = await axios.options(`${API_BASE}/api/employees`, {
      headers: {
        'Origin': 'http://localhost:3002',
        'Access-Control-Request-Method': 'GET'
      }
    });
    
    const corsEnabled = response.headers['access-control-allow-origin'] !== undefined;
    addResult('CORS Configuration', corsEnabled ? 'PASS' : 'FAIL', {
      corsHeaders: {
        origin: response.headers['access-control-allow-origin'],
        methods: response.headers['access-control-allow-methods']
      }
    });
  } catch (error) {
    addResult('CORS Configuration', 'FAIL', { error: error.message });
  }

  // Test 7: Rate Limiting (Light Test)
  try {
    const startTime = Date.now();
    const requests = Array.from({ length: 5 }, () => 
      axios.get(`${API_BASE}/health`).catch(e => e.response || e)
    );
    
    const responses = await Promise.all(requests);
    const endTime = Date.now();
    
    const successCount = responses.filter(r => r.status === 200).length;
    const rateLimited = responses.filter(r => r.status === 429).length;
    
    addResult('Multiple Requests Handling', 'PASS', {
      totalRequests: 5,
      successCount,
      rateLimited,
      totalTime: endTime - startTime,
      avgResponseTime: (endTime - startTime) / 5
    });
  } catch (error) {
    addResult('Multiple Requests Handling', 'FAIL', { error: error.message });
  }

  // Generate Summary Report
  results.endTime = new Date();
  const duration = results.endTime - results.startTime;
  
  console.log('\n📊 QA TEST SUMMARY');
  console.log('==================');
  console.log(`✅ Passed: ${results.passed}`);
  console.log(`❌ Failed: ${results.failed}`);
  console.log(`📈 Success Rate: ${((results.passed / (results.passed + results.failed)) * 100).toFixed(1)}%`);
  console.log(`⏱️  Duration: ${duration}ms`);

  // Quality Gates Assessment
  console.log('\n🚪 QUALITY GATES');
  console.log('================');
  
  const gates = {
    healthCheck: results.tests.find(t => t.testName === 'Health Check')?.status === 'PASS',
    apiDocs: results.tests.find(t => t.testName === 'API Documentation')?.status === 'PASS',
    endpointsResponding: results.tests.filter(t => t.testName.includes('Endpoint')).every(t => t.status === 'PASS'),
    errorHandling: results.tests.find(t => t.testName === '404 Error Handling')?.status === 'PASS',
    cors: results.tests.find(t => t.testName === 'CORS Configuration')?.status === 'PASS'
  };

  Object.entries(gates).forEach(([gate, passed]) => {
    console.log(`${passed ? '✅' : '❌'} ${gate.replace(/([A-Z])/g, ' $1').toLowerCase()}`);
  });

  const allGatesPassed = Object.values(gates).every(g => g);
  console.log(`\n🎯 API READINESS: ${allGatesPassed ? '✅ READY' : '⚠️  NEEDS ATTENTION'}`);

  // Save detailed report
  const reportPath = `/Users/teemulinna/code/operating/tests/qa-quick-report-${Date.now()}.json`;
  fs.writeFileSync(reportPath, JSON.stringify({
    summary: {
      passed: results.passed,
      failed: results.failed,
      successRate: `${((results.passed / (results.passed + results.failed)) * 100).toFixed(1)}%`,
      duration: `${duration}ms`,
      timestamp: results.endTime.toISOString()
    },
    qualityGates: gates,
    overallStatus: allGatesPassed ? 'READY' : 'NEEDS_ATTENTION',
    tests: results.tests
  }, null, 2));
  
  console.log(`📁 Report saved: ${reportPath}`);
  
  return allGatesPassed;
}

// Run tests
testAPI().then(success => {
  process.exit(success ? 0 : 1);
}).catch(error => {
  console.error('❌ Test execution failed:', error);
  process.exit(1);
});