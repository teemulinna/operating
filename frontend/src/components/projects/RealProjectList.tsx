import React from 'react';
import { useProjects, useCreateProject } from '../../hooks/useRealProjects';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { ProjectDialog } from './ProjectDialog';
import { FolderOpen, AlertTriangle, Plus, Loader2, Calendar, DollarSign } from 'lucide-react';

export function RealProjectList() {
  const [dialogState, setDialogState] = React.useState({ isOpen: false, mode: 'create' as const });
  const { data: projectsResponse, isLoading, error, refetch } = useProjects();
  const createProjectMutation = useCreateProject();
  
  const projects = projectsResponse?.data || [];

  const handleCloseDialog = () => {
    setDialogState({ isOpen: false, mode: 'create' });
  };

  const handleCreateTestProject = async () => {
    try {
      await createProjectMutation.mutateAsync({
        name: `Test Project ${Date.now()}`,
        description: 'A test project created from the frontend',
        status: 'planning',
        startDate: new Date().toISOString(),
        endDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(), // 90 days from now
        budget: 50000,
        priority: 'medium',
        clientName: 'Test Client'
      });
    } catch (error) {
      console.error('Failed to create project:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center space-x-2">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span>Loading projects from real backend...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <Card className="border-red-200">
          <CardHeader>
            <CardTitle className="text-red-700 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Error Loading Projects
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-red-600 mb-4">
              Unable to fetch project data from the real backend (http://localhost:3001/api/projects).
            </p>
            <div className="bg-gray-50 rounded p-3 text-sm text-gray-600 mb-4">
              <strong>Error:</strong> {error instanceof Error ? error.message : 'Unknown error'}
            </div>
            <div className="flex gap-2">
              <Button onClick={() => refetch()} variant="outline">
                Retry
              </Button>
              <Button onClick={() => window.open('http://localhost:3001/api/projects', '_blank')} variant="outline">
                Test API Directly
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800 border-green-300';
      case 'planning': return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'completed': return 'bg-gray-100 text-gray-800 border-gray-300';
      case 'inactive': return 'bg-red-100 text-red-800 border-red-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800 border-red-300';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'low': return 'bg-green-100 text-green-800 border-green-300';
      case 'critical': return 'bg-purple-100 text-purple-800 border-purple-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <FolderOpen className="h-6 w-6" />
            Real Project Data
          </h1>
          <p className="text-gray-600">
            Connected to real backend API at http://localhost:3001/api/projects
          </p>
        </div>
        <Button 
          onClick={() => setDialogState({ isOpen: true, mode: 'create' })}
          size="sm"
          data-testid="add-project-btn"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Project
        </Button>
      </div>

      {/* API Status Card */}
      <Card className="border-green-200">
        <CardContent className="pt-6">
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
            <div>
              <p className="font-medium text-green-800">API Connection Active</p>
              <p className="text-sm text-green-600">
                Loaded {projects.length} projects from real database
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Project Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Total Projects
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{projects.length}</div>
            <p className="text-xs text-gray-500">From real backend</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Active Projects
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {projects.filter(p => p.status === 'active').length}
            </div>
            <p className="text-xs text-gray-500">Currently active</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Planning Phase
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {projects.filter(p => p.status === 'planning').length}
            </div>
            <p className="text-xs text-gray-500">In planning</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Total Budget
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">
              ${projects.reduce((sum, p) => sum + (p.budget || 0), 0).toLocaleString()}
            </div>
            <p className="text-xs text-gray-500">Combined budget</p>
          </CardContent>
        </Card>
      </div>

      {/* Project List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {projects.map((project) => (
          <Card key={project.id} className="hover:shadow-lg transition-shadow" data-testid="project-card">
            <CardHeader className="pb-3">
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
            <CardContent className="space-y-3">
              {project.clientName && (
                <div>
                  <p className="text-sm font-medium text-gray-700">Client</p>
                  <p className="text-sm text-gray-600">{project.clientName}</p>
                </div>
              )}
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-sm font-medium text-gray-700 flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    Start Date
                  </p>
                  <p className="text-sm text-gray-600">{project.startDate}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-700 flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    End Date
                  </p>
                  <p className="text-sm text-gray-600">{project.endDate}</p>
                </div>
              </div>
              
              {project.budget && (
                <div>
                  <p className="text-sm font-medium text-gray-700 flex items-center gap-1">
                    <DollarSign className="h-3 w-3" />
                    Budget
                  </p>
                  <p className="text-sm text-gray-600">
                    ${project.budget.toLocaleString()}
                  </p>
                </div>
              )}
              
              <div className="grid grid-cols-2 gap-3 text-xs text-gray-500">
                <div>
                  <span className="font-medium">Assigned:</span> {project.assignedEmployees}
                </div>
                <div>
                  <span className="font-medium">Hours:</span> {project.actualHours}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {projects.length === 0 && (
        <Card>
          <CardContent className="text-center py-12">
            <FolderOpen className="w-16 h-16 mx-auto text-gray-300 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No projects found</h3>
            <p className="text-gray-500 mb-4">
              The backend database appears to be empty. Add some test data to see it here.
            </p>
            <Button onClick={() => setDialogState({ isOpen: true, mode: 'create' })} data-testid="add-first-project-btn">
              <Plus className="h-4 w-4 mr-2" />
              Add Project
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Debug Info */}
      <Card className="bg-gray-50">
        <CardHeader>
          <CardTitle className="text-sm">Debug Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-xs space-y-1 text-gray-600">
            <p><strong>API Endpoint:</strong> http://localhost:3001/api/projects</p>
            <p><strong>Response Status:</strong> Success</p>
            <p><strong>Total Records:</strong> {projectsResponse?.pagination?.totalItems || 0}</p>
            <p><strong>Current Page:</strong> {projectsResponse?.pagination?.currentPage || 1}</p>
            <p><strong>Last Updated:</strong> {new Date().toLocaleString()}</p>
          </div>
        </CardContent>
      </Card>

      <ProjectDialog
        isOpen={dialogState.isOpen}
        onClose={handleCloseDialog}
        mode={dialogState.mode}
      />
    </div>
  );
}