/**
 * Availability Patterns Routes
 * Phase 1 Week 2 - Advanced Availability Management
 * RESTful API endpoints for managing availability patterns, exceptions, and holidays
 */

import { Router } from 'express';
import { AvailabilityPatternsController } from '../controllers/availability-patterns.controller';
import { AvailabilityPatternsService } from '../services/availability-patterns.service';
import { Pool } from 'pg';

const createAvailabilityPatternsRouter = (pool: Pool): Router => {
  const router = Router();

  // Create service and controller instances
  const service = new AvailabilityPatternsService(pool);
  const controller = new AvailabilityPatternsController(service);

  // ============================================
  // AVAILABILITY PATTERNS
  // ============================================

  // Get all patterns with filters and pagination
  router.get('/patterns', controller.getPatterns);

  // Get a specific pattern by ID
  router.get('/patterns/:id', controller.getPattern);

  // Create a new availability pattern
  router.post('/patterns', controller.createPattern);

  // Update an existing pattern
  router.put('/patterns/:id', controller.updatePattern);

  // Delete a pattern (soft delete by deactivating)
  router.delete('/patterns/:id', controller.deletePattern);

  // Activate a pattern (deactivate others for same employee)
  router.post('/patterns/:id/activate', controller.activatePattern);

  // ============================================
  // AVAILABILITY EXCEPTIONS
  // ============================================

  // Create an exception for an employee
  router.post('/exceptions', controller.createException);

  // Get exceptions for an employee within a date range
  router.get('/exceptions/employee/:employeeId', controller.getExceptions);

  // Approve an exception
  router.post('/exceptions/:id/approve', controller.approveException);

  // ============================================
  // HOLIDAY CALENDAR
  // ============================================

  // Create a new holiday
  router.post('/holidays', controller.createHoliday);

  // Get holidays within a date range
  router.get('/holidays', controller.getHolidays);

  // ============================================
  // CAPACITY CALCULATIONS
  // ============================================

  // Calculate daily capacity for an employee on a specific date
  router.get('/capacity/daily/:employeeId', controller.calculateDailyCapacity);

  // Get capacity for an employee over a date range
  router.get('/capacity/range/:employeeId', controller.getCapacityRange);

  return router;
};

export default createAvailabilityPatternsRouter;