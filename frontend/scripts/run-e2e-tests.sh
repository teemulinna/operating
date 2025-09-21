#!/bin/bash

# E2E Test Runner Script
# This script sets up and runs the comprehensive E2E test suite

set -e

echo "🚀 Starting E2E Test Suite"
echo "=========================="

# Check if backend is running
BACKEND_URL="http://localhost:3001"
FRONTEND_URL="http://localhost:3002"

echo "🔍 Checking if backend is running..."
if curl -f -s "$BACKEND_URL/health" > /dev/null 2>&1; then
    echo "✅ Backend is running on $BACKEND_URL"
else
    echo "❌ Backend is not running on $BACKEND_URL"
    echo "Please start the backend server first:"
    echo "  cd ../backend && npm run dev"
    exit 1
fi

echo "🔍 Checking if frontend is running..."
if curl -f -s "$FRONTEND_URL" > /dev/null 2>&1; then
    echo "✅ Frontend is running on $FRONTEND_URL"
else
    echo "❌ Frontend is not running on $FRONTEND_URL"
    echo "Please start the frontend server first:"
    echo "  npm run dev"
    exit 1
fi

# Run tests based on argument
case "${1:-all}" in
    "employee")
        echo "🧪 Running Employee CRUD tests..."
        npx playwright test tests/e2e/employee-crud.spec.ts
        ;;
    "project")
        echo "🧪 Running Project Management tests..."
        npx playwright test tests/e2e/project-management.spec.ts
        ;;
    "allocation")
        echo "🧪 Running Resource Allocation tests..."
        npx playwright test tests/e2e/resource-allocation.spec.ts
        ;;
    "csv")
        echo "🧪 Running CSV Export tests..."
        npx playwright test tests/e2e/csv-export.spec.ts
        ;;
    "navigation")
        echo "🧪 Running Navigation and Routing tests..."
        npx playwright test tests/e2e/navigation-routing.spec.ts
        ;;
    "error")
        echo "🧪 Running Error Handling and Loading States tests..."
        npx playwright test tests/e2e/error-handling-loading.spec.ts
        ;;
    "smoke")
        echo "🧪 Running Smoke tests (critical path)..."
        npx playwright test tests/e2e/employee-crud.spec.ts tests/e2e/navigation-routing.spec.ts
        ;;
    "all")
        echo "🧪 Running ALL E2E tests..."
        npx playwright test tests/e2e/
        ;;
    *)
        echo "❓ Unknown test suite: $1"
        echo "Available options: employee, project, allocation, csv, navigation, error, smoke, all"
        exit 1
        ;;
esac

echo ""
echo "📊 Test Results:"
echo "==============="
echo "Check the test report at: playwright-report/index.html"
echo "To open the report: npx playwright show-report"
echo ""
echo "✅ E2E Test Suite Completed"