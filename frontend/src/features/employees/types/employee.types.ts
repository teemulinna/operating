// Export ValidationError type locally
export interface ValidationError {
  field: string;
  message: string;
}

// Also import from UI if it exists for compatibility
type UIValidationError = { field: string; message: string; };

export interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  position: string;
  departmentId: string;
  departmentName?: string;
  weeklyCapacity: number;
  salary: number;
  skills?: string[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Department {
  id: string;
  name: string;
  description?: string;
  managerId?: string;
}

export interface CreateEmployeeData {
  firstName: string;
  lastName: string;
  email: string;
  position: string;
  departmentId: string;
  weeklyCapacity: number;
  salary: number;
  skills?: string[];
}

export interface UpdateEmployeeData extends Partial<CreateEmployeeData> {
  id: string;
}

export interface EmployeeFormData {
  firstName: string;
  lastName: string;
  email: string;
  position: string;
  departmentId: string;
  weeklyCapacity: number;
  salary: number;
  skills: string[];
}

export interface EmployeeValidationErrors {
  firstName?: string;
  lastName?: string;
  email?: string;
  position?: string;
  departmentId?: string;
  weeklyCapacity?: string;
  salary?: string;
  skills?: string;
}

export interface EmployeeFilters {
  search?: string;
  department?: string;
  position?: string;
  isActive?: boolean;
}

export interface EmployeeListProps {
  employees: Employee[];
  loading: boolean;
  onEdit: (employee: Employee) => void;
  onDelete: (employee: Employee) => void;
  onView: (employee: Employee) => void;
}

export interface EmployeeCardProps {
  employee: Employee;
  onEdit: () => void;
  onDelete: () => void;
  onView: () => void;
  department?: Department;
}

export interface EmployeeFormProps {
  employee?: Employee | null;
  departments: Department[];
  onSubmit: (data: EmployeeFormData) => Promise<void>;
  onCancel: () => void;
  isSubmitting: boolean;
  validationErrors: ValidationError[];
}

export interface EmployeeDeleteDialogProps {
  employee: Employee | null;
  isOpen: boolean;
  onConfirm: () => Promise<void>;
  onCancel: () => void;
  isDeleting: boolean;
}

export interface EmployeeOperationsHook {
  // Hook interface for useEmployeeOperations
}

export interface EmployeeOperationsResult {
  employees: Employee[];
  departments: Department[];
  loading: boolean;
  operationLoading: boolean;
  validationErrors: ValidationError[];
  selectedEmployee: Employee | null;
  isFormOpen: boolean;
  isDeleteDialogOpen: boolean;
  // Operations
  fetchEmployees: () => Promise<void>;
  fetchDepartments: () => Promise<void>;
  handleCreate: (data: EmployeeFormData) => Promise<void>;
  handleUpdate: (data: EmployeeFormData) => Promise<void>;
  handleDelete: () => Promise<void>;
  openCreateForm: () => void;
  openEditForm: (employee: Employee) => void;
  openDeleteDialog: (employee: Employee) => void;
  closeForm: () => void;
  closeDeleteDialog: () => void;
}