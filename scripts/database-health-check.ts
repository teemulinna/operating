#!/usr/bin/env npx tsx

import { DatabaseService } from '../src/database/database.service';

interface HealthCheckResult {
  component: string;
  status: 'HEALTHY' | 'WARNING' | 'CRITICAL';
  message: string;
  details?: any;
}

class DatabaseHealthChecker {
  private db: DatabaseService;
  private results: HealthCheckResult[] = [];

  constructor() {
    this.db = DatabaseService.getInstance();
  }

  private addResult(component: string, status: 'HEALTHY' | 'WARNING' | 'CRITICAL', message: string, details?: any): void {
    this.results.push({ component, status, message, details });
  }

  async checkConnection(): Promise<void> {
    try {
      await this.db.connect();
      if (this.db.isConnected()) {
        this.addResult('Connection', 'HEALTHY', 'Database connected successfully');
      } else {
        this.addResult('Connection', 'CRITICAL', 'Database connection failed');
      }
    } catch (error: any) {
      this.addResult('Connection', 'CRITICAL', `Connection error: ${error.message}`);
    }
  }

  async checkBasicQueries(): Promise<void> {
    try {
      const result = await this.db.query('SELECT version() as version, current_database() as database');
      const row = result.rows[0];
      this.addResult('Basic Queries', 'HEALTHY', 'Basic queries working', {
        version: row.version.split(' ').slice(0, 2).join(' '),
        database: row.database
      });
    } catch (error: any) {
      this.addResult('Basic Queries', 'CRITICAL', `Query error: ${error.message}`);
    }
  }

  async checkCoreTables(): Promise<void> {
    const coreTables = ['employees', 'departments', 'skills', 'projects', 'allocations'];
    let healthy = 0;
    const tableInfo: any = {};

    for (const table of coreTables) {
      try {
        const countResult = await this.db.query(`SELECT COUNT(*) as count FROM ${table}`);
        const count = parseInt(countResult.rows[0].count);
        tableInfo[table] = count;
        healthy++;
      } catch (error: any) {
        tableInfo[table] = `ERROR: ${error.message}`;
      }
    }

    if (healthy === coreTables.length) {
      this.addResult('Core Tables', 'HEALTHY', `All ${coreTables.length} core tables accessible`, tableInfo);
    } else {
      this.addResult('Core Tables', 'WARNING', `${healthy}/${coreTables.length} core tables accessible`, tableInfo);
    }
  }

  async checkMigrations(): Promise<void> {
    try {
      const result = await this.db.query(`
        SELECT 
          COUNT(*) as total_migrations,
          MAX(executed_at) as last_migration
        FROM migrations
      `);
      
      const row = result.rows[0];
      this.addResult('Migrations', 'HEALTHY', 'Migration system working', {
        totalMigrations: parseInt(row.total_migrations),
        lastMigration: row.last_migration
      });
    } catch (error: any) {
      this.addResult('Migrations', 'WARNING', `Migration table issue: ${error.message}`);
    }
  }

  async checkConstraints(): Promise<void> {
    try {
      const result = await this.db.query(`
        SELECT 
          COUNT(*) as total_constraints,
          COUNT(*) FILTER (WHERE contype = 'f') as foreign_keys,
          COUNT(*) FILTER (WHERE contype = 'u') as unique_constraints,
          COUNT(*) FILTER (WHERE contype = 'c') as check_constraints
        FROM pg_constraint
        WHERE connamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
      `);
      
      const row = result.rows[0];
      this.addResult('Constraints', 'HEALTHY', 'Database constraints in place', {
        total: parseInt(row.total_constraints),
        foreignKeys: parseInt(row.foreign_keys),
        unique: parseInt(row.unique_constraints),
        check: parseInt(row.check_constraints)
      });
    } catch (error: any) {
      this.addResult('Constraints', 'WARNING', `Constraint check failed: ${error.message}`);
    }
  }

  async checkIndexes(): Promise<void> {
    try {
      const result = await this.db.query(`
        SELECT 
          COUNT(*) as total_indexes,
          COUNT(*) FILTER (WHERE indisunique) as unique_indexes,
          COUNT(*) FILTER (WHERE NOT indisunique) as regular_indexes
        FROM pg_index i
        JOIN pg_class c ON c.oid = i.indexrelid
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = 'public'
      `);
      
      const row = result.rows[0];
      this.addResult('Indexes', 'HEALTHY', 'Database indexes configured', {
        total: parseInt(row.total_indexes),
        unique: parseInt(row.unique_indexes),
        regular: parseInt(row.regular_indexes)
      });
    } catch (error: any) {
      this.addResult('Indexes', 'WARNING', `Index check failed: ${error.message}`);
    }
  }

  async checkPerformance(): Promise<void> {
    const queries = [
      { name: 'Simple SELECT', query: 'SELECT 1' },
      { name: 'Employee Count', query: 'SELECT COUNT(*) FROM employees' },
      { name: 'Join Query', query: `
        SELECT e.first_name, d.name 
        FROM employees e 
        LEFT JOIN departments d ON e.department_id = d.id 
        LIMIT 1
      ` }
    ];

    const performanceResults: any = {};
    let totalTime = 0;

    for (const test of queries) {
      try {
        const start = Date.now();
        await this.db.query(test.query);
        const duration = Date.now() - start;
        totalTime += duration;
        performanceResults[test.name] = `${duration}ms`;
      } catch (error: any) {
        performanceResults[test.name] = `ERROR: ${error.message}`;
      }
    }

    const avgTime = totalTime / queries.length;
    const status = avgTime < 100 ? 'HEALTHY' : avgTime < 500 ? 'WARNING' : 'CRITICAL';
    
    this.addResult('Performance', status, `Average query time: ${avgTime.toFixed(2)}ms`, performanceResults);
  }

  async checkDatabaseSize(): Promise<void> {
    try {
      const result = await this.db.query(`
        SELECT 
          pg_size_pretty(pg_database_size(current_database())) as database_size,
          (SELECT COUNT(*) FROM pg_tables WHERE schemaname = 'public') as table_count
      `);
      
      const row = result.rows[0];
      this.addResult('Database Size', 'HEALTHY', 'Database size information', {
        size: row.database_size,
        tables: parseInt(row.table_count)
      });
    } catch (error: any) {
      this.addResult('Database Size', 'WARNING', `Size check failed: ${error.message}`);
    }
  }

  async checkRecentActivity(): Promise<void> {
    try {
      const result = await this.db.query(`
        SELECT 
          (SELECT COUNT(*) FROM employees WHERE created_at > CURRENT_TIMESTAMP - INTERVAL '7 days') as new_employees_week,
          (SELECT COUNT(*) FROM projects WHERE created_at > CURRENT_TIMESTAMP - INTERVAL '7 days') as new_projects_week,
          (SELECT MAX(created_at) FROM employees) as last_employee_created
      `);
      
      const row = result.rows[0];
      this.addResult('Recent Activity', 'HEALTHY', 'Recent database activity', {
        newEmployeesThisWeek: parseInt(row.new_employees_week),
        newProjectsThisWeek: parseInt(row.new_projects_week),
        lastEmployeeCreated: row.last_employee_created
      });
    } catch (error: any) {
      this.addResult('Recent Activity', 'WARNING', `Activity check failed: ${error.message}`);
    }
  }

  async runAllChecks(): Promise<void> {
    console.log('🏥 Running Database Health Checks...\n');
    
    await this.checkConnection();
    await this.checkBasicQueries();
    await this.checkCoreTables();
    await this.checkMigrations();
    await this.checkConstraints();
    await this.checkIndexes();
    await this.checkPerformance();
    await this.checkDatabaseSize();
    await this.checkRecentActivity();
    
    this.printResults();
  }

  private printResults(): void {
    const healthy = this.results.filter(r => r.status === 'HEALTHY').length;
    const warnings = this.results.filter(r => r.status === 'WARNING').length;
    const critical = this.results.filter(r => r.status === 'CRITICAL').length;

    console.log('='.repeat(60));
    console.log('🏥 DATABASE HEALTH REPORT');
    console.log('='.repeat(60));
    
    for (const result of this.results) {
      const icon = result.status === 'HEALTHY' ? '✅' : result.status === 'WARNING' ? '⚠️' : '❌';
      console.log(`${icon} ${result.component}: ${result.message}`);
      
      if (result.details) {
        Object.entries(result.details).forEach(([key, value]) => {
          console.log(`   📊 ${key}: ${value}`);
        });
      }
      console.log('');
    }

    console.log('='.repeat(60));
    console.log(`📊 SUMMARY: ${healthy} Healthy, ${warnings} Warnings, ${critical} Critical`);
    
    if (critical > 0) {
      console.log('🚨 CRITICAL ISSUES DETECTED - Immediate attention required');
    } else if (warnings > 0) {
      console.log('⚠️  Some warnings detected - Review recommended');
    } else {
      console.log('🎉 All systems healthy!');
    }
    
    const overallStatus = critical > 0 ? 'CRITICAL' : warnings > 0 ? 'WARNING' : 'HEALTHY';
    console.log(`🏥 Overall Status: ${overallStatus}`);
    console.log('='.repeat(60));
  }

  async cleanup(): Promise<void> {
    await DatabaseService.disconnect();
  }
}

// Main execution
async function main(): Promise<void> {
  const checker = new DatabaseHealthChecker();
  
  try {
    await checker.runAllChecks();
  } catch (error) {
    console.error('🚨 Fatal error during health check:', error);
    process.exit(1);
  } finally {
    await checker.cleanup();
  }
}

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}

export { DatabaseHealthChecker };