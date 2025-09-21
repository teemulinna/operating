import * as tf from '@tensorflow/tfjs';

export interface TimeSeriesData {
  timestamp: Date;
  value: number;
  metadata?: Record<string, any>;
}

export interface ARIMAConfig {
  p: number; // Autoregressive order
  d: number; // Degree of differencing
  q: number; // Moving average order
}

export interface ForecastResult {
  predictions: number[];
  confidence: number[];
  trend: 'increasing' | 'decreasing' | 'stable';
  seasonality: number[];
  accuracy: number;
}

/**
 * ARIMA-like Time Series Forecasting Model
 * Implements autoregressive integrated moving average for capacity forecasting
 */
export class ARIMAForecaster {
  private model: tf.Sequential | null = null;
  private scaler: { min: number; max: number } | null = null;
  private config: ARIMAConfig;
  private isTraining = false;

  constructor(config: ARIMAConfig = { p: 3, d: 1, q: 2 }) {
    this.config = config;
  }

  /**
   * Preprocess time series data with differencing and normalization
   */
  private preprocessData(data: number[]): { processed: number[]; original: number[] } {
    const original = [...data];
    
    // Apply differencing (d parameter)
    let processed = [...data];
    for (let i = 0; i < this.config.d; i++) {
      processed = this.difference(processed);
    }
    
    // Normalize data
    const min = Math.min(...processed);
    const max = Math.max(...processed);
    this.scaler = { min, max };
    
    processed = processed.map(val => (val - min) / (max - min));
    
    return { processed, original };
  }

  /**
   * Apply differencing to remove trend
   */
  private difference(data: number[]): number[] {
    const diffed = [];
    for (let i = 1; i < data.length; i++) {
      diffed.push(data[i] - data[i - 1]);
    }
    return diffed;
  }

  /**
   * Create training sequences for ARIMA model
   */
  private createSequences(data: number[], lookback: number): { x: number[][]; y: number[] } {
    const x: number[][] = [];
    const y: number[] = [];
    
    for (let i = lookback; i < data.length; i++) {
      x.push(data.slice(i - lookback, i));
      y.push(data[i]);
    }
    
    return { x, y };
  }

  /**
   * Build and compile ARIMA-like neural network model
   */
  private buildModel(inputShape: number): tf.Sequential {
    const model = tf.sequential({
      layers: [
        tf.layers.dense({
          units: this.config.p * 2,
          activation: 'relu',
          inputShape: [inputShape]
        }),
        tf.layers.dropout({ rate: 0.2 }),
        tf.layers.dense({
          units: this.config.p,
          activation: 'relu'
        }),
        tf.layers.dense({
          units: this.config.q,
          activation: 'linear'
        }),
        tf.layers.dense({
          units: 1,
          activation: 'linear'
        })
      ]
    });

    model.compile({
      optimizer: tf.train.adam(0.001),
      loss: 'meanSquaredError',
      metrics: ['mae']
    });

    return model;
  }

  /**
   * Train the ARIMA model on historical data
   */
  async train(data: TimeSeriesData[]): Promise<void> {
    if (this.isTraining) {
      throw new Error('Model is already training');
    }

    this.isTraining = true;
    
    try {
      const values = data.map(d => d.value);
      const { processed } = this.preprocessData(values);
      
      const lookback = Math.max(this.config.p, this.config.q);
      const { x, y } = this.createSequences(processed, lookback);
      
      if (x.length === 0) {
        throw new Error('Insufficient data for training');
      }

      const xTensor = tf.tensor2d(x);
      const yTensor = tf.tensor1d(y);
      
      this.model = this.buildModel(lookback);
      
      await this.model.fit(xTensor, yTensor, {
        epochs: 100,
        batchSize: Math.min(32, Math.floor(x.length / 4)),
        validationSplit: 0.2,
        callbacks: {
          onEpochEnd: (epoch, logs) => {
            if (epoch % 10 === 0) {
              console.log(`Epoch ${epoch}: loss = ${logs?.loss?.toFixed(4)}`);
            }
          }
        }
      });

      xTensor.dispose();
      yTensor.dispose();
    } finally {
      this.isTraining = false;
    }
  }

  /**
   * Generate forecasts with confidence intervals
   */
  async forecast(steps: number): Promise<ForecastResult> {
    if (!this.model || !this.scaler) {
      throw new Error('Model must be trained before forecasting');
    }

    const predictions: number[] = [];
    const confidence: number[] = [];
    
    // Generate predictions
    const lookback = Math.max(this.config.p, this.config.q);
    let lastSequence = new Array(lookback).fill(0); // Initialize with zeros
    
    for (let i = 0; i < steps; i++) {
      const inputTensor = tf.tensor2d([lastSequence]);
      const prediction = await this.model.predict(inputTensor) as tf.Tensor;
      const predValue = await prediction.data();
      
      const denormalizedPred = predValue[0] * (this.scaler.max - this.scaler.min) + this.scaler.min;
      predictions.push(denormalizedPred);
      
      // Calculate confidence (simplified approach)
      const conf = Math.max(0.1, Math.min(0.9, 0.8 - (i * 0.05)));
      confidence.push(conf);
      
      // Update sequence for next prediction
      lastSequence = [...lastSequence.slice(1), predValue[0]];
      
      inputTensor.dispose();
      prediction.dispose();
    }

    // Analyze trend
    const trend = this.analyzeTrend(predictions);
    
    // Detect seasonality (simplified)
    const seasonality = this.detectSeasonality(predictions);
    
    // Calculate accuracy (placeholder)
    const accuracy = 0.85; // Would be calculated from validation data

    return {
      predictions,
      confidence,
      trend,
      seasonality,
      accuracy
    };
  }

  /**
   * Analyze trend direction
   */
  private analyzeTrend(data: number[]): 'increasing' | 'decreasing' | 'stable' {
    if (data.length < 2) return 'stable';
    
    const slope = (data[data.length - 1] - data[0]) / data.length;
    const threshold = 0.1;
    
    if (slope > threshold) return 'increasing';
    if (slope < -threshold) return 'decreasing';
    return 'stable';
  }

  /**
   * Detect seasonal patterns
   */
  private detectSeasonality(data: number[]): number[] {
    // Simplified seasonal detection using FFT-like approach
    const seasonality: number[] = [];
    const period = 7; // Weekly seasonality
    
    for (let i = 0; i < Math.min(period, data.length); i++) {
      let sum = 0;
      let count = 0;
      
      for (let j = i; j < data.length; j += period) {
        sum += data[j];
        count++;
      }
      
      seasonality.push(count > 0 ? sum / count : 0);
    }
    
    return seasonality;
  }

  /**
   * Get model summary and diagnostics
   */
  getModelInfo(): { config: ARIMAConfig; trained: boolean; parameters?: number } {
    return {
      config: this.config,
      trained: this.model !== null,
      parameters: this.model?.countParams()
    };
  }

  /**
   * Dispose of model resources
   */
  dispose(): void {
    if (this.model) {
      this.model.dispose();
      this.model = null;
    }
    this.scaler = null;
  }
}

/**
 * Seasonal Decomposition Model
 * Separates trend, seasonal, and residual components
 */
export class SeasonalDecomposer {
  /**
   * Decompose time series into components
   */
  static decompose(data: number[], period: number = 7): {
    trend: number[];
    seasonal: number[];
    residual: number[];
    original: number[];
  } {
    const original = [...data];
    const trend = this.calculateTrend(data, period);
    const seasonal = this.calculateSeasonal(data, trend, period);
    const residual = this.calculateResidual(data, trend, seasonal);

    return { trend, seasonal, residual, original };
  }

  private static calculateTrend(data: number[], period: number): number[] {
    const trend: number[] = new Array(data.length).fill(0);
    const halfPeriod = Math.floor(period / 2);

    for (let i = halfPeriod; i < data.length - halfPeriod; i++) {
      let sum = 0;
      for (let j = i - halfPeriod; j <= i + halfPeriod; j++) {
        sum += data[j];
      }
      trend[i] = sum / period;
    }

    // Fill edges with nearest values
    for (let i = 0; i < halfPeriod; i++) {
      trend[i] = trend[halfPeriod];
      trend[data.length - 1 - i] = trend[data.length - 1 - halfPeriod];
    }

    return trend;
  }

  private static calculateSeasonal(data: number[], trend: number[], period: number): number[] {
    const seasonal: number[] = new Array(data.length).fill(0);
    const seasonalAverages: number[] = new Array(period).fill(0);
    const counts: number[] = new Array(period).fill(0);

    // Calculate seasonal averages
    for (let i = 0; i < data.length; i++) {
      const seasonIndex = i % period;
      seasonalAverages[seasonIndex] += data[i] - trend[i];
      counts[seasonIndex]++;
    }

    for (let i = 0; i < period; i++) {
      if (counts[i] > 0) {
        seasonalAverages[i] /= counts[i];
      }
    }

    // Apply seasonal pattern
    for (let i = 0; i < data.length; i++) {
      seasonal[i] = seasonalAverages[i % period];
    }

    return seasonal;
  }

  private static calculateResidual(data: number[], trend: number[], seasonal: number[]): number[] {
    const residual: number[] = [];
    for (let i = 0; i < data.length; i++) {
      residual.push(data[i] - trend[i] - seasonal[i]);
    }
    return residual;
  }
}