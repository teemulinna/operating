import { useState, useEffect, useMemo } from 'react';

export interface Employee {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  departmentId: number;
  position: string;
  skills: string[];
  salary?: number;
  isActive: boolean;
}

export interface Department {
  id: number;
  name: string;
  description?: string;
}

export interface CapacityData {
  id: string;
  employeeId: string;
  date: string;
  availableHours: number;
  allocatedHours: number;
  utilizationRate: number;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  status: 'planning' | 'active' | 'completed' | 'on-hold';
  startDate: string;
  endDate: string;
  requiredSkills: string[];
  priority: 'low' | 'medium' | 'high' | 'critical';
  budget?: number;
  estimatedHours?: number;
  requiredResources?: number;
}

export interface Conflict {
  id: string;
  type: 'overallocation' | 'skill_mismatch' | 'time_overlap' | 'resource_unavailable';
  severity: 'low' | 'medium' | 'high' | 'critical';
  employeeId: string;
  projectIds: string[];
  description: string;
  suggestedResolution: string;
  detectedAt: string;
  resolvedAt?: string;
  status: 'active' | 'resolved' | 'ignored';
}

export interface UseResourceDataReturn {
  employees: Employee[] | null;
  departments: Department[] | null;
  capacityData: CapacityData[] | null;
  projects: Project[] | null;
  conflicts: Conflict[] | null;
  isLoading: boolean;
  error: string | null;
  refreshData: () => void;
}

// Mock data generator functions
const generateMockEmployees = (): Employee[] => {
  const positions = ['Senior Developer', 'Junior Developer', 'Project Manager', 'UI/UX Designer', 'DevOps Engineer', 'Data Analyst', 'Product Manager'];
  const skills = ['React', 'TypeScript', 'Node.js', 'Python', 'AWS', 'Docker', 'Kubernetes', 'GraphQL', 'MongoDB', 'PostgreSQL', 'UI Design', 'Data Analysis'];
  const departments = [1, 2, 3, 4, 5];
  
  return Array.from({ length: 25 }, (_, index) => ({
    id: index + 1,
    firstName: `Employee${index + 1}`,
    lastName: `Last${index + 1}`,
    email: `employee${index + 1}@company.com`,
    departmentId: departments[Math.floor(Math.random() * departments.length)],
    position: positions[Math.floor(Math.random() * positions.length)],
    skills: skills.slice(0, Math.floor(Math.random() * 5) + 2), // 2-6 skills per employee
    salary: 60000 + Math.floor(Math.random() * 80000),
    isActive: true
  }));
};

const generateMockDepartments = (): Department[] => [
  { id: 1, name: 'Engineering', description: 'Software development and technical operations' },
  { id: 2, name: 'Design', description: 'User experience and visual design' },
  { id: 3, name: 'Product', description: 'Product management and strategy' },
  { id: 4, name: 'Data', description: 'Data analysis and business intelligence' },
  { id: 5, name: 'DevOps', description: 'Infrastructure and deployment operations' },
  { id: 6, name: 'Marketing', description: 'Marketing and customer engagement' },
  { id: 7, name: 'Sales', description: 'Sales and business development' },
  { id: 8, name: 'HR', description: 'Human resources and people operations' },
  { id: 9, name: 'Finance', description: 'Financial planning and accounting' },
  { id: 10, name: 'Operations', description: 'Business operations and support' }
];

const generateMockCapacityData = (employees: Employee[]): CapacityData[] => {
  const data: CapacityData[] = [];
  const today = new Date();
  
  employees.forEach(emp => {
    // Generate capacity data for the last 14 days
    for (let i = 0; i < 14; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      
      const availableHours = 40; // Standard work week
      const allocatedHours = Math.floor(Math.random() * 45) + 5; // 5-50 hours
      const utilizationRate = allocatedHours / availableHours;
      
      data.push({
        id: `${emp.id}-${date.toISOString().split('T')[0]}`,
        employeeId: emp.id.toString(),
        date: date.toISOString(),
        availableHours,
        allocatedHours: Math.min(allocatedHours, availableHours),
        utilizationRate: Math.min(utilizationRate, 1.2) // Allow over-allocation up to 120%
      });
    }
  });
  
  return data;
};

const generateMockProjects = (): Project[] => {
  const projectNames = [
    'Customer Portal Redesign',
    'Mobile App Development',
    'API Gateway Implementation',
    'Data Analytics Platform',
    'E-commerce Integration',
    'Security Audit',
    'Performance Optimization',
    'Cloud Migration',
    'Machine Learning Pipeline',
    'Content Management System'
  ];
  
  const skills = ['React', 'TypeScript', 'Node.js', 'Python', 'AWS', 'Docker', 'Kubernetes', 'GraphQL', 'MongoDB', 'PostgreSQL'];
  const statuses: Project['status'][] = ['planning', 'active', 'completed', 'on-hold'];
  const priorities: Project['priority'][] = ['low', 'medium', 'high', 'critical'];
  
  return projectNames.map((name, index) => {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - Math.floor(Math.random() * 60));
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + Math.floor(Math.random() * 120) + 30);
    
    return {
      id: `project-${index + 1}`,
      name,
      description: `Description for ${name}`,
      status: statuses[Math.floor(Math.random() * statuses.length)],
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      requiredSkills: skills.slice(0, Math.floor(Math.random() * 4) + 2),
      priority: priorities[Math.floor(Math.random() * priorities.length)],
      budget: Math.floor(Math.random() * 500000) + 50000,
      estimatedHours: Math.floor(Math.random() * 2000) + 200,
      requiredResources: Math.floor(Math.random() * 5) + 1
    };
  });
};

const generateMockConflicts = (employees: Employee[], projects: Project[]): Conflict[] => {
  const conflictTypes: Conflict['type'][] = ['overallocation', 'skill_mismatch', 'time_overlap', 'resource_unavailable'];
  const severities: Conflict['severity'][] = ['low', 'medium', 'high', 'critical'];
  
  return Array.from({ length: Math.floor(Math.random() * 8) + 2 }, (_, index) => {
    const employee = employees[Math.floor(Math.random() * employees.length)];
    const affectedProjects = projects.slice(0, Math.floor(Math.random() * 3) + 1);
    const type = conflictTypes[Math.floor(Math.random() * conflictTypes.length)];
    
    const descriptions = {
      overallocation: `${employee.firstName} ${employee.lastName} is allocated to more work than available capacity`,
      skill_mismatch: `Required skills for project don't match ${employee.firstName} ${employee.lastName}'s expertise`,
      time_overlap: `Conflicting time commitments for ${employee.firstName} ${employee.lastName}`,
      resource_unavailable: `${employee.firstName} ${employee.lastName} is not available during required project timeframe`
    };
    
    const resolutions = {
      overallocation: 'Redistribute workload to other team members or extend timeline',
      skill_mismatch: 'Provide training or reassign to employee with matching skills',
      time_overlap: 'Reschedule conflicting commitments or reallocate resources',
      resource_unavailable: 'Find alternative resource or adjust project timeline'
    };
    
    return {
      id: `conflict-${index + 1}`,
      type,
      severity: severities[Math.floor(Math.random() * severities.length)],
      employeeId: employee.id.toString(),
      projectIds: affectedProjects.map(p => p.id),
      description: descriptions[type],
      suggestedResolution: resolutions[type],
      detectedAt: new Date(Date.now() - Math.floor(Math.random() * 24 * 60 * 60 * 1000)).toISOString(),
      status: Math.random() > 0.7 ? 'resolved' : 'active'
    };
  });
};

export const useResourceData = (refreshKey: number = 0): UseResourceDataReturn => {
  const [employees, setEmployees] = useState<Employee[] | null>(null);
  const [departments, setDepartments] = useState<Department[] | null>(null);
  const [capacityData, setCapacityData] = useState<CapacityData[] | null>(null);
  const [projects, setProjects] = useState<Project[] | null>(null);
  const [conflicts, setConflicts] = useState<Conflict[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Check if we can load from real APIs first
      try {
        // Try to load employees from real API
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
        console.log('Fetching employees from:', `${apiUrl}/employees?limit=100`);
        const employeeResponse = await fetch(`${apiUrl}/employees?limit=100`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include'
        });
        if (employeeResponse.ok) {
          const employeeData = await employeeResponse.json();
          const realEmployees = employeeData.data || employeeData;
          console.log('Successfully loaded employees:', realEmployees);
          if (Array.isArray(realEmployees) && realEmployees.length > 0) {
            // Ensure employees have the correct structure for the dashboard
            const formattedEmployees = realEmployees.map(emp => ({
              ...emp,
              id: emp.id || Math.random().toString(36).substr(2, 9),
              skills: emp.skills || []
            }));
            setEmployees(formattedEmployees);
          } else {
            throw new Error('No employee data found');
          }
        } else {
          throw new Error(`Failed to load employees: ${employeeResponse.status}`);
        }

        // Try to load departments
        try {
          const deptResponse = await fetch(`${apiUrl}/departments`, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
            },
            credentials: 'include'
          });
          if (deptResponse.ok) {
            const deptData = await deptResponse.json();
            setDepartments(deptData.data || deptData || generateMockDepartments());
          } else {
            setDepartments(generateMockDepartments());
          }
        } catch {
          setDepartments(generateMockDepartments());
        }

        // Try to load capacity data
        try {
          const capacityResponse = await fetch(`${apiUrl}/capacity`, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
            },
            credentials: 'include'
          });
          if (capacityResponse.ok) {
            const capacityDataResponse = await capacityResponse.json();
            const realCapacityData = capacityDataResponse.data || capacityDataResponse;
            if (Array.isArray(realCapacityData) && realCapacityData.length > 0) {
              setCapacityData(realCapacityData);
            } else {
              // Generate mock data based on real employees
              setCapacityData(generateMockCapacityData(realEmployees));
            }
          } else {
            setCapacityData(generateMockCapacityData(realEmployees));
          }
        } catch {
          setCapacityData(generateMockCapacityData(realEmployees));
        }

        // Generate mock projects and conflicts for now
        const mockProjects = generateMockProjects();
        setProjects(mockProjects);
        setConflicts(generateMockConflicts(realEmployees, mockProjects));

      } catch (apiError) {
        console.error('API loading failed, using mock data:', apiError);
        console.log('Failed to load from API, error details:', apiError);
        
        // Fall back to mock data
        const mockEmployees = generateMockEmployees();
        const mockDepartments = generateMockDepartments();
        const mockCapacityData = generateMockCapacityData(mockEmployees);
        const mockProjects = generateMockProjects();
        const mockConflicts = generateMockConflicts(mockEmployees, mockProjects);

        setEmployees(mockEmployees);
        setDepartments(mockDepartments);
        setCapacityData(mockCapacityData);
        setProjects(mockProjects);
        setConflicts(mockConflicts);
      }

    } catch (error) {
      console.error('Error loading resource data:', error);
      setError(error instanceof Error ? error.message : 'Failed to load resource data');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [refreshKey]);

  const refreshData = () => {
    loadData();
  };

  // Memoize the return value to prevent unnecessary re-renders
  return useMemo(() => ({
    employees,
    departments,
    capacityData,
    projects,
    conflicts,
    isLoading,
    error,
    refreshData
  }), [employees, departments, capacityData, projects, conflicts, isLoading, error]);
};