import React, { useState } from 'react';
import { ChevronDownIcon, ClockIcon, BriefcaseIcon } from '@heroicons/react/24/outline';
import { Menu, Transition } from '@headlessui/react';

export interface EmployeeAvailability {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  position: string;
  departmentName: string;
  status: 'available' | 'busy' | 'unavailable';
  capacity: number;
  currentProjects: number;
  availableHours: number;
  lastUpdated: string;
  isActive: boolean;
}

interface StatusIndicatorProps {
  employee: EmployeeAvailability;
  onStatusChange?: (employeeId: string, newStatus: 'available' | 'busy' | 'unavailable') => void;
  capacity?: number;
  showControls?: boolean;
  className?: string;
}

const statusConfig = {
  available: {
    label: 'Available',
    bgColor: 'bg-green-100',
    textColor: 'text-green-800',
    borderColor: 'border-green-200',
    icon: '✓'
  },
  busy: {
    label: 'Busy',
    bgColor: 'bg-yellow-100',
    textColor: 'text-yellow-800',
    borderColor: 'border-yellow-200',
    icon: '⚠'
  },
  unavailable: {
    label: 'Unavailable',
    bgColor: 'bg-red-100',
    textColor: 'text-red-800',
    borderColor: 'border-red-200',
    icon: '✕'
  }
};

export function StatusIndicator({ 
  employee, 
  onStatusChange, 
  capacity, 
  showControls = true,
  className = ''
}: StatusIndicatorProps) {
  const [isUpdating, setIsUpdating] = useState(false);
  const config = statusConfig[employee.status];
  const displayCapacity = capacity ?? employee.capacity;

  const handleStatusChange = async (newStatus: 'available' | 'busy' | 'unavailable') => {
    if (!onStatusChange || isUpdating) return;
    
    setIsUpdating(true);
    try {
      await onStatusChange(employee.id, newStatus);
    } finally {
      setIsUpdating(false);
    }
  };

  const getCapacityColor = (capacity: number) => {
    if (capacity >= 80) return 'bg-green-500';
    if (capacity >= 60) return 'bg-yellow-500';
    if (capacity >= 40) return 'bg-orange-500';
    return 'bg-red-500';
  };

  const formatLastUpdated = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className={`bg-white rounded-lg border shadow-sm p-4 ${className}`}>
      {/* Header with employee info and status */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-semibold text-gray-900 truncate">
            {employee.firstName} {employee.lastName}
          </h3>
          <p className="text-sm text-gray-500 truncate">{employee.position}</p>
          <p className="text-xs text-gray-400 truncate">{employee.departmentName}</p>
        </div>
        
        {/* Status Badge with Dropdown */}
        <div className="flex items-center space-x-2">
          {showControls && onStatusChange ? (
            <Menu as="div" className="relative">
              <Menu.Button 
                className={`
                  inline-flex items-center px-3 py-1 rounded-full text-sm font-medium
                  ${config.bgColor} ${config.textColor} ${config.borderColor} border
                  hover:opacity-80 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500
                  ${isUpdating ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                `}
                disabled={isUpdating}
                aria-label="Change status"
              >
                <span className="mr-1">{config.icon}</span>
                {config.label}
                <ChevronDownIcon className="ml-1 h-4 w-4" />
              </Menu.Button>
              
              <Transition
                as={React.Fragment}
                enter="transition ease-out duration-100"
                enterFrom="transform opacity-0 scale-95"
                enterTo="transform opacity-100 scale-100"
                leave="transition ease-in duration-75"
                leaveFrom="transform opacity-100 scale-100"
                leaveTo="transform opacity-0 scale-95"
              >
                <Menu.Items className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none z-10">
                  <div className="py-1">
                    {Object.entries(statusConfig).map(([status, statusConf]) => (
                      <Menu.Item key={status}>
                        {({ active }) => (
                          <button
                            role="option"
                            className={`
                              ${active ? 'bg-gray-100' : ''} 
                              ${employee.status === status ? 'font-semibold' : ''}
                              block w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100
                            `}
                            onClick={() => handleStatusChange(status as 'available' | 'busy' | 'unavailable')}
                          >
                            <span className="mr-2">{statusConf.icon}</span>
                            {statusConf.label}
                          </button>
                        )}
                      </Menu.Item>
                    ))}
                  </div>
                </Menu.Items>
              </Transition>
            </Menu>
          ) : (
            <span className={`
              inline-flex items-center px-3 py-1 rounded-full text-sm font-medium
              ${config.bgColor} ${config.textColor} ${config.borderColor} border
            `}>
              <span className="mr-1">{config.icon}</span>
              {config.label}
            </span>
          )}
        </div>
      </div>

      {/* Capacity Progress Bar */}
      <div className="mb-3">
        <div className="flex items-center justify-between mb-1">
          <span className="text-sm font-medium text-gray-700">Capacity</span>
          <span className="text-sm text-gray-600">{displayCapacity}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className={`h-2 rounded-full transition-all duration-300 ${getCapacityColor(displayCapacity)}`}
            style={{ width: `${Math.min(displayCapacity, 100)}%` }}
            role="progressbar"
            aria-valuenow={displayCapacity}
            aria-valuemin={0}
            aria-valuemax={100}
          />
        </div>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 gap-3 mb-3">
        <div className="flex items-center space-x-2">
          <BriefcaseIcon className="h-4 w-4 text-gray-500" />
          <div>
            <p className="text-xs text-gray-500">Projects</p>
            <p className="text-sm font-semibold text-gray-900">{employee.currentProjects}</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <ClockIcon className="h-4 w-4 text-gray-500" />
          <div>
            <p className="text-xs text-gray-500">Available</p>
            <p className="text-sm font-semibold text-gray-900">{employee.availableHours}h</p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between text-xs text-gray-400 pt-2 border-t border-gray-100">
        <span>Last updated: {formatLastUpdated(employee.lastUpdated)}</span>
        {isUpdating && (
          <span className="inline-flex items-center">
            <svg className="animate-spin -ml-1 mr-1 h-3 w-3 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Updating...
          </span>
        )}
      </div>
    </div>
  );
}