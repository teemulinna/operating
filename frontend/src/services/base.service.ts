import axios, { AxiosInstance, AxiosError, AxiosRequestConfig } from 'axios';
import { ApiErrorType } from '../types/api';

export interface ServiceConfig {
  baseURL?: string;
  timeout?: number;
  headers?: Record<string, string>;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    limit: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export class ServiceError extends Error {
  code: string;
  statusCode?: number;
  details?: any;
  timestamp: string;

  constructor(message: string, code: string, statusCode?: number, details?: any) {
    super(message);
    this.name = 'ServiceError';
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
    this.timestamp = new Date().toISOString();
  }

  static fromAxiosError(error: AxiosError): ServiceError {
    const message = error.message || 'An unexpected error occurred';
    let code = 'NETWORK_ERROR';
    const statusCode = error.response?.status;
    const details = error.response?.data;

    if (statusCode === 401) {
      code = 'AUTHENTICATION_ERROR';
    } else if (statusCode === 403) {
      code = 'AUTHORIZATION_ERROR';
    } else if (statusCode === 404) {
      code = 'NOT_FOUND';
    } else if (statusCode === 422) {
      code = 'VALIDATION_ERROR';
    } else if (statusCode && statusCode >= 500) {
      code = 'INTERNAL_SERVER_ERROR';
    }

    return new ServiceError(message, code, statusCode, details);
  }
}

export abstract class BaseService {
  protected client: AxiosInstance;
  protected resourcePath: string;

  constructor(resourcePath: string, config?: ServiceConfig) {
    this.resourcePath = resourcePath;
    
    const defaultConfig: ServiceConfig = {
      baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3001/api',
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      }
    };

    const mergedConfig = { ...defaultConfig, ...config };

    this.client = axios.create({
      baseURL: mergedConfig.baseURL,
      timeout: mergedConfig.timeout,
      headers: mergedConfig.headers,
    });

    this.setupInterceptors();
  }

  private setupInterceptors(): void {
    this.client.interceptors.request.use(
      (config) => {
        const token = localStorage.getItem('auth_token');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(ServiceError.fromAxiosError(error))
    );

    this.client.interceptors.response.use(
      (response) => response,
      (error: AxiosError) => {
        if (error.response?.status === 401) {
          localStorage.removeItem('auth_token');
          window.dispatchEvent(new Event('unauthorized'));
        }
        return Promise.reject(ServiceError.fromAxiosError(error));
      }
    );
  }

  protected async request<T>(config: AxiosRequestConfig): Promise<T> {
    try {
      const response = await this.client.request<T>(config);
      return response.data;
    } catch (error) {
      if (error instanceof ServiceError) {
        throw error;
      }
      throw ServiceError.fromAxiosError(error as AxiosError);
    }
  }

  async getAll<T>(params?: PaginationParams & Record<string, any>): Promise<PaginatedResponse<T>> {
    return this.request<PaginatedResponse<T>>({
      method: 'GET',
      url: this.resourcePath,
      params,
    });
  }

  async getById<T>(id: string | number): Promise<T> {
    return this.request<T>({
      method: 'GET',
      url: `${this.resourcePath}/${id}`,
    });
  }

  async create<T>(data: Partial<T>): Promise<T> {
    return this.request<T>({
      method: 'POST',
      url: this.resourcePath,
      data,
    });
  }

  async update<T>(id: string | number, data: Partial<T>): Promise<T> {
    return this.request<T>({
      method: 'PUT',
      url: `${this.resourcePath}/${id}`,
      data,
    });
  }

  async patch<T>(id: string | number, data: Partial<T>): Promise<T> {
    return this.request<T>({
      method: 'PATCH',
      url: `${this.resourcePath}/${id}`,
      data,
    });
  }

  async delete(id: string | number): Promise<void> {
    return this.request<void>({
      method: 'DELETE',
      url: `${this.resourcePath}/${id}`,
    });
  }
}