/**
 * Core Prediction Engine Service
 * Handles general-purpose ML predictions for resource management
 */

import * as tf from '@tensorflow/tfjs';
import { ModelStorageService } from './ml/model-storage.service';
import { DataPreprocessingService } from './ml/data-preprocessing.service';
import { ValidationService } from './ml/validation.service';

export interface PredictionInput {
  features: number[];
  metadata?: Record<string, any>;
  timestamp?: Date;
}

export interface PredictionResult {
  prediction: number | number[];
  confidence: number;
  model_version: string;
  processing_time: number;
  metadata: Record<string, any>;
}

export interface ModelConfig {
  name: string;
  version: string;
  type: 'regression' | 'classification' | 'timeseries';
  inputShape: number[];
  outputShape: number[];
  architecture: string;
}

export class PredictionService {
  private models: Map<string, tf.LayersModel> = new Map();
  private modelConfigs: Map<string, ModelConfig> = new Map();
  private modelStorage: ModelStorageService;
  private dataPreprocessor: DataPreprocessingService;
  private validator: ValidationService;

  constructor() {
    this.modelStorage = new ModelStorageService();
    this.dataPreprocessor = new DataPreprocessingService();
    this.validator = new ValidationService();
    this.initializeTensorFlow();
  }

  private async initializeTensorFlow(): Promise<void> {
    // Set TensorFlow.js backend (WebGL for GPU acceleration)
    await tf.setBackend('webgl');
    await tf.ready();
    
    console.log('TensorFlow.js initialized:', {
      backend: tf.getBackend(),
      version: tf.version.tfjs,
      memory: tf.memory()
    });
  }

  /**
   * Load a trained model from storage
   */
  async loadModel(modelName: string, version?: string): Promise<void> {
    try {
      const startTime = performance.now();
      
      const modelData = await this.modelStorage.loadModel(modelName, version);
      if (!modelData) {
        throw new Error(`Model ${modelName} not found`);
      }

      // Load TensorFlow.js model
      const model = await tf.loadLayersModel(tf.io.fromMemory(modelData.weights, modelData.topology));
      
      this.models.set(modelName, model);
      this.modelConfigs.set(modelName, modelData.config);

      const loadTime = performance.now() - startTime;
      console.log(`Model ${modelName} loaded successfully in ${loadTime.toFixed(2)}ms`);

    } catch (error) {
      console.error(`Failed to load model ${modelName}:`, error);
      throw error;
    }
  }

  /**
   * Make prediction using specified model
   */
  async predict(
    modelName: string, 
    input: PredictionInput | PredictionInput[]
  ): Promise<PredictionResult | PredictionResult[]> {
    const startTime = performance.now();
    
    try {
      const model = this.models.get(modelName);
      const config = this.modelConfigs.get(modelName);
      
      if (!model || !config) {
        throw new Error(`Model ${modelName} not loaded`);
      }

      // Handle batch prediction
      const inputs = Array.isArray(input) ? input : [input];
      const results: PredictionResult[] = [];

      for (const singleInput of inputs) {
        // Validate input
        this.validator.validateInput(singleInput, config);

        // Preprocess input data
        const preprocessedData = await this.dataPreprocessor.normalizeInput(
          singleInput.features,
          config.inputShape
        );

        // Create tensor
        const inputTensor = tf.tensor2d([preprocessedData], [1, preprocessedData.length]);

        // Make prediction
        const prediction = model.predict(inputTensor) as tf.Tensor;
        const predictionData = await prediction.data();

        // Calculate confidence (for classification models)
        const confidence = config.type === 'classification' 
          ? Math.max(...Array.from(predictionData))
          : 0.95; // Default confidence for regression

        // Clean up tensors
        inputTensor.dispose();
        prediction.dispose();

        results.push({
          prediction: predictionData.length === 1 ? predictionData[0] : Array.from(predictionData),
          confidence,
          model_version: config.version,
          processing_time: performance.now() - startTime,
          metadata: {
            model_type: config.type,
            input_features: singleInput.features.length,
            ...singleInput.metadata
          }
        });
      }

      return Array.isArray(input) ? results : results[0];

    } catch (error) {
      console.error(`Prediction failed for model ${modelName}:`, error);
      throw error;
    }
  }

  /**
   * Train a new model with provided data
   */
  async trainModel(
    modelName: string,
    trainingData: { inputs: number[][]; outputs: number[][] },
    config: Partial<ModelConfig> = {}
  ): Promise<void> {
    try {
      const startTime = performance.now();

      // Validate training data
      this.validator.validateTrainingData(trainingData);

      // Preprocess training data
      const processedInputs = await this.dataPreprocessor.normalizeDataset(trainingData.inputs);
      const processedOutputs = await this.dataPreprocessor.normalizeDataset(trainingData.outputs);

      // Build model architecture
      const model = this.buildModel({
        inputShape: [trainingData.inputs[0].length],
        outputShape: [trainingData.outputs[0].length],
        type: config.type || 'regression',
        ...config
      });

      // Prepare tensors
      const xs = tf.tensor2d(processedInputs);
      const ys = tf.tensor2d(processedOutputs);

      // Training configuration
      const trainingConfig = {
        epochs: 100,
        batchSize: 32,
        validationSplit: 0.2,
        callbacks: {
          onEpochEnd: (epoch: number, logs: any) => {
            if (epoch % 10 === 0) {
              console.log(`Epoch ${epoch}: loss = ${logs.loss.toFixed(4)}, val_loss = ${logs.val_loss?.toFixed(4) || 'N/A'}`);
            }
          }
        }
      };

      // Train the model
      await model.fit(xs, ys, trainingConfig);

      // Store the trained model
      const modelConfig: ModelConfig = {
        name: modelName,
        version: Date.now().toString(),
        type: config.type || 'regression',
        inputShape: [trainingData.inputs[0].length],
        outputShape: [trainingData.outputs[0].length],
        architecture: 'dense'
      };

      await this.modelStorage.saveModel(modelName, model, modelConfig);
      
      this.models.set(modelName, model);
      this.modelConfigs.set(modelName, modelConfig);

      // Clean up tensors
      xs.dispose();
      ys.dispose();

      const trainingTime = performance.now() - startTime;
      console.log(`Model ${modelName} trained successfully in ${trainingTime.toFixed(2)}ms`);

    } catch (error) {
      console.error(`Training failed for model ${modelName}:`, error);
      throw error;
    }
  }

  /**
   * Build a neural network model based on configuration
   */
  private buildModel(config: ModelConfig): tf.Sequential {
    const model = tf.sequential();

    // Input layer
    model.add(tf.layers.dense({
      units: 64,
      activation: 'relu',
      inputShape: config.inputShape
    }));

    // Hidden layers
    model.add(tf.layers.dropout({ rate: 0.2 }));
    model.add(tf.layers.dense({ units: 32, activation: 'relu' }));
    model.add(tf.layers.dropout({ rate: 0.2 }));

    // Output layer
    const outputActivation = config.type === 'classification' ? 'softmax' : 'linear';
    model.add(tf.layers.dense({ 
      units: config.outputShape[0], 
      activation: outputActivation 
    }));

    // Compile model
    const loss = config.type === 'classification' ? 'categoricalCrossentropy' : 'meanSquaredError';
    const metrics = config.type === 'classification' ? ['accuracy'] : ['mse'];

    model.compile({
      optimizer: tf.train.adam(0.001),
      loss,
      metrics
    });

    return model;
  }

  /**
   * Get model information
   */
  getModelInfo(modelName: string): ModelConfig | null {
    return this.modelConfigs.get(modelName) || null;
  }

  /**
   * List all loaded models
   */
  getLoadedModels(): string[] {
    return Array.from(this.models.keys());
  }

  /**
   * Unload a model from memory
   */
  unloadModel(modelName: string): void {
    const model = this.models.get(modelName);
    if (model) {
      model.dispose();
      this.models.delete(modelName);
      this.modelConfigs.delete(modelName);
      console.log(`Model ${modelName} unloaded`);
    }
  }

  /**
   * Get memory usage statistics
   */
  getMemoryStats(): tf.MemoryInfo {
    return tf.memory();
  }

  /**
   * Clean up all models and free memory
   */
  dispose(): void {
    for (const [name, model] of this.models) {
      model.dispose();
      console.log(`Disposed model: ${name}`);
    }
    this.models.clear();
    this.modelConfigs.clear();
  }
}

// Export singleton instance
export const predictionService = new PredictionService();