import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

// Optimized QueryClient with performance-focused configuration
const createOptimizedQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: {
      // Performance optimizations for caching
      staleTime: 5 * 60 * 1000, // 5 minutes - data is fresh for 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes - cached data expires after 10 minutes
      refetchOnWindowFocus: false, // Don't refetch on window focus for better UX
      refetchOnReconnect: 'always', // Always refetch on reconnect
      retry: (failureCount, error: any) => {
        // Smart retry logic
        if (error?.status === 404) return false; // Don't retry 404s
        if (error?.status === 401) return false; // Don't retry unauthorized
        if (error?.status >= 500) return failureCount < 3; // Retry server errors up to 3 times
        return failureCount < 2; // Retry other errors up to 2 times
      },
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000), // Exponential backoff with max 30s
    },
    mutations: {
      retry: false, // Don't retry mutations by default
      gcTime: 5 * 60 * 1000, // Keep mutation cache for 5 minutes
    },
  },
});

interface OptimizedQueryProviderProps {
  children: React.ReactNode;
  client?: QueryClient;
}

export const OptimizedQueryProvider: React.FC<OptimizedQueryProviderProps> = ({
  children,
  client
}) => {
  const queryClient = React.useMemo(() => client || createOptimizedQueryClient(), [client]);

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {process.env.NODE_ENV === 'development' && <ReactQueryDevtools initialIsOpen={false} />}
    </QueryClientProvider>
  );
};