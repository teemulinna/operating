import { useState, useCallback, useRef, useEffect } from 'react';

export interface CrudState<T> {
  items: T[];
  loading: boolean;
  operationLoading: boolean;
  error: string | null;
  lastFetch: number | null;
}

export interface CrudOperationConfig {
  onSuccess?: (operation: string, data?: any) => void;
  onError?: (error: Error, operation: string) => void;
  optimisticUpdates?: boolean;
  cacheTimeout?: number; // in milliseconds
}

export interface UseCrudOperationsReturn<T> {
  state: CrudState<T>;
  fetchItems: (url: string, params?: any) => Promise<void>;
  createItem: (url: string, data: Partial<T>, onSuccess?: () => void) => Promise<T>;
  updateItem: (url: string, id: string | number, data: Partial<T>, onSuccess?: () => void) => Promise<T>;
  deleteItem: (url: string, id: string | number, onSuccess?: () => void) => Promise<void>;
  clearError: () => void;
  resetState: () => void;
  setItems: (items: T[]) => void;
}

/**
 * Generic CRUD operations hook with TypeScript generics
 * 
 * Features:
 * - Full CRUD operations (Create, Read, Update, Delete)
 * - Optimistic updates for better UX
 * - Error handling with detailed error states
 * - Loading states for operations and fetching
 * - Caching with configurable timeout
 * - Real API integration
 * - TypeScript generic support
 */
export function useCrudOperations<T extends { id: string | number }>(
  config: CrudOperationConfig = {}
): UseCrudOperationsReturn<T> {
  const {
    onSuccess,
    onError,
    optimisticUpdates = true,
    cacheTimeout = 5 * 60 * 1000, // 5 minutes default
  } = config;

  const [state, setState] = useState<CrudState<T>>({
    items: [],
    loading: false,
    operationLoading: false,
    error: null,
    lastFetch: null,
  });

  const abortControllerRef = useRef<AbortController | null>(null);

  const handleError = useCallback((error: Error, operation: string) => {
    console.error(`CRUD operation failed: ${operation}`, error);
    
    setState(prev => ({
      ...prev,
      loading: false,
      operationLoading: false,
      error: error.message || `Failed to ${operation}`,
    }));

    if (onError) {
      onError(error, operation);
    }
  }, [onError]);

  const handleSuccess = useCallback((operation: string, data?: any) => {
    setState(prev => ({
      ...prev,
      loading: false,
      operationLoading: false,
      error: null,
    }));

    if (onSuccess) {
      onSuccess(operation, data);
    }
  }, [onSuccess]);

  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  const resetState = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    setState({
      items: [],
      loading: false,
      operationLoading: false,
      error: null,
      lastFetch: null,
    });
  }, []);

  const setItems = useCallback((items: T[]) => {
    setState(prev => ({ ...prev, items }));
  }, []);

  const fetchItems = useCallback(async (url: string, params?: any): Promise<void> => {
    // Check cache
    const now = Date.now();
    if (state.lastFetch && (now - state.lastFetch < cacheTimeout)) {
      return;
    }

    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    abortControllerRef.current = new AbortController();
    
    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const queryString = params ? new URLSearchParams(params).toString() : '';
      const fetchUrl = queryString ? `${url}?${queryString}` : url;
      
      const response = await fetch(fetchUrl, {
        signal: abortControllerRef.current.signal,
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      
      // Handle different response formats
      const items = result.data || result.items || result || [];
      
      setState(prev => ({
        ...prev,
        items,
        loading: false,
        error: null,
        lastFetch: now,
      }));

      handleSuccess('fetch', items);
    } catch (error: any) {
      if (error.name === 'AbortError') {
        return;
      }
      handleError(error, 'fetch items');
    }
  }, [cacheTimeout, state.lastFetch, handleError, handleSuccess]);

  const createItem = useCallback(async (
    url: string, 
    data: Partial<T>, 
    onSuccessCallback?: () => void
  ): Promise<T> => {
    setState(prev => ({ ...prev, operationLoading: true, error: null }));

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      const newItem = result.data || result;

      setState(prev => ({
        ...prev,
        items: [...prev.items, newItem],
        operationLoading: false,
        error: null,
      }));

      handleSuccess('create', newItem);
      
      if (onSuccessCallback) {
        onSuccessCallback();
      }

      return newItem;
    } catch (error: any) {
      handleError(error, 'create item');
      throw error;
    }
  }, [handleError, handleSuccess]);

  const updateItem = useCallback(async (
    url: string, 
    id: string | number, 
    data: Partial<T>, 
    onSuccessCallback?: () => void
  ): Promise<T> => {
    setState(prev => ({ ...prev, operationLoading: true, error: null }));

    // Optimistic update
    let previousItems: T[] = [];
    if (optimisticUpdates) {
      setState(prev => {
        previousItems = prev.items;
        return {
          ...prev,
          items: prev.items.map(item => 
            item.id === id ? { ...item, ...data } : item
          ),
        };
      });
    }

    try {
      const response = await fetch(`${url}/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        // Revert optimistic update on error
        if (optimisticUpdates) {
          setState(prev => ({ ...prev, items: previousItems }));
        }
        
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      const updatedItem = result.data || result;

      setState(prev => ({
        ...prev,
        items: prev.items.map(item => 
          item.id === id ? updatedItem : item
        ),
        operationLoading: false,
        error: null,
      }));

      handleSuccess('update', updatedItem);
      
      if (onSuccessCallback) {
        onSuccessCallback();
      }

      return updatedItem;
    } catch (error: any) {
      // Revert optimistic update on error
      if (optimisticUpdates) {
        setState(prev => ({ ...prev, items: previousItems }));
      }
      
      handleError(error, 'update item');
      throw error;
    }
  }, [optimisticUpdates, handleError, handleSuccess]);

  const deleteItem = useCallback(async (
    url: string, 
    id: string | number, 
    onSuccessCallback?: () => void
  ): Promise<void> => {
    setState(prev => ({ ...prev, operationLoading: true, error: null }));

    // Optimistic delete
    let previousItems: T[] = [];
    if (optimisticUpdates) {
      setState(prev => {
        previousItems = prev.items;
        return {
          ...prev,
          items: prev.items.filter(item => item.id !== id),
        };
      });
    }

    try {
      const response = await fetch(`${url}/${id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        // Revert optimistic delete on error
        if (optimisticUpdates) {
          setState(prev => ({ ...prev, items: previousItems }));
        }
        
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }

      // Ensure the item is removed (in case optimistic update was disabled)
      if (!optimisticUpdates) {
        setState(prev => ({
          ...prev,
          items: prev.items.filter(item => item.id !== id),
        }));
      }

      setState(prev => ({ ...prev, operationLoading: false, error: null }));

      handleSuccess('delete', { id });
      
      if (onSuccessCallback) {
        onSuccessCallback();
      }
    } catch (error: any) {
      // Revert optimistic delete on error
      if (optimisticUpdates) {
        setState(prev => ({ ...prev, items: previousItems }));
      }
      
      handleError(error, 'delete item');
      throw error;
    }
  }, [optimisticUpdates, handleError, handleSuccess]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return {
    state,
    fetchItems,
    createItem,
    updateItem,
    deleteItem,
    clearError,
    resetState,
    setItems,
  };
}

export default useCrudOperations;