import React from 'react';
import type { Allocation, Employee, Project } from '../hooks/useAllocationOperations';

interface AllocationListProps {
  allocations: Allocation[];
  employees: Employee[];
  projects: Project[];
  onEdit: (allocation: Allocation) => void;
  onDelete: (allocation: Allocation) => void;
}

export const AllocationList: React.FC<AllocationListProps> = ({
  allocations,
  employees,
  projects,
  onEdit,
  onDelete
}) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'planned':
        return 'bg-blue-100 text-blue-800';
      case 'completed':
        return 'bg-gray-100 text-gray-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (allocations.length === 0) {
    return (
      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <div className="text-center py-12">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4" />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">No allocations</h3>
          <p className="mt-1 text-sm text-gray-500">
            Get started by creating your first resource allocation.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white shadow overflow-hidden sm:rounded-md" data-testid="allocations-list">
      <ul className="divide-y divide-gray-200">
        {allocations.map((allocation) => {
          const employee = employees.find(e => e.id === allocation.employeeId);
          const project = projects.find(p => p.id === allocation.projectId);
          
          return (
            <li key={allocation.id} className="px-6 py-4 hover:bg-gray-50 transition-colors" data-testid={`allocation-${allocation.id}`}>
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-4">
                    <div className="flex-1">
                      {/* Employee Information */}
                      <div className="flex items-center space-x-2 mb-2">
                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                          <span className="text-sm font-medium text-blue-800">
                            {employee ? `${employee.firstName[0]}${employee.lastName[0]}` : '??'}
                          </span>
                        </div>
                        <div>
                          <p className="text-lg font-medium text-gray-900" data-testid={`allocation-employee-${allocation.id}`}>
                            {employee ? `${employee.firstName} ${employee.lastName}` : 'Unknown Employee'}
                          </p>
                          {employee && (
                            <p className="text-sm text-gray-500">{employee.department}</p>
                          )}
                        </div>
                      </div>

                      {/* Project Information */}
                      <p className="text-sm font-medium text-gray-700 mb-1" data-testid={`allocation-project-${allocation.id}`}>
                        Project: {project ? project.name : 'Unknown Project'}
                      </p>

                      {/* Allocation Details */}
                      <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500">
                        <div className="flex items-center">
                          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span data-testid={`allocation-hours-${allocation.id}`}>
                            {allocation.allocatedHours}h/week
                          </span>
                        </div>
                        
                        <div className="flex items-center">
                          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          <span data-testid={`allocation-dates-${allocation.id}`}>
                            {new Date(allocation.startDate).toLocaleDateString()} - {new Date(allocation.endDate).toLocaleDateString()}
                          </span>
                        </div>
                        
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(allocation.status)}`} 
                              data-testid={`allocation-status-${allocation.id}`}>
                          {allocation.status.charAt(0).toUpperCase() + allocation.status.slice(1)}
                        </span>
                      </div>

                      {/* Role Information */}
                      {allocation.roleOnProject && (
                        <div className="mt-2 flex items-center text-sm text-gray-500">
                          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                          <span>Role: {allocation.roleOnProject}</span>
                        </div>
                      )}

                      {/* Notes */}
                      {allocation.notes && (
                        <div className="mt-2">
                          <p className="text-sm text-gray-600 italic">
                            "{allocation.notes}"
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                
                {/* Action Buttons */}
                <div className="flex flex-col space-y-2 ml-4">
                  <button
                    onClick={() => onEdit(allocation)}
                    className="text-blue-600 hover:text-blue-800 text-sm font-medium px-3 py-1 rounded border border-blue-200 hover:border-blue-300 transition-colors"
                    data-testid={`edit-allocation-${allocation.id}`}
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => onDelete(allocation)}
                    className="text-red-600 hover:text-red-800 text-sm font-medium px-3 py-1 rounded border border-red-200 hover:border-red-300 transition-colors"
                    data-testid={`delete-allocation-${allocation.id}`}
                  >
                    Delete
                  </button>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
      
      {/* Summary */}
      <div className="bg-gray-50 px-6 py-3 border-t" data-testid="allocations-summary">
        <div className="flex justify-between items-center text-sm">
          <span className="text-gray-600">
            Total: {allocations.length} allocation{allocations.length !== 1 ? 's' : ''}
          </span>
          <div className="flex space-x-4">
            <span className="text-gray-600">
              Active: {allocations.filter(a => a.status === 'active').length}
            </span>
            <span className="text-gray-600">
              Planned: {allocations.filter(a => a.status === 'planned').length}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};