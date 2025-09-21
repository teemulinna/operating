import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { PlusIcon } from '@heroicons/react/24/outline';
import { useToastManager, ToastNotification } from '@/hooks/useToastManager';
import { useProjectOperations } from './hooks/useProjectOperations';
import { ProjectList } from './components/ProjectList';
import { ProjectFormModal } from './components/ProjectFormModal';
import { DeleteProjectDialog } from './components/DeleteProjectDialog';

/**
 * ProjectManagement Component - Main orchestrator for project operations
 * 
 * This component stays under 150 lines by delegating to:
 * - useProjectOperations hook for business logic
 * - ProjectList for rendering project grid
 * - ProjectFormModal for create/edit forms
 * - DeleteProjectDialog for delete confirmation
 * - useToastManager for notifications
 */
export function ProjectManagement() {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const { toast, hideToast } = useToastManager();
  
  const {
    projects,
    isLoading,
    editingProject,
    deletingProject,
    isCreating,
    isUpdating,
    isDeleting,
    handleCreateProject,
    handleUpdateProject,
    handleDeleteProject,
    handleEditProject,
    handleDeleteProjectClick,
    handleCancelEdit,
    handleCancelDelete
  } = useProjectOperations();

  const handleCreateClick = () => {
    setIsCreateModalOpen(true);
  };

  const handleCreateSubmit = (projectData: any) => {
    handleCreateProject(projectData);
    setIsCreateModalOpen(false);
  };

  const handleCreateCancel = () => {
    setIsCreateModalOpen(false);
  };

  const handleUpdateSubmit = (projectData: any) => {
    handleUpdateProject(projectData);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8" data-testid="projects-page">
      {/* Toast Notifications */}
      <ToastNotification toast={toast} onClose={hideToast} />

      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900" data-testid="projects-title">
          Projects
        </h1>
        <Button
          onClick={handleCreateClick}
          data-testid="add-project-button"
          className="flex items-center gap-2"
        >
          <PlusIcon className="h-4 w-4" />
          Add Project
        </Button>
      </div>

      {/* Projects List */}
      <ProjectList
        projects={projects}
        onEdit={handleEditProject}
        onDelete={handleDeleteProjectClick}
        isLoading={isLoading}
      />

      {/* Summary */}
      <div className="mt-4" data-testid="projects-summary">
        <p className="text-sm text-gray-600">Total: {projects.length} projects</p>
      </div>

      {/* Create Project Modal */}
      <ProjectFormModal
        isOpen={isCreateModalOpen}
        onClose={handleCreateCancel}
        onSubmit={handleCreateSubmit}
        title="Add Project"
        submitLabel="Create Project"
        isLoading={isCreating}
      />

      {/* Edit Project Modal */}
      {editingProject && (
        <ProjectFormModal
          isOpen={true}
          onClose={handleCancelEdit}
          onSubmit={handleUpdateSubmit}
          title="Edit Project"
          submitLabel="Update Project"
          initialData={{
            name: editingProject.name,
            description: editingProject.description,
            client_name: editingProject.clientName,
            start_date: editingProject.startDate,
            end_date: editingProject.endDate,
            budget: editingProject.budget,
            hourly_rate: editingProject.hourlyRate,
            estimated_hours: editingProject.estimatedHours,
            status: editingProject.status,
            priority: editingProject.priority,
          }}
          isLoading={isUpdating}
        />
      )}

      {/* Delete Project Dialog */}
      {deletingProject && (
        <DeleteProjectDialog
          isOpen={true}
          onClose={handleCancelDelete}
          onConfirm={handleDeleteProject}
          project={deletingProject}
          isLoading={isDeleting}
        />
      )}
    </div>
  );
}