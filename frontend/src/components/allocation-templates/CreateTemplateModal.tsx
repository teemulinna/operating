import React, { useState } from 'react';
import { Plus, X, DollarSign, Clock, Users } from 'lucide-react';
import {
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Badge } from '../ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Separator } from '../ui/separator';
import {
  CreateTemplateRequest,
  CreateTemplateRoleRequest,
  TemplateCategory,
  VisibilityLevel,
  ExperienceLevel,
  allocationTemplatesService
} from '../../services/allocation-templates.service';

interface CreateTemplateModalProps {
  onClose: () => void;
  initialData?: Partial<CreateTemplateRequest>;
}

const CATEGORIES: Array<{ value: TemplateCategory; label: string; icon: string }> = [
  { value: 'web_development', label: 'Web Development', icon: '🌐' },
  { value: 'mobile_app', label: 'Mobile App', icon: '📱' },
  { value: 'data_analytics', label: 'Data Analytics', icon: '📊' },
  { value: 'devops', label: 'DevOps', icon: '⚙️' },
  { value: 'consulting', label: 'Consulting', icon: '💼' },
  { value: 'research', label: 'Research', icon: '🔬' },
  { value: 'design', label: 'Design', icon: '🎨' },
  { value: 'marketing', label: 'Marketing', icon: '📢' },
  { value: 'custom', label: 'Custom', icon: '🔧' },
];

const VISIBILITY_OPTIONS: Array<{ value: VisibilityLevel; label: string; description: string }> = [
  { value: 'private', label: 'Private', description: 'Only visible to you' },
  { value: 'organization', label: 'Organization', description: 'Visible to your organization' },
  { value: 'public', label: 'Public', description: 'Visible to everyone' },
];

const EXPERIENCE_LEVELS: Array<{ value: ExperienceLevel; label: string }> = [
  { value: 'junior', label: 'Junior' },
  { value: 'mid', label: 'Mid-level' },
  { value: 'senior', label: 'Senior' },
  { value: 'lead', label: 'Lead' },
];

export const CreateTemplateModal: React.FC<CreateTemplateModalProps> = ({
  onClose,
  initialData = {}
}) => {
  const [activeTab, setActiveTab] = useState('basic');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  // Template basic info
  const [templateData, setTemplateData] = useState<CreateTemplateRequest>({
    name: initialData.name || '',
    description: initialData.description || '',
    category: initialData.category || 'custom',
    tags: initialData.tags || [],
    visibility: initialData.visibility || 'private',
    default_duration_weeks: initialData.default_duration_weeks || undefined,
    default_budget_range: initialData.default_budget_range || undefined,
    default_priority: initialData.default_priority || 'medium',
  });

  // Template roles
  const [roles, setRoles] = useState<CreateTemplateRoleRequest[]>([]);
  const [currentRole, setCurrentRole] = useState<CreateTemplateRoleRequest>({
    role_name: '',
    description: '',
    required_skills: [],
    minimum_experience_level: 'junior',
    preferred_skills: [],
    planned_allocation_percentage: 50,
    estimated_hours_per_week: 20,
    duration_weeks: undefined,
    hourly_rate_range: undefined,
    max_assignments: 1,
    is_critical: false,
    can_be_remote: true,
    display_order: 0,
  });

  // Tag input
  const [tagInput, setTagInput] = useState('');

  const handleBasicInfoChange = (field: keyof CreateTemplateRequest, value: any) => {
    setTemplateData(prev => ({ ...prev, [field]: value }));
  };

  const handleRoleChange = (field: keyof CreateTemplateRoleRequest, value: any) => {
    setCurrentRole(prev => ({ ...prev, [field]: value }));
  };

  const addTag = () => {
    if (tagInput.trim() && !templateData.tags?.includes(tagInput.trim())) {
      setTemplateData(prev => ({
        ...prev,
        tags: [...(prev.tags || []), tagInput.trim()]
      }));
      setTagInput('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setTemplateData(prev => ({
      ...prev,
      tags: prev.tags?.filter(tag => tag !== tagToRemove) || []
    }));
  };

  const addRole = () => {
    const roleErrors = allocationTemplatesService.validateRoleData(currentRole);
    if (roleErrors.length > 0) {
      setErrors(roleErrors);
      return;
    }

    setRoles(prev => [...prev, { ...currentRole, display_order: prev.length }]);
    setCurrentRole({
      role_name: '',
      description: '',
      required_skills: [],
      minimum_experience_level: 'junior',
      preferred_skills: [],
      planned_allocation_percentage: 50,
      estimated_hours_per_week: 20,
      duration_weeks: undefined,
      hourly_rate_range: undefined,
      max_assignments: 1,
      is_critical: false,
      can_be_remote: true,
      display_order: 0,
    });
    setErrors([]);
  };

  const removeRole = (index: number) => {
    setRoles(prev => prev.filter((_, i) => i !== index));
  };

  const handleBudgetRangeChange = (index: 0 | 1, value: string) => {
    const numValue = parseFloat(value) || 0;
    setTemplateData(prev => {
      const currentRange = prev.default_budget_range || [0, 0];
      const newRange: [number, number] = [...currentRange] as [number, number];
      newRange[index] = numValue;
      return { ...prev, default_budget_range: newRange };
    });
  };

  const handleRateRangeChange = (index: 0 | 1, value: string) => {
    const numValue = parseFloat(value) || 0;
    setCurrentRole(prev => {
      const currentRange = prev.hourly_rate_range || [0, 0];
      const newRange: [number, number] = [...currentRange] as [number, number];
      newRange[index] = numValue;
      return { ...prev, hourly_rate_range: newRange };
    });
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);
      setErrors([]);

      // Validate basic template data
      const templateErrors = allocationTemplatesService.validateTemplateData(templateData);
      if (templateErrors.length > 0) {
        setErrors(templateErrors);
        setActiveTab('basic');
        return;
      }

      // Create the template
      const createdTemplate = await allocationTemplatesService.createTemplate(templateData);

      // Add roles to the template
      for (const role of roles) {
        await allocationTemplatesService.addTemplateRole(createdTemplate.id, role);
      }

      onClose();
    } catch (error: any) {
      setErrors([error.message || 'Failed to create template']);
      console.error('Error creating template:', error);
    } finally {
      setLoading(false);
    }
  };

  const canSubmit = templateData.name && templateData.category && roles.length > 0;

  return (
    <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
      <DialogHeader>
        <DialogTitle>Create New Template</DialogTitle>
        <DialogDescription>
          Create a reusable allocation template for common project types
        </DialogDescription>
      </DialogHeader>

      {errors.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
          <div className="text-red-800 font-medium mb-2">Please fix the following errors:</div>
          <ul className="text-red-700 text-sm list-disc list-inside">
            {errors.map((error, index) => (
              <li key={index}>{error}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex-1 overflow-hidden">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="basic">Basic Information</TabsTrigger>
            <TabsTrigger value="roles">
              Roles ({roles.length})
            </TabsTrigger>
            <TabsTrigger value="review">Review & Create</TabsTrigger>
          </TabsList>

          <div className="flex-1 overflow-auto">
            <TabsContent value="basic" className="space-y-6 p-1">
              {/* Basic Information */}
              <Card>
                <CardHeader>
                  <CardTitle>Template Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Template Name *</Label>
                      <Input
                        id="name"
                        value={templateData.name}
                        onChange={(e) => handleBasicInfoChange('name', e.target.value)}
                        placeholder="e.g., Standard Web Application"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="category">Category *</Label>
                      <Select
                        value={templateData.category}
                        onValueChange={(value: TemplateCategory) => handleBasicInfoChange('category', value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                        <SelectContent>
                          {CATEGORIES.map(category => (
                            <SelectItem key={category.value} value={category.value}>
                              {category.icon} {category.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={templateData.description}
                      onChange={(e) => handleBasicInfoChange('description', e.target.value)}
                      placeholder="Describe what this template is used for..."
                      rows={3}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="visibility">Visibility</Label>
                    <Select
                      value={templateData.visibility}
                      onValueChange={(value: VisibilityLevel) => handleBasicInfoChange('visibility', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select visibility" />
                      </SelectTrigger>
                      <SelectContent>
                        {VISIBILITY_OPTIONS.map(option => (
                          <SelectItem key={option.value} value={option.value}>
                            <div>
                              <div className="font-medium">{option.label}</div>
                              <div className="text-xs text-gray-600">{option.description}</div>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="duration">Default Duration (weeks)</Label>
                      <Input
                        id="duration"
                        type="number"
                        min="1"
                        value={templateData.default_duration_weeks || ''}
                        onChange={(e) => handleBasicInfoChange('default_duration_weeks', parseInt(e.target.value) || undefined)}
                        placeholder="e.g., 12"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="priority">Default Priority</Label>
                      <Select
                        value={templateData.default_priority}
                        onValueChange={(value) => handleBasicInfoChange('default_priority', value)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="low">Low</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="high">High</SelectItem>
                          <SelectItem value="critical">Critical</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Budget Range */}
                  <div className="space-y-2">
                    <Label>Default Budget Range (USD)</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        min="0"
                        value={templateData.default_budget_range?.[0] || ''}
                        onChange={(e) => handleBudgetRangeChange(0, e.target.value)}
                        placeholder="Min budget"
                      />
                      <span className="text-gray-500">to</span>
                      <Input
                        type="number"
                        min="0"
                        value={templateData.default_budget_range?.[1] || ''}
                        onChange={(e) => handleBudgetRangeChange(1, e.target.value)}
                        placeholder="Max budget"
                      />
                    </div>
                  </div>

                  {/* Tags */}
                  <div className="space-y-2">
                    <Label>Tags</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        value={tagInput}
                        onChange={(e) => setTagInput(e.target.value)}
                        placeholder="Add a tag..."
                        onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                      />
                      <Button type="button" onClick={addTag} size="sm">
                        Add
                      </Button>
                    </div>
                    {templateData.tags && templateData.tags.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {templateData.tags.map((tag, index) => (
                          <Badge key={index} variant="secondary" className="gap-1">
                            {tag}
                            <X
                              className="h-3 w-3 cursor-pointer"
                              onClick={() => removeTag(tag)}
                            />
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="roles" className="space-y-6 p-1">
              {/* Existing Roles */}
              {roles.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Template Roles ({roles.length})</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {roles.map((role, index) => (
                        <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                          <div className="flex-1">
                            <div className="font-medium">{role.role_name}</div>
                            <div className="text-sm text-gray-600">
                              {role.planned_allocation_percentage}% • {' '}
                              {role.duration_weeks} weeks • {' '}
                              {allocationTemplatesService.getExperienceLevelDisplayName(role.minimum_experience_level)}
                            </div>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => removeRole(index)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Add New Role */}
              <Card>
                <CardHeader>
                  <CardTitle>Add Role to Template</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="role_name">Role Name *</Label>
                      <Input
                        id="role_name"
                        value={currentRole.role_name}
                        onChange={(e) => handleRoleChange('role_name', e.target.value)}
                        placeholder="e.g., Frontend Developer"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="experience_level">Experience Level</Label>
                      <Select
                        value={currentRole.minimum_experience_level}
                        onValueChange={(value: ExperienceLevel) => handleRoleChange('minimum_experience_level', value)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {EXPERIENCE_LEVELS.map(level => (
                            <SelectItem key={level.value} value={level.value}>
                              {level.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="role_description">Description</Label>
                    <Textarea
                      id="role_description"
                      value={currentRole.description}
                      onChange={(e) => handleRoleChange('description', e.target.value)}
                      placeholder="Describe the role responsibilities..."
                      rows={2}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="allocation">Allocation % *</Label>
                      <Input
                        id="allocation"
                        type="number"
                        min="1"
                        max="100"
                        value={currentRole.planned_allocation_percentage}
                        onChange={(e) => handleRoleChange('planned_allocation_percentage', parseFloat(e.target.value) || 0)}
                        placeholder="50"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="hours_per_week">Hours/Week</Label>
                      <Input
                        id="hours_per_week"
                        type="number"
                        min="0"
                        value={currentRole.estimated_hours_per_week || ''}
                        onChange={(e) => handleRoleChange('estimated_hours_per_week', parseFloat(e.target.value) || undefined)}
                        placeholder="20"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="duration">Duration (weeks)</Label>
                      <Input
                        id="duration"
                        type="number"
                        min="1"
                        value={currentRole.duration_weeks || ''}
                        onChange={(e) => handleRoleChange('duration_weeks', parseInt(e.target.value) || undefined)}
                        placeholder="12"
                      />
                    </div>
                  </div>

                  {/* Hourly Rate Range */}
                  <div className="space-y-2">
                    <Label>Hourly Rate Range (USD)</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        min="0"
                        value={currentRole.hourly_rate_range?.[0] || ''}
                        onChange={(e) => handleRateRangeChange(0, e.target.value)}
                        placeholder="Min rate"
                      />
                      <span className="text-gray-500">to</span>
                      <Input
                        type="number"
                        min="0"
                        value={currentRole.hourly_rate_range?.[1] || ''}
                        onChange={(e) => handleRateRangeChange(1, e.target.value)}
                        placeholder="Max rate"
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-6">
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="is_critical"
                        checked={currentRole.is_critical}
                        onChange={(e) => handleRoleChange('is_critical', e.target.checked)}
                        className="rounded border-gray-300"
                      />
                      <Label htmlFor="is_critical">Critical Role</Label>
                    </div>

                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="can_be_remote"
                        checked={currentRole.can_be_remote}
                        onChange={(e) => handleRoleChange('can_be_remote', e.target.checked)}
                        className="rounded border-gray-300"
                      />
                      <Label htmlFor="can_be_remote">Remote OK</Label>
                    </div>
                  </div>

                  <Button onClick={addRole} className="w-full gap-2">
                    <Plus className="h-4 w-4" />
                    Add Role
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="review" className="space-y-6 p-1">
              {/* Template Summary */}
              <Card>
                <CardHeader>
                  <CardTitle>Template Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <div className="font-medium text-gray-600">Name</div>
                      <div>{templateData.name}</div>
                    </div>
                    <div>
                      <div className="font-medium text-gray-600">Category</div>
                      <div>
                        {CATEGORIES.find(c => c.value === templateData.category)?.icon}{' '}
                        {CATEGORIES.find(c => c.value === templateData.category)?.label}
                      </div>
                    </div>
                    <div>
                      <div className="font-medium text-gray-600">Visibility</div>
                      <div>{allocationTemplatesService.getVisibilityDisplayName(templateData.visibility!)}</div>
                    </div>
                    <div>
                      <div className="font-medium text-gray-600">Roles</div>
                      <div>{roles.length} role{roles.length !== 1 ? 's' : ''}</div>
                    </div>
                  </div>

                  {templateData.description && (
                    <div>
                      <div className="font-medium text-gray-600">Description</div>
                      <div>{templateData.description}</div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Roles Summary */}
              {roles.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Roles Overview</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {roles.map((role, index) => (
                        <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                          <div className="flex-1">
                            <div className="font-medium">{role.role_name}</div>
                            <div className="text-sm text-gray-600">
                              {role.planned_allocation_percentage}% allocation
                              {role.estimated_hours_per_week && (
                                <> • {role.estimated_hours_per_week}h/week</>
                              )}
                              {role.duration_weeks && (
                                <> • {role.duration_weeks} weeks</>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {role.is_critical && (
                              <Badge variant="destructive" className="text-xs">
                                Critical
                              </Badge>
                            )}
                            {role.can_be_remote && (
                              <Badge variant="secondary" className="text-xs">
                                Remote OK
                              </Badge>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </div>
        </Tabs>
      </div>

      <DialogFooter>
        <Button variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button 
          onClick={handleSubmit} 
          disabled={!canSubmit || loading}
          className="gap-2"
        >
          {loading ? (
            <>Creating...</>
          ) : (
            <>
              <Plus className="h-4 w-4" />
              Create Template
            </>
          )}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
};