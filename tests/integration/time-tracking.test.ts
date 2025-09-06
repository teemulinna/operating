/**
 * Time Tracking Integration Tests
 * Tests for tracking planned vs actual hours and variance reporting
 * 
 * Test Coverage:
 * - Track planned vs actual hours per assignment
 * - Log time entries against project assignments
 * - Calculate variance reports and efficiency metrics
 * - Database: time_entries table operations
 * - API: POST /api/time-entries, GET /api/projects/:id/time-variance
 */

import { describe, test, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import { DatabaseService } from '../../src/database/database.service';
import { TimeTrackingService } from '../../src/services/time-tracking.service';
import { ApiError } from '../../src/utils/api-error';

describe('Time Tracking Integration Tests', () => {
  let db: DatabaseService;
  let service: TimeTrackingService;
  let testProjectIds: number[] = [];
  let testEmployeeIds: number[] = [];
  let testRoleIds: number[] = [];
  let testAssignmentIds: number[] = [];

  beforeAll(async () => {
    db = DatabaseService.getInstance();
    service = new TimeTrackingService();
    
    await db.testConnection();
  });

  afterAll(async () => {
    await cleanupTestData();
  });

  beforeEach(async () => {
    await setupTestData();
  });

  afterEach(async () => {
    await cleanupTestData();
  });

  async function setupTestData() {
    // Create test projects
    const project1 = await db.query(`
      INSERT INTO projects (name, description, start_date, end_date, status, estimated_hours, hourly_rate) 
      VALUES ('E-commerce Platform', 'Build online store', '2024-01-01', '2024-06-30', 'active', 1000, 85.00)
      RETURNING id
    `);
    const project2 = await db.query(`
      INSERT INTO projects (name, description, start_date, end_date, status, estimated_hours, hourly_rate) 
      VALUES ('Mobile App', 'React Native app', '2024-03-01', '2024-09-30', 'active', 800, 75.00)
      RETURNING id
    `);
    
    testProjectIds = [project1.rows[0].id, project2.rows[0].id];

    // Create test employees
    const employee1 = await db.query(`
      INSERT INTO employees (first_name, last_name, email, position, department_id, hourly_rate, is_active) 
      VALUES ('John', 'Doe', 'john.doe@test.com', 'Senior Developer', 1, 90.00, true)
      RETURNING id
    `);
    const employee2 = await db.query(`
      INSERT INTO employees (first_name, last_name, email, position, department_id, hourly_rate, is_active) 
      VALUES ('Jane', 'Smith', 'jane.smith@test.com', 'Frontend Developer', 1, 75.00, true)
      RETURNING id
    `);
    const employee3 = await db.query(`
      INSERT INTO employees (first_name, last_name, email, position, department_id, hourly_rate, is_active) 
      VALUES ('Bob', 'Wilson', 'bob.wilson@test.com', 'Designer', 1, 65.00, true)
      RETURNING id
    `);
    
    testEmployeeIds = [employee1.rows[0].id, employee2.rows[0].id, employee3.rows[0].id];

    // Create project roles
    const role1 = await db.query(`
      INSERT INTO project_roles (
        project_id, role_name, description, start_date, end_date,
        planned_allocation_percentage, estimated_hours, hourly_rate, max_assignments
      )
      VALUES ($1, 'Lead Developer', 'Technical leadership', '2024-01-01', '2024-06-30', 80, 400, 90.00, 1)
      RETURNING id
    `, [testProjectIds[0]]);

    const role2 = await db.query(`
      INSERT INTO project_roles (
        project_id, role_name, description, start_date, end_date,
        planned_allocation_percentage, estimated_hours, hourly_rate, max_assignments
      )
      VALUES ($1, 'Frontend Developer', 'UI development', '2024-01-01', '2024-06-30', 60, 300, 75.00, 2)
      RETURNING id
    `, [testProjectIds[0]]);

    const role3 = await db.query(`
      INSERT INTO project_roles (
        project_id, role_name, description, start_date, end_date,
        planned_allocation_percentage, estimated_hours, hourly_rate, max_assignments
      )
      VALUES ($1, 'Mobile Developer', 'React Native development', '2024-03-01', '2024-09-30', 70, 350, 80.00, 1)
      RETURNING id
    `, [testProjectIds[1]]);

    testRoleIds = [role1.rows[0].id, role2.rows[0].id, role3.rows[0].id];

    // Create resource assignments
    const assignment1 = await db.query(`
      INSERT INTO resource_assignments (
        employee_id, project_id, role_id, assignment_type, start_date, end_date,
        planned_allocation_percentage, planned_hours_per_week, hourly_rate, status
      ) VALUES ($1, $2, $3, 'employee', '2024-01-01', '2024-06-30', 80, 32, 90.00, 'active')
      RETURNING id
    `, [testEmployeeIds[0], testProjectIds[0], testRoleIds[0]]);

    const assignment2 = await db.query(`
      INSERT INTO resource_assignments (
        employee_id, project_id, role_id, assignment_type, start_date, end_date,
        planned_allocation_percentage, planned_hours_per_week, hourly_rate, status
      ) VALUES ($1, $2, $3, 'employee', '2024-01-15', '2024-06-15', 60, 24, 75.00, 'active')
      RETURNING id
    `, [testEmployeeIds[1], testProjectIds[0], testRoleIds[1]]);

    const assignment3 = await db.query(`
      INSERT INTO resource_assignments (
        employee_id, project_id, role_id, assignment_type, start_date, end_date,
        planned_allocation_percentage, planned_hours_per_week, hourly_rate, status
      ) VALUES ($1, $2, $3, 'employee', '2024-03-01', '2024-09-30', 70, 28, 80.00, 'active')
      RETURNING id
    `, [testEmployeeIds[0], testProjectIds[1], testRoleIds[2]]);

    testAssignmentIds = [assignment1.rows[0].id, assignment2.rows[0].id, assignment3.rows[0].id];
  }

  async function cleanupTestData() {
    // Clean up in reverse order of dependencies
    await db.query('DELETE FROM time_entries WHERE assignment_id = ANY($1)', [testAssignmentIds]);
    await db.query('DELETE FROM resource_assignments WHERE id = ANY($1)', [testAssignmentIds]);
    if (testProjectIds.length > 0) {
      await db.query('DELETE FROM project_roles WHERE project_id = ANY($1)', [testProjectIds]);
      await db.query('DELETE FROM projects WHERE id = ANY($1)', [testProjectIds]);
    }
    if (testEmployeeIds.length > 0) {
      await db.query('DELETE FROM employees WHERE id = ANY($1)', [testEmployeeIds]);
    }
    testProjectIds = [];
    testEmployeeIds = [];
    testRoleIds = [];
    testAssignmentIds = [];
  }

  describe('Time Entry Creation and Management', () => {
    test('should create time entry with all required fields', async () => {
      const timeEntryData = {
        assignmentId: testAssignmentIds[0],
        employeeId: testEmployeeIds[0],
        projectId: testProjectIds[0],
        date: '2024-02-15',
        hoursWorked: 8.5,
        description: 'Implemented user authentication module',
        taskCategory: 'development',
        billableHours: 8.0,
        isApproved: false
      };

      const entry = await service.createTimeEntry(timeEntryData);

      expect(entry).toBeDefined();
      expect(entry.assignmentId).toBe(testAssignmentIds[0]);
      expect(entry.hoursWorked).toBe(8.5);
      expect(entry.billableHours).toBe(8.0);
      expect(entry.description).toBe('Implemented user authentication module');
      expect(entry.isApproved).toBe(false);
      expect(entry.createdAt).toBeDefined();
    });

    test('should validate time entry data', async () => {
      const invalidEntry = {
        assignmentId: testAssignmentIds[0],
        employeeId: testEmployeeIds[0],
        projectId: testProjectIds[0],
        date: '2024-02-15',
        hoursWorked: -2, // Invalid negative hours
        description: 'Invalid entry'
      };

      await expect(service.createTimeEntry(invalidEntry))
        .rejects.toThrow('Hours worked must be positive');
    });

    test('should prevent duplicate entries for same date and assignment', async () => {
      const timeEntryData = {
        assignmentId: testAssignmentIds[0],
        employeeId: testEmployeeIds[0],
        projectId: testProjectIds[0],
        date: '2024-02-15',
        hoursWorked: 8.0,
        description: 'First entry'
      };

      await service.createTimeEntry(timeEntryData);

      // Attempt duplicate entry
      const duplicateEntry = {
        ...timeEntryData,
        description: 'Duplicate entry',
        hoursWorked: 6.0
      };

      await expect(service.createTimeEntry(duplicateEntry))
        .rejects.toThrow('Time entry already exists for this date and assignment');
    });

    test('should update existing time entry', async () => {
      const initialEntry = {
        assignmentId: testAssignmentIds[0],
        employeeId: testEmployeeIds[0],
        projectId: testProjectIds[0],
        date: '2024-02-15',
        hoursWorked: 6.0,
        description: 'Initial work',
        billableHours: 6.0
      };

      const entry = await service.createTimeEntry(initialEntry);

      const updateData = {
        hoursWorked: 8.5,
        description: 'Updated work description',
        billableHours: 7.5
      };

      const updated = await service.updateTimeEntry(entry.id, updateData);

      expect(updated.hoursWorked).toBe(8.5);
      expect(updated.description).toBe('Updated work description');
      expect(updated.billableHours).toBe(7.5);
      expect(updated.updatedAt).toBeDefined();
    });
  });

  describe('Time Entry Retrieval and Filtering', () => {
    beforeEach(async () => {
      // Create sample time entries
      const entries = [
        {
          assignmentId: testAssignmentIds[0],
          employeeId: testEmployeeIds[0],
          projectId: testProjectIds[0],
          date: '2024-02-01',
          hoursWorked: 8.0,
          description: 'Backend API development',
          taskCategory: 'development',
          billableHours: 8.0
        },
        {
          assignmentId: testAssignmentIds[0],
          employeeId: testEmployeeIds[0],
          projectId: testProjectIds[0],
          date: '2024-02-02',
          hoursWorked: 7.5,
          description: 'Code review and testing',
          taskCategory: 'review',
          billableHours: 7.0
        },
        {
          assignmentId: testAssignmentIds[1],
          employeeId: testEmployeeIds[1],
          projectId: testProjectIds[0],
          date: '2024-02-01',
          hoursWorked: 6.0,
          description: 'UI component development',
          taskCategory: 'development',
          billableHours: 6.0
        }
      ];

      for (const entry of entries) {
        await service.createTimeEntry(entry);
      }
    });

    test('should retrieve time entries by employee', async () => {
      const entries = await service.getTimeEntriesByEmployee(
        testEmployeeIds[0],
        { startDate: '2024-02-01', endDate: '2024-02-28' }
      );

      expect(entries.length).toBe(2);
      expect(entries.every(e => e.employeeId === testEmployeeIds[0])).toBe(true);
    });

    test('should retrieve time entries by project', async () => {
      const entries = await service.getTimeEntriesByProject(
        testProjectIds[0],
        { startDate: '2024-02-01', endDate: '2024-02-28' }
      );

      expect(entries.length).toBe(3);
      expect(entries.every(e => e.projectId === testProjectIds[0])).toBe(true);
    });

    test('should filter time entries by task category', async () => {
      const developmentEntries = await service.getTimeEntries({
        projectId: testProjectIds[0],
        taskCategory: 'development',
        startDate: '2024-02-01',
        endDate: '2024-02-28'
      });

      expect(developmentEntries.length).toBe(2);
      expect(developmentEntries.every(e => e.taskCategory === 'development')).toBe(true);
    });

    test('should filter time entries by approval status', async () => {
      // Approve one entry
      const entries = await service.getTimeEntriesByProject(testProjectIds[0]);
      await service.approveTimeEntry(entries[0].id, { approvedBy: 'manager' });

      const approvedEntries = await service.getTimeEntries({
        projectId: testProjectIds[0],
        isApproved: true
      });

      const unapprovedEntries = await service.getTimeEntries({
        projectId: testProjectIds[0],
        isApproved: false
      });

      expect(approvedEntries.length).toBe(1);
      expect(unapprovedEntries.length).toBe(2);
    });
  });

  describe('Planned vs Actual Hours Tracking', () => {
    beforeEach(async () => {
      // Create time entries for variance analysis
      const timeEntries = [
        { date: '2024-02-01', hours: 8.0, billable: 7.5 },
        { date: '2024-02-02', hours: 6.5, billable: 6.0 },
        { date: '2024-02-05', hours: 9.0, billable: 8.5 },
        { date: '2024-02-06', hours: 7.0, billable: 7.0 },
        { date: '2024-02-07', hours: 8.5, billable: 8.0 }
      ];

      for (const entry of timeEntries) {
        await service.createTimeEntry({
          assignmentId: testAssignmentIds[0],
          employeeId: testEmployeeIds[0],
          projectId: testProjectIds[0],
          date: entry.date,
          hoursWorked: entry.hours,
          description: `Work on ${entry.date}`,
          billableHours: entry.billable
        });
      }
    });

    test('should calculate hours variance for assignment', async () => {
      const variance = await service.calculateAssignmentVariance(testAssignmentIds[0]);

      expect(variance.assignmentId).toBe(testAssignmentIds[0]);
      expect(variance.plannedHoursPerWeek).toBe(32); // From assignment setup
      expect(variance.actualHoursWorked).toBe(39); // Sum of time entries
      expect(variance.plannedHoursForPeriod).toBeGreaterThan(0);
      expect(variance.hoursVariance).toBeDefined();
      expect(variance.variancePercentage).toBeDefined();
    });

    test('should identify over/under utilization', async () => {
      const variance = await service.calculateAssignmentVariance(testAssignmentIds[0]);

      if (variance.hoursVariance > 0) {
        expect(variance.status).toBe('over_allocated');
      } else if (variance.hoursVariance < 0) {
        expect(variance.status).toBe('under_allocated');
      } else {
        expect(variance.status).toBe('on_track');
      }

      expect(variance.utilizationRate).toBeGreaterThan(0);
    });

    test('should calculate project-level variance', async () => {
      // Add entries for second assignment
      await service.createTimeEntry({
        assignmentId: testAssignmentIds[1],
        employeeId: testEmployeeIds[1],
        projectId: testProjectIds[0],
        date: '2024-02-01',
        hoursWorked: 6.0,
        description: 'Frontend work',
        billableHours: 6.0
      });

      const projectVariance = await service.calculateProjectVariance(testProjectIds[0]);

      expect(projectVariance.projectId).toBe(testProjectIds[0]);
      expect(projectVariance.totalPlannedHours).toBeGreaterThan(0);
      expect(projectVariance.totalActualHours).toBe(45); // 39 + 6
      expect(projectVariance.assignmentVariances).toHaveLength(2);
      expect(projectVariance.overallVariancePercentage).toBeDefined();
    });

    test('should calculate efficiency metrics', async () => {
      const efficiency = await service.calculateEfficiencyMetrics(testAssignmentIds[0]);

      expect(efficiency.assignmentId).toBe(testAssignmentIds[0]);
      expect(efficiency.billableHoursRatio).toBeDefined();
      expect(efficiency.productivityScore).toBeDefined();
      expect(efficiency.averageHoursPerDay).toBeDefined();
      expect(efficiency.peakProductivityDays).toBeInstanceOf(Array);
    });
  });

  describe('Time Variance Reporting', () => {
    test('should generate weekly variance report', async () => {
      // Create entries across multiple weeks
      const entries = [
        { date: '2024-02-05', hours: 8 }, // Week 1
        { date: '2024-02-06', hours: 7 }, // Week 1
        { date: '2024-02-12', hours: 9 }, // Week 2
        { date: '2024-02-13', hours: 6.5 }, // Week 2
        { date: '2024-02-19', hours: 8.5 } // Week 3
      ];

      for (const entry of entries) {
        await service.createTimeEntry({
          assignmentId: testAssignmentIds[0],
          employeeId: testEmployeeIds[0],
          projectId: testProjectIds[0],
          date: entry.date,
          hoursWorked: entry.hours,
          description: 'Weekly work'
        });
      }

      const weeklyReport = await service.generateWeeklyVarianceReport(
        testProjectIds[0],
        '2024-02-05',
        '2024-02-25'
      );

      expect(weeklyReport.weeks).toHaveLength(3);
      weeklyReport.weeks.forEach(week => {
        expect(week.weekStartDate).toBeDefined();
        expect(week.plannedHours).toBeGreaterThanOrEqual(0);
        expect(week.actualHours).toBeGreaterThanOrEqual(0);
        expect(week.variance).toBeDefined();
      });
    });

    test('should generate employee performance report', async () => {
      // Create varied performance entries
      const entries = [
        { date: '2024-02-01', hours: 8, billable: 8, category: 'development' },
        { date: '2024-02-02', hours: 6, billable: 5, category: 'meetings' },
        { date: '2024-02-05', hours: 9, billable: 8.5, category: 'development' },
        { date: '2024-02-06', hours: 7, billable: 7, category: 'review' }
      ];

      for (const entry of entries) {
        await service.createTimeEntry({
          assignmentId: testAssignmentIds[0],
          employeeId: testEmployeeIds[0],
          projectId: testProjectIds[0],
          date: entry.date,
          hoursWorked: entry.hours,
          billableHours: entry.billable,
          taskCategory: entry.category,
          description: `${entry.category} work`
        });
      }

      const performance = await service.generateEmployeePerformanceReport(
        testEmployeeIds[0],
        '2024-02-01',
        '2024-02-28'
      );

      expect(performance.employeeId).toBe(testEmployeeIds[0]);
      expect(performance.totalHoursWorked).toBe(30);
      expect(performance.totalBillableHours).toBe(28.5);
      expect(performance.billabilityRate).toBeCloseTo(95);
      expect(performance.averageHoursPerDay).toBeGreaterThan(0);
      expect(performance.taskCategoryBreakdown).toBeDefined();
    });

    test('should identify trends and patterns', async () => {
      // Create trend data over time
      const trendEntries = [];
      for (let day = 1; day <= 20; day++) {
        const hours = 6 + Math.sin(day * 0.3) * 2; // Simulated pattern
        trendEntries.push({
          date: `2024-02-${day.toString().padStart(2, '0')}`,
          hours: Math.round(hours * 10) / 10
        });
      }

      for (const entry of trendEntries) {
        await service.createTimeEntry({
          assignmentId: testAssignmentIds[0],
          employeeId: testEmployeeIds[0],
          projectId: testProjectIds[0],
          date: entry.date,
          hoursWorked: entry.hours,
          description: 'Daily work'
        });
      }

      const trends = await service.analyzeTrends(testEmployeeIds[0], '2024-02-01', '2024-02-20');

      expect(trends.employeeId).toBe(testEmployeeIds[0]);
      expect(trends.trendDirection).toMatch(/^(increasing|decreasing|stable)$/);
      expect(trends.averageHoursPerDay).toBeGreaterThan(0);
      expect(trends.peakDays).toBeInstanceOf(Array);
      expect(trends.lowPerformanceDays).toBeInstanceOf(Array);
    });
  });

  describe('Billing and Cost Tracking', () => {
    test('should calculate billable hours and revenue', async () => {
      const entries = [
        { date: '2024-02-01', hours: 8, billable: 7.5, rate: 90 },
        { date: '2024-02-02', hours: 6, billable: 6, rate: 90 },
        { date: '2024-02-05', hours: 9, billable: 8, rate: 90 }
      ];

      for (const entry of entries) {
        await service.createTimeEntry({
          assignmentId: testAssignmentIds[0],
          employeeId: testEmployeeIds[0],
          projectId: testProjectIds[0],
          date: entry.date,
          hoursWorked: entry.hours,
          billableHours: entry.billable,
          hourlyRate: entry.rate,
          description: 'Billable work'
        });
      }

      const billing = await service.calculateBilling(testProjectIds[0], '2024-02-01', '2024-02-28');

      expect(billing.totalBillableHours).toBe(21.5);
      expect(billing.totalRevenue).toBe(1935); // 21.5 * 90
      expect(billing.totalCost).toBeGreaterThan(0);
      expect(billing.grossMargin).toBeGreaterThan(0);
      expect(billing.profitMargin).toBeGreaterThan(0);
    });

    test('should handle different hourly rates per employee', async () => {
      // Create entries with different rates
      await service.createTimeEntry({
        assignmentId: testAssignmentIds[0],
        employeeId: testEmployeeIds[0],
        projectId: testProjectIds[0],
        date: '2024-02-01',
        hoursWorked: 8,
        billableHours: 8,
        hourlyRate: 90, // Senior developer rate
        description: 'Senior work'
      });

      await service.createTimeEntry({
        assignmentId: testAssignmentIds[1],
        employeeId: testEmployeeIds[1],
        projectId: testProjectIds[0],
        date: '2024-02-01',
        hoursWorked: 8,
        billableHours: 8,
        hourlyRate: 75, // Junior developer rate
        description: 'Junior work'
      });

      const billing = await service.calculateBilling(testProjectIds[0], '2024-02-01', '2024-02-01');

      expect(billing.totalRevenue).toBe(1320); // (8 * 90) + (8 * 75)
      expect(billing.employeeBreakdown).toHaveLength(2);
      expect(billing.employeeBreakdown[0].revenue).toBeGreaterThan(0);
    });
  });

  describe('Time Entry Approval Workflow', () => {
    test('should approve time entries with manager information', async () => {
      const entry = await service.createTimeEntry({
        assignmentId: testAssignmentIds[0],
        employeeId: testEmployeeIds[0],
        projectId: testProjectIds[0],
        date: '2024-02-15',
        hoursWorked: 8.0,
        description: 'Development work',
        billableHours: 8.0
      });

      const approved = await service.approveTimeEntry(entry.id, {
        approvedBy: 'manager@test.com',
        approvalNotes: 'Approved - good work',
        approvedAt: '2024-02-16T10:00:00Z'
      });

      expect(approved.isApproved).toBe(true);
      expect(approved.approvedBy).toBe('manager@test.com');
      expect(approved.approvalNotes).toBe('Approved - good work');
      expect(approved.approvedAt).toBeDefined();
    });

    test('should reject time entries with reasons', async () => {
      const entry = await service.createTimeEntry({
        assignmentId: testAssignmentIds[0],
        employeeId: testEmployeeIds[0],
        projectId: testProjectIds[0],
        date: '2024-02-15',
        hoursWorked: 12.0,
        description: 'Extended work',
        billableHours: 12.0
      });

      const rejected = await service.rejectTimeEntry(entry.id, {
        rejectedBy: 'manager@test.com',
        rejectionReason: 'Exceeds daily limit without approval',
        rejectedAt: '2024-02-16T10:00:00Z'
      });

      expect(rejected.isApproved).toBe(false);
      expect(rejected.rejectedBy).toBe('manager@test.com');
      expect(rejected.rejectionReason).toBe('Exceeds daily limit without approval');
    });

    test('should bulk approve time entries', async () => {
      const entries = [];
      for (let day = 1; day <= 5; day++) {
        const entry = await service.createTimeEntry({
          assignmentId: testAssignmentIds[0],
          employeeId: testEmployeeIds[0],
          projectId: testProjectIds[0],
          date: `2024-02-0${day}`,
          hoursWorked: 8.0,
          description: `Work day ${day}`,
          billableHours: 8.0
        });
        entries.push(entry.id);
      }

      const bulkApproved = await service.bulkApproveEntries(entries, {
        approvedBy: 'manager@test.com',
        approvalNotes: 'Weekly bulk approval'
      });

      expect(bulkApproved.approvedCount).toBe(5);
      expect(bulkApproved.failedCount).toBe(0);
    });
  });

  describe('Performance and Analytics', () => {
    test('should handle large datasets efficiently', async () => {
      // Create many time entries for performance testing
      const entries = [];
      for (let i = 0; i < 100; i++) {
        const date = new Date('2024-01-01');
        date.setDate(date.getDate() + (i % 30));
        
        entries.push({
          assignmentId: testAssignmentIds[0],
          employeeId: testEmployeeIds[0],
          projectId: testProjectIds[0],
          date: date.toISOString().split('T')[0],
          hoursWorked: 6 + Math.random() * 4,
          description: `Work entry ${i}`,
          billableHours: 6 + Math.random() * 3
        });
      }

      const startTime = Date.now();
      for (const entry of entries) {
        await service.createTimeEntry(entry);
      }
      const creationTime = Date.now() - startTime;

      const queryStart = Date.now();
      const variance = await service.calculateProjectVariance(testProjectIds[0]);
      const queryTime = Date.now() - queryStart;

      expect(creationTime).toBeLessThan(30000); // 30 seconds
      expect(queryTime).toBeLessThan(5000); // 5 seconds
      expect(variance.totalActualHours).toBeGreaterThan(600);
    });

    test('should provide accurate aggregate statistics', async () => {
      // Create diverse time entries
      const categories = ['development', 'review', 'meetings', 'testing', 'documentation'];
      
      for (let i = 0; i < 20; i++) {
        await service.createTimeEntry({
          assignmentId: testAssignmentIds[0],
          employeeId: testEmployeeIds[0],
          projectId: testProjectIds[0],
          date: `2024-02-${(i % 28 + 1).toString().padStart(2, '0')}`,
          hoursWorked: 6 + Math.random() * 4,
          description: `${categories[i % categories.length]} work`,
          taskCategory: categories[i % categories.length],
          billableHours: 5 + Math.random() * 3
        });
      }

      const analytics = await service.generateAnalytics(testProjectIds[0], '2024-02-01', '2024-02-28');

      expect(analytics.totalEntries).toBe(20);
      expect(analytics.averageHoursPerEntry).toBeGreaterThan(6);
      expect(analytics.categoryDistribution).toBeDefined();
      expect(analytics.peakProductivityDay).toBeDefined();
      expect(analytics.utilizationTrend).toBeInstanceOf(Array);
    });
  });

  describe('Error Handling and Validation', () => {
    test('should handle invalid assignment ID', async () => {
      const entry = {
        assignmentId: 99999,
        employeeId: testEmployeeIds[0],
        projectId: testProjectIds[0],
        date: '2024-02-15',
        hoursWorked: 8.0,
        description: 'Invalid assignment'
      };

      await expect(service.createTimeEntry(entry))
        .rejects.toThrow('Assignment not found');
    });

    test('should validate date ranges', async () => {
      const futureEntry = {
        assignmentId: testAssignmentIds[0],
        employeeId: testEmployeeIds[0],
        projectId: testProjectIds[0],
        date: '2025-12-31', // Future date
        hoursWorked: 8.0,
        description: 'Future work'
      };

      await expect(service.createTimeEntry(futureEntry))
        .rejects.toThrow('Cannot log time for future dates');
    });

    test('should handle database connection errors', async () => {
      const originalQuery = db.query;
      db.query = () => Promise.reject(new Error('Database connection lost'));

      await expect(service.createTimeEntry({
        assignmentId: testAssignmentIds[0],
        employeeId: testEmployeeIds[0],
        projectId: testProjectIds[0],
        date: '2024-02-15',
        hoursWorked: 8.0,
        description: 'Test entry'
      })).rejects.toThrow('Database connection lost');

      db.query = originalQuery;
    });

    test('should validate hours constraints', async () => {
      const invalidEntries = [
        { hoursWorked: 25, error: 'Hours worked cannot exceed 24 hours per day' },
        { hoursWorked: 0, error: 'Hours worked must be positive' },
        { billableHours: 10, hoursWorked: 8, error: 'Billable hours cannot exceed hours worked' }
      ];

      for (const invalid of invalidEntries) {
        await expect(service.createTimeEntry({
          assignmentId: testAssignmentIds[0],
          employeeId: testEmployeeIds[0],
          projectId: testProjectIds[0],
          date: '2024-02-15',
          hoursWorked: invalid.hoursWorked,
          billableHours: invalid.billableHours || invalid.hoursWorked,
          description: 'Invalid entry'
        })).rejects.toThrow(invalid.error);
      }
    });
  });
});