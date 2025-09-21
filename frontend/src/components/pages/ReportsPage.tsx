import React from 'react';
import { useToastManager, ToastNotification } from '../../hooks/useToastManager';
import CSVExportWithDateRange from '../ui/CSVExportWithDateRange';

/**
 * Enhanced Reports Page with advanced CSV export
 * 
 * Uses extracted hooks to eliminate code duplication:
 * - useToastManager: For consistent toast notifications
 */
export function ReportsPage() {
  const { toast, showError, showSuccess, showInfo, hideToast } = useToastManager();

  const handleExportStart = () => {
    showInfo('Starting CSV export...');
  };

  const handleExportComplete = () => {
    showSuccess('CSV export completed successfully!');
  };

  const handleExportError = (error: string) => {
    showError(`Export failed: ${error}`);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8" data-testid="reports-page">
      <ToastNotification toast={toast} onClose={hideToast} />

      <h1 className="text-2xl font-bold text-gray-900 mb-6" data-testid="reports-title">Reports & Data Export</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Enhanced CSV Export Card */}
        <div className="bg-white rounded-lg shadow p-6" data-testid="csv-export-card">
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-lg font-medium text-gray-900">Resource Allocations</h3>
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
            onExportStart={handleExportStart}
            onExportComplete={handleExportComplete}
            onExportError={handleExportError}
            includeFilters={true}
            testId="reports-export-csv-btn"
          />
        </div>

        {/* Analytics Placeholder */}
        <div className="bg-white rounded-lg shadow p-6" data-testid="analytics-card">
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Utilization Analytics</h3>
            <p className="text-sm text-gray-600 mb-4">
              View team utilization reports and capacity analytics.
            </p>
          </div>
          <button className="w-full px-4 py-2 bg-gray-100 text-gray-500 rounded-md cursor-not-allowed" disabled>
            Coming Soon
          </button>
        </div>

        {/* Reports Placeholder */}
        <div className="bg-white rounded-lg shadow p-6" data-testid="reports-card">
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Custom Reports</h3>
            <p className="text-sm text-gray-600 mb-4">
              Generate custom reports with date filters and project selection.
            </p>
          </div>
          <button className="w-full px-4 py-2 bg-gray-100 text-gray-500 rounded-md cursor-not-allowed" disabled>
            Coming Soon
          </button>
        </div>
      </div>
    </div>
  );
}

export default ReportsPage;