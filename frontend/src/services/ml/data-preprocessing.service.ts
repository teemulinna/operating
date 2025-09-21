/**
 * Data Preprocessing Service
 * Handles data normalization, feature extraction, and preparation for ML models
 */

import * as tf from '@tensorflow/tfjs';

export interface NormalizationConfig {
  method: 'min-max' | 'z-score' | 'robust' | 'unit-vector';
  range?: [number, number]; // For min-max normalization
  clipOutliers?: boolean;
  outlierThreshold?: number; // Standard deviations for outlier detection
}

export interface FeatureExtractionConfig {
  includePolynomialFeatures?: boolean;
  polynomialDegree?: number;
  includeInteractionTerms?: boolean;
  includeCategoricalEncoding?: boolean;
  encodingMethod?: 'one-hot' | 'label' | 'target' | 'embedding';
}

export interface DataValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  statistics: {
    missing_values: number;
    outliers: number;
    data_quality_score: number;
  };
}

export class DataPreprocessingService {
  private normalizationCache: Map<string, { mean: number[], std: number[], min: number[], max: number[] }> = new Map();
  
  constructor() {}

  /**
   * Normalize input data using specified method
   */
  async normalizeInput(
    data: number[],
    targetShape: number[],
    config: NormalizationConfig = { method: 'min-max' }
  ): Promise<number[]> {
    try {
      // Validate input shape
      if (data.length !== targetShape[0]) {
        throw new Error(`Input shape mismatch: expected ${targetShape[0]}, got ${data.length}`);
      }

      // Handle missing values
      const cleanedData = this.handleMissingValues(data);

      // Apply normalization
      let normalizedData: number[];
      
      switch (config.method) {
        case 'min-max':
          normalizedData = this.minMaxNormalize(cleanedData, config.range || [0, 1]);
          break;
        case 'z-score':
          normalizedData = this.zScoreNormalize(cleanedData);
          break;
        case 'robust':
          normalizedData = this.robustNormalize(cleanedData);
          break;
        case 'unit-vector':
          normalizedData = this.unitVectorNormalize(cleanedData);
          break;
        default:
          normalizedData = cleanedData;
      }

      // Clip outliers if requested
      if (config.clipOutliers) {
        normalizedData = this.clipOutliers(normalizedData, config.outlierThreshold || 3);
      }

      return normalizedData;

    } catch (error) {
      console.error('Data normalization failed:', error);
      throw error;
    }
  }

  /**
   * Normalize a full dataset
   */
  async normalizeDataset(
    dataset: number[][],
    config: NormalizationConfig = { method: 'min-max' },
    cacheKey?: string
  ): Promise<number[][]> {
    try {
      if (dataset.length === 0) {
        throw new Error('Empty dataset provided');
      }

      const featureCount = dataset[0].length;
      
      // Calculate normalization parameters
      const stats = this.calculateDatasetStatistics(dataset);
      
      // Cache normalization parameters if key provided
      if (cacheKey) {
        this.normalizationCache.set(cacheKey, stats);
      }

      // Normalize each sample
      const normalizedDataset = dataset.map(sample => {
        return this.applynormalizationWithStats(sample, stats, config);
      });

      return normalizedDataset;

    } catch (error) {
      console.error('Dataset normalization failed:', error);
      throw error;
    }
  }

  /**
   * Extract features from raw data
   */
  extractFeatures(
    rawData: Record<string, any>,
    config: FeatureExtractionConfig = {}
  ): number[] {
    try {
      let features: number[] = [];

      // Extract numerical features
      const numericalFeatures = this.extractNumericalFeatures(rawData);
      features = features.concat(numericalFeatures);

      // Extract categorical features
      if (config.includeCategoricalEncoding) {
        const categoricalFeatures = this.extractCategoricalFeatures(
          rawData,
          config.encodingMethod || 'one-hot'
        );
        features = features.concat(categoricalFeatures);
      }

      // Add polynomial features
      if (config.includePolynomialFeatures) {
        const polynomialFeatures = this.generatePolynomialFeatures(
          numericalFeatures,
          config.polynomialDegree || 2
        );
        features = features.concat(polynomialFeatures);
      }

      // Add interaction terms
      if (config.includeInteractionTerms) {
        const interactionFeatures = this.generateInteractionFeatures(numericalFeatures);
        features = features.concat(interactionFeatures);
      }

      return features;

    } catch (error) {
      console.error('Feature extraction failed:', error);
      throw error;
    }
  }

  /**
   * Validate data quality
   */
  validateData(data: number[][] | number[]): DataValidationResult {
    try {
      const flatData = Array.isArray(data[0]) ? (data as number[][]).flat() : data as number[];
      
      // Count missing values (NaN, null, undefined)
      const missingValues = flatData.filter(val => val === null || val === undefined || isNaN(val)).length;
      
      // Detect outliers using IQR method
      const sortedData = flatData.filter(val => !isNaN(val) && val !== null && val !== undefined).sort((a, b) => a - b);
      const outliers = this.detectOutliersIQR(sortedData).length;
      
      // Calculate data quality score
      const totalPoints = flatData.length;
      const validPoints = totalPoints - missingValues;
      const dataQualityScore = validPoints / totalPoints;
      
      // Generate errors and warnings
      const errors: string[] = [];
      const warnings: string[] = [];
      
      if (missingValues / totalPoints > 0.1) {
        errors.push(`High missing data rate: ${((missingValues / totalPoints) * 100).toFixed(1)}%`);
      } else if (missingValues > 0) {
        warnings.push(`Missing values detected: ${missingValues} out of ${totalPoints}`);
      }
      
      if (outliers / validPoints > 0.05) {
        warnings.push(`High outlier rate: ${((outliers / validPoints) * 100).toFixed(1)}%`);
      }
      
      if (dataQualityScore < 0.8) {
        errors.push(`Low data quality score: ${(dataQualityScore * 100).toFixed(1)}%`);
      }

      return {
        isValid: errors.length === 0,
        errors,
        warnings,
        statistics: {
          missing_values: missingValues,
          outliers,
          data_quality_score: dataQualityScore
        }
      };

    } catch (error) {
      console.error('Data validation failed:', error);
      return {
        isValid: false,
        errors: [`Validation error: ${error.message}`],
        warnings: [],
        statistics: {
          missing_values: 0,
          outliers: 0,
          data_quality_score: 0
        }
      };
    }
  }

  /**
   * Handle missing values using specified strategy
   */
  handleMissingValues(
    data: number[],
    strategy: 'drop' | 'mean' | 'median' | 'mode' | 'forward-fill' | 'backward-fill' = 'mean'
  ): number[] {
    const validValues = data.filter(val => !isNaN(val) && val !== null && val !== undefined);
    
    if (validValues.length === data.length) {
      return data; // No missing values
    }

    let fillValue: number;
    
    switch (strategy) {
      case 'drop':
        return validValues;
      
      case 'mean':
        fillValue = validValues.reduce((sum, val) => sum + val, 0) / validValues.length;
        break;
      
      case 'median':
        const sorted = validValues.sort((a, b) => a - b);
        const mid = Math.floor(sorted.length / 2);
        fillValue = sorted.length % 2 === 0 
          ? (sorted[mid - 1] + sorted[mid]) / 2 
          : sorted[mid];
        break;
      
      case 'mode':
        const counts = new Map<number, number>();
        validValues.forEach(val => counts.set(val, (counts.get(val) || 0) + 1));
        fillValue = Array.from(counts.entries())
          .reduce((max, [val, count]) => count > max[1] ? [val, count] : max)[0];
        break;
      
      default:
        fillValue = validValues.length > 0 ? validValues[0] : 0;
    }

    return data.map(val => (isNaN(val) || val === null || val === undefined) ? fillValue : val);
  }

  // Private normalization methods

  private minMaxNormalize(data: number[], range: [number, number] = [0, 1]): number[] {
    const min = Math.min(...data);
    const max = Math.max(...data);
    const [targetMin, targetMax] = range;
    
    if (min === max) {
      return new Array(data.length).fill((targetMin + targetMax) / 2);
    }
    
    return data.map(val => 
      targetMin + ((val - min) / (max - min)) * (targetMax - targetMin)
    );
  }

  private zScoreNormalize(data: number[]): number[] {
    const mean = data.reduce((sum, val) => sum + val, 0) / data.length;
    const variance = data.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / data.length;
    const std = Math.sqrt(variance);
    
    if (std === 0) {
      return new Array(data.length).fill(0);
    }
    
    return data.map(val => (val - mean) / std);
  }

  private robustNormalize(data: number[]): number[] {
    const sorted = [...data].sort((a, b) => a - b);
    const q1Index = Math.floor(sorted.length * 0.25);
    const q3Index = Math.floor(sorted.length * 0.75);
    const median = sorted[Math.floor(sorted.length * 0.5)];
    const q1 = sorted[q1Index];
    const q3 = sorted[q3Index];
    const iqr = q3 - q1;
    
    if (iqr === 0) {
      return new Array(data.length).fill(0);
    }
    
    return data.map(val => (val - median) / iqr);
  }

  private unitVectorNormalize(data: number[]): number[] {
    const magnitude = Math.sqrt(data.reduce((sum, val) => sum + val * val, 0));
    
    if (magnitude === 0) {
      return new Array(data.length).fill(0);
    }
    
    return data.map(val => val / magnitude);
  }

  private clipOutliers(data: number[], threshold: number): number[] {
    const mean = data.reduce((sum, val) => sum + val, 0) / data.length;
    const std = Math.sqrt(
      data.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / data.length
    );
    
    const lowerBound = mean - threshold * std;
    const upperBound = mean + threshold * std;
    
    return data.map(val => Math.max(lowerBound, Math.min(upperBound, val)));
  }

  // Feature extraction methods

  private extractNumericalFeatures(data: Record<string, any>): number[] {
    const features: number[] = [];
    
    Object.entries(data).forEach(([key, value]) => {
      if (typeof value === 'number' && !isNaN(value)) {
        features.push(value);
      } else if (typeof value === 'boolean') {
        features.push(value ? 1 : 0);
      } else if (value instanceof Date) {
        features.push(value.getTime());
      }
    });
    
    return features;
  }

  private extractCategoricalFeatures(
    data: Record<string, any>,
    method: 'one-hot' | 'label' | 'target' | 'embedding'
  ): number[] {
    const features: number[] = [];
    
    Object.entries(data).forEach(([key, value]) => {
      if (typeof value === 'string') {
        switch (method) {
          case 'one-hot':
            // Simple one-hot encoding (would need category mapping in practice)
            const hash = this.simpleHash(value) % 10; // Simplified
            const oneHot = new Array(10).fill(0);
            oneHot[hash] = 1;
            features.push(...oneHot);
            break;
          
          case 'label':
            // Convert string to numerical label
            features.push(this.simpleHash(value) % 100);
            break;
          
          default:
            features.push(this.simpleHash(value) % 100);
        }
      }
    });
    
    return features;
  }

  private generatePolynomialFeatures(data: number[], degree: number): number[] {
    const features: number[] = [];
    
    // Generate polynomial combinations up to specified degree
    for (let d = 2; d <= degree; d++) {
      for (let i = 0; i < data.length; i++) {
        features.push(Math.pow(data[i], d));
      }
    }
    
    return features;
  }

  private generateInteractionFeatures(data: number[]): number[] {
    const features: number[] = [];
    
    // Generate pairwise interactions
    for (let i = 0; i < data.length; i++) {
      for (let j = i + 1; j < data.length; j++) {
        features.push(data[i] * data[j]);
      }
    }
    
    return features;
  }

  // Helper methods

  private calculateDatasetStatistics(dataset: number[][]): {
    mean: number[];
    std: number[];
    min: number[];
    max: number[];
  } {
    const featureCount = dataset[0].length;
    const sampleCount = dataset.length;
    
    const mean = new Array(featureCount).fill(0);
    const min = new Array(featureCount).fill(Infinity);
    const max = new Array(featureCount).fill(-Infinity);
    
    // Calculate mean, min, max
    dataset.forEach(sample => {
      sample.forEach((value, featureIndex) => {
        mean[featureIndex] += value;
        min[featureIndex] = Math.min(min[featureIndex], value);
        max[featureIndex] = Math.max(max[featureIndex], value);
      });
    });
    
    mean.forEach((sum, index) => {
      mean[index] = sum / sampleCount;
    });
    
    // Calculate standard deviation
    const std = new Array(featureCount).fill(0);
    dataset.forEach(sample => {
      sample.forEach((value, featureIndex) => {
        std[featureIndex] += Math.pow(value - mean[featureIndex], 2);
      });
    });
    
    std.forEach((sum, index) => {
      std[index] = Math.sqrt(sum / sampleCount);
    });
    
    return { mean, std, min, max };
  }

  private applynormalizationWithStats(
    sample: number[],
    stats: { mean: number[]; std: number[]; min: number[]; max: number[] },
    config: NormalizationConfig
  ): number[] {
    switch (config.method) {
      case 'min-max':
        const [targetMin, targetMax] = config.range || [0, 1];
        return sample.map((val, idx) => {
          const range = stats.max[idx] - stats.min[idx];
          if (range === 0) return (targetMin + targetMax) / 2;
          return targetMin + ((val - stats.min[idx]) / range) * (targetMax - targetMin);
        });
      
      case 'z-score':
        return sample.map((val, idx) => {
          if (stats.std[idx] === 0) return 0;
          return (val - stats.mean[idx]) / stats.std[idx];
        });
      
      default:
        return sample;
    }
  }

  private detectOutliersIQR(sortedData: number[]): number[] {
    const q1Index = Math.floor(sortedData.length * 0.25);
    const q3Index = Math.floor(sortedData.length * 0.75);
    const q1 = sortedData[q1Index];
    const q3 = sortedData[q3Index];
    const iqr = q3 - q1;
    const lowerBound = q1 - 1.5 * iqr;
    const upperBound = q3 + 1.5 * iqr;
    
    return sortedData.filter(val => val < lowerBound || val > upperBound);
  }

  private simpleHash(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }

  /**
   * Get cached normalization parameters
   */
  getNormalizationCache(key: string): { mean: number[], std: number[], min: number[], max: number[] } | null {
    return this.normalizationCache.get(key) || null;
  }

  /**
   * Clear normalization cache
   */
  clearCache(): void {
    this.normalizationCache.clear();
  }
}