import React from 'react';
import { Clock, Users, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';
import { AvailabilityStatus, WeeklyCapacity } from '@/types/Employee';

interface CapacityIndicatorProps {
  capacity?: WeeklyCapacity;
  status?: AvailabilityStatus;
  currentProjects?: number;
  size?: 'sm' | 'md' | 'lg';
  showDetails?: boolean;
}

const statusConfig = {
  'available': {
    icon: CheckCircle,
    color: 'text-green-600',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200',
    label: 'Available',
    shortLabel: 'Available'
  },
  'busy': {
    icon: AlertTriangle,
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-50',
    borderColor: 'border-yellow-200',
    label: 'Busy',
    shortLabel: 'Busy'
  },
  'unavailable': {
    icon: XCircle,
    color: 'text-red-600',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
    label: 'Unavailable',
    shortLabel: 'Unavailable'
  },
  'out-of-office': {
    icon: XCircle,
    color: 'text-gray-600',
    bgColor: 'bg-gray-50',
    borderColor: 'border-gray-200',
    label: 'Out of Office',
    shortLabel: 'OOO'
  }
};

export function CapacityIndicator({
  capacity,
  status = 'available',
  currentProjects = 0,
  size = 'md',
  showDetails = false
}: CapacityIndicatorProps) {
  const config = statusConfig[status] || statusConfig.available;
  const Icon = config.icon;
  
  // Calculate utilization rate
  const utilizationRate = capacity 
    ? (capacity.allocatedHours / capacity.weeklyHours) * 100 
    : 0;

  const getUtilizationColor = (rate: number) => {
    if (rate >= 100) return 'bg-red-500';
    if (rate >= 80) return 'bg-yellow-500';
    if (rate >= 60) return 'bg-blue-500';
    return 'bg-green-500';
  };

  const sizeClasses = {
    sm: 'text-xs px-2 py-1',
    md: 'text-sm px-3 py-1.5',
    lg: 'text-base px-4 py-2'
  };

  const iconSizes = {
    sm: 'h-3 w-3',
    md: 'h-4 w-4',
    lg: 'h-5 w-5'
  };

  if (!showDetails) {
    // Compact badge view
    return (
      <div className={`inline-flex items-center rounded-full font-medium ${sizeClasses[size]} ${config.bgColor} ${config.color} ${config.borderColor} border`}>
        <Icon className={`mr-1 ${iconSizes[size]}`} />
        <span>{size === 'sm' ? config.shortLabel : config.label}</span>
      </div>
    );
  }

  // Detailed view with capacity information
  return (
    <div className="space-y-2">
      {/* Status Badge */}
      <div className={`inline-flex items-center rounded-full font-medium ${sizeClasses[size]} ${config.bgColor} ${config.color} ${config.borderColor} border`}>
        <Icon className={`mr-1 ${iconSizes[size]}`} />
        <span>{config.label}</span>
      </div>
      
      {capacity && (
        <>
          {/* Utilization Progress Bar */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs text-gray-600">
              <span>Utilization</span>
              <span>{utilizationRate.toFixed(0)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className={`h-2 rounded-full transition-all duration-300 ${getUtilizationColor(utilizationRate)}`}
                style={{ width: `${Math.min(utilizationRate, 100)}%` }}
                role="progressbar"
                aria-valuenow={utilizationRate}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label="Capacity utilization"
              />
            </div>
          </div>

          {/* Capacity Details */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="flex items-center space-x-1 text-gray-600">
              <Clock className="h-3 w-3" />
              <span>{capacity.availableHours}h available</span>
            </div>
            <div className="flex items-center space-x-1 text-gray-600">
              <Users className="h-3 w-3" />
              <span>{currentProjects} projects</span>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// Quick status badge component for table cells
export function StatusBadge({ status, size = 'sm' }: { status: AvailabilityStatus; size?: 'sm' | 'md' }) {
  return <CapacityIndicator status={status} size={size} showDetails={false} />;
}

// Capacity progress bar for table cells
export function CapacityProgressBar({ capacity }: { capacity: WeeklyCapacity }) {
  const utilizationRate = (capacity.allocatedHours / capacity.weeklyHours) * 100;
  
  const getColor = (rate: number) => {
    if (rate >= 100) return 'bg-red-500';
    if (rate >= 80) return 'bg-yellow-500';
    if (rate >= 60) return 'bg-blue-500';
    return 'bg-green-500';
  };

  return (
    <div className="flex items-center space-x-2 min-w-0">
      <div className="flex-1">
        <div className="w-full bg-gray-200 rounded-full h-1.5">
          <div
            className={`h-1.5 rounded-full transition-all duration-300 ${getColor(utilizationRate)}`}
            style={{ width: `${Math.min(utilizationRate, 100)}%` }}
          />
        </div>
      </div>
      <span className="text-xs text-gray-600 whitespace-nowrap">
        {capacity.availableHours}h
      </span>
    </div>
  );
}