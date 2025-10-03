import React from 'react';
import { Employee, Department, EmployeeFormData, EmployeeOperationsHook, ValidationError } from '../types/employee.types';
import { parseServerErrors } from '../../../components/ui/ValidationErrorDisplay';
import { useToast } from '../../../components/ui/toast-provider';

const API_BASE_URL = 'http://localhost:3001/api';

export function useEmployeeOperations(): EmployeeOperationsHook {
  const [employees, setEmployees] = React.useState<Employee[]>([]);
  const [departments, setDepartments] = React.useState<Department[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [operationLoading, setOperationLoading] = React.useState(false);
  const [validationErrors, setValidationErrors] = React.useState<ValidationError[]>([]);

  const { addToast } = useToast();

  const showToast = React.useCallback((message: string, type: 'success' | 'error' | 'info' = 'info') => {
    addToast({ message, type });
  }, [addToast]);

  // Fetch employees and departments from real backend
  React.useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Fetch both employees and departments from real API
        const [employeesResponse, departmentsResponse] = await Promise.all([
          fetch(`${API_BASE_URL}/employees`),
          fetch(`${API_BASE_URL}/departments`)
        ]);

        const [employeesData, departmentsData] = await Promise.all([
          employeesResponse.json(),
          departmentsResponse.json()
        ]);

        setEmployees(employeesData.data || []);
        setDepartments(departmentsData.data || []);
      } catch (err) {
        console.error('Error fetching data:', err);
        showToast('Failed to load data', 'error');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [showToast]);

  const createEmployee = async (employeeData: EmployeeFormData) => {
    setOperationLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/employees`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(employeeData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        const errors = parseServerErrors(errorData);
        setValidationErrors(errors);
        throw new Error(errorData.error || 'Failed to create employee');
      }

      const result = await response.json();
      const newEmployee = {
        ...result.data,
        departmentName: departments.find(d => d.id === result.data.departmentId)?.name || ''
      };

      setEmployees(prev => [...prev, newEmployee]);
      showToast('Employee created successfully', 'success');
      setValidationErrors([]);
    } catch (error) {
      console.error('Error creating employee:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to create employee';
      showToast(errorMessage, 'error');
      throw error;
    } finally {
      setOperationLoading(false);
    }
  };

  const updateEmployee = async (id: string, employeeData: EmployeeFormData) => {
    setOperationLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/employees/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(employeeData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        const errors = parseServerErrors(errorData);
        setValidationErrors(errors);
        throw new Error(errorData.error || 'Failed to update employee');
      }

      const result = await response.json();

      setEmployees(prev => prev.map(emp =>
        emp.id === id ? { ...emp, ...result.data } : emp
      ));
      showToast('Employee updated successfully', 'success');
      setValidationErrors([]);
    } catch (error) {
      console.error('Error updating employee:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to update employee';
      showToast(errorMessage, 'error');
      throw error;
    } finally {
      setOperationLoading(false);
    }
  };

  const deleteEmployee = async (id: string) => {
    setOperationLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/employees/${id}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete employee');
      }

      setEmployees(prev => prev.filter(emp => emp.id !== id));
      showToast('Employee deleted successfully', 'success');
    } catch (error) {
      console.error('Error deleting employee:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete employee';
      showToast(errorMessage, 'error');
      throw error;
    } finally {
      setOperationLoading(false);
    }
  };

  const clearErrors = () => {
    setValidationErrors([]);
  };

  return {
    employees,
    departments,
    loading,
    operationLoading,
    validationErrors,
    createEmployee,
    updateEmployee,
    deleteEmployee,
    clearErrors
  };
}
