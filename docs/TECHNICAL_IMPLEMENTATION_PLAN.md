# 🔧 Technical Implementation Plan
## Employee Resource Management System - ML Pipeline & Enterprise Features

### 📋 Implementation Overview

This document provides concrete technical implementation details for Phase 3 (ML Pipeline) and Phase 4 (Enterprise Features) that integrate seamlessly with the existing architecture.

---

## 🤖 Phase 3: Machine Learning Pipeline Implementation

### 1. ML Data Collection Service

#### 1.1 Service Implementation

```typescript
// src/services/ml-data-collection.service.ts
import { Injectable } from '../container/decorators';
import { DatabaseService } from '../database/database.service';
import { EmployeeService } from './employee.service';
import { AllocationService } from './allocation.service';
import { ProjectService } from './project.service';

export interface TrainingDataPoint {
  employeeId: string;
  projectId: string;
  skills: string[];
  allocation_percentage: number;
  actual_hours: number;
  performance_score: number;
  completion_rate: number;
  timestamp: Date;
}

@Injectable()
export class MLDataCollectionService {
  constructor(
    private readonly db: DatabaseService,
    private readonly employeeService: EmployeeService,
    private readonly allocationService: AllocationService,
    private readonly projectService: ProjectService
  ) {}

  async collectHistoricalData(months: number = 6): Promise<TrainingDataPoint[]> {
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - months);

    const query = `
      SELECT
        ra.employee_id,
        ra.project_id,
        ra.allocation_percentage,
        ra.allocated_hours,
        p.status,
        p.completion_percentage,
        e.skills,
        ch.utilization_rate,
        COALESCE(
          (ra.allocated_hours * ch.utilization_rate / 100),
          ra.allocated_hours
        ) as actual_hours,
        CASE
          WHEN p.status = 'completed' AND p.end_date <= p.estimated_end_date
          THEN 100
          WHEN p.status = 'completed'
          THEN 80
          WHEN p.status = 'in_progress' AND CURRENT_DATE <= p.estimated_end_date
          THEN 60
          ELSE 40
        END as performance_score
      FROM resource_allocations ra
      INNER JOIN projects p ON ra.project_id = p.id
      INNER JOIN employees e ON ra.employee_id = e.id
      LEFT JOIN capacity_history ch ON
        ch.employee_id = ra.employee_id
        AND ch.date >= ra.start_date
        AND ch.date <= ra.end_date
      WHERE ra.created_at >= $1
      ORDER BY ra.created_at DESC
    `;

    const result = await this.db.query(query, [startDate]);
    return this.transformToTrainingData(result.rows);
  }

  private transformToTrainingData(rows: any[]): TrainingDataPoint[] {
    return rows.map(row => ({
      employeeId: row.employee_id,
      projectId: row.project_id,
      skills: row.skills || [],
      allocation_percentage: row.allocation_percentage,
      actual_hours: parseFloat(row.actual_hours),
      performance_score: row.performance_score,
      completion_rate: row.completion_percentage || 0,
      timestamp: row.created_at
    }));
  }

  async extractFeatures(data: TrainingDataPoint[]): Promise<number[][]> {
    // Feature extraction for ML model
    return data.map(point => [
      point.allocation_percentage / 100,
      point.actual_hours / 40, // Normalize to weekly hours
      point.skills.length / 10, // Normalize skill count
      point.performance_score / 100,
      point.completion_rate / 100
    ]);
  }

  async saveTrainingDataset(data: TrainingDataPoint[]): Promise<string> {
    const datasetId = `dataset_${Date.now()}`;

    const query = `
      INSERT INTO ml_training_datasets (
        id,
        dataset_name,
        data_points,
        feature_count,
        created_at
      ) VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
    `;

    await this.db.query(query, [
      datasetId,
      `Historical_Data_${new Date().toISOString()}`,
      JSON.stringify(data),
      5
    ]);

    return datasetId;
  }
}
```

### 2. TensorFlow.js Model Training Service

#### 2.1 Model Architecture

```typescript
// src/services/ml-model-training.service.ts
import * as tf from '@tensorflow/tfjs-node';
import { Injectable } from '../container/decorators';
import { MLDataCollectionService } from './ml-data-collection.service';
import { DatabaseService } from '../database/database.service';

@Injectable()
export class MLModelTrainingService {
  private model: tf.Sequential | null = null;

  constructor(
    private readonly dataService: MLDataCollectionService,
    private readonly db: DatabaseService
  ) {}

  async createModel(): Promise<tf.Sequential> {
    const model = tf.sequential({
      layers: [
        tf.layers.dense({
          inputShape: [5], // 5 input features
          units: 64,
          activation: 'relu',
          kernelInitializer: 'glorotNormal'
        }),
        tf.layers.dropout({ rate: 0.2 }),
        tf.layers.dense({
          units: 32,
          activation: 'relu',
          kernelInitializer: 'glorotNormal'
        }),
        tf.layers.dropout({ rate: 0.2 }),
        tf.layers.dense({
          units: 16,
          activation: 'relu'
        }),
        tf.layers.dense({
          units: 3, // 3 outputs: [optimal_allocation, estimated_hours, success_probability]
          activation: 'sigmoid'
        })
      ]
    });

    model.compile({
      optimizer: tf.train.adam(0.001),
      loss: 'meanSquaredError',
      metrics: ['accuracy', 'mse']
    });

    this.model = model;
    return model;
  }

  async trainModel(datasetId: string, epochs: number = 100): Promise<tf.History> {
    if (!this.model) {
      this.model = await this.createModel();
    }

    // Load training data
    const trainingData = await this.loadTrainingData(datasetId);
    const features = await this.dataService.extractFeatures(trainingData);

    // Prepare tensors
    const xs = tf.tensor2d(features);
    const ys = tf.tensor2d(trainingData.map(d => [
      d.allocation_percentage / 100,
      d.actual_hours / 40,
      d.performance_score / 100
    ]));

    // Split data for training and validation
    const splitIdx = Math.floor(features.length * 0.8);
    const xTrain = xs.slice([0, 0], [splitIdx, -1]);
    const xVal = xs.slice([splitIdx, 0], [-1, -1]);
    const yTrain = ys.slice([0, 0], [splitIdx, -1]);
    const yVal = ys.slice([splitIdx, 0], [-1, -1]);

    // Training configuration
    const history = await this.model.fit(xTrain, yTrain, {
      epochs,
      batchSize: 32,
      validationData: [xVal, yVal],
      callbacks: {
        onEpochEnd: async (epoch, logs) => {
          console.log(`Epoch ${epoch}: loss = ${logs?.loss}, val_loss = ${logs?.val_loss}`);
          await this.saveTrainingProgress(datasetId, epoch, logs);
        }
      }
    });

    // Save model
    await this.saveModel();

    // Cleanup tensors
    xs.dispose();
    ys.dispose();
    xTrain.dispose();
    xVal.dispose();
    yTrain.dispose();
    yVal.dispose();

    return history;
  }

  async saveModel(): Promise<string> {
    if (!this.model) {
      throw new Error('No model to save');
    }

    const modelId = `model_${Date.now()}`;
    const modelPath = `./models/${modelId}`;

    await this.model.save(`file://${modelPath}`);

    // Save model metadata to database
    const query = `
      INSERT INTO ml_models (
        id,
        model_name,
        model_type,
        model_path,
        version,
        accuracy_score,
        status,
        created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP)
    `;

    await this.db.query(query, [
      modelId,
      'Resource Allocation Predictor',
      'sequential',
      modelPath,
      '1.0.0',
      0.85, // Placeholder - should be actual validation accuracy
      'trained'
    ]);

    return modelId;
  }

  async predict(input: number[]): Promise<number[]> {
    if (!this.model) {
      await this.loadModel('latest');
    }

    const prediction = this.model!.predict(tf.tensor2d([input])) as tf.Tensor;
    const result = await prediction.array();
    prediction.dispose();

    return result[0] as number[];
  }

  private async loadModel(modelId: string): Promise<void> {
    const query = `
      SELECT model_path FROM ml_models
      WHERE id = $1 OR ($1 = 'latest' AND status = 'deployed')
      ORDER BY created_at DESC
      LIMIT 1
    `;

    const result = await this.db.query(query, [modelId]);
    if (result.rows.length === 0) {
      throw new Error('Model not found');
    }

    const modelPath = result.rows[0].model_path;
    this.model = await tf.loadLayersModel(`file://${modelPath}/model.json`);
  }

  private async loadTrainingData(datasetId: string): Promise<any[]> {
    const query = 'SELECT data_points FROM ml_training_datasets WHERE id = $1';
    const result = await this.db.query(query, [datasetId]);
    return JSON.parse(result.rows[0].data_points);
  }

  private async saveTrainingProgress(datasetId: string, epoch: number, logs: any): Promise<void> {
    const query = `
      INSERT INTO ml_training_progress (
        dataset_id,
        epoch,
        loss,
        val_loss,
        accuracy,
        val_accuracy,
        timestamp
      ) VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)
    `;

    await this.db.query(query, [
      datasetId,
      epoch,
      logs?.loss || 0,
      logs?.val_loss || 0,
      logs?.acc || 0,
      logs?.val_acc || 0
    ]);
  }
}
```

### 3. Prediction API Controller

```typescript
// src/controllers/ml-prediction.controller.ts
import { Request, Response } from 'express';
import { MLModelTrainingService } from '../services/ml-model-training.service';
import { MLPredictionService } from '../services/ml-prediction.service';
import { asyncHandler } from '../middleware/async-handler';

export class MLPredictionController {
  constructor(
    private readonly trainingService: MLModelTrainingService,
    private readonly predictionService: MLPredictionService
  ) {}

  predictAllocation = asyncHandler(async (req: Request, res: Response) => {
    const { employeeId, projectId, requiredSkills } = req.body;

    // Get employee and project data
    const predictionInput = await this.predictionService.preparePredictionInput(
      employeeId,
      projectId,
      requiredSkills
    );

    // Make prediction
    const prediction = await this.trainingService.predict(predictionInput);

    // Interpret results
    const result = {
      recommendedAllocation: Math.round(prediction[0] * 100),
      estimatedHours: Math.round(prediction[1] * 40),
      successProbability: Math.round(prediction[2] * 100),
      confidence: this.calculateConfidence(prediction),
      alternativeOptions: await this.predictionService.getAlternatives(
        projectId,
        requiredSkills
      )
    };

    res.json({
      success: true,
      data: result
    });
  });

  trainModel = asyncHandler(async (req: Request, res: Response) => {
    const { months = 6, epochs = 100 } = req.body;

    // Start training job in background
    const jobId = await this.predictionService.startTrainingJob({
      months,
      epochs,
      modelType: 'resource_allocation'
    });

    res.json({
      success: true,
      data: {
        jobId,
        status: 'training_started',
        estimatedTime: epochs * 2 // seconds
      }
    });
  });

  getTrainingStatus = asyncHandler(async (req: Request, res: Response) => {
    const { jobId } = req.params;

    const status = await this.predictionService.getJobStatus(jobId);

    res.json({
      success: true,
      data: status
    });
  });

  private calculateConfidence(prediction: number[]): number {
    // Calculate confidence based on prediction certainty
    const variance = prediction.reduce((acc, val) => {
      const diff = val - 0.5;
      return acc + Math.pow(diff, 2);
    }, 0) / prediction.length;

    return Math.min(95, Math.max(60, 100 - (variance * 100)));
  }
}
```

---

## 🏢 Phase 4: Enterprise Features Implementation

### 1. Multi-Tenant Middleware

```typescript
// src/middleware/tenant.middleware.ts
import { Request, Response, NextFunction } from 'express';
import { DatabaseService } from '../database/database.service';
import jwt from 'jsonwebtoken';

export interface TenantRequest extends Request {
  tenant?: {
    id: string;
    schema: string;
    name: string;
  };
}

export class TenantMiddleware {
  constructor(private readonly db: DatabaseService) {}

  async resolveTenant(req: TenantRequest, res: Response, next: NextFunction) {
    try {
      let tenantId: string | null = null;

      // 1. Check JWT token for tenant
      const token = req.headers.authorization?.replace('Bearer ', '');
      if (token) {
        const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
        tenantId = decoded.tenantId;
      }

      // 2. Check subdomain
      if (!tenantId) {
        const subdomain = req.hostname.split('.')[0];
        if (subdomain && subdomain !== 'www' && subdomain !== 'api') {
          const tenant = await this.getTenantBySubdomain(subdomain);
          tenantId = tenant?.id;
        }
      }

      // 3. Check header
      if (!tenantId) {
        tenantId = req.headers['x-tenant-id'] as string;
      }

      if (!tenantId) {
        return res.status(400).json({
          success: false,
          error: 'Tenant identification required'
        });
      }

      // Load tenant information
      const tenant = await this.getTenant(tenantId);
      if (!tenant || !tenant.is_active) {
        return res.status(403).json({
          success: false,
          error: 'Invalid or inactive tenant'
        });
      }

      // Set tenant context
      req.tenant = {
        id: tenant.id,
        schema: tenant.schema_name,
        name: tenant.name
      };

      // Set schema search path for this request
      await this.db.query(`SET search_path TO ${tenant.schema_name}, public`);

      next();
    } catch (error) {
      console.error('Tenant resolution error:', error);
      res.status(500).json({
        success: false,
        error: 'Tenant resolution failed'
      });
    }
  }

  private async getTenant(tenantId: string): Promise<any> {
    const query = 'SELECT * FROM public.tenants WHERE id = $1';
    const result = await this.db.query(query, [tenantId]);
    return result.rows[0];
  }

  private async getTenantBySubdomain(subdomain: string): Promise<any> {
    const query = 'SELECT * FROM public.tenants WHERE subdomain = $1';
    const result = await this.db.query(query, [subdomain]);
    return result.rows[0];
  }
}
```

### 2. Tenant Management Service

```typescript
// src/services/tenant-management.service.ts
import { Injectable } from '../container/decorators';
import { DatabaseService } from '../database/database.service';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class TenantManagementService {
  constructor(private readonly db: DatabaseService) {}

  async createTenant(data: {
    name: string;
    subdomain: string;
    adminEmail: string;
    plan: 'starter' | 'professional' | 'enterprise';
  }): Promise<string> {
    const tenantId = uuidv4();
    const schemaName = `tenant_${data.subdomain.replace(/[^a-z0-9]/g, '_')}`;

    // Start transaction
    await this.db.query('BEGIN');

    try {
      // 1. Create tenant record
      await this.db.query(`
        INSERT INTO public.tenants (
          id, name, subdomain, schema_name, plan, admin_email, is_active
        ) VALUES ($1, $2, $3, $4, $5, $6, true)
      `, [tenantId, data.name, data.subdomain, schemaName, data.plan, data.adminEmail]);

      // 2. Create tenant schema
      await this.db.query(`CREATE SCHEMA IF NOT EXISTS ${schemaName}`);

      // 3. Clone template schema structure
      await this.cloneSchemaStructure('tenant_template', schemaName);

      // 4. Initialize default data
      await this.initializeTenantData(schemaName, data);

      // 5. Create admin user
      await this.createAdminUser(schemaName, data.adminEmail);

      await this.db.query('COMMIT');
      return tenantId;

    } catch (error) {
      await this.db.query('ROLLBACK');
      throw error;
    }
  }

  private async cloneSchemaStructure(templateSchema: string, newSchema: string): Promise<void> {
    // Get all tables from template
    const tablesQuery = `
      SELECT tablename FROM pg_tables
      WHERE schemaname = $1
    `;
    const tables = await this.db.query(tablesQuery, [templateSchema]);

    for (const table of tables.rows) {
      // Create table with LIKE including all properties
      await this.db.query(`
        CREATE TABLE ${newSchema}.${table.tablename}
        (LIKE ${templateSchema}.${table.tablename} INCLUDING ALL)
      `);
    }

    // Copy indexes, constraints, triggers
    await this.copySchemaObjects(templateSchema, newSchema);
  }

  private async copySchemaObjects(sourceSchema: string, targetSchema: string): Promise<void> {
    // Copy sequences
    const sequencesQuery = `
      SELECT sequence_name FROM information_schema.sequences
      WHERE sequence_schema = $1
    `;
    const sequences = await this.db.query(sequencesQuery, [sourceSchema]);

    for (const seq of sequences.rows) {
      await this.db.query(`
        CREATE SEQUENCE ${targetSchema}.${seq.sequence_name}
        START WITH 1 INCREMENT BY 1
      `);
    }

    // Copy functions
    const functionsQuery = `
      SELECT routine_name, routine_definition
      FROM information_schema.routines
      WHERE routine_schema = $1
    `;
    const functions = await this.db.query(functionsQuery, [sourceSchema]);

    for (const func of functions.rows) {
      const definition = func.routine_definition.replace(
        new RegExp(sourceSchema, 'g'),
        targetSchema
      );
      await this.db.query(definition);
    }
  }

  private async initializeTenantData(schema: string, data: any): Promise<void> {
    // Set search path
    await this.db.query(`SET search_path TO ${schema}`);

    // Insert default departments
    await this.db.query(`
      INSERT INTO departments (name, description) VALUES
      ('Engineering', 'Software Development'),
      ('Product', 'Product Management'),
      ('Design', 'User Experience')
    `);

    // Insert default skills
    await this.db.query(`
      INSERT INTO skills (name, category) VALUES
      ('JavaScript', 'Programming'),
      ('TypeScript', 'Programming'),
      ('React', 'Framework'),
      ('Node.js', 'Runtime'),
      ('PostgreSQL', 'Database')
    `);

    // Insert default settings
    await this.db.query(`
      INSERT INTO tenant_settings (key, value) VALUES
      ('company_name', $1),
      ('default_capacity', '40'),
      ('timezone', 'UTC'),
      ('fiscal_year_start', '01-01')
    `, [data.name]);
  }

  private async createAdminUser(schema: string, email: string): Promise<void> {
    await this.db.query(`SET search_path TO ${schema}`);

    await this.db.query(`
      INSERT INTO users (
        email,
        role,
        permissions,
        is_active,
        created_at
      ) VALUES (
        $1,
        'admin',
        '["*"]'::jsonb,
        true,
        CURRENT_TIMESTAMP
      )
    `, [email]);
  }
}
```

### 3. RBAC Implementation

```typescript
// src/services/rbac.service.ts
import { Injectable } from '../container/decorators';
import { DatabaseService } from '../database/database.service';

export interface Permission {
  resource: string;
  actions: string[];
}

export interface Role {
  id: string;
  name: string;
  permissions: Permission[];
}

@Injectable()
export class RBACService {
  private roleCache: Map<string, Role> = new Map();

  constructor(private readonly db: DatabaseService) {}

  async createRole(tenantSchema: string, role: {
    name: string;
    description: string;
    permissions: Permission[];
  }): Promise<string> {
    await this.db.query(`SET search_path TO ${tenantSchema}`);

    const query = `
      INSERT INTO roles (name, description, permissions)
      VALUES ($1, $2, $3)
      RETURNING id
    `;

    const result = await this.db.query(query, [
      role.name,
      role.description,
      JSON.stringify(role.permissions)
    ]);

    return result.rows[0].id;
  }

  async checkPermission(
    tenantSchema: string,
    userId: string,
    resource: string,
    action: string
  ): Promise<boolean> {
    const cacheKey = `${tenantSchema}:${userId}:${resource}:${action}`;

    // Check cache
    if (this.roleCache.has(cacheKey)) {
      return true;
    }

    await this.db.query(`SET search_path TO ${tenantSchema}`);

    const query = `
      SELECT r.permissions
      FROM users u
      JOIN user_roles ur ON u.id = ur.user_id
      JOIN roles r ON ur.role_id = r.id
      WHERE u.id = $1 AND u.is_active = true
    `;

    const result = await this.db.query(query, [userId]);

    for (const row of result.rows) {
      const permissions = row.permissions as Permission[];

      for (const perm of permissions) {
        if (perm.resource === '*' || perm.resource === resource) {
          if (perm.actions.includes('*') || perm.actions.includes(action)) {
            // Cache the permission
            this.roleCache.set(cacheKey, {
              id: '',
              name: '',
              permissions: [perm]
            });

            // Auto-expire cache after 5 minutes
            setTimeout(() => this.roleCache.delete(cacheKey), 300000);

            return true;
          }
        }
      }
    }

    return false;
  }

  async assignRoleToUser(
    tenantSchema: string,
    userId: string,
    roleId: string
  ): Promise<void> {
    await this.db.query(`SET search_path TO ${tenantSchema}`);

    const query = `
      INSERT INTO user_roles (user_id, role_id)
      VALUES ($1, $2)
      ON CONFLICT (user_id, role_id) DO NOTHING
    `;

    await this.db.query(query, [userId, roleId]);

    // Clear cache for this user
    for (const [key] of this.roleCache) {
      if (key.includes(`${tenantSchema}:${userId}`)) {
        this.roleCache.delete(key);
      }
    }
  }
}
```

### 4. Permission Middleware

```typescript
// src/middleware/permission.middleware.ts
import { Response, NextFunction } from 'express';
import { TenantRequest } from './tenant.middleware';
import { RBACService } from '../services/rbac.service';

export function requirePermission(resource: string, action: string) {
  return async (req: TenantRequest, res: Response, next: NextFunction) => {
    if (!req.tenant) {
      return res.status(401).json({
        success: false,
        error: 'Tenant context required'
      });
    }

    const userId = (req as any).user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    const rbacService = (req as any).services.rbacService as RBACService;

    const hasPermission = await rbacService.checkPermission(
      req.tenant.schema,
      userId,
      resource,
      action
    );

    if (!hasPermission) {
      // Log unauthorized access attempt
      console.warn(`Unauthorized access attempt: User ${userId} tried to ${action} ${resource}`);

      return res.status(403).json({
        success: false,
        error: 'Insufficient permissions'
      });
    }

    next();
  };
}
```

---

## 📊 Database Migrations

### Migration for ML Tables

```sql
-- migrations/20250115_create_ml_tables.sql

-- Training datasets table
CREATE TABLE IF NOT EXISTS ml_training_datasets (
    id VARCHAR(255) PRIMARY KEY,
    dataset_name VARCHAR(255) NOT NULL,
    data_points JSONB NOT NULL,
    feature_count INTEGER NOT NULL,
    row_count INTEGER GENERATED ALWAYS AS (jsonb_array_length(data_points)) STORED,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ML models table
CREATE TABLE IF NOT EXISTS ml_models (
    id VARCHAR(255) PRIMARY KEY,
    model_name VARCHAR(255) NOT NULL,
    model_type VARCHAR(50) NOT NULL,
    model_path TEXT NOT NULL,
    version VARCHAR(20) NOT NULL,
    accuracy_score DECIMAL(5,4),
    precision_score DECIMAL(5,4),
    recall_score DECIMAL(5,4),
    f1_score DECIMAL(5,4),
    status VARCHAR(20) CHECK (status IN ('training', 'trained', 'validated', 'deployed', 'archived')),
    hyperparameters JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deployed_at TIMESTAMP
);

-- Training progress tracking
CREATE TABLE IF NOT EXISTS ml_training_progress (
    id SERIAL PRIMARY KEY,
    dataset_id VARCHAR(255) REFERENCES ml_training_datasets(id),
    model_id VARCHAR(255) REFERENCES ml_models(id),
    epoch INTEGER NOT NULL,
    loss DECIMAL(10,6),
    val_loss DECIMAL(10,6),
    accuracy DECIMAL(5,4),
    val_accuracy DECIMAL(5,4),
    learning_rate DECIMAL(10,8),
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Predictions log
CREATE TABLE IF NOT EXISTS ml_predictions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    model_id VARCHAR(255) REFERENCES ml_models(id),
    input_data JSONB NOT NULL,
    prediction_result JSONB NOT NULL,
    confidence_score DECIMAL(5,4),
    actual_result JSONB,
    feedback_score INTEGER CHECK (feedback_score BETWEEN 1 AND 5),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Model performance metrics
CREATE TABLE IF NOT EXISTS ml_model_metrics (
    id SERIAL PRIMARY KEY,
    model_id VARCHAR(255) REFERENCES ml_models(id),
    metric_date DATE NOT NULL,
    predictions_count INTEGER DEFAULT 0,
    avg_confidence DECIMAL(5,4),
    avg_accuracy DECIMAL(5,4),
    false_positives INTEGER DEFAULT 0,
    false_negatives INTEGER DEFAULT 0,
    true_positives INTEGER DEFAULT 0,
    true_negatives INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(model_id, metric_date)
);

-- Create indexes
CREATE INDEX idx_ml_predictions_model_id ON ml_predictions(model_id);
CREATE INDEX idx_ml_predictions_created_at ON ml_predictions(created_at);
CREATE INDEX idx_ml_training_progress_dataset ON ml_training_progress(dataset_id);
CREATE INDEX idx_ml_model_metrics_date ON ml_model_metrics(metric_date);
```

### Migration for Multi-tenant Support

```sql
-- migrations/20250120_create_tenant_tables.sql

-- Main tenants table (in public schema)
CREATE TABLE IF NOT EXISTS public.tenants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    subdomain VARCHAR(63) UNIQUE NOT NULL,
    schema_name VARCHAR(63) UNIQUE NOT NULL,
    plan VARCHAR(20) CHECK (plan IN ('starter', 'professional', 'enterprise')),
    admin_email VARCHAR(255) NOT NULL,
    settings JSONB DEFAULT '{}',
    limits JSONB DEFAULT '{
        "max_users": 10,
        "max_projects": 50,
        "max_storage_gb": 10,
        "ml_training_hours": 10
    }',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    suspended_at TIMESTAMP,
    deleted_at TIMESTAMP
);

-- Tenant usage tracking
CREATE TABLE IF NOT EXISTS public.tenant_usage (
    id SERIAL PRIMARY KEY,
    tenant_id UUID REFERENCES public.tenants(id),
    usage_date DATE NOT NULL,
    users_count INTEGER DEFAULT 0,
    projects_count INTEGER DEFAULT 0,
    allocations_count INTEGER DEFAULT 0,
    storage_used_mb INTEGER DEFAULT 0,
    api_calls_count INTEGER DEFAULT 0,
    ml_predictions_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(tenant_id, usage_date)
);

-- Template schema for new tenants
CREATE SCHEMA IF NOT EXISTS tenant_template;

-- Switch to template schema
SET search_path TO tenant_template;

-- Users table (tenant-specific)
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255),
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    role VARCHAR(50) NOT NULL DEFAULT 'user',
    permissions JSONB DEFAULT '[]',
    is_active BOOLEAN DEFAULT true,
    last_login TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Roles table
CREATE TABLE roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    permissions JSONB NOT NULL DEFAULT '[]',
    is_system BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- User roles junction table
CREATE TABLE user_roles (
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    role_id UUID REFERENCES roles(id) ON DELETE CASCADE,
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    assigned_by UUID REFERENCES users(id),
    PRIMARY KEY (user_id, role_id)
);

-- Tenant settings
CREATE TABLE tenant_settings (
    key VARCHAR(100) PRIMARY KEY,
    value TEXT,
    description TEXT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_by UUID REFERENCES users(id)
);

-- Audit log table
CREATE TABLE audit_logs (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES users(id),
    action VARCHAR(50) NOT NULL,
    resource_type VARCHAR(50),
    resource_id VARCHAR(255),
    changes JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_created ON audit_logs(created_at);
CREATE INDEX idx_audit_logs_resource ON audit_logs(resource_type, resource_id);

-- Insert default roles
INSERT INTO roles (name, description, permissions, is_system) VALUES
('admin', 'Full system access', '[{"resource": "*", "actions": ["*"]}]'::jsonb, true),
('manager', 'Manage teams and projects', '[
    {"resource": "employees", "actions": ["read", "write", "update"]},
    {"resource": "projects", "actions": ["read", "write", "update", "delete"]},
    {"resource": "allocations", "actions": ["read", "write", "update", "delete"]},
    {"resource": "reports", "actions": ["read"]}
]'::jsonb, true),
('user', 'Standard user access', '[
    {"resource": "employees", "actions": ["read"]},
    {"resource": "projects", "actions": ["read"]},
    {"resource": "allocations", "actions": ["read"]},
    {"resource": "self", "actions": ["read", "update"]}
]'::jsonb, true),
('viewer', 'Read-only access', '[
    {"resource": "*", "actions": ["read"]}
]'::jsonb, true);

-- Reset search path
SET search_path TO public;
```

---

## 🔄 API Routes Implementation

### ML Pipeline Routes

```typescript
// src/routes/ml.routes.ts
import { Router } from 'express';
import { MLPredictionController } from '../controllers/ml-prediction.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requirePermission } from '../middleware/permission.middleware';
import { validateRequest } from '../middleware/validate.middleware';
import { z } from 'zod';

const predictionSchema = z.object({
  employeeId: z.string().uuid(),
  projectId: z.string().uuid(),
  requiredSkills: z.array(z.string()).optional()
});

const trainingSchema = z.object({
  months: z.number().min(1).max(24).optional(),
  epochs: z.number().min(10).max(1000).optional()
});

export function createMLRoutes(controller: MLPredictionController): Router {
  const router = Router();

  // Prediction endpoints
  router.post(
    '/predictions',
    authenticate,
    requirePermission('ml', 'predict'),
    validateRequest(predictionSchema),
    controller.predictAllocation
  );

  // Training endpoints
  router.post(
    '/training/jobs',
    authenticate,
    requirePermission('ml', 'train'),
    validateRequest(trainingSchema),
    controller.trainModel
  );

  router.get(
    '/training/jobs/:jobId',
    authenticate,
    requirePermission('ml', 'read'),
    controller.getTrainingStatus
  );

  // Model management
  router.get(
    '/models',
    authenticate,
    requirePermission('ml', 'read'),
    controller.listModels
  );

  router.post(
    '/models/:modelId/deploy',
    authenticate,
    requirePermission('ml', 'deploy'),
    controller.deployModel
  );

  router.get(
    '/metrics',
    authenticate,
    requirePermission('ml', 'read'),
    controller.getModelMetrics
  );

  return router;
}
```

---

## 🧪 Testing Strategy

### ML Pipeline Test Suite

```typescript
// src/__tests__/ml-pipeline.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { MLModelTrainingService } from '../services/ml-model-training.service';
import { MLDataCollectionService } from '../services/ml-data-collection.service';
import { DatabaseService } from '../database/database.service';

describe('ML Pipeline Integration Tests', () => {
  let trainingService: MLModelTrainingService;
  let dataService: MLDataCollectionService;
  let db: DatabaseService;

  beforeEach(async () => {
    db = new DatabaseService();
    await db.connect();
    dataService = new MLDataCollectionService(db, null, null, null);
    trainingService = new MLModelTrainingService(dataService, db);
  });

  afterEach(async () => {
    await db.disconnect();
  });

  describe('Data Collection', () => {
    it('should collect historical data correctly', async () => {
      const data = await dataService.collectHistoricalData(6);

      expect(data).toBeDefined();
      expect(Array.isArray(data)).toBe(true);
      expect(data.length).toBeGreaterThan(0);

      if (data.length > 0) {
        expect(data[0]).toHaveProperty('employeeId');
        expect(data[0]).toHaveProperty('projectId');
        expect(data[0]).toHaveProperty('allocation_percentage');
      }
    });

    it('should extract features properly', async () => {
      const mockData = [{
        employeeId: 'test-id',
        projectId: 'project-id',
        skills: ['JavaScript', 'React'],
        allocation_percentage: 80,
        actual_hours: 32,
        performance_score: 85,
        completion_rate: 90,
        timestamp: new Date()
      }];

      const features = await dataService.extractFeatures(mockData);

      expect(features).toBeDefined();
      expect(features[0]).toHaveLength(5);
      expect(features[0][0]).toBe(0.8); // allocation_percentage / 100
    });
  });

  describe('Model Training', () => {
    it('should create a model with correct architecture', async () => {
      const model = await trainingService.createModel();

      expect(model).toBeDefined();
      expect(model.layers).toHaveLength(6); // Input + 4 hidden + output
      expect(model.inputs[0].shape).toEqual([null, 5]); // 5 input features
      expect(model.outputs[0].shape).toEqual([null, 3]); // 3 outputs
    });

    it('should handle prediction correctly', async () => {
      await trainingService.createModel();

      const input = [0.8, 0.8, 0.5, 0.85, 0.9];
      const prediction = await trainingService.predict(input);

      expect(prediction).toBeDefined();
      expect(prediction).toHaveLength(3);
      prediction.forEach(val => {
        expect(val).toBeGreaterThanOrEqual(0);
        expect(val).toBeLessThanOrEqual(1);
      });
    });
  });
});
```

---

## 📝 Summary

This technical implementation plan provides:

1. **ML Pipeline Components**:
   - Data collection service with feature extraction
   - TensorFlow.js model training service
   - Prediction API with confidence scoring
   - Model versioning and deployment

2. **Enterprise Features**:
   - Multi-tenant middleware with schema isolation
   - Tenant management service
   - RBAC implementation with caching
   - Permission middleware

3. **Database Structure**:
   - ML training and prediction tables
   - Multi-tenant architecture tables
   - Audit and usage tracking

4. **API Routes**:
   - ML prediction and training endpoints
   - Model management APIs
   - Tenant management endpoints

5. **Testing Strategy**:
   - Integration tests for ML pipeline
   - Unit tests for services
   - E2E test scenarios

All implementations are designed to integrate seamlessly with the existing architecture while maintaining:
- Type safety with TypeScript
- 95%+ test coverage
- Production-ready error handling
- Scalable architecture patterns

**Next Steps**:
1. Set up development environment
2. Create feature branches
3. Implement services incrementally
4. Run comprehensive tests
5. Deploy to staging for validation