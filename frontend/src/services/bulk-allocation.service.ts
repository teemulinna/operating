import { apiClient } from '@/services/api';
import type {
  BulkCreateAllocationRequest,
  BulkUpdateAllocationRequest,
  BulkDeleteAllocationRequest,
  BulkOperationResult,
  BulkOperationStatus,
  CopyAllocationRequest,
  CopyAllocationResult,
  ImportOptions,
  ImportResult,
  ExportOptions,
} from '@/types/bulk-operations';
import type { Allocation, CreateAllocationRequest } from '@/types/allocation';

/**
 * Service for handling bulk allocation operations with transaction support
 * and performance optimizations
 */
export class BulkAllocationService {
  private static readonly DEFAULT_BATCH_SIZE = 1000;
  private static readonly DEFAULT_TIMEOUT = 300000; // 5 minutes

  /**
   * Create multiple allocations in a single transaction
   */
  static async bulkCreateAllocations(
    request: BulkCreateAllocationRequest
  ): Promise<BulkOperationResult<Allocation>> {
    const response = await apiClient.post<{
      data: BulkOperationResult<Allocation>;
    }>('/allocations/bulk-create', request, {
      timeout: this.DEFAULT_TIMEOUT,
    });

    return response.data.data;
  }

  /**
   * Update multiple allocations with optimized batch processing
   */
  static async bulkUpdateAllocations(
    request: BulkUpdateAllocationRequest
  ): Promise<BulkOperationResult<Allocation>> {
    const response = await apiClient.put<{
      data: BulkOperationResult<Allocation>;
    }>('/allocations/bulk-update', request, {
      timeout: this.DEFAULT_TIMEOUT,
    });

    return response.data.data;
  }

  /**
   * Delete multiple allocations with cascade handling
   */
  static async bulkDeleteAllocations(
    request: BulkDeleteAllocationRequest
  ): Promise<BulkOperationResult<{ id: string; cascaded?: string[] }>> {
    const response = await apiClient.delete<{
      data: BulkOperationResult<{ id: string; cascaded?: string[] }>;
    }>('/allocations/bulk-delete', {
      data: request,
      timeout: this.DEFAULT_TIMEOUT,
    });

    return response.data.data;
  }

  /**
   * Copy allocations from one project to multiple target projects
   */
  static async copyAllocations(
    request: CopyAllocationRequest
  ): Promise<CopyAllocationResult> {
    const response = await apiClient.post<{
      data: CopyAllocationResult;
    }>('/allocations/copy', request);

    return response.data.data;
  }

  /**
   * Start an asynchronous bulk operation and return operation ID for tracking
   */
  static async startAsyncBulkOperation(
    operationType: 'create' | 'update' | 'delete' | 'copy',
    request: any
  ): Promise<{ operationId: string }> {
    const response = await apiClient.post<{
      data: { operationId: string };
    }>(`/allocations/bulk-${operationType}/async`, request);

    return response.data.data;
  }

  /**
   * Get status of an async bulk operation
   */
  static async getBulkOperationStatus(
    operationId: string
  ): Promise<BulkOperationStatus> {
    const response = await apiClient.get<{
      data: BulkOperationStatus;
    }>(`/allocations/bulk-operations/${operationId}/status`);

    return response.data.data;
  }

  /**
   * Cancel a running bulk operation
   */
  static async cancelBulkOperation(operationId: string): Promise<void> {
    await apiClient.post(`/allocations/bulk-operations/${operationId}/cancel`);
  }

  /**
   * Import allocations from CSV/Excel file
   */
  static async importFromFile(options: ImportOptions): Promise<ImportResult> {
    const formData = new FormData();
    formData.append('file', options.file);
    formData.append('mapping', JSON.stringify(options.mapping));
    formData.append('options', JSON.stringify(options.options));

    const response = await apiClient.post<{
      data: ImportResult;
    }>('/allocations/import', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      timeout: this.DEFAULT_TIMEOUT,
    });

    return response.data.data;
  }

  /**
   * Preview import data before actual import
   */
  static async previewImport(options: ImportOptions): Promise<ImportResult> {
    const formData = new FormData();
    formData.append('file', options.file);
    formData.append('mapping', JSON.stringify(options.mapping));
    formData.append('options', JSON.stringify({
      ...options.options,
      validateOnly: true,
    }));

    const response = await apiClient.post<{
      data: ImportResult;
    }>('/allocations/import/preview', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    return response.data.data;
  }

  /**
   * Export allocations to CSV/Excel
   */
  static async exportToFile(options: ExportOptions): Promise<Blob> {
    const response = await apiClient.post('/allocations/export', options, {
      responseType: 'blob',
    });

    return response.data;
  }

  /**
   * Validate bulk operation before execution
   */
  static async validateBulkOperation(
    operationType: 'create' | 'update' | 'delete',
    data: any
  ): Promise<{
    valid: boolean;
    errors: Array<{ index: number; field: string; message: string }>;
    warnings: Array<{ index: number; message: string }>;
    conflicts: Array<{ type: string; description: string; affectedItems: number[] }>;
  }> {
    const response = await apiClient.post<{
      data: {
        valid: boolean;
        errors: Array<{ index: number; field: string; message: string }>;
        warnings: Array<{ index: number; message: string }>;
        conflicts: Array<{ type: string; description: string; affectedItems: number[] }>;
      };
    }>(`/allocations/bulk-${operationType}/validate`, data);

    return response.data.data;
  }

  /**
   * Get bulk operation templates for common scenarios
   */
  static async getBulkOperationTemplates(): Promise<Array<{
    id: string;
    name: string;
    description: string;
    type: 'create' | 'update' | 'copy';
    template: any;
  }>> {
    const response = await apiClient.get<{
      data: Array<{
        id: string;
        name: string;
        description: string;
        type: 'create' | 'update' | 'copy';
        template: any;
      }>;
    }>('/allocations/bulk-templates');

    return response.data.data;
  }

  /**
   * Get bulk operation history and analytics
   */
  static async getBulkOperationHistory(params?: {
    limit?: number;
    offset?: number;
    operationType?: string;
    status?: string;
    dateFrom?: string;
    dateTo?: string;
  }): Promise<{
    operations: Array<{
      id: string;
      type: string;
      status: string;
      totalRecords: number;
      successfulRecords: number;
      failedRecords: number;
      duration: number;
      startedAt: string;
      completedAt?: string;
      userId?: string;
      userName?: string;
    }>;
    pagination: {
      total: number;
      limit: number;
      offset: number;
    };
  }> {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          queryParams.append(key, value.toString());
        }
      });
    }

    const response = await apiClient.get<{
      data: {
        operations: Array<{
          id: string;
          type: string;
          status: string;
          totalRecords: number;
          successfulRecords: number;
          failedRecords: number;
          duration: number;
          startedAt: string;
          completedAt?: string;
          userId?: string;
          userName?: string;
        }>;
        pagination: {
          total: number;
          limit: number;
          offset: number;
        };
      };
    }>(`/allocations/bulk-operations/history?${queryParams.toString()}`);

    return response.data.data;
  }

  /**
   * Utility method to chunk large datasets for batch processing
   */
  static chunkArray<T>(array: T[], chunkSize: number = this.DEFAULT_BATCH_SIZE): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
  }

  /**
   * Process large bulk operation in chunks with progress callback
   */
  static async processBulkOperationInChunks<T, R>(
    data: T[],
    operation: (chunk: T[]) => Promise<BulkOperationResult<R>>,
    options?: {
      chunkSize?: number;
      onProgress?: (progress: { current: number; total: number; percentage: number }) => void;
      continueOnError?: boolean;
    }
  ): Promise<BulkOperationResult<R>> {
    const chunkSize = options?.chunkSize || this.DEFAULT_BATCH_SIZE;
    const chunks = this.chunkArray(data, chunkSize);
    
    const results: BulkOperationResult<R> = {
      successful: [],
      failed: [],
      conflicts: [],
      totalProcessed: 0,
      transactionId: `chunked-${Date.now()}`,
      duration: 0,
      warnings: [],
    };

    const startTime = Date.now();

    for (let i = 0; i < chunks.length; i++) {
      try {
        const chunkResult = await operation(chunks[i]);
        
        // Merge results
        results.successful.push(...chunkResult.successful);
        results.failed.push(...chunkResult.failed);
        results.conflicts?.push(...(chunkResult.conflicts || []));
        results.warnings?.push(...(chunkResult.warnings || []));
        results.totalProcessed += chunkResult.totalProcessed;

        // Report progress
        if (options?.onProgress) {
          const progress = {
            current: i + 1,
            total: chunks.length,
            percentage: Math.round(((i + 1) / chunks.length) * 100),
          };
          options.onProgress(progress);
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        
        // Add all items in this chunk as failed
        chunks[i].forEach((item, index) => {
          results.failed.push({
            data: item as any,
            error: errorMessage,
            index: i * chunkSize + index,
          });
        });

        if (!options?.continueOnError) {
          break;
        }
      }
    }

    results.duration = Date.now() - startTime;
    return results;
  }
}

export default BulkAllocationService;