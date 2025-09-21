import { DatabaseService } from '../src/database/database.service';
import { EmployeeService } from '../src/services/employee.service';
import { ProjectService } from '../src/services/project.service';
import { AllocationService } from '../src/services/allocation.service';

/**
 * Comprehensive database integration validation script
 * Validates all CRUD operations connect to real database
 */
async function validateDatabaseIntegration() {
  console.log('🔍 Starting Database Integration Validation...\n');
  
  const db = DatabaseService.getInstance();
  let testResults = {
    passed: 0,
    failed: 0,
    errors: [] as string[]
  };

  try {
    // Connect to database
    await db.connect();
    console.log('✅ Database connection established');
    testResults.passed++;

    // Test 1: Validate database health
    console.log('\n📊 Testing database health...');
    const isHealthy = await db.checkHealth();
    if (isHealthy) {
      console.log('✅ Database health check passed');
      testResults.passed++;
    } else {
      console.log('❌ Database health check failed');
      testResults.failed++;
      testResults.errors.push('Database health check failed');
    }

    // Test 2: Validate schema exists
    console.log('\n📋 Validating database schema...');
    const schemaResult = await db.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
        AND table_name IN ('employees', 'projects', 'resource_allocations', 'departments')
      ORDER BY table_name
    `);
    
    const requiredTables = ['departments', 'employees', 'projects', 'resource_allocations'];
    const existingTables = schemaResult.rows.map(row => row.table_name);
    const missingTables = requiredTables.filter(table => !existingTables.includes(table));
    
    if (missingTables.length === 0) {
      console.log('✅ All required tables exist:', existingTables.join(', '));
      testResults.passed++;
    } else {
      console.log('❌ Missing tables:', missingTables.join(', '));
      testResults.failed++;
      testResults.errors.push(`Missing tables: ${missingTables.join(', ')}`);
    }

    // Test 3: Validate Employee CRUD operations
    console.log('\n👥 Testing Employee CRUD operations...');
    const employeeService = new EmployeeService();
    
    // Create test employee
    const testEmployee = {
      firstName: 'Database',
      lastName: 'TestUser',
      email: `test-${Date.now()}@example.com`,
      position: 'Test Engineer',
      departmentId: 'e85e5cfe-1970-4ea8-98c8-4a59b7587a52', // Use actual department ID
      salary: 75000,
      skills: ['Testing', 'Database Validation']
    };

    try {
      const createdEmployee = await employeeService.createEmployee(testEmployee);
      console.log('✅ Employee creation successful:', createdEmployee.id);
      testResults.passed++;

      // Read employee
      const retrievedEmployee = await employeeService.getEmployeeById(createdEmployee.id);
      if (retrievedEmployee && retrievedEmployee.email === testEmployee.email) {
        console.log('✅ Employee retrieval successful');
        testResults.passed++;
      } else {
        console.log('❌ Employee retrieval failed');
        testResults.failed++;
        testResults.errors.push('Employee retrieval failed');
      }

      // Update employee
      const updatedEmployee = await employeeService.updateEmployee(createdEmployee.id, {
        position: 'Senior Test Engineer'
      });
      if (updatedEmployee.position === 'Senior Test Engineer') {
        console.log('✅ Employee update successful');
        testResults.passed++;
      } else {
        console.log('❌ Employee update failed');
        testResults.failed++;
        testResults.errors.push('Employee update failed');
      }

      // Delete employee
      await employeeService.deleteEmployee(createdEmployee.id);
      const deletedEmployee = await employeeService.getEmployeeById(createdEmployee.id);
      if (!deletedEmployee) {
        console.log('✅ Employee deletion successful');
        testResults.passed++;
      } else {
        console.log('❌ Employee deletion failed');
        testResults.failed++;
        testResults.errors.push('Employee deletion failed');
      }

    } catch (error) {
      console.log('❌ Employee CRUD operations failed:', error.message);
      testResults.failed++;
      testResults.errors.push(`Employee CRUD error: ${error.message}`);
    }

    // Test 4: Validate Project CRUD operations
    console.log('\n📋 Testing Project CRUD operations...');
    const projectService = new ProjectService();

    const testProject = {
      name: `Database Integration Test Project ${Date.now()}`,
      description: 'Test project for database validation',
      client_name: 'Test Client',
      start_date: new Date().toISOString().split('T')[0],
      end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      status: 'planning',
      priority: 'medium',
      budget: 50000,
      estimated_hours: 400
    };

    try {
      const createdProject = await projectService.createProject(testProject);
      console.log('✅ Project creation successful:', createdProject.id);
      testResults.passed++;

      // Read project
      const retrievedProject = await projectService.getProjectById(createdProject.id);
      if (retrievedProject && retrievedProject.name === testProject.name) {
        console.log('✅ Project retrieval successful');
        testResults.passed++;
      } else {
        console.log('❌ Project retrieval failed');
        testResults.failed++;
        testResults.errors.push('Project retrieval failed');
      }

      // Update project
      const updatedProject = await projectService.updateProject(createdProject.id, {
        status: 'active'
      });
      if (updatedProject.status === 'active') {
        console.log('✅ Project update successful');
        testResults.passed++;
      } else {
        console.log('❌ Project update failed');
        testResults.failed++;
        testResults.errors.push('Project update failed');
      }

      // Clean up project
      await projectService.deleteProject(createdProject.id);
      console.log('✅ Project cleanup completed');
      testResults.passed++;

    } catch (error) {
      console.log('❌ Project CRUD operations failed:', error.message);
      testResults.failed++;
      testResults.errors.push(`Project CRUD error: ${error.message}`);
    }

    // Test 5: Validate foreign key constraints
    console.log('\n🔗 Testing foreign key constraints...');
    
    try {
      // Try to create employee with invalid department
      const invalidEmployee = {
        firstName: 'Invalid',
        lastName: 'Employee',
        email: `invalid-${Date.now()}@example.com`,
        position: 'Test Position',
        departmentId: '999999', // Invalid department ID
        salary: 50000,
        skills: []
      };

      try {
        await employeeService.createEmployee(invalidEmployee);
        console.log('❌ Foreign key constraint not enforced (employee with invalid department created)');
        testResults.failed++;
        testResults.errors.push('Foreign key constraint not enforced for employee.department_id');
      } catch (fkError) {
        console.log('✅ Foreign key constraint enforced (employee with invalid department rejected)');
        testResults.passed++;
      }

    } catch (error) {
      console.log('❌ Foreign key constraint test failed:', error.message);
      testResults.failed++;
      testResults.errors.push(`Foreign key constraint test error: ${error.message}`);
    }

    // Test 6: Test query performance with real data
    console.log('\n⚡ Testing query performance...');
    const startTime = Date.now();
    const employees = await employeeService.getEmployees({ page: 1, limit: 10 });
    const queryTime = Date.now() - startTime;
    
    console.log(`✅ Employee query completed in ${queryTime}ms`);
    console.log(`📊 Found ${employees.pagination.totalItems} total employees`);
    testResults.passed++;

    // Test 7: Validate database connections are real (not mocked)
    console.log('\n🔍 Validating real database connections...');
    const connectionResult = await db.query('SELECT version()');
    const pgVersion = connectionResult.rows[0].version;
    
    if (pgVersion.includes('PostgreSQL')) {
      console.log('✅ Connected to real PostgreSQL database:', pgVersion.split(' ')[1]);
      testResults.passed++;
    } else {
      console.log('❌ Database connection may be mocked or not PostgreSQL');
      testResults.failed++;
      testResults.errors.push('Database connection verification failed');
    }

  } catch (error) {
    console.error('❌ Database integration validation failed:', error);
    testResults.failed++;
    testResults.errors.push(`Integration test error: ${error.message}`);
  } finally {
    await db.disconnect();
  }

  // Print results summary
  console.log('\n' + '='.repeat(60));
  console.log('📋 DATABASE INTEGRATION VALIDATION RESULTS');
  console.log('='.repeat(60));
  console.log(`✅ Tests Passed: ${testResults.passed}`);
  console.log(`❌ Tests Failed: ${testResults.failed}`);
  console.log(`📊 Success Rate: ${((testResults.passed / (testResults.passed + testResults.failed)) * 100).toFixed(1)}%`);
  
  if (testResults.errors.length > 0) {
    console.log('\n🚨 ERRORS FOUND:');
    testResults.errors.forEach((error, index) => {
      console.log(`${index + 1}. ${error}`);
    });
  }

  if (testResults.failed === 0) {
    console.log('\n🎉 ALL DATABASE OPERATIONS VERIFIED - USING REAL DATABASE CONNECTIONS!');
  } else {
    console.log('\n⚠️  DATABASE INTEGRATION ISSUES DETECTED - REVIEW REQUIRED');
  }

  return {
    success: testResults.failed === 0,
    results: testResults
  };
}

// Self-executing validation
if (require.main === module) {
  validateDatabaseIntegration()
    .then((result) => {
      process.exit(result.success ? 0 : 1);
    })
    .catch((error) => {
      console.error('Database integration validation crashed:', error);
      process.exit(1);
    });
}

export { validateDatabaseIntegration };