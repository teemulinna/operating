#!/usr/bin/env ts-node

import { 
  initializeDatabase, 
  runMigrations, 
  seedDatabase, 
  closeDatabase,
  DepartmentModel,
  SkillModel,
  EmployeeModel,
  EmployeeSkillModel,
  CapacityHistoryModel
} from '../src/database';
import { 
  SkillCategory, 
  ProficiencyLevel,
  CreateEmployeeInput,
  CreateEmployeeSkillInput,
  CreateCapacityHistoryInput
} from '../src/types';

async function testDatabaseOperations() {
  console.log('🚀 Starting database tests...\n');

  try {
    // Initialize database
    console.log('1. Initializing database...');
    await initializeDatabase();
    console.log('✅ Database initialized\n');

    // Run migrations
    console.log('2. Running migrations...');
    await runMigrations();
    console.log('✅ Migrations completed\n');

    // Seed database
    console.log('3. Seeding database...');
    await seedDatabase();
    console.log('✅ Database seeded\n');

    // Test Department operations
    console.log('4. Testing Department operations...');
    const departments = await DepartmentModel.findAll();
    console.log(`   Found ${departments.length} departments`);
    
    const engineeringDept = departments.find(d => d.name === 'Engineering');
    if (engineeringDept) {
      console.log(`   Engineering department: ${engineeringDept.name} (${engineeringDept.id})`);
    }
    console.log('✅ Department operations successful\n');

    // Test Skill operations
    console.log('5. Testing Skill operations...');
    const skills = await SkillModel.findAll();
    console.log(`   Found ${skills.length} skills`);
    
    const technicalSkills = await SkillModel.findByCategory(SkillCategory.TECHNICAL);
    console.log(`   Technical skills: ${technicalSkills.length}`);
    
    const jsSkill = technicalSkills.find(s => s.name === 'JavaScript');
    console.log(`   JavaScript skill found: ${jsSkill ? 'Yes' : 'No'}`);
    console.log('✅ Skill operations successful\n');

    // Test Employee operations
    console.log('6. Testing Employee operations...');
    if (engineeringDept) {
      const newEmployeeData: CreateEmployeeInput = {
        firstName: 'John',
        lastName: 'Developer',
        email: 'john.developer@company.com',
        departmentId: engineeringDept.id,
        position: 'Senior Software Engineer',
        hireDate: new Date('2023-01-15')
      };
      
      const newEmployee = await EmployeeModel.create(newEmployeeData);
      console.log(`   Created employee: ${newEmployee.firstName} ${newEmployee.lastName} (${newEmployee.id})`);

      // Test employee with details
      const employeeDetails = await EmployeeModel.findByIdWithDetails(newEmployee.id);
      console.log(`   Employee department: ${employeeDetails?.department.name}`);
      console.log('✅ Employee operations successful\n');

      // Test Employee Skill operations
      console.log('7. Testing Employee Skill operations...');
      if (jsSkill) {
        const employeeSkillData: CreateEmployeeSkillInput = {
          employeeId: newEmployee.id,
          skillId: jsSkill.id,
          proficiencyLevel: ProficiencyLevel.ADVANCED,
          yearsOfExperience: 4,
          lastAssessed: new Date()
        };

        const employeeSkill = await EmployeeSkillModel.create(employeeSkillData);
        console.log(`   Assigned skill: ${jsSkill.name} (Level ${employeeSkill.proficiencyLevel})`);

        // Get employee skills
        const employeeSkills = await EmployeeSkillModel.findByEmployee(newEmployee.id);
        console.log(`   Employee has ${employeeSkills.length} skills`);
      }
      console.log('✅ Employee Skill operations successful\n');

      // Test Capacity History operations
      console.log('8. Testing Capacity History operations...');
      const capacityData: CreateCapacityHistoryInput = {
        employeeId: newEmployee.id,
        date: new Date('2023-08-15'),
        availableHours: 40,
        allocatedHours: 35,
        notes: 'Regular work week'
      };

      const capacityEntry = await CapacityHistoryModel.create(capacityData);
      console.log(`   Created capacity entry: ${capacityEntry.utilizationRate * 100}% utilization`);

      // Get utilization summary
      const summary = await CapacityHistoryModel.getUtilizationSummary(newEmployee.id);
      console.log(`   Average utilization: ${(summary.averageUtilization * 100).toFixed(1)}%`);
      console.log('✅ Capacity History operations successful\n');

    } else {
      console.log('⚠️  Skipping employee tests - Engineering department not found\n');
    }

    // Test statistics
    console.log('9. Testing statistics...');
    const deptStats = await DepartmentModel.getStatistics();
    console.log(`   Total departments: ${deptStats.totalDepartments}`);
    console.log(`   Active departments: ${deptStats.activeDepartments}`);

    const skillStats = await SkillModel.getStatistics();
    console.log(`   Total skills: ${skillStats.totalSkills}`);
    console.log(`   Technical skills: ${skillStats.skillsByCategory[SkillCategory.TECHNICAL] || 0}`);

    const empStats = await EmployeeModel.getStatistics();
    console.log(`   Total employees: ${empStats.totalEmployees}`);
    console.log(`   Active employees: ${empStats.activeEmployees}`);
    console.log('✅ Statistics operations successful\n');

    console.log('🎉 All database tests passed successfully!');
    
  } catch (error) {
    console.error('❌ Database test failed:', error);
    throw error;
  } finally {
    // Clean up
    console.log('\n10. Cleaning up...');
    await closeDatabase();
    console.log('✅ Database connection closed');
  }
}

if (require.main === module) {
  testDatabaseOperations()
    .then(() => {
      console.log('✅ Test completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Test failed:', error);
      process.exit(1);
    });
}