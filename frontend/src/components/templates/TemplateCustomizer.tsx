import React, { useState, useMemo } from 'react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Badge } from '../ui/badge';
import { ProjectTemplate, DefaultTask, DefaultMilestone, ApplyTemplateOptions } from '../../types/template';

interface TemplateCustomizerProps {
  template: ProjectTemplate;
  onApply: (options: ApplyTemplateOptions) => void;
  onCancel: () => void;
  className?: string;
}

export const TemplateCustomizer: React.FC<TemplateCustomizerProps> = ({
  template,
  onApply,
  onCancel,
  className = ''
}) => {
  const [projectName, setProjectName] = useState(`${template.name} Project`);
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [customBudget, setCustomBudget] = useState(template.defaultBudget?.toString() || '');
  const [customDuration, setCustomDuration] = useState(template.getEstimatedProjectDuration().toString());
  const [clientId, setClientId] = useState('');
  
  // Task customizations
  const [includedTasks, setIncludedTasks] = useState<Set<string>>(
    new Set(template.defaultTasks.map(task => task.id))
  );
  const [taskModifications, setTaskModifications] = useState<{ [taskId: string]: Partial<DefaultTask> }>({});
  
  // Milestone customizations
  const [includedMilestones, setIncludedMilestones] = useState<Set<string>>(
    new Set(template.defaultMilestones.map(milestone => milestone.id))
  );
  const [milestoneModifications, setMilestoneModifications] = useState<{ [milestoneId: string]: Partial<DefaultMilestone> }>({});
  
  // Team assignments
  const [teamAssignments, setTeamAssignments] = useState<{ [taskId: string]: string[] }>({});
  
  const [currentStep, setCurrentStep] = useState(1);
  const [isPreviewMode, setIsPreviewMode] = useState(false);

  const customizedTasks = useMemo(() => {
    return template.defaultTasks
      .filter(task => includedTasks.has(task.id))
      .map(task => ({
        ...task,
        ...taskModifications[task.id]
      }));
  }, [template.defaultTasks, includedTasks, taskModifications]);

  const customizedMilestones = useMemo(() => {
    return template.defaultMilestones
      .filter(milestone => includedMilestones.has(milestone.id))
      .map(milestone => ({
        ...milestone,
        ...milestoneModifications[milestone.id]
      }));
  }, [template.defaultMilestones, includedMilestones, milestoneModifications]);

  const estimatedDuration = useMemo(() => {
    if (customDuration && !isNaN(parseInt(customDuration))) {
      return parseInt(customDuration);
    }
    
    // Calculate from selected tasks
    return Math.max(
      ...customizedTasks.map(task => {
        const taskDuration = taskModifications[task.id]?.duration ?? task.duration;
        const maxDependencyEnd = Math.max(
          ...task.dependencies.map(depId => {
            const depTask = customizedTasks.find(t => t.id === depId);
            return depTask ? (taskModifications[depTask.id]?.duration ?? depTask.duration) : 0;
          }),
          0
        );
        return taskDuration + maxDependencyEnd;
      }),
      30 // Minimum 30 days
    );
  }, [customizedTasks, taskModifications, customDuration]);

  const estimatedBudget = useMemo(() => {
    if (customBudget && !isNaN(parseFloat(customBudget))) {
      return parseFloat(customBudget);
    }
    
    // Calculate from selected tasks
    const totalHours = customizedTasks.reduce((sum, task) => {
      const hours = taskModifications[task.id]?.estimatedHours ?? task.estimatedHours;
      return sum + hours;
    }, 0);
    
    return totalHours * 100; // $100/hour default rate
  }, [customizedTasks, taskModifications, customBudget]);

  const handleTaskToggle = (taskId: string) => {
    const newIncluded = new Set(includedTasks);
    if (newIncluded.has(taskId)) {
      newIncluded.delete(taskId);
    } else {
      newIncluded.add(taskId);
    }
    setIncludedTasks(newIncluded);
  };

  const handleMilestoneToggle = (milestoneId: string) => {
    const newIncluded = new Set(includedMilestones);
    if (newIncluded.has(milestoneId)) {
      newIncluded.delete(milestoneId);
    } else {
      newIncluded.add(milestoneId);
    }
    setIncludedMilestones(newIncluded);
  };

  const handleTaskModification = (taskId: string, field: keyof DefaultTask, value: any) => {
    setTaskModifications(prev => ({
      ...prev,
      [taskId]: {
        ...prev[taskId],
        [field]: value
      }
    }));
  };

  const handleMilestoneModification = (milestoneId: string, field: keyof DefaultMilestone, value: any) => {
    setMilestoneModifications(prev => ({
      ...prev,
      [milestoneId]: {
        ...prev[milestoneId],
        [field]: value
      }
    }));
  };

  const handleApply = () => {
    const options: ApplyTemplateOptions = {
      templateId: template.templateId,
      projectName,
      startDate: new Date(startDate),
      clientId: clientId || undefined,
      customBudget: customBudget ? parseFloat(customBudget) : undefined,
      customDuration: customDuration ? parseInt(customDuration) : undefined,
      teamAssignments,
      customizations: {
        includeTasks: Array.from(includedTasks),
        excludeTasks: template.defaultTasks
          .filter(task => !includedTasks.has(task.id))
          .map(task => task.id),
        includeMilestones: Array.from(includedMilestones),
        excludeMilestones: template.defaultMilestones
          .filter(milestone => !includedMilestones.has(milestone.id))
          .map(milestone => milestone.id),
        modifyTasks: taskModifications,
        modifyMilestones: milestoneModifications
      }
    };

    onApply(options);
  };

  const renderStep1 = () => (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold">Project Details</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="projectName">Project Name</Label>
          <Input
            id="projectName"
            value={projectName}
            onChange={(e) => setProjectName(e.target.value)}
            placeholder="Enter project name"
          />
        </div>
        
        <div>
          <Label htmlFor="startDate">Start Date</Label>
          <Input
            id="startDate"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
        </div>
        
        <div>
          <Label htmlFor="customBudget">Budget (Optional)</Label>
          <Input
            id="customBudget"
            type="number"
            value={customBudget}
            onChange={(e) => setCustomBudget(e.target.value)}
            placeholder={`Default: $${template.defaultBudget?.toLocaleString() || 'varies'}`}
          />
        </div>
        
        <div>
          <Label htmlFor="customDuration">Duration (Days, Optional)</Label>
          <Input
            id="customDuration"
            type="number"
            value={customDuration}
            onChange={(e) => setCustomDuration(e.target.value)}
            placeholder={`Default: ${template.getEstimatedProjectDuration()} days`}
          />
        </div>
        
        <div className="md:col-span-2">
          <Label htmlFor="clientId">Client ID (Optional)</Label>
          <Input
            id="clientId"
            value={clientId}
            onChange={(e) => setClientId(e.target.value)}
            placeholder="Enter client identifier"
          />
        </div>
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Tasks ({customizedTasks.length}/{template.defaultTasks.length})</h3>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIncludedTasks(new Set(template.defaultTasks.map(t => t.id)))}
          >
            Select All
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIncludedTasks(new Set())}
          >
            Clear All
          </Button>
        </div>
      </div>
      
      <div className="space-y-4 max-h-96 overflow-y-auto">
        {template.defaultTasks.map((task) => {
          const isIncluded = includedTasks.has(task.id);
          const modifications = taskModifications[task.id] || {};
          
          return (
            <Card key={task.id} className={`p-4 ${isIncluded ? 'ring-2 ring-blue-500' : 'opacity-60'}`}>
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={isIncluded}
                    onChange={() => handleTaskToggle(task.id)}
                    className="mt-1"
                  />
                  <div>
                    <h4 className="font-medium">{task.name}</h4>
                    <p className="text-sm text-gray-600 mt-1">{task.description}</p>
                    <div className="flex gap-2 mt-2">
                      <Badge variant="secondary">{task.priority}</Badge>
                      <Badge variant="outline">{task.duration} days</Badge>
                      <Badge variant="outline">{task.estimatedHours}h</Badge>
                    </div>
                  </div>
                </div>
              </div>
              
              {isIncluded && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-3 border-t">
                  <div>
                    <Label className="text-xs">Duration (days)</Label>
                    <Input
                      type="number"
                      value={modifications.duration ?? task.duration}
                      onChange={(e) => handleTaskModification(task.id, 'duration', parseInt(e.target.value))}
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Hours</Label>
                    <Input
                      type="number"
                      value={modifications.estimatedHours ?? task.estimatedHours}
                      onChange={(e) => handleTaskModification(task.id, 'estimatedHours', parseInt(e.target.value))}
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Priority</Label>
                    <select
                      className="w-full px-2 py-1 border rounded text-sm"
                      value={modifications.priority ?? task.priority}
                      onChange={(e) => handleTaskModification(task.id, 'priority', e.target.value)}
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="critical">Critical</option>
                    </select>
                  </div>
                  <div>
                    <Label className="text-xs">Assign To</Label>
                    <Input
                      placeholder="Employee IDs"
                      value={teamAssignments[task.id]?.join(', ') || ''}
                      onChange={(e) => setTeamAssignments(prev => ({
                        ...prev,
                        [task.id]: e.target.value.split(',').map(s => s.trim()).filter(Boolean)
                      }))}
                    />
                  </div>
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );

  const renderStep3 = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Milestones ({customizedMilestones.length}/{template.defaultMilestones.length})</h3>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIncludedMilestones(new Set(template.defaultMilestones.map(m => m.id)))}
          >
            Select All
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIncludedMilestones(new Set())}
          >
            Clear All
          </Button>
        </div>
      </div>
      
      <div className="space-y-4 max-h-96 overflow-y-auto">
        {template.defaultMilestones.map((milestone) => {
          const isIncluded = includedMilestones.has(milestone.id);
          const modifications = milestoneModifications[milestone.id] || {};
          
          return (
            <Card key={milestone.id} className={`p-4 ${isIncluded ? 'ring-2 ring-blue-500' : 'opacity-60'}`}>
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={isIncluded}
                    onChange={() => handleMilestoneToggle(milestone.id)}
                    className="mt-1"
                  />
                  <div>
                    <h4 className="font-medium">{milestone.name}</h4>
                    <p className="text-sm text-gray-600 mt-1">{milestone.description}</p>
                    <div className="flex gap-2 mt-2">
                      <Badge variant="outline">Day {milestone.daysFromStart}</Badge>
                      <Badge variant="secondary">{milestone.deliverables.length} deliverables</Badge>
                    </div>
                  </div>
                </div>
              </div>
              
              {isIncluded && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-3 border-t">
                  <div>
                    <Label className="text-xs">Days from Start</Label>
                    <Input
                      type="number"
                      value={modifications.daysFromStart ?? milestone.daysFromStart}
                      onChange={(e) => handleMilestoneModification(milestone.id, 'daysFromStart', parseInt(e.target.value))}
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Modified Name</Label>
                    <Input
                      value={modifications.name ?? milestone.name}
                      onChange={(e) => handleMilestoneModification(milestone.id, 'name', e.target.value)}
                    />
                  </div>
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );

  const renderPreview = () => (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold">Project Preview</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-4">
          <h4 className="font-medium text-gray-900">Project Overview</h4>
          <div className="mt-3 space-y-2 text-sm">
            <div><span className="text-gray-500">Name:</span> {projectName}</div>
            <div><span className="text-gray-500">Start:</span> {new Date(startDate).toLocaleDateString()}</div>
            <div><span className="text-gray-500">Duration:</span> {estimatedDuration} days</div>
            <div><span className="text-gray-500">Budget:</span> ${estimatedBudget.toLocaleString()}</div>
          </div>
        </Card>
        
        <Card className="p-4">
          <h4 className="font-medium text-gray-900">Tasks Summary</h4>
          <div className="mt-3 space-y-2 text-sm">
            <div><span className="text-gray-500">Selected:</span> {customizedTasks.length}</div>
            <div><span className="text-gray-500">Total Hours:</span> {customizedTasks.reduce((sum, task) => sum + (taskModifications[task.id]?.estimatedHours ?? task.estimatedHours), 0)}</div>
            <div><span className="text-gray-500">High Priority:</span> {customizedTasks.filter(task => (taskModifications[task.id]?.priority ?? task.priority) === 'high').length}</div>
            <div><span className="text-gray-500">Critical:</span> {customizedTasks.filter(task => (taskModifications[task.id]?.priority ?? task.priority) === 'critical').length}</div>
          </div>
        </Card>
        
        <Card className="p-4">
          <h4 className="font-medium text-gray-900">Milestones Summary</h4>
          <div className="mt-3 space-y-2 text-sm">
            <div><span className="text-gray-500">Selected:</span> {customizedMilestones.length}</div>
            <div><span className="text-gray-500">First:</span> Day {Math.min(...customizedMilestones.map(m => milestoneModifications[m.id]?.daysFromStart ?? m.daysFromStart))}</div>
            <div><span className="text-gray-500">Last:</span> Day {Math.max(...customizedMilestones.map(m => milestoneModifications[m.id]?.daysFromStart ?? m.daysFromStart))}</div>
            <div><span className="text-gray-500">Deliverables:</span> {customizedMilestones.reduce((sum, m) => sum + m.deliverables.length, 0)}</div>
          </div>
        </Card>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="p-4">
          <h4 className="font-medium text-gray-900 mb-3">Selected Tasks</h4>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {customizedTasks.map((task) => (
              <div key={task.id} className="text-sm flex justify-between">
                <span>{taskModifications[task.id]?.name ?? task.name}</span>
                <Badge variant="secondary" className="text-xs">
                  {taskModifications[task.id]?.duration ?? task.duration}d
                </Badge>
              </div>
            ))}
          </div>
        </Card>
        
        <Card className="p-4">
          <h4 className="font-medium text-gray-900 mb-3">Selected Milestones</h4>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {customizedMilestones.map((milestone) => (
              <div key={milestone.id} className="text-sm flex justify-between">
                <span>{milestoneModifications[milestone.id]?.name ?? milestone.name}</span>
                <Badge variant="outline" className="text-xs">
                  Day {milestoneModifications[milestone.id]?.daysFromStart ?? milestone.daysFromStart}
                </Badge>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );

  return (
    <div className={`fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 ${className}`}>
      <div className="bg-white rounded-lg w-full max-w-6xl max-h-[90vh] overflow-hidden">
        <div className="p-6 border-b">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Customize Template: {template.name}</h2>
            <Button variant="outline" onClick={onCancel}>Cancel</Button>
          </div>
          
          {/* Progress Steps */}
          <div className="flex items-center gap-4 mt-4">
            {[1, 2, 3].map((step) => (
              <div key={step} className="flex items-center">
                <button
                  onClick={() => setCurrentStep(step)}
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                    currentStep === step
                      ? 'bg-blue-600 text-white'
                      : currentStep > step
                      ? 'bg-green-600 text-white'
                      : 'bg-gray-200 text-gray-600'
                  }`}
                >
                  {currentStep > step ? '✓' : step}
                </button>
                <span className={`ml-2 text-sm ${currentStep === step ? 'text-blue-600 font-medium' : 'text-gray-600'}`}>
                  {step === 1 ? 'Details' : step === 2 ? 'Tasks' : 'Milestones'}
                </span>
                {step < 3 && <div className="w-8 h-px bg-gray-300 mx-4"></div>}
              </div>
            ))}
            <div className="flex items-center ml-8">
              <Button
                variant={isPreviewMode ? "default" : "outline"}
                size="sm"
                onClick={() => setIsPreviewMode(!isPreviewMode)}
              >
                {isPreviewMode ? 'Hide Preview' : 'Show Preview'}
              </Button>
            </div>
          </div>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
          {isPreviewMode ? renderPreview() : (
            <>
              {currentStep === 1 && renderStep1()}
              {currentStep === 2 && renderStep2()}
              {currentStep === 3 && renderStep3()}
            </>
          )}
        </div>

        <div className="p-6 border-t flex justify-between">
          <div>
            {!isPreviewMode && (
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setCurrentStep(Math.max(1, currentStep - 1))}
                  disabled={currentStep === 1}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setCurrentStep(Math.min(3, currentStep + 1))}
                  disabled={currentStep === 3}
                >
                  Next
                </Button>
              </div>
            )}
          </div>
          
          <div className="flex gap-2">
            <Button variant="outline" onClick={onCancel}>
              Cancel
            </Button>
            <Button onClick={handleApply} disabled={!projectName}>
              Create Project
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};