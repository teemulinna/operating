import React, { useState, useEffect } from 'react';
import { EmployeeFormProps, EmployeeFormData } from '../types/employee.types';
import { Dialog } from '../../../components/ui/dialog';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import { Select } from '../../../components/ui/select';
import ValidationErrorDisplay from '../../../components/ui/ValidationErrorDisplay';

/**
 * EmployeeFormModal Component
 * Modal form for creating and editing employees with comprehensive validation
 */
export function EmployeeFormModal({
  employee,
  departments,
  onSubmit,
  onCancel,
  isSubmitting,
  validationErrors
}: EmployeeFormProps & { isOpen: boolean }) {

  const [formData, setFormData] = useState<EmployeeFormData>({
    firstName: employee?.firstName || '',
    lastName: employee?.lastName || '',
    email: employee?.email || '',
    position: employee?.position || '',
    departmentId: employee?.departmentId || '',
    weeklyCapacity: employee?.weeklyCapacity || 40,
    salary: employee?.salary || 50000,
    skills: employee?.skills || []
  });

  const [skillsInput, setSkillsInput] = useState('');

  // Update form data when employee prop changes
  useEffect(() => {
    if (employee) {
      setFormData({
        firstName: employee.firstName,
        lastName: employee.lastName,
        email: employee.email,
        position: employee.position,
        departmentId: employee.departmentId,
        weeklyCapacity: employee.weeklyCapacity,
        salary: employee.salary,
        skills: employee.skills || []
      });
      setSkillsInput((employee.skills || []).join(', '));
    } else {
      setFormData({
        firstName: '',
        lastName: '',
        email: '',
        position: '',
        departmentId: '',
        weeklyCapacity: 40,
        salary: 50000,
        skills: []
      });
      setSkillsInput('');
    }
  }, [employee]);

  const handleInputChange = (field: keyof EmployeeFormData, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSkillsChange = (value: string) => {
    setSkillsInput(value);
    const skillsArray = value.split(',').map(skill => skill.trim()).filter(Boolean);
    setFormData(prev => ({
      ...prev,
      skills: skillsArray
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Update skills from input
    const finalData = {
      ...formData,
      skills: skillsInput.split(',').map(skill => skill.trim()).filter(Boolean)
    };
    
    await onSubmit(finalData);
  };

  const isEditing = !!employee;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" data-testid="employee-form-modal">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
        <div className="mb-6">
          <h2 className="text-xl font-bold text-gray-900" data-testid="modal-title">
            {isEditing ? 'Edit Employee' : 'Add New Employee'}
          </h2>
          <p className="text-sm text-gray-600 mt-1">
            {isEditing ? 'Update employee information' : 'Fill in the details for the new employee'}
          </p>
        </div>

        {validationErrors.length > 0 && (
          <div className="mb-6">
            <ValidationErrorDisplay errors={validationErrors} />
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Name Fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="firstName">First Name *</Label>
              <Input
                id="firstName"
                type="text"
                value={formData.firstName}
                onChange={(e) => handleInputChange('firstName', e.target.value)}
                placeholder="Enter first name"
                data-testid="employee-first-name"
                disabled={isSubmitting}
                required
              />
            </div>
            
            <div>
              <Label htmlFor="lastName">Last Name *</Label>
              <Input
                id="lastName"
                type="text"
                value={formData.lastName}
                onChange={(e) => handleInputChange('lastName', e.target.value)}
                placeholder="Enter last name"
                data-testid="employee-last-name"
                disabled={isSubmitting}
                required
              />
            </div>
          </div>

          {/* Contact Information */}
          <div>
            <Label htmlFor="email">Email Address *</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => handleInputChange('email', e.target.value)}
              placeholder="employee@company.com"
              data-testid="employee-email"
              disabled={isSubmitting}
              required
            />
          </div>

          {/* Position and Department */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="position">Position *</Label>
              <Input
                id="position"
                type="text"
                value={formData.position}
                onChange={(e) => handleInputChange('position', e.target.value)}
                placeholder="e.g., Senior Developer, Product Manager"
                data-testid="employee-position"
                disabled={isSubmitting}
                required
              />
            </div>
            
            <div>
              <Label htmlFor="departmentId">Department *</Label>
              <Select
                value={formData.departmentId}
                onChange={(e) => handleInputChange('departmentId', e.target.value)}
                data-testid="employee-department"
                disabled={isSubmitting}
                required
              >
                <option value="" disabled>Select department</option>
                {departments.map((department) => (
                  <option key={department.id} value={department.id}>
                    {department.name}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          {/* Work Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="weeklyCapacity">Hours per Week *</Label>
              <Input
                id="weeklyCapacity"
                type="number"
                min="1"
                max="168"
                value={formData.weeklyCapacity}
                onChange={(e) => handleInputChange('weeklyCapacity', parseInt(e.target.value) || 0)}
                placeholder="40"
                data-testid="employee-weekly-capacity"
                disabled={isSubmitting}
                required
              />
              <p className="text-xs text-gray-500 mt-1">Weekly working hours (1-168)</p>
            </div>
            
            <div>
              <Label htmlFor="salary">Annual Salary *</Label>
              <Input
                id="salary"
                type="number"
                min="0"
                step="1000"
                value={formData.salary}
                onChange={(e) => handleInputChange('salary', parseFloat(e.target.value) || 0)}
                placeholder="50000"
                data-testid="employee-salary"
                disabled={isSubmitting}
                required
              />
              <p className="text-xs text-gray-500 mt-1">Annual salary in USD</p>
            </div>
          </div>

          {/* Skills */}
          <div>
            <Label htmlFor="skills">Skills</Label>
            <Input
              id="skills"
              type="text"
              value={skillsInput}
              onChange={(e) => handleSkillsChange(e.target.value)}
              placeholder="React, TypeScript, Node.js (comma-separated)"
              data-testid="employee-skills"
              disabled={isSubmitting}
            />
            <p className="text-xs text-gray-500 mt-1">Enter skills separated by commas (optional)</p>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3 pt-6 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={isSubmitting}
              data-testid="cancel-button"
            >
              Cancel
            </Button>
            
            <Button
              type="submit"
              disabled={isSubmitting}
              data-testid="submit-employee"
            >
              {isSubmitting ? (
                <>
                  <svg 
                    className="animate-spin -ml-1 mr-2 h-4 w-4" 
                    fill="none" 
                    viewBox="0 0 24 24"
                  >
                    <circle 
                      className="opacity-25" 
                      cx="12" 
                      cy="12" 
                      r="10" 
                      stroke="currentColor" 
                      strokeWidth="4"
                    />
                    <path 
                      className="opacity-75" 
                      fill="currentColor" 
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  {isEditing ? 'Updating...' : 'Creating...'}
                </>
              ) : (
                isEditing ? 'Update Employee' : 'Create Employee'
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default EmployeeFormModal;