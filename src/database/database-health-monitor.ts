import { ConnectionManager } from './connection-manager';
import { SchemaValidator } from './schema-validator';

interface HealthCheckResult {
  isHealthy: boolean;
  checks: {
    connection: boolean;
    schema: boolean;
    permissions: boolean;
  };
  metrics: {
    responseTime: number;
    poolStats: any;
  };
  errors: string[];
}

/**
 * Database Health Monitor for continuous database monitoring
 */
export class DatabaseHealthMonitor {
  private static instance: DatabaseHealthMonitor | null = null;
  private connectionManager: ConnectionManager | null = null;
  private isMonitoring: boolean = false;

  private constructor() {}

  public static getInstance(): DatabaseHealthMonitor {
    if (!DatabaseHealthMonitor.instance) {
      DatabaseHealthMonitor.instance = new DatabaseHealthMonitor();
    }
    return DatabaseHealthMonitor.instance;
  }

  /**
   * Initialize the health monitor
   */
  async initialize(): Promise<void> {
    this.connectionManager = await ConnectionManager.getInstance();
  }

  /**
   * Perform comprehensive health check
   */
  async performHealthCheck(): Promise<HealthCheckResult> {
    const startTime = Date.now();
    const errors: string[] = [];
    
    let connectionHealth = false;
    let schemaHealth = false;
    let permissionsHealth = false;

    try {
      // Check database connection
      if (this.connectionManager) {
        connectionHealth = await this.connectionManager.isHealthy();
        if (!connectionHealth) {
          errors.push('Database connection is not healthy');
        }
      }

      // Check schema integrity
      if (connectionHealth) {
        try {
          const validator = await SchemaValidator.create();
          const schemaResult = await validator.validateSchema();
          schemaHealth = schemaResult.isValid;
          
          if (!schemaHealth) {
            if (schemaResult.foreignKeys.missingConstraints.length > 0) {
              errors.push('Missing foreign key constraints detected');
            }
            if (schemaResult.indexes.missingIndexes.length > 0) {
              errors.push('Missing database indexes detected');
            }
            if (schemaResult.dataConsistency.inconsistencies.length > 0) {
              errors.push('Data consistency issues detected');
            }
          }
        } catch (error) {
          errors.push(`Schema validation failed: ${error}`);
        }
      }

      // Check permissions
      if (connectionHealth && this.connectionManager) {
        try {
          await this.connectionManager.query('SELECT COUNT(*) FROM employees LIMIT 1');
          await this.connectionManager.query('SELECT COUNT(*) FROM departments LIMIT 1');
          permissionsHealth = true;
        } catch (error) {
          errors.push(`Permission check failed: ${error}`);
        }
      }

    } catch (error) {
      errors.push(`Health check failed: ${error}`);
    }

    const responseTime = Date.now() - startTime;
    const poolStats = this.connectionManager?.getPoolStats() || null;

    return {
      isHealthy: connectionHealth && schemaHealth && permissionsHealth,
      checks: {
        connection: connectionHealth,
        schema: schemaHealth,
        permissions: permissionsHealth
      },
      metrics: {
        responseTime,
        poolStats
      },
      errors
    };
  }

  /**
   * Start continuous monitoring
   */
  startMonitoring(intervalMs: number = 60000): void {
    if (this.isMonitoring) {
      console.warn('Database monitoring is already active');
      return;
    }

    this.isMonitoring = true;
    
    const monitorLoop = async () => {
      if (!this.isMonitoring) return;

      try {
        const healthResult = await this.performHealthCheck();
        
        if (!healthResult.isHealthy) {
          console.warn('🚨 Database health check failed:', {
            checks: healthResult.checks,
            errors: healthResult.errors,
            responseTime: healthResult.metrics.responseTime
          });
        } else {
          console.log('✅ Database health check passed', {
            responseTime: healthResult.metrics.responseTime,
            poolStats: healthResult.metrics.poolStats
          });
        }
      } catch (error) {
        console.error('Health monitoring error:', error);
      }

      if (this.isMonitoring) {
        setTimeout(monitorLoop, intervalMs);
      }
    };

    monitorLoop();
    console.log(`🔍 Database health monitoring started (interval: ${intervalMs}ms)`);
  }

  /**
   * Stop continuous monitoring
   */
  stopMonitoring(): void {
    this.isMonitoring = false;
    console.log('Database health monitoring stopped');
  }

  /**
   * Get monitoring status
   */
  isActive(): boolean {
    return this.isMonitoring;
  }
}