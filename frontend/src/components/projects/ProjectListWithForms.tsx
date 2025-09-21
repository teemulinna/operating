import React, { useState } from 'react';
import { useProjects, useCreateProject } from '../../hooks/useRealProjects';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { FolderOpen, AlertTriangle, Plus, Loader2, Calendar, DollarSign, Check, X } from 'lucide-react';
import { ProjectForm } from './ProjectForm';

interface ProjectFormData {
  name: string;
  description: string;
  clientName: string;
  startDate: string;
  endDate: string;
  budget: number;
  priority: 'low' | 'medium' | 'high';
  status: 'planning' | 'active' | 'on-hold' | 'completed' | 'cancelled';
}

interface SuccessMessage {
  show: boolean;
  message: string;
}

interface ErrorMessage {
  show: boolean;
  message: string;
}

export function ProjectListWithForms() {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<SuccessMessage>({ show: false, message: '' });
  const [errorMessage, setErrorMessage] = useState<ErrorMessage>({ show: false, message: '' });

  // Use existing hooks
  const { data: projectsResponse, isLoading, error } = useProjects();
  const createProjectMutation = useCreateProject({
    onSuccess: () => {
      setShowCreateForm(false);
      setSuccessMessage({ show: true, message: 'Project created successfully' });
      setTimeout(() => setSuccessMessage({ show: false, message: '' }), 5000);
    },
    onError: (error: any) => {
      console.error('Failed to create project:', error);
      setErrorMessage({ 
        show: true, 
        message: error.message || 'Failed to create project. Please try again.' 
      });
      setTimeout(() => setErrorMessage({ show: false, message: '' }), 5000);
    },
  });

  const handleCreateProject = async (formData: ProjectFormData) => {
    setIsSubmitting(true);
    setErrorMessage({ show: false, message: '' });
    
    try {
      // Transform form data to match backend expectations
      const projectData = {
        name: formData.name,
        description: formData.description,
        client_name: formData.clientName,
        start_date: formData.startDate,
        end_date: formData.endDate,
        budget: formData.budget,
        priority: formData.priority,
        status: formData.status
      };
      
      await createProjectMutation.mutateAsync(projectData);
    } catch (error) {
      console.error('Form submission error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const projects = projectsResponse?.data || [];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800 border-green-300';
      case 'planning': return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'completed': return 'bg-gray-100 text-gray-800 border-gray-300';
      case 'on-hold': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'cancelled': return 'bg-red-100 text-red-800 border-red-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800 border-red-300';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'low': return 'bg-green-100 text-green-800 border-green-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <FolderOpen className="h-8 w-8" />
              Project Management
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              Manage your projects and track their progress
            </p>
          </div>
          <Button
            data-testid="create-project-button"
            onClick={() => setShowCreateForm(true)}
            className="flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Add Project
          </Button>
        </div>
      </div>

      {/* Success Message */}
      {successMessage.show && (
        <div data-testid="success-message" className="mb-4 p-4 bg-green-50 border border-green-200 rounded-md flex items-center gap-2">
          <Check className="h-5 w-5 text-green-600" />
          <span className="text-green-800">{successMessage.message}</span>
        </div>
      )}

      {/* Error Message */}
      {errorMessage.show && (
        <div data-testid="error-message" className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md flex items-center gap-2">
          <X className="h-5 w-5 text-red-600" />
          <span className="text-red-800">{errorMessage.message}</span>
        </div>
      )}

      {/* Create Form Modal */}
      {showCreateForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Add New Project</h2>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowCreateForm(false)}
                disabled={isSubmitting}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <ProjectForm
              onSubmit={handleCreateProject}
              isSubmitting={isSubmitting}
              onCancel={() => setShowCreateForm(false)}
            />
          </div>
        </div>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin" />
          <span className="ml-2">Loading projects...</span>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-4">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-600" />
            <span className="text-red-800">Failed to load projects</span>
          </div>
        </div>
      )}

      {/* Project Cards */}
      {!isLoading && !error && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((project: any) => (
            <Card key={project.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <CardTitle className="text-lg line-clamp-2">
                    {project.name}
                  </CardTitle>
                  <div className="flex gap-1 flex-col">
                    <Badge className={getStatusColor(project.status)} variant="outline">
                      {project.status}
                    </Badge>
                    <Badge className={getPriorityColor(project.priority)} variant="outline">
                      {project.priority}
                    </Badge>
                  </div>
                </div>
                <p className="text-sm text-gray-600 line-clamp-2">{project.description}</p>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {project.client_name && (
                    <div>
                      <span className="text-sm text-gray-500">Client:</span>
                      <span className="text-sm font-medium ml-2">{project.client_name}</span>
                    </div>
                  )}
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3 text-gray-400" />
                        <span className="text-xs text-gray-500">Start</span>
                      </div>
                      <p className="text-sm font-medium">{project.start_date}</p>
                    </div>
                    <div>
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3 text-gray-400" />
                        <span className="text-xs text-gray-500">End</span>
                      </div>
                      <p className="text-sm font-medium">{project.end_date}</p>
                    </div>
                  </div>
                  
                  {project.budget && (
                    <div>
                      <div className="flex items-center gap-1">
                        <DollarSign className="h-3 w-3 text-gray-400" />
                        <span className="text-xs text-gray-500">Budget</span>
                      </div>
                      <p className="text-sm font-medium">
                        ${parseInt(project.budget).toLocaleString()}
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !error && projects.length === 0 && (
        <div className="text-center py-12">
          <FolderOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No projects found</h3>
          <p className="text-gray-500 mb-4">Get started by adding your first project.</p>
          <Button onClick={() => setShowCreateForm(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Project
          </Button>
        </div>
      )}
    </div>
  );
}