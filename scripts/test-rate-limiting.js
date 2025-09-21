const axios = require('axios');

/**
 * Simple test to verify rate limiting configuration works properly
 */
async function testRateLimiting() {
  console.log('Testing API Rate Limiting Configuration...\n');

  const BASE_URL = 'http://localhost:3001';
  const results = {
    health: [],
    api: []
  };

  // Test 1: Health endpoint (multiple rapid calls)
  console.log('1. Testing health endpoint with rapid calls...');
  try {
    const promises = Array.from({ length: 20 }, () => 
      axios.get(`${BASE_URL}/health`, { timeout: 5000 })
    );
    
    const responses = await Promise.all(promises);
    const statusCodes = responses.map(r => r.status);
    results.health = statusCodes;
    
    console.log(`   Results: ${statusCodes.join(', ')}`);
    console.log(`   ✅ All health requests successful: ${statusCodes.every(code => code === 200)}`);
  } catch (error) {
    console.log(`   ❌ Health endpoint test failed: ${error.message}`);
  }

  // Test 2: API endpoint (multiple rapid calls)
  console.log('\n2. Testing API endpoint with rapid calls...');
  try {
    const promises = Array.from({ length: 15 }, () => 
      axios.get(`${BASE_URL}/api/employees`, { timeout: 5000 })
        .catch(err => ({ status: err.response?.status || 'ERROR', data: err.message }))
    );
    
    const responses = await Promise.all(promises);
    const statusCodes = responses.map(r => r.status);
    results.api = statusCodes;
    
    console.log(`   Results: ${statusCodes.join(', ')}`);
    
    const successfulRequests = statusCodes.filter(code => code === 200).length;
    const rateLimitedRequests = statusCodes.filter(code => code === 429).length;
    
    console.log(`   ✅ Successful requests: ${successfulRequests}/15`);
    if (rateLimitedRequests > 0) {
      console.log(`   ⚠️  Rate limited requests: ${rateLimitedRequests}/15`);
    } else {
      console.log(`   ✅ No rate limiting in development mode`);
    }
  } catch (error) {
    console.log(`   ❌ API endpoint test failed: ${error.message}`);
  }

  // Test 3: Verify environment-specific behavior
  console.log('\n3. Environment Configuration:');
  console.log(`   NODE_ENV: ${process.env.NODE_ENV || 'not set'}`);
  console.log(`   ENABLE_RATE_LIMITING: ${process.env.ENABLE_RATE_LIMITING || 'not set'}`);
  
  if (process.env.NODE_ENV === 'development' && process.env.ENABLE_RATE_LIMITING !== 'true') {
    console.log('   ✅ Rate limiting should be disabled in development');
  } else {
    console.log('   ⚠️  Rate limiting should be enabled');
  }

  console.log('\n🎉 Rate limiting test completed!');
  
  return results;
}

// Run the test
if (require.main === module) {
  testRateLimiting()
    .then(() => process.exit(0))
    .catch(err => {
      console.error('Test failed:', err);
      process.exit(1);
    });
}

module.exports = { testRateLimiting };