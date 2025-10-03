const http = require('http');

// First create a pattern, then update it
const testPattern = {
  employeeId: '1254ddbc-8aff-4524-aca1-958a4facf660',
  name: 'Test Pattern for Update',
  patternType: 'weekly',
  startDate: '2025-05-01',
  endDate: '2025-12-31',
  isActive: false,
  notes: 'Created for testing update'
};

// Function to make HTTP request
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
      res.on('data', (chunk) => body += chunk);
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

async function testUpdate() {
  console.log('🧪 Testing PUT /api/availability/patterns/:id\n');

  try {
    // Step 1: Create a pattern
    console.log('1️⃣ Creating pattern to update...');
    const createResult = await makeRequest('POST', '/patterns', testPattern);

    if (!createResult.body.success) {
      console.log('❌ Failed to create pattern:', createResult.body.message);
      return;
    }

    const patternId = createResult.body.data.id;
    console.log('✅ Pattern created:', patternId);

    // Step 2: Update the pattern
    console.log('\n2️⃣ Updating pattern...');
    const updateData = {
      name: 'Updated Pattern Name',
      isActive: true,
      notes: 'Updated via test',
      // Add other fields that might be expected
      patternType: 'weekly',
      startDate: '2025-05-01',
      endDate: '2025-12-31'
    };

    console.log('Sending update:', JSON.stringify(updateData, null, 2));

    const updateResult = await makeRequest('PUT', `/patterns/${patternId}`, updateData);

    console.log('\nResponse Status:', updateResult.status);
    console.log('Response Body:', JSON.stringify(updateResult.body, null, 2));

    if (updateResult.body.success) {
      console.log('\n✅ Pattern updated successfully!');
      console.log('Updated data:', updateResult.body.data);
    } else {
      console.log('\n❌ Failed to update pattern');
      console.log('Error:', updateResult.body.message);
      if (updateResult.body.errors) {
        console.log('Validation errors:', updateResult.body.errors);
      }
    }

    // Step 3: Clean up - delete the pattern
    console.log('\n3️⃣ Cleaning up...');
    await makeRequest('DELETE', `/patterns/${patternId}`);
    console.log('✅ Test pattern deleted');

  } catch (error) {
    console.error('\n❌ Test error:', error);
  }
}

// Run the test
testUpdate();