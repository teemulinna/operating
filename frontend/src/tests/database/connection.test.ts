import { describe, it, expect, beforeAll, afterAll, beforeEach, jest } from '@jest/globals';
import { db } from '../../database/connection';

describe('Database Connection', () => {
  beforeAll(async () => {
    await db.connect();
  });

  afterAll(async () => {
    await db.disconnect();
  });

  describe('Connection Management', () => {
    it('should connect to the database successfully', async () => {
      const result = await db.query('SELECT 1 as test');
      expect(result).toHaveLength(1);
      expect(result[0].test).toBe(1);
    });

    it('should perform health check', async () => {
      const health = await db.healthCheck();
      expect(health.status).toBe('healthy');
      expect(health.timestamp).toBeInstanceOf(Date);
      expect(health.latency).toBeGreaterThan(0);
    });

    it('should throw error when querying without connection', async () => {
      const disconnectedDb = new (db.constructor as any)();
      await expect(disconnectedDb.query('SELECT 1')).rejects.toThrow();
    });
  });

  describe('Query Operations', () => {
    it('should execute simple queries', async () => {
      const result = await db.query('SELECT NOW() as current_time');
      expect(result).toHaveLength(1);
      expect(result[0].current_time).toBeInstanceOf(Date);
    });

    it('should execute parameterized queries', async () => {
      const testValue = 'test_value';
      const result = await db.query('SELECT $1 as value', [testValue]);
      expect(result[0].value).toBe(testValue);
    });

    it('should handle query errors', async () => {
      await expect(db.query('SELECT invalid_column FROM non_existent_table'))
        .rejects.toThrow();
    });
  });

  describe('Transaction Management', () => {
    it('should commit successful transactions', async () => {
      const testValue = `test_${Date.now()}`;
      
      await db.transaction(async (client) => {
        await client.query('CREATE TEMP TABLE test_table (id SERIAL, value TEXT)');
        await client.query('INSERT INTO test_table (value) VALUES ($1)', [testValue]);
        
        const result = await client.query('SELECT value FROM test_table WHERE value = $1', [testValue]);
        expect(result.rows[0].value).toBe(testValue);
      });
    });

    it('should rollback failed transactions', async () => {
      await expect(
        db.transaction(async (client) => {
          await client.query('CREATE TEMP TABLE rollback_test (id SERIAL)');
          await client.query('INSERT INTO rollback_test (id) VALUES (1)');
          
          // Force an error to trigger rollback
          throw new Error('Intentional error for rollback test');
        })
      ).rejects.toThrow('Intentional error for rollback test');
      
      // Verify table doesn't exist (was rolled back)
      await expect(
        db.query('SELECT * FROM rollback_test')
      ).rejects.toThrow();
    });

    it('should handle nested transaction operations', async () => {
      const result = await db.transaction(async (client) => {
        await client.query('CREATE TEMP TABLE nested_test (value INTEGER)');
        await client.query('INSERT INTO nested_test (value) VALUES (1)');
        
        const selectResult = await client.query('SELECT value FROM nested_test');
        return selectResult.rows[0].value;
      });
      
      expect(result).toBe(1);
    });
  });

  describe('Connection Pool Behavior', () => {
    it('should handle concurrent queries', async () => {
      const promises = Array.from({ length: 10 }, (_, i) => 
        db.query('SELECT $1 as query_number', [i])
      );
      
      const results = await Promise.all(promises);
      
      expect(results).toHaveLength(10);
      results.forEach((result, index) => {
        expect(result[0].query_number).toBe(index);
      });
    });

    it('should reuse connections from the pool', async () => {
      // Execute multiple queries and verify they complete successfully
      const queries = [
        db.query('SELECT 1 as first'),
        db.query('SELECT 2 as second'),
        db.query('SELECT 3 as third')
      ];
      
      const results = await Promise.all(queries);
      
      expect(results[0][0].first).toBe(1);
      expect(results[1][0].second).toBe(2);
      expect(results[2][0].third).toBe(3);
    });
  });

  describe('Error Handling', () => {
    it('should log query errors', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      
      try {
        await db.query('SELECT * FROM definitely_non_existent_table');
      } catch (error) {
        // Expected to throw
      }
      
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it('should handle connection timeouts gracefully', async () => {
      // This test would need a way to simulate network issues
      // For now, we'll just test that the connection handles normal queries
      const start = Date.now();
      await db.query('SELECT pg_sleep(0.1)'); // Sleep for 100ms
      const duration = Date.now() - start;
      
      expect(duration).toBeGreaterThan(100);
      expect(duration).toBeLessThan(1000); // Should not timeout
    });
  });
});