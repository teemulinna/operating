import React, { useState, useEffect, useMemo } from 'react';
import { Calendar, DollarSign, Clock, User, Tag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { LoadingButton } from '@/components/ui/loading-button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { useCreateProject, useUpdateProject } from '@/hooks/useProjects';
import { useToast } from '@/components/ui/use-toast';
import type { Project, CreateProjectRequest } from '@/types/project';

interface ProjectFormProps {
  project?: Project;
  onSuccess: (project: Project) => void;
  onCancel: () => void;
}

interface FormData {
  name: string;
  clientName: string;
  description: string;
  status: Project['status'];
  startDate: string;
  endDate: string;
  budget: string;
  hourlyRate: string;
  totalHours: string;
  tags: string;
  notes: string;
  isActive: boolean;
}

interface FormErrors {
  name?: string;
  clientName?: string;
  startDate?: string;
  endDate?: string;
  budget?: string;
  hourlyRate?: string;
  totalHours?: string;
}

export function ProjectForm({
  project,
  onSuccess,
  onCancel,
}: ProjectFormProps) {
  const createProject = useCreateProject();
  const updateProject = useUpdateProject();
  const { toast } = useToast();
  
  const mode = project ? 'edit' : 'create';
  const isSubmitting = createProject.isPending || updateProject.isPending;

  const [formData, setFormData] = useState<FormData>({
    name: '',
    clientName: '',
    description: '',
    status: 'planning',
    startDate: '',
    endDate: '',
    budget: '',
    hourlyRate: '',
    totalHours: '',
    tags: '',
    notes: '',
    isActive: true,
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [submitError, setSubmitError] = useState<string>('');

  // Initialize form with project data in edit mode
  useEffect(() => {
    if (mode === 'edit' && project) {
      setFormData({
        name: project.name,
        clientName: project.clientName,
        description: project.description || '',
        status: project.status,
        startDate: project.startDate,
        endDate: project.endDate || '',
        budget: project.budget?.toString() || '',
        hourlyRate: project.hourlyRate?.toString() || '',
        totalHours: project.totalHours?.toString() || '',
        tags: project.tags?.join(', ') || '',
        notes: project.notes || '',
        isActive: project.isActive,
      });
    }
  }, [mode, project]);

  // Calculate estimated budget based on hours and rate
  const estimatedBudget = useMemo(() => {
    const hours = parseFloat(formData.totalHours);
    const rate = parseFloat(formData.hourlyRate);
    if (hours > 0 && rate > 0) {
      return hours * rate;
    }
    return 0;
  }, [formData.totalHours, formData.hourlyRate]);

  const handleInputChange = (field: keyof FormData, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear error when user starts typing
    if (errors[field as keyof FormErrors]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    // Required fields
    if (!formData.name.trim()) {
      newErrors.name = 'Project name is required';
    } else if (formData.name.trim().length < 2) {
      newErrors.name = 'Project name must be at least 2 characters';
    } else if (formData.name.trim().length > 255) {
      newErrors.name = 'Project name must be less than 255 characters';
    }

    if (!formData.clientName.trim()) {
      newErrors.clientName = 'Client name is required';
    }

    if (!formData.startDate) {
      newErrors.startDate = 'Start date is required';
    }

    // Date validation
    if (formData.startDate && formData.endDate) {
      const startDate = new Date(formData.startDate);
      const endDate = new Date(formData.endDate);
      if (endDate <= startDate) {
        newErrors.endDate = 'End date must be after start date';
      }
    }

    // Number validations
    if (formData.budget && (isNaN(parseFloat(formData.budget)) || parseFloat(formData.budget) < 0)) {
      newErrors.budget = 'Budget must be a positive number';
    }

    if (formData.hourlyRate && (isNaN(parseFloat(formData.hourlyRate)) || parseFloat(formData.hourlyRate) <= 0)) {
      newErrors.hourlyRate = 'Hourly rate must be greater than 0';
    }

    if (formData.totalHours && (isNaN(parseFloat(formData.totalHours)) || parseFloat(formData.totalHours) < 0)) {
      newErrors.totalHours = 'Total hours must be a positive number';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    const submitData: CreateProjectRequest = {
      name: formData.name.trim(),
      clientName: formData.clientName.trim(),
      description: formData.description.trim() || undefined,
      status: formData.status,
      startDate: formData.startDate,
      endDate: formData.endDate || undefined,
      budget: formData.budget ? parseFloat(formData.budget) : undefined,
      hourlyRate: formData.hourlyRate ? parseFloat(formData.hourlyRate) : undefined,
      totalHours: formData.totalHours ? parseFloat(formData.totalHours) : undefined,
      tags: formData.tags ? formData.tags.split(',').map(tag => tag.trim()).filter(Boolean) : [],
      notes: formData.notes.trim() || undefined,
      isActive: formData.isActive,
      teamMembers: project?.teamMembers || [],
    };

    try {
      setSubmitError('');
      
      if (mode === 'create') {
        const result = await createProject.mutateAsync(submitData);
        onSuccess(result);
      } else if (project) {
        const result = await updateProject.mutateAsync({
          id: project.id,
          updates: submitData,
        });
        onSuccess(result);
      }
    } catch (error: any) {
      setSubmitError(error.message || 'An error occurred while saving the project');
    }
  };


  const isFormValid = formData.name.trim() && formData.clientName.trim() && formData.startDate;

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>
          {mode === 'create' ? 'Create New Project' : 'Edit Project'}
        </CardTitle>
        <CardDescription>
          {mode === 'create' 
            ? 'Enter the details for your new project'
            : 'Update the project information'
          }
        </CardDescription>
      </CardHeader>

      <CardContent>
        {submitError && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-800 text-sm">{submitError}</p>
          </div>
        )}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Project Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                placeholder="Enter project name"
                className={errors.name ? 'border-red-500' : ''}
              />
              {errors.name && (
                <p className="text-sm text-red-600" role="alert">{errors.name}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="clientName">Client Name *</Label>
              <Input
                id="clientName"
                value={formData.clientName}
                onChange={(e) => handleInputChange('clientName', e.target.value)}
                placeholder="Enter client name"
                className={errors.clientName ? 'border-red-500' : ''}
              />
              {errors.clientName && (
                <p className="text-sm text-red-600">{errors.clientName}</p>
              )}
            </div>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              placeholder="Enter project description"
              rows={3}
            />
          </div>

          {/* Status and Dates */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select
                value={formData.status}
                onValueChange={(value: Project['status']) => handleInputChange('status', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="planning">Planning</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="on-hold">On Hold</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="startDate">Start Date *</Label>
              <div className="relative">
                <Input
                  id="startDate"
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => handleInputChange('startDate', e.target.value)}
                  className={errors.startDate ? 'border-red-500' : ''}
                />
                <Calendar className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
              </div>
              {errors.startDate && (
                <p className="text-sm text-red-600">{errors.startDate}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="endDate">End Date</Label>
              <div className="relative">
                <Input
                  id="endDate"
                  type="date"
                  value={formData.endDate}
                  onChange={(e) => handleInputChange('endDate', e.target.value)}
                  className={errors.endDate ? 'border-red-500' : ''}
                />
                <Calendar className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
              </div>
              {errors.endDate && (
                <p className="text-sm text-red-600">{errors.endDate}</p>
              )}
            </div>
          </div>

          {/* Budget and Hours */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="budget">Budget ($)</Label>
              <div className="relative">
                <Input
                  id="budget"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.budget}
                  onChange={(e) => handleInputChange('budget', e.target.value)}
                  placeholder="0.00"
                  className={errors.budget ? 'border-red-500' : ''}
                />
                <DollarSign className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
              </div>
              {errors.budget && (
                <p className="text-sm text-red-600">{errors.budget}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="hourlyRate">Hourly Rate ($)</Label>
              <div className="relative">
                <Input
                  id="hourlyRate"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.hourlyRate}
                  onChange={(e) => handleInputChange('hourlyRate', e.target.value)}
                  placeholder="0.00"
                  className={errors.hourlyRate ? 'border-red-500' : ''}
                />
                <DollarSign className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
              </div>
              {errors.hourlyRate && (
                <p className="text-sm text-red-600">{errors.hourlyRate}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="totalHours">Total Hours</Label>
              <div className="relative">
                <Input
                  id="totalHours"
                  type="number"
                  step="0.5"
                  min="0"
                  value={formData.totalHours}
                  onChange={(e) => handleInputChange('totalHours', e.target.value)}
                  placeholder="0"
                  className={errors.totalHours ? 'border-red-500' : ''}
                />
                <Clock className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
              </div>
              {errors.totalHours && (
                <p className="text-sm text-red-600">{errors.totalHours}</p>
              )}
            </div>
          </div>

          {/* Estimated Budget Display */}
          {estimatedBudget > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center">
                <DollarSign className="h-5 w-5 text-blue-600 mr-2" />
                <span className="text-sm text-blue-800">
                  Estimated Budget: <span className="font-semibold">${estimatedBudget.toLocaleString()}</span>
                </span>
              </div>
            </div>
          )}

          {/* Tags */}
          <div className="space-y-2">
            <Label htmlFor="tags">Tags</Label>
            <div className="relative">
              <Input
                id="tags"
                value={formData.tags}
                onChange={(e) => handleInputChange('tags', e.target.value)}
                placeholder="e.g. web, react, typescript (comma separated)"
              />
              <Tag className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
            </div>
            <p className="text-xs text-gray-500">Separate tags with commas</p>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => handleInputChange('notes', e.target.value)}
              placeholder="Additional project notes..."
              rows={3}
            />
          </div>

          {/* Active Project Checkbox */}
          <div className="flex items-center space-x-2">
            <Checkbox
              id="isActive"
              checked={formData.isActive}
              onCheckedChange={(checked) => handleInputChange('isActive', checked)}
            />
            <Label htmlFor="isActive" className="cursor-pointer">
              Active Project
            </Label>
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-end space-x-4 pt-6 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <LoadingButton
              type="submit"
              loading={isSubmitting}
              disabled={!isFormValid || isSubmitting}
            >
              {isSubmitting 
                ? (mode === 'create' ? 'Creating...' : 'Updating...') 
                : (mode === 'create' ? 'Create Project' : 'Update Project')
              }
            </LoadingButton>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}