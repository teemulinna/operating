import React from 'react';
import { useSuccessToast, useErrorToast } from '../ui/toast-provider';

interface Project {
  id: number;
  name: string;
  description: string;
  client_name?: string;
  status: string;
  priority?: string;
  start_date: string;
  end_date?: string;
  budget?: number;
  hourly_rate?: number;
  estimated_hours?: number;
}

export function ProjectPageWithToasts() {
  const [projects, setProjects] = React.useState<Project[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [isFormModalOpen, setIsFormModalOpen] = React.useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = React.useState(false);
  const [editingProject, setEditingProject] = React.useState<Project | null>(null);
  const [deletingProject, setDeletingProject] = React.useState<Project | null>(null);
  const [operationLoading, setOperationLoading] = React.useState(false);

  const showSuccessToast = useSuccessToast();
  const showErrorToast = useErrorToast();

  const fetchProjects = React.useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch('http://localhost:3001/api/projects');
      const data = await response.json();
      setProjects(data.data || []);
    } catch (err) {
      console.error('Error fetching projects:', err);
      showErrorToast('Failed to load projects. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [showErrorToast]);

  React.useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  // Optimistic Update for project creation/editing
  const handleSubmitProject = async (projectData: any) => {
    setOperationLoading(true);
    const isEdit = !!editingProject;
    
    // Optimistic update
    const optimisticProject = {
      ...projectData,
      id: isEdit ? editingProject.id : Date.now(), // temporary ID for new projects
    };

    if (isEdit) {
      setProjects(prev => prev.map(p => p.id === editingProject.id ? optimisticProject : p));
    } else {
      setProjects(prev => [optimisticProject, ...prev]);
    }

    try {
      const url = isEdit 
        ? `http://localhost:3001/api/projects/${editingProject.id}`
        : 'http://localhost:3001/api/projects';
      
      const method = isEdit ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(projectData)
      });

      if (!response.ok) {
        throw new Error('Failed to save project');
      }

      const result = await response.json();
      
      // Update with real data from server
      if (isEdit) {
        setProjects(prev => prev.map(p => p.id === editingProject.id ? result.data : p));
      } else {
        setProjects(prev => [result.data, ...prev.filter(p => p.id !== optimisticProject.id)]);
      }
      
      showSuccessToast(
        `Project ${isEdit ? 'updated' : 'created'} successfully!`,
        'Project Saved'
      );
      
      setIsFormModalOpen(false);
      setEditingProject(null);
    } catch (error) {
      console.error('Error saving project:', error);
      
      // Revert optimistic update on error
      if (isEdit) {
        setProjects(prev => prev.map(p => p.id === editingProject.id ? editingProject : p));
      } else {
        setProjects(prev => prev.filter(p => p.id !== optimisticProject.id));
      }
      
      showErrorToast(
        `Failed to ${isEdit ? 'update' : 'create'} project. Please try again.`,
        'Save Failed'
      );
    } finally {
      setOperationLoading(false);
    }
  };

  // Optimistic Update for project deletion
  const handleDeleteProject = async () => {
    if (!deletingProject) return;
    
    setOperationLoading(true);
    
    // Optimistic update - remove from UI immediately
    const projectToDelete = deletingProject;
    setProjects(prev => prev.filter(p => p.id !== projectToDelete.id));
    
    try {
      const response = await fetch(`http://localhost:3001/api/projects/${projectToDelete.id}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        throw new Error('Failed to delete project');
      }

      showSuccessToast('Project deleted successfully!', 'Project Deleted');
      
      setIsDeleteDialogOpen(false);
      setDeletingProject(null);
    } catch (error) {
      console.error('Error deleting project:', error);
      
      // Revert optimistic update on error
      setProjects(prev => [projectToDelete, ...prev]);
      
      showErrorToast('Failed to delete project. Please try again.', 'Delete Failed');
    } finally {
      setOperationLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center p-8" data-testid="projects-loading">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2">Loading projects...</span>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8" data-testid="projects-page">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900" data-testid="projects-title">Projects</h1>
        <button
          onClick={() => {
            setEditingProject(null);
            setIsFormModalOpen(true);
          }}
          className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md transition-colors"
          data-testid="add-project-button"
        >
          Add Project
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" data-testid="projects-grid">
        {projects.map((project) => (
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
                    onClick={() => {
                      setEditingProject(project);
                      setIsFormModalOpen(true);
                    }}
                    className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                    data-testid={`edit-project-${project.id}`}
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => {
                      setDeletingProject(project);
                      setIsDeleteDialogOpen(true);
                    }}
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
              const projectData = {
                name: formData.get('name'),
                description: formData.get('description'),
                client_name: formData.get('client_name'),
                status: formData.get('status') || 'planning',
                priority: formData.get('priority') || 'medium',
                start_date: formData.get('start_date'),
                end_date: formData.get('end_date') || null,
                budget: formData.get('budget') ? parseFloat(formData.get('budget') as string) : null,
                hourly_rate: formData.get('hourly_rate') ? parseFloat(formData.get('hourly_rate') as string) : null,
                estimated_hours: formData.get('estimated_hours') ? parseInt(formData.get('estimated_hours') as string) : null
              };
              
              // Basic validation
              if (!projectData.name || !projectData.start_date) {
                showErrorToast('Please fill in all required fields', 'Validation Error');
                return;
              }

              // Date validation
              if (projectData.end_date && new Date(projectData.end_date) < new Date(projectData.start_date)) {
                showErrorToast('End date must be after start date', 'Validation Error');
                return;
              }

              await handleSubmitProject(projectData);
            }}>
              {/* Form fields would go here - simplified for brevity */}
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
              </div>
              
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setIsFormModalOpen(false);
                    setEditingProject(null);
                  }}
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
                onClick={() => {
                  setIsDeleteDialogOpen(false);
                  setDeletingProject(null);
                }}
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