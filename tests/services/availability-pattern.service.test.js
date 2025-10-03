"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const availability_pattern_service_1 = require("../../src/services/availability-pattern.service");
const api_error_1 = require("../../src/utils/api-error");
globals_1.jest.mock('pg');
globals_1.jest.mock('../../src/services/cache.service');
globals_1.jest.mock('../../src/websocket/websocket.service');
globals_1.jest.mock('../../src/utils/logger', () => ({
    logger: {
        info: globals_1.jest.fn(),
        error: globals_1.jest.fn(),
        warn: globals_1.jest.fn(),
        debug: globals_1.jest.fn()
    }
}));
(0, globals_1.describe)('AvailabilityPatternService', () => {
    let service;
    let mockPool;
    let mockCacheService;
    let mockWebSocketService;
    let mockClient;
    (0, globals_1.beforeEach)(() => {
        mockClient = {
            query: globals_1.jest.fn(),
            release: globals_1.jest.fn()
        };
        mockPool = {
            connect: globals_1.jest.fn(() => Promise.resolve(mockClient)),
            query: globals_1.jest.fn(),
            end: globals_1.jest.fn()
        };
        mockCacheService = {
            get: globals_1.jest.fn(),
            set: globals_1.jest.fn(),
            delete: globals_1.jest.fn(),
            clear: globals_1.jest.fn()
        };
        mockWebSocketService = {
            broadcast: globals_1.jest.fn()
        };
        service = new availability_pattern_service_1.AvailabilityPatternService(mockPool, mockCacheService, mockWebSocketService);
    });
    (0, globals_1.afterEach)(() => {
        globals_1.jest.clearAllMocks();
    });
    (0, globals_1.describe)('createPattern', () => {
        const mockPattern = {
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
        (0, globals_1.it)('should create a new availability pattern successfully', async () => {
            const mockResult = {
                rows: [{
                        id: '223e4567-e89b-12d3-a456-426614174001',
                        ...mockPattern,
                        created_at: new Date(),
                        updated_at: new Date()
                    }]
            };
            mockClient.query.mockImplementation((query) => {
                if (query === 'BEGIN')
                    return Promise.resolve();
                if (query === 'COMMIT')
                    return Promise.resolve();
                if (query.includes('UPDATE availability_patterns'))
                    return Promise.resolve({ rows: [] });
                if (query.includes('INSERT INTO availability_patterns'))
                    return Promise.resolve(mockResult);
                if (query.includes('INSERT INTO capacity_history'))
                    return Promise.resolve();
                return Promise.resolve({ rows: [] });
            });
            const result = await service.createPattern(mockPattern);
            (0, globals_1.expect)(result).toBeDefined();
            (0, globals_1.expect)(result.employeeId).toBe(mockPattern.employeeId);
            (0, globals_1.expect)(mockClient.query).toHaveBeenCalledWith('BEGIN');
            (0, globals_1.expect)(mockClient.query).toHaveBeenCalledWith('COMMIT');
            (0, globals_1.expect)(mockClient.release).toHaveBeenCalled();
            (0, globals_1.expect)(mockWebSocketService.broadcast).toHaveBeenCalledWith('availability:pattern:created', globals_1.expect.any(Object));
        });
        (0, globals_1.it)('should rollback transaction on error', async () => {
            mockClient.query.mockRejectedValue(new Error('Database error'));
            await (0, globals_1.expect)(service.createPattern(mockPattern)).rejects.toThrow();
            (0, globals_1.expect)(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
            (0, globals_1.expect)(mockClient.release).toHaveBeenCalled();
        });
        (0, globals_1.it)('should deactivate existing active patterns when creating new active pattern', async () => {
            const mockResult = {
                rows: [{
                        id: '223e4567-e89b-12d3-a456-426614174001',
                        ...mockPattern
                    }]
            };
            mockClient.query.mockImplementation((query) => {
                if (query === 'BEGIN')
                    return Promise.resolve();
                if (query === 'COMMIT')
                    return Promise.resolve();
                if (query.includes('UPDATE availability_patterns')) {
                    return Promise.resolve({ rows: [] });
                }
                if (query.includes('INSERT INTO availability_patterns')) {
                    return Promise.resolve(mockResult);
                }
                return Promise.resolve({ rows: [] });
            });
            await service.createPattern(mockPattern);
            const updateCall = mockClient.query.mock.calls.find(call => call[0].includes('UPDATE availability_patterns'));
            (0, globals_1.expect)(updateCall).toBeDefined();
            (0, globals_1.expect)(updateCall[0]).toContain('is_active = false');
            (0, globals_1.expect)(updateCall[1]).toContain(mockPattern.employeeId);
        });
    });
    (0, globals_1.describe)('updatePattern', () => {
        const patternId = '223e4567-e89b-12d3-a456-426614174001';
        const updates = {
            configuration: {
                weeklyHours: 32,
                dailyHours: 6.4
            },
            notes: 'Updated to part-time'
        };
        (0, globals_1.it)('should update a pattern successfully', async () => {
            const mockResult = {
                rows: [{
                        id: patternId,
                        employee_id: '123e4567-e89b-12d3-a456-426614174000',
                        ...updates,
                        effective_from: new Date('2024-01-01'),
                        effective_to: new Date('2024-12-31')
                    }]
            };
            mockClient.query.mockImplementation((query) => {
                if (query === 'BEGIN')
                    return Promise.resolve();
                if (query === 'COMMIT')
                    return Promise.resolve();
                if (query.includes('UPDATE availability_patterns')) {
                    return Promise.resolve(mockResult);
                }
                return Promise.resolve({ rows: [] });
            });
            const result = await service.updatePattern(patternId, updates);
            (0, globals_1.expect)(result).toBeDefined();
            (0, globals_1.expect)(mockClient.query).toHaveBeenCalledWith('BEGIN');
            (0, globals_1.expect)(mockClient.query).toHaveBeenCalledWith('COMMIT');
            (0, globals_1.expect)(mockWebSocketService.broadcast).toHaveBeenCalledWith('availability:pattern:updated', globals_1.expect.any(Object));
        });
        (0, globals_1.it)('should throw error if pattern not found', async () => {
            mockClient.query.mockImplementation((query) => {
                if (query === 'BEGIN')
                    return Promise.resolve();
                if (query === 'ROLLBACK')
                    return Promise.resolve();
                if (query.includes('SELECT')) {
                    return Promise.resolve({ rows: [] });
                }
                return Promise.resolve({ rows: [] });
            });
            await (0, globals_1.expect)(service.updatePattern(patternId, updates))
                .rejects.toThrow(api_error_1.ApiError);
        });
    });
    (0, globals_1.describe)('getPatternById', () => {
        const patternId = '223e4567-e89b-12d3-a456-426614174001';
        (0, globals_1.it)('should retrieve a pattern by ID', async () => {
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
            mockPool.query.mockResolvedValue({ rows: [mockPattern], rowCount: 1 });
            const result = await service.getPatternById(patternId);
            (0, globals_1.expect)(result).toBeDefined();
            (0, globals_1.expect)(result?.id).toBe(patternId);
            (0, globals_1.expect)(mockPool.query).toHaveBeenCalledWith(globals_1.expect.stringContaining('SELECT * FROM availability_patterns'), [patternId]);
        });
        (0, globals_1.it)('should return null if pattern not found', async () => {
            mockPool.query.mockResolvedValue({ rows: [], rowCount: 0 });
            const result = await service.getPatternById(patternId);
            (0, globals_1.expect)(result).toBeNull();
        });
    });
    (0, globals_1.describe)('deletePattern', () => {
        const patternId = '223e4567-e89b-12d3-a456-426614174001';
        const employeeId = '123e4567-e89b-12d3-a456-426614174000';
        (0, globals_1.it)('should delete a pattern successfully', async () => {
            mockClient.query.mockImplementation((query) => {
                if (query === 'BEGIN')
                    return Promise.resolve();
                if (query === 'COMMIT')
                    return Promise.resolve();
                if (query.includes('SELECT employee_id')) {
                    return Promise.resolve({ rows: [{ employee_id: employeeId }] });
                }
                if (query.includes('DELETE FROM availability_patterns')) {
                    return Promise.resolve({ rowCount: 1 });
                }
                return Promise.resolve({ rows: [] });
            });
            await service.deletePattern(patternId);
            (0, globals_1.expect)(mockClient.query).toHaveBeenCalledWith('BEGIN');
            (0, globals_1.expect)(mockClient.query).toHaveBeenCalledWith('COMMIT');
            (0, globals_1.expect)(mockWebSocketService.broadcast).toHaveBeenCalledWith('availability:pattern:deleted', { employeeId, patternId });
        });
        (0, globals_1.it)('should throw error if pattern not found', async () => {
            mockClient.query.mockImplementation((query) => {
                if (query === 'BEGIN')
                    return Promise.resolve();
                if (query === 'ROLLBACK')
                    return Promise.resolve();
                if (query.includes('SELECT employee_id')) {
                    return Promise.resolve({ rows: [] });
                }
                return Promise.resolve({ rows: [] });
            });
            await (0, globals_1.expect)(service.deletePattern(patternId))
                .rejects.toThrow(api_error_1.ApiError);
            (0, globals_1.expect)(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
        });
    });
    (0, globals_1.describe)('createException', () => {
        const mockException = {
            employeeId: '123e4567-e89b-12d3-a456-426614174000',
            exceptionDate: new Date('2024-07-04'),
            exceptionType: 'holiday',
            hoursAvailable: 0,
            reason: 'Independence Day',
            isApproved: true
        };
        (0, globals_1.it)('should create an exception successfully', async () => {
            const mockResult = {
                rows: [{
                        id: '323e4567-e89b-12d3-a456-426614174002',
                        ...mockException,
                        created_at: new Date()
                    }]
            };
            mockClient.query.mockImplementation((query) => {
                if (query === 'BEGIN')
                    return Promise.resolve();
                if (query === 'COMMIT')
                    return Promise.resolve();
                if (query.includes('INSERT INTO availability_exceptions')) {
                    return Promise.resolve(mockResult);
                }
                return Promise.resolve({ rows: [] });
            });
            const result = await service.createException(mockException);
            (0, globals_1.expect)(result).toBeDefined();
            (0, globals_1.expect)(result.employeeId).toBe(mockException.employeeId);
            (0, globals_1.expect)(mockWebSocketService.broadcast).toHaveBeenCalledWith('availability:exception:created', globals_1.expect.any(Object));
        });
    });
    (0, globals_1.describe)('getExceptions', () => {
        (0, globals_1.it)('should retrieve exceptions with filters', async () => {
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
            mockPool.query.mockResolvedValue({ rows: mockExceptions, rowCount: 1 });
            const result = await service.getExceptions(employeeId, startDate, endDate);
            (0, globals_1.expect)(result).toBeDefined();
            (0, globals_1.expect)(result).toHaveLength(1);
            (0, globals_1.expect)(mockPool.query).toHaveBeenCalledWith(globals_1.expect.stringContaining('SELECT * FROM availability_exceptions'), globals_1.expect.arrayContaining([employeeId, startDate, endDate]));
        });
        (0, globals_1.it)('should retrieve all exceptions without filters', async () => {
            const mockExceptions = [{
                    id: '323e4567-e89b-12d3-a456-426614174002',
                    employee_id: '123e4567-e89b-12d3-a456-426614174000',
                    exception_date: new Date('2024-07-04'),
                    exception_type: 'holiday',
                    hours_available: 0
                }];
            mockPool.query.mockResolvedValue({ rows: mockExceptions, rowCount: 1 });
            const result = await service.getExceptions();
            (0, globals_1.expect)(result).toBeDefined();
            (0, globals_1.expect)(result).toHaveLength(1);
            (0, globals_1.expect)(mockPool.query).toHaveBeenCalledWith(globals_1.expect.stringContaining('SELECT * FROM availability_exceptions'), []);
        });
    });
    (0, globals_1.describe)('getEffectiveAvailability', () => {
        const employeeId = '123e4567-e89b-12d3-a456-426614174000';
        const date = new Date('2024-07-03');
        (0, globals_1.it)('should calculate effective availability correctly', async () => {
            mockPool.query.mockImplementation((query) => {
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
            (0, globals_1.expect)(result).toBeDefined();
            (0, globals_1.expect)(result.employeeId).toBe(employeeId);
            (0, globals_1.expect)(result.baseHours).toBe(8);
            (0, globals_1.expect)(result.adjustedHours).toBe(8);
        });
        (0, globals_1.it)('should handle holidays correctly', async () => {
            const holidayDate = new Date('2024-07-04');
            mockPool.query.mockImplementation((query) => {
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
            (0, globals_1.expect)(result.isHoliday).toBe(true);
            (0, globals_1.expect)(result.adjustedHours).toBe(0);
        });
    });
});
//# sourceMappingURL=availability-pattern.service.test.js.map