import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Area, AreaChart } from 'recharts';
import { DocumentChartBarIcon, ArrowTrendingUpIcon, ArrowTrendingDownIcon, CurrencyDollarIcon, ClockIcon } from '@heroicons/react/24/outline';
import { format, subDays, subMonths, startOfWeek, endOfWeek, eachDayOfInterval } from 'date-fns';

interface Employee {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  departmentId: number;
  position: string;
  skills: string[];
  salary?: number;
}

interface Project {
  id: string;
  name: string;
  description: string;
  status: 'planning' | 'active' | 'completed' | 'on-hold';
  startDate: string;
  endDate: string;
  requiredSkills: string[];
  priority: 'low' | 'medium' | 'high' | 'critical';
  budget?: number;
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

interface ManagementReportingProps {
  employees: Employee[];
  projects: Project[];
  capacityData: CapacityData[];
  departments: Department[];
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

export const ManagementReporting: React.FC<ManagementReportingProps> = ({
  employees,
  projects,
  capacityData,
  departments
}) => {
  const [reportPeriod, setReportPeriod] = useState('month');
  const [selectedDepartment, setSelectedDepartment] = useState('all');

  // Executive Summary Metrics
  const executiveSummary = useMemo(() => {
    const totalEmployees = employees.length;
    const activeProjects = projects.filter(p => p.status === 'active').length;
    const completedProjects = projects.filter(p => p.status === 'completed').length;
    
    const avgUtilization = capacityData.length > 0 
      ? capacityData.reduce((sum, c) => sum + c.utilizationRate, 0) / capacityData.length 
      : 0;
    
    const totalCapacity = capacityData.reduce((sum, c) => sum + c.availableHours, 0);
    const totalAllocated = capacityData.reduce((sum, c) => sum + c.allocatedHours, 0);
    const totalBillableHours = totalAllocated;
    
    // Simulated revenue calculation
    const avgHourlyRate = 150; // $150/hour average
    const projectedRevenue = totalBillableHours * avgHourlyRate;
    
    const overutilizedEmployees = capacityData.filter(c => c.utilizationRate > 0.9).length;
    const underutilizedEmployees = capacityData.filter(c => c.utilizationRate < 0.6).length;
    
    return {
      totalEmployees,
      activeProjects,
      completedProjects,
      avgUtilization: avgUtilization * 100,
      totalCapacity,
      totalAllocated,
      totalBillableHours,
      projectedRevenue,
      overutilizedEmployees,
      underutilizedEmployees,
      projectCompletionRate: totalEmployees > 0 ? (completedProjects / (completedProjects + activeProjects)) * 100 : 0
    };
  }, [employees, projects, capacityData]);

  // Department Performance Analysis
  const departmentPerformance = useMemo(() => {
    return departments.map(dept => {
      const deptEmployees = employees.filter(emp => emp.departmentId === dept.id);
      const deptCapacity = capacityData.filter(cap => 
        deptEmployees.some(emp => emp.id.toString() === cap.employeeId)
      );
      
      const avgUtilization = deptCapacity.length > 0 
        ? deptCapacity.reduce((sum, cap) => sum + cap.utilizationRate, 0) / deptCapacity.length
        : 0;
      
      const totalCapacity = deptCapacity.reduce((sum, cap) => sum + cap.availableHours, 0);
      const totalAllocated = deptCapacity.reduce((sum, cap) => sum + cap.allocatedHours, 0);
      
      // Performance score based on utilization (optimal around 80%)
      const performanceScore = 100 - Math.abs(80 - (avgUtilization * 100));
      
      return {
        name: dept.name,
        employeeCount: deptEmployees.length,
        utilization: avgUtilization * 100,
        totalCapacity,
        totalAllocated,
        available: totalCapacity - totalAllocated,
        performanceScore: Math.max(0, performanceScore),
        revenue: totalAllocated * 150 // $150/hour
      };
    });
  }, [departments, employees, capacityData]);

  // Resource Utilization Trends
  const utilizationTrends = useMemo(() => {
    // Group by date and calculate daily utilization
    const dateGroups = capacityData.reduce((acc, cap) => {
      const date = cap.date.split('T')[0];
      if (!acc[date]) {
        acc[date] = [];
      }
      acc[date].push(cap);
      return acc;
    }, {} as Record<string, CapacityData[]>);

    return Object.entries(dateGroups)
      .map(([date, dayCapacity]) => ({
        date: format(new Date(date), 'MMM dd'),
        utilization: dayCapacity.reduce((sum, cap) => sum + cap.utilizationRate, 0) / dayCapacity.length * 100,
        capacity: dayCapacity.reduce((sum, cap) => sum + cap.availableHours, 0),
        allocated: dayCapacity.reduce((sum, cap) => sum + cap.allocatedHours, 0),
        revenue: dayCapacity.reduce((sum, cap) => sum + cap.allocatedHours, 0) * 150
      }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .slice(-14); // Last 14 days
  }, [capacityData]);

  // Project Performance Metrics
  const projectMetrics = useMemo(() => {
    const statusDistribution = projects.reduce((acc, project) => {
      acc[project.status] = (acc[project.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const priorityDistribution = projects.reduce((acc, project) => {
      acc[project.priority] = (acc[project.priority] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      statusData: Object.entries(statusDistribution).map(([status, count]) => ({
        name: status.charAt(0).toUpperCase() + status.slice(1),
        value: count,
        percentage: (count / projects.length) * 100
      })),
      priorityData: Object.entries(priorityDistribution).map(([priority, count]) => ({
        name: priority.charAt(0).toUpperCase() + priority.slice(1),
        value: count,
        percentage: (count / projects.length) * 100
      }))
    };
  }, [projects]);

  // Cost Analysis
  const costAnalysis = useMemo(() => {
    const totalSalaries = employees.reduce((sum, emp) => sum + (emp.salary || 75000), 0);
    const avgSalary = employees.length > 0 ? totalSalaries / employees.length : 0;
    const totalProjectBudget = projects.reduce((sum, proj) => sum + (proj.budget || 100000), 0);
    
    return {
      totalSalaries,
      avgSalary,
      totalProjectBudget,
      costPerHour: avgSalary / (40 * 52), // Annual salary to hourly rate
      projectedROI: ((executiveSummary.projectedRevenue - totalSalaries) / totalSalaries) * 100
    };
  }, [employees, projects, executiveSummary.projectedRevenue]);

  const exportReport = async (format: 'pdf' | 'excel') => {
    // This would generate and download the report
    console.log(`Exporting ${format} report...`);
    // Implementation would depend on your backend API
  };

  const getPerformanceColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Management Reporting</h2>
          <p className="text-gray-600 mt-1">Executive insights and resource analytics</p>
        </div>
        
        <div className="flex gap-3">
          <Select value={reportPeriod} onValueChange={setReportPeriod}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="week">This Week</SelectItem>
              <SelectItem value="month">This Month</SelectItem>
              <SelectItem value="quarter">This Quarter</SelectItem>
              <SelectItem value="year">This Year</SelectItem>
            </SelectContent>
          </Select>
          
          <Button variant="outline" onClick={() => exportReport('excel')}>
            Export Excel
          </Button>
          <Button variant="outline" onClick={() => exportReport('pdf')}>
            Export PDF
          </Button>
        </div>
      </div>

      {/* Executive Summary KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Avg Utilization</p>
                <p className="text-2xl font-bold">{executiveSummary.avgUtilization.toFixed(1)}%</p>
                <div className="flex items-center gap-1 mt-1">
                  <ArrowTrendingUpIcon className="h-3 w-3 text-green-600" />
                  <span className="text-xs text-green-600">+2.3% from last month</span>
                </div>
              </div>
              <div className="h-12 w-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <ClockIcon className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Projected Revenue</p>
                <p className="text-2xl font-bold">{formatCurrency(executiveSummary.projectedRevenue)}</p>
                <div className="flex items-center gap-1 mt-1">
                  <ArrowTrendingUpIcon className="h-3 w-3 text-green-600" />
                  <span className="text-xs text-green-600">+8.1% from last month</span>
                </div>
              </div>
              <div className="h-12 w-12 bg-green-100 rounded-lg flex items-center justify-center">
                <CurrencyDollarIcon className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Project Completion</p>
                <p className="text-2xl font-bold">{executiveSummary.projectCompletionRate.toFixed(0)}%</p>
                <div className="flex items-center gap-1 mt-1">
                  <ArrowTrendingDownIcon className="h-3 w-3 text-red-600" />
                  <span className="text-xs text-red-600">-1.2% from last month</span>
                </div>
              </div>
              <div className="h-12 w-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <DocumentChartBarIcon className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">ROI</p>
                <p className="text-2xl font-bold">{costAnalysis.projectedROI.toFixed(1)}%</p>
                <div className="flex items-center gap-1 mt-1">
                  <ArrowTrendingUpIcon className="h-3 w-3 text-green-600" />
                  <span className="text-xs text-green-600">+5.4% from last month</span>
                </div>
              </div>
              <div className="h-12 w-12 bg-orange-100 rounded-lg flex items-center justify-center">
                <ArrowTrendingUpIcon className="h-6 w-6 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="utilization" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="utilization">Utilization Trends</TabsTrigger>
          <TabsTrigger value="departments">Department Performance</TabsTrigger>
          <TabsTrigger value="projects">Project Analysis</TabsTrigger>
          <TabsTrigger value="financial">Financial Overview</TabsTrigger>
        </TabsList>

        <TabsContent value="utilization" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Resource Utilization Trends (14 days)</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <AreaChart data={utilizationTrends}>
                  <defs>
                    <linearGradient id="colorUtilization" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8884d8" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#8884d8" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip formatter={(value: any, name: string) => [
                    name === 'utilization' ? `${value.toFixed(1)}%` : 
                    name === 'revenue' ? formatCurrency(value) : `${value}h`,
                    name === 'utilization' ? 'Utilization' : 
                    name === 'revenue' ? 'Revenue' : 
                    name.charAt(0).toUpperCase() + name.slice(1)
                  ]} />
                  <Area 
                    type="monotone" 
                    dataKey="utilization" 
                    stroke="#8884d8" 
                    fillOpacity={1}
                    fill="url(#colorUtilization)" 
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="departments" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Department Performance Analysis</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {departmentPerformance.map(dept => (
                  <div key={dept.name} className="border rounded-lg p-4">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h4 className="font-semibold text-lg">{dept.name}</h4>
                        <p className="text-sm text-gray-600">{dept.employeeCount} employees</p>
                      </div>
                      <div className="text-right">
                        <Badge className={`${getPerformanceColor(dept.performanceScore)} bg-opacity-10`}>
                          Performance: {dept.performanceScore.toFixed(0)}%
                        </Badge>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-4 gap-4 text-sm">
                      <div>
                        <p className="text-gray-600">Utilization</p>
                        <p className="font-medium">{dept.utilization.toFixed(1)}%</p>
                      </div>
                      <div>
                        <p className="text-gray-600">Available Hours</p>
                        <p className="font-medium">{dept.available}h</p>
                      </div>
                      <div>
                        <p className="text-gray-600">Revenue</p>
                        <p className="font-medium">{formatCurrency(dept.revenue)}</p>
                      </div>
                      <div>
                        <p className="text-gray-600">Capacity</p>
                        <p className="font-medium">{dept.totalCapacity}h</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="projects" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Project Status Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={projectMetrics.statusData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percentage }) => `${name} (${percentage.toFixed(0)}%)`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {projectMetrics.statusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Priority Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={projectMetrics.priorityData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="value" fill="#8884d8" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="financial" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Cost Breakdown</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
                    <span className="font-medium">Total Salaries</span>
                    <span className="text-lg font-bold">{formatCurrency(costAnalysis.totalSalaries)}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
                    <span className="font-medium">Average Salary</span>
                    <span className="text-lg font-bold">{formatCurrency(costAnalysis.avgSalary)}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
                    <span className="font-medium">Project Budgets</span>
                    <span className="text-lg font-bold">{formatCurrency(costAnalysis.totalProjectBudget)}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-green-50 rounded">
                    <span className="font-medium text-green-700">Projected Revenue</span>
                    <span className="text-lg font-bold text-green-700">{formatCurrency(executiveSummary.projectedRevenue)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Revenue vs Cost Trend</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={utilizationTrends}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip formatter={(value: any) => formatCurrency(value)} />
                    <Legend />
                    <Line type="monotone" dataKey="revenue" stroke="#8884d8" strokeWidth={2} name="Daily Revenue" />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};