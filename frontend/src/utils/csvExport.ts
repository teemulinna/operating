import { Employee, Project, Allocation } from '@/services/api';

export function exportEmployeesToCSV(employees: Employee[]): Blob {
  const headers = ['ID', 'Name', 'Email', 'Role', 'Department', 'Skills', 'Capacity', 'Status', 'Start Date'];
  
  const csvContent = [
    headers.join(','),
    ...employees.map(emp => [
      emp.id,
      `"${emp.name}"`,
      `"${emp.email}"`,
      `"${emp.role}"`,
      `"${emp.department}"`,
      `"${emp.skills.join('; ')}"`,
      emp.capacity,
      emp.status,
      emp.startDate
    ].join(','))
  ].join('\n');

  return new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
}

export function exportProjectsToCSV(projects: Project[]): Blob {
  const headers = ['ID', 'Name', 'Description', 'Status', 'Priority', 'Start Date', 'End Date', 'Budget', 'Manager', 'Progress'];
  
  const csvContent = [
    headers.join(','),
    ...projects.map(proj => [
      proj.id,
      `"${proj.name}"`,
      `"${proj.description}"`,
      proj.status,
      proj.priority,
      proj.startDate,
      proj.endDate,
      proj.budget || 0,
      `"${proj.manager || ''}"`,
      proj.progress || 0
    ].join(','))
  ].join('\n');

  return new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
}

export function exportAllocationsToCSV(allocations: Allocation[]): Blob {
  const headers = ['ID', 'Employee ID', 'Project ID', 'Hours', 'Date', 'Week', 'Status', 'Billable Rate', 'Notes'];
  
  const csvContent = [
    headers.join(','),
    ...allocations.map(alloc => [
      alloc.id,
      alloc.employeeId,
      alloc.projectId,
      alloc.hours,
      alloc.date,
      alloc.week || '',
      alloc.status,
      alloc.billableRate || 0,
      `"${alloc.notes || ''}"`
    ].join(','))
  ].join('\n');

  return new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
}

// Add missing exports for AllocationManagement.tsx
export interface CSVExportData {
  employees: any[];
  projects: any[];
  allocations: any[];
}

export function exportAllocationDataToCSV(data: CSVExportData): Blob {
  const headers = ['Employee', 'Project', 'Hours', 'Start Date', 'End Date', 'Status'];
  
  const csvContent = [
    headers.join(','),
    ...data.allocations.map(alloc => [
      `"${alloc.employee?.name || alloc.employeeId}"`,
      `"${alloc.project?.name || alloc.projectId}"`,
      alloc.allocatedHours || alloc.hours || 0,
      alloc.startDate || alloc.date || '',
      alloc.endDate || '',
      alloc.status || 'unknown'
    ].join(','))
  ].join('\n');

  return new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  window.URL.revokeObjectURL(url);
}