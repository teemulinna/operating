import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { CalendarIcon, UserIcon, BriefcaseIcon, ClockIcon, AlertTriangleIcon } from '@heroicons/react/24/outline';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useEmployees } from '@/hooks/useEmployees';
import { useProjects } from '@/hooks/useProjects';
import { useCreateAllocation, useUpdateAllocation, useCheckConflicts } from '@/hooks/useAllocations';
import { useToast } from '@/hooks/useToast';
import { cn } from '@/lib/utils';
import type { Allocation, CreateAllocationRequest, UpdateAllocationRequest, AllocationConflict } from '@/types/allocation';

// Form validation schema
const allocationFormSchema = z.object({
  employeeId: z.string().min(1, 'Employee is required'),
  projectId: z.string().min(1, 'Project is required'),
  startDate: z.date({
    required_error: 'Start date is required',
    invalid_type_error: 'Start date must be a valid date',
  }),
  endDate: z.date({
    required_error: 'End date is required',
    invalid_type_error: 'End date must be a valid date',
  }),
  allocatedHours: z.number()
    .min(1, 'Allocated hours must be at least 1')
    .max(168, 'Cannot exceed 168 hours per week'),
  role: z.string().optional(),
  status: z.enum(['active', 'planned', 'completed', 'cancelled']).default('planned'),
  notes: z.string().optional(),
}).refine(
  (data) => data.endDate >= data.startDate,
  {
    message: 'End date must be after or equal to start date',
    path: ['endDate'],
  }
);

type FormData = z.infer<typeof allocationFormSchema>;

interface AllocationFormProps {
  allocation?: Allocation;
  initialData?: Partial<CreateAllocationRequest>;
  onSuccess?: (allocation: Allocation) => void;
  onCancel?: () => void;
  isOpen?: boolean;
}

export function AllocationForm({ 
  allocation, 
  initialData,
  onSuccess,
  onCancel,
  isOpen = true 
}: AllocationFormProps) {
  const [conflicts, setConflicts] = useState<AllocationConflict[]>([]);
  const [showConflicts, setShowConflicts] = useState(false);
  const [forceCreate, setForceCreate] = useState(false);
  const { toast } = useToast();

  const isEditing = !!allocation;

  // Fetch data for dropdowns
  const { data: employeesData, isLoading: employeesLoading } = useEmployees({}, { limit: 100 });
  const { data: projectsData, isLoading: projectsLoading } = useProjects({}, { limit: 100 });

  // Mutations
  const createMutation = useCreateAllocation();
  const updateMutation = useUpdateAllocation();
  const checkConflictsMutation = useCheckConflicts();

  // Form setup
  const defaultValues: Partial<FormData> = {
    employeeId: allocation?.employeeId || initialData?.employeeId || '',
    projectId: allocation?.projectId || initialData?.projectId || '',
    startDate: allocation?.startDate ? new Date(allocation.startDate) : initialData?.startDate ? new Date(initialData.startDate) : new Date(),
    endDate: allocation?.endDate ? new Date(allocation.endDate) : initialData?.endDate ? new Date(initialData.endDate) : new Date(),
    allocatedHours: allocation?.allocatedHours || initialData?.allocatedHours || 40,
    role: allocation?.role || initialData?.role || '',
    status: allocation?.status || initialData?.status || 'planned',
    notes: allocation?.notes || initialData?.notes || '',
  };

  const form = useForm<FormData>({
    resolver: zodResolver(allocationFormSchema),
    defaultValues,
    mode: 'onBlur',
  });

  const { control, handleSubmit, watch, formState: { errors, isSubmitting }, reset } = form;

  // Watch form values for conflict checking
  const watchedValues = watch();

  // Check for conflicts when form values change
  useEffect(() => {
    const timeoutId = setTimeout(async () => {
      if (
        watchedValues.employeeId &&
        watchedValues.projectId &&
        watchedValues.startDate &&
        watchedValues.endDate &&
        watchedValues.allocatedHours
      ) {
        try {
          const allocationData: CreateAllocationRequest = {
            employeeId: watchedValues.employeeId,
            projectId: watchedValues.projectId,
            startDate: format(watchedValues.startDate, 'yyyy-MM-dd'),
            endDate: format(watchedValues.endDate, 'yyyy-MM-dd'),
            allocatedHours: watchedValues.allocatedHours,
            role: watchedValues.role,
            status: watchedValues.status,
            notes: watchedValues.notes,
            checkConflicts: true,
          };

          const detectedConflicts = await checkConflictsMutation.mutateAsync(allocationData);
          setConflicts(detectedConflicts);
          setShowConflicts(detectedConflicts.length > 0);
        } catch (error) {
          // Ignore conflicts checking errors during form input
        }
      }
    }, 500); // Debounce conflict checking

    return () => clearTimeout(timeoutId);
  }, [watchedValues, checkConflictsMutation]);

  // Reset form when allocation changes
  useEffect(() => {
    if (allocation) {
      reset({
        employeeId: allocation.employeeId,
        projectId: allocation.projectId,
        startDate: new Date(allocation.startDate),
        endDate: new Date(allocation.endDate),
        allocatedHours: allocation.allocatedHours,
        role: allocation.role || '',
        status: allocation.status,
        notes: allocation.notes || '',
      });
    }
  }, [allocation, reset]);

  const onSubmit = async (data: FormData) => {
    try {
      const allocationData: CreateAllocationRequest | UpdateAllocationRequest = {
        employeeId: data.employeeId,
        projectId: data.projectId,
        startDate: format(data.startDate, 'yyyy-MM-dd'),
        endDate: format(data.endDate, 'yyyy-MM-dd'),
        allocatedHours: data.allocatedHours,
        role: data.role,
        status: data.status,
        notes: data.notes,
        checkConflicts: true,
        forceCreate,
      };

      let result;
      if (isEditing) {
        result = await updateMutation.mutateAsync({
          id: allocation.id,
          updates: allocationData as Omit<UpdateAllocationRequest, 'id'>
        });
      } else {
        result = await createMutation.mutateAsync(allocationData as CreateAllocationRequest);
      }

      if (result.conflicts && result.conflicts.length > 0 && !forceCreate) {
        setConflicts(result.conflicts);
        setShowConflicts(true);
        toast({
          title: 'Conflicts Detected',
          description: `${result.conflicts.length} conflict(s) detected. Review and choose to proceed or modify the allocation.`,
          variant: 'warning',
        });
        return;
      }

      toast({
        title: isEditing ? 'Allocation Updated' : 'Allocation Created',
        description: `Allocation has been successfully ${isEditing ? 'updated' : 'created'}.`,
        variant: 'success',
      });

      onSuccess?.(result.allocation);
      reset();
      setConflicts([]);
      setShowConflicts(false);
    } catch (error: any) {
      toast({
        title: isEditing ? 'Update Failed' : 'Creation Failed',
        description: error.message || `Failed to ${isEditing ? 'update' : 'create'} allocation.`,
        variant: 'destructive',
      });
    }
  };

  const handleForceCreate = () => {
    setForceCreate(true);
    handleSubmit(onSubmit)();
  };

  const handleCancel = () => {
    reset();
    setConflicts([]);
    setShowConflicts(false);
    setForceCreate(false);
    onCancel?.();
  };

  if (!isOpen) return null;

  const employees = employeesData?.employees || [];
  const projects = projectsData?.projects || [];

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle className="flex items-center">
          {isEditing ? (
            <>
              <ClockIcon className="mr-2 h-5 w-5" />
              Edit Allocation
            </>
          ) : (
            <>
              <CalendarIcon className="mr-2 h-5 w-5" />
              Create New Allocation
            </>
          )}
        </CardTitle>
      </CardHeader>

      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Employee Selection */}
          <div className="space-y-2">
            <Label htmlFor="employeeId" className="flex items-center">
              <UserIcon className="mr-1 h-4 w-4" />
              Employee *
            </Label>
            <Controller
              name="employeeId"
              control={control}
              render={({ field }) => (
                <Select
                  value={field.value}
                  onValueChange={field.onChange}
                  disabled={employeesLoading}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select employee" />
                  </SelectTrigger>
                  <SelectContent>
                    {employees.map((employee) => (
                      <SelectItem key={employee.id} value={employee.id}>
                        {employee.firstName} {employee.lastName} - {employee.department}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.employeeId && (
              <p className="text-sm text-red-600">{errors.employeeId.message}</p>
            )}
          </div>

          {/* Project Selection */}
          <div className="space-y-2">
            <Label htmlFor="projectId" className="flex items-center">
              <BriefcaseIcon className="mr-1 h-4 w-4" />
              Project *
            </Label>
            <Controller
              name="projectId"
              control={control}
              render={({ field }) => (
                <Select
                  value={field.value}
                  onValueChange={field.onChange}
                  disabled={projectsLoading}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select project" />
                  </SelectTrigger>
                  <SelectContent>
                    {projects.map((project) => (
                      <SelectItem key={project.id} value={project.id}>
                        {project.name} - {project.clientName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.projectId && (
              <p className="text-sm text-red-600">{errors.projectId.message}</p>
            )}
          </div>

          {/* Date Range */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Start Date *</Label>
              <Controller
                name="startDate"
                control={control}
                render={({ field }) => (
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !field.value && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {field.value ? format(field.value, 'MMM d, yyyy') : 'Pick a date'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
                        disabled={(date) => date < new Date('1900-01-01')}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                )}
              />
              {errors.startDate && (
                <p className="text-sm text-red-600">{errors.startDate.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label>End Date *</Label>
              <Controller
                name="endDate"
                control={control}
                render={({ field }) => (
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !field.value && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {field.value ? format(field.value, 'MMM d, yyyy') : 'Pick a date'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
                        disabled={(date) => date < new Date('1900-01-01')}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                )}
              />
              {errors.endDate && (
                <p className="text-sm text-red-600">{errors.endDate.message}</p>
              )}
            </div>
          </div>

          {/* Allocated Hours and Role */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="allocatedHours" className="flex items-center">
                <ClockIcon className="mr-1 h-4 w-4" />
                Hours per Week *
              </Label>
              <Controller
                name="allocatedHours"
                control={control}
                render={({ field }) => (
                  <Input
                    type="number"
                    min="1"
                    max="168"
                    step="0.5"
                    {...field}
                    onChange={(e) => field.onChange(parseFloat(e.target.value))}
                    placeholder="e.g., 40"
                  />
                )}
              />
              {errors.allocatedHours && (
                <p className="text-sm text-red-600">{errors.allocatedHours.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="role">Role</Label>
              <Controller
                name="role"
                control={control}
                render={({ field }) => (
                  <Input
                    {...field}
                    placeholder="e.g., Developer, Designer"
                  />
                )}
              />
            </div>
          </div>

          {/* Status */}
          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <Controller
              name="status"
              control={control}
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="planned">Planned</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Controller
              name="notes"
              control={control}
              render={({ field }) => (
                <Textarea
                  {...field}
                  placeholder="Optional notes about this allocation..."
                  className="min-h-[80px]"
                />
              )}
            />
          </div>

          {/* Conflicts */}
          {showConflicts && conflicts.length > 0 && (
            <Alert>
              <AlertTriangleIcon className="h-4 w-4" />
              <AlertDescription>
                <div className="space-y-2">
                  <div className="font-medium">
                    {conflicts.length} conflict{conflicts.length > 1 ? 's' : ''} detected:
                  </div>
                  <ul className="list-disc list-inside space-y-1">
                    {conflicts.map((conflict, index) => (
                      <li key={index} className="text-sm">
                        <span className={`inline-block w-2 h-2 rounded-full mr-2 ${
                          conflict.severity === 'critical' ? 'bg-red-500' :
                          conflict.severity === 'high' ? 'bg-orange-500' :
                          conflict.severity === 'medium' ? 'bg-yellow-500' : 'bg-blue-500'
                        }`}></span>
                        {conflict.description}
                      </li>
                    ))}
                  </ul>
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Form Actions */}
          <div className="flex flex-col sm:flex-row gap-3 pt-4">
            <Button
              type="submit"
              disabled={isSubmitting}
              className="flex-1"
            >
              {isSubmitting ? 'Processing...' : isEditing ? 'Update Allocation' : 'Create Allocation'}
            </Button>
            
            {showConflicts && conflicts.length > 0 && (
              <Button
                type="button"
                variant="outline"
                onClick={handleForceCreate}
                disabled={isSubmitting}
                className="flex-1"
              >
                {isSubmitting ? 'Processing...' : 'Proceed Anyway'}
              </Button>
            )}
            
            <Button
              type="button"
              variant="outline"
              onClick={handleCancel}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}