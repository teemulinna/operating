#!/usr/bin/env node

/**
 * Comprehensive AI API Test Script
 * Tests all AI endpoints with real API calls and sample data
 * 
 * Usage: node tests/test-ai-apis.js
 */

const https = require('https');
const fs = require('fs');

// Configuration
const API_BASE_URL = 'http://localhost:3001';
const RESULTS_FILE = 'tests/api-test-results.json';

// Allow self-signed certificates for testing
process.env['NODE_TLS_REJECT_UNAUTHORIZED'] = '0';

// Test results collector
const testResults = {
  timestamp: new Date().toISOString(),
  summary: {
    total: 0,
    passed: 0,
    failed: 0,
    errors: 0
  },
  tests: []
};

// Utility function to make HTTP requests
async function makeRequest(method, endpoint, data = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const url = `${API_BASE_URL}${endpoint}`;
    const urlObj = new URL(url);
    
    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port || (urlObj.protocol === 'https:' ? 443 : 80),
      path: urlObj.pathname + urlObj.search,
      method: method.toUpperCase(),
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'User-Agent': 'AI-API-Test-Script/1.0',
        ...headers
      }
    };

    if (data && ['POST', 'PUT', 'PATCH'].includes(method.toUpperCase())) {
      const postData = JSON.stringify(data);
      options.headers['Content-Length'] = Buffer.byteLength(postData);
    }

    const request = require(url.startsWith('https:') ? 'https' : 'http').request(options, (response) => {
      let body = '';
      
      response.on('data', (chunk) => {
        body += chunk;
      });
      
      response.on('end', () => {
        try {
          const parsedBody = body ? JSON.parse(body) : {};
          resolve({
            statusCode: response.statusCode,
            headers: response.headers,
            body: parsedBody,
            rawBody: body
          });
        } catch (error) {
          resolve({
            statusCode: response.statusCode,
            headers: response.headers,
            body: { raw: body },
            rawBody: body,
            parseError: error.message
          });
        }
      });
    });

    request.on('error', (error) => {
      reject({
        error: error.message,
        code: error.code,
        errno: error.errno
      });
    });

    if (data && ['POST', 'PUT', 'PATCH'].includes(method.toUpperCase())) {
      request.write(JSON.stringify(data));
    }

    request.end();
  });
}

// Test runner
async function runTest(name, testFunction) {
  testResults.summary.total++;
  console.log(`\n🧪 Testing: ${name}`);
  
  const startTime = Date.now();
  
  try {
    const result = await testFunction();
    const duration = Date.now() - startTime;
    
    if (result.success) {
      testResults.summary.passed++;
      console.log(`✅ PASSED (${duration}ms): ${result.message}`);
    } else {
      testResults.summary.failed++;
      console.log(`❌ FAILED (${duration}ms): ${result.message}`);
      if (result.details) {
        console.log(`   Details: ${JSON.stringify(result.details, null, 2)}`);
      }
    }
    
    testResults.tests.push({
      name,
      success: result.success,
      message: result.message,
      duration,
      details: result.details || {},
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    testResults.summary.errors++;
    const duration = Date.now() - startTime;
    
    console.log(`💥 ERROR (${duration}ms): ${error.message}`);
    
    testResults.tests.push({
      name,
      success: false,
      message: `Error: ${error.message}`,
      duration,
      error: {
        message: error.message,
        stack: error.stack,
        details: error.details || {}
      },
      timestamp: new Date().toISOString()
    });
  }
}

// Sample data generators
function generateSkillMatchingData() {
  return {
    requiredSkills: [
      {
        skillId: "js-001",
        skillName: "JavaScript",
        category: "technical",
        minimumProficiency: 3,
        weight: 8.0,
        isRequired: true
      },
      {
        skillId: "react-001", 
        skillName: "React",
        category: "technical",
        minimumProficiency: 2,
        weight: 7.0,
        isRequired: true
      },
      {
        skillId: "node-001",
        skillName: "Node.js", 
        category: "technical",
        minimumProficiency: 2,
        weight: 6.0,
        isRequired: false
      }
    ],
    projectId: "proj-123",
    roleTitle: "Frontend Developer",
    experienceLevel: "mid",
    availabilityHours: 40,
    startDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    endDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
    minimumMatchScore: 50,
    maxResults: 10
  };
}

function generateOptimizationData() {
  return {
    projectIds: ["1", "2", "3"],
    focusAreas: ["conflicts", "costs", "utilization"],
    projects: [
      {
        id: "1",
        priority: 1,
        startDate: new Date().toISOString(),
        endDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(),
        budget: 100000
      },
      {
        id: "2", 
        priority: 2,
        startDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        endDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
        budget: 150000
      }
    ],
    timeHorizon: {
      startDate: new Date().toISOString(),
      endDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString()
    },
    objectives: [
      { type: 'maximize_utilization', weight: 0.4, priority: 1 },
      { type: 'minimize_cost', weight: 0.3, priority: 2 },
      { type: 'minimize_conflicts', weight: 0.3, priority: 1 }
    ]
  };
}

function generateForecastingData() {
  return {
    name: "Q1 2024 Resource Forecast",
    description: "Forecasting resource needs for Q1 projects",
    timeHorizon: 90,
    projects: [
      {
        id: "proj-001",
        name: "Website Redesign",
        startDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
        endDate: new Date(Date.now() + 75 * 24 * 60 * 60 * 1000).toISOString(),
        teamSize: 5,
        budget: 75000,
        probability: 0.9
      },
      {
        id: "proj-002",
        name: "Mobile App Development", 
        startDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        endDate: new Date(Date.now() + 120 * 24 * 60 * 60 * 1000).toISOString(),
        teamSize: 8,
        budget: 200000,
        probability: 0.7
      }
    ],
    constraints: [
      {
        type: "budget_limit",
        value: 500000,
        description: "Maximum quarterly budget"
      },
      {
        type: "team_size_limit", 
        value: 20,
        description: "Maximum team size"
      }
    ]
  };
}

// Test functions
async function testHealthEndpoint() {
  const response = await makeRequest('GET', '/health');
  
  const success = response.statusCode === 200 && 
                  response.body.status === 'healthy';
  
  return {
    success,
    message: success ? 'Health endpoint working' : 'Health endpoint failed',
    details: {
      statusCode: response.statusCode,
      status: response.body?.status,
      uptime: response.body?.uptime
    }
  };
}

async function testApiDocumentation() {
  const response = await makeRequest('GET', '/api');
  
  const success = response.statusCode === 200 && 
                  response.body.name && 
                  response.body.endpoints;
  
  return {
    success,
    message: success ? 'API documentation accessible' : 'API documentation failed',
    details: {
      statusCode: response.statusCode,
      endpoints: Object.keys(response.body?.endpoints || {}),
      features: response.body?.features?.length || 0
    }
  };
}

async function testBasicDataEndpoints() {
  const endpoints = [
    { path: '/api/employees?limit=5', name: 'Employees' },
    { path: '/api/projects?limit=5', name: 'Projects' }, 
    { path: '/api/departments', name: 'Departments' },
    { path: '/api/skills', name: 'Skills' },
    { path: '/api/allocations?limit=10', name: 'Allocations' }
  ];
  
  const results = [];
  
  for (const endpoint of endpoints) {
    try {
      const response = await makeRequest('GET', endpoint.path);
      results.push({
        name: endpoint.name,
        success: response.statusCode === 200,
        statusCode: response.statusCode,
        hasData: response.body && (Array.isArray(response.body) || 
                 (typeof response.body === 'object' && Object.keys(response.body).length > 0))
      });
    } catch (error) {
      results.push({
        name: endpoint.name,
        success: false,
        error: error.message
      });
    }
  }
  
  const successCount = results.filter(r => r.success).length;
  const success = successCount > 0;
  
  return {
    success,
    message: `${successCount}/${results.length} basic endpoints working`,
    details: { results }
  };
}

async function testSkillsMatching() {
  const data = generateSkillMatchingData();
  
  // Test 1: Skills matching endpoint
  try {
    const response = await makeRequest('POST', '/api/skills/match', data);
    
    const success = response.statusCode === 200 || response.statusCode === 404;
    
    return {
      success: response.statusCode === 200,
      message: response.statusCode === 200 ? 
        'Skills matching endpoint working' : 
        `Skills matching endpoint returned ${response.statusCode}`,
      details: {
        statusCode: response.statusCode,
        endpoint: '/api/skills/match',
        responseType: typeof response.body,
        hasMatches: response.body?.data?.matches ? response.body.data.matches.length : 0,
        fallback: response.statusCode === 404 ? 'Endpoint not available' : null
      }
    };
  } catch (error) {
    return {
      success: false,
      message: `Skills matching failed: ${error.message}`,
      details: { error: error.message }
    };
  }
}

async function testSkillsEndpoints() {
  const endpoints = [
    { method: 'GET', path: '/api/skills/statistics/organization', name: 'Organization Skills Stats' },
    { method: 'GET', path: '/api/skills/gaps/project/1', name: 'Project Skill Gaps' },
    { method: 'POST', path: '/api/skills/recommend', data: { projectId: "1" }, name: 'Skills Recommendations' },
    { method: 'POST', path: '/api/skills/match/bulk', 
      data: { 
        ...generateSkillMatchingData(), 
        employeeIds: ["emp-001", "emp-002"] 
      }, 
      name: 'Bulk Skills Matching' }
  ];
  
  const results = [];
  
  for (const endpoint of endpoints) {
    try {
      const response = await makeRequest(endpoint.method, endpoint.path, endpoint.data);
      results.push({
        name: endpoint.name,
        success: response.statusCode === 200,
        statusCode: response.statusCode,
        available: response.statusCode !== 404,
        message: response.body?.message || 'No message'
      });
    } catch (error) {
      results.push({
        name: endpoint.name,
        success: false,
        error: error.message
      });
    }
  }
  
  const workingCount = results.filter(r => r.success).length;
  const availableCount = results.filter(r => r.available).length;
  
  return {
    success: workingCount > 0,
    message: `Skills endpoints: ${workingCount} working, ${availableCount} available, ${results.length} total`,
    details: { results }
  };
}

async function testOptimizationEndpoints() {
  const data = generateOptimizationData();
  
  const endpoints = [
    { method: 'POST', path: '/api/optimization/analyze', data: { projectIds: data.projectIds }, name: 'Optimization Analysis' },
    { method: 'POST', path: '/api/optimization/suggest', data: { projectIds: data.projectIds, focusAreas: data.focusAreas }, name: 'Optimization Suggestions' },
    { method: 'POST', path: '/api/optimization/resolve-conflicts', data: { projectIds: data.projectIds }, name: 'Conflict Resolution' },
    { method: 'GET', path: '/api/optimization/suggestions?timeRange=30days', name: 'General Suggestions' },
    { method: 'POST', path: '/api/optimization/balance', data: data, name: 'Resource Balancing' },
    { method: 'GET', path: '/api/optimization/metrics?timeRange=30days', name: 'Optimization Metrics' }
  ];
  
  const results = [];
  
  for (const endpoint of endpoints) {
    try {
      const response = await makeRequest(endpoint.method, endpoint.path, endpoint.data);
      results.push({
        name: endpoint.name,
        success: response.statusCode === 200,
        statusCode: response.statusCode,
        available: response.statusCode !== 404,
        message: response.body?.message || 'No message',
        hasData: response.body?.data ? true : false
      });
    } catch (error) {
      results.push({
        name: endpoint.name,
        success: false,
        error: error.message
      });
    }
  }
  
  const workingCount = results.filter(r => r.success).length;
  const availableCount = results.filter(r => r.available).length;
  
  return {
    success: workingCount > 0,
    message: `Optimization endpoints: ${workingCount} working, ${availableCount} available, ${results.length} total`,
    details: { results }
  };
}

async function testForecastingEndpoints() {
  const data = generateForecastingData();
  
  const endpoints = [
    { method: 'GET', path: '/api/forecasting/capacity?timeHorizon=90&aggregation=daily', name: 'Capacity Forecasting' },
    { method: 'GET', path: '/api/forecasting/demand?timeRange=quarter&skills=javascript,react,python', name: 'Demand Forecasting' },
    { method: 'POST', path: '/api/forecasting/scenario', data: data, name: 'Scenario Creation' },
    { method: 'GET', path: '/api/forecasting/insights?category=utilization&timeRange=30', name: 'Forecasting Insights' },
    { method: 'POST', path: '/api/forecasting/patterns/train', data: { timeRange: 90 }, name: 'Pattern Training' }
  ];
  
  const results = [];
  
  for (const endpoint of endpoints) {
    try {
      const response = await makeRequest(endpoint.method, endpoint.path, endpoint.data);
      results.push({
        name: endpoint.name,
        success: response.statusCode === 200,
        statusCode: response.statusCode,
        available: response.statusCode !== 404,
        message: response.body?.message || 'No message',
        hasData: response.body?.data ? true : false
      });
    } catch (error) {
      results.push({
        name: endpoint.name,
        success: false, 
        error: error.message
      });
    }
  }
  
  const workingCount = results.filter(r => r.success).length;
  const availableCount = results.filter(r => r.available).length;
  
  return {
    success: workingCount > 0,
    message: `Forecasting endpoints: ${workingCount} working, ${availableCount} available, ${results.length} total`,
    details: { results }
  };
}

async function testFallbackEndpoints() {
  // Test some alternative endpoints that might work
  const fallbackEndpoints = [
    { method: 'GET', path: '/api/analytics/team-utilization', name: 'Team Utilization Analytics' },
    { method: 'GET', path: '/api/analytics/capacity-trends', name: 'Capacity Trends Analytics' },
    { method: 'GET', path: '/api/reporting/configurations', name: 'Reporting Configurations' },
    { method: 'GET', path: '/api/allocation-templates', name: 'Allocation Templates' },
    { method: 'GET', path: '/api/pipeline/projects', name: 'Pipeline Projects' }
  ];
  
  const results = [];
  
  for (const endpoint of fallbackEndpoints) {
    try {
      const response = await makeRequest(endpoint.method, endpoint.path);
      results.push({
        name: endpoint.name,
        success: response.statusCode === 200,
        statusCode: response.statusCode,
        available: response.statusCode !== 404,
        hasData: response.body && Object.keys(response.body).length > 0
      });
    } catch (error) {
      results.push({
        name: endpoint.name,
        success: false,
        error: error.message
      });
    }
  }
  
  const workingCount = results.filter(r => r.success).length;
  const availableCount = results.filter(r => r.available).length;
  
  return {
    success: workingCount > 0,
    message: `Fallback endpoints: ${workingCount} working, ${availableCount} available, ${results.length} total`,
    details: { results }
  };
}

// Main test runner
async function runAllTests() {
  console.log('🚀 Starting Comprehensive AI API Test Suite');
  console.log(`📡 Testing against: ${API_BASE_URL}`);
  console.log(`⏰ Started at: ${new Date().toISOString()}\n`);
  
  // Core infrastructure tests
  await runTest('Health Check', testHealthEndpoint);
  await runTest('API Documentation', testApiDocumentation);
  await runTest('Basic Data Endpoints', testBasicDataEndpoints);
  
  // AI-specific endpoint tests
  await runTest('Skills Matching', testSkillsMatching);
  await runTest('Skills Endpoints', testSkillsEndpoints);
  await runTest('Optimization Endpoints', testOptimizationEndpoints);
  await runTest('Forecasting Endpoints', testForecastingEndpoints);
  
  // Fallback endpoints
  await runTest('Alternative Endpoints', testFallbackEndpoints);
  
  // Final summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 TEST SUMMARY');
  console.log('='.repeat(60));
  console.log(`Total Tests: ${testResults.summary.total}`);
  console.log(`✅ Passed: ${testResults.summary.passed}`);
  console.log(`❌ Failed: ${testResults.summary.failed}`);
  console.log(`💥 Errors: ${testResults.summary.errors}`);
  console.log(`📈 Success Rate: ${((testResults.summary.passed / testResults.summary.total) * 100).toFixed(1)}%`);
  
  // Determine overall status
  let status = '🟢 HEALTHY';
  if (testResults.summary.passed < testResults.summary.total / 2) {
    status = '🔴 CRITICAL';
  } else if (testResults.summary.failed > 2 || testResults.summary.errors > 1) {
    status = '🟡 WARNING';
  }
  
  console.log(`Overall Status: ${status}`);
  console.log(`⏰ Completed at: ${new Date().toISOString()}`);
  
  // Save detailed results
  try {
    fs.writeFileSync(RESULTS_FILE, JSON.stringify(testResults, null, 2));
    console.log(`💾 Detailed results saved to: ${RESULTS_FILE}`);
  } catch (error) {
    console.log(`⚠️  Failed to save results: ${error.message}`);
  }
  
  // Recommendations
  console.log('\n📝 RECOMMENDATIONS:');
  
  const failedTests = testResults.tests.filter(t => !t.success);
  if (failedTests.length > 0) {
    console.log('\n🔧 Issues to fix:');
    failedTests.forEach(test => {
      console.log(`   • ${test.name}: ${test.message}`);
    });
  }
  
  const workingEndpoints = [];
  const brokenEndpoints = [];
  
  testResults.tests.forEach(test => {
    if (test.details && test.details.results) {
      test.details.results.forEach(result => {
        if (result.success) {
          workingEndpoints.push(result.name);
        } else if (result.statusCode === 404) {
          brokenEndpoints.push(result.name);
        }
      });
    }
  });
  
  if (workingEndpoints.length > 0) {
    console.log('\n✅ Working endpoints:');
    workingEndpoints.forEach(ep => console.log(`   • ${ep}`));
  }
  
  if (brokenEndpoints.length > 0) {
    console.log('\n❌ Endpoints returning 404 (not mounted):');
    brokenEndpoints.forEach(ep => console.log(`   • ${ep}`));
  }
  
  console.log('\n🎯 Next Steps:');
  console.log('   1. Fix any import/routing issues for 404 endpoints');
  console.log('   2. Ensure all AI services are properly initialized');
  console.log('   3. Add missing database tables/data if needed');
  console.log('   4. Test with real project/employee data');
  console.log('   5. Set up proper authentication for protected endpoints');
  
  return testResults.summary.passed > 0;
}

// Error handling
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  process.exit(1);
});

// Run tests
if (require.main === module) {
  runAllTests()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('❌ Test runner failed:', error);
      process.exit(1);
    });
}

module.exports = { runAllTests, testResults };