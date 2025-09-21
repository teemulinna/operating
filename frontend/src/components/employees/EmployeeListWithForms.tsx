import React, { useState } from 'react';
import { useEmployees, useCreateEmployee } from '../../hooks/useRealEmployees';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Plus, Users, AlertTriangle, Loader2, Check, X } from 'lucide-react';
import { EmployeeForm } from './EmployeeForm';

interface EmployeeFormData {
  name: string;
  email: string;
  department: string;
  role: string;
  salary: number;
  capacity: number;
}

interface SuccessMessage {
  show: boolean;
  message: string;
}

interface ErrorMessage {
  show: boolean;
  message: string;
}

export function EmployeeListWithForms() {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<SuccessMessage>({ show: false, message: '' });
  const [errorMessage, setErrorMessage] = useState<ErrorMessage>({ show: false, message: '' });

  // Use existing hooks
  const { data: employeesResponse, isLoading, error } = useEmployees();
  const createEmployeeMutation = useCreateEmployee({
    onSuccess: () => {
      setShowCreateForm(false);
      setSuccessMessage({ show: true, message: 'Employee created successfully' });
      setTimeout(() => setSuccessMessage({ show: false, message: '' }), 5000);
    },
    onError: (error: any) => {
      console.error('Failed to create employee:', error);
      setErrorMessage({ 
        show: true, 
        message: error.message || 'Failed to create employee. Please try again.' 
      });
      setTimeout(() => setErrorMessage({ show: false, message: '' }), 5000);
    },
  });

  const handleCreateEmployee = async (formData: EmployeeFormData) => {
    setIsSubmitting(true);
    setErrorMessage({ show: false, message: '' });
    
    try {
      // Transform form data to match backend expectations
      const employeeData = {
        firstName: formData.name.split(' ')[0] || formData.name,
        lastName: formData.name.split(' ').slice(1).join(' ') || '',
        email: formData.email,
        position: formData.role,
        department: formData.department,
        salary: formData.salary,
        capacity: formData.capacity,
        isActive: true,
        skills: []
      };
      
      await createEmployeeMutation.mutateAsync(employeeData);
    } catch (error) {
      console.error('Form submission error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const employees = employeesResponse?.data || [];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Users className="h-8 w-8" />
              Employee Management
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              Manage your team members and their information
            </p>
          </div>
          <Button
            data-testid="create-employee-button"
            onClick={() => setShowCreateForm(true)}
            className="flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Add Employee
          </Button>
        </div>
      </div>

      {/* Success Message */}
      {successMessage.show && (
        <div data-testid="success-message" className="mb-4 p-4 bg-green-50 border border-green-200 rounded-md flex items-center gap-2">
          <Check className="h-5 w-5 text-green-600" />
          <span className="text-green-800">{successMessage.message}</span>
        </div>
      )}

      {/* Error Message */}
      {errorMessage.show && (
        <div data-testid="error-message" className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md flex items-center gap-2">
          <X className="h-5 w-5 text-red-600" />
          <span className="text-red-800">{errorMessage.message}</span>
        </div>
      )}

      {/* Create Form Modal */}
      {showCreateForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Add New Employee</h2>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowCreateForm(false)}
                disabled={isSubmitting}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <EmployeeForm
              onSubmit={handleCreateEmployee}
              isSubmitting={isSubmitting}
              onCancel={() => setShowCreateForm(false)}
            />
          </div>
        </div>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin" />
          <span className="ml-2">Loading employees...</span>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-4">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-600" />
            <span className="text-red-800">Failed to load employees</span>
          </div>
        </div>
      )}

      {/* Employee Cards */}
      {!isLoading && !error && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {employees.map((employee: any) => (
            <Card key={employee.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle className="text-lg">
                  {employee.firstName} {employee.lastName}
                </CardTitle>
                <p className="text-sm text-gray-600">{employee.email}</p>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-500">Position:</span>
                    <Badge variant="secondary">{employee.position}</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-500">Department:</span>
                    <span className="text-sm font-medium">{employee.departmentName}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-500">Status:</span>
                    <Badge variant={employee.isActive ? "default" : "secondary"}>
                      {employee.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !error && employees.length === 0 && (
        <div className="text-center py-12">
          <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No employees found</h3>
          <p className="text-gray-500 mb-4">Get started by adding your first employee.</p>
          <Button onClick={() => setShowCreateForm(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Employee
          </Button>
        </div>
      )}
    </div>
  );
}