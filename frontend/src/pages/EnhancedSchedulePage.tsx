import React from 'react';
import WeeklyScheduleGrid from '../components/schedule/WeeklyScheduleGrid';
import { Card } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { AlertTriangle, Calendar, Users, Clock } from 'lucide-react';

const EnhancedSchedulePage: React.FC = () => {
  // Mock summary data - in a real app, this would come from API
  const summaryStats = {
    totalEmployees: 5,
    activeProjects: 3,
    overAllocatedEmployees: 1,
    averageUtilization: 78
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8" data-testid="enhanced-schedule-page">
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Enhanced Resource Schedule</h1>
        <p className="text-gray-600">Comprehensive view of resource allocations with over-allocation warnings and utilization insights</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card className="p-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Users className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Total Employees</p>
              <p className="text-2xl font-bold text-gray-900">{summaryStats.totalEmployees}</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <Calendar className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Active Projects</p>
              <p className="text-2xl font-bold text-gray-900">{summaryStats.activeProjects}</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-red-100 rounded-lg">
              <AlertTriangle className="h-6 w-6 text-red-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Over-allocated</p>
              <p className="text-2xl font-bold text-red-600">{summaryStats.overAllocatedEmployees}</p>
              <Badge variant="destructive" className="text-xs mt-1">Needs Attention</Badge>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-orange-100 rounded-lg">
              <Clock className="h-6 w-6 text-orange-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Avg. Utilization</p>
              <p className="text-2xl font-bold text-gray-900">{summaryStats.averageUtilization}%</p>
              <Badge variant="secondary" className="text-xs mt-1">
                {summaryStats.averageUtilization >= 80 ? 'High' : 
                 summaryStats.averageUtilization >= 60 ? 'Medium' : 'Low'}
              </Badge>
            </div>
          </div>
        </Card>
      </div>

      {/* Alerts Section */}
      <div className="mb-8">
        <Card className="border-l-4 border-red-500 bg-red-50 p-4">
          <div className="flex items-start space-x-3">
            <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5" />
            <div>
              <h3 className="text-sm font-medium text-red-800">Over-allocation Alert</h3>
              <p className="text-sm text-red-700 mt-1">
                {summaryStats.overAllocatedEmployees} employee(s) are currently over-allocated. 
                Review the schedule grid below to identify conflicts and redistribute workload.
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Weekly Schedule Grid */}
      <WeeklyScheduleGrid />

      {/* Additional Info */}
      <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Schedule Management Tips</h3>
          <ul className="space-y-2 text-sm text-gray-600">
            <li className="flex items-start space-x-2">
              <span className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></span>
              <span>Click any cell to view detailed allocation information</span>
            </li>
            <li className="flex items-start space-x-2">
              <span className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></span>
              <span>Red cells indicate over-allocation - redistribute hours to resolve</span>
            </li>
            <li className="flex items-start space-x-2">
              <span className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></span>
              <span>Use week navigation to plan future allocations</span>
            </li>
            <li className="flex items-start space-x-2">
              <span className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></span>
              <span>Aim for 70-90% utilization for optimal productivity</span>
            </li>
          </ul>
        </Card>

        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Utilization Legend</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-gray-100 border border-gray-300 rounded"></div>
                <span className="text-sm text-gray-600">Unallocated</span>
              </div>
              <span className="text-sm text-gray-500">0%</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-green-100 border border-green-300 rounded"></div>
                <span className="text-sm text-gray-600">Optimal Range</span>
              </div>
              <span className="text-sm text-gray-500">1-70%</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-yellow-100 border border-yellow-300 rounded"></div>
                <span className="text-sm text-gray-600">High Utilization</span>
              </div>
              <span className="text-sm text-gray-500">70-90%</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-orange-100 border border-orange-300 rounded"></div>
                <span className="text-sm text-gray-600">Near Capacity</span>
              </div>
              <span className="text-sm text-gray-500">90-100%</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-red-100 border border-red-300 rounded"></div>
                <AlertTriangle className="w-3 h-3 text-red-600" />
                <span className="text-sm text-gray-600">Over-allocated</span>
              </div>
              <span className="text-sm text-red-600 font-medium">&gt;100%</span>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default EnhancedSchedulePage;