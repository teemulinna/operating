import React from 'react';
import { useToastManager, ToastNotification } from '../../hooks/useToastManager';
import { useCrudOperations } from '../../hooks/useCrudOperations';
import { useModalManager } from '../../hooks/useModalManager';
import { LoadingSkeleton, ProjectCardSkeleton } from '../ui/LoadingSkeleton';
import { ValidationError } from '../ui/ValidationErrorDisplay';

interface Project {
  id: string | number;
  name: string;
  description: string;
  client_name?: string;
  status: string;
  priority: string;
  start_date: string;
  end_date?: string;
  budget?: number;
  hourly_rate?: number;
  estimated_hours?: number;
}

/**
 * Enhanced Project List Component with full CRUD functionality
 * 
 * Uses extracted hooks to eliminate code duplication:
 * - useToastManager: For consistent toast notifications
 * - useCrudOperations: For standardized CRUD operations
 * - useModalManager: For modal state management
 */
export function ProjectPage() {
  const { toast, showError, showSuccess, hideToast } = useToastManager();
  const {
    state: { items: projects, loading, operationLoading },
    fetchItems,
    createItem,
    updateItem,
    deleteItem
  } = useCrudOperations<Project>({
    onError: (error, operation) => {
      console.error(`Error during ${operation}:`, error);
      showError(error.message);
    }
  });

  const {
    state: { isFormModalOpen, editingItem: editingProject, isDeleteDialogOpen, deletingItem: deletingProject },
    openFormModal,
    closeFormModal,
    openDeleteDialog,
    closeDeleteDialog
  } = useModalManager<Project>();

  React.useEffect(() => {
    fetchItems('http://localhost:3001/api/projects');
  }, [fetchItems]);

  const handleSubmitProject = async (projectData: Partial<Project>) => {
    try {
      if (editingProject) {
        await updateItem('http://localhost:3001/api/projects', editingProject.id, projectData, () => {
          showSuccess('Project updated successfully');
          closeFormModal();
        });
      } else {
        await createItem('http://localhost:3001/api/projects', projectData, () => {
          showSuccess('Project created successfully');
          closeFormModal();
        });
      }
      // Refresh the projects list
      await fetchItems('http://localhost:3001/api/projects');
    } catch (error) {
      // Error handling is done by the hook
    }
  };

  const handleDeleteProject = async () => {
    if (!deletingProject) return;
    
    try {
      await deleteItem('http://localhost:3001/api/projects', deletingProject.id, () => {
        showSuccess('Project deleted successfully');
        closeDeleteDialog();
      });
      // Refresh the projects list
      await fetchItems('http://localhost:3001/api/projects');
    } catch (error) {
      // Error handling is done by the hook
    }
  };

  if (loading) return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center justify-between mb-6">
        <LoadingSkeleton width="150px" height="32px" />
        <LoadingSkeleton width="120px" height="40px" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <ProjectCardSkeleton key={i} />
        ))}
      </div>
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8" data-testid="projects-page">
      <ToastNotification toast={toast} onClose={hideToast} />

      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900" data-testid="projects-title">Projects</h1>
        <button
          onClick={() => openFormModal()}
          className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md transition-colors"
          data-testid="add-project-button"
        >
          Add Project
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" data-testid="projects-grid">
        {projects.map((project: Project) => (
          <div key={project.id} className="bg-white overflow-hidden shadow rounded-lg" data-testid={`project-${project.id}`}>
            <div className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="text-lg font-medium text-gray-900" data-testid={`project-name-${project.id}`}>
                    {project.name}
                  </h3>
                  <p className="text-sm text-gray-500 mt-1" data-testid={`project-description-${project.id}`}>
                    {project.description}
                  </p>
                  {project.client_name && (
                    <p className="text-sm text-gray-600 mt-1">
                      Client: {project.client_name}
                    </p>
                  )}
                  <div className="mt-3 flex items-center space-x-2">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      project.status === 'active' ? 'bg-green-100 text-green-800' :
                      project.status === 'planning' ? 'bg-yellow-100 text-yellow-800' :
                      project.status === 'completed' ? 'bg-gray-100 text-gray-800' :
                      project.status === 'on-hold' ? 'bg-orange-100 text-orange-800' :
                      'bg-red-100 text-red-800'
                    }`} data-testid={`project-status-${project.id}`}>
                      {project.status}
                    </span>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      project.priority === 'critical' ? 'bg-red-100 text-red-800' :
                      project.priority === 'high' ? 'bg-orange-100 text-orange-800' :
                      project.priority === 'medium' ? 'bg-blue-100 text-blue-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {project.priority || 'medium'}
                    </span>
                  </div>
                  {(project.start_date || project.end_date) && (
                    <div className="mt-2 text-xs text-gray-500">
                      {project.start_date && `Start: ${new Date(project.start_date).toLocaleDateString()}`}
                      {project.start_date && project.end_date && ' • '}
                      {project.end_date && `End: ${new Date(project.end_date).toLocaleDateString()}`}
                    </div>
                  )}
                </div>
                <div className="ml-4 flex flex-col space-y-2">
                  <button
                    onClick={() => openFormModal(project)}
                    className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                    data-testid={`edit-project-${project.id}`}
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => openDeleteDialog(project)}
                    className="text-red-600 hover:text-red-800 text-sm font-medium"
                    data-testid={`delete-project-${project.id}`}
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
      
      <div className="mt-4" data-testid="projects-summary">
        <p className="text-sm text-gray-600">Total: {projects.length} projects</p>
      </div>

      {/* Project Form Modal */}
      {isFormModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" data-testid="project-form-modal">
          <div className="bg-white rounded-lg p-6 w-full max-w-lg mx-4">
            <h2 className="text-xl font-bold mb-4" data-testid="modal-title">
              {editingProject ? 'Edit Project' : 'Add New Project'}
            </h2>
            <form onSubmit={async (e) => {
              e.preventDefault();
              const formData = new FormData(e.target as HTMLFormElement);
              const projectData: Partial<Project> = {
                name: formData.get('name')?.toString() || '',
                description: formData.get('description')?.toString() || '',
                client_name: formData.get('client_name')?.toString() || '',
                status: formData.get('status')?.toString() || 'planning',
                priority: formData.get('priority')?.toString() || 'medium',
                start_date: formData.get('start_date')?.toString() || '',
                end_date: formData.get('end_date')?.toString() || null,
                budget: formData.get('budget') ? parseFloat(formData.get('budget')?.toString() || '0') : null,
                hourly_rate: formData.get('hourly_rate') ? parseFloat(formData.get('hourly_rate')?.toString() || '0') : null,
                estimated_hours: formData.get('estimated_hours') ? parseInt(formData.get('estimated_hours')?.toString() || '0') : null
              };
              
              // Basic validation
              if (!projectData.name || !projectData.start_date) {
                showError('Please fill in all required fields');
                return;
              }

              // Date validation
              if (projectData.end_date && new Date(projectData.end_date.toString()) < new Date(projectData.start_date.toString())) {
                showError('End date must be after start date');
                return;
              }

              await handleSubmitProject(projectData);
            }}>
              <div className="space-y-4 max-h-96 overflow-y-auto">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Project Name *</label>
                  <input
                    name="name"
                    type="text"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    defaultValue={editingProject?.name || ''}
                    data-testid="project-name"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <textarea
                    name="description"
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    defaultValue={editingProject?.description || ''}
                    data-testid="project-description"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Client Name</label>
                  <input
                    name="client_name"
                    type="text"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    defaultValue={editingProject?.client_name || ''}
                    data-testid="project-client"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                    <select
                      name="status"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      defaultValue={editingProject?.status || 'planning'}
                      data-testid="project-status"
                    >
                      <option value="planning">Planning</option>
                      <option value="active">Active</option>
                      <option value="completed">Completed</option>
                      <option value="on-hold">On Hold</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                    <select
                      name="priority"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      defaultValue={editingProject?.priority || 'medium'}
                      data-testid="project-priority"
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="critical">Critical</option>
                    </select>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Start Date *</label>
                    <input
                      name="start_date"
                      type="date"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      defaultValue={editingProject?.start_date ? editingProject.start_date.split('T')[0] : ''}
                      data-testid="project-start-date"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                    <input
                      name="end_date"
                      type="date"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      defaultValue={editingProject?.end_date ? editingProject.end_date.split('T')[0] : ''}
                      data-testid="project-end-date"
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Budget ($)</label>
                    <input
                      name="budget"
                      type="number"
                      min="0"
                      step="0.01"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      defaultValue={editingProject?.budget || ''}
                      data-testid="project-budget"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Hourly Rate ($)</label>
                    <input
                      name="hourly_rate"
                      type="number"
                      min="0"
                      step="0.01"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      defaultValue={editingProject?.hourly_rate || ''}
                      data-testid="project-hourly-rate"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Est. Hours</label>
                    <input
                      name="estimated_hours"
                      type="number"
                      min="0"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      defaultValue={editingProject?.estimated_hours || ''}
                      data-testid="project-estimated-hours"
                    />
                  </div>
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
                  data-testid="submit-project"
                >
                  {operationLoading ? (
                    <span data-testid="submit-loading">
                      {editingProject ? 'Updating...' : 'Creating...'}
                    </span>
                  ) : (
                    editingProject ? 'Update Project' : 'Create Project'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      {isDeleteDialogOpen && deletingProject && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" data-testid="delete-confirmation-dialog">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <h2 className="text-xl font-bold mb-4">Delete Project</h2>
            <p className="text-gray-600 mb-6" data-testid="delete-confirmation-message">
              Are you sure you want to delete project <strong>{deletingProject.name}</strong>? 
              This action cannot be undone.
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
                onClick={handleDeleteProject}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50"
                disabled={operationLoading}
                data-testid="confirm-delete-button"
              >
                {operationLoading ? 'Deleting...' : 'Delete Project'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ProjectPage;