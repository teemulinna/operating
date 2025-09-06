/**
 * Resource Utilization Analytics Integration Tests
 * Tests for calculating employee utilization rates, efficiency reports, and analytics
 * 
 * Test Coverage:
 * - Calculate employee utilization rates across projects
 * - Generate efficiency reports with billable/non-billable time analysis
 * - Track department and project-level analytics
 * - Performance trending and forecasting
 * - API: GET /api/analytics/utilization
 */

import { describe, test, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import { DatabaseService } from '../../src/database/database.service';
import { UtilizationAnalyticsService } from '../../src/services/utilization-analytics.service';
import { ApiError } from '../../src/utils/api-error';

describe('Resource Utilization Analytics Integration Tests', () => {
  let db: DatabaseService;
  let service: UtilizationAnalyticsService;
  let testProjectIds: number[] = [];
  let testEmployeeIds: number[] = [];
  let testDepartmentIds: number[] = [];
  let testRoleIds: number[] = [];
  let testAssignmentIds: number[] = [];

  beforeAll(async () => {
    db = DatabaseService.getInstance();
    service = new UtilizationAnalyticsService();
    
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
    // Create test departments
    const dept1 = await db.query(`
      INSERT INTO departments (name, description) 
      VALUES ('Engineering', 'Software development team')
      RETURNING id
    `);
    const dept2 = await db.query(`
      INSERT INTO departments (name, description) 
      VALUES ('Design', 'UI/UX design team')
      RETURNING id
    `);
    
    testDepartmentIds = [dept1.rows[0].id, dept2.rows[0].id];

    // Create test projects with different characteristics
    const project1 = await db.query(`
      INSERT INTO projects (name, description, start_date, end_date, status, estimated_hours, budget, hourly_rate) 
      VALUES ('Enterprise CRM', 'Large enterprise system', '2024-01-01', '2024-12-31', 'active', 2000, 250000, 125.00)
      RETURNING id
    `);
    const project2 = await db.query(`
      INSERT INTO projects (name, description, start_date, end_date, status, estimated_hours, budget, hourly_rate) 
      VALUES ('Mobile App', 'Consumer mobile application', '2024-03-01', '2024-08-31', 'active', 800, 80000, 100.00)
      RETURNING id
    `);
    const project3 = await db.query(`
      INSERT INTO projects (name, description, start_date, end_date, status, estimated_hours, budget, hourly_rate) 
      VALUES ('Website Redesign', 'Company website overhaul', '2024-02-01', '2024-05-31', 'active', 400, 40000, 85.00)
      RETURNING id
    `);
    
    testProjectIds = [project1.rows[0].id, project2.rows[0].id, project3.rows[0].id];

    // Create test employees with different characteristics
    const employees = [
      { 
        name: 'John Doe', 
        email: 'john.doe@test.com', 
        position: 'Senior Full Stack Developer', 
        department: testDepartmentIds[0], 
        hourlyRate: 95.00,
        capacity: 40,
        experience: 'senior'
      },
      { 
        name: 'Jane Smith', 
        email: 'jane.smith@test.com', 
        position: 'Frontend Developer', 
        department: testDepartmentIds[0], 
        hourlyRate: 75.00,
        capacity: 40,
        experience: 'intermediate'
      },
      { 
        name: 'Bob Wilson', 
        email: 'bob.wilson@test.com', 
        position: 'UI/UX Designer', 
        department: testDepartmentIds[1], 
        hourlyRate: 65.00,
        capacity: 40,
        experience: 'senior'
      },
      { 
        name: 'Alice Brown', 
        email: 'alice.brown@test.com', 
        position: 'Junior Developer', 
        department: testDepartmentIds[0], 
        hourlyRate: 55.00,
        capacity: 35, // Part-time
        experience: 'junior'
      },
      { 
        name: 'Charlie Davis', 
        email: 'charlie.davis@test.com', 
        position: 'Project Manager', 
        department: testDepartmentIds[0], 
        hourlyRate: 85.00,
        capacity: 40,
        experience: 'expert'
      }
    ];

    for (const emp of employees) {
      const result = await db.query(`
        INSERT INTO employees (first_name, last_name, email, position, department_id, hourly_rate, weekly_capacity, is_active) 
        VALUES ($1, $2, $3, $4, $5, $6, $7, true)
        RETURNING id
      `, [emp.name.split(' ')[0], emp.name.split(' ')[1], emp.email, emp.position, emp.department, emp.hourlyRate, emp.capacity]);
      testEmployeeIds.push(result.rows[0].id);
    }

    // Create project roles with varied allocation requirements
    const roles = [
      { project: testProjectIds[0], name: 'Lead Developer', allocation: 80, hours: 500, rate: 95.00 },
      { project: testProjectIds[0], name: 'Frontend Developer', allocation: 70, hours: 400, rate: 75.00 },
      { project: testProjectIds[0], name: 'Project Manager', allocation: 60, hours: 300, rate: 85.00 },
      { project: testProjectIds[1], name: 'Mobile Developer', allocation: 90, hours: 350, rate: 85.00 },
      { project: testProjectIds[1], name: 'UI Designer', allocation: 50, hours: 200, rate: 65.00 },
      { project: testProjectIds[2], name: 'Web Developer', allocation: 75, hours: 250, rate: 75.00 },
      { project: testProjectIds[2], name: 'UX Designer', allocation: 60, hours: 150, rate: 65.00 }
    ];

    for (const role of roles) {
      const result = await db.query(`
        INSERT INTO project_roles (
          project_id, role_name, description, start_date, end_date,
          planned_allocation_percentage, estimated_hours, hourly_rate, max_assignments
        )
        VALUES ($1, $2, $3, '2024-01-01', '2024-12-31', $4, $5, $6, 1)
        RETURNING id
      `, [role.project, role.name, `${role.name} responsibilities`, role.allocation, role.hours, role.rate]);
      testRoleIds.push(result.rows[0].id);
    }

    // Create resource assignments with realistic distributions
    const assignments = [
      { employee: 0, project: 0, role: 0, allocation: 80, startDate: '2024-01-01', endDate: '2024-06-30' },
      { employee: 1, project: 0, role: 1, allocation: 70, startDate: '2024-01-15', endDate: '2024-07-15' },
      { employee: 4, project: 0, role: 2, allocation: 60, startDate: '2024-01-01', endDate: '2024-12-31' },
      { employee: 0, project: 1, role: 3, allocation: 20, startDate: '2024-07-01', endDate: '2024-08-31' }, // Overlap with reduced allocation
      { employee: 2, project: 1, role: 4, allocation: 50, startDate: '2024-03-01', endDate: '2024-08-31' },
      { employee: 1, project: 2, role: 5, allocation: 30, startDate: '2024-02-01', endDate: '2024-05-31' }, // Multi-project
      { employee: 2, project: 2, role: 6, allocation: 50, startDate: '2024-02-01', endDate: '2024-04-30' }, // Multi-project
      { employee: 3, project: 2, role: 5, allocation: 80, startDate: '2024-02-15', endDate: '2024-05-31' }
    ];

    for (const assignment of assignments) {
      const plannedHours = Math.round((assignment.allocation / 100) * 40); // Weekly hours based on allocation
      const result = await db.query(`
        INSERT INTO resource_assignments (
          employee_id, project_id, role_id, assignment_type, start_date, end_date,
          planned_allocation_percentage, planned_hours_per_week, hourly_rate, status
        ) VALUES ($1, $2, $3, 'employee', $4, $5, $6, $7, $8, 'active')
        RETURNING id
      `, [
        testEmployeeIds[assignment.employee], 
        assignment.project, 
        testRoleIds[assignment.role],
        assignment.startDate,
        assignment.endDate,
        assignment.allocation,
        plannedHours,
        85.00
      ]);
      testAssignmentIds.push(result.rows[0].id);
    }

    // Create realistic time entries for utilization analysis
    await createTimeEntries();
  }

  async function createTimeEntries() {
    // Create varied time entries across different periods and assignments
    const timeEntries = [];
    
    // February 2024 entries (full month data)
    for (let day = 1; day <= 28; day++) {
      const date = `2024-02-${day.toString().padStart(2, '0')}`;
      const isWeekend = new Date(date).getDay() % 6 === 0; // Skip weekends
      
      if (!isWeekend) {
        // John Doe entries (assignment 0 - 80% allocation = ~32 hours/week)
        if (day <= 25) { // Worked most of the month
          timeEntries.push({
            assignmentId: testAssignmentIds[0],
            employeeId: testEmployeeIds[0],
            projectId: testProjectIds[0],
            date,
            hoursWorked: 6 + Math.random() * 3,
            billableHours: 6 + Math.random() * 2,
            taskCategory: day % 3 === 0 ? 'meetings' : 'development'
          });
        }

        // Jane Smith entries (multiple assignments)
        if (day >= 15) { // Started mid-month
          // Assignment 1 (Project 0, 70% allocation)
          timeEntries.push({
            assignmentId: testAssignmentIds[1],
            employeeId: testEmployeeIds[1],
            projectId: testProjectIds[0],
            date,
            hoursWorked: 5 + Math.random() * 2,
            billableHours: 4.5 + Math.random() * 1.5,
            taskCategory: 'development'
          });
          
          // Assignment 5 (Project 2, 30% allocation) - if overlapping
          if (testAssignmentIds[5] && day >= 1) {
            timeEntries.push({
              assignmentId: testAssignmentIds[5],
              employeeId: testEmployeeIds[1],
              projectId: testProjectIds[2],
              date,
              hoursWorked: 2 + Math.random() * 1.5,
              billableHours: 2 + Math.random(),
              taskCategory: 'development'
            });
          }
        }

        // Bob Wilson entries (UI Designer - multiple projects)
        if (day >= 1) {
          // Assignment 4 (Project 1, 50% allocation)
          if (day >= 1) {
            timeEntries.push({
              assignmentId: testAssignmentIds[4],
              employeeId: testEmployeeIds[2],
              projectId: testProjectIds[1],
              date,
              hoursWorked: 3 + Math.random() * 2,
              billableHours: 3 + Math.random() * 1.5,
              taskCategory: 'design'
            });
          }
          
          // Assignment 6 (Project 2, 50% allocation)
          timeEntries.push({
            assignmentId: testAssignmentIds[6],
            employeeId: testEmployeeIds[2],
            projectId: testProjectIds[2],
            date,
            hoursWorked: 3 + Math.random() * 2,
            billableHours: 3 + Math.random() * 1.5,
            taskCategory: 'design'
          });
        }

        // Alice Brown entries (Junior Developer, part-time)
        if (day >= 15 && day % 2 === 0) { // Part-time, every other day
          timeEntries.push({
            assignmentId: testAssignmentIds[7],
            employeeId: testEmployeeIds[3],
            projectId: testProjectIds[2],
            date,
            hoursWorked: 4 + Math.random() * 2,
            billableHours: 3.5 + Math.random() * 1.5,
            taskCategory: 'development'
          });
        }
      }
    }

    // Insert time entries
    for (const entry of timeEntries) {
      try {
        await db.query(`
          INSERT INTO time_entries (
            assignment_id, employee_id, project_id, date, hours_worked, 
            billable_hours, task_category, description, is_approved
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true)
        `, [
          entry.assignmentId,
          entry.employeeId,
          entry.projectId,
          entry.date,
          entry.hoursWorked,
          entry.billableHours,
          entry.taskCategory,
          `${entry.taskCategory} work on ${entry.date}`,
          true
        ]);
      } catch (error) {
        // Skip if entry already exists or other constraint error
        console.log(`Skipping entry: ${error.message}`);
      }
    }
  }

  async function cleanupTestData() {
    // Clean up in reverse dependency order
    await db.query('DELETE FROM time_entries WHERE assignment_id = ANY($1)', [testAssignmentIds]);
    await db.query('DELETE FROM resource_assignments WHERE id = ANY($1)', [testAssignmentIds]);
    if (testRoleIds.length > 0) {
      await db.query('DELETE FROM project_roles WHERE id = ANY($1)', [testRoleIds]);
    }
    if (testProjectIds.length > 0) {
      await db.query('DELETE FROM projects WHERE id = ANY($1)', [testProjectIds]);
    }
    if (testEmployeeIds.length > 0) {
      await db.query('DELETE FROM employees WHERE id = ANY($1)', [testEmployeeIds]);
    }
    if (testDepartmentIds.length > 0) {
      await db.query('DELETE FROM departments WHERE id = ANY($1)', [testDepartmentIds]);
    }

    testProjectIds = [];
    testEmployeeIds = [];
    testDepartmentIds = [];
    testRoleIds = [];
    testAssignmentIds = [];
  }

  describe('Employee Utilization Calculations', () => {
    test('should calculate individual employee utilization rate', async () => {
      const utilization = await service.calculateEmployeeUtilization(
        testEmployeeIds[0], 
        '2024-02-01', 
        '2024-02-29'
      );

      expect(utilization.employeeId).toBe(testEmployeeIds[0]);
      expect(utilization.period.startDate).toBe('2024-02-01');
      expect(utilization.period.endDate).toBe('2024-02-29');
      expect(utilization.totalCapacityHours).toBe(40 * 4); // 40 hours/week * 4 weeks
      expect(utilization.totalWorkedHours).toBeGreaterThan(0);
      expect(utilization.utilizationRate).toBeGreaterThan(0);
      expect(utilization.utilizationRate).toBeLessThanOrEqual(100);
      expect(utilization.billableUtilizationRate).toBeGreaterThan(0);
      expect(utilization.efficiency).toBeGreaterThan(0);
    });

    test('should handle multi-project assignments in utilization', async () => {
      const utilization = await service.calculateEmployeeUtilization(
        testEmployeeIds[1], // Jane Smith - multiple projects
        '2024-02-01', 
        '2024-02-29'
      );

      expect(utilization.projectBreakdown).toHaveLength(2);
      expect(utilization.totalPlannedAllocation).toBe(100); // 70% + 30%
      expect(utilization.allocationVariance).toBeDefined();
      
      // Check project-specific utilization
      const project0Util = utilization.projectBreakdown.find(p => p.projectId === testProjectIds[0]);
      const project2Util = utilization.projectBreakdown.find(p => p.projectId === testProjectIds[2]);
      
      expect(project0Util).toBeDefined();
      expect(project2Util).toBeDefined();
      expect(project0Util.hoursWorked).toBeGreaterThan(project2Util.hoursWorked); // 70% vs 30%
    });

    test('should categorize utilization levels accurately', async () => {
      const utilizations = await Promise.all(
        testEmployeeIds.map(id => 
          service.calculateEmployeeUtilization(id, '2024-02-01', '2024-02-29')
        )
      );

      utilizations.forEach(util => {
        expect(util.utilizationCategory).toMatch(/^(under_utilized|optimal|over_utilized|at_capacity)$/);
        
        if (util.utilizationRate < 70) {
          expect(util.utilizationCategory).toBe('under_utilized');
        } else if (util.utilizationRate > 95) {
          expect(util.utilizationCategory).toBe('over_utilized');
        } else if (util.utilizationRate >= 85) {
          expect(util.utilizationCategory).toBe('optimal');
        }
      });
    });

    test('should calculate capacity planning metrics', async () => {
      const utilization = await service.calculateEmployeeUtilization(
        testEmployeeIds[0],
        '2024-02-01', 
        '2024-02-29'
      );

      expect(utilization.capacityMetrics).toBeDefined();
      expect(utilization.capacityMetrics.availableHours).toBeGreaterThanOrEqual(0);
      expect(utilization.capacityMetrics.overallocationHours).toBeGreaterThanOrEqual(0);
      expect(utilization.capacityMetrics.futureCapacity).toBeDefined();
      expect(utilization.capacityMetrics.recommendedAllocation).toBeGreaterThan(0);
      expect(utilization.capacityMetrics.recommendedAllocation).toBeLessThanOrEqual(100);
    });
  });

  describe('Department-Level Analytics', () => {
    test('should calculate department utilization overview', async () => {
      const deptAnalytics = await service.calculateDepartmentUtilization(
        testDepartmentIds[0], // Engineering
        '2024-02-01',
        '2024-02-29'
      );

      expect(deptAnalytics.departmentId).toBe(testDepartmentIds[0]);
      expect(deptAnalytics.totalEmployees).toBeGreaterThan(0);
      expect(deptAnalytics.averageUtilization).toBeGreaterThan(0);
      expect(deptAnalytics.totalCapacityHours).toBeGreaterThan(0);
      expect(deptAnalytics.totalWorkedHours).toBeGreaterThan(0);
      expect(deptAnalytics.employeeBreakdown).toHaveLength(4); // 4 engineering employees
      expect(deptAnalytics.utilizationDistribution).toBeDefined();
    });

    test('should compare department performance metrics', async () => {
      const engAnalytics = await service.calculateDepartmentUtilization(
        testDepartmentIds[0], 
        '2024-02-01', 
        '2024-02-29'
      );
      
      const designAnalytics = await service.calculateDepartmentUtilization(
        testDepartmentIds[1], 
        '2024-02-01', 
        '2024-02-29'
      );

      expect(engAnalytics.averageHourlyRate).toBeGreaterThan(designAnalytics.averageHourlyRate);
      expect(engAnalytics.totalEmployees).toBeGreaterThan(designAnalytics.totalEmployees);
      
      // Both should have valid metrics
      [engAnalytics, designAnalytics].forEach(analytics => {
        expect(analytics.efficiency).toBeGreaterThan(0);
        expect(analytics.billabilityRate).toBeGreaterThan(0);
        expect(analytics.projectDistribution).toBeDefined();
      });
    });

    test('should identify department capacity constraints', async () => {
      const deptAnalytics = await service.calculateDepartmentUtilization(
        testDepartmentIds[0],
        '2024-02-01',
        '2024-02-29'
      );

      expect(deptAnalytics.capacityAnalysis).toBeDefined();
      expect(deptAnalytics.capacityAnalysis.bottlenecks).toBeInstanceOf(Array);
      expect(deptAnalytics.capacityAnalysis.recommendations).toBeInstanceOf(Array);
      expect(deptAnalytics.capacityAnalysis.scalingNeeds).toBeDefined();
      
      if (deptAnalytics.averageUtilization > 90) {
        expect(deptAnalytics.capacityAnalysis.bottlenecks.length).toBeGreaterThan(0);
      }
    });
  });

  describe('Project-Level Analytics', () => {
    test('should calculate project resource utilization', async () => {
      const projectUtil = await service.calculateProjectUtilization(
        testProjectIds[0],
        '2024-02-01',
        '2024-02-29'
      );

      expect(projectUtil.projectId).toBe(testProjectIds[0]);
      expect(projectUtil.assignedEmployees).toHaveLength(3); // John, Jane, Charlie
      expect(projectUtil.totalPlannedHours).toBeGreaterThan(0);
      expect(projectUtil.totalActualHours).toBeGreaterThan(0);
      expect(projectUtil.utilizationEfficiency).toBeGreaterThan(0);
      expect(projectUtil.roleUtilization).toBeDefined();
      
      // Check role-specific utilization
      projectUtil.roleUtilization.forEach(role => {
        expect(role.roleId).toBeDefined();
        expect(role.roleName).toBeDefined();
        expect(role.plannedHours).toBeGreaterThanOrEqual(0);
        expect(role.actualHours).toBeGreaterThanOrEqual(0);
        expect(role.utilizationRate).toBeGreaterThanOrEqual(0);
      });
    });

    test('should track project resource allocation over time', async () => {
      const timeline = await service.getProjectResourceTimeline(
        testProjectIds[0],
        '2024-01-01',
        '2024-06-30'
      );

      expect(timeline.projectId).toBe(testProjectIds[0]);
      expect(timeline.timelineData).toBeInstanceOf(Array);
      expect(timeline.timelineData.length).toBeGreaterThan(0);

      timeline.timelineData.forEach(period => {
        expect(period.period).toBeDefined();
        expect(period.plannedAllocation).toBeGreaterThanOrEqual(0);
        expect(period.actualUtilization).toBeGreaterThanOrEqual(0);
        expect(period.employeeCount).toBeGreaterThan(0);
        expect(period.costBurn).toBeGreaterThanOrEqual(0);
      });
    });

    test('should calculate project efficiency metrics', async () => {
      const efficiency = await service.calculateProjectEfficiency(testProjectIds[0]);

      expect(efficiency.projectId).toBe(testProjectIds[0]);
      expect(efficiency.overallEfficiency).toBeGreaterThan(0);
      expect(efficiency.costEfficiency).toBeGreaterThan(0);
      expect(efficiency.timeEfficiency).toBeGreaterThan(0);
      expect(efficiency.resourceOptimization).toBeGreaterThan(0);
      expect(efficiency.benchmarkComparison).toBeDefined();
      
      // Efficiency breakdown
      expect(efficiency.efficiencyFactors.communicationOverhead).toBeDefined();
      expect(efficiency.efficiencyFactors.taskComplexity).toBeDefined();
      expect(efficiency.efficiencyFactors.teamExperience).toBeDefined();
    });
  });

  describe('Billable vs Non-Billable Analysis', () => {
    test('should analyze billability patterns', async () => {
      const billability = await service.analyzeBillability(
        testEmployeeIds[0],
        '2024-02-01',
        '2024-02-29'
      );

      expect(billability.employeeId).toBe(testEmployeeIds[0]);
      expect(billability.totalHours).toBeGreaterThan(0);
      expect(billability.billableHours).toBeGreaterThan(0);
      expect(billability.nonBillableHours).toBeGreaterThanOrEqual(0);
      expect(billability.billabilityRate).toBeGreaterThan(0);
      expect(billability.billabilityRate).toBeLessThanOrEqual(100);

      // Category breakdown
      expect(billability.categoryBreakdown).toBeDefined();
      expect(billability.categoryBreakdown.development).toBeGreaterThan(0);
      
      if (billability.categoryBreakdown.meetings > 0) {
        expect(billability.categoryBreakdown.meetings).toBeGreaterThan(0);
      }
    });

    test('should identify billability improvement opportunities', async () => {
      const opportunities = await service.identifyBillabilityOpportunities(testDepartmentIds[0]);

      expect(opportunities.departmentId).toBe(testDepartmentIds[0]);
      expect(opportunities.currentAverageBillability).toBeGreaterThan(0);
      expect(opportunities.targetBillability).toBeGreaterThan(opportunities.currentAverageBillability);
      expect(opportunities.improvementPotential).toBeGreaterThan(0);
      expect(opportunities.recommendations).toBeInstanceOf(Array);

      opportunities.recommendations.forEach(rec => {
        expect(rec.category).toBeDefined();
        expect(rec.impact).toMatch(/^(low|medium|high)$/);
        expect(rec.effort).toMatch(/^(low|medium|high)$/);
        expect(rec.description).toBeDefined();
      });
    });

    test('should calculate revenue impact of billability changes', async () => {
      const revenueImpact = await service.calculateBillabilityRevenueImpact(
        testEmployeeIds[0],
        85, // Target billability rate
        '2024-02-01',
        '2024-02-29'
      );

      expect(revenueImpact.employeeId).toBe(testEmployeeIds[0]);
      expect(revenueImpact.currentBillability).toBeGreaterThan(0);
      expect(revenueImpact.targetBillability).toBe(85);
      expect(revenueImpact.currentRevenue).toBeGreaterThan(0);
      expect(revenueImpact.potentialRevenue).toBeDefined();
      expect(revenueImpact.revenueIncrease).toBeDefined();
      expect(revenueImpact.annualizedImpact).toBeGreaterThan(0);
    });
  });

  describe('Utilization Trends and Forecasting', () => {
    test('should analyze utilization trends over time', async () => {
      const trends = await service.analyzeUtilizationTrends(
        testEmployeeIds[0],
        '2024-01-01',
        '2024-02-29'
      );

      expect(trends.employeeId).toBe(testEmployeeIds[0]);
      expect(trends.trendData).toBeInstanceOf(Array);
      expect(trends.trendDirection).toMatch(/^(increasing|decreasing|stable|volatile)$/);
      expect(trends.averageUtilization).toBeGreaterThan(0);
      expect(trends.utilizationVariance).toBeGreaterThanOrEqual(0);
      expect(trends.seasonalPatterns).toBeDefined();

      trends.trendData.forEach(point => {
        expect(point.period).toBeDefined();
        expect(point.utilization).toBeGreaterThanOrEqual(0);
        expect(point.capacity).toBeGreaterThan(0);
        expect(point.efficiency).toBeGreaterThan(0);
      });
    });

    test('should forecast future utilization needs', async () => {
      const forecast = await service.forecastUtilization(
        testProjectIds[0],
        '2024-03-01',
        '2024-06-30'
      );

      expect(forecast.projectId).toBe(testProjectIds[0]);
      expect(forecast.forecastPeriod.startDate).toBe('2024-03-01');
      expect(forecast.forecastPeriod.endDate).toBe('2024-06-30');
      expect(forecast.projectedNeeds).toBeInstanceOf(Array);
      expect(forecast.confidenceLevel).toBeGreaterThan(0);
      expect(forecast.confidenceLevel).toBeLessThanOrEqual(100);

      forecast.projectedNeeds.forEach(need => {
        expect(need.period).toBeDefined();
        expect(need.requiredCapacity).toBeGreaterThan(0);
        expect(need.availableCapacity).toBeGreaterThanOrEqual(0);
        expect(need.gap).toBeDefined();
        expect(need.recommendations).toBeInstanceOf(Array);
      });
    });

    test('should identify utilization optimization opportunities', async () => {
      const optimization = await service.identifyOptimizationOpportunities(testDepartmentIds[0]);

      expect(optimization.departmentId).toBe(testDepartmentIds[0]);
      expect(optimization.currentEfficiency).toBeGreaterThan(0);
      expect(optimization.potentialEfficiency).toBeGreaterThan(optimization.currentEfficiency);
      expect(optimization.improvementAreas).toBeInstanceOf(Array);
      expect(optimization.actionItems).toBeInstanceOf(Array);

      optimization.improvementAreas.forEach(area => {
        expect(area.category).toBeDefined();
        expect(area.currentPerformance).toBeGreaterThan(0);
        expect(area.targetPerformance).toBeGreaterThan(area.currentPerformance);
        expect(area.impact).toMatch(/^(low|medium|high)$/);
      });
    });
  });

  describe('Comparative Analytics', () => {
    test('should benchmark employee performance against peers', async () => {
      const benchmark = await service.benchmarkEmployeePerformance(
        testEmployeeIds[0],
        '2024-02-01',
        '2024-02-29'
      );

      expect(benchmark.employeeId).toBe(testEmployeeIds[0]);
      expect(benchmark.peerGroup).toBeDefined();
      expect(benchmark.metrics.utilization.percentile).toBeGreaterThanOrEqual(0);
      expect(benchmark.metrics.utilization.percentile).toBeLessThanOrEqual(100);
      expect(benchmark.metrics.efficiency.percentile).toBeGreaterThanOrEqual(0);
      expect(benchmark.metrics.billability.percentile).toBeGreaterThanOrEqual(0);
      
      expect(benchmark.rankings.utilization).toMatch(/^(top_performer|above_average|average|below_average|needs_improvement)$/);
      expect(benchmark.strengths).toBeInstanceOf(Array);
      expect(benchmark.improvementAreas).toBeInstanceOf(Array);
    });

    test('should compare project performance metrics', async () => {
      const comparison = await service.compareProjectPerformance(
        [testProjectIds[0], testProjectIds[1], testProjectIds[2]],
        '2024-02-01',
        '2024-02-29'
      );

      expect(comparison.projects).toHaveLength(3);
      expect(comparison.bestPerforming).toBeDefined();
      expect(comparison.needsAttention).toBeInstanceOf(Array);
      
      comparison.projects.forEach(project => {
        expect(project.projectId).toBeDefined();
        expect(project.utilizationScore).toBeGreaterThan(0);
        expect(project.efficiencyScore).toBeGreaterThan(0);
        expect(project.costEffectiveness).toBeGreaterThan(0);
        expect(project.rank).toBeGreaterThan(0);
        expect(project.rank).toBeLessThanOrEqual(3);
      });
    });

    test('should generate departmental performance comparison', async () => {
      const comparison = await service.compareDepartmentPerformance(
        [testDepartmentIds[0], testDepartmentIds[1]]
      );

      expect(comparison.departments).toHaveLength(2);
      expect(comparison.topPerformer).toBeDefined();
      expect(comparison.keyMetrics).toBeDefined();

      comparison.departments.forEach(dept => {
        expect(dept.departmentId).toBeDefined();
        expect(dept.overallScore).toBeGreaterThan(0);
        expect(dept.utilizationRate).toBeGreaterThan(0);
        expect(dept.billabilityRate).toBeGreaterThan(0);
        expect(dept.efficiency).toBeGreaterThan(0);
        expect(dept.strengths).toBeInstanceOf(Array);
        expect(dept.challenges).toBeInstanceOf(Array);
      });
    });
  });

  describe('Performance and Scalability', () => {
    test('should handle large datasets efficiently', async () => {
      const startTime = Date.now();
      
      const analytics = await service.generateComprehensiveReport({
        departmentIds: testDepartmentIds,
        projectIds: testProjectIds,
        employeeIds: testEmployeeIds,
        startDate: '2024-02-01',
        endDate: '2024-02-29'
      });
      
      const executionTime = Date.now() - startTime;

      expect(executionTime).toBeLessThan(10000); // Should complete within 10 seconds
      expect(analytics).toBeDefined();
      expect(analytics.executionTime).toBeLessThan(10000);
      expect(analytics.summary.totalEmployeesAnalyzed).toBe(testEmployeeIds.length);
      expect(analytics.summary.totalProjectsAnalyzed).toBe(testProjectIds.length);
    });

    test('should cache complex calculations for performance', async () => {
      const startTime1 = Date.now();
      const result1 = await service.calculateDepartmentUtilization(
        testDepartmentIds[0],
        '2024-02-01',
        '2024-02-29'
      );
      const time1 = Date.now() - startTime1;

      const startTime2 = Date.now();
      const result2 = await service.calculateDepartmentUtilization(
        testDepartmentIds[0],
        '2024-02-01',
        '2024-02-29'
      );
      const time2 = Date.now() - startTime2;

      // Second call should be faster due to caching
      expect(time2).toBeLessThan(time1);
      expect(result1.averageUtilization).toBe(result2.averageUtilization);
    });
  });

  describe('Error Handling and Edge Cases', () => {
    test('should handle employees with no assignments', async () => {
      // Create employee with no assignments
      const newEmployee = await db.query(`
        INSERT INTO employees (first_name, last_name, email, position, department_id, hourly_rate, weekly_capacity, is_active) 
        VALUES ('New', 'Employee', 'new.employee@test.com', 'Developer', $1, 75.00, 40, true)
        RETURNING id
      `, [testDepartmentIds[0]]);

      const utilization = await service.calculateEmployeeUtilization(
        newEmployee.rows[0].id,
        '2024-02-01',
        '2024-02-29'
      );

      expect(utilization.totalWorkedHours).toBe(0);
      expect(utilization.utilizationRate).toBe(0);
      expect(utilization.utilizationCategory).toBe('under_utilized');

      // Clean up
      await db.query('DELETE FROM employees WHERE id = $1', [newEmployee.rows[0].id]);
    });

    test('should handle invalid date ranges', async () => {
      await expect(service.calculateEmployeeUtilization(
        testEmployeeIds[0],
        '2024-02-29', // End date before start date
        '2024-02-01'
      )).rejects.toThrow('End date must be after start date');
    });

    test('should handle database connection errors gracefully', async () => {
      const originalQuery = db.query;
      db.query = () => Promise.reject(new Error('Database connection lost'));

      await expect(service.calculateEmployeeUtilization(
        testEmployeeIds[0],
        '2024-02-01',
        '2024-02-29'
      )).rejects.toThrow('Database connection lost');

      db.query = originalQuery;
    });

    test('should validate input parameters', async () => {
      const invalidInputs = [
        { employeeId: null, error: 'Employee ID is required' },
        { employeeId: 'invalid', error: 'Employee ID must be a number' },
        { employeeId: 99999, error: 'Employee not found' }
      ];

      for (const invalid of invalidInputs) {
        await expect(service.calculateEmployeeUtilization(
          invalid.employeeId as any,
          '2024-02-01',
          '2024-02-29'
        )).rejects.toThrow(invalid.error);
      }
    });
  });
});