import React from 'react';
import { Employee, Department, EmployeeFormData, ValidationError } from '../types/employee.types';
import ValidationErrorDisplay from '../../../components/ui/ValidationErrorDisplay';

interface EmployeeFormProps {
  isOpen: boolean;
  editingEmployee: Employee | null;
  departments: Department[];
  operationLoading: boolean;
  validationErrors: ValidationError[];
  onSubmit: (data: EmployeeFormData) => Promise<void>;
  onCancel: () => void;
  onClearErrors: () => void;
}

export function EmployeeForm({ 
  isOpen, 
  editingEmployee, 
  departments, 
  operationLoading, 
  validationErrors, 
  onSubmit, 
  onCancel,
  onClearErrors
}: EmployeeFormProps) {
  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    
    const employeeData: EmployeeFormData = {
      firstName: formData.get('firstName') as string,
      lastName: formData.get('lastName') as string,
      email: formData.get('email') as string,
      position: formData.get('position') as string,
      departmentId: formData.get('departmentId') as string,
      defaultHoursPerWeek: parseInt(formData.get('defaultHours') as string) || 40,
      salary: parseFloat(formData.get('salary') as string) || 0,
      skills: editingEmployee?.skills || []
    };
    
    // Clear previous validation errors
    onClearErrors();
    
    // Basic validation
    const errors: ValidationError[] = [];
    if (!employeeData.firstName) errors.push({ field: 'firstName', message: 'First name is required' });
    if (!employeeData.lastName) errors.push({ field: 'lastName', message: 'Last name is required' });
    if (!employeeData.email) errors.push({ field: 'email', message: 'Email is required' });
    if (!employeeData.position) errors.push({ field: 'position', message: 'Position is required' });
    if (!employeeData.departmentId) errors.push({ field: 'departmentId', message: 'Department is required' });

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (employeeData.email && !emailRegex.test(employeeData.email)) {
      errors.push({ field: 'email', message: 'Please enter a valid email address' });
    }

    if (errors.length > 0) {
      // Handle client-side validation errors
      return;
    }

    await onSubmit(employeeData);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" data-testid="employee-form-modal">
      <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
        <h2 className="text-xl font-bold mb-4" data-testid="modal-title">
          {editingEmployee ? 'Edit Employee' : 'Add New Employee'}
        </h2>
        
        {/* Validation Errors */}
        {validationErrors.length > 0 && (
          <ValidationErrorDisplay 
            errors={validationErrors}
            onDismiss={onClearErrors}
            className="mb-4"
          />
        )}
        
        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">First Name *</label>
                <input
                  name="firstName"
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  defaultValue={editingEmployee?.firstName || ''}
                  data-testid="employee-first-name"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Last Name *</label>
                <input
                  name="lastName"
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  defaultValue={editingEmployee?.lastName || ''}
                  data-testid="employee-last-name"
                  required
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
              <input
                name="email"
                type="email"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                defaultValue={editingEmployee?.email || ''}
                data-testid="employee-email"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Position *</label>
              <input
                name="position"
                type="text"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                defaultValue={editingEmployee?.position || ''}
                data-testid="employee-position"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Department *</label>
              <select
                name="departmentId"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                defaultValue={editingEmployee?.departmentId || ''}
                data-testid="employee-department"
                required
              >
                <option value="">Select department</option>
                {departments.map((dept) => (
                  <option key={dept.id} value={dept.id}>{dept.name}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Default Hours per Week *</label>
              <input
                name="defaultHours"
                type="number"
                min="1"
                max="80"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                defaultValue={editingEmployee?.defaultHoursPerWeek || 40}
                data-testid="employee-default-hours"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Salary</label>
              <input
                name="salary"
                type="number"
                min="0"
                step="0.01"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                defaultValue={editingEmployee?.salary || ''}
                data-testid="employee-salary"
              />
            </div>
          </div>
          
          <div className="flex justify-end space-x-3 mt-6">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
              disabled={operationLoading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
              disabled={operationLoading}
              data-testid="submit-employee"
            >
              {operationLoading ? (
                <span data-testid="submit-loading">
                  {editingEmployee ? 'Updating...' : 'Creating...'}
                </span>
              ) : (
                editingEmployee ? 'Update Employee' : 'Create Employee'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}