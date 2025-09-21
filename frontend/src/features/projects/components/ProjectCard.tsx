import React from 'react';
import { Button } from '../../../components/ui/button';
import { Project, PROJECT_STATUS_COLORS, PROJECT_PRIORITY_COLORS } from '../../../types/project';
import { PencilIcon, TrashIcon, CalendarIcon, UserIcon } from '@heroicons/react/24/outline';

interface ProjectCardProps {
  project: Project;
  onEdit: (project: Project) => void;
  onDelete: (project: Project) => void;
}

export function ProjectCard({ project, onEdit, onDelete }: ProjectCardProps) {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatCurrency = (amount?: number) => {
    if (!amount) return null;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div
      className="bg-white overflow-hidden shadow rounded-lg hover:shadow-md transition-shadow"
      data-testid={`project-${project.id}`}
    >
      <div className="p-6">
        {/* Header with Title and Actions */}
        <div className="flex justify-between items-start mb-4">
          <div className="flex-1 min-w-0">
            <h3
              className="text-lg font-medium text-gray-900 truncate"
              data-testid={`project-name-${project.id}`}
            >
              {project.name}
            </h3>
            {project.clientName && (
              <div className="flex items-center mt-1 text-sm text-gray-500">
                <UserIcon className="h-4 w-4 mr-1" />
                <span data-testid={`project-client-${project.id}`}>{project.clientName}</span>
              </div>
            )}
          </div>
          <div className="flex space-x-1 ml-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onEdit(project)}
              data-testid={`edit-project-${project.id}`}
              aria-label="Edit project"
              className="h-8 w-8"
            >
              <PencilIcon className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onDelete(project)}
              data-testid={`delete-project-${project.id}`}
              aria-label="Delete project"
              className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
            >
              <TrashIcon className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Description */}
        {project.description && (
          <p
            className="text-sm text-gray-600 mb-4 line-clamp-2"
            data-testid={`project-description-${project.id}`}
          >
            {project.description}
          </p>
        )}

        {/* Status and Priority Badges */}
        <div className="flex flex-wrap gap-2 mb-4">
          <span
            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
              PROJECT_STATUS_COLORS[project.status]
            }`}
            data-testid={`project-status-${project.id}`}
          >
            {project.status.charAt(0).toUpperCase() + project.status.slice(1)}
          </span>
          <span
            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
              PROJECT_PRIORITY_COLORS[project.priority]
            }`}
            data-testid={`project-priority-${project.id}`}
          >
            {project.priority.charAt(0).toUpperCase() + project.priority.slice(1)}
          </span>
        </div>

        {/* Project Dates */}
        <div className="flex items-center text-sm text-gray-500 mb-4">
          <CalendarIcon className="h-4 w-4 mr-1" />
          <span data-testid={`project-dates-${project.id}`}>
            {formatDate(project.startDate)}
            {project.endDate && (
              <>
                {' - '}
                {formatDate(project.endDate)}
              </>
            )}
          </span>
        </div>

        {/* Budget and Progress */}
        {(project.budget || project.timeProgress !== undefined) && (
          <div className="space-y-2">
            {project.budget && (
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-500">Budget:</span>
                <span
                  className={`font-medium ${project.isOverBudget ? 'text-red-600' : 'text-gray-900'}`}
                  data-testid={`project-budget-${project.id}`}
                >
                  {formatCurrency(project.budget)}
                </span>
              </div>
            )}
            {project.timeProgress !== undefined && (
              <div className="space-y-1">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-500">Progress:</span>
                  <span className="font-medium" data-testid={`project-progress-${project.id}`}>
                    {Math.round(project.timeProgress)}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all ${
                      project.timeProgress > 100
                        ? 'bg-red-600'
                        : project.timeProgress > 80
                        ? 'bg-orange-500'
                        : 'bg-blue-600'
                    }`}
                    style={{ width: `${Math.min(project.timeProgress, 100)}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Team Information */}
        {(project.assignedEmployees !== undefined || project.totalRoles !== undefined) && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="grid grid-cols-2 gap-4 text-sm">
              {project.assignedEmployees !== undefined && (
                <div>
                  <span className="text-gray-500">Team:</span>
                  <span className="ml-1 font-medium" data-testid={`project-team-${project.id}`}>
                    {project.assignedEmployees} members
                  </span>
                </div>
              )}
              {project.totalRoles !== undefined && (
                <div>
                  <span className="text-gray-500">Roles:</span>
                  <span className="ml-1 font-medium" data-testid={`project-roles-${project.id}`}>
                    {project.filledRoles || 0}/{project.totalRoles}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Overdue Warning */}
        {project.isOverdue && (
          <div className="mt-3 p-2 bg-red-100 border border-red-200 rounded text-sm text-red-800">
            <span className="font-medium">⚠️ Overdue:</span> This project has passed its end date.
          </div>
        )}

        {/* Days Remaining */}
        {project.daysRemaining !== undefined && project.daysRemaining > 0 && !project.isOverdue && (
          <div className="mt-3 text-sm text-gray-500" data-testid={`project-days-remaining-${project.id}`}>
            {project.daysRemaining} days remaining
          </div>
        )}
      </div>
    </div>
  );
}