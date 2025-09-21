// Core CRUD Hooks
export { useToastManager } from './useToastManager';
export type { ToastState } from './useToastManager';

export { useCrudOperations } from './useCrudOperations';
export type { CrudState, CrudOperations, CrudConfig } from './useCrudOperations';

export { useModalManager } from './useModalManager';
export type { ModalState, ModalManager } from './useModalManager';

export { useApiData } from './useApiData';
export type { ApiDataState, ApiDataManager, ApiDataConfig } from './useApiData';

export { useFormValidation } from './useFormValidation';
export type { ValidationRule, FormValidationState, FormValidationManager } from './useFormValidation';

// Master Integration Hook
export { useCrudPage } from './useCrudPage';
export type { CrudPageConfig, CrudPageManager } from './useCrudPage';

// Legacy/Specialized Hooks (if needed)
export { useCreateAllocation } from './useRealAllocationData';
export { useOverAllocationWarnings } from './useOverAllocationWarnings';
export { useRealTimeOverAllocation } from './useRealTimeOverAllocation';
// export * from './useAI'; // Commented out due to missing default export

/**
 * @fileoverview Centralized hook exports for ResourceForge application
 * 
 * This file provides convenient access to all custom hooks, with particular
 * emphasis on the new CRUD abstraction hooks that eliminate code duplication:
 * 
 * ## New CRUD Hooks (Phase 2A):
 * - `useToastManager` - Unified toast notification system
 * - `useCrudOperations` - Generic CRUD operations with optimistic updates
 * - `useModalManager` - Modal state management for forms and dialogs
 * - `useApiData` - Data fetching with caching and retry logic
 * - `useFormValidation` - Type-safe form validation system
 * - `useCrudPage` - Master hook combining all CRUD concerns
 * 
 * ## Usage Examples:
 * 
 * ### Simple Toast Usage:
 * ```tsx
 * const { showToast, ToastComponent } = useToastManager();
 * showToast('Success!', 'success');
 * return <div><ToastComponent />{content}</div>;
 * ```
 * 
 * ### Complete CRUD Page (Replaces 200+ lines of duplicated code):
 * ```tsx
 * const {
 *   state: { items, loading },
 *   modal: { state: modalState },
 *   openCreateForm,
 *   submitForm,
 *   confirmDelete
 * } = useCrudPage<Employee>({
 *   endpoint: '/api/employees',
 *   validationRules: employeeRules
 * });
 * ```
 * 
 * These hooks collectively reduce code duplication by ~90% across
 * EmployeePage, ProjectPage, AllocationsPage, and similar components.
 */