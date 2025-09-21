# E2E Testing Documentation

## Overview

This directory contains the comprehensive End-to-End testing suite for the Resource Management System. The tests are built with Playwright and cover all critical user flows and system integrations.

## Test Structure

```
tests/
├── e2e/                          # E2E test specifications
│   ├── *.spec.ts                # Individual test files
│   └── ...
├── fixtures/                    # Test data and utilities
│   └── testDataFactory.ts      # Test data generation
├── global-setup.ts             # Global test setup
└── README.md                   # This file
```

## Test Statistics

- **Total Tests**: 237 individual test cases
- **Test Files**: 25 specification files
- **Coverage**: Critical user workflows and API integrations
- **Browser Support**: Chrome (primary), Firefox and Safari (configurable)

## Running Tests

### Prerequisites

1. Ensure backend server is running on port 3001
2. Ensure frontend server is running on port 3002
3. Install dependencies: `npm install`

### Basic Commands

```bash
# Run all tests
npx playwright test

# Run specific test file
npx playwright test tests/e2e/basic-real-data.spec.ts

# Run tests in headed mode (see browser)
npx playwright test --headed

# Run tests with specific browser
npx playwright test --project=chromium

# Generate test report
npx playwright test --reporter=html
```

### Debug Commands

```bash
# Run tests in debug mode
npx playwright test --debug

# Show test report
npx playwright show-report

# Show trace for failed test
npx playwright show-trace test-results/[test-name]/trace.zip
```

## Test Categories

### 1. Basic Integration Tests
- **Files**: `basic-real-data.spec.ts`
- **Purpose**: Validate basic frontend-backend connectivity
- **Coverage**: API responses, data loading

### 2. CRUD Operations
- **Files**: `employee-crud-*.spec.ts`, `project-crud-*.spec.ts`
- **Purpose**: Test Create, Read, Update, Delete operations
- **Coverage**: Employee management, Project management

### 3. Export Functionality
- **Files**: `csv-export-*.spec.ts`
- **Purpose**: Test data export features
- **Coverage**: CSV, Excel, PDF exports

### 4. Analytics & Reports
- **Files**: `analytics-*.spec.ts`
- **Purpose**: Test reporting and analytics features
- **Coverage**: Dashboards, charts, utilization reports

### 5. Real Implementation Validation
- **Files**: `100-percent-real-validation.spec.ts`
- **Purpose**: Comprehensive end-to-end validation
- **Coverage**: All integrated features with real data

### 6. Performance Tests
- **Files**: Various load and stress test files
- **Purpose**: Validate system performance under load
- **Coverage**: Response times, concurrent users

## Test Data Management

### TestDataFactory
The `TestDataFactory` class provides utilities for generating realistic test data:

```typescript
import { TestDataFactory, TestDataSetup } from '../fixtures/testDataFactory';

// Generate test employees
const employees = TestDataFactory.createEmployees(5);

// Generate test projects
const projects = TestDataFactory.createProjects(3);

// Clean database before tests
await TestDataSetup.cleanDatabase();

// Seed database with test data
await TestDataSetup.seedDatabase({ employees, projects });
```

### Available Methods

- `createEmployee(overrides?)`: Generate single employee
- `createEmployees(count)`: Generate multiple employees
- `createProject(overrides?)`: Generate single project
- `createProjects(count)`: Generate multiple projects
- `createCompleteDataSet(employeeCount, projectCount)`: Generate complete dataset
- `getValidationTestCases()`: Get validation test scenarios

## Configuration

### Playwright Configuration
The main configuration is in `playwright.config.ts`:

- **Test Directory**: `./tests/e2e`
- **Base URL**: `http://localhost:3002`
- **Timeout**: 30 minutes for comprehensive tests
- **Retries**: 2-3 retries for flaky tests
- **Workers**: 1 (sequential execution to prevent API conflicts)

### Environment Variables
Tests use these environment settings:
- `NODE_ENV=test`
- `VITE_NODE_ENV=test`
- `PLAYWRIGHT_TEST=true`

## Best Practices

### 1. Test Isolation
- Each test should be independent
- Use `TestDataSetup.cleanDatabase()` before/after tests
- Avoid dependencies between test cases

### 2. Selectors
- Use `data-testid` attributes for stable selectors
- Avoid CSS selectors that may change
- Example: `page.locator('[data-testid="add-employee-btn"]')`

### 3. Assertions
- Use Playwright's built-in assertions: `expect(locator).toBeVisible()`
- Wait for elements before assertions: `page.waitForSelector()`
- Check for both positive and negative cases

### 4. Error Handling
- Tests should handle API failures gracefully
- Include retry logic for flaky network calls
- Log meaningful error messages

### 5. Performance Considerations
- Tests run sequentially to prevent database conflicts
- Use `page.waitForLoadState('networkidle')` after navigation
- Clean up test data to prevent database bloat

## Adding New Tests

### 1. Create Test File
```typescript
import { test, expect } from '@playwright/test';
import { TestDataFactory, TestDataSetup } from '../fixtures/testDataFactory';

test.describe('Your Feature', () => {
  test.beforeEach(async ({ page }) => {
    await TestDataSetup.cleanDatabase();
    await page.goto('/your-page');
  });

  test('should do something', async ({ page }) => {
    // Your test logic
    expect(/* your assertion */).toBeTruthy();
  });
});
```

### 2. Add Test Data
If your test needs specific data, add factory methods to `testDataFactory.ts`:

```typescript
static createYourData(overrides = {}) {
  return {
    // your data structure
    ...overrides
  };
}
```

### 3. Update Documentation
- Add your test to the appropriate category above
- Document any new test data methods
- Update the total test count if adding many tests

## CI/CD Integration

### GitHub Actions
The tests are configured to run in GitHub Actions with:
- Browser installation
- Parallel execution disabled for API stability
- Test report artifacts
- Failure screenshots and videos

### Local CI Simulation
```bash
# Simulate CI environment
CI=true npx playwright test

# Generate CI-friendly reports
npx playwright test --reporter=json,html
```

## Troubleshooting

### Common Issues

1. **"API not available"**
   - Ensure backend is running on port 3001
   - Check `TestDatabaseUtils.waitForAPI()` timeout

2. **"Element not found"**
   - UI might have changed, update selectors
   - Check if element is loaded: `page.waitForSelector()`

3. **"Test timeout"**
   - Increase timeout in playwright.config.ts
   - Check for infinite loading states

4. **"Database conflicts"**
   - Ensure tests run sequentially (`workers: 1`)
   - Use `TestDataSetup.cleanDatabase()` between tests

### Debug Tips

1. **Visual debugging**: Use `--headed` and `--debug` flags
2. **Screenshots**: Check `test-results/` folder after failures
3. **Network logs**: Enable `trace: 'on'` in config for network debugging
4. **Console logs**: Use `page.on('console', console.log)` to see browser console

## Performance Expectations

- **Basic test execution**: ~1-2 minutes per test
- **Full suite**: ~8-12 minutes (237 tests)
- **Setup/teardown**: ~30 seconds per test file
- **Database operations**: ~1-3 seconds per CRUD operation

## Quality Metrics

The test suite maintains high quality standards:
- **Test isolation**: ✅ Each test is independent
- **Data cleanup**: ✅ Database cleaned between tests
- **Error handling**: ✅ Graceful failure handling
- **Flaky test mitigation**: ✅ Retry logic and timeouts
- **Real data validation**: ✅ Tests use actual API responses

## Maintenance

### Regular Tasks
1. Update selectors when UI changes
2. Add tests for new features
3. Review and optimize slow tests
4. Update test data to match schema changes
5. Monitor test failure patterns

### Monthly Reviews
- Analyze test execution times
- Review flaky test patterns
- Update browser versions
- Clean up obsolete tests

---

For questions or issues, please check the troubleshooting section above or consult the team's testing guidelines.