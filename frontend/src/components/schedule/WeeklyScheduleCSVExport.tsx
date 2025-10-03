import { Button } from '@/components/ui/button';
import { format, eachWeekOfInterval, startOfWeek, endOfWeek, addWeeks } from 'date-fns';

interface WeeklyAllocation {
  employeeId: string;
  employeeName: string;
  projectId: string;
  projectName: string;
  weekStart: Date;
  hours: number;
}

interface WeeklyScheduleCSVExportProps {
  employees: Array<{ id: string; name: string; capacity: number }>;
  projects: Array<{ id: string; name: string }>;
  allocations: WeeklyAllocation[];
  currentDate: Date;
  className?: string;
}

function exportWeeklyScheduleToCSV(data: {
  employees: Array<{ id: string; name: string; capacity: number }>;
  projects: Array<{ id: string; name: string }>;
  allocations: WeeklyAllocation[];
  currentDate: Date;
}): Blob {
  const { employees, projects, allocations, currentDate } = data;
  
  // Generate 8 weeks starting from current date
  const weeks = eachWeekOfInterval({
    start: startOfWeek(currentDate),
    end: endOfWeek(addWeeks(currentDate, 7))
  });

  // Create lookup maps
  const projectMap = new Map(projects.map(proj => [proj.id, proj]));
  
  // Create CSV header with week columns
  const headers = [
    'Employee Name',
    'Employee Capacity (hrs/week)',
    ...weeks.map(week => `Week ${format(week, 'MMM dd')} - ${format(endOfWeek(week), 'MMM dd, yyyy')}`)
  ];
  
  // Generate rows for each employee
  const rows = employees.map(employee => {
    const row = [
      employee.name,
      employee.capacity.toString()
    ];
    
    // Add weekly allocation data for each week
    weeks.forEach(week => {
      const weekAllocations = allocations.filter(alloc => 
        alloc.employeeId === employee.id &&
        format(alloc.weekStart, 'yyyy-MM-dd') === format(week, 'yyyy-MM-dd')
      );
      
      if (weekAllocations.length === 0) {
        row.push('0');
      } else {
        // Combine multiple projects for the week
        const projectDetails = weekAllocations.map(alloc => {
          const project = projectMap.get(alloc.projectId);
          return `${project?.name || `Project ${alloc.projectId}`}: ${alloc.hours}h`;
        });
        const totalHours = weekAllocations.reduce((sum, alloc) => sum + alloc.hours, 0);
        row.push(`${totalHours}h (${projectDetails.join('; ')})`);
      }
    });
    
    return row;
  });
  
  // Combine headers and rows
  const csvContent = [headers, ...rows]
    .map(row => row.map(field => `"${field.replace(/"/g, '""')}"`).join(','))
    .join('\n');
  
  // Create blob with UTF-8 BOM for better Excel compatibility
  const BOM = '\uFEFF';
  return new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
}

function downloadBlob(blob: Blob, filename: string): void {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.style.display = 'none';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  // Clean up the URL object
  window.URL.revokeObjectURL(url);
}

export function WeeklyScheduleCSVExport({ 
  employees, 
  projects, 
  allocations, 
  currentDate,
  className = ""
}: WeeklyScheduleCSVExportProps) {
  const handleExport = () => {
    const blob = exportWeeklyScheduleToCSV({
      employees,
      projects,
      allocations,
      currentDate
    });
    downloadBlob(blob, `weekly-schedule-${format(currentDate, 'yyyy-MM-dd')}.csv`);
  };

  return (
    <Button 
      variant="outline" 
      size="sm" 
      onClick={handleExport}
      className={className}
    >
      <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path 
          strokeLinecap="round" 
          strokeLinejoin="round" 
          strokeWidth={2} 
          d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" 
        />
      </svg>
      Export Weekly Schedule
    </Button>
  );
}