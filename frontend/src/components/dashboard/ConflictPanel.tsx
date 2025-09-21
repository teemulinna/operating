import React from 'react';
import { AlertTriangle, Clock, User, X, CheckCircle } from 'lucide-react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';

interface Conflict {
  id: string;
  type: 'over-allocation' | 'skill-mismatch' | 'time-conflict' | 'capacity-issue';
  severity: 'low' | 'medium' | 'high' | 'critical';
  employee: {
    id: string;
    name: string;
    department: string;
  };
  details: {
    allocatedHours?: number;
    capacity?: number;
    overAllocation?: number;
    conflictingProjects?: string[];
    missingSkills?: string[];
    description?: string;
  };
  suggestedActions: string[];
  createdAt: string;
}

interface ConflictPanelProps {
  conflicts: Conflict[];
  onResolve: (conflictId: string, action: string) => void;
  onViewDetails: (conflictId: string) => void;
  loading?: boolean;
}

export const ConflictPanel: React.FC<ConflictPanelProps> = ({
  conflicts,
  onResolve,
  onViewDetails,
  loading = false,
}) => {
  if (loading) {
    return (
      <div className="animate-pulse space-y-3">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-20 bg-gray-200 rounded"></div>
        ))}
      </div>
    );
  }

  if (!conflicts || conflicts.length === 0) {
    return (
      <div className="flex items-center justify-center h-32 text-gray-500">
        <div className="text-center">
          <CheckCircle className="h-8 w-8 text-green-500 mx-auto mb-2" />
          <div className="text-lg font-medium">No conflicts detected</div>
          <div className="text-sm">All resources are properly allocated</div>
        </div>
      </div>
    );
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-100 border-red-300 text-red-800';
      case 'high': return 'bg-orange-100 border-orange-300 text-orange-800';
      case 'medium': return 'bg-yellow-100 border-yellow-300 text-yellow-800';
      case 'low': return 'bg-blue-100 border-blue-300 text-blue-800';
      default: return 'bg-gray-100 border-gray-300 text-gray-800';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical': return <AlertTriangle className="h-5 w-5 text-red-500" />;
      case 'high': return <AlertTriangle className="h-5 w-5 text-orange-500" />;
      case 'medium': return <Clock className="h-5 w-5 text-yellow-500" />;
      case 'low': return <User className="h-5 w-5 text-blue-500" />;
      default: return <AlertTriangle className="h-5 w-5 text-gray-500" />;
    }
  };

  const getConflictTypeLabel = (type: string) => {
    switch (type) {
      case 'over-allocation': return 'Over-allocation';
      case 'skill-mismatch': return 'Skill Mismatch';
      case 'time-conflict': return 'Time Conflict';
      case 'capacity-issue': return 'Capacity Issue';
      default: return 'Resource Conflict';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Sort conflicts by severity
  const sortedConflicts = [...conflicts].sort((a, b) => {
    const severityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
    return (severityOrder[b.severity as keyof typeof severityOrder] || 0) - 
           (severityOrder[a.severity as keyof typeof severityOrder] || 0);
  });

  return (
    <div className="space-y-4" data-testid="conflict-panel">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">Resource Conflicts</h3>
        <Badge variant="destructive" className="text-xs">
          {conflicts.length} active
        </Badge>
      </div>

      <div className="space-y-3 max-h-96 overflow-y-auto">
        {sortedConflicts.map(conflict => (
          <div
            key={conflict.id}
            className={`p-4 rounded-lg border ${getSeverityColor(conflict.severity)}`}
            data-testid={`conflict-${conflict.id}`}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3">
                {getSeverityIcon(conflict.severity)}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-medium text-sm">
                      {getConflictTypeLabel(conflict.type)}
                    </h4>
                    <Badge 
                      variant={conflict.severity === 'critical' ? 'destructive' : 'secondary'}
                      className="text-xs px-1 py-0"
                    >
                      {conflict.severity}
                    </Badge>
                  </div>
                  
                  <div className="text-sm text-gray-700 mb-2">
                    <span className="font-medium">{conflict.employee.name}</span>
                    <span className="text-gray-500"> • {conflict.employee.department}</span>
                  </div>

                  {/* Conflict Details */}
                  <div className="text-sm text-gray-600 mb-3">
                    {conflict.type === 'over-allocation' && conflict.details.overAllocation && (
                      <div>
                        Over-allocated by {conflict.details.overAllocation}h 
                        ({conflict.details.allocatedHours}h / {conflict.details.capacity}h capacity)
                      </div>
                    )}
                    {conflict.details.description && (
                      <div>{conflict.details.description}</div>
                    )}
                    {conflict.details.conflictingProjects && (
                      <div className="mt-1">
                        Conflicting projects: {conflict.details.conflictingProjects.join(', ')}
                      </div>
                    )}
                    {conflict.details.missingSkills && (
                      <div className="mt-1">
                        Missing skills: {conflict.details.missingSkills.join(', ')}
                      </div>
                    )}
                  </div>

                  {/* Suggested Actions */}
                  {conflict.suggestedActions.length > 0 && (
                    <div className="space-y-1">
                      <div className="text-xs font-medium text-gray-500 mb-1">
                        Suggested actions:
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {conflict.suggestedActions.slice(0, 2).map((action, index) => (
                          <Button
                            key={index}
                            variant="outline"
                            size="sm"
                            className="text-xs h-6 px-2"
                            onClick={() => onResolve(conflict.id, action)}
                          >
                            {action}
                          </Button>
                        ))}
                        {conflict.suggestedActions.length > 2 && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-xs h-6 px-2"
                            onClick={() => onViewDetails(conflict.id)}
                          >
                            +{conflict.suggestedActions.length - 2} more
                          </Button>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="text-xs text-gray-400 mt-2">
                    {formatDate(conflict.createdAt)}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1 ml-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0"
                  onClick={() => onViewDetails(conflict.id)}
                  title="View details"
                >
                  <User className="h-3 w-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 text-gray-400 hover:text-red-500"
                  onClick={() => onResolve(conflict.id, 'dismiss')}
                  title="Dismiss conflict"
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Summary Stats */}
      <div className="flex items-center justify-between pt-3 border-t text-sm text-gray-600">
        <div className="flex items-center gap-4">
          <span>Critical: {conflicts.filter(c => c.severity === 'critical').length}</span>
          <span>High: {conflicts.filter(c => c.severity === 'high').length}</span>
          <span>Medium: {conflicts.filter(c => c.severity === 'medium').length}</span>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            // Handle bulk resolution or show all conflicts
            console.log('Show all conflicts');
          }}
        >
          View All
        </Button>
      </div>
    </div>
  );
};

export default ConflictPanel;
