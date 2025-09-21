import * as tf from '@tensorflow/tfjs';
import { ARIMAForecaster, TimeSeriesData, SeasonalDecomposer } from './time-series-models';
import { DemandPredictor, HistoricalProject } from './demand-predictor';
import { ScenarioSimulator, Scenario, ScenarioResult } from './scenario-simulator';

export interface MLPipelineConfig {
  models: {
    arima: { enabled: boolean; config?: any };
    neural: { enabled: boolean; architecture?: string };
    ensemble: { enabled: boolean; weights?: number[] };
  };
  preprocessing: {
    normalization: 'minmax' | 'zscore' | 'robust';
    outlierDetection: boolean;
    missingValueHandling: 'interpolate' | 'forward_fill' | 'remove';
  };
  validation: {
    splitRatio: number;
    crossValidation: boolean;
    folds?: number;
  };
  hyperparameters: {
    learning_rate: number;
    batch_size: number;
    epochs: number;
    dropout_rate: number;
  };
}

export interface ModelPerformance {
  mae: number; // Mean Absolute Error
  mse: number; // Mean Squared Error
  rmse: number; // Root Mean Squared Error
  mape: number; // Mean Absolute Percentage Error
  r2: number; // R-squared
  accuracy?: number;
}

export interface ValidationResult {
  performance: ModelPerformance;
  predictions: number[];
  actuals: number[];
  residuals: number[];
  crossValidationScores?: number[];
}

export interface PipelineResult {
  model: tf.LayersModel | null;
  validation: ValidationResult;
  preprocessing: {
    scaler: { min: number; max: number } | null;
    outliers: number[];
    missingValues: number;
  };
  metadata: {
    trainingTime: number;
    modelSize: number;
    features: string[];
    target: string;
  };
}

/**
 * Comprehensive ML Pipeline for Capacity Forecasting
 * Integrates TensorFlow.js with preprocessing, validation, and model ensemble capabilities
 */
export class MLPipeline {
  private config: MLPipelineConfig;
  private models: Map<string, tf.LayersModel> = new Map();
  private preprocessors: Map<string, any> = new Map();
  private arimaForecaster: ARIMAForecaster;
  private demandPredictor: DemandPredictor;
  private scenarioSimulator: ScenarioSimulator;

  constructor(config: Partial<MLPipelineConfig> = {}) {
    this.config = {
      models: {
        arima: { enabled: true },
        neural: { enabled: true, architecture: 'lstm' },
        ensemble: { enabled: true, weights: [0.4, 0.6] }
      },
      preprocessing: {
        normalization: 'minmax',
        outlierDetection: true,
        missingValueHandling: 'interpolate'
      },
      validation: {
        splitRatio: 0.2,
        crossValidation: true,
        folds: 5
      },
      hyperparameters: {
        learning_rate: 0.001,
        batch_size: 32,
        epochs: 100,
        dropout_rate: 0.2
      },
      ...config
    };

    this.arimaForecaster = new ARIMAForecaster();
    this.demandPredictor = new DemandPredictor();
    this.scenarioSimulator = new ScenarioSimulator(this.demandPredictor);
  }

  /**
   * Train the complete ML pipeline
   */
  async trainPipeline(
    data: TimeSeriesData[],
    features: string[] = ['utilization', 'demand', 'capacity'],
    target: string = 'future_utilization'
  ): Promise<PipelineResult> {
    const startTime = performance.now();

    try {
      // 1. Data preprocessing
      console.log('Starting data preprocessing...');
      const preprocessedData = await this.preprocessData(data);

      // 2. Feature engineering
      const engineeredFeatures = await this.engineerFeatures(preprocessedData, features);

      // 3. Data splitting
      const { trainData, validationData, testData } = this.splitData(
        engineeredFeatures,
        this.config.validation.splitRatio
      );

      // 4. Model training
      let primaryModel: tf.LayersModel | null = null;
      const modelPerformances: Record<string, ValidationResult> = {};

      if (this.config.models.arima.enabled) {
        console.log('Training ARIMA model...');
        await this.trainARIMAModel(trainData);
        const arimaPerformance = await this.validateARIMAModel(validationData);
        modelPerformances['arima'] = arimaPerformance;
      }

      if (this.config.models.neural.enabled) {
        console.log('Training neural network model...');
        primaryModel = await this.trainNeuralModel(trainData, this.config.models.neural.architecture!);
        const neuralPerformance = await this.validateNeuralModel(primaryModel, validationData);
        modelPerformances['neural'] = neuralPerformance;
        this.models.set('primary', primaryModel);
      }

      // 5. Ensemble model training
      let finalValidation: ValidationResult;
      if (this.config.models.ensemble.enabled && Object.keys(modelPerformances).length > 1) {
        console.log('Training ensemble model...');
        const ensembleModel = await this.createEnsembleModel(modelPerformances);
        finalValidation = await this.validateEnsembleModel(ensembleModel, testData);
        this.models.set('ensemble', ensembleModel as tf.LayersModel);
      } else {
        // Use best performing single model
        const bestModel = this.selectBestModel(modelPerformances);
        finalValidation = modelPerformances[bestModel];
      }

      // 6. Final model evaluation
      const finalModel = this.models.get('ensemble') || primaryModel;
      const modelSize = finalModel ? finalModel.countParams() : 0;

      const trainingTime = performance.now() - startTime;

      console.log(`Pipeline training completed in ${(trainingTime / 1000).toFixed(2)}s`);
      console.log(`Final model performance - RMSE: ${finalValidation.performance.rmse.toFixed(4)}, MAE: ${finalValidation.performance.mae.toFixed(4)}`);

      return {
        model: finalModel,
        validation: finalValidation,
        preprocessing: {
          scaler: this.preprocessors.get('scaler') || null,
          outliers: this.preprocessors.get('outliers') || [],
          missingValues: this.preprocessors.get('missingValues') || 0
        },
        metadata: {
          trainingTime,
          modelSize,
          features,
          target
        }
      };

    } catch (error) {
      console.error('Error in ML pipeline training:', error);
      throw error;
    }
  }

  /**
   * Make predictions using the trained pipeline
   */
  async predict(
    inputData: TimeSeriesData[],
    horizon: number = 30,
    includeConfidence: boolean = true
  ): Promise<{
    predictions: number[];
    confidence?: number[];
    scenarios?: ScenarioResult[];
    decomposition?: any;
  }> {
    const model = this.models.get('ensemble') || this.models.get('primary');
    if (!model) {
      throw new Error('No trained model available for prediction');
    }

    // Preprocess input data
    const processedInput = await this.preprocessData(inputData);
    
    // Generate base predictions
    const predictions = await this.generatePredictions(model, processedInput, horizon);
    
    let confidence: number[] | undefined;
    if (includeConfidence) {
      confidence = await this.calculatePredictionConfidence(predictions, processedInput);
    }

    // Seasonal decomposition for additional insights
    const decomposition = SeasonalDecomposer.decompose(
      inputData.map(d => d.value),
      7 // Weekly seasonality
    );

    return {
      predictions,
      confidence,
      decomposition
    };
  }

  /**
   * Perform hyperparameter optimization
   */
  async optimizeHyperparameters(
    data: TimeSeriesData[],
    parameterSpace: Record<string, number[]>
  ): Promise<{
    bestParams: Record<string, number>;
    bestScore: number;
    allResults: Array<{ params: Record<string, number>; score: number }>;
  }> {
    const allResults: Array<{ params: Record<string, number>; score: number }> = [];
    let bestScore = Infinity;
    let bestParams: Record<string, number> = {};

    // Grid search over parameter space
    const paramNames = Object.keys(parameterSpace);
    const paramCombinations = this.generateParameterCombinations(parameterSpace);

    console.log(`Starting hyperparameter optimization with ${paramCombinations.length} combinations...`);

    for (const params of paramCombinations) {
      try {
        // Update config with current parameters
        const tempConfig = { ...this.config };
        Object.assign(tempConfig.hyperparameters, params);

        // Train with current parameters
        const pipeline = new MLPipeline(tempConfig);
        const result = await pipeline.trainPipeline(data);
        
        const score = result.validation.performance.rmse;
        allResults.push({ params, score });

        if (score < bestScore) {
          bestScore = score;
          bestParams = { ...params };
        }

        console.log(`Params: ${JSON.stringify(params)}, Score: ${score.toFixed(4)}`);
      } catch (error) {
        console.warn(`Failed to evaluate params ${JSON.stringify(params)}:`, error.message);
      }
    }

    console.log(`Optimization completed. Best RMSE: ${bestScore.toFixed(4)}`);
    return { bestParams, bestScore, allResults };
  }

  // Private helper methods

  private async preprocessData(data: TimeSeriesData[]): Promise<{
    processed: TimeSeriesData[];
    metadata: Record<string, any>;
  }> {
    let processed = [...data];
    const metadata: Record<string, any> = {};

    // Handle missing values
    processed = this.handleMissingValues(processed);
    metadata.missingValues = data.length - processed.length;
    this.preprocessors.set('missingValues', metadata.missingValues);

    // Outlier detection and handling
    if (this.config.preprocessing.outlierDetection) {
      const outliers = this.detectOutliers(processed);
      processed = this.handleOutliers(processed, outliers);
      metadata.outliers = outliers;
      this.preprocessors.set('outliers', outliers);
    }

    // Normalization
    const normalized = this.normalizeData(processed);
    metadata.scaler = normalized.scaler;
    this.preprocessors.set('scaler', normalized.scaler);

    return { processed: normalized.data, metadata };
  }

  private handleMissingValues(data: TimeSeriesData[]): TimeSeriesData[] {
    switch (this.config.preprocessing.missingValueHandling) {
      case 'interpolate':
        return this.interpolateMissingValues(data);
      case 'forward_fill':
        return this.forwardFillMissingValues(data);
      case 'remove':
        return data.filter(d => d.value !== null && d.value !== undefined && !isNaN(d.value));
      default:
        return data;
    }
  }

  private interpolateMissingValues(data: TimeSeriesData[]): TimeSeriesData[] {
    const result = [...data];
    
    for (let i = 1; i < result.length - 1; i++) {
      if (isNaN(result[i].value) || result[i].value === null || result[i].value === undefined) {
        // Linear interpolation
        let prevIndex = i - 1;
        let nextIndex = i + 1;
        
        while (prevIndex >= 0 && (isNaN(result[prevIndex].value) || result[prevIndex].value === null)) {
          prevIndex--;
        }
        
        while (nextIndex < result.length && (isNaN(result[nextIndex].value) || result[nextIndex].value === null)) {
          nextIndex++;
        }
        
        if (prevIndex >= 0 && nextIndex < result.length) {
          const prevValue = result[prevIndex].value;
          const nextValue = result[nextIndex].value;
          const ratio = (i - prevIndex) / (nextIndex - prevIndex);
          result[i] = { ...result[i], value: prevValue + (nextValue - prevValue) * ratio };
        }
      }
    }
    
    return result;
  }

  private forwardFillMissingValues(data: TimeSeriesData[]): TimeSeriesData[] {
    const result = [...data];
    let lastValidValue = result[0]?.value || 0;
    
    for (let i = 0; i < result.length; i++) {
      if (isNaN(result[i].value) || result[i].value === null || result[i].value === undefined) {
        result[i] = { ...result[i], value: lastValidValue };
      } else {
        lastValidValue = result[i].value;
      }
    }
    
    return result;
  }

  private detectOutliers(data: TimeSeriesData[]): number[] {
    const values = data.map(d => d.value);
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const std = Math.sqrt(values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length);
    
    const outlierIndices: number[] = [];
    const threshold = 3; // 3-sigma rule
    
    values.forEach((value, index) => {
      if (Math.abs(value - mean) > threshold * std) {
        outlierIndices.push(index);
      }
    });
    
    return outlierIndices;
  }

  private handleOutliers(data: TimeSeriesData[], outliers: number[]): TimeSeriesData[] {
    const result = [...data];
    const values = data.map(d => d.value);
    const median = this.calculateMedian(values);
    
    outliers.forEach(index => {
      result[index] = { ...result[index], value: median };
    });
    
    return result;
  }

  private calculateMedian(values: number[]): number {
    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
  }

  private normalizeData(data: TimeSeriesData[]): {
    data: TimeSeriesData[];
    scaler: { min: number; max: number };
  } {
    const values = data.map(d => d.value);
    
    switch (this.config.preprocessing.normalization) {
      case 'minmax': {
        const min = Math.min(...values);
        const max = Math.max(...values);
        const range = max - min;
        
        const normalizedData = data.map(d => ({
          ...d,
          value: range > 0 ? (d.value - min) / range : 0
        }));
        
        return { data: normalizedData, scaler: { min, max } };
      }
      
      case 'zscore': {
        const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
        const std = Math.sqrt(values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length);
        
        const normalizedData = data.map(d => ({
          ...d,
          value: std > 0 ? (d.value - mean) / std : 0
        }));
        
        return { data: normalizedData, scaler: { min: mean, max: std } };
      }
      
      case 'robust': {
        const median = this.calculateMedian(values);
        const mad = this.calculateMAD(values, median);
        
        const normalizedData = data.map(d => ({
          ...d,
          value: mad > 0 ? (d.value - median) / mad : 0
        }));
        
        return { data: normalizedData, scaler: { min: median, max: mad } };
      }
      
      default:
        return { data, scaler: { min: 0, max: 1 } };
    }
  }

  private calculateMAD(values: number[], median: number): number {
    const deviations = values.map(val => Math.abs(val - median));
    return this.calculateMedian(deviations);
  }

  private async engineerFeatures(
    data: { processed: TimeSeriesData[]; metadata: Record<string, any> },
    features: string[]
  ): Promise<{ features: number[][]; targets: number[]; timestamps: Date[] }> {
    const processed = data.processed;
    const engineeredFeatures: number[][] = [];
    const targets: number[] = [];
    const timestamps: Date[] = [];
    
    const windowSize = 10; // Use 10 previous values as features
    
    for (let i = windowSize; i < processed.length; i++) {
      const featureVector: number[] = [];
      
      // Time-based features
      const currentDate = processed[i].timestamp;
      featureVector.push(
        currentDate.getDay() / 7, // Day of week normalized
        currentDate.getDate() / 31, // Day of month normalized
        currentDate.getMonth() / 12 // Month normalized
      );
      
      // Historical values
      for (let j = i - windowSize; j < i; j++) {
        featureVector.push(processed[j].value);
      }
      
      // Statistical features over window
      const window = processed.slice(i - windowSize, i).map(d => d.value);
      featureVector.push(
        window.reduce((sum, val) => sum + val, 0) / window.length, // Mean
        Math.sqrt(window.reduce((sum, val, _, arr) => {
          const mean = arr.reduce((s, v) => s + v, 0) / arr.length;
          return sum + Math.pow(val - mean, 2);
        }, 0) / window.length), // Std dev
        Math.max(...window), // Max
        Math.min(...window) // Min
      );
      
      engineeredFeatures.push(featureVector);
      targets.push(processed[i].value);
      timestamps.push(processed[i].timestamp);
    }
    
    return { features: engineeredFeatures, targets, timestamps };
  }

  private splitData(
    data: { features: number[][]; targets: number[]; timestamps: Date[] },
    validationRatio: number
  ): {
    trainData: { features: number[][]; targets: number[]; timestamps: Date[] };
    validationData: { features: number[][]; targets: number[]; timestamps: Date[] };
    testData: { features: number[][]; targets: number[]; timestamps: Date[] };
  } {
    const totalSize = data.features.length;
    const validationSize = Math.floor(totalSize * validationRatio);
    const testSize = Math.floor(totalSize * 0.1); // 10% for test
    const trainSize = totalSize - validationSize - testSize;

    return {
      trainData: {
        features: data.features.slice(0, trainSize),
        targets: data.targets.slice(0, trainSize),
        timestamps: data.timestamps.slice(0, trainSize)
      },
      validationData: {
        features: data.features.slice(trainSize, trainSize + validationSize),
        targets: data.targets.slice(trainSize, trainSize + validationSize),
        timestamps: data.timestamps.slice(trainSize, trainSize + validationSize)
      },
      testData: {
        features: data.features.slice(trainSize + validationSize),
        targets: data.targets.slice(trainSize + validationSize),
        timestamps: data.timestamps.slice(trainSize + validationSize)
      }
    };
  }

  private async trainARIMAModel(
    data: { features: number[][]; targets: number[]; timestamps: Date[] }
  ): Promise<void> {
    const timeSeriesData = data.timestamps.map((timestamp, i) => ({
      timestamp,
      value: data.targets[i],
      metadata: {}
    }));

    await this.arimaForecaster.train(timeSeriesData);
  }

  private async validateARIMAModel(
    data: { features: number[][]; targets: number[]; timestamps: Date[] }
  ): Promise<ValidationResult> {
    const forecast = await this.arimaForecaster.forecast(data.targets.length);
    const predictions = forecast.predictions;
    
    return this.calculatePerformanceMetrics(predictions, data.targets);
  }

  private async trainNeuralModel(
    data: { features: number[][]; targets: number[]; timestamps: Date[] },
    architecture: string
  ): Promise<tf.LayersModel> {
    const { features, targets } = data;
    const featureTensor = tf.tensor2d(features);
    const targetTensor = tf.tensor1d(targets);

    let model: tf.Sequential;

    switch (architecture) {
      case 'lstm':
        model = this.buildLSTMModel(features[0].length);
        break;
      case 'cnn':
        model = this.buildCNNModel(features[0].length);
        break;
      case 'transformer':
        model = this.buildTransformerModel(features[0].length);
        break;
      default:
        model = this.buildDenseModel(features[0].length);
    }

    await model.fit(featureTensor, targetTensor, {
      epochs: this.config.hyperparameters.epochs,
      batchSize: this.config.hyperparameters.batch_size,
      validationSplit: 0.2,
      callbacks: {
        onEpochEnd: (epoch, logs) => {
          if (epoch % 10 === 0) {
            console.log(`Epoch ${epoch}: loss = ${logs?.loss?.toFixed(4)}, val_loss = ${logs?.val_loss?.toFixed(4)}`);
          }
        }
      }
    });

    featureTensor.dispose();
    targetTensor.dispose();

    return model;
  }

  private buildLSTMModel(inputSize: number): tf.Sequential {
    return tf.sequential({
      layers: [
        tf.layers.reshape({ targetShape: [inputSize, 1], inputShape: [inputSize] }),
        tf.layers.lstm({ units: 64, returnSequences: true }),
        tf.layers.dropout({ rate: this.config.hyperparameters.dropout_rate }),
        tf.layers.lstm({ units: 32, returnSequences: false }),
        tf.layers.dropout({ rate: this.config.hyperparameters.dropout_rate }),
        tf.layers.dense({ units: 16, activation: 'relu' }),
        tf.layers.dense({ units: 1, activation: 'linear' })
      ]
    });
  }

  private buildCNNModel(inputSize: number): tf.Sequential {
    return tf.sequential({
      layers: [
        tf.layers.reshape({ targetShape: [inputSize, 1], inputShape: [inputSize] }),
        tf.layers.conv1d({ filters: 32, kernelSize: 3, activation: 'relu' }),
        tf.layers.maxPooling1d({ poolSize: 2 }),
        tf.layers.conv1d({ filters: 64, kernelSize: 3, activation: 'relu' }),
        tf.layers.globalMaxPooling1d(),
        tf.layers.dense({ units: 32, activation: 'relu' }),
        tf.layers.dropout({ rate: this.config.hyperparameters.dropout_rate }),
        tf.layers.dense({ units: 1, activation: 'linear' })
      ]
    });
  }

  private buildTransformerModel(inputSize: number): tf.Sequential {
    // Simplified transformer-like architecture
    return tf.sequential({
      layers: [
        tf.layers.dense({ units: 128, activation: 'relu', inputShape: [inputSize] }),
        tf.layers.dropout({ rate: this.config.hyperparameters.dropout_rate }),
        tf.layers.dense({ units: 64, activation: 'relu' }),
        tf.layers.dropout({ rate: this.config.hyperparameters.dropout_rate }),
        tf.layers.dense({ units: 32, activation: 'relu' }),
        tf.layers.dense({ units: 1, activation: 'linear' })
      ]
    });
  }

  private buildDenseModel(inputSize: number): tf.Sequential {
    return tf.sequential({
      layers: [
        tf.layers.dense({ units: 128, activation: 'relu', inputShape: [inputSize] }),
        tf.layers.dropout({ rate: this.config.hyperparameters.dropout_rate }),
        tf.layers.dense({ units: 64, activation: 'relu' }),
        tf.layers.dropout({ rate: this.config.hyperparameters.dropout_rate }),
        tf.layers.dense({ units: 32, activation: 'relu' }),
        tf.layers.dense({ units: 1, activation: 'linear' })
      ]
    });
  }

  private async validateNeuralModel(
    model: tf.LayersModel,
    data: { features: number[][]; targets: number[]; timestamps: Date[] }
  ): Promise<ValidationResult> {
    const featureTensor = tf.tensor2d(data.features);
    const predictions = await model.predict(featureTensor) as tf.Tensor;
    const predictionsData = await predictions.data();
    
    featureTensor.dispose();
    predictions.dispose();

    return this.calculatePerformanceMetrics(Array.from(predictionsData), data.targets);
  }

  private async createEnsembleModel(performances: Record<string, ValidationResult>): Promise<tf.LayersModel> {
    // Create a simple averaging ensemble
    const weights = this.config.models.ensemble.weights || [0.5, 0.5];
    
    // For simplicity, return the best performing model
    // In production, would create a proper ensemble model
    const bestModel = this.selectBestModel(performances);
    return this.models.get(bestModel === 'arima' ? 'primary' : bestModel)!;
  }

  private async validateEnsembleModel(
    model: tf.LayersModel,
    data: { features: number[][]; targets: number[]; timestamps: Date[] }
  ): Promise<ValidationResult> {
    return this.validateNeuralModel(model, data);
  }

  private selectBestModel(performances: Record<string, ValidationResult>): string {
    let bestModel = '';
    let bestScore = Infinity;
    
    for (const [modelName, performance] of Object.entries(performances)) {
      if (performance.performance.rmse < bestScore) {
        bestScore = performance.performance.rmse;
        bestModel = modelName;
      }
    }
    
    return bestModel;
  }

  private calculatePerformanceMetrics(predictions: number[], actuals: number[]): ValidationResult {
    const n = predictions.length;
    const residuals = predictions.map((pred, i) => pred - actuals[i]);
    
    // Mean Absolute Error
    const mae = residuals.reduce((sum, res) => sum + Math.abs(res), 0) / n;
    
    // Mean Squared Error
    const mse = residuals.reduce((sum, res) => sum + res * res, 0) / n;
    
    // Root Mean Squared Error
    const rmse = Math.sqrt(mse);
    
    // Mean Absolute Percentage Error
    const mape = predictions.reduce((sum, pred, i) => {
      return sum + (actuals[i] !== 0 ? Math.abs(residuals[i] / actuals[i]) : 0);
    }, 0) / n;
    
    // R-squared
    const actualMean = actuals.reduce((sum, val) => sum + val, 0) / n;
    const totalSumSquares = actuals.reduce((sum, val) => sum + Math.pow(val - actualMean, 2), 0);
    const residualSumSquares = residuals.reduce((sum, res) => sum + res * res, 0);
    const r2 = totalSumSquares > 0 ? 1 - (residualSumSquares / totalSumSquares) : 0;

    return {
      performance: { mae, mse, rmse, mape, r2 },
      predictions,
      actuals,
      residuals
    };
  }

  private async generatePredictions(
    model: tf.LayersModel,
    data: { processed: TimeSeriesData[]; metadata: Record<string, any> },
    horizon: number
  ): Promise<number[]> {
    const predictions: number[] = [];
    const windowSize = 10;
    let currentData = [...data.processed];
    
    for (let step = 0; step < horizon; step++) {
      if (currentData.length < windowSize) break;
      
      // Extract features for current step
      const recent = currentData.slice(-windowSize);
      const currentDate = new Date(recent[recent.length - 1].timestamp.getTime() + 24 * 60 * 60 * 1000);
      
      const features = [
        currentDate.getDay() / 7,
        currentDate.getDate() / 31,
        currentDate.getMonth() / 12,
        ...recent.map(d => d.value),
        // Statistical features
        recent.reduce((sum, d) => sum + d.value, 0) / recent.length, // Mean
        Math.sqrt(recent.reduce((sum, d, _, arr) => {
          const mean = arr.reduce((s, v) => s + v.value, 0) / arr.length;
          return sum + Math.pow(d.value - mean, 2);
        }, 0) / recent.length), // Std dev
        Math.max(...recent.map(d => d.value)),
        Math.min(...recent.map(d => d.value))
      ];
      
      const featureTensor = tf.tensor2d([features]);
      const prediction = await model.predict(featureTensor) as tf.Tensor;
      const predictionValue = (await prediction.data())[0];
      
      predictions.push(predictionValue);
      
      // Add prediction to current data for next step
      currentData.push({
        timestamp: currentDate,
        value: predictionValue,
        metadata: { predicted: true }
      });
      
      featureTensor.dispose();
      prediction.dispose();
    }
    
    return predictions;
  }

  private async calculatePredictionConfidence(
    predictions: number[],
    historicalData: { processed: TimeSeriesData[]; metadata: Record<string, any> }
  ): Promise<number[]> {
    // Simple confidence calculation based on historical variance
    const values = historicalData.processed.map(d => d.value);
    const variance = values.reduce((sum, val, _, arr) => {
      const mean = arr.reduce((s, v) => s + v, 0) / arr.length;
      return sum + Math.pow(val - mean, 2);
    }, 0) / values.length;
    
    const baseConfidence = Math.min(0.95, Math.max(0.1, 1 / (1 + variance)));
    
    return predictions.map((_, i) => {
      // Confidence decreases with prediction distance
      return baseConfidence * Math.exp(-i * 0.1);
    });
  }

  private generateParameterCombinations(paramSpace: Record<string, number[]>): Record<string, number>[] {
    const paramNames = Object.keys(paramSpace);
    if (paramNames.length === 0) return [{}];
    
    const combinations: Record<string, number>[] = [];
    
    function generateCombos(index: number, current: Record<string, number>) {
      if (index === paramNames.length) {
        combinations.push({ ...current });
        return;
      }
      
      const paramName = paramNames[index];
      for (const value of paramSpace[paramName]) {
        current[paramName] = value;
        generateCombos(index + 1, current);
      }
    }
    
    generateCombos(0, {});
    return combinations;
  }

  /**
   * Save trained model
   */
  async saveModel(modelName: string): Promise<void> {
    const model = this.models.get(modelName);
    if (!model) {
      throw new Error(`Model ${modelName} not found`);
    }

    await model.save(`localstorage://forecasting-model-${modelName}`);
  }

  /**
   * Load saved model
   */
  async loadModel(modelName: string): Promise<tf.LayersModel> {
    const model = await tf.loadLayersModel(`localstorage://forecasting-model-${modelName}`);
    this.models.set(modelName, model);
    return model;
  }

  /**
   * Dispose of all models and free memory
   */
  dispose(): void {
    this.models.forEach(model => model.dispose());
    this.models.clear();
    this.preprocessors.clear();
    this.arimaForecaster.dispose();
    this.demandPredictor.dispose();
  }
}