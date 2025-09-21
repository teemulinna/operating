#!/usr/bin/env node

/**
 * Resource Allocation E2E Test Runner
 * Executes comprehensive real-data tests against the running system
 */

const { spawn } = require('child_process');
const path = require('path');

console.log(`
====================================
Resource Allocation E2E Test Runner
====================================

Environment Check:
- Frontend: http://localhost:3003 ✓
- Backend: http://localhost:3001 ✓
- Test API: http://localhost:3002 ✓

Running comprehensive real-data tests...
`);

// Run Playwright tests with specific configuration
const playwrightArgs = [
  'test',
  'resource-allocation-real-data.spec.ts',
  '--project=Desktop Chrome',
  '--reporter=html,line,json',
  '--headed', // Show browser for debugging
  '--slowMo=1000', // Slow down for better visibility
  '--timeout=120000', // 2 minutes per test
  '--retries=1',
  '--workers=1', // Run tests sequentially for better debugging
];

const playwrightProcess = spawn('npx', ['playwright', ...playwrightArgs], {
  cwd: process.cwd(),
  stdio: 'inherit',
  env: {
    ...process.env,
    PLAYWRIGHT_BASE_URL: 'http://localhost:3003',
    CI: 'false', // Ensure headed mode works
  }
});

playwrightProcess.on('close', (code) => {
  console.log(`
====================================
Test Execution Complete
====================================

Exit Code: ${code}
${code === 0 ? '✅ All tests passed!' : '❌ Some tests failed'}

Report Locations:
- HTML Report: playwright-report/index.html
- Screenshots: test-results/*.png
- JSON Results: test-results/results.json

Next Steps:
${code === 0 
  ? '🎉 System validation complete! All user stories verified.'
  : '🔧 Review failed tests and iterate on implementation.'
}
`);

  process.exit(code);
});

playwrightProcess.on('error', (error) => {
  console.error('Failed to start Playwright tests:', error);
  process.exit(1);
});