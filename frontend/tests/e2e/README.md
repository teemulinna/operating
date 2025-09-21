# ResourceForge E2E Testing Suite

A comprehensive end-to-end testing suite for the ResourceForge application using Playwright with the Page Object Model pattern.

## 🏗️ Architecture

This testing suite follows industry best practices with a well-structured architecture:

```
tests/e2e/
├── pages/           # Page Object Models
│   ├── BasePage.ts          # Base class with common functionality
│   ├── EmployeePage.ts      # Employee management operations
│   ├── ProjectPage.ts       # Project management operations
│   ├── AllocationPage.ts    # Resource allocation operations
│   └── index.ts            # Exports all page objects
├── specs/           # Test specifications
│   ├── employee.spec.ts     # Employee CRUD operations
│   ├── project.spec.ts      # Project management tests
│   ├── allocation.spec.ts   # Resource allocation tests
│   ├── integration.spec.ts  # End-to-end workflows
│   └── performance.spec.ts  # Performance & accessibility
├── utils/           # Test utilities and helpers
│   ├── TestDataFactory.ts  # Test data generation
│   ├── TestHelpers.ts      # Common test utilities
│   └── index.ts            # Exports all utilities
└── README.md        # This file
```

## 🚀 Quick Start

### Prerequisites

- Node.js (v16+)
- ResourceForge application running on:
  - Frontend: http://localhost:3002
  - Backend API: http://localhost:3001

### Running Tests

```bash
# Install dependencies (if not already installed)
npm install

# Run all E2E tests
npm run test:e2e

# Run specific test suite
npx playwright test tests/e2e/specs/employee.spec.ts

# Run tests in headed mode (visible browser)
npx playwright test --headed

# Run tests with debugging
npx playwright test --debug

# Generate test report
npx playwright show-report
```

## 📋 Test Suites

### 1. Employee Management (`employee.spec.ts`)

Comprehensive testing of employee CRUD operations:

- **Create Employee**: Test creation with required and optional fields
- **Validate Fields**: Test form validation for all input fields
- **Edit Employee**: Test updating employee information
- **Delete Employee**: Test employee deletion with confirmation
- **Search & Filter**: Test search functionality and department filtering
- **Form Behavior**: Test form cancellation and error handling

**Example Test:**
```typescript
test('should create employee with all required fields', async () => {
  const employeeData = {
    firstName: 'John',
    lastName: 'Doe',
    email: 'john.doe@company.com',
    department: 'Engineering',
    role: 'Senior Developer'
  };

  await employeePage.createEmployee(employeeData);
  await employeePage.verifyEmployeeExists('John Doe');
});
```

### 2. Project Management (`project.spec.ts`)

Complete project lifecycle testing:

- **Create Project**: Test project creation with all fields
- **Date Validation**: Test start/end date validation logic
- **Edit Project**: Test project modification
- **Delete Project**: Test project deletion
- **Search & Filter**: Test project filtering by status and priority
- **Status Management**: Test all project status transitions

**Key Features:**
- Date validation (end date must be after start date)
- Status and priority management
- Budget and client information handling

### 3. Resource Allocation (`allocation.spec.ts`)

Resource allocation workflow testing:

- **Create Allocation**: Test employee-to-project assignments
- **Over-allocation Warning**: Test capacity overflow detection
- **Edit Allocation**: Test allocation modifications
- **Remove Allocation**: Test allocation deletion
- **Capacity Management**: Test utilization calculations
- **Date Conflicts**: Test overlapping allocation detection

**Advanced Features:**
- Over-allocation warning system
- Capacity utilization tracking
- Timeline and calendar views
- Date overlap validation

### 4. Integration Workflows (`integration.spec.ts`)

End-to-end business process testing:

- **Complete Workflow**: Employee → Project → Allocation
- **Data Persistence**: Test data consistency across modules
- **Navigation Testing**: Test deep links and routing
- **Performance Testing**: Test with larger datasets
- **Error Handling**: Test graceful error recovery
- **Accessibility**: Test keyboard navigation and screen readers

### 5. Performance & Accessibility (`performance.spec.ts`)

Performance and accessibility validation:

- **Page Load Performance**: Monitor load times
- **API Performance**: Track response times
- **Search Performance**: Test filter and search speed
- **Accessibility Compliance**: WCAG guidelines testing
- **Memory Management**: Test for memory leaks
- **Responsive Design**: Test across different screen sizes

## 🎭 Page Object Model

### BasePage

The foundation class providing common functionality:

```typescript
export abstract class BasePage {
  // Navigation and page loading
  async goto(path: string): Promise<void>
  async waitForPageLoad(): Promise<void>
  
  // Element interactions
  async clickElement(selector: string): Promise<void>
  async fillField(selector: string, value: string): Promise<void>
  async selectOption(selector: string, value: string): Promise<void>
  
  // Utilities
  async waitForToast(expectedMessage?: string): Promise<string>
  async takeScreenshot(name: string): Promise<void>
  async retry<T>(action: () => Promise<T>): Promise<T>
}
```

### EmployeePage

Specialized page object for employee operations:

```typescript
export class EmployeePage extends BasePage {
  // Navigation
  async navigateToEmployees(): Promise<void>
  
  // CRUD Operations
  async createEmployee(data: EmployeeData): Promise<void>
  async editEmployeeByName(name: string, data: Partial<EmployeeData>): Promise<void>
  async deleteEmployeeByName(name: string): Promise<void>
  
  // Search and Filter
  async searchEmployees(searchTerm: string): Promise<void>
  async filterByDepartment(department: string): Promise<void>
  
  // Verification
  async verifyEmployeeExists(fullName: string): Promise<void>
  async verifyEmployeeNotExists(fullName: string): Promise<void>
}
```

## 🔧 Test Utilities

### TestDataFactory

Generates consistent test data:

```typescript
// Basic employee data
const employee = TestDataFactory.createBasicEmployee();

// Complete employee with all fields
const completeEmployee = TestDataFactory.createCompleteEmployee({
  department: 'Engineering',
  skills: ['React', 'TypeScript']
});

// Multiple employees for bulk testing
const employees = TestDataFactory.createMultipleEmployees(5);

// Realistic test data
const realistic = TestDataFactory.generateRealisticTestData();
```

### TestHelpers

Common testing utilities:

```typescript
// Setup complete test scenarios
const scenario = await TestHelpers.setupCompleteScenario(page, {
  employee: { department: 'Engineering' },
  project: { priority: 'High' },
  allocation: { capacity: 80 }
});

// Performance monitoring
const metrics = await TestHelpers.measurePagePerformance(page);

// Accessibility testing
await TestHelpers.verifyPageAccessibility(page);

// Data cleanup
await TestHelpers.cleanupTestData(page, {
  employees: ['John Doe'],
  projects: ['Test Project'],
  allocations: [{ employee: 'John Doe', project: 'Test Project' }]
});
```

## 🔍 Test Features

### Robust Selectors

The test suite uses multiple selector strategies for reliability:

```typescript
// Primary strategy: data-testid attributes
'[data-testid="add-employee-button"]'

// Fallback: semantic selectors
'button:has-text("Add Employee")'

// Combined approach for maximum reliability
'[data-testid*="add"], button:has-text("Add")'
```

### Retry Logic

Built-in retry mechanisms for flaky operations:

```typescript
await this.retry(async () => {
  await this.clickElement(selector);
  await this.waitForToast('Success');
}, 3, 1000);
```

### Smart Waiting

Intelligent waiting strategies:

```typescript
// Wait for network requests to complete
await this.waitForNetworkIdle();

// Wait for loading spinners to disappear
await this.waitForElementToDisappear('[data-testid*="loading"]');

// Wait for specific element count
await this.waitForElementCount('.employee-card', 5);
```

## 📊 Test Reporting

Tests generate comprehensive reports including:

- **HTML Report**: Visual test results with screenshots
- **JSON Results**: Machine-readable test data
- **Performance Metrics**: Load times and API response times
- **Accessibility Report**: WCAG compliance status
- **Screenshots**: Failure screenshots and debug images

View reports:
```bash
npx playwright show-report
```

## 🚦 CI/CD Integration

The test suite is optimized for CI/CD environments:

```yaml
# Example GitHub Actions configuration
- name: Run E2E Tests
  run: |
    npm run test:e2e
    npx playwright show-report --host 0.0.0.0
  env:
    CI: true
```

**CI Optimizations:**
- Reduced parallelism to prevent resource conflicts
- Increased timeouts for slower CI environments
- Automatic retry for flaky tests
- HTML report generation
- Screenshot capture on failures

## 🔧 Configuration

### Playwright Configuration

Located at `/frontend/playwright.config.ts`:

```typescript
export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30 * 60 * 1000,  // 30 minutes for comprehensive tests
  retries: process.env.CI ? 3 : 2,
  workers: process.env.CI ? 1 : 1,
  
  use: {
    baseURL: 'http://localhost:3002',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    actionTimeout: 15000,
    navigationTimeout: 30000
  }
});
```

### Environment Variables

```bash
# Test environment
NODE_ENV=test
VITE_NODE_ENV=test
PLAYWRIGHT_TEST=true

# API endpoints
VITE_API_URL=http://localhost:3001
```

## 🐛 Debugging

### Debug Mode

```bash
# Run tests with debug mode
npx playwright test --debug

# Run specific test with debugging
npx playwright test tests/e2e/specs/employee.spec.ts --debug
```

### Console Logging

Tests include comprehensive logging:

```typescript
console.log(`Employee created in ${duration}ms`);
console.log('Performance metrics:', metrics);
console.warn('Slow API call detected:', { url, duration });
```

### Screenshots

Automatic screenshot capture:
- On test failures
- Debug screenshots during development
- Performance comparison screenshots

## 📈 Performance Benchmarks

Expected performance thresholds:

| Operation | Target Time | Maximum Time |
|-----------|-------------|--------------|
| Dashboard Load | < 2s | 5s |
| Employee Creation | < 2s | 4s |
| Project Creation | < 2s | 4s |
| Search Operation | < 1s | 2s |
| Form Validation | < 500ms | 1s |
| API Response | < 1s | 3s |

## ♿ Accessibility Standards

Tests validate compliance with:

- **WCAG 2.1 AA Guidelines**
- **Keyboard Navigation**: Full app navigable via keyboard
- **Screen Readers**: Proper ARIA labels and semantic HTML
- **Color Contrast**: Sufficient contrast ratios
- **Focus Management**: Logical tab order and focus indicators

## 🔄 Maintenance

### Adding New Tests

1. **Create Page Object**: If testing a new page/feature
2. **Add Test Data**: Update TestDataFactory for new entities
3. **Write Test Spec**: Follow existing patterns
4. **Update Selectors**: Ensure reliable element targeting

### Updating Existing Tests

1. **Review Selectors**: Update if UI changes
2. **Adjust Timeouts**: If performance characteristics change
3. **Update Test Data**: Modify for new field requirements
4. **Maintain Documentation**: Keep README current

### Best Practices

- **Independent Tests**: Each test should be atomic and independent
- **Clean Test Data**: Use unique identifiers to avoid conflicts
- **Descriptive Names**: Test names should explain what and why
- **Proper Assertions**: Use appropriate assertion methods
- **Error Handling**: Handle expected failures gracefully

## 🚨 Troubleshooting

### Common Issues

**Test Timeouts:**
```typescript
// Increase timeout for slow operations
await page.waitForSelector(selector, { timeout: 10000 });
```

**Element Not Found:**
```typescript
// Use more robust selectors
const selector = '[data-testid*="employee"], .employee-card, [data-employee-id]';
```

**Flaky Tests:**
```typescript
// Add retry logic
await TestHelpers.retryOperation(async () => {
  await employeePage.createEmployee(data);
  await employeePage.verifyEmployeeExists(name);
});
```

### Debug Commands

```bash
# Run single test with full logging
DEBUG=pw:api npx playwright test employee.spec.ts

# Record test interactions
npx playwright codegen localhost:3002

# View test traces
npx playwright show-trace trace.zip
```

## 📚 Resources

- [Playwright Documentation](https://playwright.dev/)
- [Page Object Model Pattern](https://playwright.dev/docs/pom)
- [Best Practices Guide](https://playwright.dev/docs/best-practices)
- [Accessibility Testing](https://playwright.dev/docs/accessibility-testing)

## 🤝 Contributing

1. Follow the existing Page Object Model structure
2. Write comprehensive test descriptions
3. Include both positive and negative test cases
4. Add appropriate error handling
5. Update documentation for new features
6. Ensure tests are independent and atomic

---

**Happy Testing!** 🎭✅