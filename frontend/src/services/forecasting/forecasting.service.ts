/**
 * Capacity Forecasting Service
 * 
 * Provides time series prediction using moving averages, seasonal pattern detection,
 * and capacity trend analysis for resource planning and allocation forecasting.
 */

export interface ForecastPoint {
  date: string;
  predicted: number;
  confidence: number;
  trend: 'increasing' | 'decreasing' | 'stable';
}

export interface ForecastResult {
  predictions: ForecastPoint[];
  metadata: {
    algorithm: string;
    confidence: number;
    trendDirection: 'up' | 'down' | 'stable';
    seasonality: boolean;
    dataPoints: number;
  };
}

export interface TimeSeriesData {
  date: string;
  value: number;
  category?: string;
}

export interface SeasonalPattern {
  period: number; // days
  amplitude: number; // strength of pattern
  phase: number; // offset
  confidence: number;
}

export class ForecastingService {
  private readonly MINIMUM_DATA_POINTS = 7;
  private readonly DEFAULT_FORECAST_DAYS = 30;
  private readonly SEASONAL_PERIODS = [7, 30, 90]; // weekly, monthly, quarterly patterns

  /**
   * Generate capacity forecast using time series analysis
   */
  async generateForecast(
    historicalData: TimeSeriesData[],
    forecastDays: number = this.DEFAULT_FORECAST_DAYS
  ): Promise<ForecastResult> {
    if (historicalData.length < this.MINIMUM_DATA_POINTS) {
      throw new Error(`Insufficient data: need at least ${this.MINIMUM_DATA_POINTS} points, got ${historicalData.length}`);
    }

    // Sort data by date
    const sortedData = this.sortDataByDate(historicalData);
    
    // Detect seasonal patterns
    const seasonalPattern = this.detectSeasonalPattern(sortedData);
    
    // Calculate moving averages and trend
    const movingAverages = this.calculateMovingAverages(sortedData);
    const trend = this.calculateTrend(movingAverages);
    
    // Generate predictions
    const predictions = this.generatePredictions(
      sortedData,
      movingAverages,
      trend,
      seasonalPattern,
      forecastDays
    );

    return {
      predictions,
      metadata: {
        algorithm: 'MovingAverage_Seasonal',
        confidence: this.calculateOverallConfidence(predictions),
        trendDirection: this.getTrendDirection(trend),
        seasonality: seasonalPattern !== null,
        dataPoints: sortedData.length
      }
    };
  }

  /**
   * Analyze capacity trends from historical data
   */
  analyzeCapacityTrend(data: TimeSeriesData[]): {
    direction: 'increasing' | 'decreasing' | 'stable';
    strength: number; // 0-1
    volatility: number; // 0-1
    growthRate: number; // percentage
  } {
    if (data.length < 2) {
      return { direction: 'stable', strength: 0, volatility: 0, growthRate: 0 };
    }

    const sortedData = this.sortDataByDate(data);
    const values = sortedData.map(d => d.value);
    
    // Linear regression for trend
    const trend = this.linearRegression(values);
    const slope = trend.slope;
    
    // Calculate volatility (coefficient of variation)
    const mean = values.reduce((a, b) => a + b) / values.length;
    const variance = values.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / values.length;
    const stdDev = Math.sqrt(variance);
    const volatility = Math.min(stdDev / mean, 1); // Cap at 1
    
    // Growth rate (annualized)
    const firstValue = values[0];
    const lastValue = values[values.length - 1];
    const periods = values.length - 1;
    const growthRate = periods > 0 ? ((lastValue / firstValue) ** (365 / periods) - 1) * 100 : 0;
    
    // Determine direction and strength
    const direction = Math.abs(slope) < 0.1 ? 'stable' : slope > 0 ? 'increasing' : 'decreasing';
    const strength = Math.min(Math.abs(slope) / mean, 1);

    return {
      direction,
      strength,
      volatility,
      growthRate
    };
  }

  /**
   * Detect seasonal patterns in time series data
   */
  private detectSeasonalPattern(data: TimeSeriesData[]): SeasonalPattern | null {
    if (data.length < 14) return null;

    const values = data.map(d => d.value);
    let bestPattern: SeasonalPattern | null = null;
    let bestCorrelation = 0;

    for (const period of this.SEASONAL_PERIODS) {
      if (data.length < period * 2) continue;

      const correlation = this.calculateAutocorrelation(values, period);
      
      if (correlation > bestCorrelation && correlation > 0.3) {
        bestCorrelation = correlation;
        bestPattern = {
          period,
          amplitude: this.calculateSeasonalAmplitude(values, period),
          phase: this.calculateSeasonalPhase(values, period),
          confidence: correlation
        };
      }
    }

    return bestPattern;
  }

  /**
   * Calculate moving averages for smoothing
   */
  private calculateMovingAverages(data: TimeSeriesData[], windowSize: number = 7): number[] {
    const values = data.map(d => d.value);
    const movingAvgs: number[] = [];

    for (let i = 0; i < values.length; i++) {
      const start = Math.max(0, i - Math.floor(windowSize / 2));
      const end = Math.min(values.length, i + Math.ceil(windowSize / 2));
      const window = values.slice(start, end);
      const avg = window.reduce((a, b) => a + b) / window.length;
      movingAvgs.push(avg);
    }

    return movingAvgs;
  }

  /**
   * Calculate trend using linear regression
   */
  private calculateTrend(values: number[]): { slope: number; intercept: number; r2: number } {
    return this.linearRegression(values);
  }

  /**
   * Generate future predictions
   */
  private generatePredictions(
    historicalData: TimeSeriesData[],
    movingAverages: number[],
    trend: { slope: number; intercept: number; r2: number },
    seasonalPattern: SeasonalPattern | null,
    forecastDays: number
  ): ForecastPoint[] {
    const predictions: ForecastPoint[] = [];
    const lastDate = new Date(historicalData[historicalData.length - 1].date);
    const lastValue = movingAverages[movingAverages.length - 1];

    for (let i = 1; i <= forecastDays; i++) {
      const forecastDate = new Date(lastDate);
      forecastDate.setDate(lastDate.getDate() + i);

      // Base prediction from trend
      let predicted = lastValue + (trend.slope * i);

      // Apply seasonal adjustment if pattern detected
      if (seasonalPattern) {
        const seasonalAdjustment = this.calculateSeasonalAdjustment(
          i,
          seasonalPattern
        );
        predicted += seasonalAdjustment;
      }

      // Ensure non-negative predictions for capacity
      predicted = Math.max(0, predicted);

      // Calculate confidence (decreases with distance into future)
      const baseConfidence = Math.max(trend.r2, 0.5);
      const timeDecay = Math.exp(-i / 30); // Exponential decay over 30 days
      const confidence = baseConfidence * timeDecay;

      // Determine trend direction for this point
      const trendDirection = trend.slope > 0.1 ? 'increasing' : 
                           trend.slope < -0.1 ? 'decreasing' : 'stable';

      predictions.push({
        date: forecastDate.toISOString().split('T')[0],
        predicted,
        confidence,
        trend: trendDirection
      });
    }

    return predictions;
  }

  /**
   * Sort data by date ascending
   */
  private sortDataByDate(data: TimeSeriesData[]): TimeSeriesData[] {
    return [...data].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }

  /**
   * Linear regression implementation
   */
  private linearRegression(values: number[]): { slope: number; intercept: number; r2: number } {
    const n = values.length;
    const sumX = values.reduce((acc, _, i) => acc + i, 0);
    const sumY = values.reduce((acc, val) => acc + val, 0);
    const sumXY = values.reduce((acc, val, i) => acc + (i * val), 0);
    const sumX2 = values.reduce((acc, _, i) => acc + (i * i), 0);
    const sumY2 = values.reduce((acc, val) => acc + (val * val), 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    // Calculate R²
    const yMean = sumY / n;
    const totalSumSquares = values.reduce((acc, val) => acc + Math.pow(val - yMean, 2), 0);
    const residualSumSquares = values.reduce((acc, val, i) => {
      const predicted = slope * i + intercept;
      return acc + Math.pow(val - predicted, 2);
    }, 0);
    const r2 = totalSumSquares > 0 ? 1 - (residualSumSquares / totalSumSquares) : 0;

    return { slope, intercept, r2: Math.max(0, r2) };
  }

  /**
   * Calculate autocorrelation for lag detection
   */
  private calculateAutocorrelation(values: number[], lag: number): number {
    if (values.length <= lag) return 0;

    const n = values.length - lag;
    const mean = values.reduce((a, b) => a + b) / values.length;
    
    let numerator = 0;
    let denominator = 0;

    for (let i = 0; i < n; i++) {
      numerator += (values[i] - mean) * (values[i + lag] - mean);
    }

    for (let i = 0; i < values.length; i++) {
      denominator += Math.pow(values[i] - mean, 2);
    }

    return denominator > 0 ? numerator / denominator : 0;
  }

  /**
   * Calculate seasonal amplitude
   */
  private calculateSeasonalAmplitude(values: number[], period: number): number {
    if (values.length < period * 2) return 0;

    const cycles = Math.floor(values.length / period);
    const seasonalValues: number[] = [];

    for (let phase = 0; phase < period; phase++) {
      const phaseValues: number[] = [];
      for (let cycle = 0; cycle < cycles; cycle++) {
        const index = cycle * period + phase;
        if (index < values.length) {
          phaseValues.push(values[index]);
        }
      }
      if (phaseValues.length > 0) {
        const phaseAvg = phaseValues.reduce((a, b) => a + b) / phaseValues.length;
        seasonalValues.push(phaseAvg);
      }
    }

    if (seasonalValues.length === 0) return 0;
    
    const overallMean = seasonalValues.reduce((a, b) => a + b) / seasonalValues.length;
    const maxDeviation = Math.max(...seasonalValues.map(v => Math.abs(v - overallMean)));
    
    return maxDeviation;
  }

  /**
   * Calculate seasonal phase offset
   */
  private calculateSeasonalPhase(values: number[], period: number): number {
    // Simplified: find the phase with maximum value
    if (values.length < period) return 0;

    const cycles = Math.floor(values.length / period);
    const phaseAverages: number[] = [];

    for (let phase = 0; phase < period; phase++) {
      let sum = 0;
      let count = 0;
      for (let cycle = 0; cycle < cycles; cycle++) {
        const index = cycle * period + phase;
        if (index < values.length) {
          sum += values[index];
          count++;
        }
      }
      phaseAverages.push(count > 0 ? sum / count : 0);
    }

    const maxValue = Math.max(...phaseAverages);
    return phaseAverages.indexOf(maxValue);
  }

  /**
   * Calculate seasonal adjustment for prediction
   */
  private calculateSeasonalAdjustment(dayOffset: number, pattern: SeasonalPattern): number {
    const phase = (dayOffset + pattern.phase) % pattern.period;
    const normalizedPhase = (2 * Math.PI * phase) / pattern.period;
    return pattern.amplitude * Math.sin(normalizedPhase) * pattern.confidence;
  }

  /**
   * Calculate overall forecast confidence
   */
  private calculateOverallConfidence(predictions: ForecastPoint[]): number {
    if (predictions.length === 0) return 0;
    return predictions.reduce((acc, p) => acc + p.confidence, 0) / predictions.length;
  }

  /**
   * Get trend direction from slope
   */
  private getTrendDirection(trend: { slope: number }): 'up' | 'down' | 'stable' {
    return Math.abs(trend.slope) < 0.1 ? 'stable' : trend.slope > 0 ? 'up' : 'down';
  }

  /**
   * Export forecast for external use
   */
  exportForecast(forecastResult: ForecastResult): {
    csv: string;
    json: string;
    summary: string;
  } {
    // CSV format
    const csvHeader = 'Date,Predicted,Confidence,Trend\n';
    const csvData = forecastResult.predictions
      .map(p => `${p.date},${p.predicted.toFixed(2)},${p.confidence.toFixed(3)},${p.trend}`)
      .join('\n');
    const csv = csvHeader + csvData;

    // JSON format
    const json = JSON.stringify(forecastResult, null, 2);

    // Summary
    const avgPredicted = forecastResult.predictions.reduce((acc, p) => acc + p.predicted, 0) / forecastResult.predictions.length;
    const summary = `Forecast Summary:
Algorithm: ${forecastResult.metadata.algorithm}
Data Points: ${forecastResult.metadata.dataPoints}
Predictions: ${forecastResult.predictions.length} days
Average Predicted Value: ${avgPredicted.toFixed(2)}
Overall Confidence: ${(forecastResult.metadata.confidence * 100).toFixed(1)}%
Trend Direction: ${forecastResult.metadata.trendDirection}
Seasonality Detected: ${forecastResult.metadata.seasonality ? 'Yes' : 'No'}`;

    return { csv, json, summary };
  }
}

export const forecastingService = new ForecastingService();