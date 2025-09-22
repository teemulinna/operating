import React, { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../ui/dialog';

interface Employee {
  id?: string;
  firstName: string;
  lastName: string;
  email: string;
  position: string;
  departmentId: string;
  departmentName?: string;
  weeklyCapacity: number;
  salary?: number;
}

interface Department {
  id: string;
  name: string;
}

interface EmployeeFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (employee: Partial<Employee>) => Promise<void>;
  employee?: Employee | null;
  departments: Department[];
  isLoading: boolean;
}

export const EmployeeFormModal: React.FC<EmployeeFormModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  employee,
  departments,
  isLoading
}) => {
  const [formData, setFormData] = useState<Partial<Employee>>({
    firstName: '',
    lastName: '',
    email: '',
    position: '',
    departmentId: '',
    weeklyCapacity: 40,
    salary: 0
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  const isEdit = !!employee;

  useEffect(() => {
    if (employee) {
      setFormData({
        firstName: employee.firstName || '',
        lastName: employee.lastName || '',
        email: employee.email || '',
        position: employee.position || '',
        departmentId: employee.departmentId || '',
        weeklyCapacity: employee.weeklyCapacity || 40,
        salary: employee.salary || 0
      });
    } else {
      setFormData({
        firstName: '',
        lastName: '',
        email: '',
        position: '',
        departmentId: '',
        weeklyCapacity: 40,
        salary: 0
      });
    }
    setErrors({});
  }, [employee, isOpen]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.firstName?.trim()) {
      newErrors.firstName = 'First name is required';
    }

    if (!formData.lastName?.trim()) {
      newErrors.lastName = 'Last name is required';
    }

    if (!formData.email?.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (!formData.position?.trim()) {
      newErrors.position = 'Position is required';
    }

    if (!formData.departmentId) {
      newErrors.departmentId = 'Department is required';
    }

    if (!formData.weeklyCapacity || formData.weeklyCapacity <= 0) {
      newErrors.weeklyCapacity = 'Weekly capacity must be greater than 0';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setSubmitting(true);
    try {
      await onSubmit(formData);
      onClose();
    } catch (error) {
      console.error('Failed to submit employee:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleInputChange = (field: keyof Employee, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]" data-testid="employee-form-modal">
        <DialogHeader>
          <DialogTitle data-testid="modal-title">
            {isEdit ? 'Edit Employee' : 'Add New Employee'}
          </DialogTitle>
          <DialogDescription>
            {isEdit ? 'Update employee information' : 'Fill in the employee details below'}
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="firstName">First Name *</Label>
              <Input
                id="firstName"
                data-testid="employee-first-name"
                value={formData.firstName || ''}
                onChange={(e) => handleInputChange('firstName', e.target.value)}
                className={errors.firstName ? 'border-red-500' : ''}
              />
              {errors.firstName && (
                <p className="text-red-500 text-sm mt-1" data-testid="first-name-error">
                  {errors.firstName}
                </p>
              )}
            </div>
            
            <div>
              <Label htmlFor="lastName">Last Name *</Label>
              <Input
                id="lastName"
                data-testid="employee-last-name"
                value={formData.lastName || ''}
                onChange={(e) => handleInputChange('lastName', e.target.value)}
                className={errors.lastName ? 'border-red-500' : ''}
              />
              {errors.lastName && (
                <p className="text-red-500 text-sm mt-1" data-testid="last-name-error">
                  {errors.lastName}
                </p>
              )}
            </div>
          </div>

          <div>
            <Label htmlFor="email">Email *</Label>
            <Input
              id="email"
              type="email"
              data-testid="employee-email"
              value={formData.email || ''}
              onChange={(e) => handleInputChange('email', e.target.value)}
              className={errors.email ? 'border-red-500' : ''}
            />
            {errors.email && (
              <p className="text-red-500 text-sm mt-1" data-testid={errors.email.includes('valid') ? 'email-format-error' : 'email-error'}>
                {errors.email}
              </p>
            )}
          </div>

          <div>
            <Label htmlFor="position">Position *</Label>
            <Input
              id="position"
              data-testid="employee-position"
              value={formData.position || ''}
              onChange={(e) => handleInputChange('position', e.target.value)}
              className={errors.position ? 'border-red-500' : ''}
            />
            {errors.position && (
              <p className="text-red-500 text-sm mt-1" data-testid="position-error">
                {errors.position}
              </p>
            )}
          </div>

          <div>
            <Label htmlFor="department">Department *</Label>
            <Select
              value={formData.departmentId || ''}
              onValueChange={(value) => handleInputChange('departmentId', value)}
            >
              <SelectTrigger 
                data-testid="employee-department"
                className={errors.departmentId ? 'border-red-500' : ''}
              >
                <SelectValue placeholder="Select department" />
              </SelectTrigger>
              <SelectContent>
                {departments.map((dept) => (
                  <SelectItem key={dept.id} value={dept.id}>
                    {dept.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.departmentId && (
              <p className="text-red-500 text-sm mt-1" data-testid="department-error">
                {errors.departmentId}
              </p>
            )}
          </div>

          <div>
            <Label htmlFor="weeklyCapacity">Weekly Capacity *</Label>
            <Input
              id="weeklyCapacity"
              type="number"
              data-testid="employee-default-hours"
              value={formData.weeklyCapacity || 40}
              onChange={(e) => handleInputChange('weeklyCapacity', parseInt(e.target.value) || 0)}
              className={errors.weeklyCapacity ? 'border-red-500' : ''}
              min="1"
              max="80"
            />
            {errors.weeklyCapacity && (
              <p className="text-red-500 text-sm mt-1" data-testid="default-hours-error">
                {errors.weeklyCapacity}
              </p>
            )}
          </div>

          <div>
            <Label htmlFor="salary">Salary</Label>
            <Input
              id="salary"
              type="number"
              data-testid="employee-salary"
              value={formData.salary || ''}
              onChange={(e) => handleInputChange('salary', parseFloat(e.target.value) || 0)}
              min="0"
              step="0.01"
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              data-testid="submit-employee"
              disabled={submitting}
            >
              {submitting ? (
                <span data-testid="submit-loading">
                  {isEdit ? 'Updating...' : 'Creating...'}
                </span>
              ) : (
                isEdit ? 'Update Employee' : 'Create Employee'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};