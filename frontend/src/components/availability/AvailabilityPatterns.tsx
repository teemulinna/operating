import React, { useState, useEffect } from 'react';
import { Calendar, Clock, Users, TrendingUp, Settings, Save } from 'lucide-react';
import { apiClient } from '../../services/api';

interface AvailabilityPattern {
  id: string;
  name: string;
  employeeId: string;
  employeeName?: string;
  pattern: {
    monday: number;
    tuesday: number;
    wednesday: number;
    thursday: number;
    friday: number;
    saturday: number;
    sunday: number;
  };
  startDate: string;
  endDate?: string;
  isActive: boolean;
}

type DayKey = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';

interface NewPatternState {
  name: string;
  monday: number;
  tuesday: number;
  wednesday: number;
  thursday: number;
  friday: number;
  saturday: number;
  sunday: number;
}

export const AvailabilityPatterns: React.FC = () => {
  const [patterns, setPatterns] = useState<AvailabilityPattern[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEmployee, setSelectedEmployee] = useState('');
  const [newPattern, setNewPattern] = useState<NewPatternState>({
    name: '',
    monday: 8,
    tuesday: 8,
    wednesday: 8,
    thursday: 8,
    friday: 8,
    saturday: 0,
    sunday: 0,
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);

      // Load employees
      const empResponse = await apiClient.get('/employees');
      setEmployees(empResponse.data.data || []);

      // Load availability patterns (mock for now)
      setPatterns([
        {
          id: '1',
          name: 'Standard Week',
          employeeId: 'emp1',
          employeeName: 'John Doe',
          pattern: {
            monday: 8,
            tuesday: 8,
            wednesday: 8,
            thursday: 8,
            friday: 8,
            saturday: 0,
            sunday: 0,
          },
          startDate: '2025-09-01',
          isActive: true,
        },
        {
          id: '2',
          name: 'Part-Time',
          employeeId: 'emp2',
          employeeName: 'Jane Smith',
          pattern: {
            monday: 4,
            tuesday: 4,
            wednesday: 4,
            thursday: 4,
            friday: 0,
            saturday: 0,
            sunday: 0,
          },
          startDate: '2025-09-15',
          isActive: true,
        },
      ]);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSavePattern = async () => {
    if (!selectedEmployee || !newPattern.name) {
      alert('Please select an employee and enter a pattern name');
      return;
    }

    try {
      // In production, this would call the API
      const pattern: AvailabilityPattern = {
        id: Date.now().toString(),
        name: newPattern.name,
        employeeId: selectedEmployee,
        employeeName: employees.find(e => e.id === selectedEmployee)?.name,
        pattern: {
          monday: newPattern.monday,
          tuesday: newPattern.tuesday,
          wednesday: newPattern.wednesday,
          thursday: newPattern.thursday,
          friday: newPattern.friday,
          saturday: newPattern.saturday,
          sunday: newPattern.sunday,
        },
        startDate: new Date().toISOString().split('T')[0],
        isActive: true,
      };

      setPatterns([...patterns, pattern]);

      // Reset form
      setNewPattern({
        name: '',
        monday: 8,
        tuesday: 8,
        wednesday: 8,
        thursday: 8,
        friday: 8,
        saturday: 0,
        sunday: 0,
      });
      setSelectedEmployee('');

      alert('Availability pattern saved successfully!');
    } catch (error) {
      console.error('Failed to save pattern:', error);
      alert('Failed to save availability pattern');
    }
  };

  const getTotalWeeklyHours = (pattern: NewPatternState | AvailabilityPattern['pattern']) => {
    return Object.values(pattern).reduce((sum: number, hours) => sum + (typeof hours === 'number' ? hours : 0), 0);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
          <Clock className="w-8 h-8 text-blue-600" />
          Availability Patterns
        </h1>
        <p className="text-gray-600 mt-2">
          Define recurring availability patterns for employees to optimize resource planning
        </p>
      </div>

      {/* Create New Pattern */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-8">
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <Settings className="w-5 h-5" />
          Create New Availability Pattern
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Pattern Name
            </label>
            <input
              type="text"
              value={newPattern.name}
              onChange={(e) => setNewPattern({ ...newPattern, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g., Summer Schedule, Part-Time"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Employee
            </label>
            <select
              value={selectedEmployee}
              onChange={(e) => setSelectedEmployee(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select Employee</option>
              {employees.map(emp => (
                <option key={emp.id} value={emp.id}>
                  {emp.name} - {emp.position}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Weekly Hours Pattern
          </label>
          <div className="grid grid-cols-7 gap-2">
            {(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'] as const).map((day) => {
              const dayKey = day.toLowerCase() as DayKey;
              return (
                <div key={day}>
                  <label className="block text-xs text-gray-600 mb-1">{day.slice(0, 3)}</label>
                  <input
                    type="number"
                    min="0"
                    max="12"
                    value={newPattern[dayKey]}
                    onChange={(e) => setNewPattern({
                      ...newPattern,
                      [dayKey]: parseFloat(e.target.value) || 0
                    })}
                    className="w-full px-2 py-1 border border-gray-300 rounded text-center"
                  />
                </div>
              );
            })}
          </div>
          <div className="mt-2 text-sm text-gray-600">
            Total Weekly Hours: <span className="font-semibold">{getTotalWeeklyHours(newPattern)}</span>
          </div>
        </div>

        <button
          onClick={handleSavePattern}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition"
        >
          <Save className="w-4 h-4" />
          Save Pattern
        </button>
      </div>

      {/* Existing Patterns */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <Calendar className="w-5 h-5" />
          Active Availability Patterns
        </h2>

        <div className="space-y-4">
          {patterns.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Users className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p>No availability patterns defined yet</p>
            </div>
          ) : (
            patterns.map(pattern => (
              <div
                key={pattern.id}
                className="border rounded-lg p-4 hover:shadow-md transition"
              >
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="font-semibold text-gray-900">{pattern.name}</h3>
                    <p className="text-sm text-gray-600">
                      {pattern.employeeName} • Started {pattern.startDate}
                    </p>
                  </div>
                  <span
                    className={`px-2 py-1 text-xs rounded ${
                      pattern.isActive
                        ? 'bg-green-100 text-green-800'
                        : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {pattern.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>

                <div className="grid grid-cols-7 gap-2 text-center">
                  {Object.entries(pattern.pattern).map(([day, hours]) => (
                    <div key={day}>
                      <div className="text-xs text-gray-500 capitalize">{day.slice(0, 3)}</div>
                      <div
                        className={`text-sm font-medium ${
                          hours > 0 ? 'text-gray-900' : 'text-gray-400'
                        }`}
                      >
                        {hours}h
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-3 flex items-center justify-between text-sm">
                  <span className="text-gray-600">
                    Weekly Total: <span className="font-semibold">{getTotalWeeklyHours(pattern.pattern)}h</span>
                  </span>
                  <div className="flex gap-2">
                    <button className="text-blue-600 hover:text-blue-800">Edit</button>
                    <button className="text-red-600 hover:text-red-800">Delete</button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Statistics */}
      <div className="mt-8 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <TrendingUp className="w-5 h-5" />
          Availability Insights
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-lg p-4">
            <div className="text-2xl font-bold text-blue-600">{patterns.length}</div>
            <div className="text-sm text-gray-600">Active Patterns</div>
          </div>
          <div className="bg-white rounded-lg p-4">
            <div className="text-2xl font-bold text-green-600">
              {patterns.reduce((sum, p) => sum + getTotalWeeklyHours(p.pattern), 0) / patterns.length || 0}h
            </div>
            <div className="text-sm text-gray-600">Avg Weekly Hours</div>
          </div>
          <div className="bg-white rounded-lg p-4">
            <div className="text-2xl font-bold text-purple-600">
              {employees.length}
            </div>
            <div className="text-sm text-gray-600">Total Employees</div>
          </div>
        </div>
      </div>
    </div>
  );
};
