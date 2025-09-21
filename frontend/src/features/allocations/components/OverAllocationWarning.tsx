import React from 'react';
import { OverAllocationWarningProps } from '../types';

/**
 * OverAllocationWarning component - displays warnings for over-allocated employees
 * Shows conflicts and suggests resolutions
 */
export function OverAllocationWarning({ 
  employeeId, 
  conflictingAllocations, 
  totalHours, 
  maxHours = 40 
}: OverAllocationWarningProps) {
  if (conflictingAllocations.length === 0 || totalHours <= maxHours) {
    return null;
  }

  const overageHours = totalHours - maxHours;

  return (
    <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-4" data-testid="over-allocation-warning">
      <div className="flex">
        <div className="flex-shrink-0">
          <svg
            className="h-5 w-5 text-red-400"
            viewBox="0 0 20 20"
            fill="currentColor"
            aria-hidden="true"
          >
            <path
              fillRule="evenodd"
              d="M8.485 3.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 3.495zM10 6a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 6zm0 9a1 1 0 100-2 1 1 0 000 2z"
              clipRule="evenodd"
            />
          </svg>
        </div>
        <div className="ml-3">
          <h3 className="text-sm font-medium text-red-800">
            Over-allocation Detected
          </h3>
          <div className="mt-2 text-sm text-red-700">
            <p className="mb-2">
              This employee would be allocated <strong>{totalHours} hours/week</strong> 
              ({overageHours} hours over the {maxHours}h/week limit).
            </p>
            
            {conflictingAllocations.length > 0 && (
              <div>
                <p className="font-medium mb-1">Conflicting allocations:</p>
                <ul className="list-disc list-inside space-y-1">
                  {conflictingAllocations.map((allocation) => (
                    <li key={allocation.id} className="text-xs">
                      {allocation.allocatedHours}h/week from{' '}
                      {new Date(allocation.startDate).toLocaleDateString()} to{' '}
                      {new Date(allocation.endDate).toLocaleDateString()}
                      {allocation.roleOnProject && ` (${allocation.roleOnProject})`}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            
            <div className="mt-3 text-xs">
              <p className="font-medium">Suggestions:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>Reduce hours on this or existing allocations</li>
                <li>Adjust the date range to avoid overlap</li>
                <li>Consider reassigning some responsibilities to other team members</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}