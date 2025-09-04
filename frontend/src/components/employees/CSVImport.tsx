import { useState } from 'react'
import { useDropzone } from 'react-dropzone'
import { Upload, FileText, X, AlertCircle, CheckCircle } from 'lucide-react'
import Papa from 'papaparse'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useCSVImport } from '@/hooks/useEmployees'

interface CSVImportProps {
  onSuccess?: (result: { imported: number; errors: string[] }) => void
  onCancel?: () => void
}

interface CSVRow {
  firstName: string
  lastName: string
  email: string
  phone: string
  department: string
  position: string
  salary: string
  startDate: string
  status?: string
  address?: string
  emergencyContact?: string
  notes?: string
}

export function CSVImport({ onSuccess, onCancel }: CSVImportProps) {
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<CSVRow[]>([])
  const [parseError, setParseError] = useState<string | null>(null)
  const csvImport = useCSVImport()

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: {
      'text/csv': ['.csv'],
      'application/vnd.ms-excel': ['.csv'],
    },
    maxFiles: 1,
    onDrop: (acceptedFiles) => {
      const file = acceptedFiles[0]
      if (file) {
        setFile(file)
        parseCSV(file)
      }
    },
    onDropRejected: () => {
      setParseError('Please upload a valid CSV file')
    },
  })

  const parseCSV = (file: File) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header) => {
        // Normalize header names
        const headerMap: Record<string, string> = {
          'first name': 'firstName',
          'firstname': 'firstName',
          'first_name': 'firstName',
          'last name': 'lastName',
          'lastname': 'lastName',
          'last_name': 'lastName',
          'email address': 'email',
          'email_address': 'email',
          'phone number': 'phone',
          'phonenumber': 'phone',
          'phone_number': 'phone',
          'start date': 'startDate',
          'startdate': 'startDate',
          'start_date': 'startDate',
          'hire date': 'startDate',
          'hiredate': 'startDate',
          'hire_date': 'startDate',
          'emergency contact': 'emergencyContact',
          'emergencycontact': 'emergencyContact',
          'emergency_contact': 'emergencyContact',
        }
        
        const normalized = header.toLowerCase().trim()
        return headerMap[normalized] || normalized
      },
      complete: (results) => {
        setParseError(null)
        if (results.errors.length > 0) {
          setParseError(`CSV parsing error: ${results.errors[0].message}`)
          return
        }
        
        const data = results.data as CSVRow[]
        
        // Validate required fields
        const requiredFields = ['firstName', 'lastName', 'email', 'phone', 'department', 'position', 'salary', 'startDate']
        const missingFields = requiredFields.filter(field => 
          !data.some(row => row[field as keyof CSVRow])
        )
        
        if (missingFields.length > 0) {
          setParseError(`Missing required columns: ${missingFields.join(', ')}`)
          return
        }
        
        // Show preview of first 5 rows
        setPreview(data.slice(0, 5))
      },
      error: (error) => {
        setParseError(`Error reading CSV: ${error.message}`)
      },
    })
  }

  const handleImport = async () => {
    if (!file) return
    
    try {
      const result = await csvImport.mutateAsync(file)
      onSuccess?.(result)
    } catch (error) {
      console.error('Import failed:', error)
    }
  }

  const removeFile = () => {
    setFile(null)
    setPreview([])
    setParseError(null)
  }

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle>Import Employees from CSV</CardTitle>
        <CardDescription>
          Upload a CSV file to import employee data. Make sure your file includes the required columns: 
          firstName, lastName, email, phone, department, position, salary, startDate.
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {!file ? (
          // File Upload Area
          <div
            {...getRootProps()}
            className={`
              border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
              ${isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'}
            `}
          >
            <input {...getInputProps()} />
            <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <div className="text-lg font-medium text-gray-700 mb-2">
              {isDragActive ? 'Drop your CSV file here' : 'Drag & drop your CSV file here'}
            </div>
            <div className="text-sm text-gray-500 mb-4">
              or click to browse files
            </div>
            <Button variant="outline">
              Select CSV File
            </Button>
          </div>
        ) : (
          // File Preview and Import
          <div className="space-y-6">
            {/* File Info */}
            <div className="flex items-center justify-between p-4 border rounded-lg bg-gray-50">
              <div className="flex items-center space-x-3">
                <FileText className="h-8 w-8 text-blue-500" />
                <div>
                  <div className="font-medium text-gray-900">{file.name}</div>
                  <div className="text-sm text-gray-500">
                    {(file.size / 1024).toFixed(1)} KB
                  </div>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={removeFile}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Error Display */}
            {parseError && (
              <div className="flex items-center space-x-2 p-4 border border-red-200 rounded-lg bg-red-50">
                <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
                <div className="text-sm text-red-700">{parseError}</div>
              </div>
            )}

            {/* Success Preview */}
            {preview.length > 0 && !parseError && (
              <div className="space-y-4">
                <div className="flex items-center space-x-2 p-4 border border-green-200 rounded-lg bg-green-50">
                  <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
                  <div className="text-sm text-green-700">
                    CSV file parsed successfully! Preview of first {preview.length} rows:
                  </div>
                </div>

                {/* Data Preview Table */}
                <div className="overflow-x-auto border rounded-lg">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-3 py-2 text-left">Name</th>
                        <th className="px-3 py-2 text-left">Email</th>
                        <th className="px-3 py-2 text-left">Phone</th>
                        <th className="px-3 py-2 text-left">Department</th>
                        <th className="px-3 py-2 text-left">Position</th>
                        <th className="px-3 py-2 text-left">Salary</th>
                        <th className="px-3 py-2 text-left">Start Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {preview.map((row, index) => (
                        <tr key={index} className="border-t">
                          <td className="px-3 py-2">
                            {row.firstName} {row.lastName}
                          </td>
                          <td className="px-3 py-2">{row.email}</td>
                          <td className="px-3 py-2">{row.phone}</td>
                          <td className="px-3 py-2">{row.department}</td>
                          <td className="px-3 py-2">{row.position}</td>
                          <td className="px-3 py-2">
                            ${parseFloat(row.salary).toLocaleString()}
                          </td>
                          <td className="px-3 py-2">
                            {new Date(row.startDate).toLocaleDateString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Import Actions */}
            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                onClick={handleImport}
                disabled={!!parseError || csvImport.isPending}
                className="flex-1"
              >
                {csvImport.isPending ? 'Importing...' : 'Import Employees'}
              </Button>
              <Button
                variant="outline"
                onClick={onCancel}
                className="flex-1"
              >
                Cancel
              </Button>
            </div>

            {/* Import Results */}
            {csvImport.isSuccess && csvImport.data && (
              <div className="p-4 border border-green-200 rounded-lg bg-green-50">
                <div className="text-sm text-green-700">
                  Import completed! {csvImport.data.imported} employees imported successfully.
                  {csvImport.data.errors.length > 0 && (
                    <div className="mt-2">
                      <div className="font-medium">Errors encountered:</div>
                      <ul className="mt-1 list-disc list-inside">
                        {csvImport.data.errors.map((error, index) => (
                          <li key={index}>{error}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            )}

            {csvImport.isError && (
              <div className="p-4 border border-red-200 rounded-lg bg-red-50">
                <div className="text-sm text-red-700">
                  Import failed: {csvImport.error?.message || 'Unknown error occurred'}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Sample CSV Template */}
        <div className="mt-6 p-4 border rounded-lg bg-blue-50">
          <div className="text-sm font-medium text-blue-900 mb-2">
            CSV Format Requirements:
          </div>
          <div className="text-sm text-blue-700 space-y-1">
            <div>• Required columns: firstName, lastName, email, phone, department, position, salary, startDate</div>
            <div>• Optional columns: status, address, emergencyContact, notes</div>
            <div>• Date format: YYYY-MM-DD (e.g., 2024-01-15)</div>
            <div>• Salary should be numeric (e.g., 50000)</div>
            <div>• Status should be 'active' or 'inactive' (defaults to 'active')</div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}