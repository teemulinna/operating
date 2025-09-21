import React from 'react';
import { useAllocationOperations } from './hooks/useAllocationOperations';
import { useOverAllocationCheck } from './hooks/useOverAllocationCheck';
import { AllocationForm } from './components/AllocationForm';
import { AllocationList } from './components/AllocationList';
import { AllocationGrid } from './components/AllocationGrid';
import { OverAllocationWarningComponent } from '../../components/ui/OverAllocationWarning';
import type { Allocation } from './hooks/useAllocationOperations';

interface ToastState {
  message: string;
  type: 'success' | 'error' | 'info';
  isVisible: boolean;
}

export const AllocationManagement: React.FC = () => {
  const {
    allocations,
    employees,
    projects,
    loading,
    operationLoading,
    validationErrors,
    createAllocation,
    updateAllocation,
    deleteAllocation
  } = useAllocationOperations();

  const { getAllOverAllocations, checkOverAllocation } = useOverAllocationCheck(allocations, employees, projects);

  const [isFormModalOpen, setIsFormModalOpen] = React.useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = React.useState(false);
  const [editingAllocation, setEditingAllocation] = React.useState<Allocation | null>(null);
  const [deletingAllocation, setDeletingAllocation] = React.useState<Allocation | null>(null);
  const [viewMode, setViewMode] = React.useState<'list' | 'grid'>('list');
  const [showOverAllocations, setShowOverAllocations] = React.useState(false);

  const [toast, setToast] = React.useState<ToastState>({
    message: '',
    type: 'info',
    isVisible: false
  });

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToast({ message, type, isVisible: true });
    setTimeout(() => setToast(prev => ({ ...prev, isVisible: false })), 4000);
  };

  const handleSubmitAllocation = async (allocationData: any) => {
    try {
      // Check for over-allocation before submitting
      const overAllocationCheck = checkOverAllocation(
        allocationData.employeeId,
        new Date(allocationData.startDate),
        new Date(allocationData.endDate),
        allocationData.allocatedHours,
        editingAllocation?.id
      );

      if (overAllocationCheck) {
        const proceed = window.confirm(
          `Warning: ${overAllocationCheck.message}\n\nDo you want to proceed anyway?`
        );
        if (!proceed) return;
      }

      if (editingAllocation) {
        await updateAllocation(editingAllocation.id, allocationData);
        showToast('Allocation updated successfully', 'success');
      } else {
        await createAllocation(allocationData);
        showToast('Allocation created successfully', 'success');
      }
      
      setIsFormModalOpen(false);
      setEditingAllocation(null);
    } catch (error: any) {
      showToast(error.message || 'Failed to save allocation', 'error');
    }
  };

  const handleDeleteAllocation = async () => {
    if (!deletingAllocation) return;
    
    try {
      await deleteAllocation(deletingAllocation.id);
      showToast('Allocation deleted successfully', 'success');
      setIsDeleteDialogOpen(false);
      setDeletingAllocation(null);
    } catch (error: any) {
      showToast(error.message || 'Failed to delete allocation', 'error');
    }
  };

  const overAllocations = React.useMemo(() => getAllOverAllocations(), [getAllOverAllocations]);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="animate-pulse space-y-4">
          <div className="flex justify-between">
            <div className="h-8 bg-gray-300 rounded w-48"></div>
            <div className="h-10 bg-gray-300 rounded w-32"></div>
          </div>
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-20 bg-gray-300 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8" data-testid="allocations-page">
      {/* Toast notifications */}
      {toast.isVisible && (
        <div className={`fixed top-4 right-4 ${
          toast.type === 'success' ? 'bg-green-500' : 
          toast.type === 'error' ? 'bg-red-500' : 'bg-blue-500'
        } text-white px-6 py-3 rounded-lg shadow-lg z-50 max-w-sm`} data-testid={`${toast.type}-message`}>
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">{toast.message}</span>
            <button onClick={() => setToast(prev => ({ ...prev, isVisible: false }))} className="ml-4 text-white hover:text-gray-200">×</button>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900" data-testid="allocations-title">Resource Allocations</h1>
          {overAllocations.length > 0 && (
            <button onClick={() => setShowOverAllocations(!showOverAllocations)} className="mt-1 text-red-600 text-sm font-medium hover:text-red-800">
              ⚠️ {overAllocations.length} over-allocation warning{overAllocations.length !== 1 ? 's' : ''}
            </button>
          )}
        </div>
        <div className="flex space-x-3">
          {/* View Toggle */}
          <div className="flex bg-gray-100 rounded-lg p-1">
            <button onClick={() => setViewMode('list')} className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
              viewMode === 'list' ? 'bg-white text-gray-900 shadow' : 'text-gray-600 hover:text-gray-900'
            }`}>List</button>
            <button onClick={() => setViewMode('grid')} className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
              viewMode === 'grid' ? 'bg-white text-gray-900 shadow' : 'text-gray-600 hover:text-gray-900'
            }`}>Timeline</button>
          </div>
          <button onClick={() => { setEditingAllocation(null); setIsFormModalOpen(true); }} 
                  className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md transition-colors" data-testid="add-allocation-button">
            Add Allocation
          </button>
        </div>
      </div>

      {/* Over-allocation warnings */}
      {showOverAllocations && overAllocations.length > 0 && (
        <div className="mb-6 space-y-4">
          {overAllocations.slice(0, 3).map(warning => (
            <OverAllocationWarningComponent key={`${warning.employeeId}-${warning.weekStartDate.getTime()}`} warning={warning} compact />
          ))}
          {overAllocations.length > 3 && (
            <p className="text-sm text-gray-600">...and {overAllocations.length - 3} more warnings</p>
          )}
        </div>
      )}

      {/* Content */}
      {viewMode === 'list' ? (
        <AllocationList 
          allocations={allocations} 
          employees={employees} 
          projects={projects}
          onEdit={(allocation) => { setEditingAllocation(allocation); setIsFormModalOpen(true); }}
          onDelete={(allocation) => { setDeletingAllocation(allocation); setIsDeleteDialogOpen(true); }}
        />
      ) : (
        <AllocationGrid 
          allocations={allocations} 
          employees={employees} 
          projects={projects}
          onAllocationClick={(allocation) => { setEditingAllocation(allocation); setIsFormModalOpen(true); }}
        />
      )}

      {/* Form Modal */}
      {isFormModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" data-testid="allocation-form-modal">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4" data-testid="modal-title">
              {editingAllocation ? 'Edit Allocation' : 'Add New Allocation'}
            </h2>
            <AllocationForm 
              allocation={editingAllocation} 
              employees={employees} 
              projects={projects}
              validationErrors={validationErrors}
              operationLoading={operationLoading}
              onSubmit={handleSubmitAllocation}
              onCancel={() => { setIsFormModalOpen(false); setEditingAllocation(null); }}
            />
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      {isDeleteDialogOpen && deletingAllocation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" data-testid="delete-confirmation-dialog">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <h2 className="text-xl font-bold mb-4">Delete Allocation</h2>
            <p className="text-gray-600 mb-6" data-testid="delete-confirmation-message">
              Are you sure you want to delete this allocation? This action cannot be undone.
            </p>
            <div className="flex justify-end space-x-3">
              <button onClick={() => { setIsDeleteDialogOpen(false); setDeletingAllocation(null); }} 
                      className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50" 
                      disabled={operationLoading} data-testid="cancel-delete-button">Cancel</button>
              <button onClick={handleDeleteAllocation} 
                      className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50" 
                      disabled={operationLoading} data-testid="confirm-delete-button">
                {operationLoading ? 'Deleting...' : 'Delete Allocation'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};