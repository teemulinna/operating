import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { ProjectFormModal } from './ProjectFormModal';
import { ProjectCard } from './ProjectCard';
import { DeleteProjectDialog } from './DeleteProjectDialog';
import { Project, CreateProjectRequest, transformApiProject } from '@/types/project';
import { PlusIcon } from '@heroicons/react/24/outline';

export function ProjectsPage() {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [deletingProject, setDeletingProject] = useState<Project | null>(null);
  
  const queryClient = useQueryClient();

  // Fetch projects
  const { data: projects = [], isLoading } = useQuery({
    queryKey: ['projects'],
    queryFn: async () => {
      const response = await fetch('http://localhost:3001/api/projects');
      if (!response.ok) {
        throw new Error('Failed to fetch projects');
      }
      const data = await response.json();
      return (data.data || []).map(transformApiProject);
    },
  });

  // Create project mutation
  const createProjectMutation = useMutation({
    mutationFn: async (projectData: CreateProjectRequest) => {
      const response = await fetch('http://localhost:3001/api/projects', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: projectData.name,
          description: projectData.description,
          client_name: projectData.client_name,
          start_date: projectData.start_date,
          end_date: projectData.end_date,
          budget: projectData.budget,
          hourly_rate: projectData.hourly_rate,
          estimated_hours: projectData.estimated_hours,
          status: projectData.status || 'planning',
          priority: projectData.priority || 'medium',
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create project');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      setIsCreateModalOpen(false);
    },
  });

  // Update project mutation
  const updateProjectMutation = useMutation({
    mutationFn: async ({ id, ...projectData }: CreateProjectRequest & { id: number }) => {
      const response = await fetch(`http://localhost:3001/api/projects/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: projectData.name,
          description: projectData.description,
          client_name: projectData.client_name,
          start_date: projectData.start_date,
          end_date: projectData.end_date,
          budget: projectData.budget,
          hourly_rate: projectData.hourly_rate,
          estimated_hours: projectData.estimated_hours,
          status: projectData.status || 'planning',
          priority: projectData.priority || 'medium',
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update project');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      setEditingProject(null);
    },
  });

  // Delete project mutation
  const deleteProjectMutation = useMutation({
    mutationFn: async (projectId: number) => {
      const response = await fetch(`http://localhost:3001/api/projects/${projectId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete project');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      setDeletingProject(null);
    },
  });

  const handleCreateProject = (projectData: CreateProjectRequest) => {
    createProjectMutation.mutate(projectData);
  };

  const handleUpdateProject = (projectData: CreateProjectRequest) => {
    if (editingProject) {
      updateProjectMutation.mutate({ ...projectData, id: editingProject.id });
    }
  };

  const handleDeleteProject = () => {
    if (deletingProject) {
      deleteProjectMutation.mutate(deletingProject.id);
    }
  };

  const handleEditClick = (project: Project) => {
    setEditingProject(project);
  };

  const handleDeleteClick = (project: Project) => {
    setDeletingProject(project);
  };

  if (isLoading) {
    return (
      <div className="p-8" data-testid="projects-loading">
        Loading projects...
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8" data-testid="projects-page">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900" data-testid="projects-title">
          Projects
        </h1>
        <Button
          onClick={() => setIsCreateModalOpen(true)}
          data-testid="add-project-button"
          className="flex items-center gap-2"
        >
          <PlusIcon className="h-4 w-4" />
          Add Project
        </Button>
      </div>

      {/* Projects Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" data-testid="projects-grid">
        {projects.map((project) => (
          <ProjectCard
            key={project.id}
            project={project}
            onEdit={handleEditClick}
            onDelete={handleDeleteClick}
          />
        ))}
        {projects.length === 0 && (
          <div className="col-span-full text-center text-gray-500 py-12">
            No projects found. Create your first project to get started.
          </div>
        )}
      </div>

      <div className="mt-4" data-testid="projects-summary">
        <p className="text-sm text-gray-600">Total: {projects.length} projects</p>
      </div>

      {/* Create Project Modal */}
      <ProjectFormModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSubmit={handleCreateProject}
        title="Add Project"
        submitLabel="Create Project"
        isLoading={createProjectMutation.isPending}
        error={createProjectMutation.error?.message}
      />

      {/* Edit Project Modal */}
      {editingProject && (
        <ProjectFormModal
          isOpen={true}
          onClose={() => setEditingProject(null)}
          onSubmit={handleUpdateProject}
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
          isLoading={updateProjectMutation.isPending}
          error={updateProjectMutation.error?.message}
        />
      )}

      {/* Delete Project Dialog */}
      {deletingProject && (
        <DeleteProjectDialog
          isOpen={true}
          onClose={() => setDeletingProject(null)}
          onConfirm={handleDeleteProject}
          project={deletingProject}
          isLoading={deleteProjectMutation.isPending}
        />
      )}
    </div>
  );
}