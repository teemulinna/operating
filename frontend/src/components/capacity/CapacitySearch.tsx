import React, { useState, useMemo } from 'react';
import { useCapacitySearch } from '@/hooks/useCapacity';
import { CapacityEntry, CapacitySearchParams, AvailabilityStatus } from '@/types/capacity';
import { Employee } from '@/types/employee';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/utils/cn';

interface CapacitySearchProps {
  employees: Employee[];
  onEmployeeSelect?: (employee: Employee, capacity: CapacityEntry) => void;
  onCapacityFound?: (results: CapacityEntry[]) => void;
}

const statusFilters: { value: AvailabilityStatus; label: string; icon: string }[] = [
  { value: 'available', label: 'Available', icon: '✅' },
  { value: 'partially-available', label: 'Partially Available', icon: '⚠️' },
  { value: 'busy', label: 'Busy', icon: '🔥' },
  { value: 'overbooked', label: 'Overbooked', icon: '🚨' },
  { value: 'out-of-office', label: 'Out of Office', icon: '🏠' },
  { value: 'sick-leave', label: 'Sick Leave', icon: '🤒' },
  { value: 'vacation', label: 'Vacation', icon: '🏖️' }
];

const commonSkills = [
  'JavaScript', 'TypeScript', 'React', 'Node.js', 'Python', 'Java', 
  'SQL', 'AWS', 'Docker', 'GraphQL', 'MongoDB', 'PostgreSQL',
  'UI/UX Design', 'Project Management', 'DevOps', 'Mobile Development'
];

interface SearchResultCardProps {
  capacity: CapacityEntry;
  employee: Employee;
  matchedCriteria: string[];
  onSelect: () => void;
}

const SearchResultCard: React.FC<SearchResultCardProps> = ({
  capacity,
  employee,
  matchedCriteria,
  onSelect
}) => {
  const utilizationRate = capacity.totalHours > 0 
    ? (capacity.allocatedHours / capacity.totalHours) * 100 
    : 0;
  
  const availableHours = Math.max(0, capacity.totalHours - capacity.allocatedHours);
  const statusConfig = statusFilters.find(s => s.value === capacity.status);

  return (
    <Card className="p-4 hover:shadow-md transition-all cursor-pointer" onClick={onSelect}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center space-x-3">
          <div className="text-xl">{statusConfig?.icon || '👤'}</div>
          <div>
            <div className="font-semibold text-gray-900">
              {employee.firstName} {employee.lastName}
            </div>
            <div className="text-sm text-gray-600">
              {employee.department} • {employee.position}
            </div>
          </div>
        </div>
        
        <div className="text-right">
          <div className={cn(
            'text-sm font-medium px-2 py-1 rounded',
            capacity.status === 'available' ? 'bg-green-100 text-green-800' :
            capacity.status === 'partially-available' ? 'bg-yellow-100 text-yellow-800' :
            'bg-gray-100 text-gray-600'
          )}>
            {statusConfig?.label || capacity.status}
          </div>
        </div>
      </div>

      <div className="space-y-2">
        {/* Availability Summary */}
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600">Available Capacity:</span>
          <span className="font-bold text-green-600">{availableHours}h</span>
        </div>
        
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600">Current Utilization:</span>
          <span className={cn(
            'font-medium',
            utilizationRate > 100 ? 'text-red-600' :
            utilizationRate > 80 ? 'text-orange-600' : 'text-green-600'
          )}>
            {utilizationRate.toFixed(0)}%
          </span>
        </div>

        {/* Current Projects */}
        {capacity.projects.length > 0 && (
          <div className="space-y-1">
            <div className="text-xs text-gray-600 font-medium">Current Projects:</div>
            {capacity.projects.slice(0, 2).map(project => (
              <div key={project.id} className="flex items-center justify-between text-xs">
                <span 
                  className="px-1.5 py-0.5 rounded truncate"
                  style={{ backgroundColor: project.color || '#e5e7eb' }}
                >
                  {project.projectName}
                </span>
                <span className="font-medium">{project.allocatedHours}h</span>
              </div>
            ))}
            {capacity.projects.length > 2 && (
              <div className="text-xs text-gray-500">
                +{capacity.projects.length - 2} more projects
              </div>
            )}
          </div>
        )}

        {/* Matched Criteria */}
        {matchedCriteria.length > 0 && (
          <div className="pt-2 border-t border-gray-100">
            <div className="text-xs text-gray-600 font-medium mb-1">Matches:</div>
            <div className="flex flex-wrap gap-1">
              {matchedCriteria.map(criteria => (
                <span 
                  key={criteria}
                  className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full"
                >
                  {criteria}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Notes */}
        {capacity.notes && (
          <div className="text-xs text-gray-600 p-2 bg-gray-50 rounded">
            <strong>Notes:</strong> {capacity.notes}
          </div>
        )}
      </div>
    </Card>
  );
};

const CapacitySearch: React.FC<CapacitySearchProps> = ({
  employees,
  onEmployeeSelect,
  onCapacityFound
}) => {
  const [searchParams, setSearchParams] = useState<CapacitySearchParams>({
    query: '',
    minHours: 1,
    dateRange: {
      start: new Date().toISOString().split('T')[0],
      end: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    }
  });
  
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [selectedAvailability, setSelectedAvailability] = useState<AvailabilityStatus[]>(['available', 'partially-available']);
  const [customSkill, setCustomSkill] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Build final search params
  const finalSearchParams = useMemo(() => ({
    ...searchParams,
    skillsets: selectedSkills,
    availability: selectedAvailability
  }), [searchParams, selectedSkills, selectedAvailability]);

  const { data: searchResults, isLoading, error } = useCapacitySearch(finalSearchParams);

  // Create employee lookup for results
  const employeeLookup = useMemo(() => {
    const lookup: Record<string, Employee> = {};
    employees.forEach(emp => {
      lookup[emp.id] = emp;
    });
    return lookup;
  }, [employees]);

  // Enhanced results with employee data and matched criteria
  const enhancedResults = useMemo(() => {
    if (!searchResults) return [];
    
    return searchResults.map(capacity => {
      const employee = employeeLookup[capacity.employeeId];
      if (!employee) return null;

      // Determine matched criteria
      const matchedCriteria: string[] = [];
      
      if (searchParams.query && (
        employee.firstName.toLowerCase().includes(searchParams.query.toLowerCase()) ||
        employee.lastName.toLowerCase().includes(searchParams.query.toLowerCase()) ||
        employee.department.toLowerCase().includes(searchParams.query.toLowerCase()) ||
        employee.position.toLowerCase().includes(searchParams.query.toLowerCase())
      )) {
        matchedCriteria.push('Name/Role Match');
      }
      
      if (selectedAvailability.includes(capacity.status)) {
        matchedCriteria.push(`Status: ${capacity.status}`);
      }
      
      if (searchParams.minHours && (capacity.totalHours - capacity.allocatedHours) >= searchParams.minHours) {
        matchedCriteria.push(`${capacity.totalHours - capacity.allocatedHours}+ hours available`);
      }
      
      selectedSkills.forEach(skill => {
        // This would typically match against employee skills stored in the database
        // For demo purposes, we'll match against position names
        if (employee.position.toLowerCase().includes(skill.toLowerCase())) {
          matchedCriteria.push(`Skill: ${skill}`);
        }
      });

      return {
        capacity,
        employee,
        matchedCriteria
      };
    }).filter(Boolean) as Array<{
      capacity: CapacityEntry;
      employee: Employee;
      matchedCriteria: string[];
    }>;
  }, [searchResults, employeeLookup, searchParams, selectedSkills, selectedAvailability]);

  const addCustomSkill = () => {
    if (customSkill.trim() && !selectedSkills.includes(customSkill.trim())) {
      setSelectedSkills([...selectedSkills, customSkill.trim()]);
      setCustomSkill('');
    }
  };

  const handleEmployeeSelect = (employee: Employee, capacity: CapacityEntry) => {
    onEmployeeSelect?.(employee, capacity);
  };

  React.useEffect(() => {
    if (searchResults) {
      onCapacityFound?.(searchResults);
    }
  }, [searchResults, onCapacityFound]);

  return (
    <div className="space-y-6">
      {/* Search Header */}
      <Card className="p-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Capacity Search</h2>
              <p className="text-gray-600">Find available team members for your projects</p>
            </div>
            <Button
              onClick={() => setShowAdvanced(!showAdvanced)}
              variant="outline"
            >
              {showAdvanced ? 'Simple Search' : 'Advanced Search'}
            </Button>
          </div>

          {/* Basic Search */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="search-query">Search Query</Label>
              <Input
                id="search-query"
                placeholder="Name, department, or role..."
                value={searchParams.query || ''}
                onChange={(e) => setSearchParams(prev => ({ ...prev, query: e.target.value }))}
              />
            </div>
            
            <div>
              <Label htmlFor="min-hours">Minimum Available Hours</Label>
              <Input
                id="min-hours"
                type="number"
                min="0"
                max="40"
                value={searchParams.minHours || ''}
                onChange={(e) => setSearchParams(prev => ({ ...prev, minHours: parseInt(e.target.value) }))}
              />
            </div>
            
            <div className="flex space-x-2">
              <div className="flex-1">
                <Label htmlFor="start-date">From Date</Label>
                <Input
                  id="start-date"
                  type="date"
                  value={searchParams.dateRange?.start || ''}
                  onChange={(e) => setSearchParams(prev => ({
                    ...prev,
                    dateRange: { ...prev.dateRange!, start: e.target.value }
                  }))}
                />
              </div>
              <div className="flex-1">
                <Label htmlFor="end-date">To Date</Label>
                <Input
                  id="end-date"
                  type="date"
                  value={searchParams.dateRange?.end || ''}
                  onChange={(e) => setSearchParams(prev => ({
                    ...prev,
                    dateRange: { ...prev.dateRange!, end: e.target.value }
                  }))}
                />
              </div>
            </div>
          </div>

          {/* Advanced Search */}
          {showAdvanced && (
            <div className="space-y-4 pt-4 border-t border-gray-200">
              {/* Availability Status Filter */}
              <div>
                <Label className="text-base font-medium mb-2 block">Availability Status</Label>
                <div className="flex flex-wrap gap-2">
                  {statusFilters.map(status => (
                    <label
                      key={status.value}
                      className={cn(
                        'flex items-center space-x-2 px-3 py-2 rounded-lg border cursor-pointer transition-colors',
                        selectedAvailability.includes(status.value)
                          ? 'bg-blue-50 border-blue-300 text-blue-800'
                          : 'bg-white border-gray-300 hover:bg-gray-50'
                      )}
                    >
                      <input
                        type="checkbox"
                        checked={selectedAvailability.includes(status.value)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedAvailability([...selectedAvailability, status.value]);
                          } else {
                            setSelectedAvailability(selectedAvailability.filter(s => s !== status.value));
                          }
                        }}
                        className="sr-only"
                      />
                      <span>{status.icon}</span>
                      <span className="text-sm font-medium">{status.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Skills Filter */}
              <div>
                <Label className="text-base font-medium mb-2 block">Required Skills</Label>
                <div className="space-y-3">
                  <div className="flex flex-wrap gap-2">
                    {commonSkills.map(skill => (
                      <label
                        key={skill}
                        className={cn(
                          'flex items-center space-x-1 px-3 py-1.5 rounded-lg border cursor-pointer transition-colors text-sm',
                          selectedSkills.includes(skill)
                            ? 'bg-green-50 border-green-300 text-green-800'
                            : 'bg-white border-gray-300 hover:bg-gray-50'
                        )}
                      >
                        <input
                          type="checkbox"
                          checked={selectedSkills.includes(skill)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedSkills([...selectedSkills, skill]);
                            } else {
                              setSelectedSkills(selectedSkills.filter(s => s !== skill));
                            }
                          }}
                          className="sr-only"
                        />
                        <span>{skill}</span>
                      </label>
                    ))}
                  </div>
                  
                  <div className="flex space-x-2">
                    <Input
                      placeholder="Add custom skill..."
                      value={customSkill}
                      onChange={(e) => setCustomSkill(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && addCustomSkill()}
                    />
                    <Button onClick={addCustomSkill} variant="outline" size="sm">
                      Add
                    </Button>
                  </div>
                  
                  {selectedSkills.length > 0 && (
                    <div className="space-y-1">
                      <div className="text-sm font-medium text-gray-700">Selected Skills:</div>
                      <div className="flex flex-wrap gap-1">
                        {selectedSkills.map(skill => (
                          <span
                            key={skill}
                            className="inline-flex items-center space-x-1 px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs"
                          >
                            <span>{skill}</span>
                            <button
                              onClick={() => setSelectedSkills(selectedSkills.filter(s => s !== skill))}
                              className="hover:text-blue-900"
                            >
                              ×
                            </button>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Search Results */}
      <div>
        {isLoading ? (
          <Card className="p-6">
            <div className="animate-pulse space-y-4">
              <div className="h-4 bg-gray-200 rounded w-1/4"></div>
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-24 bg-gray-100 rounded"></div>
              ))}
            </div>
          </Card>
        ) : error ? (
          <Card className="p-6">
            <div className="text-center text-red-600">
              <p>Search failed: {error.message}</p>
            </div>
          </Card>
        ) : enhancedResults.length === 0 ? (
          <Card className="p-8 text-center">
            <div className="text-gray-500">
              <div className="text-4xl mb-4">🔍</div>
              <h3 className="text-lg font-medium mb-2">No matching capacity found</h3>
              <p>Try adjusting your search criteria or date range.</p>
            </div>
          </Card>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">
                Search Results ({enhancedResults.length} found)
              </h3>
              
              {/* Sort Options */}
              <select className="px-3 py-2 border rounded-lg text-sm">
                <option value="availability">Sort by Availability</option>
                <option value="name">Sort by Name</option>
                <option value="department">Sort by Department</option>
                <option value="capacity">Sort by Available Hours</option>
              </select>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {enhancedResults.map(({ capacity, employee, matchedCriteria }) => (
                <SearchResultCard
                  key={`${employee.id}-${capacity.date}`}
                  capacity={capacity}
                  employee={employee}
                  matchedCriteria={matchedCriteria}
                  onSelect={() => handleEmployeeSelect(employee, capacity)}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CapacitySearch;