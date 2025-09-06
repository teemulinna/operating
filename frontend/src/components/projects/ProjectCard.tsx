import React from 'react';
import { Calendar, Users, Edit, Trash2, DollarSign, Clock, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import type { Project } from '@/types/project';
import { PROJECT_STATUS_COLORS } from '@/types/project';

interface ProjectCardProps {
  project: Project;
  onClick?: (project: Project) => void;
  onEdit?: (project: Project) => void;
  onDelete?: (project: Project) => void;
  onStatusChange?: (project: Project, newStatus: Project['status']) => void;
  compact?: boolean;
  showActions?: boolean;
}

export function ProjectCard({
  project,
  onClick,
  onEdit,
  onDelete,
  onStatusChange,
  compact = false,
  showActions = true,
}: ProjectCardProps) {
  const handleCardClick = () => {
    onClick?.(project);
  };

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    onEdit?.(project);
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete?.(project);
  };

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

  const getDaysRemainingText = () => {
    if (!project.endDate || project.status === 'completed') return null;
    
    if (project.isOverdue && project.daysRemaining !== undefined) {
      return `${Math.abs(project.daysRemaining)} days overdue`;
    }
    
    if (project.daysRemaining !== undefined && project.daysRemaining > 0) {
      return `${project.daysRemaining} days remaining`;
    }
    
    return null;
  };

  const getCardBorderClass = () => {
    if (project.isOverdue) return 'border-red-200';
    if (project.isOverBudget) return 'border-orange-200';
    return 'border-gray-200';
  };

  const getStatusBadgeClass = () => {
    return PROJECT_STATUS_COLORS[project.status] || 'bg-gray-100 text-gray-800';
  };

  return (
    <Card 
      className={`cursor-pointer hover:shadow-md transition-shadow duration-200 ${getCardBorderClass()}`}
      onClick={handleCardClick}
      data-testid="project-card"
    >
      <CardHeader className={`pb-3 ${compact ? 'pb-2' : ''}`}>
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-lg text-gray-900 truncate mb-1">
              {project.name}
            </h3>
            <p className="text-sm text-gray-600 mb-2">
              {project.clientName}
            </p>
            {!compact && project.description && (
              <p className="text-sm text-gray-500 line-clamp-2 mb-3">
                {project.description}
              </p>
            )}
          </div>
          {showActions && (
            <div className="flex items-center gap-1 ml-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={handleEdit}
                aria-label="Edit project"
                className="h-8 w-8"
              >
                <Edit className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleDelete}
                aria-label="Delete project"
                className="h-8 w-8 text-red-600 hover:text-red-800"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>

        {/* Status and key indicators */}
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadgeClass()}`}>
            {project.status}
          </span>
          
          {project.isOverdue && (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
              <AlertTriangle className="w-3 h-3 mr-1" />
              Overdue
            </span>
          )}
          
          {project.isOverBudget && (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
              <DollarSign className="w-3 h-3 mr-1" />
              Over budget
            </span>
          )}
        </div>

        {/* Tags */}
        {project.tags && project.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {project.tags.slice(0, compact ? 2 : 4).map((tag, index) => (
              <span
                key={index}
                className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-blue-50 text-blue-700"
              >
                {tag}
              </span>
            ))}
            {project.tags.length > (compact ? 2 : 4) && (
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-gray-50 text-gray-500">
                +{project.tags.length - (compact ? 2 : 4)} more
              </span>
            )}
          </div>
        )}
      </CardHeader>

      {!compact && (
        <CardContent className="pt-0">
          {/* Budget and progress info */}
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <div className="flex items-center text-sm text-gray-500 mb-1">
                <DollarSign className="w-4 h-4 mr-1" />
                Budget
              </div>
              <div className="text-lg font-medium">
                {formatCurrency(project.budget)}
              </div>
              {project.budgetUtilization !== undefined && (
                <div className="mt-2">
                  <div className="flex justify-between text-sm text-gray-600 mb-1">
                    <span>Progress</span>
                    <span>{Math.round(project.budgetUtilization)}%</span>
                  </div>
                  <Progress 
                    value={project.budgetUtilization} 
                    className="h-2"
                  />
                </div>
              )}
            </div>

            <div>
              <div className="flex items-center text-sm text-gray-500 mb-1">
                <Users className="w-4 h-4 mr-1" />
                Team
              </div>
              <div className="text-lg font-medium">
                {project.teamMembersCount || 0} members
              </div>
            </div>
          </div>

          {/* Timeline info */}
          <div className="flex items-center justify-between text-sm text-gray-500">
            <div className="flex items-center">
              <Calendar className="w-4 h-4 mr-1" />
              {formatDate(project.startDate)}
              {project.endDate && (
                <>
                  <span className="mx-1">–</span>
                  {formatDate(project.endDate)}
                </>
              )}
            </div>
            
            {getDaysRemainingText() && (
              <div className={`flex items-center ${
                project.isOverdue ? 'text-red-600' : 'text-gray-600'
              }`}>
                <Clock className="w-4 h-4 mr-1" />
                {getDaysRemainingText()}
              </div>
            )}
          </div>
        </CardContent>
      )}

      {/* Compact view info */}
      {compact && (
        <CardContent className="pt-0">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center text-gray-500">
              <Users className="w-4 h-4 mr-1" />
              {project.teamMembersCount || 0} members
            </div>
            <div className="flex items-center text-gray-500">
              <DollarSign className="w-4 h-4 mr-1" />
              {formatCurrency(project.budget)}
            </div>
            {getDaysRemainingText() && (
              <div className={`flex items-center ${
                project.isOverdue ? 'text-red-600' : 'text-gray-600'
              }`}>
                <Clock className="w-4 h-4 mr-1" />
                {getDaysRemainingText()}
              </div>
            )}
          </div>
        </CardContent>
      )}
    </Card>
  );
}