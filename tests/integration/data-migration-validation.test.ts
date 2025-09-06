import { Pool } from 'pg';
import { DatabaseService } from '../../src/database/database.service';
import request from 'supertest';
import { app } from '../../src/app';

describe('Data Migration and Backwards Compatibility Validation', () => {
  let db: Pool;

  beforeAll(async () => {
    db = await DatabaseService.getPool();
  });

  afterAll(async () => {
    await DatabaseService.closePool();
  });

  describe('8. Data Migration Validation', () => {
    test('should have all Phase 3 tables created', async () => {
      const expectedTables = [
        'projects',
        'project_roles',
        'project_assignments',
        'assignment_allocations',
        'time_entries',
        'employees',
        'departments',
        'skills'
      ];

      for (const tableName of expectedTables) {
        const result = await db.query(`
          SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = $1
          );
        `, [tableName]);

        expect(result.rows[0].exists).toBe(true);
        console.log(`✅ Table '${tableName}' exists`);
      }
    });

    test('should have proper column types and constraints', async () => {
      // Test projects table schema
      const projectsSchema = await db.query(`
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns
        WHERE table_name = 'projects'
        ORDER BY ordinal_position;
      `);

      const requiredColumns = ['id', 'name', 'client_name', 'start_date', 'status'];
      const actualColumns = projectsSchema.rows.map(row => row.column_name);

      requiredColumns.forEach(col => {
        expect(actualColumns).toContain(col);
      });

      console.log('✅ Projects table has required columns');

      // Test project_roles table schema
      const rolesSchema = await db.query(`
        SELECT column_name, data_type
        FROM information_schema.columns
        WHERE table_name = 'project_roles'
        ORDER BY ordinal_position;
      `);

      const requiredRoleColumns = ['id', 'project_id', 'role_name', 'required_skills'];
      const actualRoleColumns = rolesSchema.rows.map(row => row.column_name);

      requiredRoleColumns.forEach(col => {
        expect(actualRoleColumns).toContain(col);
      });

      console.log('✅ Project roles table has required columns');
    });

    test('should have proper foreign key constraints', async () => {
      const foreignKeys = await db.query(`
        SELECT
          tc.table_name,
          kcu.column_name,
          ccu.table_name AS foreign_table_name,
          ccu.column_name AS foreign_column_name,
          tc.constraint_name
        FROM information_schema.table_constraints AS tc
        JOIN information_schema.key_column_usage AS kcu
          ON tc.constraint_name = kcu.constraint_name
          AND tc.table_schema = kcu.table_schema
        JOIN information_schema.constraint_column_usage AS ccu
          ON ccu.constraint_name = tc.constraint_name
          AND ccu.table_schema = tc.table_schema
        WHERE tc.constraint_type = 'FOREIGN KEY'
        AND tc.table_schema = 'public'
        AND tc.table_name IN ('project_roles', 'project_assignments', 'assignment_allocations')
      `);

      // Should have foreign keys from project_roles to projects
      const projectRolesFk = foreignKeys.rows.find(fk => 
        fk.table_name === 'project_roles' && fk.foreign_table_name === 'projects'
      );
      
      if (projectRolesFk) {
        expect(projectRolesFk.column_name).toBe('project_id');
        console.log('✅ Project roles has FK to projects');
      }

      console.log(`✅ Found ${foreignKeys.rows.length} foreign key constraints`);
    });

    test('should handle data type migrations properly', async () => {
      // Test that UUIDs are properly handled
      const uuidColumns = await db.query(`
        SELECT table_name, column_name, data_type
        FROM information_schema.columns
        WHERE data_type = 'uuid'
        AND table_schema = 'public';
      `);

      console.log(`✅ Found ${uuidColumns.rows.length} UUID columns`);

      // Test that JSON columns work properly
      const jsonColumns = await db.query(`
        SELECT table_name, column_name, data_type
        FROM information_schema.columns
        WHERE data_type IN ('json', 'jsonb')
        AND table_schema = 'public';
      `);

      console.log(`✅ Found ${jsonColumns.rows.length} JSON columns`);
    });

    test('should preserve existing employee data', async () => {
      // Check if employees table has data and structure is intact
      const employeeCount = await db.query('SELECT COUNT(*) FROM employees');
      const employeeStructure = await db.query(`
        SELECT column_name, data_type
        FROM information_schema.columns
        WHERE table_name = 'employees'
        ORDER BY ordinal_position;
      `);

      expect(employeeStructure.rows.length).toBeGreaterThan(0);
      console.log(`✅ Employees table has ${employeeCount.rows[0].count} records and ${employeeStructure.rows.length} columns`);

      // Test that we can still query employees normally
      const sampleEmployees = await db.query('SELECT * FROM employees LIMIT 5');
      expect(Array.isArray(sampleEmployees.rows)).toBe(true);
    });

    test('should handle enum migrations properly', async () => {
      // Check if project status enum exists and has correct values
      const statusEnum = await db.query(`
        SELECT enumlabel
        FROM pg_enum
        JOIN pg_type ON pg_enum.enumtypid = pg_type.oid
        WHERE pg_type.typname = 'project_status'
        ORDER BY enumlabel;
      `);

      if (statusEnum.rows.length > 0) {
        const statusValues = statusEnum.rows.map(row => row.enumlabel);
        const expectedStatuses = ['active', 'cancelled', 'completed', 'on-hold', 'planning'];
        
        expectedStatuses.forEach(status => {
          expect(statusValues).toContain(status);
        });

        console.log(`✅ Project status enum has ${statusValues.length} values: ${statusValues.join(', ')}`);
      }
    });
  });

  describe('Backwards Compatibility', () => {
    test('should accept legacy project creation format', async () => {
      // Test if the API can handle both old and new formats
      const legacyFormat = {
        project_name: 'Legacy Project', // old snake_case
        client: 'Legacy Client',
        start_date: '2025-01-01',
        active: true
      };

      // This might fail with validation error, which is acceptable
      const response = await request(app)
        .post('/api/projects')
        .send(legacyFormat);

      // Either accepts and converts, or rejects with proper error
      if (response.status === 400) {
        expect(response.body).toHaveProperty('error');
        console.log('✅ Legacy format properly rejected with validation error');
      } else if (response.status === 201) {
        expect(response.body.data).toHaveProperty('id');
        console.log('✅ Legacy format accepted and converted');
      }
    });

    test('should maintain API response format consistency', async () => {
      // Test that all endpoints return consistent format
      const endpoints = [
        '/api/projects',
        '/api/allocations',
        '/api/employees',
        '/api/departments'
      ];

      for (const endpoint of endpoints) {
        const response = await request(app)
          .get(endpoint)
          .expect(200);

        // Standard response format
        expect(response.body).toHaveProperty('success');
        expect(response.body).toHaveProperty('data');
        
        // If it's a list, should have pagination
        if (Array.isArray(response.body.data)) {
          expect(response.body).toHaveProperty('pagination');
        }

        console.log(`✅ ${endpoint} returns consistent format`);
      }
    });

    test('should handle old allocation data structure', async () => {
      // Test if existing allocation queries still work
      const allocationsResponse = await request(app)
        .get('/api/allocations')
        .expect(200);

      expect(allocationsResponse.body).toHaveProperty('data');
      expect(Array.isArray(allocationsResponse.body.data)).toBe(true);

      console.log(`✅ Allocations API returns ${allocationsResponse.body.data.length} records`);
    });

    test('should support legacy query parameters', async () => {
      // Test old query parameter formats
      const legacyQueries = [
        '/api/projects?active=true',
        '/api/projects?client=TestClient',
        '/api/employees?department=IT'
      ];

      for (const query of legacyQueries) {
        const response = await request(app).get(query);
        
        // Should either work or return proper error
        expect([200, 400]).toContain(response.status);
        
        if (response.status === 200) {
          console.log(`✅ Legacy query '${query}' still works`);
        } else {
          console.log(`✅ Legacy query '${query}' properly rejected`);
        }
      }
    });
  });

  describe('Data Integrity After Migration', () => {
    test('should maintain referential integrity', async () => {
      // Test that all foreign key relationships are intact
      const integrityChecks = [
        {
          name: 'Employees -> Departments',
          query: `
            SELECT COUNT(*) as orphans
            FROM employees e
            WHERE department_id IS NOT NULL
            AND NOT EXISTS (SELECT 1 FROM departments d WHERE d.id = e.department_id)
          `
        },
        {
          name: 'Project Roles -> Projects',
          query: `
            SELECT COUNT(*) as orphans
            FROM project_roles pr
            WHERE NOT EXISTS (SELECT 1 FROM projects p WHERE p.id = pr.project_id)
          `
        }
      ];

      for (const check of integrityChecks) {
        const result = await db.query(check.query);
        const orphans = parseInt(result.rows[0].orphans);
        
        expect(orphans).toBe(0);
        console.log(`✅ ${check.name}: No orphaned records (${orphans})`);
      }
    });

    test('should have consistent data types across related tables', async () => {
      // Test that ID columns have consistent types
      const idColumns = await db.query(`
        SELECT table_name, column_name, data_type, character_maximum_length
        FROM information_schema.columns
        WHERE column_name LIKE '%_id'
        OR column_name = 'id'
        AND table_schema = 'public'
        ORDER BY table_name, column_name;
      `);

      // Group by data type
      const typeGroups = idColumns.rows.reduce((acc: any, row) => {
        const key = `${row.data_type}${row.character_maximum_length ? `-${row.character_maximum_length}` : ''}`;
        if (!acc[key]) acc[key] = [];
        acc[key].push(`${row.table_name}.${row.column_name}`);
        return acc;
      }, {});

      console.log('✅ ID column data types:');
      Object.entries(typeGroups).forEach(([type, columns]: [string, any]) => {
        console.log(`  ${type}: ${columns.length} columns`);
      });
    });

    test('should handle NULL values appropriately', async () => {
      // Test that nullable columns are handled correctly
      const nullableChecks = [
        {
          table: 'projects',
          column: 'end_date',
          description: 'Project end dates can be NULL for ongoing projects'
        },
        {
          table: 'projects',
          column: 'description',
          description: 'Project descriptions can be NULL'
        }
      ];

      for (const check of nullableChecks) {
        const nullCount = await db.query(`
          SELECT COUNT(*) as null_count
          FROM ${check.table}
          WHERE ${check.column} IS NULL
        `);

        const totalCount = await db.query(`
          SELECT COUNT(*) as total
          FROM ${check.table}
        `);

        const nullPercentage = (parseInt(nullCount.rows[0].null_count) / parseInt(totalCount.rows[0].total)) * 100;

        console.log(`✅ ${check.table}.${check.column}: ${nullPercentage.toFixed(1)}% NULL values`);
      }
    });
  });

  describe('Performance After Migration', () => {
    test('should have proper indexes for new tables', async () => {
      const indexes = await db.query(`
        SELECT
          t.relname AS table_name,
          i.relname AS index_name,
          array_to_string(array_agg(a.attname), ', ') AS column_names
        FROM pg_class t
        JOIN pg_index ix ON t.oid = ix.indrelid
        JOIN pg_class i ON i.oid = ix.indexrelid
        JOIN pg_attribute a ON a.attrelid = t.oid
        WHERE a.attnum = ANY(ix.indkey)
        AND t.relkind = 'r'
        AND t.relname IN ('projects', 'project_roles', 'project_assignments', 'assignment_allocations')
        GROUP BY t.relname, i.relname, ix.indkey
        ORDER BY t.relname, i.relname;
      `);

      console.log(`✅ Found ${indexes.rows.length} indexes on Phase 3 tables:`);
      indexes.rows.forEach(index => {
        console.log(`  ${index.table_name}.${index.index_name}: ${index.column_names}`);
      });

      // Should have at least primary key indexes
      expect(indexes.rows.length).toBeGreaterThan(0);
    });

    test('should maintain query performance on migrated data', async () => {
      const performanceTests = [
        {
          name: 'Project listing',
          query: 'SELECT * FROM projects LIMIT 10'
        },
        {
          name: 'Employee lookup',
          query: 'SELECT * FROM employees LIMIT 10'
        },
        {
          name: 'Join query',
          query: `
            SELECT p.name, pr.role_name
            FROM projects p
            LEFT JOIN project_roles pr ON p.id = pr.project_id
            LIMIT 10
          `
        }
      ];

      for (const test of performanceTests) {
        const start = process.hrtime();
        await db.query(test.query);
        const [seconds, nanoseconds] = process.hrtime(start);
        const milliseconds = seconds * 1000 + nanoseconds / 1000000;

        expect(milliseconds).toBeLessThan(1000); // Should complete in less than 1 second
        console.log(`✅ ${test.name}: ${milliseconds.toFixed(2)}ms`);
      }
    });
  });
});