import React, { useState, useEffect } from 'react';
import { Task } from 'gantt-task-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format } from 'date-fns';
import { 
  CalendarIcon, 
  Clock, 
  AlertTriangle, 
  CheckCircle2, 
  Circle, 
  Pause,
  X,
  GitBranch,
  Target,
  DollarSign,
  Users,
  Tag,
  Save,
  Trash2,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface TaskEditorProps {
  task: Task;
  isOpen: boolean;
  onClose: () => void;
  onSave: (task: Task) => Promise<void>;
  onDelete?: (taskId: string) => Promise<void>;
  readOnly?: boolean;
  availableResources?: Array<{
    id: string;
    name: string;
    role: string;
    hourlyRate?: number;
  }>;
  availableDependencies?: Task[];
}

interface TaskFormData {
  name: string;
  description: string;
  start: Date;
  end: Date;
  progress: number;
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'not-started' | 'in-progress' | 'completed' | 'on-hold' | 'cancelled';
  assignedResources: string[];
  dependencies: string[];
  estimatedHours: number;
  actualHours: number;
  budget: number;
  tags: string[];
  notes: string;
}

const priorityOptions = [
  { value: 'low', label: 'Low', color: 'bg-gray-100 text-gray-800', icon: Circle },
  { value: 'medium', label: 'Medium', color: 'bg-blue-100 text-blue-800', icon: Circle },
  { value: 'high', label: 'High', color: 'bg-orange-100 text-orange-800', icon: AlertTriangle },
  { value: 'critical', label: 'Critical', color: 'bg-red-100 text-red-800', icon: Target },
];

const statusOptions = [
  { value: 'not-started', label: 'Not Started', color: 'bg-gray-100 text-gray-800', icon: Circle },
  { value: 'in-progress', label: 'In Progress', color: 'bg-blue-100 text-blue-800', icon: Clock },
  { value: 'completed', label: 'Completed', color: 'bg-green-100 text-green-800', icon: CheckCircle2 },
  { value: 'on-hold', label: 'On Hold', color: 'bg-yellow-100 text-yellow-800', icon: Pause },
  { value: 'cancelled', label: 'Cancelled', color: 'bg-red-100 text-red-800', icon: X },
];

export const TaskEditor: React.FC<TaskEditorProps> = ({
  task,
  isOpen,
  onClose,
  onSave,
  onDelete,
  readOnly = false,
  availableResources = [],
  availableDependencies = [],
}) => {
  const [formData, setFormData] = useState<TaskFormData>({
    name: '',
    description: '',
    start: new Date(),
    end: new Date(),
    progress: 0,
    priority: 'medium',
    status: 'not-started',
    assignedResources: [],
    dependencies: [],
    estimatedHours: 0,
    actualHours: 0,
    budget: 0,
    tags: [],
    notes: '',
  });

  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<keyof TaskFormData, string>>>({});
  const [showStartCalendar, setShowStartCalendar] = useState(false);
  const [showEndCalendar, setShowEndCalendar] = useState(false);
  const [newTag, setNewTag] = useState('');

  // Initialize form data when task changes
  useEffect(() => {
    if (task) {
      setFormData({
        name: task.name || '',
        description: (task as any).description || '',
        start: task.start,
        end: task.end,
        progress: task.progress,
        priority: (task as any).priority || 'medium',
        status: (task as any).status || 'not-started',
        assignedResources: (task as any).assignedResources || [],
        dependencies: task.dependencies || [],
        estimatedHours: (task as any).estimatedHours || 0,
        actualHours: (task as any).actualHours || 0,
        budget: (task as any).budget || 0,
        tags: (task as any).tags || [],
        notes: (task as any).notes || '',
      });
    }
  }, [task]);

  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof TaskFormData, string>> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Task name is required';
    }

    if (formData.start >= formData.end) {
      newErrors.end = 'End date must be after start date';
    }

    if (formData.progress < 0 || formData.progress > 100) {
      newErrors.progress = 'Progress must be between 0 and 100';
    }

    if (formData.estimatedHours < 0) {
      newErrors.estimatedHours = 'Estimated hours cannot be negative';
    }

    if (formData.actualHours < 0) {
      newErrors.actualHours = 'Actual hours cannot be negative';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    setIsLoading(true);
    try {
      const updatedTask: Task = {
        ...task,
        name: formData.name,
        start: formData.start,
        end: formData.end,
        progress: formData.progress,
        dependencies: formData.dependencies,
        ...(formData as any), // Include additional properties
      };

      await onSave(updatedTask);
      onClose();
    } catch (error) {
      console.error('Error saving task:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!onDelete || !task.id) return;

    setIsLoading(true);
    try {
      await onDelete(task.id);
      onClose();
    } catch (error) {
      console.error('Error deleting task:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddTag = () => {
    if (newTag.trim() && !formData.tags.includes(newTag.trim())) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, newTag.trim()],
      }));
      setNewTag('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove),
    }));
  };

  const calculateDuration = () => {
    const diffTime = Math.abs(formData.end.getTime() - formData.start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };


  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span>Edit Task</span>
            {task.type === 'milestone' && <Target className="w-4 h-4 text-blue-500" />}
            {task.type === 'project' && <Users className="w-4 h-4 text-green-500" />}
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Details */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Task Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Task Name */}
                <div>
                  <Label htmlFor="task-name">Task Name *</Label>
                  <Input
                    id="task-name"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Enter task name"
                    disabled={readOnly}
                    className={errors.name ? 'border-red-500' : ''}
                  />
                  {errors.name && <p className="text-sm text-red-500 mt-1">{errors.name}</p>}
                </div>

                {/* Description */}
                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Enter task description"
                    rows={3}
                    disabled={readOnly}
                  />
                </div>

                {/* Date Range */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Start Date *</Label>
                    <Popover open={showStartCalendar} onOpenChange={setShowStartCalendar}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !formData.start && "text-muted-foreground"
                          )}
                          disabled={readOnly}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {formData.start ? format(formData.start, "PPP") : "Pick a date"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={formData.start}
                          onSelect={(date) => {
                            if (date) {
                              setFormData(prev => ({ ...prev, start: date }));
                              setShowStartCalendar(false);
                            }
                          }}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>

                  <div>
                    <Label>End Date *</Label>
                    <Popover open={showEndCalendar} onOpenChange={setShowEndCalendar}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !formData.end && "text-muted-foreground",
                            errors.end && "border-red-500"
                          )}
                          disabled={readOnly}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {formData.end ? format(formData.end, "PPP") : "Pick a date"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={formData.end}
                          onSelect={(date) => {
                            if (date) {
                              setFormData(prev => ({ ...prev, end: date }));
                              setShowEndCalendar(false);
                            }
                          }}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    {errors.end && <p className="text-sm text-red-500 mt-1">{errors.end}</p>}
                  </div>
                </div>

                {/* Duration Display */}
                <div className="p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Clock className="w-4 h-4" />
                    <span>Duration: <strong>{calculateDuration()} days</strong></span>
                  </div>
                </div>

                {/* Progress */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <Label>Progress</Label>
                    <Badge variant="secondary">{formData.progress}%</Badge>
                  </div>
                  <Slider
                    value={[formData.progress]}
                    onValueChange={([value]) => setFormData(prev => ({ ...prev, progress: value }))}
                    max={100}
                    step={5}
                    disabled={readOnly}
                    className="w-full"
                  />
                </div>

                {/* Status and Priority */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Status</Label>
                    <Select
                      value={formData.status}
                      onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setFormData(prev => ({ ...prev, status: e.target.value as any }))}
                      disabled={readOnly}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {statusOptions.map((status) => {
                          const Icon = status.icon;
                          return (
                            <SelectItem key={status.value} value={status.value}>
                              <div className="flex items-center gap-2">
                                <Icon className="w-4 h-4" />
                                <Badge className={status.color} variant="secondary">
                                  {status.label}
                                </Badge>
                              </div>
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Priority</Label>
                    <Select
                      value={formData.priority}
                      onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setFormData(prev => ({ ...prev, priority: e.target.value as any }))}
                      disabled={readOnly}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {priorityOptions.map((priority) => {
                          const Icon = priority.icon;
                          return (
                            <SelectItem key={priority.value} value={priority.value}>
                              <div className="flex items-center gap-2">
                                <Icon className="w-4 h-4" />
                                <Badge className={priority.color} variant="secondary">
                                  {priority.label}
                                </Badge>
                              </div>
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Resource and Time Tracking */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Clock className="w-5 h-5" />
                  Time & Resources
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="estimated-hours">Estimated Hours</Label>
                    <Input
                      id="estimated-hours"
                      type="number"
                      value={formData.estimatedHours}
                      onChange={(e) => setFormData(prev => ({ ...prev, estimatedHours: parseFloat(e.target.value) || 0 }))}
                      disabled={readOnly}
                      className={errors.estimatedHours ? 'border-red-500' : ''}
                    />
                    {errors.estimatedHours && <p className="text-sm text-red-500 mt-1">{errors.estimatedHours}</p>}
                  </div>

                  <div>
                    <Label htmlFor="actual-hours">Actual Hours</Label>
                    <Input
                      id="actual-hours"
                      type="number"
                      value={formData.actualHours}
                      onChange={(e) => setFormData(prev => ({ ...prev, actualHours: parseFloat(e.target.value) || 0 }))}
                      disabled={readOnly}
                      className={errors.actualHours ? 'border-red-500' : ''}
                    />
                    {errors.actualHours && <p className="text-sm text-red-500 mt-1">{errors.actualHours}</p>}
                  </div>
                </div>

                {/* Efficiency indicator */}
                {formData.estimatedHours > 0 && formData.actualHours > 0 && (
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Time Efficiency</span>
                      <Badge 
                        variant={formData.actualHours <= formData.estimatedHours ? "default" : "destructive"}
                      >
                        {Math.round((formData.estimatedHours / formData.actualHours) * 100)}%
                      </Badge>
                    </div>
                  </div>
                )}

                <div>
                  <Label htmlFor="budget">Budget ($)</Label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <Input
                      id="budget"
                      type="number"
                      value={formData.budget}
                      onChange={(e) => setFormData(prev => ({ ...prev, budget: parseFloat(e.target.value) || 0 }))}
                      disabled={readOnly}
                      className="pl-10"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Dependencies */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <GitBranch className="w-5 h-5" />
                  Dependencies
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {formData.dependencies.map((depId) => {
                    const dep = availableDependencies.find(t => t.id === depId);
                    return dep ? (
                      <div key={depId} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                        <span className="text-sm truncate">{dep.name}</span>
                        {!readOnly && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setFormData(prev => ({
                              ...prev,
                              dependencies: prev.dependencies.filter(id => id !== depId)
                            }))}
                            className="h-6 w-6 p-0"
                          >
                            <X className="w-3 h-3" />
                          </Button>
                        )}
                      </div>
                    ) : null;
                  })}
                  
                  {formData.dependencies.length === 0 && (
                    <p className="text-sm text-gray-500 text-center py-2">No dependencies</p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Resources */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  Resources
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {formData.assignedResources.map((resourceId) => {
                    const resource = availableResources.find(r => r.id === resourceId);
                    return resource ? (
                      <div key={resourceId} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                        <div>
                          <div className="text-sm font-medium">{resource.name}</div>
                          <div className="text-xs text-gray-500">{resource.role}</div>
                        </div>
                        {!readOnly && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setFormData(prev => ({
                              ...prev,
                              assignedResources: prev.assignedResources.filter(id => id !== resourceId)
                            }))}
                            className="h-6 w-6 p-0"
                          >
                            <X className="w-3 h-3" />
                          </Button>
                        )}
                      </div>
                    ) : null;
                  })}
                  
                  {formData.assignedResources.length === 0 && (
                    <p className="text-sm text-gray-500 text-center py-2">No resources assigned</p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Tags */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Tag className="w-5 h-5" />
                  Tags
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {/* Add new tag */}
                  {!readOnly && (
                    <div className="flex gap-2">
                      <Input
                        value={newTag}
                        onChange={(e) => setNewTag(e.target.value)}
                        placeholder="Add tag..."
                        onKeyPress={(e) => e.key === 'Enter' && handleAddTag()}
                        className="flex-1"
                      />
                      <Button onClick={handleAddTag} size="sm" variant="outline">
                        Add
                      </Button>
                    </div>
                  )}
                  
                  {/* Existing tags */}
                  <div className="flex flex-wrap gap-1">
                    {formData.tags.map((tag) => (
                      <Badge key={tag} variant="secondary" className="text-xs">
                        {tag}
                        {!readOnly && (
                          <button
                            onClick={() => handleRemoveTag(tag)}
                            className="ml-1 hover:text-red-500"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        )}
                      </Badge>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Notes */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={formData.notes}
                  onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Add notes about this task..."
                  rows={4}
                  disabled={readOnly}
                />
              </CardContent>
            </Card>
          </div>
        </div>

        <DialogFooter className="flex justify-between">
          <div>
            {onDelete && !readOnly && (
              <Button
                variant="destructive"
                onClick={handleDelete}
                disabled={isLoading}
                className="flex items-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                Delete Task
              </Button>
            )}
          </div>
          
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose} disabled={isLoading}>
              Cancel
            </Button>
            {!readOnly && (
              <Button onClick={handleSave} disabled={isLoading} className="flex items-center gap-2">
                {isLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    Save Changes
                  </>
                )}
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default TaskEditor;