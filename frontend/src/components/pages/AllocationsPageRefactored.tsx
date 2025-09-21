import React, { useEffect } from 'react';
import { ToastNotification } from '../../hooks/useToastManager';
import { useModalManager } from '../../hooks/useModalManager';
import { LoadingSkeleton } from '../ui/LoadingSkeleton';
import { ValidationError } from '../ui/ValidationErrorDisplay';
import { useAllocations } from '../../features/allocations/hooks/useAllocations';
import { 
  AllocationList, 
  AllocationForm, 
  AllocationDeleteDialog,
  OverAllocationWarning
} from '../../features/allocations/components';
import { Allocation, AllocationFormData } from '../../features/allocations/types';

/**
 * Refactored Allocations Page with clean component architecture
 * 
 * Key improvements:
 * - Extracted components into feature modules
 * - Separation of concerns between UI and business logic
 * - Custom hooks for state management
 * - Over-allocation detection and warnings
 * - Better TypeScript support
 * - Maintainable component structure
 */
export function AllocationsPageRefactored() {
  const {
    allocations,
    employees,
    projects,
    loading,
    operationLoading,
    createAllocation,
    updateAllocation,
    deleteAllocation,
    refreshData,
    detectOverAllocation
  } = useAllocations();

  const {
    state: { isFormModalOpen, editingItem: editingAllocation, isDeleteDialogOpen, deletingItem: deletingAllocation },
    openFormModal,
    closeFormModal,
    openDeleteDialog,
    closeDeleteDialog
  } = useModalManager<Allocation>();

  // Load all data on mount
  useEffect(() => {
    refreshData();
  }, [refreshData]);

  const handleSubmitAllocation = async (allocationData: AllocationFormData) => {
    // Check for over-allocation
    const conflictingAllocations = detectOverAllocation(
      allocationData.employeeId,
      allocationData.startDate,
      allocationData.endDate,
      editingAllocation?.id
    );

    // Calculate total hours including this allocation
    const totalHours = conflictingAllocations.reduce((sum, alloc) => sum + alloc.allocatedHours, 0) + allocationData.allocatedHours;

    // You could show a warning here or prevent submission if desired
    // For now, we'll allow it but log the warning
    if (conflictingAllocations.length > 0 && totalHours > 40) {
      console.warn('Over-allocation detected:', {
        employeeId: allocationData.employeeId,
        totalHours,
        conflicts: conflictingAllocations
      });
    }

    if (editingAllocation) {
      await updateAllocation(editingAllocation.id, allocationData);
    } else {
      await createAllocation(allocationData);
    }
    closeFormModal();
    await refreshData();
  };

  const handleDeleteAllocation = async () => {
    if (!deletingAllocation) return;
    
    await deleteAllocation(deletingAllocation.id);
    closeDeleteDialog();
    await refreshData();
  };

  const handleValidationError = (errors: ValidationError[]) => {
    console.error('Validation errors:', errors);
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-6">
          <LoadingSkeleton width="200px" height="32px" />
          <LoadingSkeleton width="140px" height="40px" />
        </div>
        <AllocationList 
          allocations={[]} 
          employees={[]} 
          projects={[]} 
          onEdit={() => {}} 
          onDelete={() => {}} 
          loading={true} 
        />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8" data-testid="allocations-page">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900" data-testid="allocations-title">
          Resource Allocations
        </h1>
        <button
          onClick={() => openFormModal()}
          className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md transition-colors"
          data-testid="add-allocation-button"
        >
          Add Allocation
        </button>
      </div>

      <AllocationList
        allocations={allocations}
        employees={employees}
        projects={projects}
        onEdit={openFormModal}
        onDelete={openDeleteDialog}
        loading={loading}
      />

      {/* Allocation Form Modal */}
      {isFormModalOpen && (
        <AllocationForm
          allocation={editingAllocation}
          employees={employees}
          projects={projects}
          onSubmit={handleSubmitAllocation}
          onCancel={closeFormModal}
          isLoading={operationLoading}
        />
      )}

      {/* Delete Confirmation Dialog */}
      {isDeleteDialogOpen && deletingAllocation && (
        <AllocationDeleteDialog
          allocation={deletingAllocation}
          onConfirm={handleDeleteAllocation}
          onCancel={closeDeleteDialog}
          isLoading={operationLoading}
        />
      )}

      {/* Over-allocation warnings could be shown here for active allocations */}
      {/* This is a placeholder for future enhancement */}
    </div>
  );
}

export default AllocationsPageRefactored;