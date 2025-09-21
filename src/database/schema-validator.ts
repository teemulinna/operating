import { Pool } from 'pg';
import { DatabaseFactory } from './database-factory';

interface ForeignKeyConstraint {
  constraintName: string;
  tableName: string;
  columnName: string;
  referencedTable: string;
  referencedColumn: string;
}

interface IndexInfo {
  tableName: string;
  indexName: string;
  columnName: string;
  isUnique: boolean;
}

export class SchemaValidator {
  private pool: Pool;

  constructor(pool?: Pool) {
    this.pool = pool!;
  }

  public static async create(): Promise<SchemaValidator> {
    const dbService = await DatabaseFactory.getDatabaseService();
    return new SchemaValidator(dbService.getPool());
  }

  /**
   * Validate all foreign key constraints are properly defined
   */
  async validateForeignKeys(): Promise<{ isValid: boolean; missingConstraints: string[] }> {
    const missingConstraints: string[] = [];

    try {
      // Check employee_skills foreign keys
      const employeeSkillsConstraints = await this.getForeignKeyConstraints('employee_skills');
      
      const requiredConstraints = [
        { constraint: 'fk_employee_skills_employee', referencedTable: 'employees' },
        { constraint: 'fk_employee_skills_skill', referencedTable: 'skills' }
      ];

      for (const required of requiredConstraints) {
        const exists = employeeSkillsConstraints.some(fk => 
          fk.constraintName === required.constraint && 
          fk.referencedTable === required.referencedTable
        );
        
        if (!exists) {
          missingConstraints.push(`Missing constraint: ${required.constraint} on employee_skills`);
        }
      }

      // Check departments manager constraint
      const departmentConstraints = await this.getForeignKeyConstraints('departments');
      const managerConstraintExists = departmentConstraints.some(fk => 
        fk.constraintName === 'fk_departments_manager' && 
        fk.referencedTable === 'employees'
      );

      if (!managerConstraintExists) {
        missingConstraints.push('Missing constraint: fk_departments_manager on departments');
      }

      return { isValid: missingConstraints.length === 0, missingConstraints };

    } catch (error) {
      console.error('Error validating foreign keys:', error);
      return { isValid: false, missingConstraints: [`Validation error: ${error}`] };
    }
  }

  /**
   * Validate indexes are properly created
   */
  async validateIndexes(): Promise<{ isValid: boolean; missingIndexes: string[] }> {
    const missingIndexes: string[] = [];

    try {
      const indexes = await this.getTableIndexes();
      
      const requiredIndexes = [
        { table: 'employees', index: 'idx_employees_department_id', column: 'department_id' },
        { table: 'employees', index: 'idx_employees_email', column: 'email' },
        { table: 'employee_skills', index: 'idx_employee_skills_employee_id', column: 'employee_id' },
        { table: 'employee_skills', index: 'idx_employee_skills_skill_id', column: 'skill_id' },
        { table: 'departments', index: 'idx_departments_name', column: 'name' }
      ];

      for (const required of requiredIndexes) {
        const exists = indexes.some(idx => 
          idx.tableName === required.table && 
          idx.indexName === required.index
        );
        
        if (!exists) {
          missingIndexes.push(`Missing index: ${required.index} on ${required.table}`);
        }
      }

      return { isValid: missingIndexes.length === 0, missingIndexes };

    } catch (error) {
      console.error('Error validating indexes:', error);
      return { isValid: false, missingIndexes: [`Validation error: ${error}`] };
    }
  }

  /**
   * Validate data consistency across relationships
   */
  async validateDataConsistency(): Promise<{ isValid: boolean; inconsistencies: string[] }> {
    const inconsistencies: string[] = [];

    try {
      // Check orphaned employee skills
      const orphanedSkillsResult = await this.pool.query(`
        SELECT COUNT(*) as count 
        FROM employee_skills es 
        LEFT JOIN employees e ON es.employee_id = e.id 
        WHERE e.id IS NULL
      `);
      
      if (parseInt(orphanedSkillsResult.rows[0].count) > 0) {
        inconsistencies.push(`Found ${orphanedSkillsResult.rows[0].count} orphaned employee_skills records`);
      }

      // Check orphaned employees (missing department)
      const orphanedEmployeesResult = await this.pool.query(`
        SELECT COUNT(*) as count 
        FROM employees e 
        LEFT JOIN departments d ON e.department_id = d.id 
        WHERE d.id IS NULL
      `);
      
      if (parseInt(orphanedEmployeesResult.rows[0].count) > 0) {
        inconsistencies.push(`Found ${orphanedEmployeesResult.rows[0].count} employees with invalid department references`);
      }

      // Check department managers exist
      const invalidManagersResult = await this.pool.query(`
        SELECT COUNT(*) as count 
        FROM departments d 
        LEFT JOIN employees e ON d.manager_id = e.id 
        WHERE d.manager_id IS NOT NULL AND e.id IS NULL
      `);
      
      if (parseInt(invalidManagersResult.rows[0].count) > 0) {
        inconsistencies.push(`Found ${invalidManagersResult.rows[0].count} departments with invalid manager references`);
      }

      return { isValid: inconsistencies.length === 0, inconsistencies };

    } catch (error) {
      console.error('Error validating data consistency:', error);
      return { isValid: false, inconsistencies: [`Validation error: ${error}`] };
    }
  }

  /**
   * Fix missing foreign key constraints
   */
  async fixMissingConstraints(): Promise<void> {
    const client = await this.pool.connect();
    
    try {
      await client.query('BEGIN');

      // Fix employee_skills constraints if missing
      await client.query(`
        ALTER TABLE employee_skills 
        DROP CONSTRAINT IF EXISTS fk_employee_skills_employee;
      `);
      
      await client.query(`
        ALTER TABLE employee_skills 
        ADD CONSTRAINT fk_employee_skills_employee 
        FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE;
      `);

      await client.query(`
        ALTER TABLE employee_skills 
        DROP CONSTRAINT IF EXISTS fk_employee_skills_skill;
      `);
      
      await client.query(`
        ALTER TABLE employee_skills 
        ADD CONSTRAINT fk_employee_skills_skill 
        FOREIGN KEY (skill_id) REFERENCES skills(id) ON DELETE CASCADE;
      `);

      // Fix departments manager constraint if missing
      await client.query(`
        ALTER TABLE departments 
        DROP CONSTRAINT IF EXISTS fk_departments_manager;
      `);
      
      await client.query(`
        ALTER TABLE departments 
        ADD CONSTRAINT fk_departments_manager 
        FOREIGN KEY (manager_id) REFERENCES employees(id) ON DELETE SET NULL;
      `);

      await client.query('COMMIT');
      console.log('Fixed missing foreign key constraints');

    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error fixing constraints:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get foreign key constraints for a table
   */
  private async getForeignKeyConstraints(tableName: string): Promise<ForeignKeyConstraint[]> {
    const result = await this.pool.query(`
      SELECT 
        tc.constraint_name,
        tc.table_name,
        kcu.column_name,
        ccu.table_name AS referenced_table,
        ccu.column_name AS referenced_column
      FROM information_schema.table_constraints AS tc
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
      JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
      WHERE tc.constraint_type = 'FOREIGN KEY'
        AND tc.table_name = $1;
    `, [tableName]);

    return result.rows.map(row => ({
      constraintName: row.constraint_name,
      tableName: row.table_name,
      columnName: row.column_name,
      referencedTable: row.referenced_table,
      referencedColumn: row.referenced_column
    }));
  }

  /**
   * Get indexes for all tables
   */
  private async getTableIndexes(): Promise<IndexInfo[]> {
    const result = await this.pool.query(`
      SELECT 
        schemaname,
        tablename,
        indexname,
        indexdef
      FROM pg_indexes 
      WHERE schemaname = 'public'
      ORDER BY tablename, indexname;
    `);

    return result.rows.map(row => ({
      tableName: row.tablename,
      indexName: row.indexname,
      columnName: this.extractColumnFromIndexDef(row.indexdef),
      isUnique: row.indexdef.includes('UNIQUE')
    }));
  }

  private extractColumnFromIndexDef(indexDef: string): string {
    // Extract column name from index definition
    const match = indexDef.match(/\((.*?)\)/);
    return match ? match[1] : '';
  }

  /**
   * Comprehensive schema validation
   */
  async validateSchema(): Promise<{ 
    isValid: boolean; 
    foreignKeys: any; 
    indexes: any; 
    dataConsistency: any; 
  }> {
    const foreignKeys = await this.validateForeignKeys();
    const indexes = await this.validateIndexes();
    const dataConsistency = await this.validateDataConsistency();

    const isValid = foreignKeys.isValid && indexes.isValid && dataConsistency.isValid;

    return {
      isValid,
      foreignKeys,
      indexes,
      dataConsistency
    };
  }
}