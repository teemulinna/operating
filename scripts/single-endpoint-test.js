#!/usr/bin/env node

const axios = require('axios');

async function testSingleEndpoint() {
  console.log('Testing single API endpoint with proper delays...');
  
  try {
    // Test health endpoint first
    console.log('1. Testing /health endpoint...');
    const healthResponse = await axios.get('http://localhost:3001/health');
    console.log('✅ Health endpoint response:', healthResponse.status, healthResponse.data);
    
    // Wait to avoid rate limiting
    console.log('Waiting 2 seconds...');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Test API info endpoint
    console.log('2. Testing /api endpoint...');
    const apiResponse = await axios.get('http://localhost:3001/api');
    console.log('✅ API endpoint response:', apiResponse.status, Object.keys(apiResponse.data));
    
    // Wait to avoid rate limiting
    console.log('Waiting 2 seconds...');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Test employees endpoint
    console.log('3. Testing /api/employees endpoint...');
    const employeesResponse = await axios.get('http://localhost:3001/api/employees');
    console.log('✅ Employees endpoint response:', employeesResponse.status, typeof employeesResponse.data);
    
    if (employeesResponse.data && employeesResponse.data.data) {
      console.log('   Data structure:', {
        hasData: Array.isArray(employeesResponse.data.data),
        dataLength: employeesResponse.data.data.length,
        hasPagination: !!employeesResponse.data.pagination
      });
    }
    
  } catch (error) {
    console.error('❌ Error testing endpoint:', error.response?.status, error.response?.data || error.message);
  }
}

testSingleEndpoint();