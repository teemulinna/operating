import { useState, useCallback } from 'react';
import { ValidationError } from '../components/ui/ValidationErrorDisplay';

export type ValidationRule<T> = {
  field: keyof T;
  required?: boolean;
  pattern?: RegExp;
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  custom?: (value: any, formData: Partial<T>) => string | null;
  message?: string;
};

export interface FormValidationState {
  errors: ValidationError[];
  isValid: boolean;
  touchedFields: Set<string>;
}

export interface FormValidationManager<T> {
  state: FormValidationState;
  validate: (data: Partial<T>, rules: ValidationRule<T>[]) => boolean;
  validateField: (field: keyof T, value: any, rules: ValidationRule<T>[], formData?: Partial<T>) => ValidationError | null;
  setErrors: (errors: ValidationError[]) => void;
  clearErrors: () => void;
  clearFieldError: (field: keyof T) => void;
  touchField: (field: keyof T) => void;
  isFieldTouched: (field: keyof T) => boolean;
  getFieldError: (field: keyof T) => ValidationError | undefined;
}

/**
 * Custom hook for comprehensive form validation with type safety
 * 
 * Provides a flexible validation system that can handle complex validation rules,
 * field-level validation, and integration with server-side validation errors.
 * Eliminates validation code duplication across forms.
 * 
 * @template T - The type of the form data being validated
 * @returns FormValidationManager with validation state and functions
 * 
 * @example
 * ```tsx
 * interface EmployeeFormData {
 *   firstName: string;
 *   lastName: string;
 *   email: string;
 *   salary: number;
 * }
 * 
 * const validation = useFormValidation<EmployeeFormData>();
 * 
 * const rules: ValidationRule<EmployeeFormData>[] = [
 *   { field: 'firstName', required: true, minLength: 2, message: 'First name must be at least 2 characters' },
 *   { field: 'email', required: true, pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: 'Valid email required' },
 *   { field: 'salary', min: 0, custom: (value) => value < 1000 ? 'Salary seems low' : null }
 * ];
 * 
 * const handleSubmit = (formData: EmployeeFormData) => {
 *   if (validation.validate(formData, rules)) {
 *     // Form is valid, proceed with submission
 *   }
 * };
 * ```
 */
export function useFormValidation<T>(): FormValidationManager<T> {
  const [state, setState] = useState<FormValidationState>({
    errors: [],
    isValid: true,
    touchedFields: new Set()
  });

  const setErrors = useCallback((errors: ValidationError[]) => {
    setState(prev => ({
      ...prev,
      errors,
      isValid: errors.length === 0
    }));
  }, []);

  const clearErrors = useCallback(() => {
    setState(prev => ({
      ...prev,
      errors: [],
      isValid: true
    }));
  }, []);

  const clearFieldError = useCallback((field: keyof T) => {
    setState(prev => ({
      ...prev,
      errors: prev.errors.filter(error => error.field !== field),
      isValid: prev.errors.filter(error => error.field !== field).length === 0
    }));
  }, []);

  const touchField = useCallback((field: keyof T) => {
    setState(prev => ({
      ...prev,
      touchedFields: new Set([...prev.touchedFields, field as string])
    }));
  }, []);

  const isFieldTouched = useCallback((field: keyof T): boolean => {
    return state.touchedFields.has(field as string);
  }, [state.touchedFields]);

  const getFieldError = useCallback((field: keyof T): ValidationError | undefined => {
    return state.errors.find(error => error.field === field);
  }, [state.errors]);

  const validateField = useCallback((
    field: keyof T,
    value: any,
    rules: ValidationRule<T>[],
    formData?: Partial<T>
  ): ValidationError | null => {
    const rule = rules.find(r => r.field === field);
    if (!rule) return null;

    const fieldName = field as string;

    // Required validation
    if (rule.required && (!value || (typeof value === 'string' && value.trim() === ''))) {
      return {
        field: fieldName,
        message: rule.message || `${fieldName} is required`
      };
    }

    // Skip other validations if field is empty and not required
    if (!value && !rule.required) return null;

    // String validations
    if (typeof value === 'string') {
      // Pattern validation
      if (rule.pattern && !rule.pattern.test(value)) {
        return {
          field: fieldName,
          message: rule.message || `${fieldName} format is invalid`
        };
      }

      // Length validations
      if (rule.minLength && value.length < rule.minLength) {
        return {
          field: fieldName,
          message: rule.message || `${fieldName} must be at least ${rule.minLength} characters`
        };
      }

      if (rule.maxLength && value.length > rule.maxLength) {
        return {
          field: fieldName,
          message: rule.message || `${fieldName} must not exceed ${rule.maxLength} characters`
        };
      }
    }

    // Number validations
    if (typeof value === 'number' || !isNaN(Number(value))) {
      const numValue = Number(value);

      if (rule.min !== undefined && numValue < rule.min) {
        return {
          field: fieldName,
          message: rule.message || `${fieldName} must be at least ${rule.min}`
        };
      }

      if (rule.max !== undefined && numValue > rule.max) {
        return {
          field: fieldName,
          message: rule.message || `${fieldName} must not exceed ${rule.max}`
        };
      }
    }

    // Custom validation
    if (rule.custom) {
      const customError = rule.custom(value, formData || {});
      if (customError) {
        return {
          field: fieldName,
          message: customError
        };
      }
    }

    return null;
  }, []);

  const validate = useCallback((data: Partial<T>, rules: ValidationRule<T>[]): boolean => {
    const errors: ValidationError[] = [];

    rules.forEach(rule => {
      const value = data[rule.field];
      const error = validateField(rule.field, value, rules, data);
      if (error) {
        errors.push(error);
      }
    });

    setErrors(errors);
    return errors.length === 0;
  }, [validateField, setErrors]);

  return {
    state,
    validate,
    validateField,
    setErrors,
    clearErrors,
    clearFieldError,
    touchField,
    isFieldTouched,
    getFieldError
  };
}

export default useFormValidation;