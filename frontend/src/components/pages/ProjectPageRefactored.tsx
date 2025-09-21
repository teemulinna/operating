import React, { useEffect } from 'react';
import { ToastNotification } from '../../hooks/useToastManager';
import { useModalManager } from '../../hooks/useModalManager';
import { LoadingSkeleton } from '../ui/LoadingSkeleton';
import { ValidationError } from '../ui/ValidationErrorDisplay';
import { useProjects } from '../../features/projects/hooks/useProjects';
import { 
  ProjectList, 
  ProjectForm, 
  ProjectDeleteDialog 
} from '../../features/projects/components';
import { Project, ProjectFormData } from '../../features/projects/types';

/**
 * Refactored Project Page with clean component architecture
 * 
 * Key improvements:
 * - Extracted components into feature modules
 * - Separation of concerns between UI and business logic
 * - Custom hooks for state management
 * - Better TypeScript support
 * - Maintainable component structure
 */
export function ProjectPageRefactored() {
  const {
    projects,
    loading,
    operationLoading,
    createProject,
    updateProject,
    deleteProject,
    refreshProjects
  } = useProjects();

  const {
    state: { isFormModalOpen, editingItem: editingProject, isDeleteDialogOpen, deletingItem: deletingProject },
    openFormModal,
    closeFormModal,
    openDeleteDialog,
    closeDeleteDialog
  } = useModalManager<Project>();

  // Load projects on mount
  useEffect(() => {
    refreshProjects();
  }, [refreshProjects]);

  const handleSubmitProject = async (projectData: ProjectFormData) => {
    if (editingProject) {
      await updateProject(editingProject.id, projectData);
    } else {
      await createProject(projectData);
    }
    closeFormModal();
    await refreshProjects();
  };

  const handleDeleteProject = async () => {
    if (!deletingProject) return;
    
    await deleteProject(deletingProject.id);
    closeDeleteDialog();
    await refreshProjects();
  };

  const handleValidationError = (errors: ValidationError[]) => {
    console.error('Validation errors:', errors);
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-6">
          <LoadingSkeleton width="150px" height="32px" />
          <LoadingSkeleton width="120px" height="40px" />
        </div>
        <ProjectList projects={[]} onEdit={() => {}} onDelete={() => {}} loading={true} />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8" data-testid="projects-page">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900" data-testid="projects-title">
          Projects
        </h1>
        <button
          onClick={() => openFormModal()}
          className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md transition-colors"
          data-testid="add-project-button"
        >
          Add Project
        </button>
      </div>

      <ProjectList
        projects={projects}
        onEdit={openFormModal}
        onDelete={openDeleteDialog}
        loading={loading}
      />

      {/* Project Form Modal */}
      {isFormModalOpen && (
        <ProjectForm
          project={editingProject}
          onSubmit={handleSubmitProject}
          onCancel={closeFormModal}
          loading={operationLoading}
        />
      )}

      {/* Delete Confirmation Dialog */}
      {isDeleteDialogOpen && deletingProject && (
        <ProjectDeleteDialog
          project={deletingProject}
          onConfirm={handleDeleteProject}
          onCancel={closeDeleteDialog}
          loading={operationLoading}
        />
      )}
    </div>
  );
}

export default ProjectPageRefactored;