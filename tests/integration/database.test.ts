import { DatabaseConnection } from '../../src/database/connection';
import { DatabaseMigrator } from '../../src/database/migrator';
import { DatabaseSeeder } from '../../src/database/seeder';
import { testDb, testPool } from '../setup';

describe('Database Integration', () => {
  describe('Database Connection', () => {
    it('should establish database connection successfully', async () => {
      const isConnected = await testDb.isConnected();
      expect(isConnected).toBe(true);
    });

    it('should handle connection errors gracefully', async () => {
      const badConfig = {
        host: 'nonexistent-host',
        port: 5432,
        database: 'nonexistent',
        user: 'nobody',
        password: 'invalid',
        ssl: false
      };

      const badDb = new DatabaseConnection(badConfig);
      
      await expect(badDb.connect()).rejects.toThrow();
    });

    it('should execute queries successfully', async () => {
      const result = await testPool.query('SELECT NOW() as current_time');
      expect(result.rows).toHaveLength(1);
      expect(result.rows[0].current_time).toBeInstanceOf(Date);
    });

    it('should handle transactions', async () => {
      const client = await testPool.connect();
      
      try {
        await client.query('BEGIN');
        
        await client.query(
          `INSERT INTO departments (name, description, is_active) 
           VALUES ($1, $2, $3)`,
          ['Transaction Test', 'Test department', true]
        );

        const result = await client.query(
          'SELECT * FROM departments WHERE name = $1',
          ['Transaction Test']
        );
        
        expect(result.rows).toHaveLength(1);
        
        await client.query('ROLLBACK');
        
        const afterRollback = await client.query(
          'SELECT * FROM departments WHERE name = $1',
          ['Transaction Test']
        );
        
        expect(afterRollback.rows).toHaveLength(0);
        
      } finally {
        client.release();
      }
    });
  });

  describe('Database Schema', () => {
    it('should have all required tables', async () => {
      const tablesQuery = `
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        ORDER BY table_name
      `;
      
      const result = await testPool.query(tablesQuery);
      const tableNames = result.rows.map(row => row.table_name);
      
      expect(tableNames).toContain('departments');
      expect(tableNames).toContain('employees');
      expect(tableNames).toContain('skills');
      expect(tableNames).toContain('employee_skills');
      expect(tableNames).toContain('capacity_history');
    });

    it('should have proper foreign key constraints', async () => {
      const constraintsQuery = `
        SELECT 
          tc.constraint_name, 
          tc.table_name, 
          kcu.column_name,
          ccu.table_name AS foreign_table_name,
          ccu.column_name AS foreign_column_name 
        FROM information_schema.table_constraints AS tc 
        JOIN information_schema.key_column_usage AS kcu
          ON tc.constraint_name = kcu.constraint_name
          AND tc.table_schema = kcu.table_schema
        JOIN information_schema.constraint_column_usage AS ccu
          ON ccu.constraint_name = tc.constraint_name
          AND ccu.table_schema = tc.table_schema
        WHERE tc.constraint_type = 'FOREIGN KEY'
        ORDER BY tc.table_name, tc.constraint_name
      `;

      const result = await testPool.query(constraintsQuery);
      const constraints = result.rows;

      // Check employees -> departments FK
      const employeeDeptFK = constraints.find(c => 
        c.table_name === 'employees' && 
        c.column_name === 'department_id'
      );
      expect(employeeDeptFK).toBeDefined();
      expect(employeeDeptFK.foreign_table_name).toBe('departments');

      // Check employee_skills FKs
      const empSkillEmployeeFK = constraints.find(c => 
        c.table_name === 'employee_skills' && 
        c.column_name === 'employee_id'
      );
      expect(empSkillEmployeeFK).toBeDefined();

      const empSkillSkillFK = constraints.find(c => 
        c.table_name === 'employee_skills' && 
        c.column_name === 'skill_id'
      );
      expect(empSkillSkillFK).toBeDefined();

      // Check capacity_history FK
      const capacityFK = constraints.find(c => 
        c.table_name === 'capacity_history' && 
        c.column_name === 'employee_id'
      );
      expect(capacityFK).toBeDefined();
    });

    it('should have proper indexes', async () => {
      const indexesQuery = `
        SELECT 
          indexname,
          tablename,
          indexdef
        FROM pg_indexes 
        WHERE schemaname = 'public'
        AND indexname NOT LIKE '%_pkey'
        ORDER BY tablename, indexname
      `;

      const result = await testPool.query(indexesQuery);
      const indexes = result.rows;

      // Check for email unique index
      const emailIndex = indexes.find(i => 
        i.tablename === 'employees' && 
        i.indexdef.includes('email')
      );
      expect(emailIndex).toBeDefined();

      // Check for department_id index
      const deptIndex = indexes.find(i => 
        i.tablename === 'employees' && 
        i.indexdef.includes('department_id')
      );
      expect(deptIndex).toBeDefined();
    });

    it('should enforce unique constraints', async () => {
      // Insert first employee
      await testPool.query(
        `INSERT INTO departments (name, description, is_active) 
         VALUES ($1, $2, $3)`,
        ['Test Dept', 'Test', true]
      );

      const deptResult = await testPool.query(
        'SELECT id FROM departments WHERE name = $1',
        ['Test Dept']
      );
      const deptId = deptResult.rows[0].id;

      await testPool.query(
        `INSERT INTO employees (first_name, last_name, email, department_id, position, hire_date, is_active) 
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        ['John', 'Doe', 'unique@test.com', deptId, 'Developer', new Date(), true]
      );

      // Try to insert duplicate email
      await expect(testPool.query(
        `INSERT INTO employees (first_name, last_name, email, department_id, position, hire_date, is_active) 
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        ['Jane', 'Smith', 'unique@test.com', deptId, 'Designer', new Date(), true]
      )).rejects.toThrow();
    });
  });

  describe('Database Migrations', () => {
    it('should track migration history', async () => {
      const migrationTable = await testPool.query(
        `SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'migrations'
        )`
      );

      expect(migrationTable.rows[0].exists).toBe(true);
    });

    it('should have executed all required migrations', async () => {
      const migrations = await testPool.query(
        'SELECT * FROM migrations ORDER BY executed_at'
      );

      expect(migrations.rows.length).toBeGreaterThan(0);
      
      const migrationNames = migrations.rows.map(m => m.name);
      expect(migrationNames).toContain('001_create_departments');
      expect(migrationNames).toContain('002_create_skills');
      expect(migrationNames).toContain('003_create_employees');
      expect(migrationNames).toContain('004_create_employee_skills');
      expect(migrationNames).toContain('005_create_capacity_history');
    });
  });

  describe('Database Seeding', () => {
    it('should have seed data for departments', async () => {
      const seeder = new DatabaseSeeder(testPool);
      await seeder.seedDepartments();

      const departments = await testPool.query(
        'SELECT * FROM departments WHERE name IN ($1, $2, $3)',
        ['Engineering', 'Human Resources', 'Marketing']
      );

      expect(departments.rows.length).toBeGreaterThan(0);
    });

    it('should have seed data for skills', async () => {
      const seeder = new DatabaseSeeder(testPool);
      await seeder.seedSkills();

      const skills = await testPool.query(
        'SELECT * FROM skills WHERE category = $1',
        ['technical']
      );

      expect(skills.rows.length).toBeGreaterThan(0);

      const skillNames = skills.rows.map(s => s.name);
      expect(skillNames).toContain('JavaScript');
      expect(skillNames).toContain('TypeScript');
      expect(skillNames).toContain('Node.js');
    });
  });

  describe('Performance Tests', () => {
    it('should handle batch inserts efficiently', async () => {
      // Create test department
      await testPool.query(
        `INSERT INTO departments (name, description, is_active) 
         VALUES ($1, $2, $3)`,
        ['Batch Test Dept', 'For batch testing', true]
      );

      const deptResult = await testPool.query(
        'SELECT id FROM departments WHERE name = $1',
        ['Batch Test Dept']
      );
      const deptId = deptResult.rows[0].id;

      const startTime = Date.now();

      // Insert 100 employees
      const promises = [];
      for (let i = 0; i < 100; i++) {
        promises.push(
          testPool.query(
            `INSERT INTO employees (first_name, last_name, email, department_id, position, hire_date, is_active) 
             VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            [`User${i}`, 'Test', `user${i}@test.com`, deptId, 'Developer', new Date(), true]
          )
        );
      }

      await Promise.all(promises);

      const endTime = Date.now();
      const executionTime = endTime - startTime;

      // Should complete within reasonable time (less than 5 seconds)
      expect(executionTime).toBeLessThan(5000);

      // Verify all employees were inserted
      const count = await testPool.query(
        'SELECT COUNT(*) FROM employees WHERE department_id = $1',
        [deptId]
      );
      expect(parseInt(count.rows[0].count)).toBe(100);
    });

    it('should handle complex queries with joins efficiently', async () => {
      // This test verifies that joins perform well
      const complexQuery = `
        SELECT 
          e.first_name,
          e.last_name,
          d.name as department_name,
          COUNT(es.id) as skill_count,
          AVG(ch.utilization_rate) as avg_utilization
        FROM employees e
        JOIN departments d ON e.department_id = d.id
        LEFT JOIN employee_skills es ON e.id = es.employee_id AND es.is_active = true
        LEFT JOIN capacity_history ch ON e.id = ch.employee_id 
          AND ch.date >= CURRENT_DATE - INTERVAL '30 days'
        WHERE e.is_active = true
        GROUP BY e.id, e.first_name, e.last_name, d.name
        ORDER BY skill_count DESC, avg_utilization DESC
        LIMIT 10
      `;

      const startTime = Date.now();
      const result = await testPool.query(complexQuery);
      const endTime = Date.now();

      const executionTime = endTime - startTime;

      // Complex query should complete quickly (less than 1 second)
      expect(executionTime).toBeLessThan(1000);
      expect(result.rows).toBeDefined();
    });
  });
});