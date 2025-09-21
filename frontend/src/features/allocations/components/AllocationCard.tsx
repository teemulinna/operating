import React from 'react';
import { AllocationCardProps } from '../types';

/**
 * AllocationCard component - displays individual allocation information
 * Extracted from large AllocationsPage component for better maintainability
 */
export function AllocationCard({ allocation, employee, project, onEdit, onDelete }: AllocationCardProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'planned': return 'bg-blue-100 text-blue-800';
      case 'completed': return 'bg-gray-100 text-gray-800';
      default: return 'bg-red-100 text-red-800';
    }
  };

  return (
    <li key={allocation.id} className="px-6 py-4" data-testid={`allocation-${allocation.id}`}>
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <div className="flex items-center space-x-4">
            <div className="flex-1">
              <p className="text-lg font-medium text-gray-900" data-testid={`allocation-employee-${allocation.id}`}>
                {employee ? `${employee.firstName} ${employee.lastName}` : 'Unknown Employee'}
              </p>
              <p className="text-sm text-gray-600" data-testid={`allocation-project-${allocation.id}`}>
                Project: {project ? project.name : 'Unknown Project'}
              </p>
              <div className="mt-2 flex items-center space-x-4 text-sm text-gray-500">
                <span data-testid={`allocation-hours-${allocation.id}`}>
                  {allocation.allocatedHours}h/week
                </span>
                <span data-testid={`allocation-dates-${allocation.id}`}>
                  {new Date(allocation.startDate).toLocaleDateString()} - {new Date(allocation.endDate).toLocaleDateString()}
                </span>
                <span 
                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(allocation.status)}`}
                  data-testid={`allocation-status-${allocation.id}`}
                >
                  {allocation.status}
                </span>
              </div>
              {allocation.roleOnProject && (
                <p className="text-sm text-gray-500 mt-1">
                  Role: {allocation.roleOnProject}
                </p>
              )}
              {allocation.notes && (
                <p className="text-sm text-gray-500 mt-1">
                  Notes: {allocation.notes}
                </p>
              )}
            </div>
          </div>
        </div>
        <div className="flex flex-col space-y-2">
          <button
            onClick={() => onEdit(allocation)}
            className="text-blue-600 hover:text-blue-800 text-sm font-medium"
            data-testid={`edit-allocation-${allocation.id}`}
          >
            Edit
          </button>
          <button
            onClick={() => onDelete(allocation)}
            className="text-red-600 hover:text-red-800 text-sm font-medium"
            data-testid={`delete-allocation-${allocation.id}`}
          >
            Delete
          </button>
        </div>
      </div>
    </li>
  );
}