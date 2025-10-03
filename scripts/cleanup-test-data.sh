#!/bin/bash

# Script to clean up duplicate test data from the database

API_URL="http://localhost:3001/api"

echo "Cleaning up duplicate test data..."

# Get all employees and filter for test users
EMPLOYEES=$(curl -s "$API_URL/employees" 2>/dev/null)

# Extract test user IDs
TEST_USER_IDS=$(echo "$EMPLOYEES" | jq -r '.data[] | select(.name | contains("API Test") or contains("Test Capacity") or contains("Test Employee")) | .id' 2>/dev/null)

# Count test users
TEST_USER_COUNT=$(echo "$TEST_USER_IDS" | wc -l | tr -d ' ')

echo "Found $TEST_USER_COUNT test users to clean up"

# Delete each test user
for USER_ID in $TEST_USER_IDS; do
  if [ ! -z "$USER_ID" ]; then
    echo "Deleting test user: $USER_ID"
    curl -X DELETE "$API_URL/employees/$USER_ID" \
      -H "Content-Type: application/json" \
      -s -o /dev/null -w "%{http_code}\n"
  fi
done

# Clean up test projects if any
TEST_PROJECT_IDS=$(curl -s "$API_URL/projects" | jq -r '.data[] | select(.name | contains("Test Project") or contains("API Test")) | .id' 2>/dev/null)

for PROJECT_ID in $TEST_PROJECT_IDS; do
  if [ ! -z "$PROJECT_ID" ]; then
    echo "Deleting test project: $PROJECT_ID"
    curl -X DELETE "$API_URL/projects/$PROJECT_ID" \
      -H "Content-Type: application/json" \
      -s -o /dev/null -w "%{http_code}\n"
  fi
done

echo "Test data cleanup complete!"

# Verify cleanup
echo ""
echo "Verification:"
REMAINING_TEST_USERS=$(curl -s "$API_URL/employees" | jq -r '.data[] | select(.name | contains("API Test") or contains("Test Capacity")) | .name' 2>/dev/null | wc -l | tr -d ' ')
echo "Remaining test users: $REMAINING_TEST_USERS"

TOTAL_EMPLOYEES=$(curl -s "$API_URL/employees" | jq '.data | length' 2>/dev/null)
echo "Total employees now: $TOTAL_EMPLOYEES"