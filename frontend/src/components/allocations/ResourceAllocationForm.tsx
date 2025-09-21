import React from 'react';
import { useForm } from 'react-hook-form';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiService, Employee, Project, Allocation } from '../../services/api';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select } from '../ui/select';
import { Textarea } from '../ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { useToast } from '../ui/toast';
import { Badge } from '../ui/badge';
import { OverAllocationWarning } from './OverAllocationWarning';

interface ResourceAllocationFormData {
  employeeId: number;
  projectId: number;
  hours: number;
  percentage: number;
  startDate: string;
  endDate: string;
  notes?: string;
}

interface ResourceAllocationFormProps {
  onSubmit: (allocation: Allocation) => void;
  initialData?: Partial<ResourceAllocationFormData>;
  disabled?: boolean;
}

interface CapacityInfo {
  totalCapacity: number;
  currentAllocations: number;
  availableCapacity: number;
  isOverAllocated: boolean;
}

const ResourceAllocationForm: React.FC<ResourceAllocationFormProps> = ({
  onSubmit,
  initialData,
  disabled = false,
}) => {
  const queryClient = useQueryClient();
  const { showToast, ToastComponent } = useToast();
  const [selectedEmployeeId, setSelectedEmployeeId] = React.useState<number | null>(
    initialData?.employeeId || null
  );
  const [capacityInfo, setCapacityInfo] = React.useState<CapacityInfo | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ResourceAllocationFormData>({
    defaultValues: {
      hours: 20,
      percentage: 50,
      startDate: new Date().toISOString().split('T')[0],
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split('T')[0], // 30 days from now
      ...initialData,
    },
  });

  // Watch form values for real-time validation
  const watchedValues = watch();
  const { hours, percentage, startDate, endDate, employeeId } = watchedValues;

  // Fetch employees
  const { data: employees = [], isLoading: employeesLoading } = useQuery({
    queryKey: ['employees'],
    queryFn: apiService.getEmployees,
  });

  // Fetch projects
  const { data: projects = [], isLoading: projectsLoading } = useQuery({
    queryKey: ['projects'],
    queryFn: apiService.getProjects,
  });

  // Fetch existing allocations for capacity calculation
  const { data: allocations = [] } = useQuery({
    queryKey: ['allocations'],
    queryFn: apiService.getAllocations,
  });

  // Calculate capacity information when employee or hours change
  React.useEffect(() => {
    if (selectedEmployeeId && employees.length > 0) {
      const employee = employees.find((emp) => emp.id === selectedEmployeeId.toString());
      if (employee) {
        const employeeAllocations = allocations.filter(
          (alloc) => alloc.employeeId === selectedEmployeeId && alloc.status === 'active'
        );
        
        const currentAllocations = employeeAllocations.reduce(
          (total, alloc) => total + alloc.hours,
          0
        );
        
        const totalCapacity = employee.capacity || 40; // Default 40 hours per week
        const availableCapacity = totalCapacity - currentAllocations;
        const isOverAllocated = currentAllocations + (hours || 0) > totalCapacity;

        setCapacityInfo({
          totalCapacity,
          currentAllocations,
          availableCapacity,
          isOverAllocated,
        });
      }
    }
  }, [selectedEmployeeId, employees, allocations, hours]);

  // Sync percentage with hours (assuming 40-hour work week)
  React.useEffect(() => {
    if (hours && !isNaN(hours)) {
      const newPercentage = Math.round((hours / 40) * 100);
      setValue('percentage', Math.min(100, Math.max(0, newPercentage)));
    }
  }, [hours, setValue]);

  // Sync hours with percentage
  React.useEffect(() => {
    if (percentage && !isNaN(percentage)) {
      const newHours = Math.round((percentage / 100) * 40);
      setValue('hours', Math.max(0, newHours));
    }
  }, [percentage, setValue]);

  // Create allocation mutation
  const createAllocationMutation = useMutation({
    mutationFn: apiService.createAllocation,
    onSuccess: (data) => {
      showToast('Allocation created successfully', 'success');
      queryClient.invalidateQueries({ queryKey: ['allocations'] });
      reset();
      setSelectedEmployeeId(null);
      setCapacityInfo(null);
      onSubmit(data);
    },
    onError: (error: any) => {
      console.error('Allocation creation failed:', error);
      
      if (error.code === 'OVER_ALLOCATION') {
        showToast(
          `Over-allocation detected. Available: ${error.details?.availableHours || 0} hours`,
          'error'
        );
      } else {
        showToast(
          `Failed to create allocation: ${error.message || 'Unknown error'}`,
          'error'
        );
      }
    },
  });

  const onFormSubmit = (data: ResourceAllocationFormData) => {
    // Validation
    const errors: string[] = [];

    if (!data.employeeId) errors.push('Employee is required');
    if (!data.projectId) errors.push('Project is required');
    if (!data.hours || data.hours <= 0) errors.push('Hours must be positive');
    if (data.percentage < 0 || data.percentage > 100) {
      errors.push('Allocation percentage must be between 0 and 100');
    }
    if (new Date(data.endDate) <= new Date(data.startDate)) {
      errors.push('End date must be after start date');
    }

    if (errors.length > 0) {
      errors.forEach((error) => showToast(error, 'error'));
      return;
    }

    // Create allocation
    createAllocationMutation.mutate({
      employeeId: data.employeeId,
      projectId: data.projectId,
      hours: data.hours,
      date: data.startDate,
      status: 'active' as const,
      notes: data.notes,
    });
  };

  const handleEmployeeChange = (employeeId: string) => {
    const id = parseInt(employeeId);
    setSelectedEmployeeId(id);
    setValue('employeeId', id);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Resource Allocation Form</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-4">
            {/* Employee Selection */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="employee" aria-label="Employee">
                  Employee *
                </Label>
                <Select
                  id="employee"
                  aria-label="Employee"
                  disabled={employeesLoading || disabled}
                  value={selectedEmployeeId?.toString() || ''}
                  onChange={(e) => handleEmployeeChange(e.target.value)}
                >
                  <option value="">Select Employee</option>
                  {employees.map((employee) => (
                    <option key={employee.id} value={employee.id}>
                      {employee.name} - {employee.position}
                    </option>
                  ))}
                </Select>
                {errors.employeeId && (
                  <span className="text-sm text-red-600" role="alert">
                    Employee is required
                  </span>
                )}
              </div>

              {/* Project Selection */}
              <div className="space-y-2">
                <Label htmlFor="project" aria-label="Project">
                  Project *
                </Label>
                <Select
                  id="project"
                  aria-label="Project"
                  disabled={projectsLoading || disabled}
                  {...register('projectId', {
                    required: 'Project is required',
                    valueAsNumber: true,
                  })}
                >
                  <option value="">Select Project</option>
                  {projects.map((project) => (
                    <option key={project.id} value={project.id}>
                      {project.name} ({project.status})
                    </option>
                  ))}
                </Select>
                {errors.projectId && (
                  <span className="text-sm text-red-600" role="alert">
                    Project is required
                  </span>
                )}
              </div>
            </div>

            {/* Capacity Information */}
            {capacityInfo && (
              <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                <h4 className="font-medium text-gray-900">Capacity Information</h4>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Total Capacity:</span>
                    <Badge variant="outline" className="ml-2">
                      {capacityInfo.totalCapacity}h/week
                    </Badge>
                  </div>
                  <div>
                    <span className="text-gray-600">Current Allocations:</span>
                    <Badge variant="outline" className="ml-2">
                      {capacityInfo.currentAllocations}h/week
                    </Badge>
                  </div>
                  <div>
                    <span className="text-gray-600">Available Capacity:</span>
                    <Badge
                      variant={capacityInfo.availableCapacity > 0 ? 'default' : 'destructive'}
                      className="ml-2"
                    >
                      {capacityInfo.availableCapacity}h/week
                    </Badge>
                  </div>
                </div>
                
                {capacityInfo.isOverAllocated && (
                  <OverAllocationWarning
                    employeeName={
                      employees.find((emp) => emp.id === selectedEmployeeId?.toString())?.name ||
                      'Unknown'
                    }
                    currentAllocation={capacityInfo.currentAllocations}
                    newAllocation={hours || 0}
                    totalCapacity={capacityInfo.totalCapacity}
                  />
                )}
              </div>
            )}

            {/* Hours and Percentage */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="hours" aria-label="Hours">
                  Hours per Week *
                </Label>
                <Input
                  id="hours"
                  type="number"
                  min="0"
                  max="168"
                  step="0.5"
                  aria-label="Hours"
                  disabled={disabled}
                  {...register('hours', {
                    required: 'Hours is required',
                    valueAsNumber: true,
                    min: { value: 0.5, message: 'Hours must be positive' },
                  })}
                />
                {errors.hours && (
                  <span className="text-sm text-red-600" role="alert">
                    {errors.hours.message}
                  </span>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="percentage" aria-label="Allocation Percentage">
                  Allocation Percentage
                </Label>
                <div className="space-y-2">
                  <Input
                    id="percentage"
                    type="range"
                    min="0"
                    max="100"
                    step="5"
                    aria-label="Allocation Percentage"
                    disabled={disabled}
                    {...register('percentage', {
                      valueAsNumber: true,
                      min: { value: 0, message: 'Percentage must be between 0 and 100' },
                      max: { value: 100, message: 'Percentage must be between 0 and 100' },
                    })}
                    className="w-full"
                  />
                  <div className="text-center text-sm text-gray-600">
                    {percentage || 0}% ({Math.round(((percentage || 0) / 100) * 40)} hours/week)
                  </div>
                </div>
              </div>
            </div>

            {/* Date Range */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="startDate" aria-label="Start Date">
                  Start Date *
                </Label>
                <Input
                  id="startDate"
                  type="date"
                  aria-label="Start Date"
                  disabled={disabled}
                  {...register('startDate', { required: 'Start date is required' })}
                />
                {errors.startDate && (
                  <span className="text-sm text-red-600" role="alert">
                    {errors.startDate.message}
                  </span>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="endDate" aria-label="End Date">
                  End Date *
                </Label>
                <Input
                  id="endDate"
                  type="date"
                  aria-label="End Date"
                  disabled={disabled}
                  {...register('endDate', { required: 'End date is required' })}
                />
                {errors.endDate && (
                  <span className="text-sm text-red-600" role="alert">
                    {errors.endDate.message}
                  </span>
                )}
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes" aria-label="Notes">
                Notes
              </Label>
              <Textarea
                id="notes"
                placeholder="Additional notes about this allocation..."
                rows={3}
                aria-label="Notes"
                disabled={disabled}
                {...register('notes')}
              />
            </div>

            {/* Submit Button */}
            <div className="flex justify-end">
              <Button
                type="submit"
                disabled={isSubmitting || disabled}
                className="px-6 py-2"
              >
                {isSubmitting ? 'Creating...' : 'Create Allocation'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <ToastComponent />
    </div>
  );
};

export default ResourceAllocationForm;
