# Employee Management System - Testing Guide

## Overview

This testing suite provides comprehensive coverage for the Employee Management System, including unit tests, integration tests, end-to-end tests, performance benchmarks, and accessibility testing.

## Testing Stack

- **Unit Testing**: Vitest + React Testing Library
- **E2E Testing**: Playwright
- **Integration Testing**: Vitest + Real Database
- **Accessibility Testing**: axe-playwright
- **Performance Testing**: Custom benchmarks with performance.now()

## Directory Structure

```
tests/
├── e2e/                           # End-to-end tests
│   ├── employee-crud.spec.ts      # Employee CRUD operations
│   ├── csv-import-export.spec.ts  # CSV import/export functionality
│   ├── performance.spec.ts        # Performance testing
│   ├── auth-flows.spec.ts         # Authentication flows
│   ├── error-handling.spec.ts     # Error handling scenarios
│   └── accessibility.spec.ts      # Accessibility compliance
├── integration/                   # Integration tests
│   ├── api-database.test.ts       # API-Database integration
│   └── performance-benchmarks.test.ts # Performance benchmarks
├── fixtures/                      # Test data files
│   ├── test-employees.csv         # Valid test data
│   ├── invalid-employees.csv      # Invalid test data
│   └── large-dataset.csv          # Large dataset for performance testing
├── utils/                         # Testing utilities
│   └── test-helpers.ts            # Helper functions and classes
├── global-setup.ts               # Global test setup
├── global-teardown.ts            # Global test cleanup
└── TESTING_GUIDE.md              # This file
```

## Quick Start

### Setup

1. Install dependencies:
```bash
npm install
```

2. Install Playwright browsers:
```bash
npm run playwright:install
```

3. Set up environment variables:
```bash
cp .env.example .env
# Edit .env with your test database credentials
```

### Running Tests

```bash
# Run all unit tests
npm run test

# Run unit tests with UI
npm run test:ui

# Run unit tests with coverage
npm run test:coverage

# Run all E2E tests
npm run test:e2e

# Run E2E tests with UI (interactive mode)
npm run test:e2e:ui

# Run E2E tests in headed mode (see browser)
npm run test:e2e:headed

# Run E2E tests in debug mode
npm run test:e2e:debug

# Run integration tests only
npm run test:integration

# Run performance benchmarks
npm run test:performance

# Run accessibility tests only
npm run test:accessibility

# Run mobile tests only
npm run test:mobile

# Run cross-browser tests
npm run test:browsers

# Run all tests (unit + E2E)
npm run test:all

# Run CI tests (with coverage and junit output)
npm run test:ci
```

## Test Categories

### 1. Unit Tests

Located in `src/` alongside components. Test individual components and functions in isolation.

**Coverage**: 80%+ statements, branches, functions, and lines.

**Run**: `npm run test`

### 2. Integration Tests

Test the interaction between API endpoints and database operations.

**Features Tested**:
- API-Database consistency
- CRUD operations data flow
- Search and filtering accuracy
- Data validation across layers
- Transaction integrity
- Performance benchmarks

**Run**: `npm run test:integration`

### 3. End-to-End Tests

Test complete user workflows from browser to database.

#### Employee CRUD (`employee-crud.spec.ts`)
- Create, read, update, delete employees
- Search and filtering functionality
- Form validation
- Responsive design
- Performance metrics

#### CSV Import/Export (`csv-import-export.spec.ts`)
- File upload and validation
- CSV parsing and processing
- Error handling for invalid data
- Export functionality
- Large file handling

#### Performance (`performance.spec.ts`)
- Page load times
- Search response times
- Memory usage monitoring
- Network request optimization
- Rendering performance

#### Authentication (`auth-flows.spec.ts`)
- Login/logout flows
- Registration process
- Password reset
- Role-based access control
- Session management

#### Error Handling (`error-handling.spec.ts`)
- Network error scenarios
- Form validation errors
- System error recovery
- User input sanitization
- Offline functionality

#### Accessibility (`accessibility.spec.ts`)
- WCAG AA compliance
- Keyboard navigation
- Screen reader support
- Focus management
- Color contrast
- Mobile accessibility

**Run**: `npm run test:e2e`

### 4. Performance Benchmarks

Comprehensive performance testing for API, database, and UI operations.

**Metrics Tracked**:
- API response times
- Database query performance
- Bulk operation efficiency
- Memory usage patterns
- Concurrent load handling
- Stress testing limits

**Benchmarks**:
- List employees: <200ms
- Search queries: <300ms
- Complex filtering: <400ms
- Pagination: <250ms
- Database queries: <50ms
- Bulk operations: <50ms per item
- Export operations: <2ms per record

**Run**: `npm run test:performance`

## Test Data Management

### Fixtures

Test data is organized in `/tests/fixtures/`:

- `test-employees.csv`: Valid employee data for happy path testing
- `invalid-employees.csv`: Invalid data for error handling tests
- `large-dataset.csv`: Large dataset for performance testing

### Database Setup

Tests use a separate test database to avoid conflicts with development data:

1. **Setup**: Global setup creates test database and runs migrations
2. **Cleanup**: Each test cleans up its data after execution
3. **Isolation**: Tests don't interfere with each other
4. **Teardown**: Global teardown removes all test data

### Test Data Generators

Use helper functions for consistent test data:

```typescript
import { TestDataGenerator } from './utils/test-helpers';

// Generate single employee
const employee = TestDataGenerator.generateEmployee();

// Generate multiple employees
const employees = TestDataGenerator.generateEmployees(10);

// Generate invalid data for error testing
const invalidEmployee = TestDataGenerator.generateInvalidEmployee();
```

## Page Object Model

Use page objects for maintainable E2E tests:

```typescript
import { EmployeeFormPage, EmployeeListPage } from './utils/test-helpers';

test('should create employee', async ({ page }) => {
  const listPage = new EmployeeListPage(page);
  const formPage = new EmployeeFormPage(page);
  
  await listPage.openAddEmployeeForm();
  await formPage.fillForm(testEmployee);
  await formPage.submit();
  
  await listPage.expectEmployeeVisible(testEmployee.name);
});
```

## Browser Configuration

Tests run on multiple browsers and devices:

### Desktop Browsers
- **Chromium**: Latest Chrome
- **Firefox**: Latest Firefox
- **WebKit**: Safari equivalent

### Mobile Devices
- **Mobile Chrome**: Pixel 5 simulation
- **Mobile Safari**: iPhone 12 simulation

### Branded Browsers
- **Microsoft Edge**: Using Edge channel
- **Google Chrome**: Using Chrome channel

## Environment Variables

Configure test environment with these variables:

```bash
# API Configuration
VITE_API_URL=http://localhost:3001/api

# Database Configuration
TEST_DB_HOST=localhost
TEST_DB_PORT=5432
TEST_DB_NAME=employee_management_test
TEST_DB_USER=postgres
TEST_DB_PASSWORD=password

# Test Environment
NODE_ENV=test
CI=false  # Set to true in CI/CD environments
```

## CI/CD Integration

### GitHub Actions Example

```yaml
name: Tests
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_DB: employee_management_test
          POSTGRES_USER: postgres
          POSTGRES_PASSWORD: password
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
    
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
      
      - run: npm ci
      - run: npm run playwright:install
      - run: npm run test:ci
        env:
          TEST_DB_HOST: localhost
          TEST_DB_PORT: 5432
          TEST_DB_NAME: employee_management_test
          TEST_DB_USER: postgres
          TEST_DB_PASSWORD: password
      
      - uses: actions/upload-artifact@v3
        if: always()
        with:
          name: test-results
          path: test-results/
```

## Best Practices

### Test Writing Guidelines

1. **Arrange-Act-Assert**: Structure tests clearly
2. **Descriptive Names**: Test names should explain what and why
3. **Independent Tests**: Each test should be able to run in isolation
4. **Realistic Data**: Use realistic test data that matches production
5. **Error Scenarios**: Test both happy paths and error conditions

### Performance Testing

1. **Baseline Metrics**: Establish performance baselines
2. **Regression Detection**: Monitor for performance regressions
3. **Load Testing**: Test under realistic load conditions
4. **Memory Monitoring**: Check for memory leaks
5. **Network Efficiency**: Minimize network requests

### Accessibility Testing

1. **Automated Checks**: Use axe-playwright for automated a11y testing
2. **Manual Testing**: Supplement with manual keyboard navigation tests
3. **Screen Reader Testing**: Test with screen reader simulation
4. **Color Contrast**: Verify sufficient color contrast ratios
5. **Mobile Accessibility**: Test accessibility on mobile devices

### Maintenance

1. **Regular Updates**: Keep testing dependencies updated
2. **Flaky Test Management**: Address and fix flaky tests promptly
3. **Test Data Cleanup**: Ensure proper test data cleanup
4. **Documentation**: Keep test documentation current
5. **Code Review**: Review test code as thoroughly as application code

## Troubleshooting

### Common Issues

#### Database Connection Errors
```bash
# Ensure PostgreSQL is running
brew services start postgresql
# Or
sudo service postgresql start

# Check database exists
psql -U postgres -l
```

#### Playwright Browser Issues
```bash
# Reinstall browsers
npm run playwright:install

# Clear Playwright cache
npx playwright install --force
```

#### Test Timeouts
```bash
# Increase timeout in playwright.config.ts
timeout: 60 * 1000, // 60 seconds

# Or for specific tests
test('slow test', { timeout: 120000 }, async ({ page }) => {
  // test code
});
```

#### Port Conflicts
```bash
# Check for processes using ports
lsof -i :3001  # API server
lsof -i :5173  # Vite dev server

# Kill processes if needed
kill -9 <PID>
```

### Debugging Tests

#### E2E Test Debugging
```bash
# Run with headed browser
npm run test:e2e:headed

# Debug specific test
npm run test:e2e:debug -- employee-crud

# Use Playwright inspector
npm run playwright:codegen
```

#### Integration Test Debugging
```bash
# Run specific test file
npm run test:integration -- api-database

# Enable SQL query logging
DEBUG=knex:query npm run test:integration
```

## Test Reports

### Coverage Reports
- Location: `coverage/`
- Format: HTML, LCOV, JSON
- View: Open `coverage/index.html` in browser

### Playwright Reports
- Location: `playwright-report/`
- View: `npm run playwright:report`
- Includes screenshots, videos, traces for failed tests

### Performance Reports
- Console output during test runs
- Custom performance metrics logged
- Memory usage tracking
- Network request analysis

## Contributing

When adding new features:

1. **Add Unit Tests**: Cover new functions and components
2. **Add Integration Tests**: Test API-database interactions
3. **Add E2E Tests**: Cover new user workflows
4. **Update Performance Tests**: Add benchmarks for new operations
5. **Test Accessibility**: Ensure new features are accessible
6. **Update Documentation**: Keep test documentation current

### Test Review Checklist

- [ ] Tests are independent and can run in any order
- [ ] Test data is properly cleaned up
- [ ] Error scenarios are covered
- [ ] Performance implications are considered
- [ ] Accessibility requirements are met
- [ ] Tests are maintainable and well-documented
- [ ] CI/CD integration works correctly