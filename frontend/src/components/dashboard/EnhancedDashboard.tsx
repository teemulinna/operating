import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  BarElement,
  ArcElement,
  Filler
} from 'chart.js';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  UsersIcon, 
  ChartBarIcon, 
  ClockIcon, 
  TrendingUpIcon,
  TrendingDownIcon,
  EyeIcon,
  CalendarDaysIcon,
  BellIcon,
  FilterIcon,
  ArrowUpRightIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import { cn } from '@/lib/utils';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  BarElement,
  ArcElement,
  Filler
);

interface DashboardData {
  employees: any[];
  projects: any[];
  capacityData: any[];
  recentActivity: any[];
  metrics: {
    totalEmployees: number;
    activeProjects: number;
    avgUtilization: number;
    criticalIssues: number;
    completedTasks: number;
    pendingTasks: number;
  };
}

interface EnhancedDashboardProps {
  data: DashboardData;
  onNavigate?: (section: string) => void;
}

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
  hover: { y: -4, transition: { type: "spring", stiffness: 300 } }
};

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};

const MetricCard: React.FC<{
  title: string;
  value: string | number;
  change: number;
  icon: React.ElementType;
  variant?: 'default' | 'success' | 'warning' | 'danger';
  onClick?: () => void;
}> = ({ title, value, change, icon: Icon, variant = 'default', onClick }) => {
  const isPositive = change >= 0;
  
  const variantClasses = {
    default: 'from-blue-500 to-blue-600',
    success: 'from-emerald-500 to-emerald-600',
    warning: 'from-amber-500 to-amber-600',
    danger: 'from-red-500 to-red-600'
  };

  return (
    <motion.div variants={cardVariants} whileHover="hover">
      <Card 
        variant="gradient" 
        className={cn(
          "cursor-pointer overflow-hidden relative",
          onClick && "hover:shadow-xl"
        )}
        onClick={onClick}
      >
        <div className={cn(
          "absolute inset-0 bg-gradient-to-br opacity-10",
          variantClasses[variant]
        )} />
        
        <CardContent className="p-6 relative">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-600 mb-1">{title}</p>
              <p className="text-3xl font-bold text-gray-900 mb-2">
                {typeof value === 'number' ? value.toLocaleString() : value}
              </p>
              <div className="flex items-center gap-1">
                {isPositive ? (
                  <TrendingUpIcon className="h-4 w-4 text-emerald-600" />
                ) : (
                  <TrendingDownIcon className="h-4 w-4 text-red-600" />
                )}
                <span className={cn(
                  "text-xs font-medium",
                  isPositive ? "text-emerald-600" : "text-red-600"
                )}>
                  {isPositive ? '+' : ''}{change}%
                </span>
                <span className="text-xs text-gray-500">vs last period</span>
              </div>
            </div>
            <div className={cn(
              "w-12 h-12 rounded-xl flex items-center justify-center bg-gradient-to-br",
              variantClasses[variant]
            )}>
              <Icon className="h-6 w-6 text-white" />
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

const ActivityItem: React.FC<{
  activity: {
    type: 'project' | 'employee' | 'assignment' | 'alert';
    title: string;
    description: string;
    timestamp: string;
    status?: 'success' | 'warning' | 'error';
  };
}> = ({ activity }) => {
  const statusColors = {
    success: 'text-emerald-600 bg-emerald-100',
    warning: 'text-amber-600 bg-amber-100',
    error: 'text-red-600 bg-red-100'
  };

  const typeIcons = {
    project: CalendarDaysIcon,
    employee: UsersIcon,
    assignment: ChartBarIcon,
    alert: BellIcon
  };

  const Icon = typeIcons[activity.type];

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      className="flex items-center gap-4 p-4 rounded-xl hover:bg-gray-50 transition-colors"
    >
      <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
        <Icon className="h-5 w-5 text-gray-600" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="font-medium text-gray-900 truncate">{activity.title}</p>
          {activity.status && (
            <Badge className={cn("text-xs", statusColors[activity.status])}>
              {activity.status}
            </Badge>
          )}
        </div>
        <p className="text-sm text-gray-600 truncate">{activity.description}</p>
        <p className="text-xs text-gray-500 mt-1">{activity.timestamp}</p>
      </div>
    </motion.div>
  );
};

export const EnhancedDashboard: React.FC<EnhancedDashboardProps> = ({ 
  data, 
  onNavigate 
}) => {
  const [selectedPeriod, setSelectedPeriod] = useState<'7d' | '30d' | '90d'>('30d');
  
  // Chart data
  const utilizationChartData = useMemo(() => {
    const labels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    return {
      labels,
      datasets: [
        {
          label: 'Team Utilization',
          data: [85, 92, 88, 95, 90, 60, 45],
          borderColor: 'rgb(59, 130, 246)',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          borderWidth: 3,
          fill: true,
          tension: 0.4,
          pointBackgroundColor: 'rgb(59, 130, 246)',
          pointBorderColor: 'white',
          pointBorderWidth: 2,
          pointRadius: 6,
          pointHoverRadius: 8,
        }
      ]
    };
  }, [selectedPeriod]);

  const projectStatusData = useMemo(() => ({
    labels: ['Completed', 'In Progress', 'Planning', 'On Hold'],
    datasets: [
      {
        data: [45, 30, 15, 10],
        backgroundColor: [
          'rgba(34, 197, 94, 0.8)',
          'rgba(59, 130, 246, 0.8)',
          'rgba(251, 191, 36, 0.8)',
          'rgba(239, 68, 68, 0.8)',
        ],
        borderColor: [
          'rgb(34, 197, 94)',
          'rgb(59, 130, 246)',
          'rgb(251, 191, 36)',
          'rgb(239, 68, 68)',
        ],
        borderWidth: 2,
        cutout: '65%',
      }
    ]
  }), []);

  const workloadData = useMemo(() => ({
    labels: ['Design', 'Development', 'Testing', 'Project Management', 'Research'],
    datasets: [
      {
        label: 'Hours Allocated',
        data: [120, 280, 90, 150, 80],
        backgroundColor: 'rgba(59, 130, 246, 0.8)',
        borderColor: 'rgb(59, 130, 246)',
        borderWidth: 2,
        borderRadius: 8,
        borderSkipped: false,
      }
    ]
  }), []);

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleColor: 'white',
        bodyColor: 'white',
        borderColor: 'rgba(255, 255, 255, 0.1)',
        borderWidth: 1,
        cornerRadius: 8,
        padding: 12,
      },
    },
    scales: {
      x: {
        grid: {
          display: false,
        },
        border: {
          display: false,
        },
      },
      y: {
        grid: {
          color: 'rgba(0, 0, 0, 0.05)',
        },
        border: {
          display: false,
        },
        beginAtZero: true,
      },
    },
  };

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: {
          padding: 20,
          usePointStyle: true,
          font: {
            size: 12,
          },
        },
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleColor: 'white',
        bodyColor: 'white',
        borderColor: 'rgba(255, 255, 255, 0.1)',
        borderWidth: 1,
        cornerRadius: 8,
        padding: 12,
      },
    },
  };

  const recentActivities = [
    {
      type: 'project' as const,
      title: 'Mobile App Redesign',
      description: 'Project milestone completed',
      timestamp: '2 hours ago',
      status: 'success' as const
    },
    {
      type: 'employee' as const,
      title: 'Sarah Johnson',
      description: 'Capacity updated to 85%',
      timestamp: '4 hours ago'
    },
    {
      type: 'assignment' as const,
      title: 'New Task Assignment',
      description: 'UI/UX Design task assigned to Alex Chen',
      timestamp: '6 hours ago'
    },
    {
      type: 'alert' as const,
      title: 'Over-allocation Warning',
      description: 'Development team at 110% capacity',
      timestamp: '1 day ago',
      status: 'warning' as const
    }
  ];

  return (
    <div className="space-y-8 p-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4"
      >
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Resource Dashboard</h1>
          <p className="text-gray-600 mt-1">
            Monitor team capacity, project progress, and resource allocation
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="flex rounded-lg border border-gray-200 bg-gray-50 p-1">
            {(['7d', '30d', '90d'] as const).map((period) => (
              <button
                key={period}
                onClick={() => setSelectedPeriod(period)}
                className={cn(
                  "px-3 py-1.5 rounded-md text-sm font-medium transition-all",
                  selectedPeriod === period
                    ? "bg-white text-gray-900 shadow-sm"
                    : "text-gray-600 hover:text-gray-900"
                )}
              >
                {period}
              </button>
            ))}
          </div>
          <Button variant="outline" leftIcon={<FilterIcon className="h-4 w-4" />}>
            Filter
          </Button>
          <Button variant="outline" leftIcon={<EyeIcon className="h-4 w-4" />}>
            View All
          </Button>
        </div>
      </motion.div>

      {/* Key Metrics */}
      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6"
      >
        <MetricCard
          title="Total Resources"
          value={data.metrics.totalEmployees}
          change={8.2}
          icon={UsersIcon}
          variant="default"
          onClick={() => onNavigate?.('employees')}
        />
        <MetricCard
          title="Active Projects"
          value={data.metrics.activeProjects}
          change={12.5}
          icon={CalendarDaysIcon}
          variant="success"
          onClick={() => onNavigate?.('projects')}
        />
        <MetricCard
          title="Avg Utilization"
          value={`${(data.metrics.avgUtilization * 100).toFixed(1)}%`}
          change={-2.1}
          icon={ChartBarIcon}
          variant="warning"
        />
        <MetricCard
          title="Critical Issues"
          value={data.metrics.criticalIssues}
          change={-15.3}
          icon={ExclamationTriangleIcon}
          variant="danger"
          onClick={() => onNavigate?.('conflicts')}
        />
      </motion.div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Charts Section */}
        <div className="lg:col-span-2 space-y-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Card variant="elevated">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Team Utilization Trend</CardTitle>
                    <CardDescription>
                      Weekly capacity utilization across all resources
                    </CardDescription>
                  </div>
                  <Button variant="ghost" size="sm" leftIcon={<ArrowUpRightIcon className="h-4 w-4" />}>
                    Details
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <Line data={utilizationChartData} options={chartOptions} />
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <Card variant="elevated">
              <CardHeader>
                <CardTitle>Workload Distribution</CardTitle>
                <CardDescription>
                  Hours allocated by skill category
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <Bar data={workloadData} options={chartOptions} />
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Project Status */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5 }}
          >
            <Card variant="gradient">
              <CardHeader>
                <CardTitle>Project Status</CardTitle>
                <CardDescription>
                  Current project distribution
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-60">
                  <Doughnut data={projectStatusData} options={doughnutOptions} />
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Recent Activity */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.6 }}
          >
            <Card variant="elevated">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Recent Activity</CardTitle>
                    <CardDescription>
                      Latest updates and changes
                    </CardDescription>
                  </div>
                  <Button variant="ghost" size="sm">
                    View All
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="max-h-80 overflow-y-auto scrollbar-thin">
                  {recentActivities.map((activity, index) => (
                    <ActivityItem key={index} activity={activity} />
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Quick Actions */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.7 }}
          >
            <Card variant="glass">
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
                <CardDescription>
                  Frequently used operations
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button 
                  variant="outline" 
                  className="w-full justify-start" 
                  leftIcon={<UsersIcon className="h-4 w-4" />}
                  onClick={() => onNavigate?.('employees')}
                >
                  Add New Employee
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full justify-start"
                  leftIcon={<CalendarDaysIcon className="h-4 w-4" />}
                  onClick={() => onNavigate?.('projects')}
                >
                  Create Project
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full justify-start"
                  leftIcon={<ChartBarIcon className="h-4 w-4" />}
                >
                  Generate Report
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full justify-start"
                  leftIcon={<CheckCircleIcon className="h-4 w-4" />}
                >
                  Review Assignments
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </div>
  );
};