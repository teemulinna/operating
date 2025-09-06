/**
 * Skills-Based Matching Integration Tests
 * Tests for auto-matching employees to project roles based on skills
 * 
 * Test Coverage:
 * - Auto-match employees to project roles based on skills
 * - Calculate match scores using skill proficiency levels
 * - Rank candidates by availability and skill fit
 * - API: POST /api/projects/:id/roles/:roleId/match-employees
 */

import { describe, test, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import { DatabaseService } from '../../src/database/database.service';
import { SkillMatchingService } from '../../src/services/skill-matching.service';
import { ApiError } from '../../src/utils/api-error';

describe('Skills-Based Matching Integration Tests', () => {
  let db: DatabaseService;
  let service: SkillMatchingService;
  let testProjectIds: number[] = [];
  let testEmployeeIds: number[] = [];
  let testRoleIds: number[] = [];
  let testSkillIds: number[] = [];

  beforeAll(async () => {
    db = DatabaseService.getInstance();
    service = new SkillMatchingService();
    
    // Ensure test database is ready
    await db.testConnection();
  });

  afterAll(async () => {
    // Clean up test data
    await cleanupTestData();
  });

  beforeEach(async () => {
    await setupTestData();
  });

  afterEach(async () => {
    await cleanupTestData();
  });

  async function setupTestData() {
    // Create test skills
    const skill1 = await db.query(`
      INSERT INTO skills (name, category, description) 
      VALUES ('JavaScript', 'Programming', 'JavaScript programming language')
      RETURNING id
    `);
    const skill2 = await db.query(`
      INSERT INTO skills (name, category, description) 
      VALUES ('React', 'Frontend', 'React framework')
      RETURNING id
    `);
    const skill3 = await db.query(`
      INSERT INTO skills (name, category, description) 
      VALUES ('Node.js', 'Backend', 'Node.js runtime')
      RETURNING id
    `);
    const skill4 = await db.query(`
      INSERT INTO skills (name, category, description) 
      VALUES ('TypeScript', 'Programming', 'TypeScript superset')
      RETURNING id
    `);
    const skill5 = await db.query(`
      INSERT INTO skills (name, category, description) 
      VALUES ('UI/UX Design', 'Design', 'User interface and experience design')
      RETURNING id
    `);
    
    testSkillIds = [
      skill1.rows[0].id, skill2.rows[0].id, skill3.rows[0].id, 
      skill4.rows[0].id, skill5.rows[0].id
    ];

    // Create test employees with different skill levels
    const employee1 = await db.query(`
      INSERT INTO employees (first_name, last_name, email, position, department_id, is_active) 
      VALUES ('John', 'Doe', 'john.doe@test.com', 'Senior Developer', 1, true)
      RETURNING id
    `);
    const employee2 = await db.query(`
      INSERT INTO employees (first_name, last_name, email, position, department_id, is_active) 
      VALUES ('Jane', 'Smith', 'jane.smith@test.com', 'Frontend Developer', 1, true)
      RETURNING id
    `);
    const employee3 = await db.query(`
      INSERT INTO employees (first_name, last_name, email, position, department_id, is_active) 
      VALUES ('Bob', 'Wilson', 'bob.wilson@test.com', 'UI Designer', 1, true)
      RETURNING id
    `);
    const employee4 = await db.query(`
      INSERT INTO employees (first_name, last_name, email, position, department_id, is_active) 
      VALUES ('Alice', 'Brown', 'alice.brown@test.com', 'Full Stack Developer', 1, false)
      RETURNING id
    `);
    
    testEmployeeIds = [
      employee1.rows[0].id, employee2.rows[0].id, 
      employee3.rows[0].id, employee4.rows[0].id
    ];

    // Add employee skills with proficiency levels
    // John Doe - Senior Full Stack (high proficiency in JS, React, Node.js, TypeScript)
    await db.query(`
      INSERT INTO employee_skills (employee_id, skill_id, proficiency_level, years_experience, is_certified) 
      VALUES 
        ($1, $2, 'expert', 5, true),
        ($1, $3, 'expert', 4, true),
        ($1, $4, 'senior', 3, false),
        ($1, $5, 'expert', 5, true)
    `, [testEmployeeIds[0], testSkillIds[0], testSkillIds[1], testSkillIds[2], testSkillIds[3]]);

    // Jane Smith - Frontend Specialist (high React, moderate JS)
    await db.query(`
      INSERT INTO employee_skills (employee_id, skill_id, proficiency_level, years_experience, is_certified) 
      VALUES 
        ($1, $2, 'senior', 3, false),
        ($1, $3, 'expert', 4, true),
        ($1, $5, 'intermediate', 2, false)
    `, [testEmployeeIds[1], testSkillIds[0], testSkillIds[1], testSkillIds[3]]);

    // Bob Wilson - UI Designer (high UI/UX, basic programming)
    await db.query(`
      INSERT INTO employee_skills (employee_id, skill_id, proficiency_level, years_experience, is_certified) 
      VALUES 
        ($1, $2, 'junior', 1, false),
        ($1, $3, 'expert', 6, true)
    `, [testEmployeeIds[2], testSkillIds[4], testSkillIds[4]]);

    // Alice Brown - Full Stack (inactive employee)
    await db.query(`
      INSERT INTO employee_skills (employee_id, skill_id, proficiency_level, years_experience, is_certified) 
      VALUES 
        ($1, $2, 'expert', 4, true),
        ($1, $3, 'senior', 3, false),
        ($1, $4, 'expert', 4, true)
    `, [testEmployeeIds[3], testSkillIds[0], testSkillIds[1], testSkillIds[2]]);

    // Create test project
    const project = await db.query(`
      INSERT INTO projects (name, description, start_date, status) 
      VALUES ('React E-commerce Platform', 'Build modern e-commerce with React', '2024-01-01', 'active')
      RETURNING id
    `);
    testProjectIds = [project.rows[0].id];

    // Create test project roles with required skills
    const role1 = await db.query(`
      INSERT INTO project_roles (
        project_id, role_name, description, required_skills, minimum_experience_level,
        start_date, planned_allocation_percentage, max_assignments
      )
      VALUES ($1, 'Senior React Developer', 'Lead React development', $2, 'senior', '2024-01-01', 80, 1)
      RETURNING id
    `, [testProjectIds[0], [testSkillIds[1], testSkillIds[0], testSkillIds[3]]]);

    const role2 = await db.query(`
      INSERT INTO project_roles (
        project_id, role_name, description, required_skills, minimum_experience_level,
        start_date, planned_allocation_percentage, max_assignments
      )
      VALUES ($1, 'Backend Developer', 'API and database development', $2, 'intermediate', '2024-01-01', 60, 2)
      RETURNING id
    `, [testProjectIds[0], [testSkillIds[2], testSkillIds[0], testSkillIds[3]]]);

    const role3 = await db.query(`
      INSERT INTO project_roles (
        project_id, role_name, description, required_skills, minimum_experience_level,
        start_date, planned_allocation_percentage, max_assignments
      )
      VALUES ($1, 'UI/UX Designer', 'Design user interfaces and experiences', $2, 'intermediate', '2024-01-01', 40, 1)
      RETURNING id
    `, [testProjectIds[0], [testSkillIds[4]]]);

    testRoleIds = [role1.rows[0].id, role2.rows[0].id, role3.rows[0].id];
  }

  async function cleanupTestData() {
    if (testProjectIds.length > 0) {
      await db.query('DELETE FROM resource_assignments WHERE project_id = ANY($1)', [testProjectIds]);
      await db.query('DELETE FROM project_roles WHERE project_id = ANY($1)', [testProjectIds]);
      await db.query('DELETE FROM projects WHERE id = ANY($1)', [testProjectIds]);
    }
    if (testEmployeeIds.length > 0) {
      await db.query('DELETE FROM employee_skills WHERE employee_id = ANY($1)', [testEmployeeIds]);
      await db.query('DELETE FROM employees WHERE id = ANY($1)', [testEmployeeIds]);
    }
    if (testSkillIds.length > 0) {
      await db.query('DELETE FROM skills WHERE id = ANY($1)', [testSkillIds]);
    }
    testProjectIds = [];
    testEmployeeIds = [];
    testRoleIds = [];
    testSkillIds = [];
  }

  describe('Skill Matching Algorithm', () => {
    test('should calculate accurate match scores based on skill proficiency', async () => {
      const matches = await service.findCandidatesForRole(
        testProjectIds[0], 
        testRoleIds[0], // Senior React Developer role
        { includeInactive: false, maxCandidates: 10 }
      );

      expect(matches).toBeDefined();
      expect(matches.length).toBeGreaterThan(0);

      // John Doe should have highest match score (expert in React, JS, TypeScript)
      const johnMatch = matches.find(m => m.employeeId === testEmployeeIds[0]);
      expect(johnMatch).toBeDefined();
      expect(johnMatch.matchScore).toBeGreaterThan(85); // High match

      // Jane Smith should have good match (expert React, senior JS)
      const janeMatch = matches.find(m => m.employeeId === testEmployeeIds[1]);
      expect(janeMatch).toBeDefined();
      expect(janeMatch.matchScore).toBeGreaterThan(75);

      // Bob Wilson should have lower match (UI designer with basic programming)
      const bobMatch = matches.find(m => m.employeeId === testEmployeeIds[2]);
      if (bobMatch) {
        expect(bobMatch.matchScore).toBeLessThan(50);
      }

      // Alice Brown (inactive) should not appear unless explicitly requested
      const aliceMatch = matches.find(m => m.employeeId === testEmployeeIds[3]);
      expect(aliceMatch).toBeUndefined();
    });

    test('should rank candidates by match score', async () => {
      const matches = await service.findCandidatesForRole(
        testProjectIds[0], 
        testRoleIds[0], // Senior React Developer
        { includeInactive: false }
      );

      expect(matches.length).toBeGreaterThan(1);

      // Verify descending order by match score
      for (let i = 0; i < matches.length - 1; i++) {
        expect(matches[i].matchScore).toBeGreaterThanOrEqual(matches[i + 1].matchScore);
      }
    });

    test('should include detailed skill matching information', async () => {
      const matches = await service.findCandidatesForRole(
        testProjectIds[0], 
        testRoleIds[0] // Senior React Developer (requires React, JS, TypeScript)
      );

      const topMatch = matches[0];
      expect(topMatch.skillMatches).toBeDefined();
      expect(topMatch.skillMatches.length).toBeGreaterThan(0);

      topMatch.skillMatches.forEach(skillMatch => {
        expect(skillMatch).toHaveProperty('skillId');
        expect(skillMatch).toHaveProperty('skillName');
        expect(skillMatch).toHaveProperty('required');
        expect(skillMatch).toHaveProperty('employeeProficiency');
        expect(skillMatch).toHaveProperty('matchStrength');
        expect(skillMatch.matchStrength).toBeGreaterThanOrEqual(0);
        expect(skillMatch.matchStrength).toBeLessThanOrEqual(100);
      });
    });

    test('should consider minimum experience level requirements', async () => {
      const matches = await service.findCandidatesForRole(
        testProjectIds[0], 
        testRoleIds[0], // Senior React Developer (minimum: senior)
        { respectMinimumLevel: true }
      );

      matches.forEach(match => {
        expect(match.meetsMinimumRequirements).toBe(true);
      });
    });

    test('should calculate availability-adjusted scores', async () => {
      // Create some existing assignments to affect availability
      await db.query(`
        INSERT INTO resource_assignments (
          employee_id, project_id, role_id, assignment_type, start_date, 
          planned_allocation_percentage, status
        ) VALUES ($1, $2, $3, 'employee', '2024-01-01', 60, 'active')
      `, [testEmployeeIds[0], testProjectIds[0], testRoleIds[1]]);

      const matches = await service.findCandidatesForRole(
        testProjectIds[0], 
        testRoleIds[0], // Different role
        { considerAvailability: true }
      );

      const johnMatch = matches.find(m => m.employeeId === testEmployeeIds[0]);
      expect(johnMatch).toBeDefined();
      expect(johnMatch.availabilityPercentage).toBe(40); // 100% - 60% existing
      expect(johnMatch.availabilityAdjustedScore).toBeLessThan(johnMatch.matchScore);
    });
  });

  describe('Role Matching Filters', () => {
    test('should filter by availability threshold', async () => {
      // Create assignment that uses most of employee's capacity
      await db.query(`
        INSERT INTO resource_assignments (
          employee_id, project_id, role_id, assignment_type, start_date, 
          planned_allocation_percentage, status
        ) VALUES ($1, $2, $3, 'employee', '2024-01-01', 90, 'active')
      `, [testEmployeeIds[0], testProjectIds[0], testRoleIds[1]]);

      const matches = await service.findCandidatesForRole(
        testProjectIds[0], 
        testRoleIds[0],
        { minAvailabilityPercentage: 50 }
      );

      // John should be filtered out due to low availability
      const johnMatch = matches.find(m => m.employeeId === testEmployeeIds[0]);
      expect(johnMatch).toBeUndefined();

      // Jane should still be available
      const janeMatch = matches.find(m => m.employeeId === testEmployeeIds[1]);
      expect(janeMatch).toBeDefined();
    });

    test('should filter by minimum skill match threshold', async () => {
      const matches = await service.findCandidatesForRole(
        testProjectIds[0], 
        testRoleIds[0], // Senior React Developer
        { minSkillMatchPercentage: 80 }
      );

      matches.forEach(match => {
        expect(match.matchScore).toBeGreaterThanOrEqual(80);
      });
    });

    test('should limit maximum candidates returned', async () => {
      const matches = await service.findCandidatesForRole(
        testProjectIds[0], 
        testRoleIds[0],
        { maxCandidates: 2 }
      );

      expect(matches.length).toBeLessThanOrEqual(2);
    });

    test('should include inactive employees when requested', async () => {
      const matchesWithInactive = await service.findCandidatesForRole(
        testProjectIds[0], 
        testRoleIds[0],
        { includeInactive: true }
      );

      const matchesWithoutInactive = await service.findCandidatesForRole(
        testProjectIds[0], 
        testRoleIds[0],
        { includeInactive: false }
      );

      expect(matchesWithInactive.length).toBeGreaterThan(matchesWithoutInactive.length);

      // Alice Brown (inactive) should be included
      const aliceMatch = matchesWithInactive.find(m => m.employeeId === testEmployeeIds[3]);
      expect(aliceMatch).toBeDefined();
    });
  });

  describe('Batch Role Matching', () => {
    test('should match employees to multiple roles simultaneously', async () => {
      const multiRoleMatches = await service.findCandidatesForMultipleRoles(
        testProjectIds[0],
        testRoleIds, // All three roles
        { maxCandidatesPerRole: 3 }
      );

      expect(multiRoleMatches).toHaveProperty(testRoleIds[0].toString());
      expect(multiRoleMatches).toHaveProperty(testRoleIds[1].toString());
      expect(multiRoleMatches).toHaveProperty(testRoleIds[2].toString());

      Object.keys(multiRoleMatches).forEach(roleId => {
        expect(multiRoleMatches[roleId]).toBeInstanceOf(Array);
        expect(multiRoleMatches[roleId].length).toBeLessThanOrEqual(3);
      });
    });

    test('should optimize assignments across roles to avoid conflicts', async () => {
      const optimizedAssignments = await service.optimizeRoleAssignments(
        testProjectIds[0],
        testRoleIds
      );

      expect(optimizedAssignments.assignments).toBeDefined();
      expect(optimizedAssignments.totalOptimizationScore).toBeGreaterThan(0);
      expect(optimizedAssignments.unassignedRoles).toBeInstanceOf(Array);

      // Verify no employee is over-allocated
      const employeeAllocations = new Map();
      optimizedAssignments.assignments.forEach(assignment => {
        const current = employeeAllocations.get(assignment.employeeId) || 0;
        employeeAllocations.set(assignment.employeeId, current + assignment.plannedAllocationPercentage);
      });

      employeeAllocations.forEach(allocation => {
        expect(allocation).toBeLessThanOrEqual(100);
      });
    });
  });

  describe('Skill Gap Analysis', () => {
    test('should identify missing skills for project', async () => {
      const gapAnalysis = await service.analyzeSkillGaps(testProjectIds[0]);

      expect(gapAnalysis.projectSkillRequirements).toBeDefined();
      expect(gapAnalysis.availableSkills).toBeDefined();
      expect(gapAnalysis.skillGaps).toBeDefined();
      expect(gapAnalysis.recommendations).toBeDefined();

      gapAnalysis.skillGaps.forEach(gap => {
        expect(gap).toHaveProperty('skillId');
        expect(gap).toHaveProperty('skillName');
        expect(gap).toHaveProperty('requiredLevel');
        expect(gap).toHaveProperty('availableLevel');
        expect(gap).toHaveProperty('gapSeverity');
      });
    });

    test('should suggest training or hiring recommendations', async () => {
      const gapAnalysis = await service.analyzeSkillGaps(testProjectIds[0]);

      expect(gapAnalysis.recommendations.training).toBeDefined();
      expect(gapAnalysis.recommendations.hiring).toBeDefined();

      if (gapAnalysis.recommendations.training.length > 0) {
        gapAnalysis.recommendations.training.forEach(rec => {
          expect(rec).toHaveProperty('employeeId');
          expect(rec).toHaveProperty('skillId');
          expect(rec).toHaveProperty('currentLevel');
          expect(rec).toHaveProperty('targetLevel');
          expect(rec).toHaveProperty('estimatedTimeMonths');
        });
      }
    });
  });

  describe('Performance and Caching', () => {
    test('should cache skill matching calculations for performance', async () => {
      const startTime = Date.now();
      const firstCall = await service.findCandidatesForRole(testProjectIds[0], testRoleIds[0]);
      const firstCallTime = Date.now() - startTime;

      const secondCallStart = Date.now();
      const secondCall = await service.findCandidatesForRole(testProjectIds[0], testRoleIds[0]);
      const secondCallTime = Date.now() - secondCallStart;

      // Second call should be faster due to caching
      expect(secondCallTime).toBeLessThan(firstCallTime);
      expect(firstCall).toEqual(secondCall); // Results should be identical
    });

    test('should handle large datasets efficiently', async () => {
      // Create additional test data to simulate larger dataset
      const additionalEmployees = [];
      for (let i = 0; i < 50; i++) {
        const emp = await db.query(`
          INSERT INTO employees (first_name, last_name, email, position, department_id) 
          VALUES ($1, $2, $3, $4, 1)
          RETURNING id
        `, [`Test${i}`, `User${i}`, `test${i}@test.com`, 'Developer']);
        additionalEmployees.push(emp.rows[0].id);

        // Add random skills
        await db.query(`
          INSERT INTO employee_skills (employee_id, skill_id, proficiency_level, years_experience) 
          VALUES ($1, $2, $3, $4)
        `, [emp.rows[0].id, testSkillIds[Math.floor(Math.random() * testSkillIds.length)], 
            ['junior', 'intermediate', 'senior', 'expert'][Math.floor(Math.random() * 4)], 
            Math.floor(Math.random() * 10) + 1]);
      }

      const startTime = Date.now();
      const matches = await service.findCandidatesForRole(testProjectIds[0], testRoleIds[0]);
      const executionTime = Date.now() - startTime;

      expect(matches).toBeDefined();
      expect(executionTime).toBeLessThan(5000); // Should complete within 5 seconds

      // Clean up additional test data
      await db.query('DELETE FROM employee_skills WHERE employee_id = ANY($1)', [additionalEmployees]);
      await db.query('DELETE FROM employees WHERE id = ANY($1)', [additionalEmployees]);
    });
  });

  describe('Error Handling', () => {
    test('should handle invalid project ID', async () => {
      await expect(service.findCandidatesForRole(99999, testRoleIds[0]))
        .rejects.toThrow('Project not found');
    });

    test('should handle invalid role ID', async () => {
      await expect(service.findCandidatesForRole(testProjectIds[0], 99999))
        .rejects.toThrow('Project role not found');
    });

    test('should handle role with no required skills', async () => {
      // Create role with empty skills array
      const emptySkillRole = await db.query(`
        INSERT INTO project_roles (
          project_id, role_name, description, required_skills, minimum_experience_level,
          start_date, planned_allocation_percentage, max_assignments
        )
        VALUES ($1, 'General Helper', 'No specific skills required', $2, 'junior', '2024-01-01', 20, 5)
        RETURNING id
      `, [testProjectIds[0], []]);

      const matches = await service.findCandidatesForRole(
        testProjectIds[0], 
        emptySkillRole.rows[0].id
      );

      expect(matches).toBeDefined();
      // Should return all available employees since no skills are required
      expect(matches.length).toBeGreaterThan(0);
    });

    test('should handle database connection errors gracefully', async () => {
      const originalQuery = db.query;
      db.query = () => Promise.reject(new Error('Database connection lost'));

      await expect(service.findCandidatesForRole(testProjectIds[0], testRoleIds[0]))
        .rejects.toThrow('Database connection lost');

      db.query = originalQuery;
    });
  });
});