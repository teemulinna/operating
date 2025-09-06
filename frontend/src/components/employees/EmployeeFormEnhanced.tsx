import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { LoadingButton } from '@/components/ui/loading-button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { EmployeeFormSkeleton } from './EmployeeFormSkeleton'
import { useCreateEmployee, useUpdateEmployee, useDepartments, usePositions } from '@/hooks/useEmployees'
import { useToast } from '@/hooks/useToast'
import type { Employee, CreateEmployeeRequest } from '@/types/employee'

const EmployeeFormSchema = z.object({
  firstName: z.string().min(1, 'First name is required').max(50, 'First name too long'),
  lastName: z.string().min(1, 'Last name is required').max(50, 'Last name too long'),
  email: z.string().email('Invalid email address'),
  phone: z.string().min(10, 'Phone number must be at least 10 digits').max(20, 'Phone number too long'),
  department: z.string().min(1, 'Department is required'),
  position: z.string().min(1, 'Position is required'),
  salary: z.coerce.number().min(0, 'Salary must be positive'),
  startDate: z.string().min(1, 'Start date is required'),
  status: z.enum(['active', 'inactive']).default('active'),
  address: z.string().optional(),
  emergencyContact: z.string().optional(),
  notes: z.string().optional(),
})

type EmployeeFormData = z.infer<typeof EmployeeFormSchema>

interface EmployeeFormProps {
  employee?: Employee
  onSuccess?: (employee: Employee) => void
  onCancel?: () => void
}

export function EmployeeFormEnhanced({ employee, onSuccess, onCancel }: EmployeeFormProps) {
  const { data: departments = [], isLoading: departmentsLoading } = useDepartments()
  const { data: positions = [], isLoading: positionsLoading } = usePositions()
  const createEmployee = useCreateEmployee()
  const updateEmployee = useUpdateEmployee()
  const { toast } = useToast()

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<EmployeeFormData>({
    resolver: zodResolver(EmployeeFormSchema),
    defaultValues: employee ? {
      firstName: employee.firstName,
      lastName: employee.lastName,
      email: employee.email,
      phone: employee.phone,
      department: employee.department,
      position: employee.position,
      salary: employee.salary,
      startDate: employee.startDate,
      status: employee.status,
      address: employee.address || '',
      emergencyContact: employee.emergencyContact || '',
      notes: employee.notes || '',
    } : {
      status: 'active',
      startDate: new Date().toISOString().split('T')[0],
    },
  })

  const onSubmit = async (data: EmployeeFormData) => {
    try {
      let result: Employee
      
      if (employee) {
        // Update existing employee
        result = await updateEmployee.mutateAsync({
          id: employee.id,
          updates: data,
        })
        toast({
          title: 'Employee Updated',
          description: `${data.firstName} ${data.lastName}'s information has been updated successfully.`,
          variant: 'success'
        })
      } else {
        // Create new employee
        result = await createEmployee.mutateAsync(data as CreateEmployeeRequest)
        toast({
          title: 'Employee Created',
          description: `${data.firstName} ${data.lastName} has been added to the system.`,
          variant: 'success'
        })
      }
      
      onSuccess?.(result)
      if (!employee) reset() // Reset form only for new employees
    } catch (error: any) {
      console.error('Error saving employee:', error)
      toast({
        title: employee ? 'Update Failed' : 'Creation Failed',
        description: error?.message || 'An unexpected error occurred. Please try again.',
        variant: 'destructive'
      })
    }
  }

  // Show skeleton while loading reference data
  if (departmentsLoading || positionsLoading) {
    return <EmployeeFormSkeleton />
  }

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>
          {employee ? 'Edit Employee' : 'Add New Employee'}
        </CardTitle>
        <CardDescription>
          {employee 
            ? 'Update employee information below'
            : 'Enter the details for the new employee'
          }
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Personal Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Personal Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  First Name *
                </label>
                <Input
                  {...register('firstName')}
                  placeholder="Enter first name"
                  className={errors.firstName ? 'border-red-500' : ''}
                />
                {errors.firstName && (
                  <p className="mt-1 text-sm text-red-600">{errors.firstName.message}</p>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Last Name *
                </label>
                <Input
                  {...register('lastName')}
                  placeholder="Enter last name"
                  className={errors.lastName ? 'border-red-500' : ''}
                />
                {errors.lastName && (
                  <p className="mt-1 text-sm text-red-600">{errors.lastName.message}</p>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email *
                </label>
                <Input
                  type="email"
                  {...register('email')}
                  placeholder="Enter email address"
                  className={errors.email ? 'border-red-500' : ''}
                />
                {errors.email && (
                  <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phone *
                </label>
                <Input
                  {...register('phone')}
                  placeholder="Enter phone number"
                  className={errors.phone ? 'border-red-500' : ''}
                />
                {errors.phone && (
                  <p className="mt-1 text-sm text-red-600">{errors.phone.message}</p>
                )}
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Address
              </label>
              <Input
                {...register('address')}
                placeholder="Enter address (optional)"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Emergency Contact
              </label>
              <Input
                {...register('emergencyContact')}
                placeholder="Enter emergency contact (optional)"
              />
            </div>
          </div>

          {/* Employment Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Employment Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Department *
                </label>
                <select
                  {...register('department')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Select department</option>
                  {departments.map((dept) => (
                    <option key={dept} value={dept}>
                      {dept}
                    </option>
                  ))}
                </select>
                {errors.department && (
                  <p className="mt-1 text-sm text-red-600">{errors.department.message}</p>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Position *
                </label>
                <select
                  {...register('position')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Select position</option>
                  {positions.map((pos) => (
                    <option key={pos} value={pos}>
                      {pos}
                    </option>
                  ))}
                </select>
                {errors.position && (
                  <p className="mt-1 text-sm text-red-600">{errors.position.message}</p>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Salary *
                </label>
                <Input
                  type="number"
                  {...register('salary')}
                  placeholder="Enter annual salary"
                  className={errors.salary ? 'border-red-500' : ''}
                />
                {errors.salary && (
                  <p className="mt-1 text-sm text-red-600">{errors.salary.message}</p>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Start Date *
                </label>
                <Input
                  type="date"
                  {...register('startDate')}
                  className={errors.startDate ? 'border-red-500' : ''}
                />
                {errors.startDate && (
                  <p className="mt-1 text-sm text-red-600">{errors.startDate.message}</p>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Status *
                </label>
                <select
                  {...register('status')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
            </div>
          </div>

          {/* Additional Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Additional Information</h3>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Notes
              </label>
              <textarea
                {...register('notes')}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter any additional notes (optional)"
              />
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex flex-col sm:flex-row gap-3 pt-4">
            <LoadingButton
              type="submit"
              loading={isSubmitting}
              loadingText={employee ? 'Updating...' : 'Creating...'}
              className="flex-1"
            >
              {employee ? 'Update Employee' : 'Create Employee'}
            </LoadingButton>
            <LoadingButton
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={isSubmitting}
              className="flex-1"
            >
              Cancel
            </LoadingButton>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}