import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { performanceTracker, usePerformanceMetrics } from '@/hooks/usePerformanceMetrics';
import { Monitor, Zap, Clock, Memory, TrendingUp, AlertTriangle } from 'lucide-react';

interface MetricCardProps {
  title: string;
  value: string;
  icon: React.ReactNode;
  status: 'good' | 'warning' | 'critical';
  description?: string;
}

const MetricCard: React.FC<MetricCardProps> = ({ title, value, icon, status, description }) => {
  const statusColors = {
    good: 'border-green-200 bg-green-50',
    warning: 'border-yellow-200 bg-yellow-50',
    critical: 'border-red-200 bg-red-50'
  };

  const iconColors = {
    good: 'text-green-600',
    warning: 'text-yellow-600',
    critical: 'text-red-600'
  };

  return (
    <Card className={`${statusColors[status]} border-2`}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">{title}</p>
            <p className="text-2xl font-bold text-gray-900">{value}</p>
            {description && (
              <p className="text-xs text-gray-500 mt-1">{description}</p>
            )}
          </div>
          <div className={`${iconColors[status]}`}>
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export const PerformanceDashboard: React.FC = () => {
  const metrics = usePerformanceMetrics('PerformanceDashboard', {
    trackRenders: true,
    trackMemory: true,
    trackWebVitals: true
  });

  const [bundleSize, setBundleSize] = useState<number | null>(null);
  const [networkLatency, setNetworkLatency] = useState<number | null>(null);
  const [allMetrics, setAllMetrics] = useState<Map<string, any>>(new Map());

  // Monitor bundle size
  useEffect(() => {
    // Estimate bundle size from navigation timing
    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    if (navigation && navigation.transferSize) {
      setBundleSize(Math.round(navigation.transferSize / 1024)); // Convert to KB
    }
  }, []);

  // Monitor network latency
  useEffect(() => {
    const measureLatency = async () => {
      try {
        const start = performance.now();
        await fetch('/api/health', { method: 'HEAD' });
        const end = performance.now();
        setNetworkLatency(Math.round(end - start));
      } catch (error) {
        console.warn('Network latency measurement failed:', error);
      }
    };

    measureLatency();
    const interval = setInterval(measureLatency, 30000); // Check every 30 seconds
    return () => clearInterval(interval);
  }, []);

  // Refresh global metrics
  const refreshMetrics = () => {
    setAllMetrics(new Map(performanceTracker.getMetrics()));
  };

  useEffect(() => {
    refreshMetrics();
    const interval = setInterval(refreshMetrics, 5000); // Refresh every 5 seconds
    return () => clearInterval(interval);
  }, []);

  // Performance status evaluation
  const getPerformanceStatus = (value: number, thresholds: { good: number; warning: number }) => {
    if (value <= thresholds.good) return 'good';
    if (value <= thresholds.warning) return 'warning';
    return 'critical';
  };

  const renderTimeStatus = getPerformanceStatus(metrics.renderTime, { good: 16, warning: 50 });
  const fcpStatus = getPerformanceStatus(metrics.firstContentfulPaint || 0, { good: 1800, warning: 3000 });
  const lcpStatus = getPerformanceStatus(metrics.largestContentfulPaint || 0, { good: 2500, warning: 4000 });
  const memoryStatus = getPerformanceStatus(metrics.memoryUsage || 0, { good: 50, warning: 100 });

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Monitor className="h-5 w-5" />
            <span>Performance Dashboard</span>
          </CardTitle>
          <div className="flex items-center space-x-2">
            <Button onClick={refreshMetrics} size="sm" variant="outline">
              Refresh Metrics
            </Button>
            <Button 
              onClick={() => performanceTracker.clearMetrics()} 
              size="sm" 
              variant="outline"
            >
              Clear Data
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Render Performance */}
            <MetricCard
              title="Render Time"
              value={`${metrics.renderTime.toFixed(1)}ms`}
              icon={<Clock className="h-6 w-6" />}
              status={renderTimeStatus}
              description="Component render duration"
            />

            {/* First Contentful Paint */}
            <MetricCard
              title="First Paint"
              value={metrics.firstContentfulPaint ? `${Math.round(metrics.firstContentfulPaint)}ms` : 'N/A'}
              icon={<Zap className="h-6 w-6" />}
              status={fcpStatus}
              description="Time to first contentful paint"
            />

            {/* Largest Contentful Paint */}
            <MetricCard
              title="Largest Paint"
              value={metrics.largestContentfulPaint ? `${Math.round(metrics.largestContentfulPaint)}ms` : 'N/A'}
              icon={<TrendingUp className="h-6 w-6" />}
              status={lcpStatus}
              description="Largest contentful paint time"
            />

            {/* Memory Usage */}
            <MetricCard
              title="Memory Usage"
              value={metrics.memoryUsage ? `${metrics.memoryUsage.toFixed(1)}MB` : 'N/A'}
              icon={<Memory className="h-6 w-6" />}
              status={memoryStatus}
              description="JavaScript heap size"
            />

            {/* Bundle Size */}
            <MetricCard
              title="Bundle Size"
              value={bundleSize ? `${bundleSize}KB` : 'N/A'}
              icon={<TrendingUp className="h-6 w-6" />}
              status={bundleSize ? (bundleSize < 500 ? 'good' : bundleSize < 1000 ? 'warning' : 'critical') : 'good'}
              description="Initial bundle transfer size"
            />

            {/* Network Latency */}
            <MetricCard
              title="API Latency"
              value={networkLatency ? `${networkLatency}ms` : 'N/A'}
              icon={<Zap className="h-6 w-6" />}
              status={networkLatency ? (networkLatency < 100 ? 'good' : networkLatency < 300 ? 'warning' : 'critical') : 'good'}
              description="API response time"
            />

            {/* Cumulative Layout Shift */}
            <MetricCard
              title="Layout Shift"
              value={metrics.cumulativeLayoutShift ? metrics.cumulativeLayoutShift.toFixed(3) : '0.000'}
              icon={<AlertTriangle className="h-6 w-6" />}
              status={getPerformanceStatus(metrics.cumulativeLayoutShift || 0, { good: 0.1, warning: 0.25 })}
              description="Visual stability score"
            />

            {/* Component Rerenders */}
            <MetricCard
              title="Rerenders"
              value={`${metrics.rerenders}`}
              icon={<TrendingUp className="h-6 w-6" />}
              status={metrics.rerenders < 5 ? 'good' : metrics.rerenders < 15 ? 'warning' : 'critical'}
              description="Component update count"
            />
          </div>
        </CardContent>
      </Card>

      {/* Detailed Component Metrics */}
      {allMetrics.size > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Component Performance Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Array.from(allMetrics.entries()).map(([componentName, componentMetrics]) => (
                <div key={componentName} className="border rounded-lg p-4 bg-gray-50">
                  <h4 className="font-semibold text-gray-900 mb-2">{componentName}</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">Render:</span>
                      <span className="ml-2 font-medium">{componentMetrics.renderTime?.toFixed(2) || '0'}ms</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Mounts:</span>
                      <span className="ml-2 font-medium">{componentMetrics.componentMounts || 0}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Rerenders:</span>
                      <span className="ml-2 font-medium">{componentMetrics.rerenders || 0}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Memory:</span>
                      <span className="ml-2 font-medium">
                        {componentMetrics.memoryUsage ? `${componentMetrics.memoryUsage.toFixed(1)}MB` : 'N/A'}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Performance Recommendations */}
      <Card>
        <CardHeader>
          <CardTitle>Performance Recommendations</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {metrics.renderTime > 16 && (
              <div className="flex items-start space-x-2 text-amber-700 bg-amber-50 p-3 rounded-lg">
                <AlertTriangle className="h-5 w-5 mt-0.5" />
                <div>
                  <p className="font-medium">Slow Component Rendering</p>
                  <p className="text-sm">Component is taking {metrics.renderTime.toFixed(2)}ms to render. Consider using React.memo or optimizing expensive calculations.</p>
                </div>
              </div>
            )}
            
            {metrics.rerenders > 10 && (
              <div className="flex items-start space-x-2 text-amber-700 bg-amber-50 p-3 rounded-lg">
                <AlertTriangle className="h-5 w-5 mt-0.5" />
                <div>
                  <p className="font-medium">Excessive Rerenders</p>
                  <p className="text-sm">Component has rerendered {metrics.rerenders} times. Check for unnecessary state updates or missing dependencies.</p>
                </div>
              </div>
            )}

            {(metrics.memoryUsage || 0) > 100 && (
              <div className="flex items-start space-x-2 text-red-700 bg-red-50 p-3 rounded-lg">
                <AlertTriangle className="h-5 w-5 mt-0.5" />
                <div>
                  <p className="font-medium">High Memory Usage</p>
                  <p className="text-sm">Memory usage is at {metrics.memoryUsage?.toFixed(1)}MB. Check for memory leaks or large object retention.</p>
                </div>
              </div>
            )}

            {bundleSize && bundleSize > 1000 && (
              <div className="flex items-start space-x-2 text-red-700 bg-red-50 p-3 rounded-lg">
                <AlertTriangle className="h-5 w-5 mt-0.5" />
                <div>
                  <p className="font-medium">Large Bundle Size</p>
                  <p className="text-sm">Bundle size is {bundleSize}KB. Consider code splitting or removing unused dependencies.</p>
                </div>
              </div>
            )}

            {(metrics.cumulativeLayoutShift || 0) > 0.1 && (
              <div className="flex items-start space-x-2 text-amber-700 bg-amber-50 p-3 rounded-lg">
                <AlertTriangle className="h-5 w-5 mt-0.5" />
                <div>
                  <p className="font-medium">Layout Instability</p>
                  <p className="text-sm">CLS score is {metrics.cumulativeLayoutShift?.toFixed(3)}. Optimize layout shifts by reserving space for dynamic content.</p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PerformanceDashboard;