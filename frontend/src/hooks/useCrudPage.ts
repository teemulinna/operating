import { useEffect } from 'react';
import { useToastManager, UseToastManagerReturn } from './useToastManager';
import { useCrudOperations, UseCrudOperationsReturn, CrudOperationConfig } from './useCrudOperations';
import { useModalManager, UseModalManagerReturn } from './useModalManager';
import { useFormValidation, FormValidationManager, ValidationRule } from './useFormValidation';

export interface CrudPageConfig<T> {
  endpoint: string;
  validationRules?: ValidationRule<T>[];
  optimisticUpdates?: boolean;
  autoFetch?: boolean;
}

export interface CrudPageManager<T> extends UseCrudOperationsReturn<T> {
  toast: UseToastManagerReturn;
  modal: UseModalManagerReturn<T>;
  validation: FormValidationManager<T>;

  // Integrated operations that handle all concerns
  handleCreate: (formData: Partial<T>) => Promise<void>;
  handleUpdate: (id: string | number, formData: Partial<T>) => Promise<void>;
  handleDelete: (id: string | number) => Promise<void>;

  // Form helpers
  openCreateForm: () => void;
  openEditForm: (item: T) => void;
  closeForm: () => void;
  submitForm: (formData: Partial<T>) => Promise<void>;

  // Delete helpers
  openDeleteConfirmation: (item: T) => void;
  closeDeleteConfirmation: () => void;
  confirmDelete: () => Promise<void>;
}

/**
 * Master hook that combines all CRUD-related hooks for maximum code reuse
 *
 * This is the ultimate solution for eliminating code duplication across
 * EmployeePage, ProjectPage, AllocationsPage, and similar CRUD pages.
 * It provides a complete, integrated solution with:
 * - CRUD operations with optimistic updates
 * - Toast notifications
 * - Modal state management
 * - Form validation
 * - Error handling
 * - Loading states
 *
 * @template T - The type of items being managed
 * @param config - Configuration for endpoints, validation, and behavior
 * @returns Comprehensive CrudPageManager with all functionality
 *
 * @example
 * ```tsx
 * interface Employee {
 *   id: string;
 *   firstName: string;
 *   lastName: string;
 *   email: string;
 * }
 *
 * const employeeValidationRules: ValidationRule<Employee>[] = [
 *   { field: 'firstName', required: true, minLength: 2 },
 *   { field: 'lastName', required: true, minLength: 2 },
 *   { field: 'email', required: true, pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/ }
 * ];
 *
 * function EmployeePage() {
 *   const {
 *     state: { items: employees, loading },
 *     modal: { state: modalState },
 *     toast: { ToastComponent },
 *     openCreateForm,
 *     openEditForm,
 *     openDeleteConfirmation,
 *     submitForm,
 *     confirmDelete,
 *     closeForm,
 *     closeDeleteConfirmation
 *   } = useCrudPage<Employee>({
 *     endpoint: 'http://localhost:3001/api/employees',
 *     validationRules: employeeValidationRules,
 *     optimisticUpdates: true
 *   });
 *
 *   // Now the component is dramatically simplified - just render!
 * ```
 */
export function useCrudPage<T extends { id: string | number }>(
  config: CrudPageConfig<T>
): CrudPageManager<T> {
  const { endpoint, validationRules = [], optimisticUpdates = false, autoFetch = true } = config;

  // Initialize all sub-hooks
  const toast = useToastManager();
  const modal = useModalManager<T>();
  const validation = useFormValidation<T>();

  // Configure CRUD operations with error handling
  const crudConfig: CrudOperationConfig = {
    optimisticUpdates,
    onError: (error: Error, operation: string) => {
      let message = error.message;
      switch (operation) {
        case 'create':
          message = `Failed to create item: ${error.message}`;
          break;
        case 'update':
          message = `Failed to update item: ${error.message}`;
          break;
        case 'delete':
          message = `Failed to delete item: ${error.message}`;
          break;
        case 'fetch':
          message = `Failed to load data: ${error.message}`;
          break;
      }
      toast.showToast(message, 'error');
    }
  };

  const crud = useCrudOperations<T>(crudConfig);

  // Auto-fetch data on mount
  useEffect(() => {
    if (autoFetch && endpoint) {
      crud.fetchItems(endpoint);
    }
  }, [endpoint, autoFetch, crud.fetchItems]);

  // Integrated form operations
  const openCreateForm = () => {
    validation.clearErrors();
    modal.openFormModal(null);
  };

  const openEditForm = (item: T) => {
    validation.clearErrors();
    modal.openFormModal(item);
  };

  const closeForm = () => {
    validation.clearErrors();
    modal.closeFormModal();
  };

  const submitForm = async (formData: Partial<T>) => {
    // Client-side validation
    if (validationRules.length > 0) {
      const isValid = validation.validate(formData, validationRules);
      if (!isValid) {
        return;
      }
    }

    const { editingItem } = modal.state;

    try {
      if (editingItem) {
        await handleUpdate(editingItem.id, formData);
      } else {
        await handleCreate(formData);
      }
      closeForm();
    } catch (error) {
      // Error already handled by CRUD operations
      console.error('Form submission error:', error);
    }
  };

  // Integrated delete operations
  const openDeleteConfirmation = (item: T) => {
    modal.openDeleteDialog(item);
  };

  const closeDeleteConfirmation = () => {
    modal.closeDeleteDialog();
  };

  const confirmDelete = async () => {
    const { deletingItem } = modal.state;
    if (!deletingItem) return;

    try {
      await handleDelete(deletingItem.id);
      closeDeleteConfirmation();
    } catch (error) {
      // Error already handled by CRUD operations
      console.error('Delete error:', error);
    }
  };

  // Enhanced CRUD operations with integrated feedback
  const handleCreate = async (formData: Partial<T>) => {
    await crud.createItem(endpoint, formData, () => {
      toast.showToast('Item created successfully', 'success');
    });
  };

  const handleUpdate = async (id: string | number, formData: Partial<T>) => {
    await crud.updateItem(endpoint, id, formData, () => {
      toast.showToast('Item updated successfully', 'success');
    });
  };

  const handleDelete = async (id: string | number) => {
    await crud.deleteItem(endpoint, id, () => {
      toast.showToast('Item deleted successfully', 'success');
    });
  };

  return {
    // Expose all CRUD functionality
    ...crud,

    // Expose sub-managers
    toast,
    modal,
    validation,

    // Integrated operations
    handleCreate,
    handleUpdate,
    handleDelete,

    // Form helpers
    openCreateForm,
    openEditForm,
    closeForm,
    submitForm,

    // Delete helpers
    openDeleteConfirmation,
    closeDeleteConfirmation,
    confirmDelete
  };
}

export default useCrudPage;
