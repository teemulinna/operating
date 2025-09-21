# E2E Test Suite

Professional end-to-end testing infrastructure using Playwright with Page Object Model pattern.

## Directory Structure

```
e2e/
├── specs/           # Test specification files
├── pages/           # Page Object Model classes
├── fixtures/        # Test data and fixtures
├── helpers/         # Test utilities and helper functions
└── README.md        # This file
```

## Page Object Model

All pages extend the `BasePage` class which provides common functionality:

- **BasePage**: Base class with common page interactions
- **EmployeesPage**: Employee management page interactions
- **ReportsPage**: Reports and analytics page interactions

## Test Data

Centralized test data is maintained in `fixtures/testData.ts`:

- Employee test data
- Project test data
- API endpoints
- UI selectors
- Test timeouts

## Helper Functions

Common test utilities in `helpers/testHelpers.ts`:

- API interaction helpers
- Test data cleanup
- Screenshot utilities
- Network waiting functions

## Running Tests

From project root:

```bash
# Run all E2E tests
npx playwright test

# Run specific test file
npx playwright test e2e/specs/selector-diagnostic.spec.ts

# Run with UI mode
npx playwright test --ui

# Generate report
npx playwright show-report
```

From frontend directory:

```bash
# Run using frontend config (points to same e2e structure)
npm run test:e2e
```

## Configuration

Main configuration files:

- `/playwright.config.ts` - Project root configuration
- `/frontend/playwright.config.ts` - Frontend specific configuration (points to same e2e structure)

Both configurations point to the same `/e2e` directory for consistency.

## Best Practices

1. **Page Objects**: Use page objects for all UI interactions
2. **Test Data**: Use fixtures for consistent test data
3. **Helpers**: Use helper functions for common operations
4. **Assertions**: Use Playwright's built-in assertions
5. **Screenshots**: Take screenshots on failure for debugging
6. **Cleanup**: Clean up test data after tests

## Adding New Tests

1. Create new test files in `specs/` directory
2. Use existing page objects or create new ones in `pages/`
3. Add test data to `fixtures/testData.ts`
4. Use helpers for common operations
5. Follow naming convention: `feature-name.spec.ts`

## Troubleshooting

- Check that both frontend (3002) and backend (3001) servers are running
- Use `--headed` flag to run tests in headed mode for debugging
- Check `test-results/` directory for screenshots and videos
- Use `page.pause()` in tests for interactive debugging