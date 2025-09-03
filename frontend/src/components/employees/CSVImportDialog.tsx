import React, { useState, useRef } from 'react';
import { Upload, AlertCircle, CheckCircle, Download } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useEmployeeCSV } from '@/hooks/useEmployees';
import { useQueryClient } from '@tanstack/react-query';
import { employeeKeys } from '@/hooks/useEmployees';

interface CSVImportDialogProps {
  open: boolean;
  onClose: () => void;
}

export function CSVImportDialog({ open, onClose }: CSVImportDialogProps) {
  const [dragActive, setDragActive] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
  const [uploadResult, setUploadResult] = useState<{ imported: number; errors: string[] } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  const { importCSV } = useEmployeeCSV();

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      handleFile(files[0]);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFile(files[0]);
    }
  };

  const handleFile = async (file: File) => {
    // Validate file type
    if (!file.name.toLowerCase().endsWith('.csv')) {
      setUploadStatus('error');
      setUploadResult({ imported: 0, errors: ['Please select a CSV file.'] });
      return;
    }

    // Validate file size (10MB limit)
    if (file.size > 10 * 1024 * 1024) {
      setUploadStatus('error');
      setUploadResult({ imported: 0, errors: ['File size must be less than 10MB.'] });
      return;
    }

    setUploadStatus('uploading');
    
    try {
      const result = await importCSV.mutateAsync(file);
      setUploadResult(result);
      setUploadStatus('success');
      
      // Invalidate queries to refresh the employee list
      queryClient.invalidateQueries({ queryKey: employeeKeys.lists() });
      queryClient.invalidateQueries({ queryKey: employeeKeys.departments() });
      queryClient.invalidateQueries({ queryKey: employeeKeys.positions() });
      
    } catch (error) {
      console.error('Import failed:', error);
      setUploadStatus('error');
      setUploadResult({ 
        imported: 0, 
        errors: [error instanceof Error ? error.message : 'Import failed. Please try again.'] 
      });
    }
  };

  const handleClose = () => {
    setUploadStatus('idle');
    setUploadResult(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    onClose();
  };

  const downloadTemplate = () => {
    const csvContent = `firstName,lastName,email,phone,department,position,salary,startDate,status,address,emergencyContact,notes
John,Doe,john.doe@example.com,555-0123,Engineering,Software Engineer,75000,2024-01-15,active,"123 Main St, City, State","Jane Doe - 555-0124",Great team player
Jane,Smith,jane.smith@example.com,555-0456,Marketing,Marketing Manager,68000,2023-06-01,active,"456 Oak Ave, City, State","John Smith - 555-0457",Excellent communication skills`;

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'employee-template.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Import Employees from CSV</DialogTitle>
          <DialogDescription>
            Upload a CSV file to import multiple employees at once.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {uploadStatus === 'idle' && (
            <>
              {/* Download Template */}
              <div className="bg-blue-50 p-4 rounded-lg border">
                <div className="flex items-start gap-3">
                  <Download className="h-5 w-5 text-blue-600 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-blue-900">Need a template?</h4>
                    <p className="text-sm text-blue-700 mt-1">
                      Download our CSV template to ensure proper formatting.
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={downloadTemplate}
                      className="mt-2"
                    >
                      Download Template
                    </Button>
                  </div>
                </div>
              </div>

              {/* File Upload Area */}
              <div
                className={`relative border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                  dragActive
                    ? 'border-primary bg-primary/5'
                    : 'border-gray-300 hover:border-gray-400'
                }`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  onChange={handleFileInput}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <Upload className="mx-auto h-12 w-12 text-gray-400" />
                <div className="mt-4">
                  <p className="text-sm font-medium text-gray-900">
                    Click to upload or drag and drop
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    CSV files up to 10MB
                  </p>
                </div>
              </div>

              {/* Format Requirements */}
              <div className="text-xs text-gray-500 space-y-1">
                <p className="font-medium">CSV Format Requirements:</p>
                <ul className="list-disc list-inside space-y-0.5 ml-2">
                  <li>First row must contain column headers</li>
                  <li>Required fields: firstName, lastName, email, phone, department, position, salary, startDate</li>
                  <li>Date format: YYYY-MM-DD</li>
                  <li>Status values: 'active' or 'inactive'</li>
                </ul>
              </div>
            </>
          )}

          {uploadStatus === 'uploading' && (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="mt-4 text-sm text-gray-600">Importing employees...</p>
            </div>
          )}

          {uploadStatus === 'success' && uploadResult && (
            <div className="space-y-4">
              <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                <div className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-green-900">Import Successful!</h4>
                    <p className="text-sm text-green-700 mt-1">
                      Successfully imported {uploadResult.imported} employee{uploadResult.imported !== 1 ? 's' : ''}.
                    </p>
                  </div>
                </div>
              </div>

              {uploadResult.errors.length > 0 && (
                <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
                    <div>
                      <h4 className="font-medium text-yellow-900">Some Issues Found</h4>
                      <div className="text-sm text-yellow-700 mt-1">
                        <p>The following rows had errors and were skipped:</p>
                        <ul className="list-disc list-inside mt-2 space-y-1">
                          {uploadResult.errors.map((error, index) => (
                            <li key={index}>{error}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {uploadStatus === 'error' && uploadResult && (
            <div className="bg-red-50 p-4 rounded-lg border border-red-200">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
                <div>
                  <h4 className="font-medium text-red-900">Import Failed</h4>
                  <div className="text-sm text-red-700 mt-1">
                    {uploadResult.errors.map((error, index) => (
                      <p key={index}>{error}</p>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            {uploadStatus === 'success' ? 'Close' : 'Cancel'}
          </Button>
          {(uploadStatus === 'error' || uploadStatus === 'success') && (
            <Button
              onClick={() => {
                setUploadStatus('idle');
                setUploadResult(null);
                if (fileInputRef.current) {
                  fileInputRef.current.value = '';
                }
              }}
            >
              Import Another File
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}