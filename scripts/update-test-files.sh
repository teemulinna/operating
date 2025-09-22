#!/bin/bash

# Update test files to use weeklyCapacity instead of defaultHours/defaultHoursPerWeek

FILES=(
  "frontend/tests/components/schedule/WeeklyScheduleGrid.test.tsx"
  "frontend/tests/e2e/employee-crud-improved.spec.ts"
  "frontend/tests/e2e/employee-crud-tdd.spec.ts"
  "frontend/tests/e2e/error-handling-loading.spec.ts"
)

for file in "${FILES[@]}"; do
  if [ -f "$file" ]; then
    echo "Updating $file..."

    # Replace defaultHoursPerWeek with weeklyCapacity
    sed -i.bak 's/defaultHoursPerWeek/weeklyCapacity/g' "$file"

    # Replace defaultHours with weeklyCapacity (but not if it was already defaultHoursPerWeek)
    sed -i.bak 's/defaultHours/weeklyCapacity/g' "$file"

    # Remove backup files
    rm "${file}.bak"

    echo "✅ Updated $file"
  else
    echo "⚠️ File not found: $file"
  fi
done

echo ""
echo "All test files updated!"