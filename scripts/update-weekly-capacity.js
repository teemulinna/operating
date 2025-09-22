#!/usr/bin/env node

/**
 * Script to update all defaultHours/defaultHoursPerWeek references to weeklyCapacity
 * This ensures 100% consistency across the entire codebase
 */

const fs = require('fs');
const path = require('path');

// Files to update - comprehensive list from our search
const filesToUpdate = [
  // Frontend components
  'frontend/src/components/allocation/OverAllocationWarning.tsx',
  'frontend/src/components/employees/EmployeeCapacityCard.tsx',
  'frontend/src/components/employees/EmployeeForm.tsx',
  'frontend/src/components/employees/EmployeeFormModal.tsx',
  'frontend/src/components/employees/EmployeePageRefactored.tsx',
  'frontend/src/components/planning/PlanningDemo.tsx',
  'frontend/src/components/planning/ResourceTimeline.tsx',
  'frontend/src/components/ui/OverAllocationWarning.tsx',
  'frontend/src/features/allocations/hooks/useOverAllocationCheck.ts',
  'frontend/src/features/employees/components/EmployeeDeleteDialog.tsx',
  'frontend/src/features/employees/components/EmployeeForm.tsx',
  'frontend/src/hooks/useRealTimeOverAllocation.ts',
  'frontend/src/services/over-allocation-calculation.service.ts',

  // Backend files
  'src/middleware/validate.middleware.ts',
  'src/services/over-allocation-warning.service.ts',
  'src/services/resource-analytics.service.ts',
  'src/services/team-analytics.service.ts',
  'src/types/index.ts',
  'src/types/over-allocation-warning.types.ts',

  // Test files
  'frontend/src/components/allocation/__tests__/OverAllocationWarning.test.tsx',
  'frontend/src/components/planning/__tests__/DragDropCalendar.test.tsx',
  'frontend/src/components/planning/__tests__/ResourceTimeline.test.tsx',
  'frontend/src/hooks/__tests__/useOverAllocationWarnings.test.ts',
];

const replacements = [
  // Simple field replacements
  { from: /defaultHoursPerWeek/g, to: 'weeklyCapacity' },
  { from: /defaultHours/g, to: 'weeklyCapacity' },
  { from: /default_hours_per_week/g, to: 'weekly_capacity' },
  { from: /default_hours/g, to: 'weekly_capacity' },

  // Special cases for forms
  { from: /name="defaultHours"/g, to: 'name="weeklyCapacity"' },
  { from: /id="defaultHours"/g, to: 'id="weeklyCapacity"' },
  { from: /data-testid="employee-defaultHours"/g, to: 'data-testid="employee-weekly-capacity"' },

  // Label updates
  { from: /Default Hours per Week/g, to: 'Weekly Capacity' },
  { from: /Default hours per week/g, to: 'Weekly capacity' },
];

let totalUpdates = 0;
let filesUpdated = 0;

filesToUpdate.forEach(filePath => {
  const fullPath = path.join(process.cwd(), filePath);

  if (!fs.existsSync(fullPath)) {
    console.log(`⚠️  File not found: ${filePath}`);
    return;
  }

  let content = fs.readFileSync(fullPath, 'utf8');
  let originalContent = content;
  let fileUpdates = 0;

  replacements.forEach(({ from, to }) => {
    const matches = content.match(from);
    if (matches) {
      content = content.replace(from, to);
      fileUpdates += matches.length;
    }
  });

  if (content !== originalContent) {
    fs.writeFileSync(fullPath, content, 'utf8');
    console.log(`✅ Updated ${filePath} (${fileUpdates} changes)`);
    filesUpdated++;
    totalUpdates += fileUpdates;
  } else {
    console.log(`⏭️  No changes needed: ${filePath}`);
  }
});

console.log('\n📊 Summary:');
console.log(`Files updated: ${filesUpdated}`);
console.log(`Total replacements: ${totalUpdates}`);
console.log('\n✨ Weekly capacity migration complete!');