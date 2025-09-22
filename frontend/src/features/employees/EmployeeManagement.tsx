import React from 'react';
import { useToastManager, ToastNotification } from '../../hooks/useToastManager';
import EmployeeList from './components/EmployeeList';
import EmployeeFormModal from './components/EmployeeFormModal';
import EmployeeDeleteDialog from './components/EmployeeDeleteDialog';
import { Button } from '../../components/ui/button';
import type { Employee, Department, EmployeeFormData } from './types/employee.types';

const API_BASE_URL = 'http://localhost:3001/api';

/**
 * EmployeeManagement - Main employee management component
 * 
 * Clean, maintainable implementation with shared hooks integration:
 * - Uses useToastManager for notifications
 * - Delegates UI to specialized components
 * - Maintains all existing CRUD functionality
 * - Connects to REAL backend API endpoints
 */
export function EmployeeManagement() {
  const [employees, setEmployees] = React.useState<Employee[]>([]);
  const [departments, setDepartments] = React.useState<Department[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [operationLoading, setOperationLoading] = React.useState(false);
  const [selectedEmployee, setSelectedEmployee] = React.useState<Employee | null>(null);
  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = React.useState(false);
  const [validationErrors, setValidationErrors] = React.useState<any[]>([]);

  const { toast, showToast, hideToast } = useToastManager();

  // Fetch employees and departments from real backend
  React.useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Fetch employees and departments in parallel
        const [employeesRes, departmentsRes] = await Promise.all([
          fetch(`${API_BASE_URL}/employees`),
          fetch(`${API_BASE_URL}/departments`)
        ]);
        
        const [employeesData, departmentsData] = await Promise.all([
          employeesRes.json(),
          departmentsRes.json()
        ]);
        
        setEmployees(employeesData.data || []);
        // API returns departments array directly, not wrapped in data property
        console.log('Departments API response:', departmentsData);
        setDepartments(Array.isArray(departmentsData) ? departmentsData : []);
      } catch (err) {
        console.error('Error fetching data:', err);
        showToast('Failed to load data', 'error');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [showToast]);

  // CRUD operations
  const handleCreate = async (formData: EmployeeFormData) => {
    setOperationLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/employees`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      
      if (!response.ok) throw new Error('Failed to create employee');
      
      const result = await response.json();
      // POST endpoint returns the employee directly, not wrapped in data
      const newEmployee = result.data || result;

      // Add department name to the new employee
      const department = departments.find(d => d.id === newEmployee.departmentId);
      if (department) {
        newEmployee.departmentName = department.name;
      }

      // Ensure weeklyCapacity is included (API might not return it)
      if (newEmployee.weeklyCapacity === undefined) {
        newEmployee.weeklyCapacity = formData.weeklyCapacity;
      }

      setEmployees(prev => [...prev, newEmployee]);
      showToast('Employee created successfully', 'success');
      setIsFormOpen(false);
      setSelectedEmployee(null);
    } catch (error) {
      showToast('Failed to create employee', 'error');
    } finally {
      setOperationLoading(false);
    }
  };

  const handleUpdate = async (formData: EmployeeFormData) => {
    if (!selectedEmployee) return;
    
    setOperationLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/employees/${selectedEmployee.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      
      if (!response.ok) throw new Error('Failed to update employee');
      
      const result = await response.json();
      // PUT endpoint returns the employee directly, not wrapped in data
      const updatedEmployee = result.data || result;

      // Add department name to the updated employee
      const department = departments.find(d => d.id === updatedEmployee.departmentId);
      if (department) {
        updatedEmployee.departmentName = department.name;
      }

      // Ensure weeklyCapacity is included (API might not return it)
      if (updatedEmployee.weeklyCapacity === undefined) {
        updatedEmployee.weeklyCapacity = formData.weeklyCapacity;
      }

      setEmployees(prev => prev.map(emp => emp.id === selectedEmployee.id ? updatedEmployee : emp));
      showToast('Employee updated successfully', 'success');
      setIsFormOpen(false);
      setSelectedEmployee(null);
    } catch (error) {
      showToast('Failed to update employee', 'error');
    } finally {
      setOperationLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedEmployee) return;
    
    setOperationLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/employees/${selectedEmployee.id}`, {
        method: 'DELETE'
      });
      
      if (!response.ok) throw new Error('Failed to delete employee');
      
      setEmployees(prev => prev.filter(emp => emp.id !== selectedEmployee.id));
      showToast('Employee deleted successfully', 'success');
      setIsDeleteDialogOpen(false);
      setSelectedEmployee(null);
    } catch (error) {
      showToast('Failed to delete employee', 'error');
    } finally {
      setOperationLoading(false);
    }
  };

  // UI handlers
  const handleFormSubmit = async (formData: EmployeeFormData) => {
    selectedEmployee ? await handleUpdate(formData) : await handleCreate(formData);
  };

  const openCreateForm = () => { 
    setSelectedEmployee(null); 
    setIsFormOpen(true); 
  };

  const openEditForm = (employee: Employee) => { 
    setSelectedEmployee(employee); 
    setIsFormOpen(true); 
  };

  const openDeleteDialog = (employee: Employee) => { 
    setSelectedEmployee(employee); 
    setIsDeleteDialogOpen(true); 
  };

  const closeForm = () => { 
    setIsFormOpen(false); 
    setSelectedEmployee(null); 
    setValidationErrors([]); 
  };

  const closeDeleteDialog = () => { 
    setIsDeleteDialogOpen(false); 
    setSelectedEmployee(null); 
  };

  const handleViewEmployee = (employee: Employee) => {
    console.log('View employee:', employee);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8" data-testid="employees-page">
      <ToastNotification toast={toast} onClose={hideToast} />
      
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900" data-testid="employees-title">
            Employees
          </h1>
          <p className="text-gray-600 mt-1">
            Manage your team members and their information
          </p>
        </div>
        
        <Button
          onClick={openCreateForm}
          className="bg-blue-600 hover:bg-blue-700"
          data-testid="add-employee-button"
          disabled={loading}
        >
          Add Employee
        </Button>
      </div>

      {/* Employee List */}
      <EmployeeList
        employees={employees}
        loading={loading}
        onEdit={openEditForm}
        onDelete={openDeleteDialog}
        onView={handleViewEmployee}
      />

      {/* Employee Form Modal */}
      {isFormOpen && (
        <EmployeeFormModal
          employee={selectedEmployee}
          departments={departments}
          onSubmit={handleFormSubmit}
          onCancel={closeForm}
          isSubmitting={operationLoading}
          validationErrors={validationErrors}
          isOpen={isFormOpen}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <EmployeeDeleteDialog
        employee={selectedEmployee}
        isOpen={isDeleteDialogOpen}
        onConfirm={handleDelete}
        onCancel={closeDeleteDialog}
        isDeleting={operationLoading}
      />
    </div>
  );
}

export default EmployeeManagement;
