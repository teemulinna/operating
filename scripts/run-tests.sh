#!/bin/bash

# Test runner script for comprehensive testing
set -e

echo "🚀 Starting comprehensive test suite..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Check if PostgreSQL is running
check_postgres() {
    echo "Checking PostgreSQL connection..."
    if pg_isready -h localhost -p 5432 >/dev/null 2>&1; then
        print_status "PostgreSQL is running"
    else
        print_error "PostgreSQL is not running. Please start PostgreSQL service."
        exit 1
    fi
}

# Setup test database
setup_test_db() {
    echo "Setting up test database..."
    
    # Create test database if it doesn't exist
    createdb employee_test 2>/dev/null || print_warning "Test database already exists"
    
    # Run migrations
    npm run db:migrate
    
    print_status "Test database setup complete"
}

# Run backend tests
run_backend_tests() {
    echo "Running backend tests..."
    
    # Unit tests (with mocks)
    echo "Running unit tests..."
    npx jest --config=jest.config.js --testPathPattern=tests/unit --coverage --coverageDirectory=coverage/unit
    
    if [ $? -eq 0 ]; then
        print_status "Unit tests passed"
    else
        print_error "Unit tests failed"
        exit 1
    fi
    
    # Integration tests (real database)
    echo "Running integration tests..."
    npx jest --config=jest.config.js --testPathPattern=tests/integration --coverage --coverageDirectory=coverage/integration
    
    if [ $? -eq 0 ]; then
        print_status "Integration tests passed"
    else
        print_error "Integration tests failed"
        exit 1
    fi
}

# Run frontend tests
run_frontend_tests() {
    echo "Running frontend tests..."
    cd frontend
    
    # Component tests
    npm test -- --coverage --reporter=verbose
    
    if [ $? -eq 0 ]; then
        print_status "Frontend tests passed"
    else
        print_error "Frontend tests failed"
        cd ..
        exit 1
    fi
    
    cd ..
}

# Run E2E tests
run_e2e_tests() {
    echo "Running E2E tests..."
    
    # Start backend server in test mode
    export NODE_ENV=test
    npm run dev &
    SERVER_PID=$!
    
    # Wait for server to start
    sleep 5
    
    # Run Playwright tests
    cd frontend
    npx playwright test
    
    if [ $? -eq 0 ]; then
        print_status "E2E tests passed"
    else
        print_error "E2E tests failed"
    fi
    
    # Kill server
    kill $SERVER_PID 2>/dev/null || true
    cd ..
}

# Generate combined coverage report
generate_coverage() {
    echo "Generating coverage reports..."
    
    # Merge coverage reports
    npx nyc merge coverage/unit coverage/combined.json
    npx nyc merge coverage/integration coverage/combined.json
    
    # Generate final report
    npx nyc report --reporter=html --reporter=text --reporter=lcov
    
    print_status "Coverage reports generated"
}

# Lint and type check
run_linting() {
    echo "Running linting and type checks..."
    
    # Backend linting
    npm run lint
    npm run typecheck
    
    # Frontend linting
    cd frontend
    npm run lint
    npm run typecheck
    cd ..
    
    print_status "Linting and type checks passed"
}

# Main execution
main() {
    case "${1:-all}" in
        "unit")
            check_postgres
            setup_test_db
            npx jest --config=jest.config.js --testPathPattern=tests/unit
            ;;
        "integration")
            check_postgres
            setup_test_db
            npx jest --config=jest.config.js --testPathPattern=tests/integration
            ;;
        "frontend")
            run_frontend_tests
            ;;
        "e2e")
            check_postgres
            setup_test_db
            run_e2e_tests
            ;;
        "lint")
            run_linting
            ;;
        "coverage")
            check_postgres
            setup_test_db
            run_backend_tests
            run_frontend_tests
            generate_coverage
            ;;
        "all")
            check_postgres
            setup_test_db
            run_linting
            run_backend_tests
            run_frontend_tests
            run_e2e_tests
            generate_coverage
            print_status "All tests completed successfully!"
            ;;
        "quick")
            # Quick test run for development
            npx jest --config=jest.config.js --testPathPattern=tests/unit --passWithNoTests
            cd frontend && npm test -- --run && cd ..
            print_status "Quick tests completed"
            ;;
        *)
            echo "Usage: $0 {unit|integration|frontend|e2e|lint|coverage|all|quick}"
            echo ""
            echo "Commands:"
            echo "  unit        - Run unit tests only"
            echo "  integration - Run integration tests only"
            echo "  frontend    - Run frontend tests only"
            echo "  e2e         - Run end-to-end tests only"
            echo "  lint        - Run linting and type checks only"
            echo "  coverage    - Run all tests with coverage"
            echo "  all         - Run complete test suite"
            echo "  quick       - Run quick tests for development"
            exit 1
            ;;
    esac
}

# Cleanup function
cleanup() {
    echo "Cleaning up..."
    # Kill any background processes
    jobs -p | xargs -r kill 2>/dev/null || true
}

# Set up cleanup on exit
trap cleanup EXIT

# Run main function
main "$@"