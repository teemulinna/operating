import React from 'react';
import { useToastManager, ToastNotification } from '../../hooks/useToastManager';
import { useCrudOperations } from '../../hooks/useCrudOperations';
import { useModalManager } from '../../hooks/useModalManager';
import { LoadingSkeleton, AllocationRowSkeleton } from '../ui/LoadingSkeleton';
import type { AllocationStatus } from '../../types/allocation';

interface Employee {
  id: string | number;
  firstName: string;
  lastName: string;
}

interface Project {
  id: string | number;
  name: string;
}

interface Allocation {
  id: string | number;
  employeeId: string | number;
  projectId: string | number;
  startDate: string;
  endDate: string;
  allocatedHours: number;
  roleOnProject: string;
  status: string;
  notes?: string;
  isActive: boolean;
}

/**
 * Enhanced Allocation Management Component with full CRUD functionality
 * 
 * Uses extracted hooks to eliminate code duplication:
 * - useToastManager: For consistent toast notifications
 * - useCrudOperations: For standardized CRUD operations (multiple instances)
 * - useModalManager: For modal state management
 */
export function AllocationsPage() {
  const { toast, showError, showSuccess, hideToast } = useToastManager();
  
  // Separate CRUD operations for different entities
  const {
    state: { items: allocations, loading, operationLoading },
    fetchItems: fetchAllocations,
    createItem: createAllocation,
    updateItem: updateAllocation,
    deleteItem: deleteAllocation
  } = useCrudOperations<Allocation>({
    onError: (error, operation) => {
      console.error(`Error during allocation ${operation}:`, error);
      showError(error.message);
    }
  });

  const {
    state: { items: employees },
    fetchItems: fetchEmployees
  } = useCrudOperations<Employee>({
    onError: (error) => {
      console.error('Error fetching employees:', error);
      showError('Failed to load employees');
    }
  });

  const {
    state: { items: projects },
    fetchItems: fetchProjects
  } = useCrudOperations<Project>({
    onError: (error) => {
      console.error('Error fetching projects:', error);
      showError('Failed to load projects');
    }
  });

  const {
    state: { isFormModalOpen, editingItem: editingAllocation, isDeleteDialogOpen, deletingItem: deletingAllocation },
    openFormModal,
    closeFormModal,
    openDeleteDialog,
    closeDeleteDialog
  } = useModalManager<Allocation>();

  const fetchAllData = React.useCallback(async () => {
    await Promise.all([
      fetchAllocations('http://localhost:3001/api/allocations'),
      fetchEmployees('http://localhost:3001/api/employees'),
      fetchProjects('http://localhost:3001/api/projects')
    ]);
  }, [fetchAllocations, fetchEmployees, fetchProjects]);

  React.useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  const handleSubmitAllocation = async (allocationData: Partial<Allocation>) => {
    try {
      if (editingAllocation) {
        await updateAllocation('http://localhost:3001/api/allocations', editingAllocation.id, allocationData, () => {
          showSuccess('Allocation updated successfully');
          closeFormModal();
        });
      } else {
        await createAllocation('http://localhost:3001/api/allocations', allocationData, () => {
          showSuccess('Allocation created successfully');
          closeFormModal();
        });
      }
      // Refresh the allocations list
      await fetchAllocations('http://localhost:3001/api/allocations');
    } catch (error) {
      // Error handling is done by the hook
    }
  };

  const handleDeleteAllocation = async () => {
    if (!deletingAllocation) return;
    
    try {
      await deleteAllocation('http://localhost:3001/api/allocations', deletingAllocation.id, () => {
        showSuccess('Allocation deleted successfully');
        closeDeleteDialog();
      });
      // Refresh the allocations list
      await fetchAllocations('http://localhost:3001/api/allocations');
    } catch (error) {
      // Error handling is done by the hook
    }
  };

  if (loading) return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center justify-between mb-6">
        <LoadingSkeleton width="200px" height="32px" />
        <LoadingSkeleton width="140px" height="40px" />
      </div>
      <div className="space-y-1">
        {Array.from({ length: 5 }).map((_, i) => (
          <AllocationRowSkeleton key={i} />
        ))}
      </div>
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8" data-testid="allocations-page">
      <ToastNotification toast={toast} onClose={hideToast} />

      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900" data-testid="allocations-title">Resource Allocations</h1>
        <button
          onClick={() => openFormModal()}
          className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md transition-colors"
          data-testid="add-allocation-button"
        >
          Add Allocation
        </button>
      </div>

      <div className="bg-white shadow overflow-hidden sm:rounded-md" data-testid="allocations-list">
        <ul className="divide-y divide-gray-200">
          {allocations.map((allocation: Allocation) => {
            const employee = employees.find(e => e.id === allocation.employeeId);
            const project = projects.find(p => p.id === allocation.projectId);
            
            return (
              <li key={allocation.id} className="px-6 py-4" data-testid={`allocation-${allocation.id}`}>
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-4">
                      <div className="flex-1">
                        <p className="text-lg font-medium text-gray-900" data-testid={`allocation-employee-${allocation.id}`}>
                          {employee ? `${employee.firstName} ${employee.lastName}` : 'Unknown Employee'}
                        </p>
                        <p className="text-sm text-gray-600" data-testid={`allocation-project-${allocation.id}`}>
                          Project: {project ? project.name : 'Unknown Project'}
                        </p>
                        <div className="mt-2 flex items-center space-x-4 text-sm text-gray-500">
                          <span data-testid={`allocation-hours-${allocation.id}`}>
                            {allocation.allocatedHours}h/week
                          </span>
                          <span data-testid={`allocation-dates-${allocation.id}`}>
                            {new Date(allocation.startDate).toLocaleDateString()} - {new Date(allocation.endDate).toLocaleDateString()}
                          </span>
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            allocation.status === 'active' ? 'bg-green-100 text-green-800' :
                            allocation.status === 'planned' ? 'bg-blue-100 text-blue-800' :
                            allocation.status === 'completed' ? 'bg-gray-100 text-gray-800' :
                            'bg-red-100 text-red-800'
                          }`} data-testid={`allocation-status-${allocation.id}`}>
                            {allocation.status}
                          </span>
                        </div>
                        {allocation.roleOnProject && (
                          <p className="text-sm text-gray-500 mt-1">
                            Role: {allocation.roleOnProject}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col space-y-2">
                    <button
                      onClick={() => openFormModal(allocation)}
                      className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                      data-testid={`edit-allocation-${allocation.id}`}
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => openDeleteDialog(allocation)}
                      className="text-red-600 hover:text-red-800 text-sm font-medium"
                      data-testid={`delete-allocation-${allocation.id}`}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
      
      <div className="mt-4" data-testid="allocations-summary">
        <p className="text-sm text-gray-600">Total: {allocations.length} allocations</p>
      </div>

      {/* Allocation Form Modal */}
      {isFormModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" data-testid="allocation-form-modal">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <h2 className="text-xl font-bold mb-4" data-testid="modal-title">
              {editingAllocation ? 'Edit Allocation' : 'Add New Allocation'}
            </h2>
            <form onSubmit={async (e) => {
              e.preventDefault();
              const formData = new FormData(e.target as HTMLFormElement);
              const allocationData: Partial<Allocation> = {
                employeeId: formData.get('employeeId')?.toString() || '',
                projectId: formData.get('projectId')?.toString() || '',
                startDate: formData.get('startDate')?.toString() || '',
                endDate: formData.get('endDate')?.toString() || '',
                allocatedHours: parseInt(formData.get('allocatedHours')?.toString() || '0'),
                roleOnProject: formData.get('roleOnProject')?.toString() || 'Team Member',
                status: (formData.get('status')?.toString() as AllocationStatus) || 'planned',
                notes: formData.get('notes')?.toString() || '',
                isActive: true
              };
              
              // Basic validation
              if (!allocationData.employeeId || !allocationData.projectId || 
                  !allocationData.startDate || !allocationData.endDate || 
                  !allocationData.allocatedHours) {
                showError('Please fill in all required fields');
                return;
              }

              // Date validation
              if (new Date(allocationData.endDate.toString()) <= new Date(allocationData.startDate.toString())) {
                showError('End date must be after start date');
                return;
              }

              // Hours validation
              if (allocationData.allocatedHours <= 0 || allocationData.allocatedHours > 80) {
                showError('Allocated hours must be between 1 and 80');
                return;
              }

              await handleSubmitAllocation(allocationData);
            }}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Employee *</label>
                  <select
                    name="employeeId"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    defaultValue={editingAllocation?.employeeId || ''}
                    data-testid="allocation-employee"
                    required
                  >
                    <option value="">Select employee</option>
                    {employees.map((employee: Employee) => (
                      <option key={employee.id} value={employee.id}>
                        {employee.firstName} {employee.lastName}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Project *</label>
                  <select
                    name="projectId"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    defaultValue={editingAllocation?.projectId || ''}
                    data-testid="allocation-project"
                    required
                  >
                    <option value="">Select project</option>
                    {projects.map((project: Project) => (
                      <option key={project.id} value={project.id}>
                        {project.name}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Start Date *</label>
                    <input
                      name="startDate"
                      type="date"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      defaultValue={editingAllocation?.startDate ? editingAllocation.startDate.split('T')[0] : ''}
                      data-testid="allocation-start-date"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">End Date *</label>
                    <input
                      name="endDate"
                      type="date"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      defaultValue={editingAllocation?.endDate ? editingAllocation.endDate.split('T')[0] : ''}
                      data-testid="allocation-end-date"
                      required
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Hours per Week *</label>
                  <input
                    name="allocatedHours"
                    type="number"
                    min="1"
                    max="80"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    defaultValue={editingAllocation?.allocatedHours || ''}
                    data-testid="allocation-hours"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                  <input
                    name="roleOnProject"
                    type="text"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    defaultValue={editingAllocation?.roleOnProject || ''}
                    data-testid="allocation-role"
                    placeholder="e.g., Developer, Designer, Analyst"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <select
                    name="status"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    defaultValue={editingAllocation?.status || 'planned'}
                    data-testid="allocation-status"
                  >
                    <option value="planned">Planned</option>
                    <option value="active">Active</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                  <textarea
                    name="notes"
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    defaultValue={editingAllocation?.notes || ''}
                    data-testid="allocation-notes"
                    placeholder="Optional notes about this allocation"
                  />
                </div>
              </div>
              
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  type="button"
                  onClick={closeFormModal}
                  className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
                  disabled={operationLoading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                  disabled={operationLoading}
                  data-testid="submit-allocation"
                >
                  {operationLoading ? (
                    <span data-testid="submit-loading">
                      {editingAllocation ? 'Updating...' : 'Creating...'}
                    </span>
                  ) : (
                    editingAllocation ? 'Update Allocation' : 'Create Allocation'
                  )}
                </button>
              </div>
            </form>
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
              <button
                onClick={closeDeleteDialog}
                className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
                disabled={operationLoading}
                data-testid="cancel-delete-button"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteAllocation}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50"
                disabled={operationLoading}
                data-testid="confirm-delete-button"
              >
                {operationLoading ? 'Deleting...' : 'Delete Allocation'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AllocationsPage;