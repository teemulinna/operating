import React, { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select } from '../ui/select';
import { Textarea } from '../ui/textarea';
import { Loader2 } from 'lucide-react';

interface EmployeeFormData {
  firstName: string;
  lastName: string;
  email: string;
  position: string;
  departmentId: string;
  weeklyCapacity: number;
  salary: number;
}

interface ValidationErrors {
  firstName?: string;
  lastName?: string;
  email?: string;
  position?: string;
  departmentId?: string;
  weeklyCapacity?: string;
  salary?: string;
  general?: string;
}

interface Department {
  id: string;
  name: string;
}

interface EmployeeFormProps {
  onSubmit: (data: EmployeeFormData) => Promise<void>;
  onCancel: () => void;
  isSubmitting: boolean;
  initialData?: Partial<EmployeeFormData>;
}

export function EmployeeForm({ onSubmit, onCancel, isSubmitting, initialData }: EmployeeFormProps) {
  const [formData, setFormData] = useState<EmployeeFormData>({
    firstName: initialData?.firstName || '',
    lastName: initialData?.lastName || '',
    email: initialData?.email || '',
    position: initialData?.position || '',
    departmentId: initialData?.departmentId || '',
    weeklyCapacity: initialData?.weeklyCapacity || 40,
    salary: initialData?.salary || 0,
  });

  const [departments, setDepartments] = useState<Department[]>([]);
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [departmentsLoading, setDepartmentsLoading] = useState(true);

  // Load departments from API
  useEffect(() => {
    const loadDepartments = async () => {
      setDepartmentsLoading(true);
      try {
        // Fetch from the correct backend port
        const response = await fetch('http://localhost:3001/api/departments', {
          headers: {
            'Content-Type': 'application/json',
          }
        });

        console.log('Department fetch response status:', response.status);
        console.log('Department fetch response ok:', response.ok);

        if (response.ok) {
          const data = await response.json();
          console.log('Successfully fetched departments:', data);
          console.log('Is array?', Array.isArray(data));
          console.log('Data length:', data.length);

          // The API returns the departments array directly
          if (Array.isArray(data) && data.length > 0) {
            console.log('Setting departments to state:', data);
            setDepartments(data);
          } else if (Array.isArray(data)) {
            console.error('Departments array is empty');
            setDepartments([]);
          } else {
            console.error('Unexpected department data format:', data);
            setDepartments([]);
          }
        } else {
          console.error('Failed to fetch departments:', response.status);
          console.error('Response text:', await response.text());
          setDepartments([]);
        }
      } catch (error) {
        console.error('Failed to load departments - Exception:', error);
        setDepartments([]);
      } finally {
        setDepartmentsLoading(false);
        console.log('Departments loading finished');
      }
    };
    loadDepartments();
  }, []);

  const validateForm = (): boolean => {
    const newErrors: ValidationErrors = {};

    if (!formData.firstName.trim()) {
      newErrors.firstName = 'First name is required';
    }

    if (!formData.lastName.trim()) {
      newErrors.lastName = 'Last name is required';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (!formData.position.trim()) {
      newErrors.position = 'Position is required';
    }

    if (!formData.departmentId) {
      newErrors.departmentId = 'Department is required';
    }

    if (formData.salary <= 0) {
      newErrors.salary = 'Salary must be greater than 0';
    }

    if (formData.weeklyCapacity <= 0 || formData.weeklyCapacity > 100) {
      newErrors.weeklyCapacity = 'Hours per week must be between 1 and 100';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    try {
      console.log('Form submitting data:', formData);
      await onSubmit(formData);
    } catch (error) {
      console.error('Form submission error:', error);
      
      // Show user-friendly error message
      let errorMessage = 'Failed to save employee. ';
      
      if (error instanceof Error) {
        if (error.message.includes('fetch')) {
          errorMessage += 'Unable to connect to server. Please check if the backend is running.';
        } else if (error.message.includes('Network')) {
          errorMessage += 'Network error. Please check your connection.';
        } else {
          errorMessage += error.message;
        }
      } else {
        errorMessage += 'Please try again or contact support if the problem persists.';
      }
      
      // Set a general error that will be displayed
      setErrors(prev => ({
        ...prev,
        general: errorMessage
      }));
    }
  };

  const handleInputChange = (field: keyof EmployeeFormData, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4" data-testid="employee-form">
      {/* General Error Message */}
      {errors.general && (
        <div className="p-4 mb-4 text-sm text-red-700 bg-red-100 border border-red-300 rounded-md">
          <p className="font-medium">Error</p>
          <p>{errors.general}</p>
        </div>
      )}
      
      {/* First Name */}
      <div>
        <Label htmlFor="firstName">First Name *</Label>
        <Input
          id="firstName"
          data-testid="employee-first-name"
          type="text"
          value={formData.firstName}
          onChange={(e) => handleInputChange('firstName', e.target.value)}
          className={errors.firstName ? 'border-red-500' : ''}
          placeholder="Enter first name"
          disabled={isSubmitting}
        />
        {errors.firstName && (
          <p className="mt-1 text-sm text-red-600">{errors.firstName}</p>
        )}
      </div>

      {/* Last Name */}
      <div>
        <Label htmlFor="lastName">Last Name *</Label>
        <Input
          id="lastName"
          data-testid="employee-last-name"
          type="text"
          value={formData.lastName}
          onChange={(e) => handleInputChange('lastName', e.target.value)}
          className={errors.lastName ? 'border-red-500' : ''}
          placeholder="Enter last name"
          disabled={isSubmitting}
        />
        {errors.lastName && (
          <p className="mt-1 text-sm text-red-600">{errors.lastName}</p>
        )}
      </div>

      {/* Email */}
      <div>
        <Label htmlFor="email">Email *</Label>
        <Input
          id="email"
          data-testid="employee-email"
          type="email"
          value={formData.email}
          onChange={(e) => handleInputChange('email', e.target.value)}
          className={errors.email ? 'border-red-500' : ''}
          placeholder="Enter email address"
          disabled={isSubmitting}
        />
        {errors.email && (
          <p className="mt-1 text-sm text-red-600">{errors.email}</p>
        )}
      </div>

      {/* Position */}
      <div>
        <Label htmlFor="position">Position *</Label>
        <Input
          id="position"
          data-testid="employee-position"
          type="text"
          value={formData.position}
          onChange={(e) => handleInputChange('position', e.target.value)}
          className={errors.position ? 'border-red-500' : ''}
          placeholder="Enter position"
          disabled={isSubmitting}
        />
        {errors.position && (
          <p className="mt-1 text-sm text-red-600">{errors.position}</p>
        )}
      </div>

      {/* Department */}
      <div>
        <Label htmlFor="departmentId">Department *</Label>
        {console.log('Render - departmentsLoading:', departmentsLoading)}
        {console.log('Render - departments:', departments)}
        {console.log('Render - departments length:', departments.length)}
        {departmentsLoading ? (
          <div className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm">
            <Loader2 className="h-4 w-4 animate-spin inline mr-2" />
            Loading departments...
          </div>
        ) : (
          <select
            id="departmentId"
            data-testid="employee-department"
            value={formData.departmentId}
            onChange={(e) => handleInputChange('departmentId', e.target.value)}
            className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              errors.departmentId ? 'border-red-500' : 'border-gray-300'
            }`}
            disabled={isSubmitting || departmentsLoading}
          >
            <option value="">
              {departments.length === 0 ? 'No departments available' : 'Select department'}
            </option>
            {departments.map((dept) => (
              <option key={dept.id} value={dept.id}>
                {dept.name}
              </option>
            ))}
          </select>
        )}
        {errors.departmentId && (
          <p className="mt-1 text-sm text-red-600">{errors.departmentId}</p>
        )}
        {departments.length === 0 && !departmentsLoading && (
          <p className="mt-1 text-sm text-yellow-600">
            No departments found. Please ensure the backend is running.
          </p>
        )}
      </div>

      {/* Weekly Capacity */}
      <div>
        <Label htmlFor="weeklyCapacity">Weekly Capacity *</Label>
        <Input
          id="weeklyCapacity"
          data-testid="employee-hours"
          type="number"
          min="1"
          max="100"
          value={formData.weeklyCapacity}
          onChange={(e) => handleInputChange('weeklyCapacity', parseInt(e.target.value) || 0)}
          className={errors.weeklyCapacity ? 'border-red-500' : ''}
          disabled={isSubmitting}
        />
        {errors.weeklyCapacity && (
          <p className="mt-1 text-sm text-red-600">{errors.weeklyCapacity}</p>
        )}
      </div>

      {/* Salary */}
      <div>
        <Label htmlFor="salary">Salary</Label>
        <Input
          id="salary"
          data-testid="employee-salary"
          type="number"
          min="0"
          step="1000"
          value={formData.salary}
          onChange={(e) => handleInputChange('salary', parseInt(e.target.value) || 0)}
          className={errors.salary ? 'border-red-500' : ''}
          placeholder="Enter salary"
          disabled={isSubmitting}
        />
        {errors.salary && (
          <p className="mt-1 text-sm text-red-600">{errors.salary}</p>
        )}
      </div>

      {/* Form Actions */}
      <div className="flex justify-end space-x-2 pt-4">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isSubmitting}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          data-testid="employee-form-submit"
          disabled={isSubmitting || departmentsLoading}
          className="min-w-[120px]"
        >
          {isSubmitting ? (
            <>
              <Loader2 data-testid="loading-spinner" className="mr-2 h-4 w-4 animate-spin" />
              Creating...
            </>
          ) : (
            'Create Employee'
          )}
        </Button>
      </div>
    </form>
  );
}
