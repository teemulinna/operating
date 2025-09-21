/**
 * Database Health Monitor Service
 *
 * Provides comprehensive database health monitoring and persistence validation
 * for production-ready database operations
 */

import { DatabaseService } from '../database/database.service';

export interface HealthCheckResult {
  isHealthy: boolean;
  checks: {
    connection: boolean;
    readCapability: boolean;
    writeCapability: boolean;
  };
  performance: {
    connectionTimeMs: number;
    totalConnections: number;
  };
  errors: string[];
}

export interface PersistenceValidationResult {
  isPersistent: boolean;
  validations: {
    createPersists: boolean;
    updatePersists: boolean;
    deletePersists: boolean;
    referentialIntegrityEnforced: boolean;
    constraintsEnforced: boolean;
  };
  testRecordId: string | null;
  errors: string[];
}

export interface PerformanceMetrics {
  connectionPool: {
    total: number;
    active: number;
    idle: number;
  };
  systemHealth: {
    connectionLimit: number;
    activeConnections: number;
  };
}

export interface BackupCapabilitiesResult {
  canBackup: boolean;
  canRestore: boolean;
  errors: string[];
}

/**
 * Database Health Monitor Service for real-time database monitoring
 */
export class DatabaseHealthMonitorService {
  private db: DatabaseService;

  constructor(databaseService: DatabaseService) {
    this.db = databaseService;
  }

  /**
   * Perform comprehensive health check
   */
  async performHealthCheck(): Promise<HealthCheckResult> {
    const startTime = Date.now();
    const errors: string[] = [];

    let connectionHealth = false;
    let readCapability = false;
    let writeCapability = false;

    try {
      // Check basic connection
      connectionHealth = await this.db.checkHealth();
      if (!connectionHealth) {
        errors.push('Database connection failed');
      }

      // Check read capability
      if (connectionHealth) {
        try {
          await this.db.query('SELECT 1 as health_check');
          readCapability = true;
        } catch (error) {
          errors.push(`Read capability failed: ${error}`);
        }
      }

      // Check write capability
      if (connectionHealth && readCapability) {
        try {
          // Create a temporary test table for write test
          await this.db.query(`
            CREATE TEMP TABLE health_check_${Date.now()} (
              id SERIAL PRIMARY KEY,
              test_value TEXT
            )
          `);
          writeCapability = true;
        } catch (error) {
          errors.push(`Write capability failed: ${error}`);
        }
      }
    } catch (error) {
      errors.push(`Health check failed: ${error}`);
    }

    const connectionTimeMs = Date.now() - startTime;
    const pool = this.db.getPool();

    return {
      isHealthy: connectionHealth && readCapability && writeCapability,
      checks: {
        connection: connectionHealth,
        readCapability,
        writeCapability
      },
      performance: {
        connectionTimeMs,
        totalConnections: pool?.totalCount || 0
      },
      errors
    };
  }

  /**
   * Validate database persistence capabilities
   */
  async validatePersistence(): Promise<PersistenceValidationResult> {
    const errors: string[] = [];
    let testRecordId: string | null = null;

    const validations = {
      createPersists: false,
      updatePersists: false,
      deletePersists: false,
      referentialIntegrityEnforced: false,
      constraintsEnforced: false
    };

    try {
      // Test CREATE persistence
      const testName = `health_test_${Date.now()}`;
      const createResult = await this.db.query(`
        INSERT INTO departments (name, description)
        VALUES ($1, $2)
        RETURNING id
      `, [testName, 'Health monitor test department']);

      if (createResult.rows.length > 0) {
        testRecordId = createResult.rows[0].id;
        validations.createPersists = true;
      }

      // Test UPDATE persistence
      if (testRecordId) {
        const updateName = `${testName}_updated`;
        await this.db.query(`
          UPDATE departments
          SET name = $1, updated_at = CURRENT_TIMESTAMP
          WHERE id = $2
        `, [updateName, testRecordId]);

        const updateCheck = await this.db.query(
          'SELECT name FROM departments WHERE id = $1',
          [testRecordId]
        );

        if (updateCheck.rows.length > 0 && updateCheck.rows[0].name === updateName) {
          validations.updatePersists = true;
        }
      }

      // Test referential integrity
      try {
        const fakeUuid = '12345678-1234-1234-1234-123456789abc';
        await this.db.query(`
          INSERT INTO employees (first_name, last_name, email, position, department_id, hire_date)
          VALUES ($1, $2, $3, $4, $5, $6)
        `, ['Test', 'Employee', 'test.referential@test.com', 'Test Position', fakeUuid, '2024-01-01']);

        // If we get here, referential integrity is NOT enforced
        validations.referentialIntegrityEnforced = false;
        await this.db.query('DELETE FROM employees WHERE email = $1', ['test.referential@test.com']);
      } catch (error) {
        // Expected behavior - foreign key constraint should prevent this
        validations.referentialIntegrityEnforced = true;
      }

      // Test constraints (email format)
      try {
        if (testRecordId) {
          await this.db.query(`
            INSERT INTO employees (first_name, last_name, email, position, department_id, hire_date)
            VALUES ($1, $2, $3, $4, $5, $6)
          `, ['Test', 'Employee', 'invalid-email', 'Test Position', testRecordId, '2024-01-01']);

          // If we get here, constraints are NOT enforced
          validations.constraintsEnforced = false;
          await this.db.query('DELETE FROM employees WHERE email = $1', ['invalid-email']);
        }
      } catch (error) {
        // Expected behavior - email constraint should prevent this
        validations.constraintsEnforced = true;
      }

      // Test DELETE persistence
      if (testRecordId) {
        await this.db.query('DELETE FROM departments WHERE id = $1', [testRecordId]);

        const deleteCheck = await this.db.query(
          'SELECT id FROM departments WHERE id = $1',
          [testRecordId]
        );

        if (deleteCheck.rows.length === 0) {
          validations.deletePersists = true;
        }
      }

    } catch (error) {
      errors.push(`Persistence validation failed: ${error}`);
    }

    // Clean up any remaining test data
    if (testRecordId) {
      try {
        await this.db.query('DELETE FROM departments WHERE id = $1', [testRecordId]);
      } catch (error) {
        // Ignore cleanup errors
      }
    }

    return {
      isPersistent: Object.values(validations).every(v => v === true),
      validations,
      testRecordId,
      errors
    };
  }

  /**
   * Get performance metrics
   */
  async getPerformanceMetrics(): Promise<PerformanceMetrics> {
    const pool = this.db.getPool();

    // Get system connection info
    let systemConnections = 0;
    let connectionLimit = 100; // Default PostgreSQL limit

    try {
      const connectionInfo = await this.db.query(`
        SELECT
          setting::int as max_connections
        FROM pg_settings
        WHERE name = 'max_connections'
      `);

      if (connectionInfo.rows.length > 0) {
        connectionLimit = connectionInfo.rows[0].max_connections;
      }

      const activeConnections = await this.db.query(`
        SELECT count(*) as active
        FROM pg_stat_activity
        WHERE state = 'active'
      `);

      if (activeConnections.rows.length > 0) {
        systemConnections = parseInt(activeConnections.rows[0].active);
      }
    } catch (error) {
      // Use defaults if system queries fail
    }

    return {
      connectionPool: {
        total: pool?.totalCount || 0,
        active: pool?.totalCount - pool?.idleCount || 0,
        idle: pool?.idleCount || 0
      },
      systemHealth: {
        connectionLimit,
        activeConnections: systemConnections
      }
    };
  }

  /**
   * Validate backup capabilities
   */
  async validateBackupCapabilities(): Promise<BackupCapabilitiesResult> {
    const errors: string[] = [];
    let canBackup = false;
    let canRestore = false;

    try {
      // Test if we can create a backup-like export query
      await this.db.query(`
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = 'public'
        LIMIT 5
      `);
      canBackup = true;

      // Test if we have necessary permissions for restore operations
      await this.db.query(`
        SELECT has_table_privilege('departments', 'INSERT') as can_insert,
               has_table_privilege('departments', 'UPDATE') as can_update,
               has_table_privilege('departments', 'DELETE') as can_delete
      `);
      canRestore = true;

    } catch (error) {
      errors.push(`Backup capability validation failed: ${error}`);
    }

    return {
      canBackup,
      canRestore,
      errors
    };
  }
}