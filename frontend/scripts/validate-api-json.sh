#!/bin/bash

# API JSON Validation Script - Real Data Testing
# Tests all API endpoints to ensure they return proper JSON responses
# Usage: ./scripts/validate-api-json.sh

set -e

API_BASE_URL="http://localhost:3001"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
RESULTS_FILE="${SCRIPT_DIR}/../test-results/api-validation-results.json"
LOG_FILE="${SCRIPT_DIR}/../logs/api-validation.log"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Ensure directories exist
mkdir -p "$(dirname "$RESULTS_FILE")"
mkdir -p "$(dirname "$LOG_FILE")"

# Initialize results
echo "{
  \"testRun\": {
    \"timestamp\": \"$(date -u +"%Y-%m-%dT%H:%M:%S.%3NZ")\",
    \"baseUrl\": \"$API_BASE_URL\",
    \"totalTests\": 0,
    \"passed\": 0,
    \"failed\": 0,
    \"results\": []
  }
}" > "$RESULTS_FILE"

# Logging function
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" >> "$LOG_FILE"
    echo -e "$1"
}

# Test result tracking
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# Function to test endpoint
test_endpoint() {
    local method="$1"
    local endpoint="$2"
    local expected_status="$3"
    local description="$4"
    local data="$5"
    
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    
    log "${BLUE}Testing: $description${NC}"
    log "  ${method} ${endpoint}"
    
    # Prepare curl command
    local curl_cmd="curl -s -w '%{http_code}|%{content_type}|%{time_total}' -X $method"
    
    if [ "$method" = "POST" ] && [ -n "$data" ]; then
        curl_cmd="$curl_cmd -H 'Content-Type: application/json' -d '$data'"
    fi
    
    curl_cmd="$curl_cmd '$API_BASE_URL$endpoint'"
    
    # Execute request
    local response
    response=$(eval "$curl_cmd" 2>/dev/null || echo "ERROR|ERROR|0")
    
    # Parse response
    local http_code=$(echo "$response" | tail -c 20 | cut -d'|' -f1)
    local content_type=$(echo "$response" | tail -c 100 | cut -d'|' -f2)
    local response_time=$(echo "$response" | tail -c 100 | cut -d'|' -f3)
    local body=$(echo "$response" | head -c -100)
    
    # Validate response
    local test_passed=true
    local errors=[]
    
    # Check HTTP status code
    if [ "$http_code" != "$expected_status" ]; then
        test_passed=false
        errors+=("Expected status $expected_status, got $http_code")
    fi
    
    # Check Content-Type
    if [[ "$content_type" != *"application/json"* ]]; then
        test_passed=false
        errors+=("Expected application/json content-type, got: $content_type")
    fi
    
    # Validate JSON structure
    if ! echo "$body" | jq . >/dev/null 2>&1; then
        test_passed=false
        errors+=("Response is not valid JSON")
    fi
    
    # Check for required JSON fields
    if echo "$body" | jq . >/dev/null 2>&1; then
        if [ "$http_code" -ge 200 ] && [ "$http_code" -lt 300 ]; then
            # Success response should have success field
            if ! echo "$body" | jq -e '.success' >/dev/null 2>&1 && ! echo "$body" | jq -e '.status' >/dev/null 2>&1; then
                test_passed=false
                errors+=("Success response missing 'success' or 'status' field")
            fi
            
            if ! echo "$body" | jq -e '.data' >/dev/null 2>&1 && ! echo "$body" | jq -e '.status' >/dev/null 2>&1; then
                test_passed=false
                errors+=("Success response missing 'data' field")
            fi
        else
            # Error response should have error field
            if ! echo "$body" | jq -e '.error' >/dev/null 2>&1 && ! echo "$body" | jq -e '.message' >/dev/null 2>&1; then
                test_passed=false
                errors+=("Error response missing 'error' or 'message' field")
            fi
        fi
    fi
    
    # Update counters
    if [ "$test_passed" = true ]; then
        PASSED_TESTS=$((PASSED_TESTS + 1))
        log "  ${GREEN}✓ PASSED${NC} (${response_time}s)"
    else
        FAILED_TESTS=$((FAILED_TESTS + 1))
        log "  ${RED}✗ FAILED${NC}"
        for error in "${errors[@]}"; do
            log "    ${RED}Error: $error${NC}"
        done
    fi
    
    # Add result to JSON file
    local result_json=$(cat <<EOF
{
  "test": "$description",
  "method": "$method",
  "endpoint": "$endpoint",
  "expectedStatus": $expected_status,
  "actualStatus": $http_code,
  "contentType": "$content_type",
  "responseTime": $response_time,
  "passed": $test_passed,
  "errors": $(printf '%s\n' "${errors[@]}" | jq -R . | jq -s .),
  "responseBody": $(echo "$body" | jq -c . 2>/dev/null || echo "null")
}
EOF
    )
    
    # Update results file
    jq ".testRun.results += [$result_json]" "$RESULTS_FILE" > "${RESULTS_FILE}.tmp" && mv "${RESULTS_FILE}.tmp" "$RESULTS_FILE"
    
    log ""
}

# Main test execution
main() {
    log "${YELLOW}Starting API JSON Validation Tests${NC}"
    log "Base URL: $API_BASE_URL"
    log "Results will be saved to: $RESULTS_FILE"
    log ""
    
    # Check if server is running
    if ! curl -s "$API_BASE_URL/health" >/dev/null 2>&1; then
        log "${RED}ERROR: API server is not running at $API_BASE_URL${NC}"
        exit 1
    fi
    
    log "${GREEN}✓ API server is running${NC}"
    log ""
    
    # Test endpoints
    log "${YELLOW}=== Testing Core Endpoints ===${NC}"
    test_endpoint "GET" "/health" "200" "Health Check"
    test_endpoint "GET" "/api/employees" "200" "Get All Employees"
    test_endpoint "GET" "/api/employees?page=1&limit=5" "200" "Get Employees with Pagination"
    test_endpoint "GET" "/api/projects" "200" "Get All Projects"  
    test_endpoint "GET" "/api/departments" "200" "Get All Departments"
    
    log "${YELLOW}=== Testing Error Endpoints ===${NC}"
    test_endpoint "GET" "/api/nonexistent" "404" "Non-existent Endpoint"
    test_endpoint "GET" "/api/employees/invalid-id" "404" "Invalid Employee ID"
    test_endpoint "POST" "/api/employees" "400" "Invalid Employee Data" '{"firstName":"","email":"invalid"}'
    test_endpoint "POST" "/api/projects" "400" "Invalid Project Data" '{"name":"","status":"invalid"}'
    
    # Get a real employee ID for testing
    local employee_id
    employee_id=$(curl -s "$API_BASE_URL/api/employees?limit=1" | jq -r '.data[0].id // empty' 2>/dev/null)
    if [ -n "$employee_id" ] && [ "$employee_id" != "null" ] && [ "$employee_id" != "" ]; then
        test_endpoint "GET" "/api/employees/$employee_id" "200" "Get Specific Employee"
    fi
    
    # Get a real project ID for testing  
    local project_id
    project_id=$(curl -s "$API_BASE_URL/api/projects?limit=1" | jq -r '.data[0].id // empty' 2>/dev/null)
    if [ -n "$project_id" ] && [ "$project_id" != "null" ] && [ "$project_id" != "" ]; then
        test_endpoint "GET" "/api/projects/$project_id" "200" "Get Specific Project"
    fi
    
    # Update final results
    jq ".testRun.totalTests = $TOTAL_TESTS | .testRun.passed = $PASSED_TESTS | .testRun.failed = $FAILED_TESTS" "$RESULTS_FILE" > "${RESULTS_FILE}.tmp" && mv "${RESULTS_FILE}.tmp" "$RESULTS_FILE"
    
    # Summary
    log "${YELLOW}=== Test Summary ===${NC}"
    log "Total Tests: $TOTAL_TESTS"
    log "Passed: ${GREEN}$PASSED_TESTS${NC}"
    log "Failed: ${RED}$FAILED_TESTS${NC}"
    log ""
    
    if [ $FAILED_TESTS -eq 0 ]; then
        log "${GREEN}🎉 All tests passed! API endpoints return proper JSON responses.${NC}"
        exit 0
    else
        log "${RED}❌ $FAILED_TESTS tests failed. Check the results for details.${NC}"
        log "Results: $RESULTS_FILE"
        log "Logs: $LOG_FILE"
        exit 1
    fi
}

# Cleanup function
cleanup() {
    log "${YELLOW}Cleaning up...${NC}"
    # Kill any background processes if needed
}

trap cleanup EXIT

# Run main function
main "$@"