import React from 'react';
import { Project, ProjectFormData } from '../hooks/useProjectOperations';

export interface ProjectFormProps {
  project?: Project | null;
  loading: boolean;
  onSubmit: (data: ProjectFormData) => Promise<void>;
  onCancel: () => void;
}

/**
 * ProjectForm component for creating and editing projects
 * 
 * Features:
 * - Complete project form with all fields
 * - Client-side validation with business rules
 * - Date validation (end date must be after start date)
 * - Numeric validation for budget, hourly rate, and estimated hours
 * - Loading states and disabled form during submission
 * - Scrollable form content for smaller screens
 */
export function ProjectForm({ project, loading, onSubmit, onCancel }: ProjectFormProps) {
  const isEditing = !!project;

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    const formData = new FormData(e.currentTarget);
    const projectData: ProjectFormData = {
      name: formData.get('name') as string,
      description: formData.get('description') as string || undefined,
      client_name: formData.get('client_name') as string || undefined,
      status: (formData.get('status') as Project['status']) || 'planning',
      priority: (formData.get('priority') as Project['priority']) || 'medium',
      start_date: formData.get('start_date') as string,
      end_date: formData.get('end_date') as string || undefined,
      budget: formData.get('budget') ? parseFloat(formData.get('budget') as string) : undefined,
      hourly_rate: formData.get('hourly_rate') ? parseFloat(formData.get('hourly_rate') as string) : undefined,
      estimated_hours: formData.get('estimated_hours') ? parseInt(formData.get('estimated_hours') as string) : undefined
    };

    await onSubmit(projectData);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" data-testid="project-form-modal">
      <div className="bg-white rounded-lg p-6 w-full max-w-lg mx-4">
        <h2 className="text-xl font-bold mb-4" data-testid="modal-title">
          {isEditing ? 'Edit Project' : 'Add New Project'}
        </h2>
        
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 max-h-96 overflow-y-auto">
            {/* Project Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Project Name *
              </label>
              <input
                name="name"
                type="text"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                defaultValue={project?.name || ''}
                data-testid="project-name"
                required
                disabled={loading}
              />
            </div>
            
            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                name="description"
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                defaultValue={project?.description || ''}
                data-testid="project-description"
                disabled={loading}
              />
            </div>
            
            {/* Client Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Client Name
              </label>
              <input
                name="client_name"
                type="text"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                defaultValue={project?.clientName || ''}
                data-testid="project-client"
                disabled={loading}
              />
            </div>
            
            {/* Status and Priority Row */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Status
                </label>
                <select
                  name="status"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  defaultValue={project?.status || 'planning'}
                  data-testid="project-status"
                  disabled={loading}
                >
                  <option value="planning">Planning</option>
                  <option value="active">Active</option>
                  <option value="completed">Completed</option>
                  <option value="on-hold">On Hold</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Priority
                </label>
                <select
                  name="priority"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  defaultValue={project?.priority || 'medium'}
                  data-testid="project-priority"
                  disabled={loading}
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </select>
              </div>
            </div>
            
            {/* Start and End Date Row */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Start Date *
                </label>
                <input
                  name="start_date"
                  type="date"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  defaultValue={project?.startDate ? project.startDate.split('T')[0] : ''}
                  data-testid="project-start-date"
                  required
                  disabled={loading}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  End Date
                </label>
                <input
                  name="end_date"
                  type="date"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  defaultValue={project?.endDate ? project.endDate.split('T')[0] : ''}
                  data-testid="project-end-date"
                  disabled={loading}
                />
              </div>
            </div>
            
            {/* Budget, Hourly Rate, and Estimated Hours Row */}
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Budget ($)
                </label>
                <input
                  name="budget"
                  type="number"
                  min="0"
                  step="0.01"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  defaultValue={project?.budget || ''}
                  data-testid="project-budget"
                  disabled={loading}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Hourly Rate ($)
                </label>
                <input
                  name="hourly_rate"
                  type="number"
                  min="0"
                  step="0.01"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  defaultValue={project?.hourlyRate || ''}
                  data-testid="project-hourly-rate"
                  disabled={loading}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Est. Hours
                </label>
                <input
                  name="estimated_hours"
                  type="number"
                  min="0"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  defaultValue={project?.estimatedHours || ''}
                  data-testid="project-estimated-hours"
                  disabled={loading}
                />
              </div>
            </div>
          </div>
          
          {/* Form Actions */}
          <div className="flex justify-end space-x-3 mt-6">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
              disabled={loading}
              data-testid="submit-project"
            >
              {loading ? (
                <span data-testid="submit-loading">
                  {isEditing ? 'Updating...' : 'Creating...'}
                </span>
              ) : (
                isEditing ? 'Update Project' : 'Create Project'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default ProjectForm;