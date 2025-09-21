import { useQuery } from '@tanstack/react-query';
import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || 'http://localhost:3001/api';


// API client with error handling
const apiClient = axios.create({
  baseURL: API_BASE,
  timeout: 10000,
});

// Add response interceptor for better error handling
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    console.warn('API request failed, will use simulated data:', error.message);
    return Promise.reject(error);
  }
);

// Capacity Forecasting Hook
export function useForecasting(
  params: { timeHorizon: number; includePatterns?: boolean },
  options: { enabled?: boolean } = {}
) {
  return useQuery({
    queryKey: ['forecasting', params],
    queryFn: async () => {
      try {
        const response = await apiClient.get('/ai/forecasting', { params });
        return response.data;
      } catch (error) {
        console.error('Forecasting API request failed:', error);
        throw error;
      }
    },
    enabled: options.enabled ?? true,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: false
  });
}

// Demand Forecasting Hook
export function useDemandForecast(
  params: { timeRange: string; skills?: string[] },
  options: { enabled?: boolean } = {}
) {
  return useQuery({
    queryKey: ['demandForecast', params],
    queryFn: async () => {
      try {
        const response = await apiClient.get('/ai/demand-forecast', { params });
        return response.data;
      } catch (error) {
        console.error('Demand forecast API request failed:', error);
        throw error;
      }
    },
    enabled: options.enabled ?? true,
    staleTime: 10 * 60 * 1000,
    retry: false
  });
}

// Skill Matching Hook
interface SkillRequirement {
  skillId: string;
  skillName: string;
  minimumProficiency: number;
  weight: number;
  isRequired: boolean;
}

interface SkillMatchingParams {
  requiredSkills: SkillRequirement[];
  maxResults?: number;
}

export function useSkillMatching(
  params: SkillMatchingParams,
  options: { enabled?: boolean } = {}
) {
  return useQuery({
    queryKey: ['skillMatching', params],
    queryFn: async () => {
      try {
        const response = await apiClient.post('/ai/skill-matching', params);
        return response.data;
      } catch (error) {
        console.error('Skill matching API request failed:', error);
        throw error;
      }
    },
    enabled: options.enabled ?? true,
    staleTime: 2 * 60 * 1000,
    retry: false
  });
}

// Optimization Suggestions Hook
export function useOptimizationSuggestions(
  params: { timeRange: string; focus?: string },
  options: { enabled?: boolean } = {}
) {
  return useQuery({
    queryKey: ['optimization', params],
    queryFn: async () => {
      try {
        const response = await apiClient.get('/ai/optimization-suggestions', { params });
        return response.data;
      } catch (error) {
        console.error('Optimization suggestions API request failed:', error);
        throw error;
      }
    },
    enabled: options.enabled ?? true,
    staleTime: 15 * 60 * 1000,
    retry: false
  });
}

// ML Insights Hook
export function useMLInsights(
  params: { timeRange: string },
  options: { enabled?: boolean } = {}
) {
  return useQuery({
    queryKey: ['mlInsights', params],
    queryFn: async () => {
      try {
        const response = await apiClient.get('/ai/ml-insights', { params });
        return response.data;
      } catch (error) {
        console.error('ML insights API request failed:', error);
        throw error;
      }
    },
    enabled: options.enabled ?? true,
    staleTime: 30 * 60 * 1000,
    retry: false
  });
}
