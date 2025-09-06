import React, { useState, useMemo, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import { UsersIcon, ArrowTrendingUpIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { 
  useScreenSize, 
  useContainerQuery, 
  getResponsiveChartConfig, 
  getTouchFriendlyProps,
  getMobileTooltipConfig,
  adaptDataForMobile
} from '../../utils/chartResponsiveConfig';

interface Employee {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  departmentId: number;
  position: string;
  skills: string[];
}

interface Department {
  id: number;
  name: string;
  description?: string;
}

interface CapacityData {
  id: string;
  employeeId: string;
  date: string;
  availableHours: number;
  allocatedHours: number;
  utilizationRate: number;
}

interface TeamCapacityOverviewProps {
  employees: Employee[];
  departments: Department[];
  capacityData: CapacityData[];
  compact?: boolean;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ffc658'];

export const TeamCapacityOverview: React.FC<TeamCapacityOverviewProps> = ({
  employees,
  departments,
  capacityData,
  compact = false
}) => {
  const [selectedDepartment, setSelectedDepartment] = useState<string>('all');
  const [timeframe, setTimeframe] = useState<string>('week');
  
  // Responsive hooks
  const { screenSize } = useScreenSize();
  const containerRef = useRef<HTMLDivElement>(null);
  const { containerSize } = useContainerQuery(containerRef);
  
  // Use container size for better responsiveness
  const activeScreenSize = containerSize || screenSize;

  const departmentCapacityData = useMemo(() => {
    const deptData = departments.map(dept => {
      const deptEmployees = employees.filter(emp => emp.departmentId === dept.id);
      const deptCapacity = capacityData.filter(cap => 
        deptEmployees.some(emp => emp.id.toString() === cap.employeeId)
      );

      const totalCapacity = deptCapacity.reduce((sum, cap) => sum + cap.availableHours, 0);
      const totalAllocated = deptCapacity.reduce((sum, cap) => sum + cap.allocatedHours, 0);
      const avgUtilization = deptCapacity.length > 0 
        ? deptCapacity.reduce((sum, cap) => sum + cap.utilizationRate, 0) / deptCapacity.length
        : 0;

      return {
        name: dept.name,
        totalCapacity,
        totalAllocated,
        available: totalCapacity - totalAllocated,
        utilization: avgUtilization * 100,
        employeeCount: deptEmployees.length,
        status: avgUtilization > 0.9 ? 'overutilized' : avgUtilization > 0.7 ? 'optimal' : 'underutilized'
      };
    });

    return selectedDepartment === 'all' 
      ? deptData 
      : deptData.filter(dept => dept.name === selectedDepartment);
  }, [departments, employees, capacityData, selectedDepartment]);

  const utilizationTrends = useMemo(() => {
    // Group capacity data by date for trend analysis
    const dateGroups = capacityData.reduce((acc, cap) => {
      const date = cap.date.split('T')[0];
      if (!acc[date]) {
        acc[date] = [];
      }
      acc[date].push(cap);
      return acc;
    }, {} as Record<string, CapacityData[]>);

    const trends = Object.entries(dateGroups)
      .map(([date, dayCapacity]) => ({
        date,
        utilization: dayCapacity.reduce((sum, cap) => sum + cap.utilizationRate, 0) / dayCapacity.length * 100,
        totalHours: dayCapacity.reduce((sum, cap) => sum + cap.availableHours, 0),
        allocatedHours: dayCapacity.reduce((sum, cap) => sum + cap.allocatedHours, 0)
      }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .slice(-7); // Last 7 days

    // Adapt data for mobile screens
    return adaptDataForMobile(trends, activeScreenSize, 5);
  }, [capacityData, activeScreenSize]);

  const skillDistribution = useMemo(() => {
    const skillCounts = employees.reduce((acc, emp) => {
      emp.skills.forEach(skill => {
        acc[skill] = (acc[skill] || 0) + 1;
      });
      return acc;
    }, {} as Record<string, number>);

    const skills = Object.entries(skillCounts)
      .map(([skill, count]) => ({ name: skill, value: count }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);

    // Adapt for mobile - show fewer skills on small screens
    const maxSkills = activeScreenSize === 'xs' || activeScreenSize === 'sm' ? 5 : 8;
    return skills.slice(0, maxSkills);
  }, [employees, activeScreenSize]);

  // Get responsive configurations
  const barChartConfig = getResponsiveChartConfig(activeScreenSize, 'bar');
  const lineChartConfig = getResponsiveChartConfig(activeScreenSize, 'line');
  const pieChartConfig = getResponsiveChartConfig(activeScreenSize, 'pie');
  const touchProps = getTouchFriendlyProps(activeScreenSize);
  const tooltipConfig = getMobileTooltipConfig(activeScreenSize);

  if (compact) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Team Capacity Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Quick Stats */}
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-blue-600">
                  {departmentCapacityData.reduce((sum, d) => sum + d.utilization, 0) / departmentCapacityData.length || 0}%
                </p>
                <p className="text-sm text-gray-600">Avg Utilization</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-green-600">
                  {departmentCapacityData.filter(d => d.status === 'optimal').length}
                </p>
                <p className="text-sm text-gray-600">Optimal Teams</p>
              </div>
            </div>

            {/* Department Status */}
            <div className="space-y-2">
              {departmentCapacityData.slice(0, 3).map((dept, index) => (
                <div key={dept.name} className="flex justify-between items-center">
                  <span className="text-sm font-medium">{dept.name}</span>
                  <Badge variant={
                    dept.status === 'overutilized' ? 'destructive' :
                    dept.status === 'optimal' ? 'default' : 'secondary'
                  }>
                    {dept.utilization.toFixed(0)}%
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div ref={containerRef} className="space-y-6 responsive-dashboard">
      {/* Controls */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <h2 className="text-xl sm:text-2xl font-bold">Team Capacity Overview</h2>
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-4">
          <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
            <SelectTrigger className={`${activeScreenSize === 'xs' ? 'w-full' : 'w-48'}`}>
              <SelectValue placeholder="Select Department" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Departments</SelectItem>
              {departments.map(dept => (
                <SelectItem key={dept.id} value={dept.name}>{dept.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Select value={timeframe} onValueChange={setTimeframe}>
            <SelectTrigger className={`${activeScreenSize === 'xs' ? 'w-full' : 'w-32'}`}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="week">Week</SelectItem>
              <SelectItem value="month">Month</SelectItem>
              <SelectItem value="quarter">Quarter</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Department Capacity Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Department Utilization</CardTitle>
        </CardHeader>
        <CardContent className="p-2 sm:p-6">
          <ResponsiveContainer width="100%" height={barChartConfig.height}>
            <BarChart 
              data={departmentCapacityData}
              margin={barChartConfig.margin}
              barCategoryGap={activeScreenSize === 'xs' ? '5%' : '10%'}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis 
                dataKey="name" 
                fontSize={barChartConfig.fontSize}
                tick={{ fontSize: barChartConfig.fontSize }}
                interval={activeScreenSize === 'xs' ? 1 : 0}
                angle={activeScreenSize === 'xs' ? -45 : 0}
                textAnchor={activeScreenSize === 'xs' ? 'end' : 'middle'}
                height={activeScreenSize === 'xs' ? 60 : 40}
              />
              <YAxis 
                yAxisId="left" 
                fontSize={barChartConfig.fontSize}
                tick={{ fontSize: barChartConfig.fontSize }}
              />
              {barChartConfig.showLegend && (
                <YAxis 
                  yAxisId="right" 
                  orientation="right" 
                  fontSize={barChartConfig.fontSize}
                  tick={{ fontSize: barChartConfig.fontSize }}
                />
              )}
              <Tooltip {...tooltipConfig} />
              {barChartConfig.showLegend && <Legend />}
              <Bar 
                yAxisId="left" 
                dataKey="totalCapacity" 
                fill="#8884d8" 
                name="Total Capacity"
                maxBarSize={barChartConfig.barSize}
                {...touchProps}
              />
              <Bar 
                yAxisId="left" 
                dataKey="totalAllocated" 
                fill="#82ca9d" 
                name="Allocated"
                maxBarSize={barChartConfig.barSize}
                {...touchProps}
              />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Utilization Trends */}
        <Card>
          <CardHeader>
            <CardTitle>Utilization Trends (7 days)</CardTitle>
          </CardHeader>
          <CardContent className="p-2 sm:p-6">
            <ResponsiveContainer width="100%" height={lineChartConfig.height}>
              <LineChart 
                data={utilizationTrends}
                margin={lineChartConfig.margin}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis 
                  dataKey="date" 
                  fontSize={lineChartConfig.fontSize}
                  tick={{ fontSize: lineChartConfig.fontSize }}
                  tickFormatter={(value) => {
                    const date = new Date(value);
                    return activeScreenSize === 'xs' 
                      ? `${date.getMonth() + 1}/${date.getDate()}`
                      : date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                  }}
                />
                <YAxis 
                  fontSize={lineChartConfig.fontSize}
                  tick={{ fontSize: lineChartConfig.fontSize }}
                />
                <Tooltip 
                  {...tooltipConfig}
                  labelFormatter={(value) => new Date(value).toLocaleDateString()}
                />
                <Line 
                  type="monotone" 
                  dataKey="utilization" 
                  stroke="#8884d8" 
                  strokeWidth={lineChartConfig.strokeWidth}
                  dot={{ r: touchProps.dot?.r || 3 }}
                  activeDot={touchProps.activeDot}
                  {...touchProps}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Skills Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Skills Distribution</CardTitle>
          </CardHeader>
          <CardContent className="p-2 sm:p-6">
            <ResponsiveContainer width="100%" height={pieChartConfig.height}>
              <PieChart>
                <Pie
                  data={skillDistribution}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={pieChartConfig.showLabels ? ({ name, percent }) => {
                    const shortName = activeScreenSize === 'xs' && name.length > 8 
                      ? name.substring(0, 8) + '...' 
                      : name;
                    return activeScreenSize === 'xs' 
                      ? `${(percent * 100).toFixed(0)}%`
                      : `${shortName} ${(percent * 100).toFixed(0)}%`;
                  } : false}
                  outerRadius={pieChartConfig.outerRadius}
                  fill="#8884d8"
                  dataKey="value"
                  style={{ fontSize: pieChartConfig.fontSize }}
                  {...touchProps}
                >
                  {skillDistribution.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={COLORS[index % COLORS.length]}
                      stroke={activeScreenSize === 'xs' ? '#fff' : 'none'}
                      strokeWidth={activeScreenSize === 'xs' ? 2 : 0}
                    />
                  ))}
                </Pie>
                <Tooltip {...tooltipConfig} />
                {pieChartConfig.showLegend && (
                  <Legend 
                    wrapperStyle={{ fontSize: pieChartConfig.fontSize }}
                    iconSize={activeScreenSize === 'xs' ? 12 : 18}
                  />
                )}
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Department Details */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {departmentCapacityData.map(dept => (
          <Card key={dept.name}>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex justify-between items-center">
                {dept.name}
                <Badge variant={
                  dept.status === 'overutilized' ? 'destructive' :
                  dept.status === 'optimal' ? 'default' : 'secondary'
                }>
                  {dept.utilization.toFixed(0)}%
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Employees:</span>
                  <span className="font-medium">{dept.employeeCount}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Total Capacity:</span>
                  <span className="font-medium">{dept.totalCapacity}h</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Allocated:</span>
                  <span className="font-medium">{dept.totalAllocated}h</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Available:</span>
                  <span className="font-medium text-green-600">{dept.available}h</span>
                </div>
                
                {dept.status === 'overutilized' && (
                  <div className="flex items-center gap-1 text-red-600 text-xs">
                    <ExclamationTriangleIcon className="h-3 w-3" />
                    Over-allocated
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};