import { useState, useEffect, useCallback } from 'react';

export interface ApiDataState<T> {
  data: T[];
  loading: boolean;
  error: Error | null;
  lastFetch: Date | null;
}

export interface ApiDataManager<T> {
  state: ApiDataState<T>;
  refetch: () => Promise<void>;
  setData: (data: T[]) => void;
  clearError: () => void;
  isStale: (maxAge?: number) => boolean;
}

export interface ApiDataConfig {
  onError?: (error: Error) => void;
  onSuccess?: (data: any[]) => void;
  autoFetch?: boolean;
  cacheMaxAge?: number; // milliseconds
  retryAttempts?: number;
  retryDelay?: number; // milliseconds
}

/**
 * Custom hook for managing API data fetching with caching and error handling
 * 
 * Provides a consistent interface for data fetching operations with loading states,
 * error handling, caching, and retry logic. Works seamlessly with useCrudOperations.
 * 
 * @template T - The type of data items being fetched
 * @param endpoint - API endpoint to fetch data from
 * @param config - Configuration options for behavior and error handling
 * @returns ApiDataManager object with state and control functions
 * 
 * @example
 * ```tsx
 * interface Employee {
 *   id: string;
 *   firstName: string;
 *   lastName: string;
 * }
 * 
 * const {
 *   state: { data: employees, loading, error },
 *   refetch,
 *   setData
 * } = useApiData<Employee>('http://localhost:3001/api/employees', {
 *   onError: (error) => showToast(error.message, 'error'),
 *   autoFetch: true,
 *   cacheMaxAge: 5 * 60 * 1000 // 5 minutes
 * });
 * ```
 */
export function useApiData<T>(
  endpoint: string,
  config: ApiDataConfig = {}
): ApiDataManager<T> {
  const {
    onError,
    onSuccess,
    autoFetch = true,
    cacheMaxAge = 5 * 60 * 1000, // 5 minutes default
    retryAttempts = 1,
    retryDelay = 1000
  } = config;

  const [state, setState] = useState<ApiDataState<T>>({
    data: [],
    loading: false,
    error: null,
    lastFetch: null
  });

  const setData = useCallback((data: T[]) => {
    setState(prev => ({
      ...prev,
      data,
      error: null,
      lastFetch: new Date()
    }));
  }, []);

  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  const isStale = useCallback((maxAge: number = cacheMaxAge): boolean => {
    if (!state.lastFetch) return true;
    return Date.now() - state.lastFetch.getTime() > maxAge;
  }, [state.lastFetch, cacheMaxAge]);

  const fetchWithRetry = useCallback(async (attempt: number = 1): Promise<T[]> => {
    try {
      const response = await fetch(endpoint);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const result = await response.json();
      return result.data || result;
    } catch (error) {
      if (attempt < retryAttempts) {
        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, retryDelay));
        return fetchWithRetry(attempt + 1);
      }
      throw error;
    }
  }, [endpoint, retryAttempts, retryDelay]);

  const refetch = useCallback(async (): Promise<void> => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const data = await fetchWithRetry();
      setState(prev => ({
        ...prev,
        data,
        loading: false,
        error: null,
        lastFetch: new Date()
      }));
      onSuccess?.(data);
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Unknown error occurred');
      setState(prev => ({
        ...prev,
        loading: false,
        error: err,
        lastFetch: null
      }));
      onError?.(err);
    }
  }, [fetchWithRetry, onError, onSuccess]);

  // Auto-fetch on mount and when endpoint changes
  useEffect(() => {
    if (autoFetch && endpoint) {
      refetch();
    }
  }, [endpoint, autoFetch, refetch]);

  return {
    state,
    refetch,
    setData,
    clearError,
    isStale
  };
}

export default useApiData;