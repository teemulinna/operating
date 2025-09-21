# Test Data Management Guide

## Overview

This guide explains how to write robust tests that work with any database state - whether it's empty, has minimal data, or contains a full dataset. Our dynamic test data management approach ensures tests are reliable across different environments.

## Problems with Traditional Testing

### ❌ Hardcoded Assertions (Avoid)
```typescript
// BAD: Assumes exact data exists
expect(data.length).toBe(3);
expect(data[0].firstName).toBe('John');
expect(page.locator('text=John')).toBeVisible();
```

**Why this fails:**
- Tests break when data changes
- Can't run on empty databases
- Fragile in different environments
- Maintenance nightmare

### ✅ Dynamic Validation (Use)
```typescript
// GOOD: Works with any amount of data
TestDataManager.expectFlexibleCount(data.length, 'employees');
if (data.length > 0) {
  expect(data[0]).toHaveProperty('firstName');
  expect(data[0].firstName.length).toBeGreaterThan(0);
}
```

## Core Principles

### 1. Expect Variable Data
- Don't assume specific counts
- Don't hardcode names or IDs
- Handle empty states gracefully
- Provide meaningful context

### 2. Validate Structure, Not Content
```typescript
// Test data structure
expect(employee).toHaveProperty('firstName');
expect(employee).toHaveProperty('email');
expect(employee.email).toMatch(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);

// Don't test specific values
// expect(employee.firstName).toBe('John'); // ❌
```

### 3. Conditional Test Logic
```typescript
await TestDataManager.executeIfDataExists(
  employees,
  async (employees) => {
    // Only run these assertions if employees exist
    expect(employees[0]).toHaveProperty('firstName');
  },
  'No employees found - skipping data validation'
);
```

## Using TestDataManager

### Basic API Response Validation
```typescript
import TestDataManager from '../utils/test-data-manager';

// Validate API response with flexible constraints
await TestDataManager.validateApiResponse(response.data, {
  minCount: 0,        // Allow empty
  maxCount: 1000,     // Reasonable upper bound
  allowEmpty: true,   // Don't fail on empty data
  expectedProperties: ['id', 'firstName', 'lastName', 'email']
});
```

### Employee-Specific Validation
```typescript
await TestDataManager.validateEmployeeData(employees, {
  allowEmpty: true
});

// This automatically validates:
// - Array structure
// - Employee properties (firstName, lastName, email, id)
// - Email format
// - Non-empty names (if present)
```

### Project-Specific Validation
```typescript
await TestDataManager.validateProjectData(projects, {
  allowEmpty: true
});

// Validates project structure and status values
```

### Flexible Count Assertions
```typescript
// Instead of: expect(data.length).toBe(3);
TestDataManager.expectFlexibleCount(data.length, 'employees');

// Provides contextual output:
// ℹ️ 0 employees found - testing with empty state
// ℹ️ 1 employee found - testing with minimal data  
// ℹ️ 5 employees found - testing with multiple records
```

### Smart Element Waiting
```typescript
const count = await TestDataManager.waitForDataLoad(
  page,
  '[data-testid^="employee-"]',  // Selector for data elements
  'employee data',               // Context for logging
  15000                         // Timeout
);

// Handles loading states and provides feedback
```

## Database State Detection

### Detecting Current State
```typescript
import { DatabaseStateDetector } from '../utils/test-data-manager';

const state = await DatabaseStateDetector.detectState(
  page, 
  'http://localhost:3001/api/employees'
);

console.log(`Database has ${state.count} employees`);
console.log(`State: ${state.isEmpty ? 'empty' : state.hasMinimalData ? 'minimal' : 'rich'}`);
```

### Adaptive Test Strategies
```typescript
const strategy = DatabaseStateDetector.getTestStrategy(state);

// Returns strategy recommendations:
if (strategy.strategy === 'empty') {
  // Test empty state handling
  // Test data creation workflows
  // Skip data-dependent operations
} else if (strategy.strategy === 'minimal') {
  // Test with limited data
  // Test edge cases
} else {
  // Test pagination, search, etc.
}
```

## E2E Testing Patterns

### Page Load Testing
```typescript
test('Page loads regardless of data state', async ({ page }) => {
  await page.goto('/employees');
  
  // Wait for data with context
  const count = await TestDataManager.waitForDataLoad(
    page,
    '.employee-item',
    'employee data'
  );
  
  if (count === 0) {
    // Verify empty state
    await expect(page.locator('[data-testid="empty-state"]')).toBeVisible();
  } else {
    // Verify data display
    await expect(page.locator('.employee-item').first()).toBeVisible();
  }
});
```

### CRUD Operations
```typescript
test('Create employee works regardless of existing data', async ({ page }) => {
  // Generate unique test data
  const testEmployee = TestDataManager.generateTestData('employee', Date.now());
  
  // Test creation
  await page.goto('/employees');
  await page.click('[data-testid="add-employee"]');
  
  // Fill form
  await page.fill('[data-testid="firstName"]', testEmployee.firstName);
  await page.fill('[data-testid="email"]', testEmployee.email);
  
  await page.click('[data-testid="submit"]');
  
  // Verify creation (flexible validation)
  await expect(page.locator(`text=${testEmployee.firstName}`)).toBeVisible();
});
```

### API Integration Testing
```typescript
test('API handles dynamic data correctly', async ({ page }) => {
  const response = await page.request.get('/api/employees');
  const data = await response.json();
  
  // Flexible validation
  await TestDataManager.validateEmployeeData(data.data || [], {
    allowEmpty: true
  });
  
  if (data.data && data.data.length > 0) {
    // Test with existing data
    const employee = data.data[0];
    const detailResponse = await page.request.get(`/api/employees/${employee.id}`);
    expect(detailResponse.status()).toBe(200);
  }
});
```

## Error Handling

### Graceful Degradation
```typescript
try {
  await TestDataManager.validateEmployeeData(employees);
} catch (error) {
  console.log('⚠️ Employee data validation failed:', error.message);
  // Continue with basic structure validation
  expect(Array.isArray(employees)).toBe(true);
}
```

### Meaningful Error Messages
```typescript
// TestDataManager provides context in errors:
// "Expected data but found empty array. Consider seeding test data."
// "Element not found. This might be due to: 1. Element doesn't exist..."
```

## Test Data Generation

### Creating Test Data
```typescript
// Generates unique, non-interfering test data
const employee = TestDataManager.generateTestData('employee', Date.now());
// Returns: { firstName: 'Test123', email: 'test.123@test-automation.com', ... }

const project = TestDataManager.generateTestData('project', Date.now());
// Returns: { name: 'Test Project 123', description: '...', ... }
```

### Cleanup
```typescript
test.afterEach('Cleanup test data', async ({ page }) => {
  await TestDataManager.cleanupTestData(
    page,
    '/api/employees',
    'test-automation'  // Identifier pattern to clean
  );
});
```

## Integration Testing

### Dynamic ID Handling
```typescript
// Don't hardcode IDs
// const response = await request.get('/api/employees/1'); // ❌

// Get dynamic IDs
const listResponse = await request.get('/api/employees');
if (listResponse.body.data.length > 0) {
  const firstEmployee = listResponse.body.data[0];
  const response = await request.get(`/api/employees/${firstEmployee.id}`); // ✅
}
```

### Conditional Testing
```typescript
describe('Employee Updates', () => {
  it('updates employee if data exists', async () => {
    const employees = await getEmployees();
    
    if (employees.length === 0) {
      console.log('⚠️ No employees found - skipping update test');
      return;
    }
    
    // Run update test with first available employee
    const employee = employees[0];
    // ... test logic
  });
});
```

## Best Practices Summary

### ✅ Do
- Use flexible count assertions
- Validate structure, not specific content
- Handle empty states gracefully
- Provide contextual error messages
- Clean up test data
- Use dynamic selectors
- Generate unique test data

### ❌ Don't
- Hardcode specific counts or names
- Assume data exists
- Use fixed IDs in tests
- Leave test data in database
- Ignore empty states
- Use brittle selectors

## Common Patterns

### Empty State Testing
```typescript
if (dataCount === 0) {
  await expect(page.locator('[data-testid="empty-state"]')).toBeVisible();
  await expect(page.locator('[data-testid="add-button"]')).toBeVisible();
} else {
  await expect(page.locator('.data-item').first()).toBeVisible();
}
```

### Search Testing
```typescript
if (dataCount > 0) {
  await page.fill('[data-testid="search"]', 'a');
  const searchResults = await page.locator('.search-result').count();
  TestDataManager.expectFlexibleCount(searchResults, 'search results');
} else {
  console.log('⚠️ No data available for search testing');
}
```

### Pagination Testing
```typescript
if (dataCount > 10) {
  await expect(page.locator('[data-testid="pagination"]')).toBeVisible();
} else {
  console.log('ℹ️ Not enough data for pagination testing');
}
```

This approach ensures your tests are robust, maintainable, and work reliably across different environments and data states.