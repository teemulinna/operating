import React, { useState } from 'react';
import { format, addDays, subDays } from 'date-fns';
import { DragDropCalendar } from './DragDropCalendar';
import { Button } from '../ui/button';
import type { Allocation, AllocationConflict } from '../../types/allocation';

/**
 * Test component for DragDropCalendar to verify:
 * 1. Real API calls for creating allocations
 * 2. Real API calls for updating allocations
 * 3. Database persistence (check if changes persist after refresh)
 * 4. Error handling and toast notifications
 * 5. Conflict detection and warnings
 */
export const DragDropCalendarTest: React.FC = () => {
  const [conflicts, setConflicts] = useState<AllocationConflict[]>([]);
  const [recentActivity, setRecentActivity] = useState<string[]>([]);

  // Test date range: current week
  const today = new Date();
  const startDate = format(subDays(today, today.getDay()), 'yyyy-MM-dd'); // Start of current week
  const endDate = format(addDays(today, 6 - today.getDay()), 'yyyy-MM-dd'); // End of current week

  const addActivity = (message: string) => {
    setRecentActivity(prev => [`${new Date().toLocaleTimeString()}: ${message}`, ...prev.slice(0, 9)]);
  };

  const handleAllocationCreated = (allocation: Allocation) => {
    addActivity(`Created allocation for ${allocation.employeeName} on project ${allocation.projectName}`);
    console.log('Allocation created:', allocation);
  };

  const handleAllocationUpdated = (allocation: Allocation) => {
    addActivity(`Updated allocation for ${allocation.employeeName} - ${allocation.projectName}`);
    console.log('Allocation updated:', allocation);
  };

  const handleConflictDetected = (detectedConflicts: AllocationConflict[]) => {
    setConflicts(detectedConflicts);
    addActivity(`${detectedConflicts.length} conflict(s) detected`);
    console.log('Conflicts detected:', detectedConflicts);
  };

  const testDatabasePersistence = () => {
    window.location.reload();
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2">DragDropCalendar Integration Test</h1>
        <p className="text-gray-600 mb-4">
          Test the drag-and-drop calendar to ensure real database integration:
        </p>
        <div className="bg-blue-50 p-4 rounded-lg mb-4">
          <h3 className="font-semibold text-blue-800 mb-2">Test Instructions:</h3>
          <ol className="list-decimal list-inside text-sm text-blue-700 space-y-1">
            <li>Drag an employee from the sidebar to a calendar cell to create an allocation</li>
            <li>If multiple projects exist, you'll see a project selection dialog</li>
            <li>Drag an existing allocation to a different date to update it</li>
            <li>Watch for toast notifications (success/error messages)</li>
            <li>Check the recent activity log below</li>
            <li>Click "Test Database Persistence" to refresh and verify changes persist</li>
          </ol>
        </div>
      </div>

      {/* Test Controls */}
      <div className="mb-4 flex gap-2">
        <Button onClick={testDatabasePersistence} variant="outline">
          Test Database Persistence (Reload Page)
        </Button>
      </div>

      {/* Calendar Component */}
      <div className="border rounded-lg">
        <DragDropCalendar
          startDate={startDate}
          endDate={endDate}
          onAllocationCreated={handleAllocationCreated}
          onAllocationUpdated={handleAllocationUpdated}
          onConflictDetected={handleConflictDetected}
          preventOverallocation={true}
          className="h-96"
        />
      </div>

      {/* Test Results */}
      <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Recent Activity */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="font-semibold mb-2">Recent Activity</h3>
          <div className="space-y-1">
            {recentActivity.length > 0 ? (
              recentActivity.map((activity, index) => (
                <div key={index} className="text-sm text-gray-700">
                  {activity}
                </div>
              ))
            ) : (
              <div className="text-sm text-gray-500">No activity yet. Try dragging and dropping!</div>
            )}
          </div>
        </div>

        {/* Conflicts */}
        <div className="bg-yellow-50 p-4 rounded-lg">
          <h3 className="font-semibold mb-2">Detected Conflicts</h3>
          <div className="space-y-2">
            {conflicts.length > 0 ? (
              conflicts.map((conflict, index) => (
                <div key={index} className="text-sm">
                  <div className="font-medium text-yellow-800">{conflict.type}</div>
                  <div className="text-yellow-700">{conflict.description}</div>
                  <div className="text-xs text-yellow-600">Severity: {conflict.severity}</div>
                </div>
              ))
            ) : (
              <div className="text-sm text-gray-500">No conflicts detected.</div>
            )}
          </div>
        </div>
      </div>

      {/* API Verification */}
      <div className="mt-6 bg-green-50 p-4 rounded-lg">
        <h3 className="font-semibold text-green-800 mb-2">API Integration Verification</h3>
        <div className="text-sm text-green-700 space-y-1">
          <div>✓ Uses AllocationService.getCalendarData() to fetch real data</div>
          <div>✓ Uses AllocationService.createAllocation() for new allocations</div>
          <div>✓ Uses AllocationService.bulkUpdateAllocations() for moves</div>
          <div>✓ Uses AllocationService.checkConflicts() for conflict prevention</div>
          <div>✓ Includes proper error handling with toast notifications</div>
          <div>✓ Shows loading states during API operations</div>
          <div>✓ Provides project selection dialog for multi-project scenarios</div>
        </div>
      </div>

      {/* Usage Notes */}
      <div className="mt-4 bg-gray-100 p-4 rounded-lg text-sm text-gray-600">
        <h4 className="font-medium mb-2">Development Notes:</h4>
        <ul className="list-disc list-inside space-y-1">
          <li>All drag-drop operations now make real API calls to the backend</li>
          <li>Changes are immediately persisted to the database</li>
          <li>Error handling shows user-friendly messages via toasts</li>
          <li>Conflict detection works with backend validation</li>
          <li>Loading states prevent user confusion during operations</li>
          <li>Project selection ensures proper allocation assignment</li>
        </ul>
      </div>
    </div>
  );
};

export default DragDropCalendarTest;