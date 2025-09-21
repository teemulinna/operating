import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { CapacityWarningIndicator } from '../ui/CapacityWarningIndicator';
import { User, AlertTriangle, Clock } from 'lucide-react';
import { OverAllocationSummary } from '../../services/over-allocation-calculation.service';

interface Employee {
  id: string;
  firstName?: string;
  lastName?: string;
  name?: string;
  position?: string;
  departmentName?: string;
  defaultHoursPerWeek?: number;
  capacity?: number;
  email?: string;
}

interface EmployeeCapacityCardProps {
  employee: Employee;
  overAllocationSummary?: OverAllocationSummary | null;
  className?: string;
  showDetails?: boolean;
  onClick?: () => void;
}

export function EmployeeCapacityCard({
  employee,
  overAllocationSummary,
  className = '',
  showDetails = true,
  onClick
}: EmployeeCapacityCardProps) {
  const employeeName = employee.name || `${employee.firstName || ''} ${employee.lastName || ''}`.trim() || `Employee ${employee.id}`;
  const capacity = employee.capacity || employee.defaultHoursPerWeek || 40;
  
  const isOverAllocated = overAllocationSummary?.hasOverAllocation || false;
  const utilizationRate = overAllocationSummary?.maxUtilizationRate || 0;
  const severity = overAllocationSummary?.severity || 'none';
  const totalOverHours = overAllocationSummary?.totalOverAllocationHours || 0;
  const overAllocatedWeeks = overAllocationSummary?.weeklyAllocations.filter(week => week.isOverAllocated).length || 0;

  const getCardBackground = () => {
    if (!isOverAllocated) return 'bg-white';
    
    switch (severity) {
      case 'critical':
        return 'bg-red-50 border-red-200';
      case 'high':
        return 'bg-orange-50 border-orange-200';
      case 'medium':
        return 'bg-yellow-50 border-yellow-200';
      default:
        return 'bg-white';
    }
  };

  return (
    <Card 
      className={`
        ${getCardBackground()}
        ${onClick ? 'cursor-pointer hover:shadow-md transition-shadow' : ''}
        ${className}
      `}
      onClick={onClick}
      data-testid={`employee-capacity-card-${employee.id}`}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <User className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <CardTitle 
                className="text-lg font-semibold text-gray-900"
                data-testid={`employee-name-${employee.id}`}
              >
                {employeeName}
              </CardTitle>
              {employee.position && (
                <p 
                  className="text-sm text-gray-600"
                  data-testid={`employee-position-${employee.id}`}
                >
                  {employee.position}
                </p>
              )}
              {employee.departmentName && (
                <p 
                  className="text-xs text-gray-500"
                  data-testid={`employee-department-${employee.id}`}
                >
                  {employee.departmentName}
                </p>
              )}
            </div>
          </div>
          
          {/* Capacity Warning Indicator */}
          <CapacityWarningIndicator
            utilizationRate={utilizationRate}
            severity={severity}
            isOverAllocated={isOverAllocated}
            size="sm"
            className="flex-shrink-0"
          />
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="space-y-3">
          {/* Capacity Information */}
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">Weekly Capacity:</span>
            <span className="font-medium">{capacity}h</span>
          </div>
          
          {/* Utilization Rate */}
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">Max Utilization:</span>
            <span className={`font-medium ${
              utilizationRate > 100 ? 'text-red-600' :
              utilizationRate > 80 ? 'text-orange-600' :
              'text-green-600'
            }`}>
              {Math.round(utilizationRate)}%
            </span>
          </div>
          
          {/* Over-allocation Details */}
          {isOverAllocated && showDetails && (
            <div 
              className="bg-white p-3 rounded-lg border border-gray-200"
              data-testid={`over-allocation-details-${employee.id}`}
            >
              <div className="flex items-center space-x-2 mb-2">
                <AlertTriangle className="h-4 w-4 text-red-600" />
                <span className="text-sm font-medium text-red-800">
                  Over-allocation Detected
                </span>
              </div>
              
              <div className="space-y-1 text-xs text-gray-600">
                {overAllocatedWeeks > 0 && (
                  <div className="flex items-center justify-between">
                    <span>Over-allocated weeks:</span>
                    <span className="font-medium text-red-600">{overAllocatedWeeks}</span>
                  </div>
                )}
                
                {totalOverHours > 0 && (
                  <div className="flex items-center justify-between">
                    <span>Excess hours:</span>
                    <span className="font-medium text-red-600">{totalOverHours}h</span>
                  </div>
                )}
              </div>
              
              {/* Top Warning Messages */}
              {overAllocationSummary?.warnings.slice(0, 2).map((warning, index) => (
                <div key={index} className="text-xs text-red-700 mt-1">
                  • {warning}
                </div>
              ))}
              
              {/* Quick Suggestion */}
              {overAllocationSummary?.suggestions[0] && (
                <div className="mt-2 p-2 bg-blue-50 rounded border border-blue-200">
                  <div className="flex items-start space-x-2">
                    <Clock className="h-3 w-3 text-blue-600 mt-0.5 flex-shrink-0" />
                    <span className="text-xs text-blue-700">
                      <strong>Suggestion:</strong> {overAllocationSummary.suggestions[0]}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}
          
          {/* Normal capacity status */}
          {!isOverAllocated && utilizationRate > 0 && (
            <div className="text-xs text-gray-500 text-center py-1">
              ✓ Within capacity limits
            </div>
          )}
          
          {/* No allocation status */}
          {utilizationRate === 0 && (
            <div className="text-xs text-gray-400 text-center py-1">
              No current allocations
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default EmployeeCapacityCard;
