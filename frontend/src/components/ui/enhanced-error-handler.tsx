import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ExclamationTriangleIcon,
  XCircleIcon,
  InformationCircleIcon,
  CheckCircleIcon,
  ArrowPathIcon,
  XMarkIcon,
  ChevronDownIcon,
  BugAntIcon,
  CloudArrowDownIcon
} from '@heroicons/react/24/outline';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface ErrorDetails {
  code?: string;
  timestamp?: string;
  request?: string;
  stack?: string;
  context?: Record<string, any>;
}

interface EnhancedErrorProps {
  error: Error | string;
  type?: 'error' | 'warning' | 'info' | 'success';
  title?: string;
  description?: string;
  details?: ErrorDetails;
  actions?: Array<{
    label: string;
    variant?: 'default' | 'outline' | 'ghost';
    onClick: () => void;
    loading?: boolean;
  }>;
  onClose?: () => void;
  onRetry?: () => void;
  retryLoading?: boolean;
  showDetails?: boolean;
  persistent?: boolean;
  className?: string;
}

const errorTypeConfig = {
  error: {
    icon: XCircleIcon,
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
    iconColor: 'text-red-600',
    titleColor: 'text-red-900',
    descColor: 'text-red-700'
  },
  warning: {
    icon: ExclamationTriangleIcon,
    bgColor: 'bg-amber-50',
    borderColor: 'border-amber-200',
    iconColor: 'text-amber-600',
    titleColor: 'text-amber-900',
    descColor: 'text-amber-700'
  },
  info: {
    icon: InformationCircleIcon,
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    iconColor: 'text-blue-600',
    titleColor: 'text-blue-900',
    descColor: 'text-blue-700'
  },
  success: {
    icon: CheckCircleIcon,
    bgColor: 'bg-emerald-50',
    borderColor: 'border-emerald-200',
    iconColor: 'text-emerald-600',
    titleColor: 'text-emerald-900',
    descColor: 'text-emerald-700'
  }
};

export const EnhancedErrorHandler: React.FC<EnhancedErrorProps> = ({
  error,
  type = 'error',
  title,
  description,
  details,
  actions = [],
  onClose,
  onRetry,
  retryLoading = false,
  showDetails = false,
  persistent = false,
  className
}) => {
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  
  const config = errorTypeConfig[type];
  const Icon = config.icon;
  
  const errorMessage = error instanceof Error ? error.message : error;
  const errorTitle = title || `${type.charAt(0).toUpperCase()}${type.slice(1)} occurred`;
  
  const handleClose = () => {
    if (onClose) {
      onClose();
    } else if (!persistent) {
      setIsVisible(false);
    }
  };

  const formatErrorDetails = () => {
    if (!details) return null;
    
    return (
      <div className="space-y-3 text-sm">
        {details.code && (
          <div className="flex justify-between">
            <span className="font-medium text-gray-600">Error Code:</span>
            <Badge variant="outline">{details.code}</Badge>
          </div>
        )}
        {details.timestamp && (
          <div className="flex justify-between">
            <span className="font-medium text-gray-600">Time:</span>
            <span className="text-gray-900">{new Date(details.timestamp).toLocaleString()}</span>
          </div>
        )}
        {details.request && (
          <div className="flex justify-between">
            <span className="font-medium text-gray-600">Request:</span>
            <code className="text-xs bg-gray-100 px-2 py-1 rounded">{details.request}</code>
          </div>
        )}
        {details.context && Object.keys(details.context).length > 0 && (
          <div className="space-y-2">
            <span className="font-medium text-gray-600">Context:</span>
            <div className="bg-gray-50 p-3 rounded-lg">
              <pre className="text-xs text-gray-700 whitespace-pre-wrap">
                {JSON.stringify(details.context, null, 2)}
              </pre>
            </div>
          </div>
        )}
        {details.stack && (
          <div className="space-y-2">
            <span className="font-medium text-gray-600">Stack Trace:</span>
            <div className="bg-gray-900 text-green-400 p-3 rounded-lg max-h-32 overflow-y-auto scrollbar-thin">
              <pre className="text-xs whitespace-pre-wrap font-mono">
                {details.stack}
              </pre>
            </div>
          </div>
        )}
      </div>
    );
  };

  if (!isVisible) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -10, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -10, scale: 0.95 }}
        transition={{ type: "spring", stiffness: 300, damping: 25 }}
        className={cn("w-full", className)}
      >
        <Card 
          variant="outline"
          className={cn(
            "overflow-hidden",
            config.bgColor,
            config.borderColor
          )}
        >
          <CardContent className="p-6">
            {/* Header */}
            <div className="flex items-start gap-4">
              <div className={cn("flex-shrink-0 mt-1", config.iconColor)}>
                <Icon className="h-6 w-6" />
              </div>
              
              <div className="flex-1 min-w-0">
                {/* Title and Close Button */}
                <div className="flex items-start justify-between gap-4 mb-2">
                  <h3 className={cn("text-lg font-semibold", config.titleColor)}>
                    {errorTitle}
                  </h3>
                  {(onClose || !persistent) && (
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={handleClose}
                      className="flex-shrink-0 opacity-70 hover:opacity-100"
                    >
                      <XMarkIcon className="h-4 w-4" />
                    </Button>
                  )}
                </div>

                {/* Description */}
                <p className={cn("text-sm mb-4", config.descColor)}>
                  {description || errorMessage}
                </p>

                {/* Actions */}
                {(actions.length > 0 || onRetry || (details && showDetails)) && (
                  <div className="flex flex-wrap items-center gap-3 mb-4">
                    {onRetry && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={onRetry}
                        loading={retryLoading}
                        leftIcon={!retryLoading ? <ArrowPathIcon className="h-4 w-4" /> : undefined}
                        className="bg-white/50 hover:bg-white/80"
                      >
                        {retryLoading ? 'Retrying...' : 'Try Again'}
                      </Button>
                    )}
                    
                    {actions.map((action, index) => (
                      <Button
                        key={index}
                        variant={action.variant || 'outline'}
                        size="sm"
                        onClick={action.onClick}
                        loading={action.loading}
                        className="bg-white/50 hover:bg-white/80"
                      >
                        {action.label}
                      </Button>
                    ))}
                    
                    {details && showDetails && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setIsDetailsOpen(!isDetailsOpen)}
                        rightIcon={
                          <motion.div
                            animate={{ rotate: isDetailsOpen ? 180 : 0 }}
                            transition={{ duration: 0.2 }}
                          >
                            <ChevronDownIcon className="h-4 w-4" />
                          </motion.div>
                        }
                        className="text-gray-600 hover:text-gray-900"
                      >
                        {isDetailsOpen ? 'Hide' : 'Show'} Details
                      </Button>
                    )}
                  </div>
                )}

                {/* Quick Actions for Common Errors */}
                {type === 'error' && !actions.length && (
                  <div className="flex flex-wrap gap-2 text-xs">
                    <Button
                      variant="ghost"
                      size="sm"
                      leftIcon={<CloudArrowDownIcon className="h-3 w-3" />}
                      className="text-gray-600 hover:text-gray-900 h-8 px-2"
                      onClick={() => navigator.clipboard?.writeText(errorMessage)}
                    >
                      Copy Error
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      leftIcon={<BugAntIcon className="h-3 w-3" />}
                      className="text-gray-600 hover:text-gray-900 h-8 px-2"
                      onClick={() => window.open('mailto:support@example.com?subject=Error Report')}
                    >
                      Report Bug
                    </Button>
                  </div>
                )}
              </div>
            </div>

            {/* Expandable Details */}
            <AnimatePresence>
              {isDetailsOpen && details && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3, ease: "easeInOut" }}
                  className="overflow-hidden"
                >
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    {formatErrorDetails()}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </CardContent>
        </Card>
      </motion.div>
    </AnimatePresence>
  );
};

// Global Error Boundary Component
interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
  errorInfo?: React.ErrorInfo;
}

export class GlobalErrorBoundary extends React.Component<
  React.PropsWithChildren<{
    fallback?: React.ComponentType<{ error: Error; errorInfo?: React.ErrorInfo; retry: () => void }>;
    onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
  }>,
  ErrorBoundaryState
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    this.setState({ errorInfo });
    this.props.onError?.(error, errorInfo);
    
    // Log to error reporting service
    console.error('Application Error:', error, errorInfo);
  }

  retry = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
  };

  render() {
    if (this.state.hasError && this.state.error) {
      if (this.props.fallback) {
        const FallbackComponent = this.props.fallback;
        return (
          <FallbackComponent
            error={this.state.error}
            errorInfo={this.state.errorInfo}
            retry={this.retry}
          />
        );
      }

      return (
        <div className="min-h-screen flex items-center justify-center p-6 bg-gray-50">
          <div className="max-w-lg w-full">
            <EnhancedErrorHandler
              error={this.state.error}
              title="Application Error"
              description="Something went wrong. The application has encountered an unexpected error."
              details={{
                code: this.state.error.name,
                timestamp: new Date().toISOString(),
                stack: this.state.error.stack,
                context: this.state.errorInfo
              }}
              actions={[
                {
                  label: 'Restart Application',
                  onClick: () => window.location.reload()
                }
              ]}
              onRetry={this.retry}
              showDetails
              persistent
            />
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Hook for handling async errors
export const useErrorHandler = () => {
  const [error, setError] = useState<Error | null>(null);

  const handleError = (error: Error | string) => {
    const errorObj = error instanceof Error ? error : new Error(error);
    setError(errorObj);
  };

  const clearError = () => setError(null);

  const withErrorHandling = <T extends any[]>(
    fn: (...args: T) => Promise<any>
  ) => {
    return async (...args: T) => {
      try {
        clearError();
        return await fn(...args);
      } catch (error) {
        handleError(error as Error);
        throw error;
      }
    };
  };

  return {
    error,
    handleError,
    clearError,
    withErrorHandling
  };
};

// Network Error Component
export const NetworkError: React.FC<{
  onRetry: () => void;
  isRetrying?: boolean;
}> = ({ onRetry, isRetrying = false }) => (
  <EnhancedErrorHandler
    error="Network connection error"
    type="error"
    title="Connection Problem"
    description="Unable to connect to the server. Please check your internet connection and try again."
    onRetry={onRetry}
    retryLoading={isRetrying}
    actions={[
      {
        label: 'Check Status',
        variant: 'outline',
        onClick: () => window.open('https://status.example.com', '_blank')
      }
    ]}
  />
);

// Permission Error Component
export const PermissionError: React.FC<{
  resource: string;
  onRequestAccess?: () => void;
}> = ({ resource, onRequestAccess }) => (
  <EnhancedErrorHandler
    error="Access denied"
    type="warning"
    title="Permission Required"
    description={`You don't have permission to access ${resource}. Please contact your administrator or request access.`}
    actions={onRequestAccess ? [
      {
        label: 'Request Access',
        onClick: onRequestAccess
      }
    ] : []}
  />
);

export default EnhancedErrorHandler;