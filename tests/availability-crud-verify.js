const http = require('http');

// Test data
const testPattern = {
  employeeId: '1254ddbc-8aff-4524-aca1-958a4facf660',
  name: 'Production Test Pattern',
  patternType: 'weekly',
  startDate: '2025-04-01',
  endDate: '2025-12-31',
  weeklyHours: {
    monday: 8,
    tuesday: 8,
    wednesday: 8,
    thursday: 8,
    friday: 8,
    saturday: 0,
    sunday: 0
  },
  isActive: false,
  notes: 'Test pattern for CRUD verification'
};

// Helper function to make HTTP requests
function makeRequest(method, path, data = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3001,
      path: `/api/availability${path}`,
      method,
      headers: {
        'Content-Type': 'application/json',
      },
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => {
        body += chunk;
      });
      res.on('end', () => {
        try {
          const result = JSON.parse(body);
          resolve({ status: res.statusCode, body: result });
        } catch (e) {
          resolve({ status: res.statusCode, body });
        }
      });
    });

    req.on('error', reject);

    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
}

async function runTests() {
  console.log('🧪 Testing Availability Patterns CRUD Operations\n');
  const results = { passed: 0, failed: 0 };
  let createdPatternId = null;

  try {
    // Test 1: GET all patterns
    console.log('1. Testing GET /patterns...');
    const getAll = await makeRequest('GET', '/patterns');
    if (getAll.status === 200 && getAll.body.success) {
      console.log('   ✅ GET all patterns works');
      console.log(`   Found ${getAll.body.data.patterns.length} patterns`);
      results.passed++;
    } else {
      console.log('   ❌ GET all patterns failed');
      results.failed++;
    }

    // Test 2: POST create new pattern
    console.log('\n2. Testing POST /patterns...');
    const create = await makeRequest('POST', '/patterns', testPattern);
    if (create.status === 201 && create.body.success) {
      createdPatternId = create.body.data.id;
      console.log('   ✅ POST create pattern works');
      console.log(`   Created pattern ID: ${createdPatternId}`);
      results.passed++;
    } else {
      console.log('   ❌ POST create pattern failed');
      console.log('   Error:', create.body.message || 'Unknown error');
      results.failed++;
    }

    // Test 3: GET pattern by ID
    if (createdPatternId) {
      console.log('\n3. Testing GET /patterns/:id...');
      const getById = await makeRequest('GET', `/patterns/${createdPatternId}`);
      if (getById.status === 200 && getById.body.success) {
        console.log('   ✅ GET pattern by ID works');
        console.log(`   Pattern name: ${getById.body.data.name || 'N/A'}`);
        results.passed++;
      } else {
        console.log('   ❌ GET pattern by ID failed');
        results.failed++;
      }
    }

    // Test 4: PUT update pattern
    if (createdPatternId) {
      console.log('\n4. Testing PUT /patterns/:id...');
      const updates = {
        name: 'Updated Test Pattern',
        isActive: true,
        notes: 'Updated via test'
      };
      const update = await makeRequest('PUT', `/patterns/${createdPatternId}`, updates);
      if (update.status === 200 && update.body.success) {
        console.log('   ✅ PUT update pattern works');
        results.passed++;
      } else {
        console.log('   ❌ PUT update pattern failed');
        console.log('   Error:', update.body.message || 'Unknown error');
        results.failed++;
      }
    }

    // Test 5: POST activate pattern
    if (createdPatternId) {
      console.log('\n5. Testing POST /patterns/:id/activate...');
      const activate = await makeRequest('POST', `/patterns/${createdPatternId}/activate`);
      if (activate.status === 200 && activate.body.success) {
        console.log('   ✅ POST activate pattern works');
        results.passed++;
      } else {
        console.log('   ❌ POST activate pattern failed');
        results.failed++;
      }
    }

    // Test 6: DELETE pattern
    if (createdPatternId) {
      console.log('\n6. Testing DELETE /patterns/:id...');
      const deletePattern = await makeRequest('DELETE', `/patterns/${createdPatternId}`);
      if (deletePattern.status === 200 && deletePattern.body.success) {
        console.log('   ✅ DELETE pattern works');
        results.passed++;
      } else {
        console.log('   ❌ DELETE pattern failed');
        results.failed++;
      }
    }

    // Test 7: Verify deletion
    if (createdPatternId) {
      console.log('\n7. Verifying deletion...');
      const verifyDelete = await makeRequest('GET', `/patterns/${createdPatternId}`);
      if (verifyDelete.status === 404) {
        console.log('   ✅ Pattern successfully deleted');
        results.passed++;
      } else {
        console.log('   ❌ Pattern still exists after deletion');
        results.failed++;
      }
    }

  } catch (error) {
    console.error('Test error:', error);
    results.failed++;
  }

  // Summary
  console.log('\n' + '='.repeat(50));
  console.log('📊 TEST SUMMARY');
  console.log('='.repeat(50));
  console.log(`✅ Passed: ${results.passed}`);
  console.log(`❌ Failed: ${results.failed}`);
  console.log(`Total: ${results.passed + results.failed}`);

  const passRate = ((results.passed / (results.passed + results.failed)) * 100).toFixed(1);
  console.log(`Pass rate: ${passRate}%`);

  if (results.failed === 0) {
    console.log('\n🎉 All tests passed! CRUD operations are working correctly.');
  } else {
    console.log('\n⚠️  Some tests failed. Please review the implementation.');
  }

  process.exit(results.failed === 0 ? 0 : 1);
}

// Run tests
runTests();