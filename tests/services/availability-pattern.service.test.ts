import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { Pool } from 'pg';
import { AvailabilityPatternService } from '../../src/services/availability-pattern.service';
import { CacheService } from '../../src/services/cache.service';
import { WebSocketService } from '../../src/websocket/websocket.service';
import { ApiError } from '../../src/utils/api-error';

// Mock dependencies
jest.mock('pg');
jest.mock('../../src/services/cache.service');
jest.mock('../../src/websocket/websocket.service');
jest.mock('../../src/utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn()
  }
}));

describe('AvailabilityPatternService', () => {
  let service: AvailabilityPatternService;
  let mockPool: any;
  let mockCacheService: any;
  let mockWebSocketService: any;
  let mockClient: any;

  beforeEach(() => {
    // Setup mock client
    mockClient = {
      query: jest.fn(),
      release: jest.fn()
    };

    // Setup mock pool
    mockPool = {
      connect: jest.fn(() => Promise.resolve(mockClient)),
      query: jest.fn(),
      end: jest.fn()
    };

    // Setup mock cache service
    mockCacheService = {
      get: jest.fn(),
      set: jest.fn(),
      delete: jest.fn(),
      clear: jest.fn()
    } as any;

    // Setup mock websocket service
    mockWebSocketService = {
      broadcast: jest.fn()
    } as any;

    // Create service instance
    service = new AvailabilityPatternService(
      mockPool,
      mockCacheService,
      mockWebSocketService
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createPattern', () => {
    const mockPattern: any = {
      employeeId: '123e4567-e89b-12d3-a456-426614174000',
      patternType: 'weekly',
      configuration: {
        weeklyHours: 40,
        dailyHours: 8,
        workDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday']
      },
      effectiveFrom: new Date('2024-01-01'),
      effectiveTo: new Date('2024-12-31'),
      isActive: true,
      notes: 'Standard work week'
    };

    it('should create a new availability pattern successfully', async () => {
      const mockDbResult = {
        rows: [{
          id: '223e4567-e89b-12d3-a456-426614174001',
          employee_id: mockPattern.employeeId,
          pattern_type: mockPattern.patternType,
          pattern_name: 'Custom Pattern',
          pattern_config: mockPattern.configuration,
          effective_from: mockPattern.effectiveFrom,
          effective_until: mockPattern.effectiveTo,
          is_active: mockPattern.isActive,
          notes: mockPattern.notes,
          created_at: new Date(),
          updated_at: new Date()
        }]
      };

      mockClient.query.mockImplementation((query: string) => {
        if (query === 'BEGIN') return Promise.resolve();
        if (query === 'COMMIT') return Promise.resolve();
        if (query.includes('UPDATE availability_patterns')) return Promise.resolve({ rows: [] });
        if (query.includes('INSERT INTO availability_patterns')) return Promise.resolve(mockDbResult);
        if (query.includes('INSERT INTO capacity_history')) return Promise.resolve();
        return Promise.resolve({ rows: [] });
      });

      const result = await service.createPattern(mockPattern);

      expect(result).toBeDefined();
      expect(result.employeeId).toBe(mockPattern.employeeId);
      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
      expect(mockClient.release).toHaveBeenCalled();
      expect(mockWebSocketService.broadcast).toHaveBeenCalledWith(
        'availability:pattern:created',
        expect.any(Object)
      );
    });

    it('should rollback transaction on error', async () => {
      mockClient.query.mockRejectedValue(new Error('Database error'));

      await expect(service.createPattern(mockPattern)).rejects.toThrow();

      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should deactivate existing active patterns when creating new active pattern', async () => {
      const mockDbResult = {
        rows: [{
          id: '223e4567-e89b-12d3-a456-426614174001',
          employee_id: mockPattern.employeeId,
          pattern_type: mockPattern.patternType,
          pattern_name: 'Custom Pattern',
          pattern_config: mockPattern.configuration,
          effective_from: mockPattern.effectiveFrom,
          effective_until: mockPattern.effectiveTo,
          is_active: mockPattern.isActive,
          notes: mockPattern.notes
        }]
      };

      mockClient.query.mockImplementation((query: string) => {
        if (query === 'BEGIN') return Promise.resolve();
        if (query === 'COMMIT') return Promise.resolve();
        if (query.includes('UPDATE availability_patterns')) {
          return Promise.resolve({ rows: [] });
        }
        if (query.includes('INSERT INTO availability_patterns')) {
          return Promise.resolve(mockDbResult);
        }
        return Promise.resolve({ rows: [] });
      });

      await service.createPattern(mockPattern);

      const updateCall = mockClient.query.mock.calls.find(call =>
        call[0].includes('UPDATE availability_patterns')
      );
      expect(updateCall).toBeDefined();
      expect(updateCall[0]).toContain('is_active = false');
      expect(updateCall[1]).toContain(mockPattern.employeeId);
    });
  });

  describe('updatePattern', () => {
    const patternId = '223e4567-e89b-12d3-a456-426614174001';
    const updates = {
      configuration: {
        weeklyHours: 32,
        dailyHours: 6.4
      },
      notes: 'Updated to part-time'
    };

    it('should update a pattern successfully', async () => {
      const mockExisting = {
        rows: [{
          id: patternId,
          employee_id: '123e4567-e89b-12d3-a456-426614174000',
          pattern_type: 'weekly',
          pattern_name: 'Standard work week',
          pattern_config: { weeklyHours: 40 },
          effective_from: new Date('2024-01-01'),
          effective_until: new Date('2024-12-31'),
          is_active: true,
          notes: 'Original notes'
        }]
      };

      const mockUpdated = {
        rows: [{
          id: patternId,
          employee_id: '123e4567-e89b-12d3-a456-426614174000',
          pattern_type: 'weekly',
          pattern_name: 'Standard work week',
          pattern_config: updates.configuration || { weeklyHours: 40 },
          effective_from: new Date('2024-01-01'),
          effective_until: new Date('2024-12-31'),
          is_active: true,
          notes: updates.notes || 'Original notes'
        }]
      };

      mockClient.query.mockImplementation((query: string) => {
        if (query === 'BEGIN') return Promise.resolve();
        if (query === 'COMMIT') return Promise.resolve();
        if (query.includes('SELECT * FROM availability_patterns')) {
          return Promise.resolve(mockExisting);
        }
        if (query.includes('UPDATE availability_patterns')) {
          return Promise.resolve(mockUpdated);
        }
        return Promise.resolve({ rows: [] });
      });

      const result = await service.updatePattern(patternId, updates);

      expect(result).toBeDefined();
      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
      expect(mockWebSocketService.broadcast).toHaveBeenCalledWith(
        'availability:pattern:updated',
        expect.any(Object)
      );
    });

    it('should throw error if pattern not found', async () => {
      mockClient.query.mockImplementation((query: string) => {
        if (query === 'BEGIN') return Promise.resolve();
        if (query === 'ROLLBACK') return Promise.resolve();
        if (query.includes('SELECT * FROM availability_patterns')) {
          return Promise.resolve({ rows: [] });
        }
        return Promise.resolve({ rows: [] });
      });

      await expect(service.updatePattern(patternId, updates))
        .rejects.toThrow(ApiError);
    });
  });

  describe('getPatternById', () => {
    const patternId = '223e4567-e89b-12d3-a456-426614174001';

    it('should retrieve a pattern by ID', async () => {
      const mockPattern = {
        id: patternId,
        employee_id: '123e4567-e89b-12d3-a456-426614174000',
        pattern_type: 'weekly',
        configuration: { weeklyHours: 40 },
        effective_from: new Date('2024-01-01'),
        effective_to: new Date('2024-12-31'),
        is_active: true,
        notes: 'Test pattern'
      };

      mockPool.query.mockResolvedValue({ rows: [mockPattern], rowCount: 1 } as any);

      const result = await service.getPatternById(patternId);

      expect(result).toBeDefined();
      expect(result?.id).toBe(patternId);
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT * FROM availability_patterns'),
        [patternId]
      );
    });

    it('should return null if pattern not found', async () => {
      mockPool.query.mockResolvedValue({ rows: [], rowCount: 0 } as any);

      const result = await service.getPatternById(patternId);

      expect(result).toBeNull();
    });
  });

  describe('deletePattern', () => {
    const patternId = '223e4567-e89b-12d3-a456-426614174001';
    const employeeId = '123e4567-e89b-12d3-a456-426614174000';

    it('should delete a pattern successfully', async () => {
      mockClient.query.mockImplementation((query: string) => {
        if (query === 'BEGIN') return Promise.resolve();
        if (query === 'COMMIT') return Promise.resolve();
        if (query.includes('SELECT employee_id')) {
          return Promise.resolve({ rows: [{ employee_id: employeeId }] });
        }
        if (query.includes('DELETE FROM availability_patterns')) {
          return Promise.resolve({ rowCount: 1 });
        }
        return Promise.resolve({ rows: [] });
      });

      await service.deletePattern(patternId);

      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
      expect(mockWebSocketService.broadcast).toHaveBeenCalledWith(
        'availability:pattern:deleted',
        { employeeId, patternId }
      );
    });

    it('should throw error if pattern not found', async () => {
      mockClient.query.mockImplementation((query: string) => {
        if (query === 'BEGIN') return Promise.resolve();
        if (query === 'ROLLBACK') return Promise.resolve();
        if (query.includes('SELECT employee_id')) {
          return Promise.resolve({ rows: [] });
        }
        return Promise.resolve({ rows: [] });
      });

      await expect(service.deletePattern(patternId))
        .rejects.toThrow(ApiError);

      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
    });
  });

  describe('createException', () => {
    const mockException: any = {
      employeeId: '123e4567-e89b-12d3-a456-426614174000',
      exceptionDate: new Date('2024-07-04'),
      exceptionType: 'holiday',
      hoursAvailable: 0,
      reason: 'Independence Day',
      isApproved: true
    };

    it('should create an exception successfully', async () => {
      const mockDbResult = {
        rows: [{
          id: '323e4567-e89b-12d3-a456-426614174002',
          employee_id: mockException.employeeId,
          exception_date: mockException.exceptionDate,
          end_date: mockException.exceptionDate,
          exception_type: mockException.exceptionType,
          hours_affected: mockException.hoursAvailable,
          reason: mockException.reason,
          status: mockException.isApproved ? 'approved' : 'pending',
          approved_by: null,
          approved_at: null,
          created_at: new Date()
        }]
      };

      mockClient.query.mockImplementation((query: string) => {
        if (query === 'BEGIN') return Promise.resolve();
        if (query === 'COMMIT') return Promise.resolve();
        if (query.includes('INSERT INTO availability_exceptions')) {
          return Promise.resolve(mockDbResult);
        }
        return Promise.resolve({ rows: [] });
      });

      const result = await service.createException(mockException);

      expect(result).toBeDefined();
      expect(result.employeeId).toBe(mockException.employeeId);
      expect(mockWebSocketService.broadcast).toHaveBeenCalledWith(
        'availability:exception:created',
        expect.any(Object)
      );
    });
  });

  describe('getExceptions', () => {
    it('should retrieve exceptions with filters', async () => {
      const employeeId = '123e4567-e89b-12d3-a456-426614174000';
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-12-31');

      const mockExceptions = [{
        id: '323e4567-e89b-12d3-a456-426614174002',
        employee_id: employeeId,
        exception_date: new Date('2024-07-04'),
        exception_type: 'holiday',
        hours_available: 0,
        reason: 'Independence Day',
        is_approved: true
      }];

      mockPool.query.mockResolvedValue({ rows: mockExceptions, rowCount: 1 } as any);

      const result = await service.getExceptions(employeeId, startDate, endDate);

      expect(result).toBeDefined();
      expect(result).toHaveLength(1);
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT * FROM availability_exceptions'),
        expect.arrayContaining([employeeId, startDate, endDate])
      );
    });

    it('should retrieve all exceptions without filters', async () => {
      const mockExceptions = [{
        id: '323e4567-e89b-12d3-a456-426614174002',
        employee_id: '123e4567-e89b-12d3-a456-426614174000',
        exception_date: new Date('2024-07-04'),
        exception_type: 'holiday',
        hours_available: 0
      }];

      mockPool.query.mockResolvedValue({ rows: mockExceptions, rowCount: 1 } as any);

      const result = await service.getExceptions();

      expect(result).toBeDefined();
      expect(result).toHaveLength(1);
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT * FROM availability_exceptions'),
        []
      );
    });
  });

  describe('getEffectiveAvailability', () => {
    const employeeId = '123e4567-e89b-12d3-a456-426614174000';
    const date = new Date('2024-07-03');

    it('should calculate effective availability correctly', async () => {
      // Mock active pattern
      mockPool.query.mockImplementation((query: string) => {
        if (query.includes('availability_patterns')) {
          return Promise.resolve({
            rows: [{
              id: '223e4567-e89b-12d3-a456-426614174001',
              configuration: {
                weeklyHours: 40,
                dailyHours: 8,
                workDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday']
              }
            }]
          });
        }
        if (query.includes('availability_exceptions')) {
          return Promise.resolve({ rows: [] });
        }
        if (query.includes('holidays')) {
          return Promise.resolve({ rows: [] });
        }
        return Promise.resolve({ rows: [] });
      });

      const result = await service.getEffectiveAvailability(employeeId, date);

      expect(result).toBeDefined();
      expect(result.employeeId).toBe(employeeId);
      expect(result.baseHours).toBe(8); // Thursday is a workday
      expect(result.adjustedHours).toBe(8); // No exceptions or holidays
    });

    it('should handle holidays correctly', async () => {
      const holidayDate = new Date('2024-07-04');

      mockPool.query.mockImplementation((query: string) => {
        if (query.includes('availability_patterns')) {
          return Promise.resolve({
            rows: [{
              configuration: { dailyHours: 8, workDays: ['thursday'] }
            }]
          });
        }
        if (query.includes('holidays')) {
          return Promise.resolve({
            rows: [{
              holiday_date: holidayDate,
              name: 'Independence Day'
            }]
          });
        }
        if (query.includes('availability_exceptions')) {
          return Promise.resolve({ rows: [] });
        }
        return Promise.resolve({ rows: [] });
      });

      const result = await service.getEffectiveAvailability(employeeId, holidayDate);

      expect(result.isHoliday).toBe(true);
      expect(result.adjustedHours).toBe(0);
    });
  });
});