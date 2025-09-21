/**
 * Model Storage Service
 * Handles ML model persistence, versioning, and caching using IndexedDB
 */

import * as tf from '@tensorflow/tfjs';

export interface StoredModel {
  name: string;
  version: string;
  created_at: Date;
  updated_at: Date;
  topology: any; // Model topology JSON
  weights: ArrayBuffer; // Model weights
  config: ModelConfig;
  metadata: {
    training_data_size: number;
    training_duration: number;
    performance_metrics: Record<string, number>;
    feature_importance?: number[];
    hyperparameters: Record<string, any>;
  };
  size_bytes: number;
}

export interface ModelConfig {
  name: string;
  version: string;
  type: 'regression' | 'classification' | 'timeseries';
  inputShape: number[];
  outputShape: number[];
  architecture: string;
}

export interface ModelVersion {
  version: string;
  created_at: Date;
  performance_score: number;
  is_active: boolean;
  changelog: string;
}

export interface ModelMetrics {
  storage_used: number;
  total_models: number;
  active_models: number;
  cache_hit_rate: number;
  last_cleanup: Date;
}

export class ModelStorageService {
  private dbName = 'ResourceForgeML';
  private dbVersion = 1;
  private db: IDBDatabase | null = null;
  private modelCache: Map<string, tf.LayersModel> = new Map();
  private cacheMetrics = {
    hits: 0,
    misses: 0
  };

  constructor() {
    this.initializeDB();
  }

  /**
   * Initialize IndexedDB database
   */
  private async initializeDB(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);

      request.onerror = () => {
        console.error('Failed to initialize IndexedDB:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        console.log('IndexedDB initialized successfully');
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Models store
        if (!db.objectStoreNames.contains('models')) {
          const modelsStore = db.createObjectStore('models', {
            keyPath: ['name', 'version']
          });
          modelsStore.createIndex('name', 'name', { unique: false });
          modelsStore.createIndex('type', 'config.type', { unique: false });
          modelsStore.createIndex('created_at', 'created_at', { unique: false });
          modelsStore.createIndex('version', 'version', { unique: false });
        }

        // Model versions store
        if (!db.objectStoreNames.contains('model_versions')) {
          const versionsStore = db.createObjectStore('model_versions', {
            keyPath: ['name', 'version']
          });
          versionsStore.createIndex('name', 'name', { unique: false });
          versionsStore.createIndex('is_active', 'is_active', { unique: false });
        }

        // Training data store
        if (!db.objectStoreNames.contains('training_data')) {
          const trainingStore = db.createObjectStore('training_data', {
            keyPath: 'id',
            autoIncrement: true
          });
          trainingStore.createIndex('model_name', 'model_name', { unique: false });
          trainingStore.createIndex('created_at', 'created_at', { unique: false });
        }

        // Cache store for temporary model data
        if (!db.objectStoreNames.contains('model_cache')) {
          const cacheStore = db.createObjectStore('model_cache', {
            keyPath: 'key'
          });
          cacheStore.createIndex('expires_at', 'expires_at', { unique: false });
        }
      };
    });
  }

  /**
   * Save a trained model to storage
   */
  async saveModel(
    name: string,
    model: tf.LayersModel,
    config: ModelConfig,
    metadata?: Partial<StoredModel['metadata']>
  ): Promise<void> {
    try {
      if (!this.db) {
        await this.initializeDB();
      }

      console.log(`Saving model: ${name} v${config.version}`);

      // Convert model to JSON format
      const modelJson = model.toJSON();
      const modelWeights = await model.getWeights();
      
      // Convert weights to ArrayBuffer for storage
      const weightsData = await this.serializeWeights(modelWeights);
      const modelSize = new Blob([JSON.stringify(modelJson), weightsData]).size;

      // Clean up tensor memory
      modelWeights.forEach(tensor => tensor.dispose());

      const storedModel: StoredModel = {
        name,
        version: config.version,
        created_at: new Date(),
        updated_at: new Date(),
        topology: modelJson,
        weights: weightsData,
        config,
        metadata: {
          training_data_size: metadata?.training_data_size || 0,
          training_duration: metadata?.training_duration || 0,
          performance_metrics: metadata?.performance_metrics || {},
          feature_importance: metadata?.feature_importance,
          hyperparameters: metadata?.hyperparameters || {}
        },
        size_bytes: modelSize
      };

      // Save to IndexedDB
      await this.saveToDB('models', storedModel);

      // Update version tracking
      await this.updateModelVersion(name, config.version, true);

      // Add to cache
      this.modelCache.set(`${name}:${config.version}`, model);

      console.log(`Model saved successfully: ${name} v${config.version} (${(modelSize / 1024).toFixed(2)} KB)`);

    } catch (error) {
      console.error(`Failed to save model ${name}:`, error);
      throw error;
    }
  }

  /**
   * Load a model from storage
   */
  async loadModel(name: string, version?: string): Promise<StoredModel | null> {
    try {
      if (!this.db) {
        await this.initializeDB();
      }

      // Check cache first
      const cacheKey = `${name}:${version || 'latest'}`;
      if (this.modelCache.has(cacheKey)) {
        this.cacheMetrics.hits++;
        console.log(`Model loaded from cache: ${name}`);
        
        // Still need to return the stored model data
        const storedModel = await this.loadFromDB('models', [name, version || await this.getLatestVersion(name)]);
        return storedModel;
      }

      this.cacheMetrics.misses++;

      // Determine version to load
      const targetVersion = version || await this.getLatestVersion(name);
      if (!targetVersion) {
        console.warn(`No versions found for model: ${name}`);
        return null;
      }

      // Load from IndexedDB
      const storedModel = await this.loadFromDB('models', [name, targetVersion]) as StoredModel;
      if (!storedModel) {
        console.warn(`Model not found: ${name} v${targetVersion}`);
        return null;
      }

      console.log(`Model loaded from storage: ${name} v${targetVersion}`);
      return storedModel;

    } catch (error) {
      console.error(`Failed to load model ${name}:`, error);
      return null;
    }
  }

  /**
   * List all stored models
   */
  async listModels(): Promise<{ name: string; versions: ModelVersion[] }[]> {
    try {
      if (!this.db) {
        await this.initializeDB();
      }

      const models = await this.getAllFromDB('model_versions');
      
      // Group by model name
      const modelGroups = new Map<string, ModelVersion[]>();
      
      models.forEach((model: any) => {
        if (!modelGroups.has(model.name)) {
          modelGroups.set(model.name, []);
        }
        modelGroups.get(model.name)!.push({
          version: model.version,
          created_at: model.created_at,
          performance_score: model.performance_score,
          is_active: model.is_active,
          changelog: model.changelog
        });
      });

      // Convert to array format
      return Array.from(modelGroups.entries()).map(([name, versions]) => ({
        name,
        versions: versions.sort((a, b) => b.created_at.getTime() - a.created_at.getTime())
      }));

    } catch (error) {
      console.error('Failed to list models:', error);
      return [];
    }
  }

  /**
   * Delete a model and all its versions
   */
  async deleteModel(name: string, version?: string): Promise<void> {
    try {
      if (!this.db) {
        await this.initializeDB();
      }

      if (version) {
        // Delete specific version
        await this.deleteFromDB('models', [name, version]);
        await this.deleteFromDB('model_versions', [name, version]);
        
        // Remove from cache
        this.modelCache.delete(`${name}:${version}`);
        
        console.log(`Deleted model: ${name} v${version}`);
      } else {
        // Delete all versions
        const versions = await this.getModelVersions(name);
        
        for (const versionInfo of versions) {
          await this.deleteFromDB('models', [name, versionInfo.version]);
          await this.deleteFromDB('model_versions', [name, versionInfo.version]);
          this.modelCache.delete(`${name}:${versionInfo.version}`);
        }
        
        console.log(`Deleted all versions of model: ${name}`);
      }

    } catch (error) {
      console.error(`Failed to delete model ${name}:`, error);
      throw error;
    }
  }

  /**
   * Get storage metrics
   */
  async getStorageMetrics(): Promise<ModelMetrics> {
    try {
      const models = await this.getAllFromDB('models');
      const versions = await this.getAllFromDB('model_versions');
      
      const totalStorage = models.reduce((sum: number, model: any) => sum + model.size_bytes, 0);
      const activeModels = versions.filter((v: any) => v.is_active).length;
      const cacheHitRate = this.cacheMetrics.hits / (this.cacheMetrics.hits + this.cacheMetrics.misses) || 0;

      return {
        storage_used: totalStorage,
        total_models: models.length,
        active_models: activeModels,
        cache_hit_rate: cacheHitRate,
        last_cleanup: new Date() // Would track actual cleanup dates
      };

    } catch (error) {
      console.error('Failed to get storage metrics:', error);
      return {
        storage_used: 0,
        total_models: 0,
        active_models: 0,
        cache_hit_rate: 0,
        last_cleanup: new Date()
      };
    }
  }

  /**
   * Cleanup old models and optimize storage
   */
  async cleanup(options: {
    keepVersions?: number;
    maxAge?: number; // days
    maxStorage?: number; // bytes
  } = {}): Promise<void> {
    try {
      console.log('Starting model storage cleanup...');
      
      const models = await this.listModels();
      let freedSpace = 0;

      for (const modelInfo of models) {
        const { name, versions } = modelInfo;
        
        // Keep only the specified number of versions (default: 3)
        const keepVersions = options.keepVersions || 3;
        if (versions.length > keepVersions) {
          const versionsToDelete = versions
            .sort((a, b) => b.created_at.getTime() - a.created_at.getTime())
            .slice(keepVersions);

          for (const version of versionsToDelete) {
            const modelData = await this.loadModel(name, version.version);
            if (modelData) {
              freedSpace += modelData.size_bytes;
              await this.deleteModel(name, version.version);
            }
          }
        }

        // Delete models older than maxAge (default: 90 days)
        const maxAge = options.maxAge || 90;
        const cutoffDate = new Date(Date.now() - maxAge * 24 * 60 * 60 * 1000);
        
        for (const version of versions) {
          if (version.created_at < cutoffDate && !version.is_active) {
            const modelData = await this.loadModel(name, version.version);
            if (modelData) {
              freedSpace += modelData.size_bytes;
              await this.deleteModel(name, version.version);
            }
          }
        }
      }

      // Clear expired cache entries
      await this.clearExpiredCache();

      console.log(`Cleanup completed. Freed ${(freedSpace / 1024 / 1024).toFixed(2)} MB of storage.`);

    } catch (error) {
      console.error('Model cleanup failed:', error);
      throw error;
    }
  }

  // Private helper methods

  private async serializeWeights(weights: tf.Tensor[]): Promise<ArrayBuffer> {
    const weightArrays = await Promise.all(
      weights.map(async (tensor) => {
        const data = await tensor.data();
        return { shape: tensor.shape, data: Array.from(data) };
      })
    );
    
    const jsonString = JSON.stringify(weightArrays);
    const encoder = new TextEncoder();
    return encoder.encode(jsonString).buffer;
  }

  private async deserializeWeights(buffer: ArrayBuffer): Promise<tf.Tensor[]> {
    const decoder = new TextDecoder();
    const jsonString = decoder.decode(buffer);
    const weightArrays = JSON.parse(jsonString);
    
    return weightArrays.map((weightData: any) => {
      return tf.tensor(weightData.data, weightData.shape);
    });
  }

  private async getLatestVersion(modelName: string): Promise<string | null> {
    const versions = await this.getModelVersions(modelName);
    if (versions.length === 0) return null;
    
    // Find active version first, then latest
    const activeVersion = versions.find(v => v.is_active);
    if (activeVersion) return activeVersion.version;
    
    // Return latest version by date
    const latestVersion = versions.sort((a, b) => 
      b.created_at.getTime() - a.created_at.getTime()
    )[0];
    
    return latestVersion.version;
  }

  private async getModelVersions(modelName: string): Promise<ModelVersion[]> {
    const transaction = this.db!.transaction(['model_versions'], 'readonly');
    const store = transaction.objectStore('model_versions');
    const index = store.index('name');
    
    return new Promise((resolve, reject) => {
      const request = index.getAll(modelName);
      
      request.onsuccess = () => {
        resolve(request.result);
      };
      
      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  private async updateModelVersion(name: string, version: string, isActive: boolean): Promise<void> {
    const versionData = {
      name,
      version,
      created_at: new Date(),
      performance_score: 0, // Would be calculated based on validation metrics
      is_active: isActive,
      changelog: `Model ${name} version ${version}`
    };

    await this.saveToDB('model_versions', versionData);
  }

  private async saveToDB(storeName: string, data: any): Promise<void> {
    const transaction = this.db!.transaction([storeName], 'readwrite');
    const store = transaction.objectStore(storeName);
    
    return new Promise((resolve, reject) => {
      const request = store.put(data);
      
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  private async loadFromDB(storeName: string, key: any): Promise<any> {
    const transaction = this.db!.transaction([storeName], 'readonly');
    const store = transaction.objectStore(storeName);
    
    return new Promise((resolve, reject) => {
      const request = store.get(key);
      
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  private async getAllFromDB(storeName: string): Promise<any[]> {
    const transaction = this.db!.transaction([storeName], 'readonly');
    const store = transaction.objectStore(storeName);
    
    return new Promise((resolve, reject) => {
      const request = store.getAll();
      
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  private async deleteFromDB(storeName: string, key: any): Promise<void> {
    const transaction = this.db!.transaction([storeName], 'readwrite');
    const store = transaction.objectStore(storeName);
    
    return new Promise((resolve, reject) => {
      const request = store.delete(key);
      
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  private async clearExpiredCache(): Promise<void> {
    const now = new Date();
    const transaction = this.db!.transaction(['model_cache'], 'readwrite');
    const store = transaction.objectStore('model_cache');
    const index = store.index('expires_at');
    
    return new Promise((resolve, reject) => {
      const range = IDBKeyRange.upperBound(now);
      const request = index.openCursor(range);
      
      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result;
        if (cursor) {
          cursor.delete();
          cursor.continue();
        } else {
          resolve();
        }
      };
      
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Clear memory cache
   */
  clearMemoryCache(): void {
    this.modelCache.clear();
    this.cacheMetrics.hits = 0;
    this.cacheMetrics.misses = 0;
    console.log('Memory cache cleared');
  }
}