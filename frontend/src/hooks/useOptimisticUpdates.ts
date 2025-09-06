import { useState, useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import type { OptimisticUpdate } from '@/types/api'
import { useToast } from '@/hooks/useToast'

interface UseOptimisticUpdatesOptions<T> {
  queryKey: any[]
  onError?: (error: Error, rollback: () => void) => void
  onSuccess?: (data: T) => void
}

export function useOptimisticUpdates<T>({ 
  queryKey, 
  onError, 
  onSuccess 
}: UseOptimisticUpdatesOptions<T>) {
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const [pendingUpdates, setPendingUpdates] = useState<Map<string, OptimisticUpdate<T>>>(new Map())

  const applyOptimisticUpdate = useCallback((
    id: string,
    updateType: 'create' | 'update' | 'delete',
    newData: T,
    mutationFn: () => Promise<T>
  ) => {
    // Store original data for rollback
    const originalData = queryClient.getQueryData(queryKey)
    
    // Create optimistic update record
    const optimisticUpdate: OptimisticUpdate<T> = {
      id,
      type: updateType,
      data: newData,
      originalData: originalData as T,
      timestamp: Date.now(),
      retry: mutationFn
    }

    // Add to pending updates
    setPendingUpdates(prev => new Map(prev).set(id, optimisticUpdate))

    // Apply optimistic update to cache
    queryClient.setQueryData(queryKey, (oldData: any) => {
      if (!oldData) return newData

      // Handle different update types
      switch (updateType) {
        case 'create':
          if (Array.isArray(oldData.employees)) {
            return {
              ...oldData,
              employees: [newData, ...oldData.employees],
              total: (oldData.total || 0) + 1
            }
          }
          return newData

        case 'update':
          if (Array.isArray(oldData.employees)) {
            return {
              ...oldData,
              employees: oldData.employees.map((item: any) => 
                item.id === (newData as any).id ? newData : item
              )
            }
          }
          return newData

        case 'delete':
          if (Array.isArray(oldData.employees)) {
            return {
              ...oldData,
              employees: oldData.employees.filter((item: any) => 
                item.id !== (newData as any).id
              ),
              total: Math.max((oldData.total || 1) - 1, 0)
            }
          }
          return null

        default:
          return oldData
      }
    })

    // Execute actual mutation
    mutationFn()
      .then((result) => {
        // Success: remove from pending and update with real data
        setPendingUpdates(prev => {
          const newMap = new Map(prev)
          newMap.delete(id)
          return newMap
        })

        // Update cache with real data
        queryClient.setQueryData(queryKey, (oldData: any) => {
          if (!oldData) return result

          switch (updateType) {
            case 'create':
              if (Array.isArray(oldData.employees)) {
                return {
                  ...oldData,
                  employees: oldData.employees.map((item: any) => 
                    item.id === (newData as any).id ? result : item
                  )
                }
              }
              return result

            case 'update':
              if (Array.isArray(oldData.employees)) {
                return {
                  ...oldData,
                  employees: oldData.employees.map((item: any) => 
                    item.id === (result as any).id ? result : item
                  )
                }
              }
              return result

            default:
              return oldData
          }
        })

        onSuccess?.(result)
      })
      .catch((error) => {
        // Failure: rollback optimistic update
        const rollback = () => {
          queryClient.setQueryData(queryKey, originalData)
          setPendingUpdates(prev => {
            const newMap = new Map(prev)
            newMap.delete(id)
            return newMap
          })
        }

        // Show error toast
        toast({
          title: 'Operation Failed',
          description: `Failed to ${updateType} item. Changes have been reverted.`,
          variant: 'destructive',
          action: {
            altText: 'Retry',
            onClick: () => {
              // Retry the operation
              applyOptimisticUpdate(id, updateType, newData, mutationFn)
            }
          }
        })

        rollback()
        onError?.(error, rollback)
      })

    return optimisticUpdate
  }, [queryKey, queryClient, toast, onError, onSuccess])

  const rollbackUpdate = useCallback((id: string) => {
    const update = pendingUpdates.get(id)
    if (update && update.originalData) {
      queryClient.setQueryData(queryKey, update.originalData)
      setPendingUpdates(prev => {
        const newMap = new Map(prev)
        newMap.delete(id)
        return newMap
      })
    }
  }, [pendingUpdates, queryClient, queryKey])

  const retryUpdate = useCallback((id: string) => {
    const update = pendingUpdates.get(id)
    if (update && update.retry) {
      update.retry()
        .then(() => {
          setPendingUpdates(prev => {
            const newMap = new Map(prev)
            newMap.delete(id)
            return newMap
          })
        })
        .catch((error) => {
          toast({
            title: 'Retry Failed',
            description: 'The operation could not be completed. Please try again.',
            variant: 'destructive'
          })
        })
    }
  }, [pendingUpdates, toast])

  const clearPendingUpdates = useCallback(() => {
    // Rollback all pending updates
    for (const [id, update] of pendingUpdates) {
      if (update.originalData) {
        queryClient.setQueryData(queryKey, update.originalData)
      }
    }
    setPendingUpdates(new Map())
  }, [pendingUpdates, queryClient, queryKey])

  return {
    applyOptimisticUpdate,
    rollbackUpdate,
    retryUpdate,
    clearPendingUpdates,
    pendingUpdates: Array.from(pendingUpdates.values()),
    hasPendingUpdates: pendingUpdates.size > 0
  }
}