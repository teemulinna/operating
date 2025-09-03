import { } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCreateEmployee, useUpdateEmployee, useDepartments, usePositions } from '@/hooks/useEmployees';
import type { Employee, CreateEmployeeRequest } from '@/types/employee';

const employeeSchema = z.object({
  firstName: z.string().min(1, 'First name is required').max(50, 'First name must be less than 50 characters'),
  lastName: z.string().min(1, 'Last name is required').max(50, 'Last name must be less than 50 characters'),
  email: z.string().email('Invalid email address').max(100, 'Email must be less than 100 characters'),
  phone: z.string().min(1, 'Phone is required').max(20, 'Phone must be less than 20 characters'),
  department: z.string().min(1, 'Department is required').max(50, 'Department must be less than 50 characters'),
  position: z.string().min(1, 'Position is required').max(50, 'Position must be less than 50 characters'),
  salary: z.number().min(0, 'Salary must be non-negative'),
  startDate: z.string().min(1, 'Start date is required'),
  status: z.enum(['active', 'inactive']),
  address: z.string().max(200, 'Address must be less than 200 characters').optional(),
  emergencyContact: z.string().max(100, 'Emergency contact must be less than 100 characters').optional(),
  notes: z.string().max(500, 'Notes must be less than 500 characters').optional(),
});

type EmployeeFormData = z.infer<typeof employeeSchema>;

interface EmployeeDialogProps {
  employee?: Employee | null;
  mode: 'create' | 'edit' | 'view';
  open: boolean;
  onClose: () => void;
}

export function EmployeeDialog({ employee, mode, open, onClose }: EmployeeDialogProps) {
  const { data: departments = [] } = useDepartments();
  const { data: positions = [] } = usePositions();
  const { mutate: createEmployee, isPending: isCreating } = useCreateEmployee();
  const { mutate: updateEmployee, isPending: isUpdating } = useUpdateEmployee();

  const isReadonly = mode === 'view';
  const isEditing = mode === 'edit';
  const isCreating_ = mode === 'create';

  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
    setValue,
    watch,
    reset,
  } = useForm<EmployeeFormData>({
    resolver: zodResolver(employeeSchema),
    defaultValues: employee ? {
      firstName: employee.firstName,
      lastName: employee.lastName,
      email: employee.email,
      phone: employee.phone,
      department: employee.department,
      position: employee.position,
      salary: employee.salary,
      startDate: employee.startDate.split('T')[0], // Format for date input
      status: employee.status,
      address: employee.address || '',
      emergencyContact: employee.emergencyContact || '',
      notes: employee.notes || '',
    } : {
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      department: '',
      position: '',
      salary: 0,
      startDate: new Date().toISOString().split('T')[0],
      status: 'active' as const,
      address: '',
      emergencyContact: '',
      notes: '',
    },
  });

  const watchedDepartment = watch('department');
  const watchedStatus = watch('status');

  const handleClose = () => {
    reset();
    onClose();
  };

  const onSubmit = (data: EmployeeFormData) => {
    if (isCreating_) {
      createEmployee(data as CreateEmployeeRequest, {
        onSuccess: () => {
          handleClose();
        },
        onError: (error) => {
          console.error('Failed to create employee:', error);
        },
      });
    } else if (isEditing && employee) {
      updateEmployee(
        { id: employee.id, updates: data },
        {
          onSuccess: () => {
            handleClose();
          },
          onError: (error) => {
            console.error('Failed to update employee:', error);
          },
        }
      );
    }
  };

  const getDialogTitle = () => {
    switch (mode) {
      case 'create':
        return 'Add New Employee';
      case 'edit':
        return 'Edit Employee';
      case 'view':
        return 'Employee Details';
      default:
        return '';
    }
  };

  const getDialogDescription = () => {
    switch (mode) {
      case 'create':
        return 'Fill in the employee information to add them to the directory.';
      case 'edit':
        return 'Update the employee information as needed.';
      case 'view':
        return 'View employee information and details.';
      default:
        return '';
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{getDialogTitle()}</DialogTitle>
          <DialogDescription>{getDialogDescription()}</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Personal Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Personal Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name *</Label>
                <Input
                  id="firstName"
                  {...register('firstName')}
                  disabled={isReadonly}
                  className={errors.firstName ? 'border-red-500' : ''}
                />
                {errors.firstName && (
                  <p className="text-sm text-red-600">{errors.firstName.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name *</Label>
                <Input
                  id="lastName"
                  {...register('lastName')}
                  disabled={isReadonly}
                  className={errors.lastName ? 'border-red-500' : ''}
                />
                {errors.lastName && (
                  <p className="text-sm text-red-600">{errors.lastName.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  {...register('email')}
                  disabled={isReadonly}
                  className={errors.email ? 'border-red-500' : ''}
                />
                {errors.email && (
                  <p className="text-sm text-red-600">{errors.email.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Phone *</Label>
                <Input
                  id="phone"
                  {...register('phone')}
                  disabled={isReadonly}
                  className={errors.phone ? 'border-red-500' : ''}
                />
                {errors.phone && (
                  <p className="text-sm text-red-600">{errors.phone.message}</p>
                )}
              </div>
            </div>
          </div>

          {/* Employment Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Employment Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="department">Department *</Label>
                {isReadonly ? (
                  <Input value={watchedDepartment} disabled />
                ) : (
                  <Select
                    value={watchedDepartment}
                    onValueChange={(value) => setValue('department', value)}
                  >
                    <SelectTrigger className={errors.department ? 'border-red-500' : ''}>
                      <SelectValue placeholder="Select Department" />
                    </SelectTrigger>
                    <SelectContent>
                      {departments.map((dept) => (
                        <SelectItem key={dept} value={dept}>
                          {dept}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                {errors.department && (
                  <p className="text-sm text-red-600">{errors.department.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="position">Position *</Label>
                {isReadonly ? (
                  <Input value={watch('position')} disabled />
                ) : (
                  <Select
                    value={watch('position')}
                    onValueChange={(value) => setValue('position', value)}
                  >
                    <SelectTrigger className={errors.position ? 'border-red-500' : ''}>
                      <SelectValue placeholder="Select Position" />
                    </SelectTrigger>
                    <SelectContent>
                      {positions.map((pos) => (
                        <SelectItem key={pos} value={pos}>
                          {pos}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                {errors.position && (
                  <p className="text-sm text-red-600">{errors.position.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="salary">Salary *</Label>
                <Input
                  id="salary"
                  type="number"
                  step="0.01"
                  {...register('salary', { valueAsNumber: true })}
                  disabled={isReadonly}
                  className={errors.salary ? 'border-red-500' : ''}
                />
                {errors.salary && (
                  <p className="text-sm text-red-600">{errors.salary.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="startDate">Start Date *</Label>
                <Input
                  id="startDate"
                  type="date"
                  {...register('startDate')}
                  disabled={isReadonly}
                  className={errors.startDate ? 'border-red-500' : ''}
                />
                {errors.startDate && (
                  <p className="text-sm text-red-600">{errors.startDate.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="status">Status *</Label>
                {isReadonly ? (
                  <Input value={watchedStatus} disabled />
                ) : (
                  <Select
                    value={watchedStatus}
                    onValueChange={(value: 'active' | 'inactive') => setValue('status', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              </div>
            </div>
          </div>

          {/* Additional Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Additional Information</h3>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="address">Address</Label>
                <Input
                  id="address"
                  {...register('address')}
                  disabled={isReadonly}
                  className={errors.address ? 'border-red-500' : ''}
                />
                {errors.address && (
                  <p className="text-sm text-red-600">{errors.address.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="emergencyContact">Emergency Contact</Label>
                <Input
                  id="emergencyContact"
                  {...register('emergencyContact')}
                  disabled={isReadonly}
                  className={errors.emergencyContact ? 'border-red-500' : ''}
                />
                {errors.emergencyContact && (
                  <p className="text-sm text-red-600">{errors.emergencyContact.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <textarea
                  id="notes"
                  {...register('notes')}
                  disabled={isReadonly}
                  rows={3}
                  className={`flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${
                    errors.notes ? 'border-red-500' : ''
                  }`}
                />
                {errors.notes && (
                  <p className="text-sm text-red-600">{errors.notes.message}</p>
                )}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose}>
              {isReadonly ? 'Close' : 'Cancel'}
            </Button>
            {!isReadonly && (
              <Button
                type="submit"
                disabled={!isValid || isCreating || isUpdating}
              >
                {isCreating || isUpdating ? 'Saving...' : isCreating_ ? 'Create Employee' : 'Update Employee'}
              </Button>
            )}
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}