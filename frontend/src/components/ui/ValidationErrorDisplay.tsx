import React from 'react';
import { AlertCircle, X } from 'lucide-react';

export interface ValidationError {
  field: string;
  message: string;
  code?: string;
}

interface ValidationErrorDisplayProps {
  errors: ValidationError[];
  onDismiss?: () => void;
  className?: string;
  title?: string;
}

export const ValidationErrorDisplay: React.FC<ValidationErrorDisplayProps> = ({
  errors,
  onDismiss,
  className = '',
  title = 'Please correct the following errors:'
}) => {
  if (!errors || errors.length === 0) {
    return null;
  }

  return (
    <div 
      className={`bg-red-50 border border-red-200 rounded-md p-4 ${className}`}
      role="alert"
      data-testid="validation-errors"
    >
      <div className="flex">
        <div className="flex-shrink-0">
          <AlertCircle className="h-5 w-5 text-red-400" />
        </div>
        <div className="ml-3 flex-1">
          <h3 className="text-sm font-medium text-red-800">
            {title}
          </h3>
          <div className="mt-2 text-sm text-red-700">
            <ul role="list" className="list-disc space-y-1 pl-5">
              {errors.map((error, index) => (
                <li key={`${error.field}-${index}`} data-testid={`validation-error-${error.field}`}>
                  <span className="font-medium">{error.field}:</span> {error.message}
                </li>
              ))}
            </ul>
          </div>
        </div>
        {onDismiss && (
          <div className="ml-auto pl-3">
            <div className="-mx-1.5 -my-1.5">
              <button
                type="button"
                onClick={onDismiss}
                className="inline-flex bg-red-50 rounded-md p-1.5 text-red-500 hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-red-50 focus:ring-red-600"
                data-testid="dismiss-validation-errors"
              >
                <span className="sr-only">Dismiss</span>
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Field-specific error display
interface FieldErrorProps {
  error?: string;
  touched?: boolean;
  className?: string;
}

export const FieldError: React.FC<FieldErrorProps> = ({
  error,
  touched = true,
  className = ''
}) => {
  if (!error || !touched) {
    return null;
  }

  return (
    <p 
      className={`text-red-500 text-sm mt-1 flex items-center ${className}`}
      data-testid="field-error"
    >
      <AlertCircle className="h-4 w-4 mr-1 flex-shrink-0" />
      {error}
    </p>
  );
};

// Inline validation display for forms
interface InlineValidationProps {
  isValid?: boolean;
  error?: string;
  showValidation?: boolean;
  className?: string;
}

export const InlineValidation: React.FC<InlineValidationProps> = ({
  isValid,
  error,
  showValidation = true,
  className = ''
}) => {
  if (!showValidation) {
    return null;
  }

  if (isValid) {
    return (
      <div className={`text-green-600 text-sm mt-1 flex items-center ${className}`}>
        <svg className="h-4 w-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
        </svg>
        Valid
      </div>
    );
  }

  if (error) {
    return <FieldError error={error} />;
  }

  return null;
};

// Server validation error parser
export const parseServerErrors = (errorResponse: any): ValidationError[] => {
  if (!errorResponse) return [];

  // Handle express-validator format
  if (Array.isArray(errorResponse.errors)) {
    return errorResponse.errors.map((err: any) => ({
      field: err.path || err.param || 'unknown',
      message: err.msg || err.message || 'Invalid value',
      code: err.type || err.code
    }));
  }

  // Handle custom validation format
  if (typeof errorResponse.details === 'object') {
    return Object.entries(errorResponse.details).map(([field, message]) => ({
      field,
      message: Array.isArray(message) ? message[0] : String(message)
    }));
  }

  // Handle single error message
  if (errorResponse.message) {
    return [{
      field: 'general',
      message: errorResponse.message
    }];
  }

  return [];
};

export default ValidationErrorDisplay;