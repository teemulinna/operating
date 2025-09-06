// Scenario Planner UI with Drag-and-Drop Functionality
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { DndContext, DragOverlay, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, horizontalListSortingStrategy } from '@dnd-kit/sortable';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CalendarIcon,
  UserGroupIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ClipboardDocumentListIcon,
  PlusIcon,
  AdjustmentsHorizontalIcon,
  EyeIcon,
  ArrowsUpDownIcon,
  FunnelIcon,
  MagnifyingGlassIcon,
  DocumentDuplicateIcon,
  TrashIcon,
} from '@heroicons/react/24/outline';
import {
  Scenario,
  ScenarioAllocation,
  TimelineConflict,
  AllocationType,
  ScenarioPlannerState,
  ALLOCATION_TYPE_COLORS,
  SCENARIO_STATUS_COLORS,
} from '../../types/scenario';
import { Project } from '../../types/project';
import { Employee } from '../../types/employee';
import { useScenarioPlanner } from '../../hooks/useScenarioPlanner';

interface ScenarioPlannerProps {
  scenarioId?: string;
  onScenarioChange?: (scenario: Scenario) => void;
  onAllocationChange?: (allocations: ScenarioAllocation[]) => void;
}

interface DraggableAllocationProps {
  allocation: ScenarioAllocation;
  project?: Project;
  employee?: Employee;
  onEdit: (allocation: ScenarioAllocation) => void;
  onDelete: (allocationId: string) => void;
  viewMode: 'timeline' | 'grid' | 'gantt';
  isConflicted?: boolean;
}

interface DroppableTimelineProps {
  date: string;
  allocations: ScenarioAllocation[];
  onDrop: (allocationId: string, date: string) => void;
  viewMode: 'timeline' | 'grid' | 'gantt';
}

interface AllocationFormProps {
  allocation?: ScenarioAllocation;
  projects: Project[];
  employees: Employee[];
  onSave: (allocation: Partial<ScenarioAllocation>) => void;
  onCancel: () => void;
  isVisible: boolean;
}

// Draggable Allocation Card Component
const DraggableAllocation: React.FC<DraggableAllocationProps> = ({
  allocation,
  project,
  employee,
  onEdit,
  onDelete,
  viewMode,
  isConflicted = false
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ 
    id: allocation.id,
    data: { allocation }
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const allocationTypeColor = ALLOCATION_TYPE_COLORS[allocation.allocationType];

  return (
    <motion.div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      layout
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: isDragging ? 0.5 : 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8 }}
      className={`
        relative bg-white rounded-lg shadow-sm border-2 cursor-move
        hover:shadow-md transition-all duration-200 p-3
        ${isDragging ? 'z-50 rotate-5' : ''}
        ${isConflicted ? 'border-red-300 bg-red-50' : 'border-gray-200'}
        ${viewMode === 'grid' ? 'w-full' : viewMode === 'timeline' ? 'min-w-48' : 'w-64'}
      `}
      data-testid="draggable-allocation"
    >
      {/* Conflict Indicator */}
      {isConflicted && (
        <div className="absolute -top-2 -right-2">
          <ExclamationTriangleIcon className="h-5 w-5 text-red-500 bg-white rounded-full p-1 shadow-sm" />
        </div>
      )}

      {/* Allocation Type Badge */}
      <div className={`absolute top-2 right-2 px-2 py-1 rounded-full text-xs font-medium ${allocationTypeColor}`}>
        {allocation.allocationType}
      </div>

      {/* Main Content */}
      <div className="space-y-2">
        {/* Project/Employee Info */}
        <div>
          <p className="font-semibold text-sm text-gray-900 truncate">
            {project?.name || 'Unknown Project'}
          </p>
          <p className="text-xs text-gray-600 truncate">
            {employee ? `${employee.firstName} ${employee.lastName}` : 'Unknown Employee'}
          </p>
        </div>

        {/* Allocation Details */}
        <div className="flex items-center justify-between">
          <div className="flex items-center text-xs text-gray-500">
            <ClockIcon className="h-3 w-3 mr-1" />
            {allocation.allocationPercentage}%
          </div>
          {allocation.estimatedHours && (
            <div className="text-xs text-gray-500">
              {allocation.estimatedHours}h
            </div>
          )}
        </div>

        {/* Date Range */}
        <div className="flex items-center text-xs text-gray-500">
          <CalendarIcon className="h-3 w-3 mr-1" />
          {new Date(allocation.startDate).toLocaleDateString()} - 
          {allocation.endDate ? new Date(allocation.endDate).toLocaleDateString() : 'Ongoing'}
        </div>

        {/* Confidence Level */}
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            {[...Array(5)].map((_, i) => (
              <div
                key={i}
                className={`h-2 w-2 rounded-full mr-1 ${
                  i < allocation.confidenceLevel ? 'bg-blue-500' : 'bg-gray-200'
                }`}
              />
            ))}
          </div>
          
          {/* Action Buttons */}
          <div className="flex items-center space-x-1">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onEdit(allocation);
              }}
              className="p-1 text-gray-400 hover:text-blue-500 transition-colors"
              title="Edit allocation"
            >
              <AdjustmentsHorizontalIcon className="h-3 w-3" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete(allocation.id);
              }}
              className="p-1 text-gray-400 hover:text-red-500 transition-colors"
              title="Delete allocation"
            >
              <TrashIcon className="h-3 w-3" />
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

// Droppable Timeline Column Component
const DroppableTimelineColumn: React.FC<DroppableTimelineProps> = ({
  date,
  allocations,
  onDrop,
  viewMode
}) => {
  const [isOver, setIsOver] = useState(false);

  return (
    <div
      className={`
        min-h-32 p-4 rounded-lg border-2 border-dashed transition-all duration-200
        ${isOver ? 'border-blue-400 bg-blue-50' : 'border-gray-200 bg-gray-50'}
        ${viewMode === 'timeline' ? 'min-w-64' : 'w-full'}
      `}
      data-testid="droppable-timeline-column"
    >
      {/* Column Header */}
      <div className="mb-3">
        <h4 className="font-medium text-gray-900 text-sm">
          {new Date(date).toLocaleDateString('en-US', {
            weekday: 'short',
            month: 'short',
            day: 'numeric'
          })}
        </h4>
        <p className="text-xs text-gray-500">
          {allocations.length} allocation{allocations.length !== 1 ? 's' : ''}
        </p>
      </div>

      {/* Allocations */}
      <div className="space-y-2">
        <SortableContext items={allocations.map(a => a.id)} strategy={verticalListSortingStrategy}>
          {allocations.map(allocation => (
            <DraggableAllocation
              key={allocation.id}
              allocation={allocation}
              onEdit={() => {}}
              onDelete={() => {}}
              viewMode={viewMode}
            />
          ))}
        </SortableContext>
      </div>

      {/* Drop Indicator */}
      {allocations.length === 0 && (
        <div className="text-center py-8">
          <PlusIcon className="h-8 w-8 text-gray-300 mx-auto mb-2" />
          <p className="text-sm text-gray-400">Drop allocations here</p>
        </div>
      )}
    </div>
  );
};

// Allocation Form Modal Component
const AllocationForm: React.FC<AllocationFormProps> = ({
  allocation,
  projects,
  employees,
  onSave,
  onCancel,
  isVisible
}) => {
  const [formData, setFormData] = useState<Partial<ScenarioAllocation>>({
    projectId: '',
    employeeId: '',
    allocationType: 'tentative',
    allocationPercentage: 50,
    startDate: new Date().toISOString().split('T')[0],
    confidenceLevel: 3,
    ...allocation
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.projectId) newErrors.projectId = 'Project is required';
    if (!formData.employeeId) newErrors.employeeId = 'Employee is required';
    if (!formData.allocationPercentage || formData.allocationPercentage <= 0 || formData.allocationPercentage > 100) {
      newErrors.allocationPercentage = 'Allocation percentage must be between 1 and 100';
    }
    if (!formData.startDate) newErrors.startDate = 'Start date is required';
    if (formData.endDate && formData.endDate < formData.startDate) {
      newErrors.endDate = 'End date must be after start date';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateForm()) {
      onSave(formData);
    }
  };

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        {/* Background overlay */}
        <div
          className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
          onClick={onCancel}
        />

        {/* Modal */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full"
          data-testid="allocation-form-modal"
        >
          <form onSubmit={handleSubmit}>
            <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
              <div className="sm:flex sm:items-start">
                <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                  <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                    {allocation ? 'Edit Allocation' : 'Create Allocation'}
                  </h3>

                  <div className="grid grid-cols-1 gap-4">
                    {/* Project Selection */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Project
                      </label>
                      <select
                        value={formData.projectId}
                        onChange={(e) => setFormData(prev => ({ ...prev, projectId: e.target.value }))}
                        className={`w-full rounded-md border ${
                          errors.projectId ? 'border-red-300' : 'border-gray-300'
                        } shadow-sm focus:border-blue-500 focus:ring-blue-500`}
                        data-testid="allocation-project"
                      >
                        <option value="">Select a project</option>
                        {projects.map(project => (
                          <option key={project.id} value={project.id}>
                            {project.name} - {project.clientName}
                          </option>
                        ))}
                      </select>
                      {errors.projectId && (
                        <p className="text-red-500 text-xs mt-1">{errors.projectId}</p>
                      )}
                    </div>

                    {/* Employee Selection */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Employee
                      </label>
                      <select
                        value={formData.employeeId}
                        onChange={(e) => setFormData(prev => ({ ...prev, employeeId: e.target.value }))}
                        className={`w-full rounded-md border ${
                          errors.employeeId ? 'border-red-300' : 'border-gray-300'
                        } shadow-sm focus:border-blue-500 focus:ring-blue-500`}
                        data-testid="allocation-employee"
                      >
                        <option value="">Select an employee</option>
                        {employees.map(employee => (
                          <option key={employee.id} value={employee.id}>
                            {employee.firstName} {employee.lastName} - {employee.position}
                          </option>
                        ))}
                      </select>
                      {errors.employeeId && (
                        <p className="text-red-500 text-xs mt-1">{errors.employeeId}</p>
                      )}
                    </div>

                    {/* Allocation Type and Percentage */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Type
                        </label>
                        <select
                          value={formData.allocationType}
                          onChange={(e) => setFormData(prev => ({ ...prev, allocationType: e.target.value as AllocationType }))}
                          className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                          data-testid="allocation-type"
                        >
                          <option value="tentative">Tentative</option>
                          <option value="probable">Probable</option>
                          <option value="confirmed">Confirmed</option>
                        </select>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Allocation %
                        </label>
                        <input
                          type="number"
                          min="1"
                          max="100"
                          value={formData.allocationPercentage}
                          onChange={(e) => setFormData(prev => ({ ...prev, allocationPercentage: parseInt(e.target.value) }))}
                          className={`w-full rounded-md border ${
                            errors.allocationPercentage ? 'border-red-300' : 'border-gray-300'
                          } shadow-sm focus:border-blue-500 focus:ring-blue-500`}
                          data-testid="allocation-percentage"
                        />
                        {errors.allocationPercentage && (
                          <p className="text-red-500 text-xs mt-1">{errors.allocationPercentage}</p>
                        )}
                      </div>
                    </div>

                    {/* Date Range */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Start Date
                        </label>
                        <input
                          type="date"
                          value={formData.startDate}
                          onChange={(e) => setFormData(prev => ({ ...prev, startDate: e.target.value }))}
                          className={`w-full rounded-md border ${
                            errors.startDate ? 'border-red-300' : 'border-gray-300'
                          } shadow-sm focus:border-blue-500 focus:ring-blue-500`}
                          data-testid="allocation-start-date"
                        />
                        {errors.startDate && (
                          <p className="text-red-500 text-xs mt-1">{errors.startDate}</p>
                        )}
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          End Date
                        </label>
                        <input
                          type="date"
                          value={formData.endDate || ''}
                          onChange={(e) => setFormData(prev => ({ ...prev, endDate: e.target.value || undefined }))}
                          className={`w-full rounded-md border ${
                            errors.endDate ? 'border-red-300' : 'border-gray-300'
                          } shadow-sm focus:border-blue-500 focus:ring-blue-500`}
                          data-testid="allocation-end-date"
                        />
                        {errors.endDate && (
                          <p className="text-red-500 text-xs mt-1">{errors.endDate}</p>
                        )}
                      </div>
                    </div>

                    {/* Confidence Level and Estimated Hours */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Confidence Level
                        </label>
                        <select
                          value={formData.confidenceLevel}
                          onChange={(e) => setFormData(prev => ({ ...prev, confidenceLevel: parseInt(e.target.value) }))}
                          className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                          data-testid="allocation-confidence"
                        >
                          <option value={1}>1 - Very Low</option>
                          <option value={2}>2 - Low</option>
                          <option value={3}>3 - Medium</option>
                          <option value={4}>4 - High</option>
                          <option value={5}>5 - Very High</option>
                        </select>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Estimated Hours
                        </label>
                        <input
                          type="number"
                          min="0"
                          value={formData.estimatedHours || ''}
                          onChange={(e) => setFormData(prev => ({ ...prev, estimatedHours: e.target.value ? parseInt(e.target.value) : undefined }))}
                          className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                          data-testid="allocation-estimated-hours"
                        />
                      </div>
                    </div>

                    {/* Notes */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Notes
                      </label>
                      <textarea
                        rows={3}
                        value={formData.notes || ''}
                        onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                        className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                        placeholder="Optional notes about this allocation..."
                        data-testid="allocation-notes"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
              <button
                type="submit"
                className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm"
                data-testid="save-allocation-btn"
              >
                {allocation ? 'Update' : 'Create'} Allocation
              </button>
              <button
                type="button"
                onClick={onCancel}
                className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                data-testid="cancel-allocation-btn"
              >
                Cancel
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </div>
  );
};

// Main Scenario Planner Component
export const ScenarioPlanner: React.FC<ScenarioPlannerProps> = ({
  scenarioId,
  onScenarioChange,
  onAllocationChange
}) => {
  const {
    scenario,
    allocations,
    conflicts,
    projects,
    employees,
    isLoading,
    error,
    createAllocation,
    updateAllocation,
    deleteAllocation,
    moveAllocation,
    state,
    setState
  } = useScenarioPlanner(scenarioId);

  const [showForm, setShowForm] = useState(false);
  const [editingAllocation, setEditingAllocation] = useState<ScenarioAllocation | undefined>();
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Generate timeline dates
  const timelineDates = useMemo(() => {
    if (!state.timeRange.start || !state.timeRange.end) return [];
    
    const dates = [];
    const currentDate = new Date(state.timeRange.start);
    const endDate = new Date(state.timeRange.end);
    
    while (currentDate <= endDate) {
      dates.push(currentDate.toISOString().split('T')[0]);
      currentDate.setDate(currentDate.getDate() + 7); // Weekly intervals
    }
    
    return dates;
  }, [state.timeRange]);

  // Group allocations by date for timeline view
  const allocationsByDate = useMemo(() => {
    const grouped: Record<string, ScenarioAllocation[]> = {};
    
    timelineDates.forEach(date => {
      grouped[date] = allocations.filter(allocation => {
        const startDate = new Date(allocation.startDate);
        const endDate = allocation.endDate ? new Date(allocation.endDate) : new Date();
        const currentDate = new Date(date);
        
        return currentDate >= startDate && currentDate <= endDate;
      });
    });
    
    return grouped;
  }, [allocations, timelineDates]);

  // Filter allocations based on current filters
  const filteredAllocations = useMemo(() => {
    let filtered = allocations;
    
    if (state.filters.projects?.length) {
      filtered = filtered.filter(a => state.filters.projects!.includes(a.projectId));
    }
    
    if (state.filters.employees?.length) {
      filtered = filtered.filter(a => state.filters.employees!.includes(a.employeeId));
    }
    
    if (state.filters.allocationType?.length) {
      filtered = filtered.filter(a => state.filters.allocationType!.includes(a.allocationType));
    }
    
    return filtered;
  }, [allocations, state.filters]);

  const handleDragStart = useCallback((event: any) => {
    setActiveId(event.active.id);
  }, []);

  const handleDragEnd = useCallback((event: any) => {
    const { active, over } = event;
    
    if (!over) {
      setActiveId(null);
      return;
    }

    // Handle reordering within the same container
    if (active.id !== over.id) {
      const oldIndex = filteredAllocations.findIndex(a => a.id === active.id);
      const newIndex = filteredAllocations.findIndex(a => a.id === over.id);
      
      if (oldIndex !== -1 && newIndex !== -1) {
        const newAllocations = arrayMove(filteredAllocations, oldIndex, newIndex);
        // Here you would typically update the order in your backend
      }
    }

    setActiveId(null);
  }, [filteredAllocations]);

  const handleCreateAllocation = async (allocationData: Partial<ScenarioAllocation>) => {
    if (!scenario) return;
    
    await createAllocation({
      ...allocationData,
      scenarioId: scenario.id,
    } as any);
    
    setShowForm(false);
    setEditingAllocation(undefined);
  };

  const handleUpdateAllocation = async (allocationData: Partial<ScenarioAllocation>) => {
    if (!editingAllocation) return;
    
    await updateAllocation({
      ...allocationData,
      id: editingAllocation.id,
    } as any);
    
    setShowForm(false);
    setEditingAllocation(undefined);
  };

  const handleDeleteAllocation = async (allocationId: string) => {
    if (confirm('Are you sure you want to delete this allocation?')) {
      await deleteAllocation(allocationId);
    }
  };

  const handleEditAllocation = (allocation: ScenarioAllocation) => {
    setEditingAllocation(allocation);
    setShowForm(true);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading scenario planner...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <ExclamationTriangleIcon className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <p className="text-red-600 mb-4">Failed to load scenario planner</p>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  if (!scenario) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <ClipboardDocumentListIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">No scenario selected</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6" data-testid="scenario-planner">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{scenario.name}</h1>
            <p className="text-gray-600 mt-1">{scenario.description}</p>
            <div className="flex items-center mt-2 space-x-4">
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${SCENARIO_STATUS_COLORS[scenario.status]}`}>
                {scenario.status}
              </span>
              <span className="text-sm text-gray-500">
                {scenario.totalAllocations || 0} allocations
              </span>
              {conflicts.length > 0 && (
                <span className="flex items-center text-sm text-red-600">
                  <ExclamationTriangleIcon className="h-4 w-4 mr-1" />
                  {conflicts.length} conflict{conflicts.length !== 1 ? 's' : ''}
                </span>
              )}
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center space-x-3">
            {/* View Mode Switcher */}
            <div className="flex bg-white rounded-lg p-1 shadow-sm">
              {(['timeline', 'grid', 'gantt'] as const).map((mode) => (
                <button
                  key={mode}
                  onClick={() => setState(prev => ({ ...prev, viewMode: mode }))}
                  className={`px-3 py-2 rounded-md text-sm font-medium capitalize transition-all ${
                    state.viewMode === mode
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  {mode}
                </button>
              ))}
            </div>

            {/* Add Allocation Button */}
            <button
              onClick={() => setShowForm(true)}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg shadow-sm hover:bg-blue-700 transition-colors"
              data-testid="add-allocation-btn"
            >
              <PlusIcon className="h-4 w-4 mr-2" />
              Add Allocation
            </button>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-6 p-4 bg-white rounded-lg shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900">Filters</h3>
          <button
            onClick={() => setState(prev => ({
              ...prev,
              filters: { projects: [], employees: [], allocationType: [], skillCategories: [] }
            }))}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            Clear all
          </button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Project Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Projects
            </label>
            <select
              multiple
              value={state.filters.projects || []}
              onChange={(e) => {
                const selected = Array.from(e.target.selectedOptions, option => option.value);
                setState(prev => ({ ...prev, filters: { ...prev.filters, projects: selected } }));
              }}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            >
              {projects.map(project => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
          </div>

          {/* Employee Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Employees
            </label>
            <select
              multiple
              value={state.filters.employees || []}
              onChange={(e) => {
                const selected = Array.from(e.target.selectedOptions, option => option.value);
                setState(prev => ({ ...prev, filters: { ...prev.filters, employees: selected } }));
              }}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            >
              {employees.map(employee => (
                <option key={employee.id} value={employee.id}>
                  {employee.firstName} {employee.lastName}
                </option>
              ))}
            </select>
          </div>

          {/* Allocation Type Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Allocation Type
            </label>
            <select
              multiple
              value={state.filters.allocationType || []}
              onChange={(e) => {
                const selected = Array.from(e.target.selectedOptions, option => option.value as AllocationType);
                setState(prev => ({ ...prev, filters: { ...prev.filters, allocationType: selected } }));
              }}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            >
              <option value="tentative">Tentative</option>
              <option value="probable">Probable</option>
              <option value="confirmed">Confirmed</option>
            </select>
          </div>

          {/* Date Range */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Date Range
            </label>
            <div className="flex space-x-2">
              <input
                type="date"
                value={state.timeRange.start}
                onChange={(e) => setState(prev => ({ 
                  ...prev, 
                  timeRange: { ...prev.timeRange, start: e.target.value } 
                }))}
                className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
              <input
                type="date"
                value={state.timeRange.end}
                onChange={(e) => setState(prev => ({ 
                  ...prev, 
                  timeRange: { ...prev.timeRange, end: e.target.value } 
                }))}
                className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        {state.viewMode === 'timeline' && (
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex overflow-x-auto space-x-6 pb-4">
              {timelineDates.map(date => (
                <DroppableTimelineColumn
                  key={date}
                  date={date}
                  allocations={allocationsByDate[date] || []}
                  onDrop={(allocationId, targetDate) => {
                    // Handle moving allocation to different date
                  }}
                  viewMode={state.viewMode}
                />
              ))}
            </div>
          </div>
        )}

        {state.viewMode === 'grid' && (
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              <SortableContext items={filteredAllocations.map(a => a.id)} strategy={verticalListSortingStrategy}>
                {filteredAllocations.map(allocation => (
                  <DraggableAllocation
                    key={allocation.id}
                    allocation={allocation}
                    project={projects.find(p => p.id === allocation.projectId)}
                    employee={employees.find(e => e.id === allocation.employeeId)}
                    onEdit={handleEditAllocation}
                    onDelete={handleDeleteAllocation}
                    viewMode={state.viewMode}
                    isConflicted={conflicts.some(c => c.employeeId === allocation.employeeId)}
                  />
                ))}
              </SortableContext>
            </div>
          </div>
        )}

        {state.viewMode === 'gantt' && (
          <div className="bg-white rounded-lg shadow-sm p-6">
            {/* Gantt chart implementation would go here */}
            <div className="text-center py-12">
              <p className="text-gray-500">Gantt chart view coming soon...</p>
            </div>
          </div>
        )}

        {/* Drag Overlay */}
        <DragOverlay>
          {activeId ? (
            <DraggableAllocation
              allocation={filteredAllocations.find(a => a.id === activeId)!}
              project={projects.find(p => p.id === filteredAllocations.find(a => a.id === activeId)?.projectId)}
              employee={employees.find(e => e.id === filteredAllocations.find(a => a.id === activeId)?.employeeId)}
              onEdit={() => {}}
              onDelete={() => {}}
              viewMode={state.viewMode}
            />
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* Allocation Form Modal */}
      <AllocationForm
        allocation={editingAllocation}
        projects={projects}
        employees={employees}
        onSave={editingAllocation ? handleUpdateAllocation : handleCreateAllocation}
        onCancel={() => {
          setShowForm(false);
          setEditingAllocation(undefined);
        }}
        isVisible={showForm}
      />
    </div>
  );
};