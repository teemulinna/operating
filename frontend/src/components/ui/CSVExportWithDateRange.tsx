import React, { useState } from 'react';
import { Download, Calendar, Filter } from 'lucide-react';

interface CSVExportWithDateRangeProps {
  endpoint: string;
  filename?: string;
  onExportStart?: () => void;
  onExportComplete?: () => void;
  onExportError?: (error: string) => void;
  className?: string;
  includeFilters?: boolean;
  testId?: string;
}

export const CSVExportWithDateRange: React.FC<CSVExportWithDateRangeProps> = ({
  endpoint,
  filename = 'export.csv',
  onExportStart,
  onExportComplete,
  onExportError,
  className = '',
  includeFilters = true,
  testId
}) => {
  const [isExporting, setIsExporting] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [employeeId, setEmployeeId] = useState('');
  const [projectId, setProjectId] = useState('');
  const [includeEnhancedFields, setIncludeEnhancedFields] = useState(false);

  const handleExport = async () => {
    setIsExporting(true);
    onExportStart?.();

    try {
      // Build query parameters
      const params = new URLSearchParams();
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      if (employeeId) params.append('employeeId', employeeId);
      if (projectId) params.append('projectId', projectId);
      if (includeEnhancedFields) params.append('includeEnhancedFields', 'true');

      const url = `${endpoint}?${params.toString()}`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'text/csv',
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Export failed' }));
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }

      const csvData = await response.text();
      
      // Create blob and download
      const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url_obj = URL.createObjectURL(blob);
      
      link.setAttribute('href', url_obj);
      
      // Get filename from response headers or use default
      const contentDisposition = response.headers.get('content-disposition');
      let finalFilename = filename;
      if (contentDisposition && contentDisposition.includes('filename=')) {
        finalFilename = contentDisposition.split('filename=')[1].replace(/['"]/g, '');
      }
      
      link.setAttribute('download', finalFilename);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Cleanup
      URL.revokeObjectURL(url_obj);
      
      onExportComplete?.();
    } catch (error: any) {
      console.error('Error exporting CSV:', error);
      onExportError?.(error.message || 'Export failed. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  // Validate date range
  const isDateRangeValid = () => {
    if (!startDate || !endDate) return true;
    return new Date(startDate) <= new Date(endDate);
  };

  return (
    <div className={`space-y-4 ${className}`} data-testid="csv-export-with-filters">
      {/* Export Button */}
      <div className="flex items-center space-x-2">
        <button
          onClick={handleExport}
          disabled={isExporting || !isDateRangeValid()}
          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          data-testid={testId || "reports-export-csv-btn"}
        >
          {isExporting ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
              <span>Exporting...</span>
            </>
          ) : (
            <>
              <Download className="h-4 w-4 mr-2" />
              <span>Export to CSV</span>
            </>
          )}
        </button>

        {includeFilters && (
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="inline-flex items-center px-3 py-2 border border-gray-300 bg-white text-gray-700 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            data-testid="toggle-filters-button"
          >
            <Filter className="h-4 w-4 mr-2" />
            Filters
          </button>
        )}
      </div>

      {/* Date Range Validation Error */}
      {!isDateRangeValid() && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-md" data-testid="date-range-error">
          <p className="text-sm text-red-800">
            End date must be after start date.
          </p>
        </div>
      )}

      {/* Filters Panel */}
      {showFilters && includeFilters && (
        <div className="p-4 bg-gray-50 rounded-md border border-gray-200" data-testid="export-filters">
          <h4 className="text-sm font-medium text-gray-900 mb-3 flex items-center">
            <Calendar className="h-4 w-4 mr-2" />
            Export Filters
          </h4>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Date Range */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Start Date
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                data-testid="export-start-date"
              />
            </div>
            
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                End Date
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                data-testid="export-end-date"
              />
            </div>

            {/* Employee Filter */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Employee ID (Optional)
              </label>
              <input
                type="text"
                value={employeeId}
                onChange={(e) => setEmployeeId(e.target.value)}
                placeholder="Filter by employee"
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                data-testid="export-employee-filter"
              />
            </div>

            {/* Project Filter */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Project ID (Optional)
              </label>
              <input
                type="text"
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
                placeholder="Filter by project"
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                data-testid="export-project-filter"
              />
            </div>

            {/* Enhanced Fields Toggle */}
            <div className="flex items-center">
              <input
                type="checkbox"
                id="include-enhanced"
                checked={includeEnhancedFields}
                onChange={(e) => setIncludeEnhancedFields(e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                data-testid="export-enhanced-fields"
              />
              <label htmlFor="include-enhanced" className="ml-2 text-xs text-gray-700">
                Include enhanced fields
              </label>
            </div>
          </div>

          {/* Clear Filters */}
          <div className="mt-4 pt-3 border-t border-gray-200">
            <button
              onClick={() => {
                setStartDate('');
                setEndDate('');
                setEmployeeId('');
                setProjectId('');
                setIncludeEnhancedFields(false);
              }}
              className="text-sm text-gray-600 hover:text-gray-800"
              data-testid="clear-filters-button"
            >
              Clear all filters
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CSVExportWithDateRange;