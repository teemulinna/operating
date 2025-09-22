#!/bin/bash

# Get all employee IDs
employees=$(curl -s "http://localhost:3001/api/employees" | jq -r '.data[].id')

# Update each employee to have 40 hours per week
for id in $employees; do
  echo "Updating employee $id"
  curl -X PATCH "http://localhost:3001/api/employees/$id" \
    -H "Content-Type: application/json" \
    -d '{"defaultHoursPerWeek": 40}' \
    -s -o /dev/null -w "%{http_code}\n"
done

echo "All employees updated with 40 hours per week"

# Verify the update
echo "Verifying updates:"
curl -s "http://localhost:3001/api/employees" | jq '.data[] | {firstName, lastName, defaultHoursPerWeek}'