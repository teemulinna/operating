import React from 'react';
import { AlertTriangle, X, ChevronRight } from 'lucide-react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';

interface OverAllocationAlert {
  employeeId: string;
  employeeName: string;
  weekStart: string;
  weekEnd: string;
  allocatedHours: number;
  capacity: number;
  overageHours: number;
  affectedProjects: Array<{
    projectId: string;
    projectName: string;
    hours: number;
  }>;
}

interface OverAllocationAlertsProps {
  alerts: OverAllocationAlert[];
  onResolve?: (employeeId: string, weekStart: string) => void;
  onDismiss?: (employeeId: string, weekStart: string) => void;
  onViewDetails?: (employeeId: string) => void;
  compact?: boolean;
}

/**
 * Over-Allocation Alerts Component (US-ES2)
 *
 * Displays prominent alerts for employees who are over-allocated:
 * - Shows employee name and over-allocation details
 * - Lists affected projects and hours
 * - Provides action buttons to resolve or dismiss
 * - Color-coded by severity (yellow warning, red critical)
 *
 * Acceptance Criteria:
 * ✓ Shows alerts for over-allocated employees
 * ✓ Displays overage hours and affected projects
 * ✓ Provides "Resolve" and "Dismiss" actions
 * ✓ Supports compact mode for sidebars
 * ✓ Color-codes by severity (<20% yellow, ≥20% red)
 */
export const OverAllocationAlerts: React.FC<OverAllocationAlertsProps> = ({
  alerts,
  onResolve,
  onDismiss,
  onViewDetails,
  compact = false
}) => {
  if (alerts.length === 0) {
    return null;
  }

  const getSeverity = (alert: OverAllocationAlert): 'warning' | 'critical' => {
    const overagePercentage = (alert.overageHours / alert.capacity) * 100;
    return overagePercentage >= 20 ? 'critical' : 'warning';
  };

  const getSeverityStyles = (severity: 'warning' | 'critical') => {
    if (severity === 'critical') {
      return {
        border: 'border-red-300',
        bg: 'bg-red-50',
        text: 'text-red-800',
        icon: 'text-red-600'
      };
    }
    return {
      border: 'border-yellow-300',
      bg: 'bg-yellow-50',
      text: 'text-yellow-800',
      icon: 'text-yellow-600'
    };
  };

  return (
    <div className="space-y-3 mb-6" data-testid="overallocation-alerts">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-orange-500" />
          Over-Allocation Alerts ({alerts.length})
        </h3>
      </div>

      <div className="space-y-2">
        {alerts.map((alert) => {
          const severity = getSeverity(alert);
          const styles = getSeverityStyles(severity);

          return (
            <div
              key={`${alert.employeeId}-${alert.weekStart}`}
              className={`border-2 ${styles.border} ${styles.bg} rounded-lg p-4 transition-all hover:shadow-md`}
              data-testid="alert-item"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  {/* Employee and Severity */}
                  <div className="flex items-center gap-2 mb-2">
                    <h4 className={`font-semibold ${styles.text}`} data-testid="alert-employee-name">
                      {alert.employeeName}
                    </h4>
                    <Badge
                      variant={severity === 'critical' ? 'destructive' : 'default'}
                      className="text-xs"
                    >
                      {severity === 'critical' ? 'Critical' : 'Warning'}
                    </Badge>
                  </div>

                  {/* Week and Hours */}
                  <div className="text-sm text-gray-700 mb-2">
                    <strong>Week:</strong> {new Date(alert.weekStart).toLocaleDateString()} - {new Date(alert.weekEnd).toLocaleDateString()}
                  </div>
                  <div className={`text-sm font-medium ${styles.text} mb-3`}>
                    <strong>Over-allocated:</strong> +{alert.overageHours}h
                    <span className="text-gray-600 ml-1">
                      ({alert.allocatedHours}h / {alert.capacity}h capacity)
                    </span>
                  </div>

                  {/* Affected Projects */}
                  {!compact && alert.affectedProjects.length > 0 && (
                    <div className="mt-3 space-y-1">
                      <div className="text-xs font-medium text-gray-600 mb-1">
                        Affected Projects:
                      </div>
                      {alert.affectedProjects.map((project) => (
                        <div
                          key={project.projectId}
                          className="flex justify-between items-center text-xs bg-white bg-opacity-50 px-2 py-1 rounded"
                        >
                          <span className="truncate">{project.projectName}</span>
                          <span className="font-medium ml-2">{project.hours}h</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex flex-col gap-1">
                  {onDismiss && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onDismiss(alert.employeeId, alert.weekStart)}
                      className="h-6 w-6 p-0"
                      title="Dismiss alert"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 mt-3">
                {onResolve && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onResolve(alert.employeeId, alert.weekStart)}
                    className="flex-1 text-xs"
                  >
                    Resolve
                  </Button>
                )}
                {onViewDetails && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onViewDetails(alert.employeeId)}
                    className="flex items-center gap-1 text-xs"
                  >
                    View Details
                    <ChevronRight className="h-3 w-3" />
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default OverAllocationAlerts;
