import React, { Component, ErrorInfo } from 'react';
import { AlertTriangle, RefreshCw, Bug, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface ErrorInfo {
  message: string;
  stack?: string;
  componentStack?: string;
  timestamp: Date;
  userAgent: string;
  url: string;
  userId?: string;
}

class ErrorTracker {
  private static instance: ErrorTracker;
  private errors: ErrorInfo[] = [];
  private maxErrors = 100;

  static getInstance(): ErrorTracker {
    if (!ErrorTracker.instance) {
      ErrorTracker.instance = new ErrorTracker();
    }
    return ErrorTracker.instance;
  }

  captureError(error: Error, errorInfo?: any, context?: any) {
    const errorData: ErrorInfo = {
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo?.componentStack,
      timestamp: new Date(),
      userAgent: navigator.userAgent,
      url: window.location.href,
      userId: context?.userId
    };

    this.errors.unshift(errorData);
    
    // Keep only the latest errors
    if (this.errors.length > this.maxErrors) {
      this.errors = this.errors.slice(0, this.maxErrors);
    }

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('🚨 Error captured:', errorData);
    }

    // Send to monitoring service in production
    if (process.env.NODE_ENV === 'production') {
      this.sendToMonitoringService(errorData);
    }
  }

  private async sendToMonitoringService(errorData: ErrorInfo) {
    try {
      // In a real application, you would send this to services like:
      // - Sentry
      // - LogRocket
      // - Bugsnag
      // - Custom monitoring endpoint
      
      const response = await fetch('/api/errors', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(errorData),
      });

      if (!response.ok) {
        console.error('Failed to send error to monitoring service');
      }
    } catch (err) {
      console.error('Error sending to monitoring service:', err);
    }
  }

  getErrors(): ErrorInfo[] {
    return this.errors;
  }

  clearErrors() {
    this.errors = [];
  }

  getErrorStats() {
    const now = new Date();
    const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const lastHour = new Date(now.getTime() - 60 * 60 * 1000);

    return {
      total: this.errors.length,
      last24h: this.errors.filter(e => e.timestamp > last24h).length,
      lastHour: this.errors.filter(e => e.timestamp > lastHour).length,
      mostCommon: this.getMostCommonErrors(),
    };
  }

  private getMostCommonErrors() {
    const errorCounts = this.errors.reduce((acc, error) => {
      acc[error.message] = (acc[error.message] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(errorCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([message, count]) => ({ message, count }));
  }
}

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ComponentType<{ error: Error; retry: () => void }>;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  private errorTracker = ErrorTracker.getInstance();

  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ errorInfo });
    
    // Track the error
    this.errorTracker.captureError(error, errorInfo);
    
    // Call custom error handler
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
  };

  render() {
    if (this.state.hasError) {
      const FallbackComponent = this.props.fallback || DefaultErrorFallback;
      return (
        <FallbackComponent 
          error={this.state.error!} 
          retry={this.handleRetry}
        />
      );
    }

    return this.props.children;
  }
}

interface ErrorFallbackProps {
  error: Error;
  retry: () => void;
}

const DefaultErrorFallback: React.FC<ErrorFallbackProps> = ({ error, retry }) => (
  <Card className="max-w-2xl mx-auto mt-8 border-red-200 bg-red-50">
    <CardHeader>
      <CardTitle className="flex items-center space-x-2 text-red-800">
        <AlertTriangle className="h-5 w-5" />
        <span>Something went wrong</span>
      </CardTitle>
    </CardHeader>
    <CardContent>
      <div className="space-y-4">
        <p className="text-red-700">
          We're sorry, but something unexpected happened. The error has been logged and our team has been notified.
        </p>
        
        {process.env.NODE_ENV === 'development' && (
          <details className="bg-white rounded border p-4">
            <summary className="font-medium cursor-pointer">Error Details (Development Only)</summary>
            <pre className="mt-2 text-sm text-red-600 whitespace-pre-wrap overflow-auto">
              {error.message}
              {error.stack && `\n\nStack trace:\n${error.stack}`}
            </pre>
          </details>
        )}

        <div className="flex space-x-2">
          <Button onClick={retry} className="flex items-center space-x-2">
            <RefreshCw className="h-4 w-4" />
            <span>Try Again</span>
          </Button>
          <Button 
            variant="outline" 
            onClick={() => window.location.reload()}
            className="flex items-center space-x-2"
          >
            <RefreshCw className="h-4 w-4" />
            <span>Reload Page</span>
          </Button>
        </div>
      </div>
    </CardContent>
  </Card>
);

// Error Dashboard Component
export const ErrorDashboard: React.FC = () => {
  const [errors, setErrors] = React.useState<ErrorInfo[]>([]);
  const [stats, setStats] = React.useState<any>({});
  const errorTracker = ErrorTracker.getInstance();

  const refreshData = () => {
    setErrors(errorTracker.getErrors());
    setStats(errorTracker.getErrorStats());
  };

  React.useEffect(() => {
    refreshData();
    const interval = setInterval(refreshData, 5000);
    return () => clearInterval(interval);
  }, []);

  const clearErrors = () => {
    errorTracker.clearErrors();
    refreshData();
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Bug className="h-5 w-5" />
            <span>Error Tracking Dashboard</span>
          </CardTitle>
          <div className="flex space-x-2">
            <Button onClick={refreshData} size="sm" variant="outline">
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            <Button onClick={clearErrors} size="sm" variant="outline">
              Clear All
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-gray-50 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-gray-900">{stats.total || 0}</div>
              <div className="text-sm text-gray-600">Total Errors</div>
            </div>
            <div className="bg-red-50 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-red-600">{stats.last24h || 0}</div>
              <div className="text-sm text-gray-600">Last 24 Hours</div>
            </div>
            <div className="bg-orange-50 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-orange-600">{stats.lastHour || 0}</div>
              <div className="text-sm text-gray-600">Last Hour</div>
            </div>
            <div className="bg-blue-50 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-blue-600">
                {stats.mostCommon?.length || 0}
              </div>
              <div className="text-sm text-gray-600">Unique Errors</div>
            </div>
          </div>

          {stats.mostCommon && stats.mostCommon.length > 0 && (
            <div className="mb-6">
              <h3 className="font-semibold mb-3">Most Common Errors</h3>
              <div className="space-y-2">
                {stats.mostCommon.map((error: any, index: number) => (
                  <div key={index} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                    <span className="text-sm truncate">{error.message}</span>
                    <span className="text-sm font-medium text-red-600">{error.count}x</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {errors.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recent Errors</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 max-h-96 overflow-auto">
              {errors.slice(0, 10).map((error, index) => (
                <div key={index} className="border rounded-lg p-4 bg-gray-50">
                  <div className="flex items-start justify-between mb-2">
                    <div className="font-medium text-red-700 truncate flex-1">
                      {error.message}
                    </div>
                    <div className="flex items-center text-xs text-gray-500 ml-4">
                      <Clock className="h-3 w-3 mr-1" />
                      {error.timestamp.toLocaleString()}
                    </div>
                  </div>
                  
                  <div className="text-sm text-gray-600 mb-2">
                    <strong>URL:</strong> {error.url}
                  </div>
                  
                  {error.stack && (
                    <details className="text-xs">
                      <summary className="cursor-pointer font-medium">Stack Trace</summary>
                      <pre className="mt-2 p-2 bg-white rounded border whitespace-pre-wrap overflow-auto max-h-32">
                        {error.stack}
                      </pre>
                    </details>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {errors.length === 0 && (
        <Card>
          <CardContent className="p-8 text-center text-gray-500">
            <Bug className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <h3 className="text-lg font-medium mb-2">No errors tracked</h3>
            <p>Great! No errors have been captured recently.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

// Global error handler for unhandled promise rejections and errors
export const initializeErrorTracking = () => {
  const errorTracker = ErrorTracker.getInstance();

  // Handle unhandled promise rejections
  window.addEventListener('unhandledrejection', (event) => {
    errorTracker.captureError(
      new Error(event.reason?.message || 'Unhandled Promise Rejection'),
      { componentStack: 'Global Promise Handler' },
      { type: 'unhandledrejection' }
    );
  });

  // Handle global JavaScript errors
  window.addEventListener('error', (event) => {
    errorTracker.captureError(
      new Error(event.message),
      { componentStack: `${event.filename}:${event.lineno}:${event.colno}` },
      { type: 'javascript' }
    );
  });
};

export { ErrorTracker };