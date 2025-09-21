import React, { useState } from 'react';
import { Button } from './button';
import { Card } from './card';
import { Badge } from './badge';
import { Download, FileText, Settings } from 'lucide-react';

interface CSVExportButtonProps {
  onExport?: (options: CSVExportOptions) => void;
  className?: string;
  disabled?: boolean;
}

interface CSVExportOptions {
  startDate?: string;
  endDate?: string;
  includeEnhancedFields?: boolean;
  includeSummary?: boolean;
  employeeId?: string;
  projectId?: string;
}

export const CSVExportButton: React.FC<CSVExportButtonProps> = ({ 
  onExport, 
  className = '', 
  disabled = false 
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [showOptions, setShowOptions] = useState(false);
  const [exportOptions, setExportOptions] = useState<CSVExportOptions>({
    includeEnhancedFields: false,
    includeSummary: false
  });

  const handleExport = async (options: CSVExportOptions = {}) => {
    setIsLoading(true);
    
    try {
      // Build query parameters
      const params = new URLSearchParams();
      if (options.startDate) params.append('startDate', options.startDate);
      if (options.endDate) params.append('endDate', options.endDate);
      if (options.includeEnhancedFields) params.append('includeEnhancedFields', 'true');
      if (options.includeSummary) params.append('includeSummary', 'true');
      if (options.employeeId) params.append('employeeId', options.employeeId);
      if (options.projectId) params.append('projectId', options.projectId);

      // Call API and trigger download
      const response = await fetch(`/api/allocations/export/csv?${params}`, {
        method: 'GET',
        headers: {
          'Accept': 'text/csv'
        }
      });

      if (!response.ok) {
        throw new Error('Export failed');
      }

      // Get filename from response headers or generate one
      const contentDisposition = response.headers.get('Content-Disposition');
      let filename = 'resource-allocations.csv';
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="(.+)"/);
        if (filenameMatch) {
          filename = filenameMatch[1];
        }
      }

      // Create download
      const csvContent = await response.text();
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      if (onExport) {
        onExport(options);
      }
    } catch (error) {
      console.error('CSV Export Error:', error);
      // Could add toast notification here
      alert('Export failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={`csv-export-container ${className}`}>
      {/* Basic Export Button */}
      <Button
        data-testid="csv-export-button"
        onClick={() => handleExport(exportOptions)}
        disabled={disabled || isLoading}
        className="flex items-center gap-2"
      >
        {isLoading ? (
          <>
            <div data-testid="export-loading" className="animate-spin w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full" />
            Exporting...
          </>
        ) : (
          <>
            <Download className="w-4 h-4" />
            Export CSV
          </>
        )}
      </Button>

      {/* Options Toggle */}
      <Button
        variant="outline"
        size="sm"
        onClick={() => setShowOptions(!showOptions)}
        className="ml-2"
        data-testid="export-options-toggle"
      >
        <Settings className="w-4 h-4" />
      </Button>

      {/* Export Options Panel */}
      {showOptions && (
        <Card className="absolute z-10 mt-2 p-4 w-96 bg-white shadow-lg border">
          <h3 className="font-semibold mb-3 flex items-center gap-2">
            <FileText className="w-4 h-4" />
            Export Options
          </h3>
          
          {/* Date Range */}
          <div className="space-y-2 mb-4">
            <label className="block text-sm font-medium">Date Range</label>
            <div className="flex gap-2">
              <input
                type="date"
                data-testid="export-start-date"
                placeholder="Start Date"
                className="flex-1 px-3 py-2 border rounded-md text-sm"
                onChange={(e) => setExportOptions({...exportOptions, startDate: e.target.value})}
              />
              <input
                type="date"
                data-testid="export-end-date"
                placeholder="End Date"
                className="flex-1 px-3 py-2 border rounded-md text-sm"
                onChange={(e) => setExportOptions({...exportOptions, endDate: e.target.value})}
              />
            </div>
          </div>

          {/* Export Format Options */}
          <div className="space-y-2 mb-4">
            <label className="block text-sm font-medium">Format Options</label>
            
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                data-testid="export-format-enhanced"
                checked={exportOptions.includeEnhancedFields}
                onChange={(e) => setExportOptions({...exportOptions, includeEnhancedFields: e.target.checked})}
                className="rounded"
              />
              <span className="text-sm">Include Enhanced Fields</span>
              <Badge variant="outline" className="text-xs">
                Role, Status, Email, Department
              </Badge>
            </label>

            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                data-testid="export-include-summary"
                checked={exportOptions.includeSummary}
                onChange={(e) => setExportOptions({...exportOptions, includeSummary: e.target.checked})}
                className="rounded"
              />
              <span className="text-sm">Include Summary Section</span>
              <Badge variant="outline" className="text-xs">
                Totals & Stats
              </Badge>
            </label>
          </div>

          {/* Multiple Format Support (Future) */}
          <div className="space-y-2 mb-4">
            <label className="block text-sm font-medium">Export Format</label>
            <div className="flex gap-2">
              <Button 
                data-testid="export-format-csv"
                variant="outline" 
                size="sm" 
                className="flex-1"
                onClick={() => handleExport(exportOptions)}
              >
                CSV
              </Button>
              <Button 
                data-testid="export-format-excel"
                variant="outline" 
                size="sm" 
                className="flex-1"
                disabled
                title="Coming Soon"
              >
                Excel
              </Button>
            </div>
          </div>

          {/* Bulk Export (Future) */}
          <div className="space-y-2">
            <label className="block text-sm font-medium">Bulk Operations</label>
            <Button
              data-testid="bulk-export-button"
              variant="outline"
              size="sm"
              className="w-full"
              disabled
              title="Select allocations to enable bulk export"
            >
              Export Selected (0)
            </Button>
          </div>
        </Card>
      )}

      {/* Error Display */}
      <div data-testid="export-error" className="hidden text-red-500 text-sm mt-2">
        Export failed. Please try again.
      </div>
    </div>
  );
};