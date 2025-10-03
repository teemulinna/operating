import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { Search, Filter, Calendar, Users, Building2, X } from 'lucide-react';
import { ServiceFactory, Employee } from '../../services/api';

interface HeatMapFiltersProps {
  onFiltersChange: (filters: {
    startDate: Date;
    endDate: Date;
    employeeId?: string;
    employeeIds?: string[];
    departmentId?: string;
    departmentIds?: string[];
    granularity: 'day' | 'week' | 'month';
    utilizationCategories?: ('green' | 'blue' | 'yellow' | 'red')[];
  }) => void;
  initialFilters?: {
    startDate?: Date;
    endDate?: Date;
    employeeId?: string;
    departmentId?: string;
    granularity?: 'day' | 'week' | 'month';
  };
}

interface Department {
  id: string;
  name: string;
  employeeCount?: number;
}

export const HeatMapFilters: React.FC<HeatMapFiltersProps> = ({
  onFiltersChange,
  initialFilters = {},
}) => {
  const [startDate, setStartDate] = useState(
    initialFilters.startDate || new Date()
  );
  const [endDate, setEndDate] = useState(
    initialFilters.endDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
  );
  const [selectedEmployees, setSelectedEmployees] = useState<string[]>(
    initialFilters.employeeId ? [initialFilters.employeeId] : []
  );
  const [selectedDepartments, setSelectedDepartments] = useState<string[]>(
    initialFilters.departmentId ? [initialFilters.departmentId] : []
  );
  const [granularity, setGranularity] = useState<'day' | 'week' | 'month'>(
    initialFilters.granularity || 'day'
  );
  const [selectedCategories, setSelectedCategories] = useState<
    ('green' | 'blue' | 'yellow' | 'red')[]
  >([]);

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [loading, setLoading] = useState(false);

  // Load employees and departments
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const employeeService = ServiceFactory.getEmployeeService();
      const employeeResponse = await employeeService.getAll();
      const employeeData = employeeResponse.data as Employee[];
      setEmployees(employeeData);

      // Extract unique departments from employees
      const departmentMap = new Map<string, Department>();
      employeeData.forEach((emp: Employee) => {
        if (emp.departmentId && emp.department) {
          if (!departmentMap.has(emp.departmentId)) {
            departmentMap.set(emp.departmentId, {
              id: emp.departmentId,
              name: emp.department,
              employeeCount: 1,
            });
          } else {
            const dept = departmentMap.get(emp.departmentId)!;
            dept.employeeCount = (dept.employeeCount || 0) + 1;
          }
        }
      });
      setDepartments(Array.from(departmentMap.values()));
    } catch (error) {
      console.error('Failed to load filter data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Apply filters when they change
  useEffect(() => {
    const filters = {
      startDate,
      endDate,
      employeeId: selectedEmployees.length === 1 ? selectedEmployees[0] : undefined,
      employeeIds: selectedEmployees.length > 0 ? selectedEmployees : undefined,
      departmentId: selectedDepartments.length === 1 ? selectedDepartments[0] : undefined,
      departmentIds: selectedDepartments.length > 0 ? selectedDepartments : undefined,
      granularity,
      utilizationCategories: selectedCategories.length > 0 ? selectedCategories : undefined,
    };
    onFiltersChange(filters);
  }, [
    startDate,
    endDate,
    selectedEmployees,
    selectedDepartments,
    granularity,
    selectedCategories,
    onFiltersChange,
  ]);

  const handleEmployeeToggle = (employeeId: string) => {
    setSelectedEmployees((prev: string[]) =>
      prev.includes(employeeId)
        ? prev.filter((id: string) => id !== employeeId)
        : [...prev, employeeId]
    );
  };

  const handleDepartmentToggle = (departmentId: string) => {
    setSelectedDepartments((prev: string[]) =>
      prev.includes(departmentId)
        ? prev.filter((id: string) => id !== departmentId)
        : [...prev, departmentId]
    );
  };

  const handleCategoryToggle = (category: 'green' | 'blue' | 'yellow' | 'red') => {
    setSelectedCategories((prev: ('green' | 'blue' | 'yellow' | 'red')[]) =>
      prev.includes(category)
        ? prev.filter((c: 'green' | 'blue' | 'yellow' | 'red') => c !== category)
        : [...prev, category]
    );
  };

  const clearFilters = () => {
    setStartDate(new Date());
    setEndDate(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000));
    setSelectedEmployees([]);
    setSelectedDepartments([]);
    setGranularity('day');
    setSelectedCategories([]);
    setSearchTerm('');
  };

  const hasActiveFilters =
    selectedEmployees.length > 0 ||
    selectedDepartments.length > 0 ||
    selectedCategories.length > 0 ||
    granularity !== 'day';

  // Filter employees by search term
  const filteredEmployees = employees.filter((emp: Employee) => {
    const fullName = `${emp.firstName} ${emp.lastName}`.toLowerCase();
    const searchLower = searchTerm.toLowerCase();
    return fullName.includes(searchLower) || emp.email?.toLowerCase().includes(searchLower);
  });

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <Filter className="w-5 h-5" />
          Heat Map Filters
        </h3>
        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            className="text-sm text-blue-600 hover:text-blue-800"
          >
            Clear all filters
          </button>
        )}
      </div>

      {/* Date Range */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            <Calendar className="w-4 h-4 inline mr-1" />
            Start Date
          </label>
          <input
            type="date"
            value={format(startDate, 'yyyy-MM-dd')}
            onChange={e => setStartDate(new Date(e.target.value))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            <Calendar className="w-4 h-4 inline mr-1" />
            End Date
          </label>
          <input
            type="date"
            value={format(endDate, 'yyyy-MM-dd')}
            onChange={e => setEndDate(new Date(e.target.value))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Granularity */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          View Granularity
        </label>
        <div className="flex gap-2">
          {(['day', 'week', 'month'] as const).map(g => (
            <button
              key={g}
              onClick={() => setGranularity(g)}
              className={`
                px-4 py-2 text-sm font-medium rounded-md capitalize
                ${
                  granularity === g
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                }
              `}
            >
              {g}
            </button>
          ))}
        </div>
      </div>

      {/* Utilization Categories */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Utilization Levels
        </label>
        <div className="flex gap-2 flex-wrap">
          {[
            { value: 'green' as const, label: 'Optimal (≤70%)', color: 'bg-emerald-500' },
            { value: 'blue' as const, label: 'Good (71-85%)', color: 'bg-blue-500' },
            { value: 'yellow' as const, label: 'Warning (86-100%)', color: 'bg-amber-500' },
            { value: 'red' as const, label: 'Critical (>100%)', color: 'bg-red-500' },
          ].map(category => (
            <button
              key={category.value}
              onClick={() => handleCategoryToggle(category.value)}
              className={`
                flex items-center gap-2 px-3 py-1 rounded-md text-sm
                ${
                  selectedCategories.includes(category.value)
                    ? 'bg-gray-100 border-2 border-blue-500'
                    : 'bg-white border border-gray-300 hover:bg-gray-50'
                }
              `}
            >
              <div className={`w-3 h-3 ${category.color} rounded`}></div>
              {category.label}
            </button>
          ))}
        </div>
      </div>

      {/* Advanced Filters Toggle */}
      <button
        onClick={() => setShowAdvanced(!showAdvanced)}
        className="text-sm text-blue-600 hover:text-blue-800 mb-4"
      >
        {showAdvanced ? 'Hide' : 'Show'} advanced filters
      </button>

      {/* Advanced Filters */}
      {showAdvanced && (
        <div className="border-t pt-4">
          {/* Department Filter */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <Building2 className="w-4 h-4 inline mr-1" />
              Departments
            </label>
            <div className="flex flex-wrap gap-2">
              {departments.map((dept: Department) => (
                <button
                  key={dept.id}
                  onClick={() => handleDepartmentToggle(dept.id)}
                  className={`
                    px-3 py-1 text-sm rounded-md
                    ${
                      selectedDepartments.includes(dept.id)
                        ? 'bg-blue-600 text-white'
                        : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                    }
                  `}
                >
                  {dept.name} ({dept.employeeCount})
                </button>
              ))}
            </div>
          </div>

          {/* Employee Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <Users className="w-4 h-4 inline mr-1" />
              Specific Employees
            </label>

            {/* Search */}
            <div className="relative mb-2">
              <input
                type="text"
                placeholder="Search employees..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <Search className="absolute left-3 top-2.5 w-5 h-5 text-gray-400" />
            </div>

            {/* Selected Employees */}
            {selectedEmployees.length > 0 && (
              <div className="mb-2 flex flex-wrap gap-2">
                {selectedEmployees.map((id: string) => {
                  const employee = employees.find((e: Employee) => e.id === id);
                  return employee ? (
                    <span
                      key={id}
                      className="inline-flex items-center gap-1 px-2 py-1 text-sm bg-blue-100 text-blue-800 rounded-md"
                    >
                      {employee.firstName} {employee.lastName}
                      <button
                        onClick={() => handleEmployeeToggle(id)}
                        className="hover:text-blue-600"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ) : null;
                })}
              </div>
            )}

            {/* Employee List */}
            <div className="max-h-48 overflow-y-auto border border-gray-200 rounded-md">
              {loading ? (
                <div className="p-4 text-center text-gray-500">Loading...</div>
              ) : filteredEmployees.length === 0 ? (
                <div className="p-4 text-center text-gray-500">No employees found</div>
              ) : (
                filteredEmployees.map((employee: Employee) => (
                  <label
                    key={employee.id}
                    className="flex items-center p-2 hover:bg-gray-50 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={selectedEmployees.includes(employee.id)}
                      onChange={() => handleEmployeeToggle(employee.id)}
                      className="mr-3"
                    />
                    <div className="flex-1">
                      <div className="text-sm font-medium text-gray-900">
                        {employee.firstName} {employee.lastName}
                      </div>
                      <div className="text-xs text-gray-500">
                        {employee.position} • {employee.department}
                      </div>
                    </div>
                  </label>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
