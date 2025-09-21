import React, { useState } from 'react';
import { Calendar, Download, AlertCircle } from 'lucide-react';

interface CSVExportButtonProps {
  filters?: {
    employeeId?: string;
    projectId?: string;
    startDate?: Date;
    endDate?: Date;
  };
  className?: string;
}

/**
 * CSV Export Button Component
 * Implements PRD requirements for CSV export functionality
 */
export const CSVExportButton: React.FC<CSVExportButtonProps> = ({ 
  filters = {}, 
  className = '' 
}) => {
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDateFilter, setShowDateFilter] = useState(false);
  const [startDate, setStartDate] = useState(filters.startDate?.toISOString().split('T')[0] || '');
  const [endDate, setEndDate] = useState(filters.endDate?.toISOString().split('T')[0] || '');
  const [includeEnhancedFields, setIncludeEnhancedFields] = useState(false);
  const [includeSummary, setIncludeSummary] = useState(false);

  const validateDateRange = (): boolean => {
    if (startDate && endDate && new Date(startDate) > new Date(endDate)) {
      setError('Start date must be before end date');
      return false;
    }
    setError(null);
    return true;
  };

  const handleExport = async () => {
    if (!validateDateRange()) return;

    setIsExporting(true);
    setError(null);

    try {
      // Build query parameters
      const params = new URLSearchParams();
      
      if (filters.employeeId) params.append('employeeId', filters.employeeId);
      if (filters.projectId) params.append('projectId', filters.projectId);
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      if (includeEnhancedFields) params.append('includeEnhancedFields', 'true');
      if (includeSummary) params.append('includeSummary', 'true');

      // Make request to backend API
      const response = await fetch(`/api/allocations/export/csv?${params.toString()}`, {
        method: 'GET',
        headers: {
          'Accept': 'text/csv',
        },
      });

      if (!response.ok) {
        throw new Error(`Export failed: ${response.statusText}`);
      }

      // Get the filename from response headers
      const contentDisposition = response.headers.get('content-disposition');
      let filename = 'resource-allocations.csv';
      
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="?([^"]+)"?/);
        if (filenameMatch) {
          filename = filenameMatch[1];
        }
      }

      // Get the CSV data
      const csvData = await response.text();

      // Create blob and download
      const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      
      // Create download link and trigger download
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      link.setAttribute('aria-label', `Download CSV file: ${filename}`);
      
      // Append to body, click, and remove
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Clean up URL
      window.URL.revokeObjectURL(url);

    } catch (error: any) {
      console.error('CSV export failed:', error);
      setError(error.message || 'Failed to export CSV');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className={`flex flex-col space-y-2 ${className}`}>
      {/* Export Button */}
      <div className="flex items-center space-x-2">
        <button
          data-testid="csv-export-button"
          onClick={showDateFilter ? handleExport : () => setShowDateFilter(true)}
          disabled={isExporting}
          className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          aria-label="Export resource allocations to CSV"
        >
          {isExporting ? (
            <>
              <div 
                data-testid="loading-spinner"
                className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                style={{
                  border: '2px solid transparent',
                  borderTop: '2px solid currentColor',
                  borderRadius: '50%'
                }}
              />
              Exporting...
            </>
          ) : (
            <>
              <Download className="w-4 h-4 mr-2" />
              Export CSV
            </>
          )}
        </button>

        {showDateFilter && (
          <button
            onClick={() => setShowDateFilter(false)}
            className="text-gray-500 hover:text-gray-700 text-sm"
            aria-label="Hide date filter options"
          >
            Cancel
          </button>
        )}
      </div>

      {/* Date Range Filter */}
      {showDateFilter && (
        <div className="p-4 border border-gray-200 rounded-lg bg-gray-50">
          <div className="flex items-center space-x-4 mb-3">
            <Calendar className="w-4 h-4 text-gray-500" />
            <span className="text-sm font-medium text-gray-700">Date Range Filter</span>
          </div>
          
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label htmlFor="start-date" className="block text-sm font-medium text-gray-700 mb-1">
                Start Date
              </label>
              <input
                id="start-date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                aria-label="Start date for export filter"
              />
            </div>
            <div>
              <label htmlFor="end-date" className="block text-sm font-medium text-gray-700 mb-1">
                End Date
              </label>
              <input
                id="end-date"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                aria-label="End date for export filter"
              />
            </div>
          </div>

          {/* Export Options */}
          <div className="space-y-2 mb-4">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={includeEnhancedFields}
                onChange={(e) => setIncludeEnhancedFields(e.target.checked)}
                className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <span className="text-sm text-gray-700">Include enhanced fields (Department, Email, Budget, etc.)</span>
            </label>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={includeSummary}
                onChange={(e) => setIncludeSummary(e.target.checked)}
                className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <span className="text-sm text-gray-700">Include summary statistics</span>
            </label>
          </div>

          <div className="flex justify-end">
            <button
              onClick={handleExport}
              disabled={isExporting}
              className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-green-600 border border-transparent rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
            >
              <Download className="w-4 h-4 mr-2" />
              Download CSV
            </button>
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div 
          data-testid="error-message"
          className="flex items-center p-3 text-sm text-red-700 bg-red-100 border border-red-200 rounded-md"
        >
          <AlertCircle className="w-4 h-4 mr-2" />
          {error}
        </div>
      )}
    </div>
  );
};

export default CSVExportButton;