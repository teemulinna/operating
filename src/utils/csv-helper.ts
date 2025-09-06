import { Employee, CreateEmployeeRequest } from '../types/employee.types';
import { ApiError } from './api-error';

export function parseCSV(csvContent: string): CreateEmployeeRequest[] {
  const lines = csvContent.trim().split('\n');
  
  if (lines.length < 2) {
    throw new ApiError(400, 'CSV file must contain header and at least one data row');
  }

  const headers = lines[0]!.split(',').map(h => h.trim().replace(/"/g, ''));
  const employees: CreateEmployeeRequest[] = [];

  // Expected headers mapping
  const headerMap: { [key: string]: string } = {
    'firstName': 'firstName',
    'first_name': 'firstName',
    'First Name': 'firstName',
    'lastname': 'lastName',
    'last_name': 'lastName',
    'Last Name': 'lastName',
    'email': 'email',
    'Email': 'email',
    'position': 'position',
    'Position': 'position',
    'role': 'position',
    'Role': 'position',
    'departmentId': 'departmentId',
    'department_id': 'departmentId',
    'Department ID': 'departmentId',
    'salary': 'salary',
    'Salary': 'salary',
    'skills': 'skills',
    'Skills': 'skills'
  };

  // Map headers to our field names
  const mappedHeaders = headers.map(header => headerMap[header] || header.toLowerCase());

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i]!.trim();
    if (!line) continue;

    const values = parseCSVLine(line);
    
    if (values.length !== headers.length) {
      throw new ApiError(400, `Row ${i + 1}: Expected ${headers.length} columns but got ${values.length}`);
    }

    const employee: any = {};

    for (let j = 0; j < mappedHeaders.length; j++) {
      const field = mappedHeaders[j];
      const value = values[j]!.trim().replace(/"/g, '');

      switch (field) {
        case 'firstname':
        case 'lastname':
        case 'email':
        case 'position':
          employee[field] = value;
          break;
        case 'departmentid':
          const deptId = parseInt(value);
          if (isNaN(deptId)) {
            throw new ApiError(400, `Row ${i + 1}: Department ID must be a number`);
          }
          employee[field] = deptId;
          break;
        case 'salary':
          const salary = parseFloat(value);
          if (isNaN(salary)) {
            throw new ApiError(400, `Row ${i + 1}: Salary must be a number`);
          }
          employee[field] = salary;
          break;
        case 'skills':
          if (value) {
            // Handle skills as comma-separated values or JSON array
            try {
              if (value.startsWith('[') && value.endsWith(']')) {
                employee[field] = JSON.parse(value);
              } else {
                employee[field] = value.split(';').map(s => s.trim()).filter(s => s);
              }
            } catch {
              employee[field] = value.split(';').map(s => s.trim()).filter(s => s);
            }
          } else {
            employee[field] = [];
          }
          break;
      }
    }

    // Validate required fields
    const requiredFields = ['firstName', 'lastName', 'email', 'position', 'departmentId', 'salary'];
    for (const field of requiredFields) {
      if (!employee[field] && employee[field] !== 0) {
        throw new ApiError(400, `Row ${i + 1}: Missing required field ${field}`);
      }
    }

    employees.push(employee);
  }

  return employees;
}

export function generateCSV(employees: Employee[]): string {
  if (employees.length === 0) {
    return 'firstName,lastName,email,position,departmentId,salary,skills\n';
  }

  const headers = [
    'firstName',
    'lastName', 
    'email',
    'position',
    'departmentId',
    'departmentName',
    'salary',
    'hireDate',
    'skills',
    'isActive'
  ];

  const csvHeaders = headers.join(',');
  
  const csvRows = employees.map(employee => {
    const row = [
      escapeCSVField(employee.firstName),
      escapeCSVField(employee.lastName),
      escapeCSVField(employee.email),
      escapeCSVField(employee.position),
      employee.departmentId?.toString() || '',
      escapeCSVField((employee as any).departmentName || ''),
      employee.salary?.toString() || '',
      employee.hireDate || '',
      escapeCSVField(employee.skills ? employee.skills.join(';') : ''),
      employee.isActive !== undefined ? employee.isActive.toString() : 'true'
    ];
    return row.join(',');
  });

  return [csvHeaders, ...csvRows].join('\n');
}

function parseCSVLine(line: string): string[] {
  const values: string[] = [];
  let current = '';
  let inQuotes = false;
  let i = 0;

  while (i < line.length) {
    const char = line[i];
    const nextChar = line[i + 1];

    if (char === '"' && !inQuotes) {
      inQuotes = true;
    } else if (char === '"' && inQuotes) {
      if (nextChar === '"') {
        // Escaped quote
        current += '"';
        i++; // Skip next quote
      } else {
        inQuotes = false;
      }
    } else if (char === ',' && !inQuotes) {
      values.push(current);
      current = '';
    } else {
      current += char;
    }
    i++;
  }

  values.push(current);
  return values;
}

function escapeCSVField(value: string | undefined): string {
  if (!value) return '';
  
  const stringValue = value.toString();
  
  // If the value contains comma, quote, or newline, wrap in quotes
  if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
    // Escape existing quotes by doubling them
    const escaped = stringValue.replace(/"/g, '""');
    return `"${escaped}"`;
  }
  
  return stringValue;
}