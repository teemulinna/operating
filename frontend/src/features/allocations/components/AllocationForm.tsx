import React from 'react';
import type { Allocation, Employee, Project, AllocationFormData, ValidationError } from '../hooks/useAllocationOperations';

interface AllocationFormProps {
  allocation?: Allocation | null;
  employees: Employee[];
  projects: Project[];
  validationErrors: ValidationError[];
  operationLoading: boolean;
  onSubmit: (data: AllocationFormData) => Promise<void>;
  onCancel: () => void;
}

export const AllocationForm: React.FC<AllocationFormProps> = ({
  allocation,
  employees,
  projects,
  validationErrors,
  operationLoading,
  onSubmit,
  onCancel
}) => {
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    
    const allocationData: AllocationFormData = {
      employeeId: formData.get('employeeId') as string,
      projectId: formData.get('projectId') as string,
      startDate: formData.get('startDate') as string,
      endDate: formData.get('endDate') as string,
      allocatedHours: parseInt(formData.get('allocatedHours') as string),
      roleOnProject: formData.get('role') as string || 'Team Member',
      status: formData.get('status') as string || 'planned',
      notes: formData.get('notes') as string || '',
      isActive: true
    };
    
    await onSubmit(allocationData);
  };

  const getFieldError = (fieldName: string): string | undefined => {
    return validationErrors.find(error => error.field === fieldName)?.message;
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="space-y-4">
        {/* Employee Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Employee *
          </label>
          <select
            name="employeeId"
            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              getFieldError('employeeId') ? 'border-red-300' : 'border-gray-300'
            }`}
            defaultValue={allocation?.employeeId || ''}
            data-testid="allocation-employee"
            required
          >
            <option value="">Select employee</option>
            {employees.map((employee) => (
              <option key={employee.id} value={employee.id}>
                {employee.firstName} {employee.lastName} ({employee.department})
              </option>
            ))}
          </select>
          {getFieldError('employeeId') && (
            <p className="mt-1 text-sm text-red-600">{getFieldError('employeeId')}</p>
          )}
        </div>

        {/* Project Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Project *
          </label>
          <select
            name="projectId"
            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              getFieldError('projectId') ? 'border-red-300' : 'border-gray-300'
            }`}
            defaultValue={allocation?.projectId || ''}
            data-testid="allocation-project"
            required
          >
            <option value="">Select project</option>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name} ({project.status})
              </option>
            ))}
          </select>
          {getFieldError('projectId') && (
            <p className="mt-1 text-sm text-red-600">{getFieldError('projectId')}</p>
          )}
        </div>

        {/* Date Range */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Start Date *
            </label>
            <input
              name="startDate"
              type="date"
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                getFieldError('startDate') ? 'border-red-300' : 'border-gray-300'
              }`}
              defaultValue={allocation?.startDate ? allocation.startDate.split('T')[0] : ''}
              data-testid="allocation-start-date"
              required
            />
            {getFieldError('startDate') && (
              <p className="mt-1 text-sm text-red-600">{getFieldError('startDate')}</p>
            )}
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              End Date *
            </label>
            <input
              name="endDate"
              type="date"
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                getFieldError('endDate') ? 'border-red-300' : 'border-gray-300'
              }`}
              defaultValue={allocation?.endDate ? allocation.endDate.split('T')[0] : ''}
              data-testid="allocation-end-date"
              required
            />
            {getFieldError('endDate') && (
              <p className="mt-1 text-sm text-red-600">{getFieldError('endDate')}</p>
            )}
          </div>
        </div>

        {/* Hours per Week */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Hours per Week *
          </label>
          <input
            name="allocatedHours"
            type="number"
            min="1"
            max="80"
            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              getFieldError('allocatedHours') ? 'border-red-300' : 'border-gray-300'
            }`}
            defaultValue={allocation?.allocatedHours || ''}
            data-testid="allocation-hours"
            required
          />
          {getFieldError('allocatedHours') && (
            <p className="mt-1 text-sm text-red-600">{getFieldError('allocatedHours')}</p>
          )}
          <p className="mt-1 text-sm text-gray-500">
            Enter the number of hours per week for this allocation (1-80 hours)
          </p>
        </div>

        {/* Role */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Role on Project
          </label>
          <input
            name="role"
            type="text"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            defaultValue={allocation?.roleOnProject || ''}
            data-testid="allocation-role"
            placeholder="e.g., Developer, Designer, Analyst, Team Lead"
          />
        </div>

        {/* Status */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Status
          </label>
          <select
            name="status"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            defaultValue={allocation?.status || 'planned'}
            data-testid="allocation-status"
          >
            <option value="planned">Planned</option>
            <option value="active">Active</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>

        {/* Notes */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Notes
          </label>
          <textarea
            name="notes"
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            defaultValue={allocation?.notes || ''}
            data-testid="allocation-notes"
            placeholder="Optional notes about this allocation (special requirements, context, etc.)"
          />
        </div>
      </div>
      
      {/* Form Actions */}
      <div className="flex justify-end space-x-3 mt-6">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
          disabled={operationLoading}
        >
          Cancel
        </button>
        <button
          type="submit"
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors"
          disabled={operationLoading}
          data-testid="submit-allocation"
        >
          {operationLoading ? (
            <span data-testid="submit-loading">
              {allocation ? 'Updating...' : 'Creating...'}
            </span>
          ) : (
            allocation ? 'Update Allocation' : 'Create Allocation'
          )}
        </button>
      </div>
    </form>
  );
};