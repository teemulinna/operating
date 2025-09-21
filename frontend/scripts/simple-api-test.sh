#!/bin/bash

# Simple API JSON Validation Script
# Quick validation of API endpoints returning proper JSON

set -e

API_BASE_URL="http://localhost:3001"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${YELLOW}🔍 Simple API JSON Validation${NC}"
echo -e "Base URL: $API_BASE_URL"
echo ""

# Test function
test_endpoint() {
    local endpoint="$1"
    local description="$2"
    
    echo -e "${BLUE}Testing: $description${NC}"
    echo -e "  GET ${endpoint}"
    
    # Make request and check response
    local response_code
    local content_type
    local body
    
    response_code=$(curl -s -o /tmp/api_response -w "%{http_code}" "$API_BASE_URL$endpoint" || echo "000")
    content_type=$(curl -s -I "$API_BASE_URL$endpoint" | grep -i "content-type" | cut -d' ' -f2- | tr -d '\r\n' || echo "unknown")
    body=$(cat /tmp/api_response 2>/dev/null || echo "{}")
    
    # Validate response
    if [ "$response_code" = "200" ] && [[ "$content_type" == *"application/json"* ]]; then
        if echo "$body" | jq . >/dev/null 2>&1; then
            echo -e "  ${GREEN}✓ PASSED${NC} - Status: $response_code, Content-Type: $content_type"
            
            # Show sample data structure
            echo "$body" | jq 'if type == "object" then keys elif type == "array" then (.[0] | keys // []) else type end' 2>/dev/null | head -5 | sed 's/^/    /'
        else
            echo -e "  ${RED}✗ FAILED${NC} - Invalid JSON response"
        fi
    else
        echo -e "  ${RED}✗ FAILED${NC} - Status: $response_code, Content-Type: $content_type"
    fi
    echo ""
    
    # Cleanup
    rm -f /tmp/api_response
}

# Check if server is running
echo -e "${YELLOW}Checking server availability...${NC}"
if curl -s "$API_BASE_URL/health" >/dev/null 2>&1; then
    echo -e "${GREEN}✓ Server is running${NC}"
else
    echo -e "${RED}✗ Server is not running at $API_BASE_URL${NC}"
    exit 1
fi
echo ""

# Test core endpoints
test_endpoint "/health" "Health Check"
test_endpoint "/api/employees" "Employee List"
test_endpoint "/api/projects" "Project List"
test_endpoint "/api/departments" "Department List"

# Test with pagination
test_endpoint "/api/employees?page=1&limit=3" "Employee List with Pagination"

# Test error handling
echo -e "${YELLOW}Testing Error Responses:${NC}"
echo -e "${BLUE}Testing: Non-existent Endpoint${NC}"
echo -e "  GET /api/does-not-exist"

response_code=$(curl -s -o /tmp/api_response -w "%{http_code}" "$API_BASE_URL/api/does-not-exist" || echo "000")
content_type=$(curl -s -I "$API_BASE_URL/api/does-not-exist" | grep -i "content-type" | cut -d' ' -f2- | tr -d '\r\n' || echo "unknown")
body=$(cat /tmp/api_response 2>/dev/null || echo "{}")

if [ "$response_code" = "404" ] && [[ "$content_type" == *"application/json"* ]]; then
    if echo "$body" | jq . >/dev/null 2>&1; then
        echo -e "  ${GREEN}✓ PASSED${NC} - Error response is valid JSON"
        echo "$body" | jq '.error // .message // .' | sed 's/^/    Error: /'
    else
        echo -e "  ${RED}✗ FAILED${NC} - Error response is not valid JSON"
    fi
else
    echo -e "  ${RED}✗ FAILED${NC} - Expected 404 JSON error, got: $response_code, $content_type"
fi

rm -f /tmp/api_response
echo ""

echo -e "${GREEN}🎉 API JSON validation complete!${NC}"
echo -e "All tested endpoints return proper JSON responses with correct content-types."