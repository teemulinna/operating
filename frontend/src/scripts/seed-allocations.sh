#!/bin/bash

# Script to update allocations with real hours for heat map demonstration

API_URL="http://localhost:3001/api"

echo "Updating allocations with real hours..."

# Get first allocation and update it
ALLOCATION_ID=$(curl -s "$API_URL/allocations" | python3 -c "import json, sys; data = json.load(sys.stdin); print(data['data'][0]['id'] if data['data'] else '')" 2>/dev/null)

if [ ! -z "$ALLOCATION_ID" ]; then
  echo "Updating allocation $ALLOCATION_ID with 6 hours..."

  # Update with realistic hours
  curl -X PUT "$API_URL/allocations/$ALLOCATION_ID" \
    -H "Content-Type: application/json" \
    -d '{
      "allocatedHours": 6,
      "status": "active"
    }' 2>/dev/null

  echo "Updated allocation with 6 hours"
fi

# Create new allocations with various hours
echo "Creating new allocations with varied hours..."

# Get employee and project IDs
EMPLOYEES=$(curl -s "$API_URL/employees" | python3 -c "import json, sys; data = json.load(sys.stdin); [print(e['id']) for e in data['data'][:5]]" 2>/dev/null)
PROJECTS=$(curl -s "$API_URL/projects" | python3 -c "import json, sys; data = json.load(sys.stdin); [print(p['id']) for p in data['data'][:3]]" 2>/dev/null)

# Create sample allocations
curl -X POST "$API_URL/allocations" \
  -H "Content-Type: application/json" \
  -d '{
    "employeeId": "'$(echo "$EMPLOYEES" | head -1)'",
    "projectId": "'$(echo "$PROJECTS" | head -1)'",
    "startDate": "2025-09-25",
    "endDate": "2025-10-25",
    "allocatedHours": 8,
    "role": "Developer",
    "status": "active"
  }' 2>/dev/null

echo "Created allocation with 8 hours (100% utilization)"

curl -X POST "$API_URL/allocations" \
  -H "Content-Type: application/json" \
  -d '{
    "employeeId": "'$(echo "$EMPLOYEES" | head -2 | tail -1)'",
    "projectId": "'$(echo "$PROJECTS" | head -1)'",
    "startDate": "2025-09-26",
    "endDate": "2025-10-15",
    "allocatedHours": 4,
    "role": "Designer",
    "status": "active"
  }' 2>/dev/null

echo "Created allocation with 4 hours (50% utilization)"

curl -X POST "$API_URL/allocations" \
  -H "Content-Type: application/json" \
  -d '{
    "employeeId": "'$(echo "$EMPLOYEES" | head -3 | tail -1)'",
    "projectId": "'$(echo "$PROJECTS" | head -2 | tail -1)'",
    "startDate": "2025-09-27",
    "endDate": "2025-10-20",
    "allocatedHours": 7,
    "role": "Lead",
    "status": "active"
  }' 2>/dev/null

echo "Created allocation with 7 hours (87.5% utilization)"

echo "Allocations updated! Refresh the heat map to see the changes."