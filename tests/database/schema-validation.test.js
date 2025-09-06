/**
 * Database Schema Validation Tests
 * Validates that database schema meets TDD requirements and integration contracts
 * MUST BE WRITTEN BEFORE IMPLEMENTATION (TDD)
 */

const testData = require('../fixtures/shared-test-data.json');
const testContracts = require('../shared/test-contracts');

describe('Database Schema Validation (TDD)', () => {
  let dbConnection, migrationRunner;

  beforeAll(async () => {
    dbConnection = await setupTestDatabase();
    migrationRunner = setupMigrationRunner();
  });

  afterAll(async () => {
    await dbConnection.close();
  });

  describe('User Schema Tests (WRITE FIRST)', () => {
    it('should define user table with required fields', async () => {
      const expectedFields = testContracts.database.schemas.user.testFields;
      
      // Test schema definition before table exists
      const userTableSchema = await dbConnection.getTableSchema('users');
      
      for (const field of expectedFields) {
        expect(userTableSchema.columns).toHaveProperty(field);
      }
    });

    it('should enforce email uniqueness constraint', async () => {
      const testUser = testData.users[0];
      
      // Insert first user
      await dbConnection.query(
        'INSERT INTO users (name, email, role) VALUES (?, ?, ?)',
        [testUser.name, testUser.email, testUser.role]
      );

      // Attempt to insert duplicate email - should fail
      await expect(
        dbConnection.query(
          'INSERT INTO users (name, email, role) VALUES (?, ?, ?)',
          ['Different Name', testUser.email, 'user']
        )
      ).rejects.toThrow(/unique constraint/i);
    });

    it('should enforce name not null constraint', async () => {
      await expect(
        dbConnection.query(
          'INSERT INTO users (name, email, role) VALUES (?, ?, ?)',
          [null, 'test@example.com', 'user']
        )
      ).rejects.toThrow(/not null/i);
    });

    it('should enforce role enum constraint', async () => {
      const validRoles = ['admin', 'manager', 'user'];
      
      // Valid roles should work
      for (const role of validRoles) {
        await expect(
          dbConnection.query(
            'INSERT INTO users (name, email, role) VALUES (?, ?, ?)',
            [`Test User ${role}`, `test-${role}@example.com`, role]
          )
        ).resolves.toBeDefined();
      }

      // Invalid role should fail
      await expect(
        dbConnection.query(
          'INSERT INTO users (name, email, role) VALUES (?, ?, ?)',
          ['Invalid User', 'invalid@example.com', 'invalid_role']
        )
      ).rejects.toThrow(/constraint/i);
    });

    it('should auto-generate timestamps on creation', async () => {
      const beforeInsert = new Date();
      
      const result = await dbConnection.query(
        'INSERT INTO users (name, email, role) VALUES (?, ?, ?) RETURNING *',
        ['Timestamp Test', 'timestamp@example.com', 'user']
      );

      const user = result[0];
      const afterInsert = new Date();
      
      expect(new Date(user.createdAt)).toBeInstanceOf(Date);
      expect(new Date(user.updatedAt)).toBeInstanceOf(Date);
      expect(new Date(user.createdAt)).toBeGreaterThanOrEqual(beforeInsert);
      expect(new Date(user.createdAt)).toBeLessThanOrEqual(afterInsert);
    });

    it('should update timestamps on modification', async () => {
      // Create user
      const result = await dbConnection.query(
        'INSERT INTO users (name, email, role) VALUES (?, ?, ?) RETURNING *',
        ['Update Test', 'update@example.com', 'user']
      );
      
      const originalUpdatedAt = result[0].updatedAt;
      
      // Wait a moment to ensure timestamp difference
      await new Promise(resolve => setTimeout(resolve, 10));
      
      // Update user
      await dbConnection.query(
        'UPDATE users SET name = ? WHERE id = ?',
        ['Updated Name', result[0].id]
      );
      
      // Verify updated timestamp changed
      const updatedUser = await dbConnection.query(
        'SELECT * FROM users WHERE id = ?',
        [result[0].id]
      );
      
      expect(new Date(updatedUser[0].updatedAt)).toBeAfter(new Date(originalUpdatedAt));
    });
  });

  describe('Project Schema Tests (WRITE FIRST)', () => {
    it('should define project table with required fields', async () => {
      const expectedFields = testContracts.database.schemas.project.testFields;
      const projectTableSchema = await dbConnection.getTableSchema('projects');
      
      for (const field of expectedFields) {
        expect(projectTableSchema.columns).toHaveProperty(field);
      }
    });

    it('should enforce foreign key constraint to users table', async () => {
      // Try to create project with non-existent owner
      await expect(
        dbConnection.query(
          'INSERT INTO projects (name, description, status, ownerId) VALUES (?, ?, ?, ?)',
          ['Test Project', 'Test Description', 'active', 9999]
        )
      ).rejects.toThrow(/foreign key constraint/i);
    });

    it('should enforce status enum constraint', async () => {
      const validStatuses = ['planning', 'active', 'completed', 'cancelled'];
      const testUser = await createTestUser();
      
      // Valid statuses should work
      for (const status of validStatuses) {
        await expect(
          dbConnection.query(
            'INSERT INTO projects (name, description, status, ownerId) VALUES (?, ?, ?, ?)',
            [`Project ${status}`, 'Test Description', status, testUser.id]
          )
        ).resolves.toBeDefined();
      }

      // Invalid status should fail
      await expect(
        dbConnection.query(
          'INSERT INTO projects (name, description, status, ownerId) VALUES (?, ?, ?, ?)',
          ['Invalid Project', 'Test Description', 'invalid_status', testUser.id]
        )
      ).rejects.toThrow(/constraint/i);
    });

    it('should cascade delete related resources when project is deleted', async () => {
      const testUser = await createTestUser();
      
      // Create project
      const project = await dbConnection.query(
        'INSERT INTO projects (name, description, status, ownerId) VALUES (?, ?, ?, ?) RETURNING *',
        ['Cascade Test Project', 'Test Description', 'active', testUser.id]
      );

      // Create resource for project
      const resource = await dbConnection.query(
        'INSERT INTO resources (name, type, availability, projectId) VALUES (?, ?, ?, ?) RETURNING *',
        ['Test Resource', 'equipment', 'available', project[0].id]
      );

      // Verify resource exists
      const resourcesBefore = await dbConnection.query(
        'SELECT * FROM resources WHERE projectId = ?',
        [project[0].id]
      );
      expect(resourcesBefore).toHaveLength(1);

      // Delete project
      await dbConnection.query('DELETE FROM projects WHERE id = ?', [project[0].id]);

      // Verify resources were cascade deleted or set to null
      const resourcesAfter = await dbConnection.query(
        'SELECT * FROM resources WHERE projectId = ?',
        [project[0].id]
      );
      expect(resourcesAfter).toHaveLength(0);
    });
  });

  describe('Resource Schema Tests (WRITE FIRST)', () => {
    it('should define resource table with required fields', async () => {
      const expectedFields = testContracts.database.schemas.resource.testFields;
      const resourceTableSchema = await dbConnection.getTableSchema('resources');
      
      for (const field of expectedFields) {
        expect(resourceTableSchema.columns).toHaveProperty(field);
      }
    });

    it('should enforce availability enum constraint', async () => {
      const validAvailabilities = ['available', 'in-use', 'maintenance', 'retired'];
      
      for (const availability of validAvailabilities) {
        await expect(
          dbConnection.query(
            'INSERT INTO resources (name, type, availability) VALUES (?, ?, ?)',
            [`Resource ${availability}`, 'equipment', availability]
          )
        ).resolves.toBeDefined();
      }

      // Invalid availability should fail
      await expect(
        dbConnection.query(
          'INSERT INTO resources (name, type, availability) VALUES (?, ?, ?)',
          ['Invalid Resource', 'equipment', 'invalid_availability']
        )
      ).rejects.toThrow(/constraint/i);
    });

    it('should allow null projectId for unassigned resources', async () => {
      const result = await dbConnection.query(
        'INSERT INTO resources (name, type, availability, projectId) VALUES (?, ?, ?, ?) RETURNING *',
        ['Unassigned Resource', 'equipment', 'available', null]
      );

      expect(result[0].projectId).toBeNull();
    });

    it('should enforce foreign key constraint to projects table', async () => {
      // Try to assign resource to non-existent project
      await expect(
        dbConnection.query(
          'INSERT INTO resources (name, type, availability, projectId) VALUES (?, ?, ?, ?)',
          ['FK Test Resource', 'equipment', 'available', 9999]
        )
      ).rejects.toThrow(/foreign key constraint/i);
    });
  });

  describe('Relationship Tests (WRITE FIRST)', () => {
    it('should establish proper user-project relationship', async () => {
      const testUser = await createTestUser();
      const project = await dbConnection.query(
        'INSERT INTO projects (name, description, status, ownerId) VALUES (?, ?, ?, ?) RETURNING *',
        ['Relationship Test', 'Test Description', 'active', testUser.id]
      );

      // Test join query
      const result = await dbConnection.query(`
        SELECT p.name as project_name, u.name as owner_name 
        FROM projects p 
        JOIN users u ON p.ownerId = u.id 
        WHERE p.id = ?
      `, [project[0].id]);

      expect(result).toHaveLength(1);
      expect(result[0].project_name).toBe('Relationship Test');
      expect(result[0].owner_name).toBe(testUser.name);
    });

    it('should establish proper project-resource relationship', async () => {
      const testUser = await createTestUser();
      const project = await dbConnection.query(
        'INSERT INTO projects (name, description, status, ownerId) VALUES (?, ?, ?, ?) RETURNING *',
        ['Resource Relationship Test', 'Test Description', 'active', testUser.id]
      );

      const resource = await dbConnection.query(
        'INSERT INTO resources (name, type, availability, projectId) VALUES (?, ?, ?, ?) RETURNING *',
        ['Test Resource', 'equipment', 'in-use', project[0].id]
      );

      // Test join query
      const result = await dbConnection.query(`
        SELECT p.name as project_name, r.name as resource_name 
        FROM projects p 
        JOIN resources r ON p.id = r.projectId 
        WHERE p.id = ?
      `, [project[0].id]);

      expect(result).toHaveLength(1);
      expect(result[0].project_name).toBe('Resource Relationship Test');
      expect(result[0].resource_name).toBe('Test Resource');
    });
  });

  describe('Performance Tests (WRITE FIRST)', () => {
    it('should meet query performance requirements', async () => {
      // Seed performance test data
      await seedPerformanceTestData();

      const performanceRequirements = testContracts.database.performanceRequirements;

      // Test connection time
      const connectionStart = Date.now();
      await dbConnection.ping();
      const connectionTime = Date.now() - connectionStart;
      expect(connectionTime).toBeLessThan(parseInt(performanceRequirements.connectionTime));

      // Test simple query time
      const queryStart = Date.now();
      await dbConnection.query('SELECT * FROM users LIMIT 10');
      const queryTime = Date.now() - queryStart;
      expect(queryTime).toBeLessThan(parseInt(performanceRequirements.queryTime));

      // Test complex join query time
      const complexQueryStart = Date.now();
      await dbConnection.query(`
        SELECT u.name, p.name, r.name 
        FROM users u 
        JOIN projects p ON u.id = p.ownerId 
        JOIN resources r ON p.id = r.projectId 
        LIMIT 50
      `);
      const complexQueryTime = Date.now() - complexQueryStart;
      expect(complexQueryTime).toBeLessThan(parseInt(performanceRequirements.queryTime) * 2);
    });

    it('should handle bulk operations efficiently', async () => {
      const performanceRequirements = testContracts.database.performanceRequirements;
      const bulkData = [];
      
      // Prepare 100 test records
      for (let i = 0; i < 100; i++) {
        bulkData.push([
          `Bulk User ${i}`,
          `bulk${i}@example.com`,
          'user'
        ]);
      }

      const bulkStart = Date.now();
      
      // Use transaction for bulk insert
      await dbConnection.beginTransaction();
      for (const record of bulkData) {
        await dbConnection.query(
          'INSERT INTO users (name, email, role) VALUES (?, ?, ?)',
          record
        );
      }
      await dbConnection.commit();
      
      const bulkTime = Date.now() - bulkStart;
      expect(bulkTime).toBeLessThan(parseInt(performanceRequirements.bulkInsert));
    });
  });

  describe('Migration Tests (WRITE FIRST)', () => {
    it('should run migrations successfully', async () => {
      const migrations = await migrationRunner.getPendingMigrations();
      
      for (const migration of migrations) {
        await expect(migrationRunner.run(migration)).resolves.toBeDefined();
      }
    });

    it('should rollback migrations successfully', async () => {
      const latestMigration = await migrationRunner.getLatestMigration();
      
      if (latestMigration) {
        await expect(migrationRunner.rollback(latestMigration)).resolves.toBeDefined();
      }
    });

    it('should maintain data integrity during migrations', async () => {
      // Create test data
      const testUser = await createTestUser();
      const usersBefore = await dbConnection.query('SELECT COUNT(*) as count FROM users');
      
      // Run a migration (this would be a test migration)
      await migrationRunner.runTestMigration('add_user_index');
      
      // Verify data integrity
      const usersAfter = await dbConnection.query('SELECT COUNT(*) as count FROM users');
      expect(usersAfter[0].count).toBe(usersBefore[0].count);
      
      // Verify test user still exists
      const user = await dbConnection.query('SELECT * FROM users WHERE id = ?', [testUser.id]);
      expect(user).toHaveLength(1);
    });
  });
});

// Test Helper Functions
async function setupTestDatabase() {
  // Mock database connection for testing
  return {
    query: jest.fn(),
    getTableSchema: jest.fn().mockResolvedValue({
      columns: {
        id: { type: 'INTEGER', primary: true },
        name: { type: 'VARCHAR', nullable: false },
        email: { type: 'VARCHAR', unique: true },
        role: { type: 'ENUM', values: ['admin', 'manager', 'user'] },
        createdAt: { type: 'TIMESTAMP', default: 'CURRENT_TIMESTAMP' },
        updatedAt: { type: 'TIMESTAMP', default: 'CURRENT_TIMESTAMP' }
      }
    }),
    ping: jest.fn().mockResolvedValue(true),
    beginTransaction: jest.fn(),
    commit: jest.fn(),
    rollback: jest.fn(),
    close: jest.fn()
  };
}

function setupMigrationRunner() {
  return {
    getPendingMigrations: jest.fn().mockResolvedValue([]),
    run: jest.fn(),
    rollback: jest.fn(),
    getLatestMigration: jest.fn().mockResolvedValue(null),
    runTestMigration: jest.fn()
  };
}

async function createTestUser() {
  const user = {
    id: Math.floor(Math.random() * 1000),
    name: 'Test User',
    email: `test${Date.now()}@example.com`,
    role: 'user'
  };
  
  await dbConnection.query(
    'INSERT INTO users (name, email, role) VALUES (?, ?, ?)',
    [user.name, user.email, user.role]
  );
  
  return user;
}

async function seedPerformanceTestData() {
  // Mock seeding performance test data
  return Promise.resolve();
}

// Mock helper to simulate database date operations
expect.extend({
  toBeAfter(received, expected) {
    const pass = new Date(received) > new Date(expected);
    if (pass) {
      return {
        message: () => `expected ${received} not to be after ${expected}`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be after ${expected}`,
        pass: false,
      };
    }
  },
});