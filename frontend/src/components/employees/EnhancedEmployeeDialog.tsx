import React from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { enhancedApiService, Employee, CreateEmployeeRequest, UpdateEmployeeRequest } from '@/services/enhancedApi';
import { formatSalary } from '@/lib/utils';
import { AlertTriangle, DollarSign, Calendar, Building, User } from 'lucide-react';

interface EnhancedEmployeeDialogProps {
  isOpen: boolean;
  onClose: () => void;
  employee?: Employee;
  mode: 'create' | 'edit' | 'view';
}

export function EnhancedEmployeeDialog({ isOpen, onClose, employee, mode }: EnhancedEmployeeDialogProps) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = React.useState({
    firstName: employee?.firstName || '',
    lastName: employee?.lastName || '',
    email: employee?.email || '',
    position: employee?.position || '',
    departmentId: employee?.departmentId || '',
    salary: employee?.salary ? parseFloat(employee.salary) : 75000,
    skills: employee?.skills?.join(', ') || '',
  });

  // Fetch departments for dropdown
  const { data: departments = [] } = useQuery({
    queryKey: ['departments'],
    queryFn: enhancedApiService.getDepartments,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  React.useEffect(() => {
    if (employee) {
      setFormData({
        firstName: employee.firstName || '',
        lastName: employee.lastName || '',
        email: employee.email || '',
        position: employee.position || '',
        departmentId: employee.departmentId || '',
        salary: employee.salary ? parseFloat(employee.salary) : 75000,
        skills: employee.skills?.join(', ') || '',
      });
    }
  }, [employee]);

  const createMutation = useMutation({
    mutationFn: async (data: CreateEmployeeRequest) => {
      return enhancedApiService.createEmployee(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      onClose();
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: UpdateEmployeeRequest) => {
      return enhancedApiService.updateEmployee(employee!.id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      onClose();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => enhancedApiService.deleteEmployee(employee!.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      onClose();
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const requestData = {
      firstName: formData.firstName,
      lastName: formData.lastName,
      email: formData.email,
      position: formData.position,
      departmentId: formData.departmentId,
      salary: formData.salary,
      skills: formData.skills.split(',').map((s: string) => s.trim()).filter(Boolean),
    };

    if (mode === 'create') {
      createMutation.mutate(requestData);
    } else if (mode === 'edit') {
      updateMutation.mutate(requestData);
    }
  };

  const handleInputChange = (field: string, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const isReadonly = mode === 'view';
  const isLoading = createMutation.isPending || updateMutation.isPending || deleteMutation.isPending;

  // Get selected department name
  const selectedDepartment = departments.find(d => d.id === formData.departmentId);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]" data-testid="employee-dialog">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2" data-testid="employee-dialog-title">
            <User className="h-5 w-5" />
            {mode === 'create' && 'Add New Employee'}
            {mode === 'edit' && 'Edit Employee'}
            {mode === 'view' && 'Employee Details'}
          </DialogTitle>
          <DialogDescription>
            {mode === 'create' && 'Create a new employee profile with their basic information.'}
            {mode === 'edit' && 'Update the employee information.'}
            {mode === 'view' && 'View employee details and current allocation status.'}
          </DialogDescription>
        </DialogHeader>

        {mode === 'view' && employee && (
          <div className="bg-gray-50 rounded-lg p-4 mb-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Calendar className="h-4 w-4 text-gray-500" />
                  <span className="text-sm text-gray-600">Hire Date</span>
                </div>
                <p className="font-medium">{new Date(employee.hireDate).toLocaleDateString()}</p>
              </div>
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <DollarSign className="h-4 w-4 text-gray-500" />
                  <span className="text-sm text-gray-600">Salary</span>
                </div>
                <p className="font-medium">{formatSalary(employee.salary)}</p>
              </div>
            </div>
            <div className="mt-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Current Capacity</span>
                <Badge variant={
                  (employee.capacity || 0) > 100 ? 'destructive' : 
                  (employee.capacity || 0) > 80 ? 'secondary' : 'default'
                }>
                  {employee.capacity}%
                </Badge>
              </div>
              {(employee.capacity || 0) > 100 && (
                <div className="flex items-center gap-2 mt-2 text-red-600">
                  <AlertTriangle className="h-4 w-4" />
                  <span className="text-sm">Over-allocated! Consider redistributing workload.</span>
                </div>
              )}
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="firstName">First Name *</Label>
              <Input
                id="firstName"
                data-testid="employee-first-name"
                value={formData.firstName}
                onChange={(e) => handleInputChange('firstName', e.target.value)}
                disabled={isReadonly}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="lastName">Last Name *</Label>
              <Input
                id="lastName"
                data-testid="employee-last-name"
                value={formData.lastName}
                onChange={(e) => handleInputChange('lastName', e.target.value)}
                disabled={isReadonly}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email *</Label>
            <Input
              id="email"
              data-testid="employee-email"
              type="email"
              value={formData.email}
              onChange={(e) => handleInputChange('email', e.target.value)}
              disabled={isReadonly}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="position">Position *</Label>
            <Select 
              value={formData.position} 
              onValueChange={(value) => handleInputChange('position', value)} 
              disabled={isReadonly}
            >
              <SelectTrigger data-testid="employee-position">
                <SelectValue placeholder="Select a position" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Software Engineer">Software Engineer</SelectItem>
                <SelectItem value="Senior Software Engineer">Senior Software Engineer</SelectItem>
                <SelectItem value="Team Lead">Team Lead</SelectItem>
                <SelectItem value="Product Manager">Product Manager</SelectItem>
                <SelectItem value="Designer">Designer</SelectItem>
                <SelectItem value="Senior Designer">Senior Designer</SelectItem>
                <SelectItem value="Marketing Manager">Marketing Manager</SelectItem>
                <SelectItem value="Sales Representative">Sales Representative</SelectItem>
                <SelectItem value="QA Engineer">QA Engineer</SelectItem>
                <SelectItem value="DevOps Engineer">DevOps Engineer</SelectItem>
                <SelectItem value="Data Analyst">Data Analyst</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="department">Department *</Label>
            <Select 
              value={formData.departmentId} 
              onValueChange={(value) => handleInputChange('departmentId', value)} 
              disabled={isReadonly}
            >
              <SelectTrigger data-testid="employee-department">
                <SelectValue placeholder="Select a department" />
              </SelectTrigger>
              <SelectContent>
                {departments.map((department) => (
                  <SelectItem key={department.id} value={department.id}>
                    <div className="flex items-center gap-2">
                      <Building className="h-4 w-4" />
                      {department.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="salary">Annual Salary *</Label>
            <div className="relative">
              <DollarSign className="h-4 w-4 absolute left-3 top-3 text-gray-500" />
              <Input
                id="salary"
                data-testid="employee-salary"
                type="number"
                min="30000"
                max="500000"
                step="1000"
                value={formData.salary}
                onChange={(e) => handleInputChange('salary', parseFloat(e.target.value) || 0)}
                disabled={isReadonly}
                className="pl-10"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="skills">Skills (comma-separated)</Label>
            <Input
              id="skills"
              data-testid="employee-skills"
              value={formData.skills}
              onChange={(e) => handleInputChange('skills', e.target.value)}
              disabled={isReadonly}
              placeholder="React, TypeScript, Node.js, Python"
            />
            {formData.skills && (
              <div className="flex flex-wrap gap-1 mt-2">
                {formData.skills.split(',').map((skill, index) => (
                  skill.trim() && (
                    <Badge key={index} variant="outline" className="text-xs">
                      {skill.trim()}
                    </Badge>
                  )
                ))}
              </div>
            )}
          </div>

          <DialogFooter>
            {mode === 'view' && employee && (
              <div className="flex gap-2 w-full">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    // Switch to edit mode - this would need parent component handling
                    console.log('Switch to edit mode');
                  }}
                  className="flex-1"
                >
                  Edit Employee
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  onClick={() => {
                    if (confirm(`Are you sure you want to delete ${employee.name}? This action cannot be undone.`)) {
                      deleteMutation.mutate();
                    }
                  }}
                  disabled={isLoading}
                  className="flex-1"
                >
                  {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
                </Button>
              </div>
            )}
            {mode !== 'view' && (
              <>
                <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isLoading} data-testid="employee-submit-btn">
                  {isLoading ? 'Saving...' : (mode === 'create' ? 'Create Employee' : 'Update Employee')}
                </Button>
              </>
            )}
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}