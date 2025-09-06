import React, { useState } from 'react';
import { Plus, Edit, Trash2, RefreshCw, AlertTriangle, Users, Star, Clock, Target } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { LoadingButton } from '@/components/ui/loading-button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/components/ui/use-toast';
import { useProjectRoles, useCreateProjectRole, useUpdateProjectRole, useDeleteProjectRole } from '@/hooks/useProjects';
import type { 
  ProjectRole, 
  CreateProjectRoleRequest, 
  ExperienceLevel,
  ProjectRoleStatus 
} from '@/types/project';
import { ROLE_STATUS_COLORS, EXPERIENCE_LEVEL_COLORS } from '@/types/project';

interface ProjectRoleManagerProps {
  projectId: string;
}

interface RoleFormData {
  roleName: string;
  description: string;
  requiredSkills: string;
  minimumExperienceLevel: ExperienceLevel;
  plannedAllocationPercentage: string;
  estimatedHours: string;
}

interface FormErrors {
  roleName?: string;
  plannedAllocationPercentage?: string;
  estimatedHours?: string;
}

export function ProjectRoleManager({ projectId }: ProjectRoleManagerProps) {
  const { data: roles, isLoading, error, refetch } = useProjectRoles(projectId);
  const createRole = useCreateProjectRole();
  const updateRole = useUpdateProjectRole();
  const deleteRole = useDeleteProjectRole();
  const { toast } = useToast();

  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedRole, setSelectedRole] = useState<ProjectRole | null>(null);

  const [formData, setFormData] = useState<RoleFormData>({
    roleName: '',
    description: '',
    requiredSkills: '',
    minimumExperienceLevel: 'junior',
    plannedAllocationPercentage: '',
    estimatedHours: '',
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [submitError, setSubmitError] = useState<string>('');

  const isSubmitting = createRole.isPending || updateRole.isPending || deleteRole.isPending;

  const resetForm = () => {
    setFormData({
      roleName: '',
      description: '',
      requiredSkills: '',
      minimumExperienceLevel: 'junior',
      plannedAllocationPercentage: '',
      estimatedHours: '',
    });
    setErrors({});
    setSubmitError('');
  };

  const openAddDialog = () => {
    resetForm();
    setShowAddDialog(true);
  };

  const openEditDialog = (role: ProjectRole) => {
    setFormData({
      roleName: role.roleName,
      description: role.description || '',
      requiredSkills: role.requiredSkills.join(', '),
      minimumExperienceLevel: role.minimumExperienceLevel,
      plannedAllocationPercentage: role.plannedAllocationPercentage.toString(),
      estimatedHours: role.estimatedHours?.toString() || '',
    });
    setSelectedRole(role);
    setErrors({});
    setSubmitError('');
    setShowEditDialog(true);
  };

  const openDeleteDialog = (role: ProjectRole) => {
    setSelectedRole(role);
    setShowDeleteDialog(true);
  };

  const handleInputChange = (field: keyof RoleFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear error when user starts typing
    if (errors[field as keyof FormErrors]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    // Required fields
    if (!formData.roleName.trim()) {
      newErrors.roleName = 'Role name is required';
    } else if (formData.roleName.trim().length < 2) {
      newErrors.roleName = 'Role name must be at least 2 characters';
    } else if (formData.roleName.trim().length > 255) {
      newErrors.roleName = 'Role name must be less than 255 characters';
    }

    if (!formData.plannedAllocationPercentage.trim()) {
      newErrors.plannedAllocationPercentage = 'Allocation percentage is required';
    } else {
      const allocation = parseFloat(formData.plannedAllocationPercentage);
      if (isNaN(allocation) || allocation <= 0 || allocation > 100) {
        newErrors.plannedAllocationPercentage = 'Allocation must be between 1 and 100';
      }
    }

    // Optional estimated hours validation
    if (formData.estimatedHours.trim()) {
      const hours = parseFloat(formData.estimatedHours);
      if (isNaN(hours) || hours < 0) {
        newErrors.estimatedHours = 'Estimated hours must be a positive number';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSaveRole = async () => {
    if (!validateForm()) {
      return;
    }

    const roleData: CreateProjectRoleRequest = {
      projectId,
      roleName: formData.roleName.trim(),
      description: formData.description.trim() || undefined,
      requiredSkills: formData.requiredSkills
        ? formData.requiredSkills.split(',').map(skill => skill.trim()).filter(Boolean)
        : [],
      minimumExperienceLevel: formData.minimumExperienceLevel,
      plannedAllocationPercentage: parseFloat(formData.plannedAllocationPercentage),
      estimatedHours: formData.estimatedHours ? parseFloat(formData.estimatedHours) : undefined,
    };

    try {
      setSubmitError('');
      
      if (showEditDialog && selectedRole) {
        await updateRole.mutateAsync({
          id: selectedRole.id,
          updates: roleData,
        });
        toast({
          title: 'Role Updated',
          description: `${roleData.roleName} has been successfully updated.`,
        });
        setShowEditDialog(false);
      } else {
        await createRole.mutateAsync(roleData);
        toast({
          title: 'Role Created',
          description: `${roleData.roleName} has been successfully created.`,
        });
        setShowAddDialog(false);
      }
      
      resetForm();
      setSelectedRole(null);
    } catch (error: any) {
      setSubmitError(error.message || 'An error occurred while saving the role');
    }
  };

  const handleDeleteRole = async () => {
    if (!selectedRole) return;

    try {
      await deleteRole.mutateAsync(selectedRole.id);
      toast({
        title: 'Role Deleted',
        description: `${selectedRole.roleName} has been successfully deleted.`,
      });
      setShowDeleteDialog(false);
      setSelectedRole(null);
    } catch (error: any) {
      toast({
        title: 'Delete Failed',
        description: error.message || 'Unable to delete role. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const formatSkills = (skills: string[]) => {
    if (skills.length === 0) return 'No specific skills required';
    return skills.slice(0, 3).join(', ') + (skills.length > 3 ? ` +${skills.length - 3} more` : '');
  };

  const getProgressPercentage = (actualHours?: number, estimatedHours?: number) => {
    if (!actualHours || !estimatedHours || estimatedHours === 0) return 0;
    return Math.min((actualHours / estimatedHours) * 100, 100);
  };

  // Loading state
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Project Roles & Skills</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <span className="ml-2 text-gray-600">Loading roles...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Error state
  if (error) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col items-center justify-center py-12 text-center space-y-4">
            <div className="flex items-center justify-center w-16 h-16 rounded-full bg-red-100">
              <AlertTriangle className="w-8 h-8 text-red-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Error Loading Roles
              </h3>
              <p className="text-gray-600 mb-4">
                {error.message || 'An unexpected error occurred while loading project roles.'}
              </p>
              <Button onClick={() => refetch()} variant="outline">
                <RefreshCw className="mr-2 h-4 w-4" />
                Try Again
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Empty state
  if (!roles || roles.length === 0) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Project Roles & Skills</CardTitle>
              <CardDescription>
                Define roles and required skills for this project
              </CardDescription>
            </div>
            <Button onClick={openAddDialog} size="sm">
              <Plus className="mr-2 h-4 w-4" />
              Add Role
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12 text-center space-y-4">
            <div className="flex items-center justify-center w-16 h-16 rounded-full bg-blue-100">
              <Users className="w-8 h-8 text-blue-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                No roles defined yet
              </h3>
              <p className="text-gray-600 mb-6 max-w-md">
                Start by defining roles and skill requirements for this project to better manage team assignments.
              </p>
              <Button onClick={openAddDialog}>
                <Plus className="mr-2 h-4 w-4" />
                Define the first role
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Role form dialog component
  const RoleFormDialog = () => (
    <Dialog open={showAddDialog || showEditDialog} onOpenChange={(open) => {
      if (!open) {
        setShowAddDialog(false);
        setShowEditDialog(false);
        resetForm();
        setSelectedRole(null);
      }
    }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {showEditDialog ? 'Edit Role' : 'Add New Role'}
          </DialogTitle>
          <DialogDescription>
            {showEditDialog 
              ? 'Update the role information and requirements'
              : 'Define a new role and its requirements for this project'
            }
          </DialogDescription>
        </DialogHeader>

        {submitError && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
            <p className="text-red-800 text-sm">{submitError}</p>
          </div>
        )}

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="roleName">Role Name *</Label>
            <Input
              id="roleName"
              value={formData.roleName}
              onChange={(e) => handleInputChange('roleName', e.target.value)}
              placeholder="e.g. Senior Frontend Developer"
              className={errors.roleName ? 'border-red-500' : ''}
            />
            {errors.roleName && (
              <p className="text-sm text-red-600" role="alert">{errors.roleName}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              placeholder="Describe the role responsibilities..."
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="requiredSkills">Required Skills</Label>
            <Input
              id="requiredSkills"
              value={formData.requiredSkills}
              onChange={(e) => handleInputChange('requiredSkills', e.target.value)}
              placeholder="e.g. React, TypeScript, CSS-in-JS (comma separated)"
            />
            <p className="text-xs text-gray-500">Separate skills with commas</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="experienceLevel">Experience Level</Label>
              <Select
                value={formData.minimumExperienceLevel}
                onValueChange={(value: ExperienceLevel) => handleInputChange('minimumExperienceLevel', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="junior">Junior</SelectItem>
                  <SelectItem value="intermediate">Intermediate</SelectItem>
                  <SelectItem value="senior">Senior</SelectItem>
                  <SelectItem value="expert">Expert</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="allocation">Allocation Percentage *</Label>
              <Input
                id="allocation"
                type="number"
                min="1"
                max="100"
                value={formData.plannedAllocationPercentage}
                onChange={(e) => handleInputChange('plannedAllocationPercentage', e.target.value)}
                placeholder="80"
                className={errors.plannedAllocationPercentage ? 'border-red-500' : ''}
              />
              {errors.plannedAllocationPercentage && (
                <p className="text-sm text-red-600">{errors.plannedAllocationPercentage}</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="estimatedHours">Estimated Hours</Label>
            <Input
              id="estimatedHours"
              type="number"
              min="0"
              step="0.5"
              value={formData.estimatedHours}
              onChange={(e) => handleInputChange('estimatedHours', e.target.value)}
              placeholder="320"
              className={errors.estimatedHours ? 'border-red-500' : ''}
            />
            {errors.estimatedHours && (
              <p className="text-sm text-red-600">{errors.estimatedHours}</p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => {
              setShowAddDialog(false);
              setShowEditDialog(false);
              resetForm();
              setSelectedRole(null);
            }}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <LoadingButton
            onClick={handleSaveRole}
            loading={isSubmitting}
            disabled={isSubmitting}
          >
            {showEditDialog ? 'Update Role' : 'Save Role'}
          </LoadingButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  // Delete confirmation dialog
  const DeleteConfirmDialog = () => (
    <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete Role</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete <strong>{selectedRole?.roleName}</strong>?
            This action cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
            Cancel
          </Button>
          <LoadingButton
            variant="destructive"
            onClick={handleDeleteRole}
            loading={deleteRole.isPending}
          >
            Delete
          </LoadingButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  return (
    <div role="region" aria-label="Project Roles & Skills">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Project Roles & Skills</CardTitle>
              <CardDescription>
                Define roles and required skills for this project
              </CardDescription>
            </div>
            <Button onClick={openAddDialog} size="sm">
              <Plus className="mr-2 h-4 w-4" />
              Add Role
            </Button>
          </div>
        </CardHeader>
        
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {roles.map((role) => (
              <Card key={role.id} className="border border-gray-200">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg mb-1">{role.roleName}</h3>
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                          ROLE_STATUS_COLORS[role.status] || 'bg-gray-100 text-gray-800'
                        }`}>
                          {role.status}
                        </span>
                        <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                          EXPERIENCE_LEVEL_COLORS[role.minimumExperienceLevel]
                        }`}>
                          <Star className="w-3 h-3 mr-1" />
                          {role.minimumExperienceLevel}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => openEditDialog(role)}
                        aria-label="Edit role"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => openDeleteDialog(role)}
                        className="text-red-600 hover:text-red-800"
                        aria-label="Delete role"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {role.description && (
                    <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                      {role.description}
                    </p>
                  )}

                  <div className="space-y-3">
                    <div>
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span className="text-gray-600">Allocation</span>
                        <span className="font-medium">{role.plannedAllocationPercentage}%</span>
                      </div>
                      <Progress 
                        value={role.plannedAllocationPercentage} 
                        className="h-2" 
                      />
                    </div>

                    {role.estimatedHours && (
                      <div>
                        <div className="flex items-center justify-between text-sm mb-1">
                          <span className="text-gray-600">Hours</span>
                          <span className="font-medium">
                            {role.actualHours || 0} / {role.estimatedHours} hours
                          </span>
                        </div>
                        <Progress 
                          value={getProgressPercentage(role.actualHours, role.estimatedHours)} 
                          className="h-2" 
                        />
                      </div>
                    )}

                    <div>
                      <div className="flex items-center text-sm text-gray-600 mb-1">
                        <Target className="w-3 h-3 mr-1" />
                        Skills Required
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {role.requiredSkills.length > 0 ? (
                          role.requiredSkills.slice(0, 3).map((skill, index) => (
                            <span
                              key={index}
                              className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-blue-50 text-blue-700"
                            >
                              {skill}
                            </span>
                          ))
                        ) : (
                          <span className="text-xs text-gray-500">No specific skills required</span>
                        )}
                        {role.requiredSkills.length > 3 && (
                          <span className="text-xs text-gray-500">
                            +{role.requiredSkills.length - 3} more
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      <RoleFormDialog />
      <DeleteConfirmDialog />
    </div>
  );
}