import { useQuery } from '@tanstack/react-query';

interface ForecastingParams {
  timeHorizon: number;
  includePatterns: boolean;
}

interface DemandForecastParams {
  timeRange: string;
  skills: string[];
}

interface SkillMatchingParams {
  requiredSkills: Array<{
    skillId: string;
    skillName: string;
    minimumProficiency: number;
    weight: number;
    isRequired: boolean;
  }>;
  maxResults: number;
}

interface OptimizationParams {
  timeRange: string;
  focus: string;
}

interface MLInsightsParams {
  timeRange: string;
}

// NO MOCK DATA - AI features connect to real backend or fail gracefully

export const useForecasting = (params: ForecastingParams, options: any = {}) => {
  return useQuery({
    queryKey: ['forecasting', params],
    queryFn: async () => {
      const response = await fetch('/api/forecasting', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params)
      });
      
      if (!response.ok) {
        throw new Error(`Forecasting API failed: ${response.status}`);
      }
      return await response.json();
    },
    ...options
  });
};

export const useDemandForecast = (params: DemandForecastParams, options: any = {}) => {
  return useQuery({
    queryKey: ['demand-forecast', params],
    queryFn: async () => {
      const response = await fetch('/api/forecasting/demand', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params)
      });
      
      if (!response.ok) {
        throw new Error(`Demand forecast API failed: ${response.status}`);
      }
      return await response.json();
    },
    ...options
  });
};

export const useSkillMatching = (params: SkillMatchingParams, options: any = {}) => {
  return useQuery({
    queryKey: ['skill-matching', params],
    queryFn: async () => {
      const response = await fetch('/api/matching/skills', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params)
      });
      
      if (!response.ok) {
        throw new Error(`Skill matching API failed: ${response.status}`);
      }
      return await response.json();
    },
    ...options
  });
};

export const useOptimizationSuggestions = (params: OptimizationParams, options: any = {}) => {
  return useQuery({
    queryKey: ['optimization', params],
    queryFn: async () => {
      const response = await fetch('/api/optimization', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params)
      });
      
      if (!response.ok) {
        throw new Error(`Optimization API failed: ${response.status}`);
      }
      return await response.json();
    },
    ...options
  });
};

export const useMLInsights = (params: MLInsightsParams, options: any = {}) => {
  return useQuery({
    queryKey: ['ml-insights', params],
    queryFn: async () => {
      const response = await fetch('/api/ml-optimization/insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params)
      });
      
      if (!response.ok) {
        throw new Error(`ML insights API failed: ${response.status}`);
      }
      return await response.json();
    },
    ...options
  });
};