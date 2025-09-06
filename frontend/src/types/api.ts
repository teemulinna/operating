// Enhanced API Response Types with better error handling

export interface ApiError {
  message: string
  code?: string
  statusCode?: number
  details?: Record<string, any>
  timestamp?: string
  path?: string
}

export interface ValidationError extends ApiError {
  code: 'VALIDATION_ERROR'
  fieldErrors?: Record<string, string[]>
}

export interface AuthError extends ApiError {
  code: 'AUTHENTICATION_ERROR' | 'AUTHORIZATION_ERROR'
}

export interface NotFoundError extends ApiError {
  code: 'NOT_FOUND'
  resource?: string
  resourceId?: string | number
}

export interface ServerError extends ApiError {
  code: 'INTERNAL_SERVER_ERROR' | 'SERVICE_UNAVAILABLE'
}

export interface NetworkError extends ApiError {
  code: 'NETWORK_ERROR'
  isOffline?: boolean
}

// Union type for all possible API errors
export type ApiErrorType = 
  | ValidationError 
  | AuthError 
  | NotFoundError 
  | ServerError 
  | NetworkError 
  | ApiError

// Generic API Response wrapper
export interface ApiResponse<T = any> {
  data?: T
  error?: ApiErrorType
  success: boolean
  timestamp: string
  requestId?: string
}

// Paginated response
export interface PaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  limit: number
  totalPages: number
  hasNext: boolean
  hasPrev: boolean
}

// API Response for paginated data
export interface PaginatedApiResponse<T> extends ApiResponse<PaginatedResponse<T>> {}

// Loading states for better UX
export type LoadingState = 'idle' | 'loading' | 'succeeded' | 'failed'

// Retry configuration
export interface RetryConfig {
  maxRetries: number
  retryDelay: number
  exponentialBackoff?: boolean
}

// Request configuration
export interface ApiRequestConfig {
  timeout?: number
  retries?: RetryConfig
  cache?: boolean
  cacheTimeout?: number
}

// Error handler function type
export type ErrorHandler = (error: ApiErrorType) => void

// Success handler function type  
export type SuccessHandler<T> = (data: T) => void

// Progress callback for uploads
export type ProgressCallback = (progress: number) => void

// File upload types
export interface FileUploadConfig extends ApiRequestConfig {
  onProgress?: ProgressCallback
  allowedTypes?: string[]
  maxSize?: number
}

export interface UploadResponse {
  url: string
  fileName: string
  fileSize: number
  contentType: string
  uploadedAt: string
}

// Bulk operation types
export interface BulkOperationResult<T> {
  successful: T[]
  failed: Array<{
    item: Partial<T>
    error: ApiErrorType
  }>
  total: number
  successCount: number
  failureCount: number
}

// Search and filter types
export interface SearchFilters {
  query?: string
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
  page?: number
  limit?: number
  [key: string]: any
}

export interface SearchResponse<T> extends PaginatedResponse<T> {
  query?: string
  filters?: SearchFilters
  searchTime?: number
}

// Real-time updates
export interface RealtimeEvent<T> {
  type: 'created' | 'updated' | 'deleted'
  data: T
  timestamp: string
  userId?: string
}

// Optimistic update types
export interface OptimisticUpdate<T> {
  id: string
  type: 'create' | 'update' | 'delete'
  data: T
  originalData?: T
  timestamp: number
  retry?: () => Promise<T>
}

// Cache types
export interface CacheEntry<T> {
  data: T
  timestamp: number
  ttl: number
  key: string
}

export interface CacheConfig {
  defaultTTL: number
  maxEntries: number
  staleWhileRevalidate: boolean
}

// Health check response
export interface HealthCheckResponse {
  status: 'healthy' | 'unhealthy' | 'degraded'
  timestamp: string
  services: Record<string, {
    status: 'up' | 'down'
    responseTime?: number
    error?: string
  }>
}

// Version info
export interface ApiVersion {
  version: string
  buildDate: string
  gitCommit?: string
  environment: 'development' | 'staging' | 'production'
}

// Request/Response interceptor types
export type RequestInterceptor = (config: any) => any
export type ResponseInterceptor<T = any> = (response: ApiResponse<T>) => ApiResponse<T>
export type ErrorInterceptor = (error: ApiErrorType) => Promise<never> | ApiErrorType