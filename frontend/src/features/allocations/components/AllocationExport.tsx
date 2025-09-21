import React from 'react';
import { CSVExportWithDateRange } from '../../../components/ui/CSVExportWithDateRange';

interface AllocationExportProps {
  onExportStart?: () => void;
  onExportComplete?: () => void;
  onExportError?: (error: string) => void;
}

export const AllocationExport: React.FC<AllocationExportProps> = ({
  onExportStart,
  onExportComplete,
  onExportError
}) => {
  return (
    <div className="bg-white rounded-lg shadow p-6" data-testid="allocation-export-card">
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-lg font-medium text-gray-900">Export Allocations</h3>
          <div className="flex-shrink-0">
            <svg className="h-8 w-8 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
        </div>
        <p className="text-sm text-gray-600 mb-4">
          Export resource allocations with advanced filtering options. Includes employee names, project names, hours per week, and date ranges.
        </p>
      </div>
      
      <CSVExportWithDateRange
        endpoint="http://localhost:3001/api/allocations/export/csv"
        filename="resource-allocations.csv"
        onExportStart={onExportStart}
        onExportComplete={onExportComplete}
        onExportError={onExportError}
        includeFilters={true}
      />
    </div>
  );
};