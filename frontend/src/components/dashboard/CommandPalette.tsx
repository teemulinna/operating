import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator } from 'cmdk';
import { Dialog, DialogContent } from '../ui/dialog';
import { Badge } from '../ui/badge';
import { 
  MagnifyingGlassIcon,
  UserIcon,
  BriefcaseIcon,
  ChartBarIcon,
  DocumentArrowDownIcon,
  PlusIcon,
  ClockIcon
} from '@heroicons/react/24/outline';
import { Employee, Project } from '../../hooks/useResourceData';

interface CommandPaletteProps {
  isOpen: boolean;
  onOpen: () => void;
  onClose: () => void;
  employees?: Employee[];
  projects?: Project[];
  onEmployeeSelect?: (employee: Employee) => void;
  onProjectSelect?: (project: Project) => void;
  onActionSelect?: (action: string) => void;
  maxResults?: number;
}

interface SearchResult {
  type: 'employee' | 'project' | 'action';
  id: string;
  title: string;
  subtitle?: string;
  data: any;
  score: number;
}

const quickActions = [
  {
    id: 'create-assignment',
    title: 'Create New Assignment',
    subtitle: 'Assign employee to project',
    icon: PlusIcon,
  },
  {
    id: 'view-analytics',
    title: 'View Resource Analytics',
    subtitle: 'Open resource utilization dashboard',
    icon: ChartBarIcon,
  },
  {
    id: 'export-data',
    title: 'Export Data',
    subtitle: 'Download resource allocation report',
    icon: DocumentArrowDownIcon,
  },
  {
    id: 'schedule-meeting',
    title: 'Schedule Team Meeting',
    subtitle: 'Book resource planning session',
    icon: ClockIcon,
  },
];

// Simple fuzzy search implementation
const fuzzyScore = (text: string, query: string): number => {
  const textLower = text.toLowerCase();
  const queryLower = query.toLowerCase();
  
  if (textLower.includes(queryLower)) {
    const exactMatch = textLower.indexOf(queryLower);
    return exactMatch === 0 ? 1000 : 500; // Exact match gets higher score
  }
  
  let score = 0;
  let queryIndex = 0;
  
  for (let i = 0; i < textLower.length && queryIndex < queryLower.length; i++) {
    if (textLower[i] === queryLower[queryIndex]) {
      score += 1;
      queryIndex++;
    }
  }
  
  return queryIndex === queryLower.length ? score : 0;
};

const searchEmployees = (employees: Employee[], query: string): SearchResult[] => {
  if (!query || query.length < 1) return [];
  
  return employees
    .map(employee => {
      const nameScore = fuzzyScore(`${employee.firstName} ${employee.lastName}`, query);
      const positionScore = fuzzyScore(employee.position, query) * 0.8;
      const skillsScore = employee.skills?.some(skill => 
        fuzzyScore(skill, query) > 0
      ) ? 50 : 0;
      const emailScore = fuzzyScore(employee.email, query) * 0.6;
      
      const totalScore = nameScore + positionScore + skillsScore + emailScore;
      
      if (totalScore === 0) return null;
      
      return {
        type: 'employee' as const,
        id: employee.id.toString(),
        title: `${employee.firstName} ${employee.lastName}`,
        subtitle: employee.position,
        data: employee,
        score: totalScore,
      };
    })
    .filter(Boolean) as SearchResult[];
};

const searchProjects = (projects: Project[], query: string): SearchResult[] => {
  if (!query || query.length < 1) return [];
  
  return projects
    .map(project => {
      const nameScore = fuzzyScore(project.name, query);
      const descriptionScore = fuzzyScore(project.description, query) * 0.7;
      const skillsScore = project.requiredSkills?.some(skill => 
        fuzzyScore(skill, query) > 0
      ) ? 30 : 0;
      
      const totalScore = nameScore + descriptionScore + skillsScore;
      
      if (totalScore === 0) return null;
      
      return {
        type: 'project' as const,
        id: project.id,
        title: project.name,
        subtitle: project.description,
        data: project,
        score: totalScore,
      };
    })
    .filter(Boolean) as SearchResult[];
};

const searchActions = (query: string): SearchResult[] => {
  if (!query || query.length < 1) return quickActions.map((action, index) => ({
    type: 'action' as const,
    id: action.id,
    title: action.title,
    subtitle: action.subtitle,
    data: action,
    score: 100 - index, // Default ordering
  }));
  
  return quickActions
    .map(action => {
      const titleScore = fuzzyScore(action.title, query);
      const subtitleScore = fuzzyScore(action.subtitle, query) * 0.5;
      
      const totalScore = titleScore + subtitleScore;
      
      if (totalScore === 0) return null;
      
      return {
        type: 'action' as const,
        id: action.id,
        title: action.title,
        subtitle: action.subtitle,
        data: action,
        score: totalScore,
      };
    })
    .filter(Boolean) as SearchResult[];
};

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onOpen,
  onClose,
  employees = [],
  projects = [],
  onEmployeeSelect,
  onProjectSelect,
  onActionSelect,
  maxResults = 50,
}) => {
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [realEmployees, setRealEmployees] = useState<Employee[]>(employees);
  const [realProjects, setRealProjects] = useState<Project[]>(projects);

  // Debounced search
  const [debouncedQuery, setDebouncedQuery] = useState('');
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
    }, 300);
    
    return () => clearTimeout(timer);
  }, [query]);

  // Fetch real data from API
  const fetchData = useCallback(async () => {
    if (!isOpen || debouncedQuery.length < 1) return;
    
    try {
      setIsLoading(true);
      setError(null);
      
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
      
      // Fetch employees and projects in parallel
      const [employeeResponse, projectResponse] = await Promise.all([
        fetch(`${apiUrl}/employees`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include'
        }),
        fetch(`${apiUrl}/projects`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include'
        }).catch(() => ({ ok: false })) // Projects endpoint might not exist
      ]);
      
      // Process employee data
      if (employeeResponse.ok) {
        const employeeData = await employeeResponse.json();
        const employeeArray = employeeData.data || employeeData;
        if (Array.isArray(employeeArray)) {
          setRealEmployees(employeeArray);
        }
      }
      
      // Process project data (if available)
      if (projectResponse.ok) {
        const projectData = await projectResponse.json();
        const projectArray = projectData.data || projectData;
        if (Array.isArray(projectArray)) {
          setRealProjects(projectArray);
        }
      }
      
    } catch (err) {
      console.error('Failed to fetch search data:', err);
      setError('Failed to load data');
    } finally {
      setIsLoading(false);
    }
  }, [isOpen, debouncedQuery]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Update local state when props change
  useEffect(() => {
    setRealEmployees(employees);
  }, [employees]);

  useEffect(() => {
    setRealProjects(projects);
  }, [projects]);

  // Search results
  const searchResults = useMemo(() => {
    const employeeResults = searchEmployees(realEmployees, debouncedQuery);
    const projectResults = searchProjects(realProjects, debouncedQuery);
    const actionResults = searchActions(debouncedQuery);
    
    // Combine and sort by score
    const allResults = [...employeeResults, ...projectResults, ...actionResults]
      .sort((a, b) => b.score - a.score)
      .slice(0, maxResults);
    
    return {
      employees: allResults.filter(r => r.type === 'employee').slice(0, 10),
      projects: allResults.filter(r => r.type === 'project').slice(0, 10),
      actions: allResults.filter(r => r.type === 'action').slice(0, 6),
    };
  }, [realEmployees, realProjects, debouncedQuery, maxResults]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        if (isOpen) {
          onClose();
        } else {
          onOpen();
        }
      }
      
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onOpen, onClose]);

  // Reset state when dialog closes
  useEffect(() => {
    if (!isOpen) {
      setQuery('');
      setError(null);
      setIsLoading(false);
    }
  }, [isOpen]);

  const handleSelect = (result: SearchResult) => {
    switch (result.type) {
      case 'employee':
        onEmployeeSelect?.(result.data);
        break;
      case 'project':
        onProjectSelect?.(result.data);
        break;
      case 'action':
        onActionSelect?.(result.id);
        break;
    }
    onClose();
  };

  const resultCount = searchResults.employees.length + searchResults.projects.length + searchResults.actions.length;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="p-0 max-w-2xl">
        <Command 
          className="rounded-lg border shadow-md"
          aria-label="Command palette"
        >
          <div className="flex items-center border-b px-3">
            <MagnifyingGlassIcon className="mr-2 h-4 w-4 shrink-0 opacity-50" />
            <CommandInput
              placeholder="Type to search employees, projects, or actions..."
              value={query}
              onValueChange={setQuery}
              className="flex h-11 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-gray-500 disabled:cursor-not-allowed disabled:opacity-50"
              aria-label="Search employees and projects"
            />
          </div>

          <CommandList 
            className="max-h-96 overflow-y-auto"
            aria-label="Search results"
          >
            {/* Loading state */}
            {isLoading && (
              <div className="flex items-center justify-center p-6">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                <span className="ml-2 text-sm text-gray-600">Searching...</span>
              </div>
            )}

            {/* Error state */}
            {error && !isLoading && (
              <div className="p-6 text-center">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            {/* No results */}
            {!isLoading && !error && resultCount === 0 && debouncedQuery && (
              <CommandEmpty>No results found.</CommandEmpty>
            )}

            {/* Results count announcement for screen readers */}
            {resultCount > 0 && (
              <div 
                role="status" 
                aria-live="polite" 
                className="sr-only"
              >
                {resultCount} result{resultCount === 1 ? '' : 's'} found
              </div>
            )}

            {!isLoading && !error && (
              <>
                {/* Employees */}
                {searchResults.employees.length > 0 && (
                  <CommandGroup heading="Employees">
                    {searchResults.employees.map((result) => (
                      <CommandItem
                        key={result.id}
                        value={result.id}
                        onSelect={() => handleSelect(result)}
                        className="flex items-center space-x-3 px-3 py-2 cursor-pointer hover:bg-gray-100"
                        aria-label={`${result.title}, ${result.subtitle}`}
                      >
                        <div className="flex-shrink-0">
                          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                            <UserIcon className="h-4 w-4 text-blue-600" />
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {result.title}
                          </p>
                          <p className="text-xs text-gray-500 truncate">
                            {result.subtitle}
                          </p>
                          {result.data.skills && result.data.skills.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1">
                              {result.data.skills.slice(0, 3).map((skill: string, index: number) => (
                                <Badge key={index} variant="secondary" className="text-xs">
                                  {skill}
                                </Badge>
                              ))}
                              {result.data.skills.length > 3 && (
                                <Badge variant="secondary" className="text-xs">
                                  +{result.data.skills.length - 3}
                                </Badge>
                              )}
                            </div>
                          )}
                        </div>
                        <Badge 
                          variant={result.data.isActive ? "default" : "secondary"}
                          className="text-xs"
                        >
                          {result.data.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                )}

                {/* Projects */}
                {searchResults.projects.length > 0 && (
                  <>
                    {searchResults.employees.length > 0 && <CommandSeparator />}
                    <CommandGroup heading="Projects">
                      {searchResults.projects.map((result) => (
                        <CommandItem
                          key={result.id}
                          value={result.id}
                          onSelect={() => handleSelect(result)}
                          className="flex items-center space-x-3 px-3 py-2 cursor-pointer hover:bg-gray-100"
                          aria-label={`${result.title}, ${result.subtitle}`}
                        >
                          <div className="flex-shrink-0">
                            <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                              <BriefcaseIcon className="h-4 w-4 text-green-600" />
                            </div>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">
                              {result.title}
                            </p>
                            <p className="text-xs text-gray-500 truncate">
                              {result.subtitle}
                            </p>
                            {result.data.requiredSkills && result.data.requiredSkills.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-1">
                                {result.data.requiredSkills.slice(0, 3).map((skill: string, index: number) => (
                                  <Badge key={index} variant="outline" className="text-xs">
                                    {skill}
                                  </Badge>
                                ))}
                                {result.data.requiredSkills.length > 3 && (
                                  <Badge variant="outline" className="text-xs">
                                    +{result.data.requiredSkills.length - 3}
                                  </Badge>
                                )}
                              </div>
                            )}
                          </div>
                          <Badge 
                            variant={result.data.status === 'active' ? "default" : "secondary"}
                            className="text-xs"
                          >
                            {result.data.status}
                          </Badge>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </>
                )}

                {/* Quick Actions */}
                {searchResults.actions.length > 0 && (
                  <>
                    {(searchResults.employees.length > 0 || searchResults.projects.length > 0) && (
                      <CommandSeparator />
                    )}
                    <CommandGroup heading="Quick Actions">
                      {searchResults.actions.map((result) => {
                        const IconComponent = result.data.icon;
                        return (
                          <CommandItem
                            key={result.id}
                            value={result.id}
                            onSelect={() => handleSelect(result)}
                            className="flex items-center space-x-3 px-3 py-2 cursor-pointer hover:bg-gray-100"
                            aria-label={`${result.title}, ${result.subtitle}`}
                          >
                            <div className="flex-shrink-0">
                              <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                                <IconComponent className="h-4 w-4 text-purple-600" />
                              </div>
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-900 truncate">
                                {result.title}
                              </p>
                              <p className="text-xs text-gray-500 truncate">
                                {result.subtitle}
                              </p>
                            </div>
                          </CommandItem>
                        );
                      })}
                    </CommandGroup>
                  </>
                )}
              </>
            )}
          </CommandList>

          {/* Footer with keyboard hints */}
          <div className="border-t px-3 py-2">
            <div className="flex items-center justify-between text-xs text-gray-500">
              <div className="flex items-center space-x-2">
                <kbd className="px-1.5 py-0.5 text-xs bg-gray-100 rounded border">↑↓</kbd>
                <span>navigate</span>
                <kbd className="px-1.5 py-0.5 text-xs bg-gray-100 rounded border">↵</kbd>
                <span>select</span>
              </div>
              <div className="flex items-center space-x-2">
                <kbd className="px-1.5 py-0.5 text-xs bg-gray-100 rounded border">esc</kbd>
                <span>close</span>
              </div>
            </div>
          </div>
        </Command>
      </DialogContent>
    </Dialog>
  );
};