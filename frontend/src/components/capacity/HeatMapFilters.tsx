import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search } from 'lucide-react';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Switch } from '../ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { MultiSelect } from '../ui/multi-select';
import { cn } from '../../lib/utils';

// ============================================
// TYPES
// ============================================

export interface HeatMapFiltersProps {
  selectedDepartment?: string;
  selectedEmployees: string[];
  includeWeekends: boolean;
  onDepartmentChange: (departmentId: string | undefined) => void;
  onEmployeesChange: (employeeIds: string[]) => void;
  onIncludeWeekendsChange: (include: boolean) => void;
  className?: string;
}

interface Department {
  id: string;
  name: string;
  code: string;
}

interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  departmentId: string;
  departmentName?: string;
}

// ============================================
// COMPONENT
// ============================================

export const HeatMapFilters: React.FC<HeatMapFiltersProps> = ({
  selectedDepartment,
  selectedEmployees,
  includeWeekends,
  onDepartmentChange,
  onEmployeesChange,
  onIncludeWeekendsChange,
  className = ''
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);

  // Fetch departments
  const { data: departments = [] } = useQuery<Department[]>({
    queryKey: ['departments'],
    queryFn: async () => {
      const response = await fetch('/api/departments');
      if (!response.ok) throw new Error('Failed to fetch departments');
      const data = await response.json();
      return data.data || [];
    }
  });

  // Fetch employees
  const { data: employees = [] } = useQuery<Employee[]>({
    queryKey: ['employees', selectedDepartment],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedDepartment) params.append('departmentId', selectedDepartment);
      params.append('isActive', 'true');

      const response = await fetch(`/api/employees?${params}`);
      if (!response.ok) throw new Error('Failed to fetch employees');
      const data = await response.json();
      return data.data || [];
    }
  });

  // Filter employees by search term
  const filteredEmployees = employees.filter(emp => {
    const fullName = `${emp.firstName} ${emp.lastName}`.toLowerCase();
    return fullName.includes(searchTerm.toLowerCase()) ||
           emp.email.toLowerCase().includes(searchTerm.toLowerCase());
  });

  // Employee options for multi-select
  const employeeOptions = filteredEmployees.map(emp => ({
    value: emp.id,
    label: `${emp.firstName} ${emp.lastName}`,
    description: emp.departmentName || emp.email
  }));

  // Handle department change
  const handleDepartmentChange = (value: string) => {
    const newDeptId = value === 'all' ? undefined : value;
    onDepartmentChange(newDeptId);

    // Clear employee selection if department changes
    if (newDeptId !== selectedDepartment) {
      onEmployeesChange([]);
    }
  };

  // Handle employee selection
  const handleEmployeeSelect = (values: string[]) => {
    onEmployeesChange(values);
  };

  return (
    <div className={cn('space-y-4 p-4 bg-background border rounded-lg', className)}>
      {/* Expandable Header */}
      <div
        className="flex items-center justify-between cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="text-sm font-medium">Filters</div>
        <button className="text-sm text-muted-foreground">
          {isExpanded ? 'Hide' : 'Show'}
        </button>
      </div>

      {/* Filter Content */}
      {isExpanded && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Department Filter */}
          <div className="space-y-2">
            <Label htmlFor="department">Department</Label>
            <Select
              value={selectedDepartment || 'all'}
              onValueChange={handleDepartmentChange}
            >
              <SelectTrigger id="department">
                <SelectValue placeholder="Select department" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Departments</SelectItem>
                {departments.map(dept => (
                  <SelectItem key={dept.id} value={dept.id}>
                    {dept.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Employee Filter */}
          <div className="space-y-2">
            <Label htmlFor="employees">Employees</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="employee-search"
                placeholder="Search employees..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            {searchTerm && filteredEmployees.length > 0 && (
              <MultiSelect
                options={employeeOptions}
                selected={selectedEmployees}
                onChange={handleEmployeeSelect}
                placeholder="Select employees"
                className="mt-2"
              />
            )}
            {selectedEmployees.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {selectedEmployees.map(empId => {
                  const emp = employees.find(e => e.id === empId);
                  return emp ? (
                    <span
                      key={empId}
                      className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-primary/10 text-primary rounded-full"
                    >
                      {emp.firstName} {emp.lastName}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onEmployeesChange(selectedEmployees.filter(id => id !== empId));
                        }}
                        className="ml-1 hover:text-destructive"
                      >
                        ×
                      </button>
                    </span>
                  ) : null;
                })}
              </div>
            )}
          </div>

          {/* Options */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="weekends" className="text-sm">
                Include Weekends
              </Label>
              <Switch
                id="weekends"
                checked={includeWeekends}
                onCheckedChange={onIncludeWeekendsChange}
              />
            </div>
          </div>
        </div>
      )}

      {/* Quick Stats */}
      {!isExpanded && (
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span>
            Department: {selectedDepartment ?
              departments.find(d => d.id === selectedDepartment)?.name || 'Selected' :
              'All'}
          </span>
          {selectedEmployees.length > 0 && (
            <span>
              Employees: {selectedEmployees.length} selected
            </span>
          )}
          {includeWeekends && <span>Including weekends</span>}
        </div>
      )}
    </div>
  );
};