import React from 'react';
import { useForm } from 'react-hook-form';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiService, Employee, Project, Allocation } from '../../services/api';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select } from '../ui/select';
import { Badge } from '../ui/badge';
import { useToast } from '../ui/toast';
import { Search, Zap, User } from 'lucide-react';

interface QuickAssignFormData {
  employeeId: number;
  projectId: number;
  hours: number;
}

interface QuickAssignModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAssign: (allocation: Allocation) => void;
  preselectedEmployeeId?: string;
  preselectedProjectId?: number;
}

interface EmployeeWithAvailability extends Employee {
  availableHours: number;
  isAvailable: boolean;
}

const QuickAssignModal: React.FC<QuickAssignModalProps> = ({
  isOpen,
  onClose,
  onAssign,
  preselectedEmployeeId,
  preselectedProjectId,
}) => {
  const queryClient = useQueryClient();
  const { showToast, ToastComponent } = useToast();
  const [searchTerm, setSearchTerm] = React.useState('');
  const [filteredEmployees, setFilteredEmployees] = React.useState<EmployeeWithAvailability[]>([]);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<QuickAssignFormData>({
    defaultValues: {
      employeeId: preselectedEmployeeId ? parseInt(preselectedEmployeeId) : undefined,
      projectId: preselectedProjectId,
      hours: 20, // Default 20 hours per week
    },
  });

  const watchedEmployeeId = watch('employeeId');

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

  // Fetch existing allocations for availability calculation
  const { data: allocations = [] } = useQuery({
    queryKey: ['allocations'],
    queryFn: apiService.getAllocations,
  });

  // Calculate employee availability
  React.useEffect(() => {
    const employeesWithAvailability: EmployeeWithAvailability[] = employees.map((employee) => {
      const employeeAllocations = allocations.filter(
        (alloc) => alloc.employeeId.toString() === employee.id && alloc.status === 'active'
      );
      
      const currentAllocations = employeeAllocations.reduce(
        (total, alloc) => total + alloc.hours,
        0
      );
      
      const totalCapacity = employee.capacity || 40;
      const availableHours = totalCapacity - currentAllocations;
      const isAvailable = availableHours > 0;

      return {
        ...employee,
        availableHours,
        isAvailable,
      };
    });

    // Filter employees based on search term
    const filtered = employeesWithAvailability.filter((employee) => {
      if (!searchTerm) return true;
      return (
        employee.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        employee.position.toLowerCase().includes(searchTerm.toLowerCase()) ||
        employee.department.toLowerCase().includes(searchTerm.toLowerCase())
      );
    });

    // Sort by availability (available first) and then by name
    filtered.sort((a, b) => {
      if (a.isAvailable && !b.isAvailable) return -1;
      if (!a.isAvailable && b.isAvailable) return 1;
      return a.name.localeCompare(b.name);
    });

    setFilteredEmployees(filtered);
  }, [employees, allocations, searchTerm]);

  // Auto-focus on employee field when modal opens
  const employeeSelectRef = React.useRef<HTMLSelectElement>(null);
  React.useEffect(() => {
    if (isOpen && employeeSelectRef.current) {
      setTimeout(() => {
        employeeSelectRef.current?.focus();
      }, 100);
    }
  }, [isOpen]);

  // Handle keyboard shortcuts
  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (isOpen) {
        if (event.key === 'Escape') {
          event.preventDefault();
          onClose();
        } else if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
          event.preventDefault();
          handleSubmit(onFormSubmit)();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, handleSubmit, onClose]);

  // Quick assignment mutation
  const quickAssignMutation = useMutation({
    mutationFn: apiService.createAllocation,
    onSuccess: (data) => {
      showToast('Quick assignment completed successfully', 'success');
      queryClient.invalidateQueries({ queryKey: ['allocations'] });
      reset();
      onAssign(data);
      onClose();
    },
    onError: (error: any) => {
      console.error('Quick assignment failed:', error);
      showToast(
        `Failed to create assignment: ${error.message || 'Unknown error'}`,
        'error'
      );
      // Don't close modal on error - let user try again
    },
  });

  const onFormSubmit = (data: QuickAssignFormData) => {
    // Quick validation
    if (!data.employeeId || !data.projectId || !data.hours) {
      showToast('Please fill in all required fields', 'error');
      return;
    }

    if (data.hours <= 0) {
      showToast('Hours must be positive', 'error');
      return;
    }

    // Create allocation with today's date
    quickAssignMutation.mutate({
      employeeId: data.employeeId,
      projectId: data.projectId,
      hours: data.hours,
      date: new Date().toISOString().split('T')[0],
      status: 'active' as const,
    });
  };

  const selectedEmployee = filteredEmployees.find(
    (emp) => emp.id === watchedEmployeeId?.toString()
  );

  const handleEmployeeChange = (value: string) => {
    setValue('employeeId', parseInt(value));
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-md" aria-labelledby="quick-assign-title">
          <DialogHeader>
            <DialogTitle id="quick-assign-title" className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-yellow-500" />
              Quick Assign
            </DialogTitle>
            <DialogDescription id="quick-assign-description">
              Rapidly assign resources to projects. Use Ctrl+A to open this modal from anywhere.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-4">
            {/* Employee Selection with Search */}
            <div className="space-y-2">
              <Label htmlFor="employee-search" className="flex items-center gap-2">
                <User className="h-4 w-4" />
                Employee *
              </Label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  id="employee-search"
                  type="text"
                  placeholder="Search employees..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                  autoFocus
                />
              </div>
              
              <Select
                ref={employeeSelectRef}
                aria-label="Employee"
                disabled={employeesLoading}
                value={watchedEmployeeId?.toString() || ''}
                onChange={(e) => handleEmployeeChange(e.target.value)}
                className="max-h-40 overflow-y-auto"
              >
                <option value="">Select Employee</option>
                {filteredEmployees.map((employee) => (
                  <option
                    key={employee.id}
                    value={employee.id}
                    disabled={!employee.isAvailable}
                  >
                    {employee.name} - {employee.position}
                    {employee.isAvailable
                      ? ` (${employee.availableHours}h available)`
                      : ' (Fully allocated)'}
                  </option>
                ))}
              </Select>
              
              {selectedEmployee && (
                <div className="flex items-center gap-2 text-sm">
                  <Badge
                    variant={selectedEmployee.isAvailable ? 'default' : 'destructive'}
                  >
                    {selectedEmployee.availableHours}h available
                  </Badge>
                  <span className="text-gray-600">
                    {selectedEmployee.department}
                  </span>
                </div>
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
                disabled={projectsLoading}
                {...register('projectId', {
                  required: 'Project is required',
                  valueAsNumber: true,
                })}
              >
                <option value="">Select Project</option>
                {projects
                  .filter((project) => project.status === 'active')
                  .map((project) => (
                    <option key={project.id} value={project.id}>
                      {project.name}
                    </option>
                  ))}
              </Select>
            </div>

            {/* Hours Input */}
            <div className="space-y-2">
              <Label htmlFor="hours" aria-label="Hours">
                Hours per Week *
              </Label>
              <Input
                id="hours"
                type="number"
                min="1"
                max="40"
                step="1"
                aria-label="Hours"
                {...register('hours', {
                  required: 'Hours is required',
                  valueAsNumber: true,
                  min: { value: 1, message: 'Hours must be positive' },
                  max: { value: 40, message: 'Hours cannot exceed 40 per week' },
                })}
              />
              {errors.hours && (
                <span className="text-sm text-red-600" role="alert">
                  {errors.hours.message}
                </span>
              )}
            </div>

            <DialogFooter className="flex justify-between">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting || employeesLoading || projectsLoading}
                className="bg-yellow-500 hover:bg-yellow-600 text-white"
              >
                {isSubmitting ? 'Assigning...' : 'Quick Assign'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ToastComponent />
    </>
  );
};

// Hook to handle global keyboard shortcut for opening the modal
export const useQuickAssignShortcut = (onOpen: () => void) => {
  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey && event.key === 'a' && !event.shiftKey && !event.altKey) {
        event.preventDefault();
        onOpen();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onOpen]);
};

export default QuickAssignModal;
