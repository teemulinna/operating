import React, { useState } from 'react';
import { ProjectForm } from './ProjectForm';
import { useCreateProject, useUpdateProject } from '@/hooks/useProjects';
import { useToast } from '@/components/ui/use-toast';
import type { Project, CreateProjectRequest } from '@/types/project';

interface ProjectFormWrapperProps {
  project?: Project;
  onSuccess: (project: Project) => void;
  onCancel: () => void;
}

export function ProjectFormWrapper({
  project,
  onSuccess,
  onCancel,
}: ProjectFormWrapperProps) {
  const createProject = useCreateProject();
  const updateProject = useUpdateProject();
  const { toast } = useToast();
  const [error, setError] = useState<string | null>(null);

  const mode = project ? 'edit' : 'create';
  const isSubmitting = createProject.isPending || updateProject.isPending;

  const handleSubmit = async (data: CreateProjectRequest) => {
    try {
      setError(null);
      
      if (mode === 'create') {
        const result = await createProject.mutateAsync(data);
        onSuccess(result);
        toast({
          title: 'Project Created',
          description: 'Your project has been created successfully.',
        });
      } else if (project) {
        const result = await updateProject.mutateAsync({
          id: project.id,
          updates: data,
        });
        onSuccess(result);
        toast({
          title: 'Project Updated',
          description: 'Your project has been updated successfully.',
        });
      }
    } catch (err: any) {
      const errorMessage = err.message || 'An error occurred while saving the project.';
      setError(errorMessage);
      toast({
        title: mode === 'create' ? 'Creation Failed' : 'Update Failed',
        description: errorMessage,
        variant: 'destructive',
      });
    }
  };

  return (
    <div>
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <p className="text-red-800 text-sm">{error}</p>
        </div>
      )}
      <ProjectForm
        project={project}
        onSubmit={handleSubmit}
        onCancel={onCancel}
        mode={mode}
        isSubmitting={isSubmitting}
      />
    </div>
  );
}

// Export as ProjectForm for tests
export { ProjectFormWrapper as ProjectForm };