import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Calendar, BarChart3, Users, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import GanttChart from '@/components/gantt/GanttChart';
import { useGanttData } from '@/components/gantt/hooks/useGanttData';
import { GanttProject, GanttTask } from '@/components/gantt/types';

export const GanttPage: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const [selectedTab, setSelectedTab] = useState('gantt');

  const {
    project,
    tasks,
    resources,
    criticalPath,
    resourceConflicts,
    resourceUtilization,
    isLoading,
    error,
    updateTask,
    deleteTask,
    updateProject,
    refresh,
  } = useGanttData({
    projectId: projectId || '',
    autoRefresh: true,
    refreshInterval: 30000,
  });

  if (isLoading) {
    return (
      <div className="container mx-auto py-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-gray-600">Loading Gantt chart...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto py-8">
        <Card>
          <CardContent className="py-8">
            <div className="text-center">
              <div className="text-red-500 mb-4">
                <BarChart3 className="w-16 h-16 mx-auto" />
              </div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                Failed to Load Project
              </h2>
              <p className="text-gray-600 mb-4">{error.message}</p>
              <div className="space-x-2">
                <Button onClick={() => navigate('/projects')} variant="outline">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Projects
                </Button>
                <Button onClick={refresh}>
                  Try Again
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="container mx-auto py-8">
        <Card>
          <CardContent className="py-8">
            <div className="text-center">
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                Project Not Found
              </h2>
              <p className="text-gray-600 mb-4">
                The project you're looking for doesn't exist or has been deleted.
              </p>
              <Button onClick={() => navigate('/projects')} variant="outline">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Projects
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const handleTaskUpdate = async (task: GanttTask) => {
    try {
      await updateTask(task);
    } catch (error) {
      console.error('Failed to update task:', error);
    }
  };


  const handleTaskDelete = async (taskId: string) => {
    try {
      await deleteTask(taskId);
    } catch (error) {
      console.error('Failed to delete task:', error);
    }
  };

  const handleProjectUpdate = async (updates: Partial<GanttProject>) => {
    try {
      await updateProject(updates);
    } catch (error) {
      console.error('Failed to update project:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button
                onClick={() => navigate('/projects')}
                variant="ghost"
                size="sm"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Projects
              </Button>
              
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{project.name}</h1>
                {project.description && (
                  <p className="text-gray-600 mt-1">{project.description}</p>
                )}
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <Badge
                variant={
                  project.status === 'active' ? 'default' :
                  project.status === 'completed' ? 'secondary' :
                  project.status === 'on-hold' ? 'outline' : 'destructive'
                }
              >
                {project.status}
              </Badge>
              
              <Badge
                variant={
                  project.priority === 'critical' ? 'destructive' :
                  project.priority === 'high' ? 'destructive' :
                  project.priority === 'medium' ? 'default' : 'secondary'
                }
              >
                {project.priority} priority
              </Badge>
            </div>
          </div>
          
          {/* Project stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <Calendar className="w-4 h-4" />
              <span>
                {new Date(project.startDate).toLocaleDateString()} - {' '}
                {project.endDate ? new Date(project.endDate).toLocaleDateString() : 'Ongoing'}
              </span>
            </div>
            
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <BarChart3 className="w-4 h-4" />
              <span>{Math.round(project.progress)}% Complete</span>
            </div>
            
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <Users className="w-4 h-4" />
              <span>{resources.length} Resources</span>
            </div>
            
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <Clock className="w-4 h-4" />
              <span>{tasks.length} Tasks</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="container mx-auto p-6">
        <Tabs value={selectedTab} onValueChange={setSelectedTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="gantt">Gantt Chart</TabsTrigger>
            <TabsTrigger value="resources">Resources</TabsTrigger>
            <TabsTrigger value="analysis">Analysis</TabsTrigger>
            <TabsTrigger value="reports">Reports</TabsTrigger>
          </TabsList>

          <TabsContent value="gantt" className="space-y-4">
            <GanttChart
              project={project}
              onTaskUpdate={handleTaskUpdate}
              onTaskDelete={handleTaskDelete}
              onProjectUpdate={handleProjectUpdate}
              showToolbar={true}
              height={600}
              realTimeUpdates={true}
            />
          </TabsContent>

          <TabsContent value="resources" className="space-y-4">
            <div className="grid gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Resource Utilization</CardTitle>
                </CardHeader>
                <CardContent>
                  {resourceUtilization.length > 0 ? (
                    <div className="space-y-4">
                      {resourceUtilization.map((resource) => (
                        <div key={resource.resourceId} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                          <div>
                            <h4 className="font-medium">{resource.resourceName}</h4>
                            <p className="text-sm text-gray-600">
                              {resource.totalAllocated.toFixed(1)}h / {resource.totalCapacity.toFixed(1)}h capacity
                            </p>
                          </div>
                          <div className="text-right">
                            <div className="text-lg font-semibold">
                              {Math.round(resource.utilizationRate)}%
                            </div>
                            <div className={`text-sm ${
                              resource.utilizationRate > 100 ? 'text-red-600' :
                              resource.utilizationRate > 80 ? 'text-orange-600' :
                              'text-green-600'
                            }`}>
                              {resource.utilizationRate > 100 ? 'Over-allocated' :
                               resource.utilizationRate > 80 ? 'High usage' : 'Available'}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-center text-gray-600 py-8">
                      No resource utilization data available
                    </p>
                  )}
                </CardContent>
              </Card>

              {resourceConflicts.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-red-600">Resource Conflicts</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {resourceConflicts.map((conflict, index) => (
                        <div key={index} className="p-4 bg-red-50 border-l-4 border-red-400 rounded-r">
                          <div className="flex items-center justify-between">
                            <div>
                              <h4 className="font-medium text-red-800">{conflict.resourceName}</h4>
                              <p className="text-sm text-red-600">
                                {conflict.date.toLocaleDateString()} - {conflict.totalAllocation}% allocated
                              </p>
                            </div>
                            <Badge variant="destructive">{conflict.severity}</Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          <TabsContent value="analysis" className="space-y-4">
            <div className="grid gap-6">
              {criticalPath && (
                <Card>
                  <CardHeader>
                    <CardTitle>Critical Path Analysis</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="grid grid-cols-3 gap-4 text-center">
                        <div>
                          <div className="text-2xl font-bold text-blue-600">{criticalPath.projectDuration}</div>
                          <div className="text-sm text-gray-600">Days Duration</div>
                        </div>
                        <div>
                          <div className="text-2xl font-bold text-red-600">{criticalPath.criticalPath.length}</div>
                          <div className="text-sm text-gray-600">Critical Tasks</div>
                        </div>
                        <div>
                          <div className="text-2xl font-bold text-green-600">
                            {Math.round(((tasks.length - criticalPath.criticalPath.length) / tasks.length) * 100)}%
                          </div>
                          <div className="text-sm text-gray-600">Buffer Tasks</div>
                        </div>
                      </div>
                      
                      <div className="pt-4 border-t">
                        <h5 className="font-medium mb-3">Critical Path Tasks:</h5>
                        <div className="space-y-2">
                          {criticalPath.criticalPath.map(taskId => {
                            const task = tasks.find(t => t.id === taskId);
                            return task ? (
                              <div key={taskId} className="flex items-center justify-between p-3 bg-red-50 rounded">
                                <span className="font-medium">{task.name}</span>
                                <Badge variant="destructive">Critical</Badge>
                              </div>
                            ) : null;
                          })}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              <Card>
                <CardHeader>
                  <CardTitle>Project Progress</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${project.progress}%` }}
                      />
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <div className="font-medium">Not Started</div>
                        <div className="text-gray-600">
                          {tasks.filter(t => t.status === 'not-started').length} tasks
                        </div>
                      </div>
                      <div>
                        <div className="font-medium">In Progress</div>
                        <div className="text-gray-600">
                          {tasks.filter(t => t.status === 'in-progress').length} tasks
                        </div>
                      </div>
                      <div>
                        <div className="font-medium">Completed</div>
                        <div className="text-gray-600">
                          {tasks.filter(t => t.status === 'completed').length} tasks
                        </div>
                      </div>
                      <div>
                        <div className="font-medium">On Hold</div>
                        <div className="text-gray-600">
                          {tasks.filter(t => t.status === 'on-hold').length} tasks
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="reports" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Coming Soon</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 text-center py-8">
                  Advanced reporting features are being developed. This will include:
                </p>
                <ul className="list-disc list-inside space-y-2 text-gray-600 max-w-md mx-auto">
                  <li>Project performance reports</li>
                  <li>Resource utilization trends</li>
                  <li>Budget vs. actual analysis</li>
                  <li>Timeline variance reports</li>
                  <li>Custom report builder</li>
                </ul>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default GanttPage;