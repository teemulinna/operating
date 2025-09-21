import React from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { FolderOpen, AlertTriangle } from 'lucide-react';

interface ProjectDialogProps {
  isOpen: boolean;
  onClose: () => void;
  mode: 'create' | 'edit' | 'view';
}

export function ProjectDialog({ isOpen, onClose, mode }: ProjectDialogProps) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = React.useState({
    name: '',
    description: '',
    clientName: '',
    startDate: new Date().toISOString().split('T')[0],
    endDate: '',
    budget: '',
    priority: 'medium',
    status: 'planning',
    requiredSkills: '',
  });
  const [errors, setErrors] = React.useState<Record<string, string>>({});

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch('http://localhost:3001/api/projects', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...data,
          budget: data.budget ? parseFloat(data.budget) : undefined,
          requiredSkills: data.requiredSkills ? data.requiredSkills.split(',').map((s: string) => s.trim()).filter(Boolean) : []
        }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to create project');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      onClose();
      // Reset form
      setFormData({
        name: '',
        description: '',
        clientName: '',
        startDate: new Date().toISOString().split('T')[0],
        endDate: '',
        budget: '',
        priority: 'medium',
        status: 'planning',
        requiredSkills: '',
      });
      setErrors({});
    },
    onError: (error: Error) => {
      console.error('Project creation failed:', error);
    }
  });

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Project name is required';
    }

    if (!formData.startDate) {
      newErrors.startDate = 'Start date is required';
    }

    if (formData.endDate && formData.startDate && new Date(formData.endDate) <= new Date(formData.startDate)) {
      newErrors.endDate = 'End date must be after start date';
    }

    if (formData.budget && parseFloat(formData.budget) < 0) {
      newErrors.budget = 'Budget must be positive';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    if (mode === 'create') {
      createMutation.mutate(formData);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error for this field
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const isLoading = createMutation.isPending;
  const skillsList = formData.requiredSkills ? formData.requiredSkills.split(',').map(s => s.trim()).filter(Boolean) : [];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[700px]" data-testid="project-dialog">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2" data-testid="project-dialog-title">
            <FolderOpen className="h-5 w-5" />
            {mode === 'create' && 'Create New Project'}
            {mode === 'edit' && 'Edit Project'}
            {mode === 'view' && 'Project Details'}
          </DialogTitle>
          <DialogDescription>
            {mode === 'create' && 'Create a new project with all the necessary details and requirements.'}
            {mode === 'edit' && 'Update the project information.'}
            {mode === 'view' && 'View project details and current status.'}
          </DialogDescription>
        </DialogHeader>

        {createMutation.error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3" data-testid="project-error-message">
            <div className="flex items-center gap-2 text-red-700">
              <AlertTriangle className="h-4 w-4" />
              <span className="text-sm font-medium">Creation Failed</span>
            </div>
            <p className="text-xs text-red-600 mt-1">
              {createMutation.error.message}
            </p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 space-y-2">
              <Label htmlFor="name">Project Name *</Label>
              <Input
                id="name"
                data-testid="project-name"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                placeholder="Enter project name"
                required
              />
              {errors.name && (
                <p className="text-xs text-red-600" data-testid="project-name-error">
                  {errors.name}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="client">Client Name</Label>
              <Input
                id="client"
                data-testid="project-client"
                value={formData.clientName}
                onChange={(e) => handleInputChange('clientName', e.target.value)}
                placeholder="Enter client name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="priority">Priority</Label>
              <Select 
                value={formData.priority} 
                onValueChange={(value) => handleInputChange('priority', value)}
              >
                <SelectTrigger data-testid="project-priority">
                  <SelectValue placeholder="Select priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="startDate">Start Date *</Label>
              <Input
                id="startDate"
                data-testid="project-start-date"
                type="date"
                value={formData.startDate}
                onChange={(e) => handleInputChange('startDate', e.target.value)}
                required
              />
              {errors.startDate && (
                <p className="text-xs text-red-600" data-testid="project-start-date-error">
                  {errors.startDate}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="endDate">End Date</Label>
              <Input
                id="endDate"
                data-testid="project-end-date"
                type="date"
                value={formData.endDate}
                onChange={(e) => handleInputChange('endDate', e.target.value)}
                min={formData.startDate}
              />
              {errors.endDate && (
                <p className="text-xs text-red-600" data-testid="project-date-error">
                  {errors.endDate}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="budget">Budget ($)</Label>
              <Input
                id="budget"
                data-testid="project-budget"
                type="number"
                min="0"
                step="100"
                value={formData.budget}
                onChange={(e) => handleInputChange('budget', e.target.value)}
                placeholder="0"
              />
              {errors.budget && (
                <p className="text-xs text-red-600" data-testid="project-budget-error">
                  {errors.budget}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Initial Status</Label>
              <Select 
                value={formData.status} 
                onValueChange={(value) => handleInputChange('status', value)}
              >
                <SelectTrigger data-testid="project-status">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="planning">Planning</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="on-hold">On Hold</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              data-testid="project-description"
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              placeholder="Project description and objectives..."
              rows={3}
              className="resize-none"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="requiredSkills">Required Skills (comma-separated)</Label>
            <Input
              id="requiredSkills"
              data-testid="project-required-skills"
              value={formData.requiredSkills}
              onChange={(e) => handleInputChange('requiredSkills', e.target.value)}
              placeholder="React, Node.js, PostgreSQL, AWS"
            />
            {skillsList.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {skillsList.map((skill, index) => (
                  <Badge key={index} variant="outline" className="text-xs" data-testid="skill-tag">
                    {skill}
                  </Badge>
                ))}
              </div>
            )}
          </div>

          <DialogFooter className="gap-2 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isLoading || !formData.name.trim()}
              data-testid="project-submit-btn"
            >
              {isLoading ? 'Creating...' : 'Create Project'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}