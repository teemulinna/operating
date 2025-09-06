import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { DatabaseService } from '../../src/database/database.service';
import { DepartmentService } from '../../src/services/department.service';
import { EmployeeService } from '../../src/services/employee.service';
import { SkillService } from '../../src/services/skill.service';

describe('Service Dependency Injection', () => {

  beforeEach(() => {
    // Reset singleton instance before each test
    DatabaseService.resetInstance();
    jest.clearAllMocks();
  });

  afterEach(async () => {
    // Clean up connections after each test
    await DatabaseService.disconnect();
  });

  describe('Database Service Injection', () => {
    it('should inject the same database service instance into all services', () => {
      const departmentService = new DepartmentService();
      const employeeService = new EmployeeService();
      const skillService = new SkillService();

      // All services should get the same database instance
      const dbInstance1 = (departmentService as any).db;
      const dbInstance2 = (employeeService as any).db;
      const dbInstance3 = (skillService as any).db;

      expect(dbInstance1).toBe(dbInstance2);
      expect(dbInstance2).toBe(dbInstance3);
      expect(dbInstance1).toBe(DatabaseService.getInstance());
    });

    it('should maintain singleton across service instantiations', () => {
      const service1 = new DepartmentService();
      const service2 = new DepartmentService();

      const db1 = (service1 as any).db;
      const db2 = (service2 as any).db;

      expect(db1).toBe(db2);
      expect(db1).toBe(DatabaseService.getInstance());
    });
  });

  describe('Service Layer Architecture', () => {
    it('should properly separate concerns between controllers and services', async () => {
      const departmentService = new DepartmentService();
      const dbInstance = (departmentService as any).db;

      // Mock database connection for testing
      const mockPool = {
        connect: jest.fn().mockResolvedValue({ release: jest.fn() } as any),
        query: jest.fn().mockResolvedValue({ rows: [] } as any),
        end: jest.fn().mockResolvedValue(undefined as any)
      };

      jest.spyOn(dbInstance as any, 'createPool').mockReturnValue(mockPool);
      await dbInstance.connect();

      // Service should delegate to database service
      expect(dbInstance.isConnected()).toBe(true);
      expect((departmentService as any).db).toBe(dbInstance);
    });

    it('should handle service instantiation without database connection', () => {
      // Services should be creatable even without database connection
      expect(() => new DepartmentService()).not.toThrow();
      expect(() => new EmployeeService()).not.toThrow();
      expect(() => new SkillService()).not.toThrow();
    });
  });

  describe('Request Lifecycle Management', () => {
    it('should share database connection across all services during a request', async () => {
      const dbInstance = DatabaseService.getInstance();
      
      // Mock a successful connection
      const mockPool = {
        connect: jest.fn().mockResolvedValue({ 
          release: jest.fn(),
          query: jest.fn().mockResolvedValue({ rows: [] })
        } as any),
        query: jest.fn().mockResolvedValue({ rows: [] } as any),
        end: jest.fn().mockResolvedValue(undefined as any)
      };

      jest.spyOn(dbInstance as any, 'createPool').mockReturnValue(mockPool);
      await dbInstance.connect();

      // Create multiple services (simulating a request handler)
      const departmentService = new DepartmentService();
      const employeeService = new EmployeeService();
      const skillService = new SkillService();

      // All services should share the same connected database
      expect((departmentService as any).db.isConnected()).toBe(true);
      expect((employeeService as any).db.isConnected()).toBe(true);
      expect((skillService as any).db.isConnected()).toBe(true);

      // All should be the same instance
      expect((departmentService as any).db).toBe((employeeService as any).db);
      expect((employeeService as any).db).toBe((skillService as any).db);
    });

    it('should handle database service reconnection across all services', async () => {
      const dbInstance = DatabaseService.getInstance();
      
      // Create services first
      const departmentService = new DepartmentService();
      const employeeService = new EmployeeService();

      // Mock initial connection
      const mockPool1 = {
        connect: jest.fn().mockResolvedValue({ release: jest.fn() }),
        query: jest.fn().mockResolvedValue({ rows: [] }),
        end: jest.fn().mockResolvedValue(undefined)
      };

      jest.spyOn(dbInstance as any, 'createPool').mockReturnValueOnce(mockPool1);
      await dbInstance.connect();

      expect(dbInstance.isConnected()).toBe(true);

      // Simulate reconnection
      const mockPool2 = {
        connect: jest.fn().mockResolvedValue({ release: jest.fn() }),
        query: jest.fn().mockResolvedValue({ rows: [] }),
        end: jest.fn().mockResolvedValue(undefined)
      };

      jest.spyOn(dbInstance as any, 'createPool').mockReturnValueOnce(mockPool2);
      await dbInstance.reconnect();

      // All services should still have the same (reconnected) database instance
      expect((departmentService as any).db.isConnected()).toBe(true);
      expect((employeeService as any).db.isConnected()).toBe(true);
      expect((departmentService as any).db).toBe((employeeService as any).db);
    });
  });

  describe('Error Handling in Service Layer', () => {
    it('should propagate database connection errors through service layer', async () => {
      const dbInstance = DatabaseService.getInstance();
      const departmentService = new DepartmentService();

      // Mock connection failure
      jest.spyOn(dbInstance as any, 'createPool').mockImplementation(() => {
        throw new Error('Database connection failed');
      });

      // Service should not fail on instantiation
      expect(() => new DepartmentService()).not.toThrow();

      // But database operations should fail appropriately
      await expect(dbInstance.connect()).rejects.toThrow('Database connection failed');
    });

    it('should handle database query failures gracefully', async () => {
      const dbInstance = DatabaseService.getInstance();
      
      // Mock failed query
      const mockPool = {
        connect: jest.fn().mockResolvedValue({ release: jest.fn() }),
        query: jest.fn().mockRejectedValue(new Error('Query failed')),
        end: jest.fn().mockResolvedValue(undefined)
      };

      jest.spyOn(dbInstance as any, 'createPool').mockReturnValue(mockPool);
      await dbInstance.connect();

      // Query should fail with appropriate error
      await expect(dbInstance.query('SELECT 1')).rejects.toThrow('Query failed');
    });
  });

  describe('Service Configuration and Initialization', () => {
    it('should allow services to be configured without circular dependencies', () => {
      // Test that services can be created independently
      const departmentService = new DepartmentService();
      const employeeService = new EmployeeService();
      
      // Both should use the same database service
      expect((departmentService as any).db).toBe((employeeService as any).db);
      
      // But services themselves should be independent
      expect(departmentService).not.toBe(employeeService);
    });

    it('should support service composition patterns', () => {
      class CompositeService {
        private departmentService: DepartmentService;
        private employeeService: EmployeeService;

        constructor() {
          this.departmentService = new DepartmentService();
          this.employeeService = new EmployeeService();
        }

        getDepartmentService() { return this.departmentService; }
        getEmployeeService() { return this.employeeService; }
      }

      const compositeService = new CompositeService();
      const deptService = compositeService.getDepartmentService();
      const empService = compositeService.getEmployeeService();

      // Both should share the same database instance
      expect((deptService as any).db).toBe((empService as any).db);
    });
  });

  describe('Memory Management', () => {
    it('should not create memory leaks with repeated service instantiation', () => {
      const initialInstance = DatabaseService.getInstance();
      
      // Create many services
      const services: DepartmentService[] = [];
      for (let i = 0; i < 100; i++) {
        services.push(new DepartmentService());
      }

      // All should reference the same database instance
      services.forEach(service => {
        expect((service as any).db).toBe(initialInstance);
      });

      // Only one database instance should exist
      expect(DatabaseService.getInstance()).toBe(initialInstance);
    });

    it('should properly clean up resources on service disposal', async () => {
      const dbInstance = DatabaseService.getInstance();
      
      const mockPool = {
        connect: jest.fn().mockResolvedValue({ release: jest.fn() }),
        end: jest.fn().mockResolvedValue(undefined)
      };

      jest.spyOn(dbInstance as any, 'createPool').mockReturnValue(mockPool);
      await dbInstance.connect();

      // Create and dispose services
      let departmentService: DepartmentService | null = new DepartmentService();
      let employeeService: EmployeeService | null = new EmployeeService();
      
      expect(dbInstance.isConnected()).toBe(true);

      // Simulate garbage collection
      departmentService = null;
      employeeService = null;

      // Database connection should still be managed by singleton
      expect(dbInstance.isConnected()).toBe(true);

      // Clean disconnect should work
      await dbInstance.disconnect();
      expect(mockPool.end).toHaveBeenCalled();
    });
  });
});