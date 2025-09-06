import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { DatabaseService } from '../../src/database/database.service';

describe('DatabaseService Singleton Pattern', () => {
  let dbService1: DatabaseService;
  let dbService2: DatabaseService;

  beforeEach(() => {
    // Reset singleton instance before each test
    DatabaseService.resetInstance();
    jest.clearAllMocks();
  });

  afterEach(async () => {
    // Clean up connections after each test
    await DatabaseService.disconnect();
  });

  describe('Singleton Instance Management', () => {
    it('should return the same instance when getInstance is called multiple times', () => {
      const instance1 = DatabaseService.getInstance();
      const instance2 = DatabaseService.getInstance();
      
      expect(instance1).toBe(instance2);
      expect(instance1).toBeInstanceOf(DatabaseService);
    });

    it('should maintain singleton property across different import locations', () => {
      // Simulate importing from different modules
      const instance1 = DatabaseService.getInstance();
      const instance2 = DatabaseService.getInstance();
      
      expect(instance1 === instance2).toBe(true);
    });

    it('should create new instance after reset', () => {
      const instance1 = DatabaseService.getInstance();
      DatabaseService.resetInstance();
      const instance2 = DatabaseService.getInstance();
      
      expect(instance1 === instance2).toBe(false);
    });
  });

  describe('Connection Pool Sharing', () => {
    it('should share the same connection pool across multiple instances', async () => {
      const instance1 = DatabaseService.getInstance();
      const instance2 = DatabaseService.getInstance();
      
      // Mock the Pool constructor to track creation
      const mockPool = {
        connect: jest.fn().mockResolvedValue({ release: jest.fn() }),
        query: jest.fn().mockResolvedValue({ rows: [] }),
        end: jest.fn().mockResolvedValue(undefined)
      };
      
      jest.mock('pg', () => ({
        Pool: jest.fn(() => mockPool)
      }));

      await instance1.connect();
      
      // Both instances should use the same pool
      expect(instance1.getPool()).toBe(instance2.getPool());
      expect(instance1.isConnected()).toBe(true);
      expect(instance2.isConnected()).toBe(true);
    });

    it('should prevent multiple connection attempts', async () => {
      const instance = DatabaseService.getInstance();
      const connectSpy = jest.spyOn(instance as any, 'createPool');
      
      // Call connect multiple times
      await Promise.all([
        instance.connect(),
        instance.connect(),
        instance.connect()
      ]);
      
      // Pool should only be created once
      expect(connectSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('Connection State Management', () => {
    it('should track connection state correctly', async () => {
      const instance = DatabaseService.getInstance();
      
      expect(instance.isConnected()).toBe(false);
      
      await instance.connect();
      expect(instance.isConnected()).toBe(true);
      
      await instance.disconnect();
      expect(instance.isConnected()).toBe(false);
    });

    it('should handle concurrent connection attempts gracefully', async () => {
      const instance = DatabaseService.getInstance();
      
      // Start multiple connection attempts simultaneously
      const connectionPromises = Array(5).fill(null).map(() => instance.connect());
      
      // All should resolve without error
      await expect(Promise.all(connectionPromises)).resolves.not.toThrow();
      
      expect(instance.isConnected()).toBe(true);
    });
  });

  describe('Service Class Integration', () => {
    it('should provide same database instance to all services', () => {
      // Mock service classes that use DatabaseService
      class MockEmployeeService {
        private db = DatabaseService.getInstance();
        getDb() { return this.db; }
      }
      
      class MockDepartmentService {
        private db = DatabaseService.getInstance();
        getDb() { return this.db; }
      }
      
      const employeeService = new MockEmployeeService();
      const departmentService = new MockDepartmentService();
      
      expect(employeeService.getDb()).toBe(departmentService.getDb());
    });
  });

  describe('Connection Health and Recovery', () => {
    it('should validate connection health before queries', async () => {
      const instance = DatabaseService.getInstance();
      
      // Mock a healthy connection
      const mockClient = {
        release: jest.fn(),
        query: jest.fn().mockResolvedValue({ rows: [{ result: 1 }] })
      };
      
      const mockPool = {
        connect: jest.fn().mockResolvedValue(mockClient as any),
        query: jest.fn().mockResolvedValue({ rows: [] } as any),
        end: jest.fn().mockResolvedValue(undefined as any)
      };
      
      jest.spyOn(instance as any, 'createPool').mockReturnValue(mockPool);
      
      await instance.connect();
      const isHealthy = await instance.checkHealth();
      
      expect(isHealthy).toBe(true);
      expect(mockClient.query).toHaveBeenCalledWith('SELECT 1');
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should handle connection health check failures', async () => {
      const instance = DatabaseService.getInstance();
      
      // Mock a failing connection
      const mockPool = {
        connect: jest.fn().mockRejectedValue(new Error('Connection failed') as any),
        end: jest.fn().mockResolvedValue(undefined as any)
      };
      
      jest.spyOn(instance as any, 'createPool').mockReturnValue(mockPool);
      
      await instance.connect();
      const isHealthy = await instance.checkHealth();
      
      expect(isHealthy).toBe(false);
    });
  });

  describe('Error Handling', () => {
    it('should throw meaningful error when querying without connection', async () => {
      const instance = DatabaseService.getInstance();
      
      await expect(instance.query('SELECT 1')).rejects.toThrow('Database not connected');
    });

    it('should handle connection failures gracefully', async () => {
      const instance = DatabaseService.getInstance();
      
      // Mock connection failure
      jest.spyOn(instance as any, 'createPool').mockImplementation(() => {
        throw new Error('Connection configuration error');
      });
      
      await expect(instance.connect()).rejects.toThrow('Connection configuration error');
      expect(instance.isConnected()).toBe(false);
    });
  });

  describe('Cleanup and Resource Management', () => {
    it('should properly clean up resources on disconnect', async () => {
      const instance = DatabaseService.getInstance();
      
      const mockPool = {
        connect: jest.fn().mockResolvedValue({ release: jest.fn() } as any),
        end: jest.fn().mockResolvedValue(undefined as any)
      };
      
      jest.spyOn(instance as any, 'createPool').mockReturnValue(mockPool);
      
      await instance.connect();
      expect(instance.isConnected()).toBe(true);
      
      await instance.disconnect();
      
      expect(mockPool.end).toHaveBeenCalled();
      expect(instance.isConnected()).toBe(false);
    });

    it('should handle multiple disconnect calls safely', async () => {
      const instance = DatabaseService.getInstance();
      
      await instance.connect();
      
      // Multiple disconnect calls should not throw
      await expect(instance.disconnect()).resolves.not.toThrow();
      await expect(instance.disconnect()).resolves.not.toThrow();
    });
  });
});