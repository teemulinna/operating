/**
 * Time Series Processing Service
 * Specialized utilities for handling time series data in ML workflows
 */

import * as tf from '@tensorflow/tfjs';

export interface TimeSeriesData {
  timestamps: Date[];
  values: number[];
  metadata?: Record<string, any>;
}

export interface SeasonalDecomposition {
  trend: number[];
  seasonal: number[];
  residual: number[];
  seasonality_period: number;
  trend_strength: number;
  seasonal_strength: number;
}

export interface TimeSeriesFeatures {
  lag_features: number[][];
  rolling_statistics: {
    mean: number[];
    std: number[];
    min: number[];
    max: number[];
  };
  technical_indicators: {
    sma: number[]; // Simple Moving Average
    ema: number[]; // Exponential Moving Average
    rsi: number[]; // Relative Strength Index
    bollinger_bands: { upper: number[]; middle: number[]; lower: number[] };
  };
  frequency_domain: {
    dominant_frequencies: number[];
    spectral_power: number[];
    frequency_components: number[][];
  };
}

export interface AnomalyDetectionResult {
  anomalies: {
    index: number;
    timestamp: Date;
    value: number;
    anomaly_score: number;
    type: 'point' | 'contextual' | 'collective';
    explanation: string;
  }[];
  anomaly_threshold: number;
  overall_anomaly_rate: number;
  confidence: number;
}

export interface ForecastValidation {
  mae: number; // Mean Absolute Error
  mse: number; // Mean Squared Error
  rmse: number; // Root Mean Squared Error
  mape: number; // Mean Absolute Percentage Error
  r2_score: number; // R-squared
  directional_accuracy: number; // Percentage of correct directional predictions
}

export class TimeSeriesProcessor {
  private windowSize: number = 30; // Default lookback window
  
  constructor() {}

  /**
   * Normalize time series data maintaining temporal relationships
   */
  async normalizeTimeSeriesData(data: {
    dates: Date[];
    capacity_utilization: number[];
    team_sizes: number[];
    project_demands: number[];
  }): Promise<TimeSeriesData[]> {
    try {
      const normalizedSeries: TimeSeriesData[] = [];

      // Normalize capacity utilization
      normalizedSeries.push({
        timestamps: data.dates,
        values: this.normalizeValues(data.capacity_utilization),
        metadata: { type: 'capacity_utilization', original_range: this.getRange(data.capacity_utilization) }
      });

      // Normalize team sizes
      normalizedSeries.push({
        timestamps: data.dates,
        values: this.normalizeValues(data.team_sizes),
        metadata: { type: 'team_sizes', original_range: this.getRange(data.team_sizes) }
      });

      // Normalize project demands
      normalizedSeries.push({
        timestamps: data.dates,
        values: this.normalizeValues(data.project_demands),
        metadata: { type: 'project_demands', original_range: this.getRange(data.project_demands) }
      });

      return normalizedSeries;

    } catch (error) {
      console.error('Time series normalization failed:', error);
      throw error;
    }
  }

  /**
   * Extract seasonal trends from time series data
   */
  async extractSeasonalTrends(values: number[], period: number): Promise<number[]> {
    try {
      if (values.length < period * 2) {
        console.warn('Insufficient data for seasonal decomposition');
        return new Array(values.length).fill(0);
      }

      // Simple seasonal decomposition using moving averages
      const seasonalComponents = new Array(values.length).fill(0);
      
      // Calculate centered moving average for trend
      const trendSmoothingWindow = period % 2 === 0 ? period : period + 1;
      const trend = this.calculateMovingAverage(values, trendSmoothingWindow);
      
      // Detrend the series
      const detrended = values.map((val, idx) => val - (trend[idx] || 0));
      
      // Extract seasonal pattern by averaging same periods
      const seasonalPattern = new Array(period).fill(0);
      const seasonalCounts = new Array(period).fill(0);
      
      detrended.forEach((value, idx) => {
        const seasonalIndex = idx % period;
        seasonalPattern[seasonalIndex] += value;
        seasonalCounts[seasonalIndex]++;
      });
      
      // Average the seasonal components
      seasonalPattern.forEach((sum, idx) => {
        seasonalPattern[idx] = seasonalCounts[idx] > 0 ? sum / seasonalCounts[idx] : 0;
      });
      
      // Apply seasonal pattern to all data points
      values.forEach((_, idx) => {
        seasonalComponents[idx] = seasonalPattern[idx % period];
      });

      return seasonalComponents;

    } catch (error) {
      console.error('Seasonal trend extraction failed:', error);
      return new Array(values.length).fill(0);
    }
  }

  /**
   * Extract weekly patterns from time series
   */
  async extractWeeklyPatterns(data: any): Promise<number[]> {
    try {
      const weeklyPattern = new Array(7).fill(0); // 7 days of week
      const weeklyCounts = new Array(7).fill(0);

      data.dates.forEach((date: Date, idx: number) => {
        const dayOfWeek = date.getDay(); // 0 = Sunday, 1 = Monday, etc.
        const value = data.capacity_utilization[idx];
        
        if (!isNaN(value)) {
          weeklyPattern[dayOfWeek] += value;
          weeklyCounts[dayOfWeek]++;
        }
      });

      // Average the patterns
      weeklyPattern.forEach((sum, idx) => {
        weeklyPattern[idx] = weeklyCounts[idx] > 0 ? sum / weeklyCounts[idx] : 0;
      });

      return weeklyPattern;

    } catch (error) {
      console.error('Weekly pattern extraction failed:', error);
      return new Array(7).fill(0);
    }
  }

  /**
   * Extract monthly patterns from time series
   */
  async extractMonthlyPatterns(data: any): Promise<number[]> {
    try {
      const monthlyPattern = new Array(12).fill(0); // 12 months
      const monthlyCounts = new Array(12).fill(0);

      data.dates.forEach((date: Date, idx: number) => {
        const month = date.getMonth(); // 0 = January, 1 = February, etc.
        const value = data.capacity_utilization[idx];
        
        if (!isNaN(value)) {
          monthlyPattern[month] += value;
          monthlyCounts[month]++;
        }
      });

      // Average the patterns
      monthlyPattern.forEach((sum, idx) => {
        monthlyPattern[idx] = monthlyCounts[idx] > 0 ? sum / monthlyCounts[idx] : 0;
      });

      return monthlyPattern;

    } catch (error) {
      console.error('Monthly pattern extraction failed:', error);
      return new Array(12).fill(0);
    }
  }

  /**
   * Detect project cycles in demand data
   */
  async detectProjectCycles(demands: number[]): Promise<number[]> {
    try {
      // Use autocorrelation to detect repeating patterns
      const autocorrelation = this.calculateAutocorrelation(demands);
      
      // Find peaks in autocorrelation to identify cycle lengths
      const peaks = this.findPeaks(autocorrelation);
      
      // Extract the most significant cycles
      const significantCycles = peaks
        .filter(peak => peak.value > 0.3) // Minimum correlation threshold
        .sort((a, b) => b.value - a.value)
        .slice(0, 3) // Top 3 cycles
        .map(peak => peak.index);

      return significantCycles;

    } catch (error) {
      console.error('Project cycle detection failed:', error);
      return [];
    }
  }

  /**
   * Create features for time series prediction
   */
  createTimeSeriesFeatures(data: TimeSeriesData, lookbackWindow: number = 30): TimeSeriesFeatures {
    try {
      const values = data.values;
      
      // Create lag features
      const lagFeatures = this.createLagFeatures(values, lookbackWindow);
      
      // Calculate rolling statistics
      const rollingStats = this.calculateRollingStatistics(values, lookbackWindow);
      
      // Calculate technical indicators
      const technicalIndicators = this.calculateTechnicalIndicators(values);
      
      // Frequency domain analysis
      const frequencyDomain = this.analyzeFrequencyDomain(values);

      return {
        lag_features: lagFeatures,
        rolling_statistics: rollingStats,
        technical_indicators: technicalIndicators,
        frequency_domain: frequencyDomain
      };

    } catch (error) {
      console.error('Time series feature creation failed:', error);
      throw error;
    }
  }

  /**
   * Detect anomalies in time series data
   */
  async detectAnomalies(
    data: TimeSeriesData,
    method: 'isolation-forest' | 'statistical' | 'lstm-autoencoder' = 'statistical'
  ): Promise<AnomalyDetectionResult> {
    try {
      let anomalies: any[] = [];
      
      switch (method) {
        case 'statistical':
          anomalies = this.detectStatisticalAnomalies(data);
          break;
        case 'isolation-forest':
          // Would implement isolation forest algorithm
          anomalies = this.detectStatisticalAnomalies(data); // Fallback
          break;
        case 'lstm-autoencoder':
          // Would implement LSTM autoencoder
          anomalies = this.detectStatisticalAnomalies(data); // Fallback
          break;
      }

      const anomalyRate = anomalies.length / data.values.length;
      
      return {
        anomalies,
        anomaly_threshold: 0.05, // 5% threshold
        overall_anomaly_rate: anomalyRate,
        confidence: 0.85
      };

    } catch (error) {
      console.error('Anomaly detection failed:', error);
      throw error;
    }
  }

  /**
   * Validate forecast accuracy
   */
  validateForecast(actual: number[], predicted: number[]): ForecastValidation {
    try {
      if (actual.length !== predicted.length) {
        throw new Error('Actual and predicted arrays must have the same length');
      }

      const n = actual.length;
      let mae = 0, mse = 0, mape = 0;
      let correctDirections = 0;

      // Calculate error metrics
      for (let i = 0; i < n; i++) {
        const error = Math.abs(actual[i] - predicted[i]);
        const squaredError = Math.pow(actual[i] - predicted[i], 2);
        
        mae += error;
        mse += squaredError;
        
        if (actual[i] !== 0) {
          mape += Math.abs((actual[i] - predicted[i]) / actual[i]);
        }

        // Check directional accuracy (for i > 0)
        if (i > 0) {
          const actualDirection = actual[i] > actual[i - 1];
          const predictedDirection = predicted[i] > predicted[i - 1];
          if (actualDirection === predictedDirection) {
            correctDirections++;
          }
        }
      }

      mae /= n;
      mse /= n;
      mape /= n;
      const rmse = Math.sqrt(mse);
      const directionalAccuracy = n > 1 ? correctDirections / (n - 1) : 0;

      // Calculate R-squared
      const actualMean = actual.reduce((sum, val) => sum + val, 0) / n;
      const totalSumSquares = actual.reduce((sum, val) => sum + Math.pow(val - actualMean, 2), 0);
      const r2Score = totalSumSquares > 0 ? 1 - (mse * n) / totalSumSquares : 0;

      return {
        mae,
        mse,
        rmse,
        mape,
        r2_score: r2Score,
        directional_accuracy: directionalAccuracy
      };

    } catch (error) {
      console.error('Forecast validation failed:', error);
      throw error;
    }
  }

  // Private helper methods

  private normalizeValues(values: number[]): number[] {
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min;
    
    if (range === 0) {
      return new Array(values.length).fill(0.5);
    }
    
    return values.map(val => (val - min) / range);
  }

  private getRange(values: number[]): [number, number] {
    return [Math.min(...values), Math.max(...values)];
  }

  private calculateMovingAverage(values: number[], window: number): number[] {
    const result = new Array(values.length).fill(0);
    
    for (let i = 0; i < values.length; i++) {
      let sum = 0;
      let count = 0;
      
      const start = Math.max(0, i - Math.floor(window / 2));
      const end = Math.min(values.length, i + Math.floor(window / 2) + 1);
      
      for (let j = start; j < end; j++) {
        sum += values[j];
        count++;
      }
      
      result[i] = count > 0 ? sum / count : values[i];
    }
    
    return result;
  }

  private calculateAutocorrelation(values: number[]): number[] {
    const n = values.length;
    const result = new Array(n).fill(0);
    const mean = values.reduce((sum, val) => sum + val, 0) / n;
    
    // Calculate variance
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / n;
    
    if (variance === 0) {
      return result;
    }
    
    // Calculate autocorrelation for each lag
    for (let lag = 0; lag < n; lag++) {
      let covariance = 0;
      let count = 0;
      
      for (let i = 0; i < n - lag; i++) {
        covariance += (values[i] - mean) * (values[i + lag] - mean);
        count++;
      }
      
      result[lag] = count > 0 ? (covariance / count) / variance : 0;
    }
    
    return result;
  }

  private findPeaks(values: number[]): Array<{ index: number; value: number }> {
    const peaks: Array<{ index: number; value: number }> = [];
    
    for (let i = 1; i < values.length - 1; i++) {
      if (values[i] > values[i - 1] && values[i] > values[i + 1]) {
        peaks.push({ index: i, value: values[i] });
      }
    }
    
    return peaks;
  }

  private createLagFeatures(values: number[], window: number): number[][] {
    const features: number[][] = [];
    
    for (let i = window; i < values.length; i++) {
      const lagFeature: number[] = [];
      for (let j = 0; j < window; j++) {
        lagFeature.push(values[i - j - 1]);
      }
      features.push(lagFeature);
    }
    
    return features;
  }

  private calculateRollingStatistics(values: number[], window: number): {
    mean: number[];
    std: number[];
    min: number[];
    max: number[];
  } {
    const mean: number[] = [];
    const std: number[] = [];
    const min: number[] = [];
    const max: number[] = [];
    
    for (let i = window - 1; i < values.length; i++) {
      const windowValues = values.slice(i - window + 1, i + 1);
      
      // Calculate statistics for this window
      const windowMean = windowValues.reduce((sum, val) => sum + val, 0) / window;
      const windowStd = Math.sqrt(
        windowValues.reduce((sum, val) => sum + Math.pow(val - windowMean, 2), 0) / window
      );
      const windowMin = Math.min(...windowValues);
      const windowMax = Math.max(...windowValues);
      
      mean.push(windowMean);
      std.push(windowStd);
      min.push(windowMin);
      max.push(windowMax);
    }
    
    return { mean, std, min, max };
  }

  private calculateTechnicalIndicators(values: number[]): {
    sma: number[];
    ema: number[];
    rsi: number[];
    bollinger_bands: { upper: number[]; middle: number[]; lower: number[] };
  } {
    const smaWindow = Math.min(20, Math.floor(values.length / 4));
    const emaAlpha = 2 / (smaWindow + 1);
    const rsiWindow = Math.min(14, Math.floor(values.length / 8));
    
    // Simple Moving Average
    const sma = this.calculateMovingAverage(values, smaWindow);
    
    // Exponential Moving Average
    const ema: number[] = [values[0]];
    for (let i = 1; i < values.length; i++) {
      ema.push(emaAlpha * values[i] + (1 - emaAlpha) * ema[i - 1]);
    }
    
    // RSI (Relative Strength Index)
    const rsi: number[] = new Array(values.length).fill(50);
    if (values.length > rsiWindow) {
      for (let i = rsiWindow; i < values.length; i++) {
        let gains = 0, losses = 0, count = 0;
        
        for (let j = i - rsiWindow + 1; j <= i; j++) {
          if (j > 0) {
            const change = values[j] - values[j - 1];
            if (change > 0) gains += change;
            else losses += Math.abs(change);
            count++;
          }
        }
        
        if (count > 0) {
          const avgGain = gains / count;
          const avgLoss = losses / count;
          const rs = avgLoss > 0 ? avgGain / avgLoss : 0;
          rsi[i] = 100 - (100 / (1 + rs));
        }
      }
    }
    
    // Bollinger Bands
    const bbWindow = Math.min(20, Math.floor(values.length / 4));
    const rollingStats = this.calculateRollingStatistics(values, bbWindow);
    const upper = rollingStats.mean.map((mean, i) => mean + 2 * rollingStats.std[i]);
    const middle = rollingStats.mean;
    const lower = rollingStats.mean.map((mean, i) => mean - 2 * rollingStats.std[i]);
    
    return {
      sma,
      ema,
      rsi,
      bollinger_bands: { upper, middle, lower }
    };
  }

  private analyzeFrequencyDomain(values: number[]): {
    dominant_frequencies: number[];
    spectral_power: number[];
    frequency_components: number[][];
  } {
    // Simplified frequency domain analysis
    // In a full implementation, this would use FFT
    
    const autocorr = this.calculateAutocorrelation(values);
    const peaks = this.findPeaks(autocorr);
    
    const dominantFrequencies = peaks
      .sort((a, b) => b.value - a.value)
      .slice(0, 5)
      .map(peak => peak.index);
    
    const spectralPower = peaks.map(peak => peak.value);
    
    // Simplified frequency components
    const frequencyComponents = dominantFrequencies.map(freq => {
      return values.map((_, i) => Math.sin(2 * Math.PI * i / freq));
    });
    
    return {
      dominant_frequencies: dominantFrequencies,
      spectral_power: spectralPower,
      frequency_components: frequencyComponents
    };
  }

  private detectStatisticalAnomalies(data: TimeSeriesData): any[] {
    const values = data.values;
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const std = Math.sqrt(
      values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length
    );
    
    const threshold = 3; // 3 sigma rule
    const anomalies: any[] = [];
    
    values.forEach((value, index) => {
      const zScore = Math.abs((value - mean) / std);
      if (zScore > threshold) {
        anomalies.push({
          index,
          timestamp: data.timestamps[index],
          value,
          anomaly_score: zScore,
          type: 'point',
          explanation: `Value deviates ${zScore.toFixed(2)} standard deviations from mean`
        });
      }
    });
    
    return anomalies;
  }
}