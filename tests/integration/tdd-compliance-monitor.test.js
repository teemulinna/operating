/**
 * TDD Compliance Monitor Tests
 * Validates that all teams follow Test-Driven Development practices
 */

const TDDCoordinator = require('../tdd-coordinator');
const testContracts = require('../shared/test-contracts');
const testData = require('../fixtures/shared-test-data.json');

describe('TDD Compliance Monitor', () => {
  let tddCoordinator;
  
  beforeEach(() => {
    tddCoordinator = new TDDCoordinator();
    tddCoordinator.setupIntegrationContracts();
    tddCoordinator.createSharedTestFixtures();
  });

  describe('Test-First Validation', () => {
    it('should validate that tests are written before implementation', async () => {
      const testFiles = [
        'tests/database/user.test.js',
        'tests/database/project.test.js'
      ];
      const implementationFiles = [
        'src/database/models/user.js',
        'src/database/models/project.js'
      ];

      const isCompliant = await tddCoordinator.validateTestsFirst(
        'database', testFiles, implementationFiles
      );

      expect(isCompliant).toBe(true);
      expect(tddCoordinator.complianceReport.database.testsFirst).toBe(true);
      expect(tddCoordinator.complianceReport.database.violations).toHaveLength(0);
    });

    it('should detect violations when implementation comes before tests', async () => {
      const testFiles = ['tests/backend/users.api.test.js'];
      const implementationFiles = ['src/api/routes/users.js'];

      // Mock timestamps to simulate implementation before tests
      jest.spyOn(tddCoordinator, 'getFileTimestamps').mockResolvedValue({
        'tests/backend/users.api.test.js': new Date('2024-01-02'),
        'src/api/routes/users.js': new Date('2024-01-01')
      });

      const isCompliant = await tddCoordinator.validateTestsFirst(
        'backend', testFiles, implementationFiles
      );

      expect(isCompliant).toBe(false);
      expect(tddCoordinator.complianceReport.backend.testsFirst).toBe(false);
      expect(tddCoordinator.complianceReport.backend.violations).toContain(
        expect.stringContaining('written after implementation')
      );
    });

    it('should detect missing test files', async () => {
      const testFiles = ['tests/frontend/auth.component.test.js'];
      const implementationFiles = [
        'src/components/Auth.jsx',
        'src/components/UserList.jsx' // Missing corresponding test
      ];

      const isCompliant = await tddCoordinator.validateTestsFirst(
        'frontend', testFiles, implementationFiles
      );

      expect(isCompliant).toBe(false);
      expect(tddCoordinator.complianceReport.frontend.violations).toContain(
        expect.stringContaining('Missing test file')
      );
    });
  });

  describe('Test Coverage Validation', () => {
    it('should validate minimum 90% test coverage', async () => {
      const coverageData = {
        total: 95,
        branches: 92,
        functions: 94,
        lines: 96
      };

      const isValid = await tddCoordinator.validateTestCoverage('database', coverageData);

      expect(isValid).toBe(true);
      expect(tddCoordinator.complianceReport.database.coverage).toBe(95);
    });

    it('should flag insufficient test coverage', async () => {
      const coverageData = {
        total: 85,
        branches: 80,
        functions: 87,
        lines: 88
      };

      const isValid = await tddCoordinator.validateTestCoverage('backend', coverageData);

      expect(isValid).toBe(false);
      expect(tddCoordinator.complianceReport.backend.violations).toContain(
        expect.stringContaining('coverage 85% below minimum 90%')
      );
    });
  });

  describe('Integration Contract Validation', () => {
    it('should validate database-backend integration contracts', () => {
      const contract = tddCoordinator.integrationContracts['database-backend'];
      
      expect(contract.name).toBe('Database-Backend Integration');
      expect(contract.contracts).toContain('User schema validation');
      expect(contract.contracts).toContain('Project schema validation');
      expect(contract.contracts).toContain('Resource schema validation');
      expect(contract.testStatus).toBe('pending');
    });

    it('should validate backend-frontend integration contracts', () => {
      const contract = tddCoordinator.integrationContracts['backend-frontend'];
      
      expect(contract.name).toBe('Backend-Frontend Integration');
      expect(contract.contracts).toContain('REST API endpoint contracts');
      expect(contract.contracts).toContain('Authentication flow validation');
      expect(contract.contracts).toContain('WebSocket communication');
    });

    it('should track integration test completion', () => {
      // Simulate completing integration tests
      tddCoordinator.integrationContracts['database-backend'].testStatus = 'completed';
      
      const report = tddCoordinator.generateComplianceReport();
      
      expect(report.integration.completedScenarios).toBeGreaterThan(0);
    });
  });

  describe('Shared Test Data Validation', () => {
    it('should provide consistent test fixtures', () => {
      expect(tddCoordinator.sharedTestData.users).toBeDefined();
      expect(tddCoordinator.sharedTestData.projects).toBeDefined();
      expect(tddCoordinator.sharedTestData.resources).toBeDefined();
      
      // Validate data structure
      expect(tddCoordinator.sharedTestData.users[0]).toHaveProperty('id');
      expect(tddCoordinator.sharedTestData.users[0]).toHaveProperty('name');
      expect(tddCoordinator.sharedTestData.users[0]).toHaveProperty('email');
      expect(tddCoordinator.sharedTestData.users[0]).toHaveProperty('role');
    });

    it('should include error scenario test data', () => {
      expect(tddCoordinator.sharedTestData.errorScenarios).toBeDefined();
      expect(tddCoordinator.sharedTestData.errorScenarios.invalidData).toBeDefined();
      expect(tddCoordinator.sharedTestData.errorScenarios.unauthorized).toBeDefined();
    });
  });

  describe('Team Progress Monitoring', () => {
    it('should monitor database team TDD progress', async () => {
      const progressData = {
        testFiles: ['tests/database/user.test.js'],
        implementationFiles: ['src/database/models/user.js'],
        coverage: { total: 92 }
      };

      await tddCoordinator.monitorTeamProgress('database', progressData);

      expect(tddCoordinator.complianceReport.database.testsFirst).toBe(true);
      expect(tddCoordinator.complianceReport.database.coverage).toBe(92);
    });

    it('should monitor backend team TDD progress', async () => {
      const progressData = {
        testFiles: ['tests/backend/auth.test.js', 'tests/backend/users.api.test.js'],
        implementationFiles: ['src/api/auth.js', 'src/api/routes/users.js'],
        coverage: { total: 88 }
      };

      await tddCoordinator.monitorTeamProgress('backend', progressData);

      expect(tddCoordinator.complianceReport.backend.violations).toContain(
        expect.stringContaining('coverage 88% below minimum')
      );
    });

    it('should monitor frontend team TDD progress', async () => {
      const progressData = {
        testFiles: ['tests/frontend/auth.component.test.js'],
        implementationFiles: ['src/components/Auth.jsx'],
        coverage: { total: 94 }
      };

      await tddCoordinator.monitorTeamProgress('frontend', progressData);

      expect(tddCoordinator.complianceReport.frontend.testsFirst).toBe(true);
      expect(tddCoordinator.complianceReport.frontend.coverage).toBe(94);
    });
  });

  describe('Compliance Reporting', () => {
    it('should generate comprehensive compliance report', () => {
      // Setup test data
      tddCoordinator.complianceReport.database = {
        testsFirst: true,
        coverage: 95,
        violations: []
      };
      tddCoordinator.complianceReport.backend = {
        testsFirst: false,
        coverage: 87,
        violations: ['Implementation before tests', 'Coverage below 90%']
      };
      tddCoordinator.complianceReport.frontend = {
        testsFirst: true,
        coverage: 92,
        violations: []
      };

      const report = tddCoordinator.generateComplianceReport();

      expect(report.overall.compliant).toBe(false);
      expect(report.overall.totalViolations).toBe(2);
      expect(report.overall.averageCoverage).toBeCloseTo(91.33, 1);
      expect(report.recommendations).toContain('BACKEND: Implement strict test-first development');
      expect(report.recommendations).toContain('BACKEND: Increase test coverage to minimum 90%');
    });

    it('should mark as compliant when all teams follow TDD', () => {
      // Setup compliant test data
      ['database', 'backend', 'frontend'].forEach(team => {
        tddCoordinator.complianceReport[team] = {
          testsFirst: true,
          coverage: 93,
          violations: []
        };
      });

      const report = tddCoordinator.generateComplianceReport();

      expect(report.overall.compliant).toBe(true);
      expect(report.overall.totalViolations).toBe(0);
      expect(report.recommendations).toHaveLength(0);
    });
  });

  describe('Quality Gates', () => {
    it('should enforce quality gates from test contracts', () => {
      const qualityGates = testContracts.qualityGates;
      
      expect(qualityGates.coverage.minimum).toBe(90);
      expect(qualityGates.performance.database.queryTime).toBe(50);
      expect(qualityGates.performance.backend.responseTime).toBe(200);
      expect(qualityGates.performance.frontend.renderTime).toBe(16);
    });

    it('should validate security requirements', () => {
      const securityGates = testContracts.qualityGates.security;
      
      expect(securityGates.authentication).toBe('required');
      expect(securityGates.authorization).toBe('role-based');
      expect(securityGates.inputValidation).toBe('sanitized');
      expect(securityGates.sqlInjection).toBe('prevented');
      expect(securityGates.xss).toBe('prevented');
    });
  });
});