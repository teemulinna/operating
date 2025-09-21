import React from 'react';
import { Badge } from './badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './card';

export interface OverAllocationWarning {
  employeeId: string;
  employeeName: string;
  weekStartDate: Date;
  weekEndDate: Date;
  defaultHours: number;
  allocatedHours: number;
  overAllocationHours: number;
  utilizationRate: number;
  severity: 'warning' | 'critical';
  message: string;
  suggestions: string[];
  affectedAllocations: Array<{
    allocationId: string;
    projectName: string;
    allocatedHours: number;
  }>;
}

interface OverAllocationWarningProps {
  warning: OverAllocationWarning;
  compact?: boolean;
  onViewDetails?: (warning: OverAllocationWarning) => void;
}

export const OverAllocationWarningComponent: React.FC<OverAllocationWarningProps> = ({
  warning,
  compact = false,
  onViewDetails
}) => {
  const severityConfig = {
    warning: {
      color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      badgeVariant: 'secondary' as const,
      icon: '⚠️'
    },
    critical: {
      color: 'bg-red-100 text-red-800 border-red-200',
      badgeVariant: 'destructive' as const,
      icon: '🚨'
    }
  };

  const config = severityConfig[warning.severity];

  if (compact) {
    return (
      <div 
        className={`flex items-center gap-2 p-2 rounded-lg border ${config.color} cursor-pointer`}
        onClick={() => onViewDetails?.(warning)}
      >
        <span className="text-lg">{config.icon}</span>
        <div className="flex-1">
          <span className="font-medium text-sm">{warning.employeeName}</span>
          <span className="text-xs ml-2">
            +{warning.overAllocationHours}h ({warning.utilizationRate.toFixed(1)}%)
          </span>
        </div>
        <Badge variant={config.badgeVariant} className="text-xs">
          {warning.severity.toUpperCase()}
        </Badge>
      </div>
    );
  }

  return (
    <Card className={`border-l-4 ${config.color}`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl">{config.icon}</span>
            <div>
              <CardTitle className="text-lg">{warning.employeeName}</CardTitle>
              <CardDescription className="text-sm">
                Over-allocated by {warning.overAllocationHours} hours ({warning.utilizationRate.toFixed(1)}% utilization)
              </CardDescription>
            </div>
          </div>
          <Badge variant={config.badgeVariant}>
            {warning.severity.toUpperCase()}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Allocation Details */}
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div>
            <span className="font-medium">Default Hours:</span>
            <div className="text-gray-600">{warning.defaultHours}h/week</div>
          </div>
          <div>
            <span className="font-medium">Allocated:</span>
            <div className="text-gray-600">{warning.allocatedHours}h</div>
          </div>
          <div>
            <span className="font-medium">Over-allocation:</span>
            <div className="text-red-600 font-medium">+{warning.overAllocationHours}h</div>
          </div>
        </div>

        {/* Week Period */}
        <div className="text-sm">
          <span className="font-medium">Week Period:</span>
          <div className="text-gray-600">
            {warning.weekStartDate.toLocaleDateString()} - {warning.weekEndDate.toLocaleDateString()}
          </div>
        </div>

        {/* Affected Projects */}
        <div>
          <span className="font-medium text-sm">Affected Projects:</span>
          <div className="mt-2 space-y-1">
            {warning.affectedAllocations.map((allocation, index) => (
              <div 
                key={allocation.allocationId}
                className="flex justify-between items-center p-2 bg-gray-50 rounded text-sm"
              >
                <span>{allocation.projectName}</span>
                <span className="font-medium">{allocation.allocatedHours}h</span>
              </div>
            ))}
          </div>
        </div>

        {/* Suggestions */}
        <div>
          <span className="font-medium text-sm">Suggestions:</span>
          <ul className="mt-2 space-y-1 text-sm text-gray-600">
            {warning.suggestions.map((suggestion, index) => (
              <li key={index} className="flex items-start gap-2">
                <span className="text-blue-500 mt-0.5">•</span>
                <span>{suggestion}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 pt-2">
          <button 
            className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
            onClick={() => onViewDetails?.(warning)}
          >
            View Details
          </button>
          <button className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50">
            Resolve
          </button>
        </div>
      </CardContent>
    </Card>
  );
};

interface OverAllocationWarningListProps {
  warnings: OverAllocationWarning[];
  compact?: boolean;
  onViewDetails?: (warning: OverAllocationWarning) => void;
}

export const OverAllocationWarningList: React.FC<OverAllocationWarningListProps> = ({
  warnings,
  compact = false,
  onViewDetails
}) => {
  if (warnings.length === 0) {
    return (
      <div className="text-center p-8 text-gray-500">
        <span className="text-4xl">✅</span>
        <div className="mt-2">No over-allocation warnings</div>
        <div className="text-sm">All employees are within their capacity limits</div>
      </div>
    );
  }

  const criticalWarnings = warnings.filter(w => w.severity === 'critical');
  const warningCount = warnings.filter(w => w.severity === 'warning');

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
        <div className="flex items-center gap-4">
          <span className="font-medium">Over-allocation Warnings</span>
          <div className="flex gap-2">
            {criticalWarnings.length > 0 && (
              <Badge variant="destructive" className="text-xs">
                {criticalWarnings.length} Critical
              </Badge>
            )}
            {warningCount.length > 0 && (
              <Badge variant="secondary" className="text-xs">
                {warningCount.length} Warning
              </Badge>
            )}
          </div>
        </div>
        <span className="text-sm text-gray-600">
          {warnings.length} total warning{warnings.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Warnings List */}
      <div className="space-y-3">
        {warnings
          .sort((a, b) => {
            // Sort by severity (critical first), then by over-allocation hours
            if (a.severity !== b.severity) {
              return a.severity === 'critical' ? -1 : 1;
            }
            return b.overAllocationHours - a.overAllocationHours;
          })
          .map((warning, index) => (
            <OverAllocationWarningComponent
              key={`${warning.employeeId}-${warning.weekStartDate.getTime()}`}
              warning={warning}
              compact={compact}
              onViewDetails={onViewDetails}
            />
          ))}
      </div>
    </div>
  );
};

export default OverAllocationWarningComponent;