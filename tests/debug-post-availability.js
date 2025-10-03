const http = require('http');

// Test data - matching database expectations
const testPattern = {
  employeeId: '1254ddbc-8aff-4524-aca1-958a4facf660',
  name: 'Debug Test Pattern',
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
  configuration: {
    weeklyHours: 40,
    dailyHours: 8,
    workDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday']
  },
  isActive: false,
  notes: 'Debug test pattern'
};

console.log('📤 Sending POST request to /api/availability/patterns');
console.log('Request body:', JSON.stringify(testPattern, null, 2));

const postData = JSON.stringify(testPattern);

const options = {
  hostname: 'localhost',
  port: 3001,
  path: '/api/availability/patterns',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(postData)
  }
};

const req = http.request(options, (res) => {
  console.log(`\n📥 Response Status: ${res.statusCode} ${res.statusMessage}`);
  console.log('Response Headers:', res.headers);

  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    console.log('\n📄 Full Response Body:');
    console.log(data);

    try {
      const parsed = JSON.parse(data);
      console.log('\n🔍 Parsed Response:');
      console.log(JSON.stringify(parsed, null, 2));

      if (parsed.success) {
        console.log('\n✅ Pattern created successfully!');
        console.log('Pattern ID:', parsed.data?.id);
      } else {
        console.log('\n❌ Failed to create pattern');
        console.log('Error message:', parsed.message);
        if (parsed.errors) {
          console.log('Validation errors:', parsed.errors);
        }
        if (parsed.details) {
          console.log('Error details:', parsed.details);
        }
      }
    } catch (e) {
      console.log('\n⚠️ Could not parse response as JSON');
      console.log('Raw response:', data);
    }
  });
});

req.on('error', (e) => {
  console.error(`\n❌ Request error: ${e.message}`);
});

// Send the request
req.write(postData);
req.end();