/**
 * ML Services Index
 * Central export point for all machine learning services and utilities
 */

// Core ML Services
export { predictionService, PredictionService } from '../prediction.service';
export type { 
  PredictionInput, 
  PredictionResult, 
  ModelConfig 
} from '../prediction.service';

export { forecastingService, ForecastingService } from '../forecasting.service';
export type { 
  CapacityForecast, 
  ForecastingConfig, 
  ResourceDemand,
  WorkloadPattern 
} from '../forecasting.service';

export { matchingService, MatchingService } from '../matching.service';
export type { 
  SkillProfile,
  EmployeeProfile,
  ProjectRequirement,
  MatchingResult,
  TeamComposition 
} from '../matching.service';

// ML Utilities
export { DataPreprocessingService } from './data-preprocessing.service';
export type { 
  NormalizationConfig,
  FeatureExtractionConfig,
  DataValidationResult 
} from './data-preprocessing.service';

export { TimeSeriesProcessor } from './time-series.service';
export type { 
  TimeSeriesData,
  SeasonalDecomposition,
  TimeSeriesFeatures,
  AnomalyDetectionResult,
  ForecastValidation 
} from './time-series.service';

export { ModelStorageService } from './model-storage.service';
export type { 
  StoredModel,
  ModelVersion,
  ModelMetrics 
} from './model-storage.service';

export { validationService, ValidationService } from './validation.service';
export type { 
  ValidationConfig,
  ModelValidationResult,
  CrossValidationResult 
} from './validation.service';

// React Query Hooks
export {
  useModelList,
  useModel,
  useModelMetrics,
  usePrediction,
  useTrainModel,
  useCapacityForecast,
  useResourceDemandForecast,
  useEmployeeMatching,
  useTeamComposition,
  useSkillGapAnalysis,
  useProjectSuccessPrediction,
  useModelCleanup,
  useDeleteModel,
  useBatchPrediction,
  usePrefetchModels,
  useMLSystemHealth,
  ML_QUERY_KEYS
} from '../../hooks/useMachineLearning';

// Components
export { MLDashboard } from '../../components/ml/MLDashboard';

// Constants and Utilities
export const ML_CONSTANTS = {
  DEFAULT_CACHE_TIME: 10 * 60 * 1000, // 10 minutes
  DEFAULT_STALE_TIME: 5 * 60 * 1000,  // 5 minutes
  MAX_MEMORY_USAGE: 100 * 1024 * 1024, // 100MB
  DEFAULT_MODEL_VERSIONS_TO_KEEP: 3,
  DEFAULT_MODEL_MAX_AGE_DAYS: 30,
  TENSORFLOW_BACKEND: 'webgl'
} as const;

export const ML_MODEL_TYPES = {
  REGRESSION: 'regression',
  CLASSIFICATION: 'classification', 
  TIMESERIES: 'timeseries'
} as const;

export const ML_NORMALIZATION_METHODS = {
  MIN_MAX: 'min-max',
  Z_SCORE: 'z-score',
  ROBUST: 'robust',
  UNIT_VECTOR: 'unit-vector'
} as const;

/**
 * Initialize ML services
 * Call this function to set up TensorFlow.js backend and prefetch common models
 */
export async function initializeMLServices(options: {
  backend?: 'webgl' | 'cpu' | 'wasm';
  prefetchModels?: boolean;
} = {}) {
  const { backend = 'webgl', prefetchModels = true } = options;
  
  try {
    // Set TensorFlow.js backend
    const tf = await import('@tensorflow/tfjs');
    await tf.setBackend(backend);
    await tf.ready();
    
    console.log('TensorFlow.js initialized:', {
      backend: tf.getBackend(),
      version: tf.version.tfjs,
      memory: tf.memory()
    });

    // Prefetch common models if requested
    if (prefetchModels) {
      // This would be called from a React component using the hook
      console.log('ML services initialized. Use usePrefetchModels hook to prefetch models in React components.');
    }

    return true;
  } catch (error) {
    console.error('Failed to initialize ML services:', error);
    return false;
  }
}

/**
 * Cleanup ML resources
 * Call this function to dispose of models and free memory
 */
export function cleanupMLResources() {
  try {
    predictionService.dispose();
    console.log('ML resources cleaned up successfully');
  } catch (error) {
    console.error('Error cleaning up ML resources:', error);
  }
}

/**
 * Get ML system health status
 */
export async function getMLSystemStatus() {
  try {
    const tf = await import('@tensorflow/tfjs');
    const memory = tf.memory();
    const loadedModels = predictionService.getLoadedModels();
    
    let status: 'healthy' | 'warning' | 'error' = 'healthy';
    
    if (memory.numTensors > 1000) {
      status = 'warning';
    }
    
    if (memory.numBytes > ML_CONSTANTS.MAX_MEMORY_USAGE) {
      status = 'error';
    }
    
    return {
      status,
      memory,
      loadedModels: loadedModels.length,
      backend: tf.getBackend(),
      version: tf.version.tfjs
    };
  } catch (error) {
    console.error('Error getting ML system status:', error);
    return {
      status: 'error' as const,
      error: error.message
    };
  }
}