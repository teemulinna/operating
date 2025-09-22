#!/bin/bash

# Create sample allocations for demonstration
echo "Creating sample allocations..."

# Get first few employees
employees=$(curl -s "http://localhost:3001/api/employees" | jq -r '.data[0:3] | .[].id')

# Get first few projects (or create one if none exist)
projects=$(curl -s "http://localhost:3001/api/projects" | jq -r '.data[0:2] | .[].id')

if [ -z "$projects" ]; then
  echo "No projects found, creating sample projects..."

  # Create sample projects
  curl -X POST "http://localhost:3001/api/projects" \
    -H "Content-Type: application/json" \
    -d '{
      "name": "Website Redesign",
      "status": "active",
      "startDate": "2024-01-01",
      "endDate": "2024-06-30",
      "budget": 100000,
      "description": "Complete redesign of company website"
    }' -s

  curl -X POST "http://localhost:3001/api/projects" \
    -H "Content-Type: application/json" \
    -d '{
      "name": "Mobile App Development",
      "status": "active",
      "startDate": "2024-02-01",
      "endDate": "2024-08-31",
      "budget": 150000,
      "description": "Native mobile app for iOS and Android"
    }' -s

  # Get the created projects
  projects=$(curl -s "http://localhost:3001/api/projects" | jq -r '.data[0:2] | .[].id')
fi

# Create allocations
employee_array=($employees)
project_array=($projects)

# Current date and a week later
current_date=$(date +%Y-%m-%d)
end_date=$(date -d "+7 days" +%Y-%m-%d 2>/dev/null || date -v+7d +%Y-%m-%d)

# Create normal allocations (within capacity)
if [ ${#employee_array[@]} -ge 1 ] && [ ${#project_array[@]} -ge 1 ]; then
  echo "Creating allocation for employee ${employee_array[0]} on project ${project_array[0]}"
  result=$(curl -X POST "http://localhost:3001/api/allocations" \
    -H "Content-Type: application/json" \
    -d "{
      \"employeeId\": \"${employee_array[0]}\",
      \"projectId\": \"${project_array[0]}\",
      \"allocatedHours\": 20,
      \"startDate\": \"${current_date}T00:00:00.000Z\",
      \"endDate\": \"${end_date}T00:00:00.000Z\",
      \"roleOnProject\": \"Developer\",
      \"status\": \"active\"
    }" -s)
  echo "$result" | jq '.'
fi

if [ ${#employee_array[@]} -ge 2 ] && [ ${#project_array[@]} -ge 1 ]; then
  echo ""
  echo "Creating allocation for employee ${employee_array[1]} on project ${project_array[0]}"
  result=$(curl -X POST "http://localhost:3001/api/allocations" \
    -H "Content-Type: application/json" \
    -d "{
      \"employeeId\": \"${employee_array[1]}\",
      \"projectId\": \"${project_array[0]}\",
      \"allocatedHours\": 30,
      \"startDate\": \"${current_date}T00:00:00.000Z\",
      \"endDate\": \"${end_date}T00:00:00.000Z\",
      \"roleOnProject\": \"Senior Developer\",
      \"status\": \"active\"
    }" -s)
  echo "$result" | jq '.'
fi

# Create over-allocation (more than 40 hours)
if [ ${#employee_array[@]} -ge 3 ] && [ ${#project_array[@]} -ge 2 ]; then
  echo ""
  echo "Creating over-allocation for employee ${employee_array[2]}"

  # First project - 30 hours
  result=$(curl -X POST "http://localhost:3001/api/allocations" \
    -H "Content-Type: application/json" \
    -d "{
      \"employeeId\": \"${employee_array[2]}\",
      \"projectId\": \"${project_array[0]}\",
      \"allocatedHours\": 30,
      \"startDate\": \"${current_date}T00:00:00.000Z\",
      \"endDate\": \"${end_date}T00:00:00.000Z\",
      \"roleOnProject\": \"Tech Lead\",
      \"status\": \"active\"
    }" -s)
  echo "First allocation: $result" | jq '.'

  # Second project - 20 hours (total 50 hours - over 40h capacity)
  result=$(curl -X POST "http://localhost:3001/api/allocations" \
    -H "Content-Type: application/json" \
    -d "{
      \"employeeId\": \"${employee_array[2]}\",
      \"projectId\": \"${project_array[1]}\",
      \"allocatedHours\": 20,
      \"startDate\": \"${current_date}T00:00:00.000Z\",
      \"endDate\": \"${end_date}T00:00:00.000Z\",
      \"roleOnProject\": \"Architect\",
      \"status\": \"active\"
    }" -s)
  echo "Second allocation: $result" | jq '.'
fi

echo ""
echo "Sample allocations created!"
echo ""
echo "Verifying allocations:"
curl -s "http://localhost:3001/api/allocations" | jq '.data[] | {id, employeeId, projectId, allocatedHours, roleOnProject, status}'