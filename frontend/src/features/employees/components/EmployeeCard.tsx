import React from 'react';
import { EmployeeCardProps } from '../types/employee.types';
import { Badge } from '../../../components/ui/badge';
import { Button } from '../../../components/ui/button';

/**
 * EmployeeCard Component
 * Individual employee display card with actions
 */
export function EmployeeCard({ 
  employee, 
  onEdit, 
  onDelete, 
  onView, 
  department 
}: EmployeeCardProps) {
  
  const getDepartmentName = () => {
    if (department) return department.name;
    // Use departmentName from employee object if available
    if (employee.departmentName) return employee.departmentName;
    // Fallback if no department info available
    return 'Unknown Department';
  };

  const formatSalary = (salary: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(salary);
  };

  return (
    <div 
      className="bg-white overflow-hidden shadow rounded-lg hover:shadow-md transition-shadow duration-200" 
      data-testid={`employee-${employee.id}`}
    >
      <div className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center space-x-3 mb-3">
              {/* Avatar placeholder */}
              <div className="flex-shrink-0">
                <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center">
                  <span className="text-sm font-medium text-gray-700">
                    {employee.firstName.charAt(0)}{employee.lastName.charAt(0)}
                  </span>
                </div>
              </div>
              
              <div className="flex-1">
                <h3 
                  className="text-lg font-medium text-gray-900 cursor-pointer hover:text-blue-600" 
                  data-testid={`employee-name-${employee.id}`}
                  onClick={onView}
                >
                  {employee.firstName} {employee.lastName}
                </h3>
                <p className="text-sm text-gray-600" data-testid={`employee-position-${employee.id}`}>
                  {employee.position}
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center text-sm text-gray-500">
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                </svg>
                <span data-testid={`employee-email-${employee.id}`}>
                  {employee.email}
                </span>
              </div>
              
              <div className="flex items-center text-sm text-gray-500">
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
                <span data-testid={`employee-department-${employee.id}`}>
                  {getDepartmentName()}
                </span>
              </div>
            </div>

            <div className="mt-4 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Badge variant="secondary" data-testid={`employee-hours-${employee.id}`}>
                  {Math.round(Number(employee.weeklyCapacity) || 40)}h/week
                </Badge>
                <Badge variant="outline" data-testid={`employee-salary-${employee.id}`}>
                  {formatSalary(employee.salary)}
                </Badge>
              </div>
              
              <div className={`w-3 h-3 rounded-full ${employee.isActive ? 'bg-green-400' : 'bg-gray-400'}`} 
                   title={employee.isActive ? 'Active' : 'Inactive'} />
            </div>

            {employee.skills && employee.skills.length > 0 && (
              <div className="mt-3">
                <div className="flex flex-wrap gap-1">
                  {employee.skills.slice(0, 3).map((skill, index) => (
                    <Badge key={index} variant="outline" className="text-xs">
                      {skill}
                    </Badge>
                  ))}
                  {employee.skills.length > 3 && (
                    <Badge variant="outline" className="text-xs">
                      +{employee.skills.length - 3} more
                    </Badge>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="mt-6 flex justify-end space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onView}
            data-testid={`view-employee-${employee.id}`}
          >
            View
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onEdit}
            data-testid={`edit-employee-${employee.id}`}
          >
            Edit
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onDelete}
            className="text-red-600 hover:text-red-700 hover:bg-red-50"
            data-testid={`delete-employee-${employee.id}`}
          >
            Delete
          </Button>
        </div>
      </div>
    </div>
  );
}

export default EmployeeCard;