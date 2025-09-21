import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ResourceAllocationForm, QuickAssignModal, useQuickAssignShortcut } from './index';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';

// Demo component showing how to use the allocation components
const AllocationDemo: React.FC = () => {
  const [isQuickAssignOpen, setIsQuickAssignOpen] = React.useState(false);
  const [allocations, setAllocations] = React.useState<any[]>([]);

  // Set up global keyboard shortcut for quick assign (Ctrl+A)
  useQuickAssignShortcut(() => setIsQuickAssignOpen(true));

  const handleAllocationCreated = (allocation: any) => {
    console.log('Allocation created:', allocation);
    setAllocations(prev => [...prev, allocation]);
  };

  const handleQuickAssign = (allocation: any) => {
    console.log('Quick assignment completed:', allocation);
    setAllocations(prev => [...prev, allocation]);
  };

  return (
    <div className=\"p-6 max-w-4xl mx-auto space-y-6\">
      <h1 className=\"text-3xl font-bold mb-6\">Resource Allocation Demo</h1>
      
      {/* Quick Actions */}\n      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className=\"flex gap-4\">
            <Button 
              onClick={() => setIsQuickAssignOpen(true)}
              className=\"bg-yellow-500 hover:bg-yellow-600\"
            >
              Quick Assign (Ctrl+A)
            </Button>
            <p className=\"text-sm text-gray-600 flex items-center\">
              Use the Quick Assign modal for rapid resource assignments
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Full Resource Allocation Form */}
      <Card>
        <CardHeader>
          <CardTitle>Full Resource Allocation Form</CardTitle>
        </CardHeader>
        <CardContent>
          <ResourceAllocationForm 
            onSubmit={handleAllocationCreated}
          />
        </CardContent>
      </Card>

      {/* Recent Allocations */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Allocations ({allocations.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {allocations.length === 0 ? (
            <p className=\"text-gray-500\">No allocations created yet. Try creating one above!</p>
          ) : (
            <div className=\"space-y-2\">
              {allocations.map((allocation, index) => (
                <div 
                  key={index}
                  className=\"p-3 bg-gray-50 rounded border flex justify-between items-center\"
                >
                  <div>
                    <span className=\"font-medium\">Employee ID: {allocation.employeeId}</span>
                    {' → '}
                    <span className=\"font-medium\">Project ID: {allocation.projectId}</span>
                  </div>
                  <div className=\"text-sm text-gray-600\">
                    {allocation.hours}h/week • {allocation.date}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Assign Modal */}
      <QuickAssignModal
        isOpen={isQuickAssignOpen}
        onClose={() => setIsQuickAssignOpen(false)}
        onAssign={handleQuickAssign}
      />

      {/* Usage Instructions */}
      <Card>
        <CardHeader>
          <CardTitle>Usage Instructions</CardTitle>
        </CardHeader>
        <CardContent className=\"space-y-4\">
          <div>
            <h3 className=\"font-semibold text-lg\">Resource Allocation Form Features:</h3>
            <ul className=\"list-disc list-inside space-y-1 text-sm text-gray-700\">
              <li>Employee and project selection with real-time data loading</li>
              <li>Hours per week input with percentage slider synchronization</li>
              <li>Date range validation (end date must be after start date)</li>
              <li>Real-time capacity checking and over-allocation warnings</li>
              <li>Visual feedback for capacity conflicts</li>
              <li>Form validation with user-friendly error messages</li>
              <li>Success/error toast notifications</li>
              <li>Form reset after successful submission</li>
              <li>Accessibility features with ARIA labels and screen reader support</li>
            </ul>
          </div>

          <div>
            <h3 className=\"font-semibold text-lg\">Quick Assign Modal Features:</h3>
            <ul className=\"list-disc list-inside space-y-1 text-sm text-gray-700\">
              <li>Simplified form for rapid assignment</li>
              <li>Global keyboard shortcut (Ctrl+A) to open modal</li>
              <li>Employee search and auto-suggest functionality</li>
              <li>Real-time availability status display</li>
              <li>Keyboard navigation support (Tab, Enter, Escape)</li>
              <li>Focus management and trap within modal</li>
              <li>Default values for quick workflows (20 hours/week)</li>
              <li>Auto-close on successful assignment</li>
            </ul>
          </div>

          <div>
            <h3 className=\"font-semibold text-lg\">API Integration:</h3>
            <ul className=\"list-disc list-inside space-y-1 text-sm text-gray-700\">
              <li>Real API calls to backend on port 3001</li>
              <li>No mocks - connects to actual employee, project, and allocation services</li>
              <li>React Query for caching and optimistic updates</li>
              <li>Error handling for network failures and business logic errors</li>
              <li>Automatic cache invalidation after successful operations</li>
            </ul>
          </div>

          <div>
            <h3 className=\"font-semibold text-lg\">Keyboard Shortcuts:</h3>
            <ul className=\"list-disc list-inside space-y-1 text-sm text-gray-700\">
              <li><kbd className=\"px-2 py-1 bg-gray-200 rounded text-xs\">Ctrl+A</kbd> - Open Quick Assign Modal</li>
              <li><kbd className=\"px-2 py-1 bg-gray-200 rounded text-xs\">Escape</kbd> - Close modals</li>
              <li><kbd className=\"px-2 py-1 bg-gray-200 rounded text-xs\">Tab</kbd> - Navigate between form fields</li>
              <li><kbd className=\"px-2 py-1 bg-gray-200 rounded text-xs\">Enter</kbd> - Submit forms</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

// Wrapper component with QueryClient
const AllocationDemoWithProvider: React.FC = () => {
  const queryClient = React.useMemo(() => new QueryClient(), []);

  return (
    <QueryClientProvider client={queryClient}>
      <AllocationDemo />
    </QueryClientProvider>
  );
};

export default AllocationDemoWithProvider;