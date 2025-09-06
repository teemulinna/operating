// Pipeline Project Card Component
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { 
  MoreVertical, 
  Edit, 
  Sync, 
  DollarSign, 
  Calendar, 
  Users, 
  AlertTriangle, 
  TrendingUp,
  Clock,
  Target,
  Loader2
} from 'lucide-react';
import {
  PipelineProject,
  PIPELINE_PRIORITY_COLORS,
  SYNC_STATUS_COLORS,
  formatCurrency,
  formatPercentage,
  calculateWeightedValue,
  getDaysUntilStart,
  getProjectRiskScore,
  getAvailabilityColor,
  isProjectOverdue
} from '@/types/pipeline';

interface PipelineProjectCardProps {
  project: PipelineProject;
  onClick?: () => void;
  onEdit?: () => void;
  onSync?: (crmSystemId: string) => void;
  isSyncing?: boolean;
}

export const PipelineProjectCard: React.FC<PipelineProjectCardProps> = ({
  project,
  onClick,
  onEdit,
  onSync,
  isSyncing = false
}) => {
  const weightedValue = calculateWeightedValue(project);
  const daysUntilStart = getDaysUntilStart(project.estimatedStartDate);
  const riskScore = getProjectRiskScore(project);
  const overdue = isProjectOverdue(project);
  
  const handleCardClick = (e: React.MouseEvent) => {
    // Prevent click when clicking on dropdown or buttons
    if ((e.target as HTMLElement).closest('.dropdown-trigger') ||
        (e.target as HTMLElement).closest('button')) {
      return;
    }
    onClick?.();
  };

  return (
    <Card 
      className="cursor-pointer hover:shadow-md transition-shadow duration-200 bg-white border-l-4 border-l-blue-500"
      onClick={handleCardClick}
    >
      <CardContent className="p-4 space-y-3">
        {/* Header with title and actions */}
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <h4 className="font-semibold text-sm truncate pr-2" title={project.name}>
              {project.name}
            </h4>
            <p className="text-xs text-gray-600 truncate" title={project.clientName}>
              {project.clientName}
            </p>
          </div>
          
          <div className="flex items-center space-x-1">
            {/* Sync Status */}
            <div className={`w-2 h-2 rounded-full ${
              project.syncStatus === 'synced' ? 'bg-green-500' :
              project.syncStatus === 'pending' ? 'bg-yellow-500' :
              project.syncStatus === 'failed' ? 'bg-red-500' :
              'bg-orange-500'
            }`} title={`Sync Status: ${project.syncStatus}`} />
            
            {/* Actions Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="w-6 h-6 p-0 dropdown-trigger"
                  disabled={isSyncing}
                >
                  {isSyncing ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <MoreVertical className="w-3 h-3" />
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-40">
                <DropdownMenuItem onClick={onEdit}>
                  <Edit className="w-3 h-3 mr-2" />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onSync?.('default')}>
                  <Sync className="w-3 h-3 mr-2" />
                  Sync to CRM
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Priority and Status Badges */}
        <div className="flex items-center space-x-2">
          <Badge 
            variant="outline" 
            className={`${PIPELINE_PRIORITY_COLORS[project.priority]} text-xs px-2 py-0.5`}
          >
            {project.priority}
          </Badge>
          {overdue && (
            <Badge variant="destructive" className="text-xs px-2 py-0.5">
              Overdue
            </Badge>
          )}
          {riskScore > 50 && (
            <Badge variant="outline" className="text-red-600 border-red-300 text-xs px-2 py-0.5">
              High Risk
            </Badge>
          )}
        </div>

        {/* Key Metrics */}
        <div className="space-y-2">
          {/* Value and Probability */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-1">
              <DollarSign className="w-3 h-3 text-green-600" />
              <span className="text-sm font-medium">
                {formatCurrency(project.estimatedValue)}
              </span>
            </div>
            <div className="flex items-center space-x-1">
              <Target className="w-3 h-3 text-blue-600" />
              <span className="text-sm">
                {formatPercentage(project.probability)}
              </span>
            </div>
          </div>

          {/* Weighted Value */}
          <div className="flex items-center space-x-1">
            <TrendingUp className="w-3 h-3 text-purple-600" />
            <span className="text-xs text-gray-600">Weighted:</span>
            <span className="text-xs font-medium">
              {formatCurrency(weightedValue)}
            </span>
          </div>

          {/* Timeline */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-1">
              <Calendar className="w-3 h-3 text-orange-600" />
              <span className="text-xs text-gray-600">
                {daysUntilStart >= 0 
                  ? `${daysUntilStart}d to start`
                  : `Started ${Math.abs(daysUntilStart)}d ago`
                }
              </span>
            </div>
            <div className="flex items-center space-x-1">
              <Clock className="w-3 h-3 text-gray-500" />
              <span className="text-xs text-gray-600">
                {project.estimatedDuration}d
              </span>
            </div>
          </div>

          {/* Resource Requirements */}
          {project.resourceDemand && project.resourceDemand.length > 0 && (
            <div className="flex items-center space-x-1">
              <Users className="w-3 h-3 text-indigo-600" />
              <span className="text-xs text-gray-600">
                {project.resourceDemand.length} role{project.resourceDemand.length !== 1 ? 's' : ''}
              </span>
              {project.availabilityScore !== undefined && (
                <span className={`text-xs font-medium ml-1 ${getAvailabilityColor(project.availabilityScore)}`}>
                  ({formatPercentage(project.availabilityScore)} available)
                </span>
              )}
            </div>
          )}
        </div>

        {/* Risk Indicators */}
        {riskScore > 25 && (
          <div className="flex items-center space-x-1 bg-red-50 px-2 py-1 rounded">
            <AlertTriangle className="w-3 h-3 text-red-500" />
            <span className="text-xs text-red-700">
              Risk Score: {Math.round(riskScore)}%
            </span>
          </div>
        )}

        {/* Skills Preview */}
        {project.requiredSkills && project.requiredSkills.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {project.requiredSkills.slice(0, 3).map((skill, index) => (
              <Badge key={index} variant="outline" className="text-xs px-1.5 py-0.5">
                {skill}
              </Badge>
            ))}
            {project.requiredSkills.length > 3 && (
              <Badge variant="outline" className="text-xs px-1.5 py-0.5">
                +{project.requiredSkills.length - 3}
              </Badge>
            )}
          </div>
        )}

        {/* Notes Preview */}
        {project.notes && (
          <div className="bg-yellow-50 px-2 py-1 rounded border-l-2 border-yellow-300">
            <p className="text-xs text-yellow-800 truncate">
              {project.notes}
            </p>
          </div>
        )}

        {/* Footer with sync info */}
        <div className="flex items-center justify-between pt-1 border-t border-gray-100">
          <div className="text-xs text-gray-500">
            {project.lastSyncAt ? (
              `Synced ${new Date(project.lastSyncAt).toLocaleDateString()}`
            ) : (
              'Not synced'
            )}
          </div>
          {project.crmId && (
            <Badge variant="outline" className="text-xs">
              CRM: {project.crmId.slice(-6)}
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default PipelineProjectCard;