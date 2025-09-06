import React from 'react';
import { ErrorBoundary as ReactErrorBoundary } from 'react-error-boundary';
import { AlertTriangle, RefreshCw, Home, Bug } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/useToast';

interface ErrorInfo {
  componentStack: string;
}

interface EnhancedErrorFallbackProps {
  error: Error;
  resetErrorBoundary: () => void;
  errorInfo?: ErrorInfo;
}

function EnhancedErrorFallback({ error, resetErrorBoundary, errorInfo }: EnhancedErrorFallbackProps) {
  const { toast } = useToast();

  const handleReportError = () => {
    // In a real app, you'd send this to your error tracking service
    const errorReport = {
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo?.componentStack,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href,
    };
    
    console.error('Error Report:', errorReport);
    
    toast({
      title: 'Error Reported',
      description: 'Thank you for helping us improve. The error has been logged.',
      variant: 'success'
    });
  };

  const handleGoHome = () => {
    window.location.href = '/';
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50">
      <Card className="w-full max-w-2xl">
        <CardHeader className="text-center pb-4">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
            <AlertTriangle className="h-8 w-8 text-red-600" />
          </div>
          <CardTitle className="text-2xl font-semibold text-gray-900">
            Something went wrong
          </CardTitle>
          <p className="text-gray-600 mt-2">
            We encountered an unexpected error. Don't worry, this has been logged and we're working to fix it.
          </p>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Error Summary */}
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <h4 className="text-sm font-medium text-red-800 mb-2">Error Details</h4>
            <p className="text-sm text-red-700 font-mono break-words">
              {error.message || 'An unexpected error occurred'}
            </p>
          </div>

          {/* Development Mode Details */}
          {process.env.NODE_ENV === 'development' && (
            <details className="bg-gray-100 rounded-lg p-4">
              <summary className="cursor-pointer text-sm font-medium text-gray-700 hover:text-gray-900">
                🛠️ Development Details (Click to expand)
              </summary>
              <div className="mt-4 space-y-3">
                {error.stack && (
                  <div>
                    <h5 className="text-xs font-semibold text-gray-700 mb-1">Stack Trace:</h5>
                    <pre className="text-xs text-gray-600 bg-white p-2 rounded border overflow-auto max-h-40">
                      {error.stack}
                    </pre>
                  </div>
                )}
                {errorInfo?.componentStack && (
                  <div>
                    <h5 className="text-xs font-semibold text-gray-700 mb-1">Component Stack:</h5>
                    <pre className="text-xs text-gray-600 bg-white p-2 rounded border overflow-auto max-h-32">
                      {errorInfo.componentStack}
                    </pre>
                  </div>
                )}
              </div>
            </details>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3">
            <Button 
              onClick={resetErrorBoundary}
              className="flex items-center gap-2 flex-1"
            >
              <RefreshCw className="h-4 w-4" />
              Try Again
            </Button>
            
            <Button 
              variant="outline"
              onClick={handleGoHome}
              className="flex items-center gap-2 flex-1"
            >
              <Home className="h-4 w-4" />
              Go to Homepage
            </Button>
            
            <Button 
              variant="outline"
              onClick={handleReportError}
              className="flex items-center gap-2"
            >
              <Bug className="h-4 w-4" />
              Report Issue
            </Button>
          </div>

          {/* Help Text */}
          <div className="text-center text-sm text-gray-500">
            <p>
              If this error persists, please{' '}
              <button 
                onClick={handleReportError}
                className="text-blue-600 hover:text-blue-800 underline"
              >
                report it
              </button>
              {' '}or try refreshing the page.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

interface EnhancedErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ComponentType<EnhancedErrorFallbackProps>;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

export function EnhancedErrorBoundary({ 
  children, 
  fallback: FallbackComponent = EnhancedErrorFallback,
  onError
}: EnhancedErrorBoundaryProps) {
  return (
    <ReactErrorBoundary
      FallbackComponent={FallbackComponent}
      onError={(error, errorInfo) => {
        // Log error to console and monitoring service
        console.error('Enhanced Error Boundary caught an error:', {
          error,
          errorInfo,
          timestamp: new Date().toISOString(),
          url: window.location.href,
          userAgent: navigator.userAgent,
        });

        // In production, send to error tracking service
        if (process.env.NODE_ENV === 'production') {
          // Example: Sentry, LogRocket, Bugsnag, etc.
          // sendErrorToService(error, errorInfo);
        }

        // Call custom onError handler if provided
        onError?.(error, errorInfo);
      }}
      onReset={() => {
        // Clear any stale state that might have caused the error
        window.location.hash = '';
        
        // Clear localStorage if needed (be careful with this)
        // localStorage.removeItem('some-problematic-state');
        
        // Scroll to top
        window.scrollTo(0, 0);
      }}
    >
      {children}
    </ReactErrorBoundary>
  );
}

// Specific error boundary for forms
export function FormErrorBoundary({ children }: { children: React.ReactNode }) {
  return (
    <EnhancedErrorBoundary
      onError={(error) => {
        console.error('Form error:', error);
        // Could trigger a form-specific error handler
      }}
    >
      {children}
    </EnhancedErrorBoundary>
  );
}

// Specific error boundary for data fetching components
export function DataErrorBoundary({ children }: { children: React.ReactNode }) {
  return (
    <EnhancedErrorBoundary
      onError={(error) => {
        console.error('Data fetching error:', error);
        // Could trigger a data refresh or cache clear
      }}
    >
      {children}
    </EnhancedErrorBoundary>
  );
}

export default EnhancedErrorBoundary;