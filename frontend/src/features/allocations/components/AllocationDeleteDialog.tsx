import React from 'react';
import { AllocationDeleteDialogProps } from '../types';

/**
 * AllocationDeleteDialog component - handles allocation deletion confirmation
 * Extracted from large AllocationsPage component for better maintainability
 */
export function AllocationDeleteDialog({ allocation, onConfirm, onCancel, isLoading = false }: AllocationDeleteDialogProps) {
  if (!allocation) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" data-testid="delete-confirmation-dialog">
      <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
        <h2 className="text-xl font-bold mb-4">Delete Allocation</h2>
        <p className="text-gray-600 mb-6" data-testid="delete-confirmation-message">
          Are you sure you want to delete this allocation? This action cannot be undone.
        </p>
        <div className="flex justify-end space-x-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
            disabled={isLoading}
            data-testid="cancel-delete-button"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50"
            disabled={isLoading}
            data-testid="confirm-delete-button"
          >
            {isLoading ? 'Deleting...' : 'Delete Allocation'}
          </button>
        </div>
      </div>
    </div>
  );
}