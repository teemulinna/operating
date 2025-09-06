import React from 'react';
import { ArrowLeft, Edit, Trash2, Calendar, DollarSign, Users, Clock, AlertTriangle, CheckCircle, Tag, FileText, Activity } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useProject, useProjectTimeline, useProjectAssignments } from '@/hooks/useProjects';
import type { Project, ProjectTimelineEvent, ProjectAssignment } from '@/types/project';
import { PROJECT_STATUS_COLORS } from '@/types/project';

interface ProjectDetailProps {
  projectId: string;
  onEdit?: (project: Project) => void;
  onDelete?: (project: Project) => void;
  onBack?: () => void;
}

export function ProjectDetail({
  projectId,
  onEdit,
  onDelete,
  onBack
}: ProjectDetailProps) {
  const { data: project, isLoading, error, refetch } = useProject(projectId);
  const { data: timeline, isLoading: timelineLoading } = useProjectTimeline(projectId);
  const { data: assignments, isLoading: assignmentsLoading, error: assignmentsError } = useProjectAssignments(projectId);

  const formatCurrency = (amount?: number) => {
    if (!amount) return 'N/A';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    }).format(new Date(dateString));
  };

  const formatDateTime = (dateString: string) => {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date(dateString));
  };

  const getDaysRemainingText = () => {
    if (!project?.endDate || project?.status === 'completed') return null;
    
    if (project.isOverdue && project.daysRemaining !== undefined) {
      return `${Math.abs(project.daysRemaining)} days overdue`;
    }
    
    if (project.daysRemaining !== undefined && project.daysRemaining > 0) {
      return `${project.daysRemaining} days remaining`;
    }
    
    return null;
  };

  const getTimelineIcon = (type: ProjectTimelineEvent['type']) => {
    switch (type) {
      case 'created':
        return <Calendar className="h-4 w-4" />;
      case 'status_changed':
        return <Activity className="h-4 w-4" />;
      case 'team_updated':
        return <Users className="h-4 w-4" />;
      case 'budget_updated':
        return <DollarSign className="h-4 w-4" />;
      case 'milestone':
        return <CheckCircle className="h-4 w-4" />;
      case 'note_added':
        return <FileText className="h-4 w-4" />;
      default:
        return <Activity className="h-4 w-4" />;
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div data-testid="project-detail-skeleton" className="space-y-6">
        <Card>
          <CardContent className="p-6">
            <div className="animate-pulse space-y-4">
              <div className="h-8 bg-gray-200 rounded w-1/3"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
              <div className="h-16 bg-gray-200 rounded"></div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Error state
  if (error || !project) {
    return (
      <Card className="w-full">
        <CardContent className="pt-6">
          <div className="flex flex-col items-center justify-center py-12 text-center space-y-4">
            <div className="flex items-center justify-center w-16 h-16 rounded-full bg-red-100">
              <AlertTriangle className="w-8 h-8 text-red-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Error Loading Project
              </h3>
              <p className="text-gray-600 mb-4">
                {error?.message || 'Project not found or could not be loaded.'}
              </p>
              <div className="flex gap-2">
                <Button onClick={() => refetch()} variant="outline">
                  Try Again
                </Button>
                {onBack && (
                  <Button onClick={onBack} variant="outline">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Go Back
                  </Button>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-4 mb-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onBack}
                  aria-label="Go back"
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back
                </Button>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  PROJECT_STATUS_COLORS[project.status] || 'bg-gray-100 text-gray-800'
                }`}>
                  {project.status}
                </span>
              </div>
              
              <CardTitle className="text-3xl font-bold mb-2">
                {project.name}
              </CardTitle>
              
              <CardDescription className="text-base mb-4">
                Client: {project.clientName}
              </CardDescription>

              {project.description && (
                <p className="text-gray-600 mb-4">
                  {project.description}
                </p>
              )}

              {/* Tags */}
              {project.tags && project.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-4">
                  {project.tags.map((tag, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center px-2 py-1 rounded text-xs bg-blue-50 text-blue-700"
                    >
                      <Tag className="w-3 h-3 mr-1" />
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={() => onEdit?.(project)}
                aria-label="Edit project"
              >
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </Button>
              <Button
                variant="outline"
                onClick={() => onDelete?.(project)}
                className="text-red-600 hover:text-red-800"
                aria-label="Delete project"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </Button>
            </div>
          </div>

          {/* Status Alert */}
          {(project.isOverdue || project.isOverBudget) && (
            <div 
              data-testid="project-status-alert"
              className={`rounded-lg p-4 flex items-center gap-3 ${
                project.isOverdue 
                  ? 'bg-red-50 border border-red-200' 
                  : 'bg-orange-50 border border-orange-200'
              }`}
            >
              <AlertTriangle className={`h-5 w-5 ${
                project.isOverdue ? 'text-red-600' : 'text-orange-600'
              }`} />
              <div>
                <h4 className={`font-medium ${
                  project.isOverdue ? 'text-red-800' : 'text-orange-800'
                }`}>
                  {project.isOverdue ? 'Project Overdue' : 'Over Budget'}
                </h4>
                <p className={`text-sm ${
                  project.isOverdue ? 'text-red-600' : 'text-orange-600'
                }`}>
                  {project.isOverdue && getDaysRemainingText()}
                  {project.isOverBudget && 'This project has exceeded its allocated budget.'}
                </p>
              </div>
            </div>
          )}
        </CardHeader>
      </Card>

      {/* Project Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Budget Card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Budget</CardTitle>
            <DollarSign className="h-4 w-4 text-gray-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(project.budget)}</div>
            {project.budgetUtilization !== undefined && (
              <div className="mt-2">
                <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
                  <span>Utilized</span>
                  <span>{Math.round(project.budgetUtilization)}%</span>
                </div>
                <Progress value={project.budgetUtilization} className="h-2" />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Time Card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Time Progress</CardTitle>
            <Clock className="h-4 w-4 text-gray-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {project.billedHours || 0} / {project.totalHours || 0} hours
            </div>
            {project.timeProgress !== undefined && (
              <div className="mt-2">
                <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
                  <span>Progress</span>
                  <span>{Math.round(project.timeProgress)}%</span>
                </div>
                <Progress value={project.timeProgress} className="h-2" />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Team Card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Team</CardTitle>
            <Users className="h-4 w-4 text-gray-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{project.teamMembersCount || 0} team members</div>
            <p className="text-xs text-gray-600 mt-1">
              Active team size
            </p>
          </CardContent>
        </Card>

        {/* Timeline Card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Timeline</CardTitle>
            <Calendar className="h-4 w-4 text-gray-600" />
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              <div className="text-sm">
                <span className="text-gray-600">Start:</span> {formatDate(project.startDate)}
              </div>
              <div className="text-sm">
                <span className="text-gray-600">End:</span> {formatDate(project.endDate)}
              </div>
              {getDaysRemainingText() && (
                <div className={`text-sm font-medium ${
                  project.isOverdue ? 'text-red-600' : 'text-blue-600'
                }`}>
                  {getDaysRemainingText()}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Project Details */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Project Information */}
        <Card>
          <CardHeader>
            <CardTitle>Project Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="font-medium text-sm text-gray-700 mb-1">Hourly Rate</h4>
              <p className="text-lg">{formatCurrency(project.hourlyRate)}/hour</p>
            </div>

            <div>
              <h4 className="font-medium text-sm text-gray-700 mb-1">Created</h4>
              <p>{formatDate(project.createdAt)}</p>
            </div>

            <div>
              <h4 className="font-medium text-sm text-gray-700 mb-1">Last Updated</h4>
              <p>{formatDate(project.updatedAt)}</p>
            </div>

            {project.notes && (
              <div>
                <h4 className="font-medium text-sm text-gray-700 mb-1">Notes</h4>
                <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-md">
                  {project.notes}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Project Timeline */}
        <Card>
          <CardHeader>
            <CardTitle>Project Timeline</CardTitle>
          </CardHeader>
          <CardContent>
            {timelineLoading ? (
              <p className="text-gray-500">Loading timeline...</p>
            ) : !timeline || timeline.length === 0 ? (
              <p className="text-gray-500">No timeline events yet</p>
            ) : (
              <div className="space-y-4">
                {timeline.slice(0, 5).map((event) => (
                  <div key={event.id} className="flex items-start space-x-3">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                        {getTimelineIcon(event.type)}
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-gray-900">
                          {event.title}
                        </p>
                        <p className="text-xs text-gray-500">
                          {formatDate(event.date)}
                        </p>
                      </div>
                      {event.description && (
                        <p className="text-sm text-gray-600 mt-1">
                          {event.description}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
                
                {timeline.length > 5 && (
                  <p className="text-sm text-gray-500 text-center pt-2">
                    And {timeline.length - 5} more events...
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Team Assignments Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Team Assignments</CardTitle>
            <Button size="sm">
              Add Team Member
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {assignmentsLoading ? (
            <p className="text-gray-500">Loading assignments...</p>
          ) : assignmentsError ? (
            <p className="text-red-600">Failed to load team assignments</p>
          ) : !assignments || assignments.length === 0 ? (
            <p className="text-gray-500">No team members assigned yet</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {assignments.map((assignment) => (
                <div 
                  key={assignment.id} 
                  data-testid="assignment-card"
                  className={`p-4 border rounded-lg ${
                    assignment.isActive ? 'border-gray-200' : 'border-gray-200 opacity-60'
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h4 className="font-medium">
                        {assignment.employee?.firstName} {assignment.employee?.lastName}
                      </h4>
                      <p className="text-sm text-gray-600">{assignment.employee?.position}</p>
                    </div>
                    <div className="flex gap-1">
                      <Button size="icon" variant="ghost" aria-label="Edit assignment">
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button size="icon" variant="ghost" aria-label="Remove from project">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        assignment.role === 'manager' ? 'bg-purple-100 text-purple-800' :
                        assignment.role === 'developer' ? 'bg-blue-100 text-blue-800' :
                        assignment.role === 'designer' ? 'bg-pink-100 text-pink-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {assignment.role}
                      </span>
                      <span className="text-sm font-medium">{assignment.utilizationPercentage}%</span>
                    </div>
                    
                    <div className="flex justify-between text-sm text-gray-600">
                      <span>{assignment.actualHours || 0} / {assignment.estimatedHours || 0} hrs</span>
                      <span>${assignment.hourlyRate}/hr</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}