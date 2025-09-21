import React, { useState } from 'react';
import { Button } from '../ui/button';
import { Loader2 } from 'lucide-react';

interface ProjectFormData {
  name: string;
  description: string;
  clientName: string;
  startDate: string;
  endDate: string;
  budget: number;
  priority: 'low' | 'medium' | 'high';
  status: 'planning' | 'active' | 'on-hold' | 'completed' | 'cancelled';
}

interface ValidationErrors {
  name?: string;
  description?: string;
  clientName?: string;
  startDate?: string;
  endDate?: string;
  budget?: string;
  priority?: string;
  status?: string;
}

interface ProjectFormProps {
  onSubmit: (data: ProjectFormData) => Promise<void>;
  onCancel: () => void;
  isSubmitting: boolean;
  initialData?: Partial<ProjectFormData>;
}

export function ProjectForm({ onSubmit, onCancel, isSubmitting, initialData }: ProjectFormProps) {
  const [formData, setFormData] = useState<ProjectFormData>({
    name: initialData?.name || '',
    description: initialData?.description || '',
    clientName: initialData?.clientName || '',
    startDate: initialData?.startDate || '',
    endDate: initialData?.endDate || '',
    budget: initialData?.budget || 0,
    priority: initialData?.priority || 'medium',
    status: initialData?.status || 'planning',
  });

  const [errors, setErrors] = useState<ValidationErrors>({});

  const validateForm = (): boolean => {
    const newErrors: ValidationErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Project name is required';
    }

    if (!formData.description.trim()) {
      newErrors.description = 'Description is required';
    }

    if (!formData.startDate) {
      newErrors.startDate = 'Start date is required';
    }

    if (formData.endDate && formData.startDate && new Date(formData.endDate) <= new Date(formData.startDate)) {
      newErrors.endDate = 'End date must be after start date';
    }

    if (formData.budget < 0) {
      newErrors.budget = 'Budget cannot be negative';
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
      await onSubmit(formData);
    } catch (error) {
      console.error('Form submission error:', error);
    }
  };

  const handleInputChange = (field: keyof ProjectFormData, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const priorityOptions = [
    { value: 'low', label: 'Low' },
    { value: 'medium', label: 'Medium' },
    { value: 'high', label: 'High' }
  ];

  const statusOptions = [
    { value: 'planning', label: 'Planning' },
    { value: 'active', label: 'Active' },
    { value: 'on-hold', label: 'On Hold' },
    { value: 'completed', label: 'Completed' },
    { value: 'cancelled', label: 'Cancelled' }
  ];

  return (
    <form onSubmit={handleSubmit} data-testid="project-form" className="space-y-4">
      {/* Name Field */}
      <div>
        <label htmlFor="project-name" className="block text-sm font-medium text-gray-700 mb-1">
          Project Name *
        </label>
        <input
          id="project-name"
          data-testid="project-name-input"
          type="text"
          value={formData.name}
          onChange={(e) => handleInputChange('name', e.target.value)}
          className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
            errors.name ? 'border-red-500' : 'border-gray-300'
          }`}
          placeholder="Enter project name"
          disabled={isSubmitting}
        />
        {errors.name && (
          <p data-testid="field-error-name" className="mt-1 text-sm text-red-600">
            {errors.name}
          </p>
        )}
      </div>

      {/* Description Field */}
      <div>
        <label htmlFor="project-description" className="block text-sm font-medium text-gray-700 mb-1">
          Description *
        </label>
        <textarea
          id="project-description"
          data-testid="project-description-textarea"
          value={formData.description}
          onChange={(e) => handleInputChange('description', e.target.value)}
          rows={3}
          className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
            errors.description ? 'border-red-500' : 'border-gray-300'
          }`}
          placeholder="Enter project description"
          disabled={isSubmitting}
        />
        {errors.description && (
          <p data-testid="field-error-description" className="mt-1 text-sm text-red-600">
            {errors.description}
          </p>
        )}
      </div>

      {/* Client Name Field */}
      <div>
        <label htmlFor="project-client" className="block text-sm font-medium text-gray-700 mb-1">
          Client Name
        </label>
        <input
          id="project-client"
          data-testid="project-client-input"
          type="text"
          value={formData.clientName}
          onChange={(e) => handleInputChange('clientName', e.target.value)}
          className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
            errors.clientName ? 'border-red-500' : 'border-gray-300'
          }`}
          placeholder="Enter client name"
          disabled={isSubmitting}
        />
        {errors.clientName && (
          <p data-testid="field-error-clientName" className="mt-1 text-sm text-red-600">
            {errors.clientName}
          </p>
        )}
      </div>

      {/* Date Fields */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label htmlFor="project-start-date" className="block text-sm font-medium text-gray-700 mb-1">
            Start Date *
          </label>
          <input
            id="project-start-date"
            data-testid="project-start-date-input"
            type="date"
            value={formData.startDate}
            onChange={(e) => handleInputChange('startDate', e.target.value)}
            className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              errors.startDate ? 'border-red-500' : 'border-gray-300'
            }`}
            disabled={isSubmitting}
          />
          {errors.startDate && (
            <p data-testid="field-error-startDate" className="mt-1 text-sm text-red-600">
              {errors.startDate}
            </p>
          )}
        </div>

        <div>
          <label htmlFor="project-end-date" className="block text-sm font-medium text-gray-700 mb-1">
            End Date
          </label>
          <input
            id="project-end-date"
            data-testid="project-end-date-input"
            type="date"
            value={formData.endDate}
            onChange={(e) => handleInputChange('endDate', e.target.value)}
            className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              errors.endDate ? 'border-red-500' : 'border-gray-300'
            }`}
            disabled={isSubmitting}
          />
          {errors.endDate && (
            <p data-testid="field-error-endDate" className="mt-1 text-sm text-red-600">
              {errors.endDate}
            </p>
          )}
        </div>
      </div>

      {/* Budget Field */}
      <div>
        <label htmlFor="project-budget" className="block text-sm font-medium text-gray-700 mb-1">
          Budget ($)
        </label>
        <input
          id="project-budget"
          data-testid="project-budget-input"
          type="number"
          min="0"
          step="1000"
          value={formData.budget}
          onChange={(e) => handleInputChange('budget', parseInt(e.target.value) || 0)}
          className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
            errors.budget ? 'border-red-500' : 'border-gray-300'
          }`}
          placeholder="e.g. 50000"
          disabled={isSubmitting}
        />
        {errors.budget && (
          <p data-testid="field-error-budget" className="mt-1 text-sm text-red-600">
            {errors.budget}
          </p>
        )}
      </div>

      {/* Priority and Status Fields */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label htmlFor="project-priority" className="block text-sm font-medium text-gray-700 mb-1">
            Priority *
          </label>
          <select
            id="project-priority"
            data-testid="project-priority-select"
            value={formData.priority}
            onChange={(e) => handleInputChange('priority', e.target.value as ProjectFormData['priority'])}
            className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              errors.priority ? 'border-red-500' : 'border-gray-300'
            }`}
            disabled={isSubmitting}
          >
            {priorityOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          {errors.priority && (
            <p data-testid="field-error-priority" className="mt-1 text-sm text-red-600">
              {errors.priority}
            </p>
          )}
        </div>

        <div>
          <label htmlFor="project-status" className="block text-sm font-medium text-gray-700 mb-1">
            Status *
          </label>
          <select
            id="project-status"
            data-testid="project-status-select"
            value={formData.status}
            onChange={(e) => handleInputChange('status', e.target.value as ProjectFormData['status'])}
            className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              errors.status ? 'border-red-500' : 'border-gray-300'
            }`}
            disabled={isSubmitting}
          >
            {statusOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          {errors.status && (
            <p data-testid="field-error-status" className="mt-1 text-sm text-red-600">
              {errors.status}
            </p>
          )}
        </div>
      </div>

      {/* Form Actions */}
      <div className="flex justify-end gap-3 pt-4">
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
          data-testid="project-form-submit"
          disabled={isSubmitting}
          className="min-w-[120px]"
        >
          {isSubmitting ? (
            <>
              <Loader2 data-testid="loading-spinner" className="h-4 w-4 animate-spin mr-2" />
              Creating...
            </>
          ) : (
            'Create Project'
          )}
        </Button>
      </div>
    </form>
  );
}