#!/usr/bin/env node

/**
 * Verification script to test that E2E test fixes are working
 * Run this script to verify that the test configuration is correct
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 Verifying E2E Test Fixes...\n');

const checks = [];

// Check 1: Playwright config has correct port
const playwrightConfigPath = path.join(__dirname, '../playwright.config.ts');
if (fs.existsSync(playwrightConfigPath)) {
  const config = fs.readFileSync(playwrightConfigPath, 'utf8');
  if (config.includes('localhost:3001')) {
    checks.push({ name: 'Playwright config port', status: 'PASS', message: 'Uses correct port 3001' });
  } else if (config.includes('localhost:3003')) {
    checks.push({ name: 'Playwright config port', status: 'FAIL', message: 'Still uses wrong port 3003' });
  } else {
    checks.push({ name: 'Playwright config port', status: 'WARN', message: 'Port configuration unclear' });
  }
} else {
  checks.push({ name: 'Playwright config', status: 'FAIL', message: 'Config file not found' });
}

// Check 2: Test data factory exists
const testDataFactoryPath = path.join(__dirname, 'fixtures/testDataFactory.ts');
if (fs.existsSync(testDataFactoryPath)) {
  checks.push({ name: 'Test data factory', status: 'PASS', message: 'Factory file exists' });
  
  const factory = fs.readFileSync(testDataFactoryPath, 'utf8');
  if (factory.includes('TestDataFactory') && factory.includes('TestDataSetup')) {
    checks.push({ name: 'Test data factory content', status: 'PASS', message: 'Contains required classes' });
  } else {
    checks.push({ name: 'Test data factory content', status: 'FAIL', message: 'Missing required classes' });
  }
} else {
  checks.push({ name: 'Test data factory', status: 'FAIL', message: 'Factory file not found' });
}

// Check 3: Improved test files exist
const improvedTests = [
  'csv-export-improved.spec.ts',
  'employee-crud-improved.spec.ts'
];

improvedTests.forEach(testFile => {
  const testPath = path.join(__dirname, 'e2e', testFile);
  if (fs.existsSync(testPath)) {
    checks.push({ name: `Improved test: ${testFile}`, status: 'PASS', message: 'Test file exists' });
    
    const content = fs.readFileSync(testPath, 'utf8');
    if (content.includes('TestDataFactory') || content.includes('TestDataSetup')) {
      checks.push({ name: `${testFile} uses data factory`, status: 'PASS', message: 'Uses test data management' });
    } else {
      checks.push({ name: `${testFile} uses data factory`, status: 'WARN', message: 'May not use data management' });
    }
  } else {
    checks.push({ name: `Improved test: ${testFile}`, status: 'FAIL', message: 'Test file not found' });
  }
});

// Check 4: Original test files have been fixed
const originalTests = [
  'csv-export.spec.ts',
  'employee-crud-tdd.spec.ts'
];

originalTests.forEach(testFile => {
  const testPath = path.join(__dirname, 'e2e', testFile);
  if (fs.existsSync(testPath)) {
    const content = fs.readFileSync(testPath, 'utf8');
    
    // Check for correct CSV selector
    if (testFile.includes('csv-export') && content.includes('reports-export-csv-btn')) {
      checks.push({ name: `${testFile} CSV selector`, status: 'PASS', message: 'Uses correct selector' });
    } else if (testFile.includes('csv-export') && content.includes('csv-export-button')) {
      checks.push({ name: `${testFile} CSV selector`, status: 'FAIL', message: 'Still uses wrong selector' });
    }
    
    // Check for hardcoded URLs
    if (content.includes('localhost:3003')) {
      checks.push({ name: `${testFile} URLs`, status: 'FAIL', message: 'Contains hardcoded localhost:3003' });
    } else {
      checks.push({ name: `${testFile} URLs`, status: 'PASS', message: 'No hardcoded wrong URLs' });
    }
  }
});

// Check 5: Package.json has faker dependency
const packageJsonPath = path.join(__dirname, '../package.json');
if (fs.existsSync(packageJsonPath)) {
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  if (packageJson.devDependencies && packageJson.devDependencies['@faker-js/faker']) {
    checks.push({ name: 'Faker.js dependency', status: 'PASS', message: 'Faker.js is installed' });
  } else {
    checks.push({ name: 'Faker.js dependency', status: 'FAIL', message: 'Faker.js not in devDependencies' });
  }
} else {
  checks.push({ name: 'Package.json', status: 'FAIL', message: 'Package.json not found' });
}

// Check 6: Test analysis document exists
const analysisPath = path.join(__dirname, 'TEST_ANALYSIS.md');
if (fs.existsSync(analysisPath)) {
  checks.push({ name: 'Test analysis document', status: 'PASS', message: 'Analysis document exists' });
} else {
  checks.push({ name: 'Test analysis document', status: 'FAIL', message: 'Analysis document missing' });
}

// Display results
console.log('Results:\n' + '='.repeat(60));

let passCount = 0;
let failCount = 0;
let warnCount = 0;

checks.forEach(check => {
  const icon = check.status === 'PASS' ? '✅' : check.status === 'FAIL' ? '❌' : '⚠️';
  const color = check.status === 'PASS' ? '\x1b[32m' : check.status === 'FAIL' ? '\x1b[31m' : '\x1b[33m';
  const reset = '\x1b[0m';
  
  console.log(`${icon} ${color}${check.name}${reset}: ${check.message}`);
  
  if (check.status === 'PASS') passCount++;
  else if (check.status === 'FAIL') failCount++;
  else warnCount++;
});

console.log('\n' + '='.repeat(60));
console.log(`Summary: ${passCount} passed, ${failCount} failed, ${warnCount} warnings`);

if (failCount === 0) {
  console.log('\n🎉 All critical checks passed! The E2E test fixes are ready.');
  console.log('\nNext steps:');
  console.log('1. Run: cd frontend && npm run test:e2e');
  console.log('2. Or run improved tests: npx playwright test tests/e2e/*-improved.spec.ts');
  console.log('3. Check the TEST_ANALYSIS.md for detailed documentation');
} else {
  console.log('\n⚠️  Some issues found. Please review the failed checks above.');
  process.exit(1);
}

// Additional recommendations
console.log('\n📋 Recommendations:');
console.log('- Use the improved test files for better reliability');
console.log('- Check TEST_ANALYSIS.md for missing features to implement');
console.log('- Ensure backend is running on port 3001 before running tests');
console.log('- Database should be accessible for test data seeding');