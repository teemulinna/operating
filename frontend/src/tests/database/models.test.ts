import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from '@jest/globals';
import { db } from '../../database/connection';
import { departmentModel, Department } from '../../models/Department';
import { employeeModel, Employee } from '../../models/Employee';
import { skillModel, Skill } from '../../models/Skill';
import { employeeSkillModel, EmployeeSkill } from '../../models/EmployeeSkill';
import { capacityHistoryModel, CapacityHistory } from '../../models/CapacityHistory';

describe('Database Models', () => {
  let testDepartment: Department;
  let testEmployee: Employee;
  let testSkill: Skill;
  let testEmployeeSkill: EmployeeSkill;
  let testCapacityHistory: CapacityHistory;

  beforeAll(async () => {
    await db.connect();
  });

  afterAll(async () => {
    await db.disconnect();
  });

  beforeEach(async () => {
    // Clean up test data before each test
    await db.query('TRUNCATE TABLE capacity_history CASCADE');
    await db.query('TRUNCATE TABLE employee_skills CASCADE');
    await db.query('TRUNCATE TABLE employees CASCADE');
    await db.query('TRUNCATE TABLE departments CASCADE');
    await db.query('TRUNCATE TABLE skills CASCADE');
  });

  describe('Department Model', () => {
    it('should create a new department', async () => {
      const departmentData = {
        name: 'Test Engineering',
        description: 'Test department for engineering',
        budget: 100000,
        location: 'Test City',
        is_active: true
      };

      testDepartment = await departmentModel.create(departmentData);

      expect(testDepartment.id).toBeDefined();
      expect(testDepartment.name).toBe(departmentData.name);
      expect(testDepartment.budget).toBe(departmentData.budget);
      expect(testDepartment.is_active).toBe(true);
      expect(testDepartment.created_at).toBeInstanceOf(Date);
    });

    it('should find department by name', async () => {
      const departmentData = {
        name: 'Test Marketing',
        description: 'Test marketing department',
        budget: 50000,
        location: 'Remote'
      };

      await departmentModel.create(departmentData);
      const found = await departmentModel.findByName('Test Marketing');

      expect(found).toBeTruthy();
      expect(found!.name).toBe('Test Marketing');
      expect(found!.budget).toBe(50000);
    });

    it('should update department information', async () => {
      const dept = await departmentModel.create({
        name: 'Test Sales',
        description: 'Original description',
        budget: 75000
      });

      const updated = await departmentModel.update(dept.id, {
        description: 'Updated description',
        budget: 85000
      }, 'test-user');

      expect(updated!.description).toBe('Updated description');
      expect(updated!.budget).toBe(85000);
      expect(updated!.updated_at.getTime()).toBeGreaterThan(dept.created_at.getTime());
    });

    it('should soft delete department', async () => {
      const dept = await departmentModel.create({
        name: 'Test Delete Dept',
        description: 'To be deleted'
      });

      const deleted = await departmentModel.delete(dept.id, 'test-user');
      expect(deleted).toBe(true);

      const found = await departmentModel.findById(dept.id);
      expect(found).toBeNull();

      // Should find with includeDeleted option
      const foundDeleted = await departmentModel.findById(dept.id, { includeDeleted: true });
      expect(foundDeleted).toBeTruthy();
      expect(foundDeleted!.deleted_at).toBeInstanceOf(Date);
    });

    it('should get department statistics', async () => {
      await Promise.all([
        departmentModel.create({ name: 'Active Dept 1', budget: 100000, is_active: true }),
        departmentModel.create({ name: 'Active Dept 2', budget: 150000, is_active: true }),
        departmentModel.create({ name: 'Inactive Dept', budget: 50000, is_active: false })
      ]);

      const stats = await departmentModel.getDepartmentStats();

      expect(stats.total_departments).toBe(3);
      expect(stats.active_departments).toBe(2);
      expect(stats.total_budget).toBe(300000);
    });
  });

  describe('Employee Model', () => {
    beforeEach(async () => {
      testDepartment = await departmentModel.create({
        name: 'Test Department',
        description: 'For employee tests'
      });
    });

    it('should create a new employee', async () => {
      const employeeData = {
        employee_number: 'EMP001001',
        first_name: 'John',
        last_name: 'Doe',
        email: 'john.doe@example.com',
        hire_date: new Date('2023-01-15'),
        department_id: testDepartment.id,
        position_title: 'Software Engineer',
        employment_type: 'FULL_TIME' as const,
        salary: 75000,
        weekly_capacity_hours: 40
      };

      testEmployee = await employeeModel.create(employeeData);

      expect(testEmployee.id).toBeDefined();
      expect(testEmployee.first_name).toBe('John');
      expect(testEmployee.last_name).toBe('Doe');
      expect(testEmployee.email).toBe('john.doe@example.com');
      expect(testEmployee.salary).toBe(75000);
      expect(testEmployee.is_active).toBe(true);
    });

    it('should find employee by email', async () => {
      const employee = await employeeModel.create({
        employee_number: 'EMP001002',
        first_name: 'Jane',
        last_name: 'Smith',
        email: 'jane.smith@example.com',
        hire_date: new Date(),
        position_title: 'Product Manager',
        employment_type: 'FULL_TIME',
        salary: 90000
      });

      const found = await employeeModel.findByEmail('jane.smith@example.com');
      expect(found).toBeTruthy();
      expect(found!.first_name).toBe('Jane');
      expect(found!.last_name).toBe('Smith');
    });

    it('should generate unique employee numbers', async () => {
      const empNumber1 = await employeeModel.generateEmployeeNumber();
      const empNumber2 = await employeeModel.generateEmployeeNumber();

      expect(empNumber1).toMatch(/^EMP\d{6}$/);
      expect(empNumber2).toMatch(/^EMP\d{6}$/);
      expect(empNumber1).not.toBe(empNumber2);
    });

    it('should find employee with department details', async () => {
      const employee = await employeeModel.create({
        employee_number: 'EMP001003',
        first_name: 'Bob',
        last_name: 'Johnson',
        email: 'bob.johnson@example.com',
        hire_date: new Date(),
        department_id: testDepartment.id,
        position_title: 'Senior Developer',
        employment_type: 'FULL_TIME',
        salary: 85000
      });

      const withDepartment = await employeeModel.findWithDepartment(employee.id);
      expect(withDepartment).toBeTruthy();
      expect(withDepartment!.department).toBeTruthy();
      expect(withDepartment!.department!.name).toBe('Test Department');
    });

    it('should terminate and rehire employee', async () => {
      const employee = await employeeModel.create({
        employee_number: 'EMP001004',
        first_name: 'Alice',
        last_name: 'Brown',
        email: 'alice.brown@example.com',
        hire_date: new Date(),
        position_title: 'Designer',
        employment_type: 'FULL_TIME',
        salary: 70000
      });

      const terminationDate = new Date('2023-12-31');
      const terminated = await employeeModel.terminate(employee.id, terminationDate);

      expect(terminated!.termination_date).toEqual(terminationDate);
      expect(terminated!.is_active).toBe(false);

      const rehired = await employeeModel.rehire(employee.id);
      expect(rehired!.termination_date).toBeUndefined();
      expect(rehired!.is_active).toBe(true);
    });
  });

  describe('Skill Model', () => {
    it('should create a new skill', async () => {
      const skillData = {
        name: 'JavaScript',
        description: 'Modern JavaScript programming',
        category: 'Programming Languages',
        is_technical: true,
        proficiency_levels: ['Beginner', 'Intermediate', 'Advanced', 'Expert']
      };

      testSkill = await skillModel.create(skillData);

      expect(testSkill.id).toBeDefined();
      expect(testSkill.name).toBe('JavaScript');
      expect(testSkill.category).toBe('Programming Languages');
      expect(testSkill.is_technical).toBe(true);
      expect(testSkill.proficiency_levels).toEqual(skillData.proficiency_levels);
    });

    it('should find skills by category', async () => {
      await Promise.all([
        skillModel.create({
          name: 'React',
          category: 'Frontend',
          is_technical: true
        }),
        skillModel.create({
          name: 'Node.js',
          category: 'Backend',
          is_technical: true
        }),
        skillModel.create({
          name: 'Vue.js',
          category: 'Frontend',
          is_technical: true
        })
      ]);

      const frontendSkills = await skillModel.findByCategory('Frontend');
      expect(frontendSkills).toHaveLength(2);
      expect(frontendSkills.every(skill => skill.category === 'Frontend')).toBe(true);
    });

    it('should distinguish between technical and soft skills', async () => {
      await Promise.all([
        skillModel.create({
          name: 'Python',
          category: 'Programming',
          is_technical: true
        }),
        skillModel.create({
          name: 'Leadership',
          category: 'Soft Skills',
          is_technical: false
        })
      ]);

      const technicalSkills = await skillModel.findTechnicalSkills();
      const softSkills = await skillModel.findSoftSkills();

      expect(technicalSkills).toHaveLength(1);
      expect(softSkills).toHaveLength(1);
      expect(technicalSkills[0].name).toBe('Python');
      expect(softSkills[0].name).toBe('Leadership');
    });

    it('should get skill statistics', async () => {
      await Promise.all([
        skillModel.create({
          name: 'Java',
          category: 'Programming',
          is_technical: true,
          is_active: true
        }),
        skillModel.create({
          name: 'Communication',
          category: 'Soft Skills',
          is_technical: false,
          is_active: true
        }),
        skillModel.create({
          name: 'Deprecated Skill',
          category: 'Old Tech',
          is_technical: true,
          is_active: false
        })
      ]);

      const stats = await skillModel.getSkillStats();

      expect(stats.total_skills).toBe(3);
      expect(stats.active_skills).toBe(2);
      expect(stats.technical_skills).toBe(2);
      expect(stats.soft_skills).toBe(1);
    });
  });

  describe('Employee Skill Model', () => {
    beforeEach(async () => {
      testDepartment = await departmentModel.create({
        name: 'Test Department',
        description: 'For skill tests'
      });

      testEmployee = await employeeModel.create({
        employee_number: 'EMP002001',
        first_name: 'Test',
        last_name: 'Employee',
        email: 'test.employee@example.com',
        hire_date: new Date(),
        department_id: testDepartment.id,
        position_title: 'Developer',
        employment_type: 'FULL_TIME',
        salary: 80000
      });

      testSkill = await skillModel.create({
        name: 'TypeScript',
        category: 'Programming',
        is_technical: true
      });
    });

    it('should create employee skill relationship', async () => {
      const employeeSkillData = {
        employee_id: testEmployee.id,
        skill_id: testSkill.id,
        proficiency_level: 'Advanced' as const,
        years_experience: 3,
        is_certified: false
      };

      testEmployeeSkill = await employeeSkillModel.create(employeeSkillData);

      expect(testEmployeeSkill.employee_id).toBe(testEmployee.id);
      expect(testEmployeeSkill.skill_id).toBe(testSkill.id);
      expect(testEmployeeSkill.proficiency_level).toBe('Advanced');
      expect(testEmployeeSkill.years_experience).toBe(3);
    });

    it('should find employee skills with details', async () => {
      await employeeSkillModel.create({
        employee_id: testEmployee.id,
        skill_id: testSkill.id,
        proficiency_level: 'Intermediate',
        years_experience: 2
      });

      const skills = await employeeSkillModel.findByEmployeeWithDetails(testEmployee.id);

      expect(skills).toHaveLength(1);
      expect(skills[0].skill).toBeTruthy();
      expect(skills[0].skill!.name).toBe('TypeScript');
      expect(skills[0].proficiency_level).toBe('Intermediate');
    });

    it('should add or update employee skill', async () => {
      // First addition
      const skill1 = await employeeSkillModel.addOrUpdateEmployeeSkill({
        employee_id: testEmployee.id,
        skill_id: testSkill.id,
        proficiency_level: 'Beginner',
        years_experience: 1
      });

      expect(skill1.proficiency_level).toBe('Beginner');

      // Update existing
      const skill2 = await employeeSkillModel.addOrUpdateEmployeeSkill({
        employee_id: testEmployee.id,
        skill_id: testSkill.id,
        proficiency_level: 'Advanced',
        years_experience: 3
      });

      expect(skill2.id).toBe(skill1.id); // Same record
      expect(skill2.proficiency_level).toBe('Advanced');
      expect(skill2.years_experience).toBe(3);
    });

    it('should add certification to employee skill', async () => {
      const employeeSkill = await employeeSkillModel.create({
        employee_id: testEmployee.id,
        skill_id: testSkill.id,
        proficiency_level: 'Expert',
        years_experience: 5
      });

      const certified = await employeeSkillModel.addCertification(
        testEmployee.id,
        testSkill.id,
        'TypeScript Institute',
        new Date('2023-06-01')
      );

      expect(certified!.is_certified).toBe(true);
      expect(certified!.certification_body).toBe('TypeScript Institute');
      expect(certified!.certification_date).toEqual(new Date('2023-06-01'));
    });

    it('should get skill proficiency distribution', async () => {
      // Create another employee and skill for more data
      const employee2 = await employeeModel.create({
        employee_number: 'EMP002002',
        first_name: 'Another',
        last_name: 'Employee',
        email: 'another.employee@example.com',
        hire_date: new Date(),
        position_title: 'Senior Developer',
        employment_type: 'FULL_TIME',
        salary: 95000
      });

      await Promise.all([
        employeeSkillModel.create({
          employee_id: testEmployee.id,
          skill_id: testSkill.id,
          proficiency_level: 'Intermediate',
          years_experience: 2
        }),
        employeeSkillModel.create({
          employee_id: employee2.id,
          skill_id: testSkill.id,
          proficiency_level: 'Expert',
          years_experience: 5,
          is_certified: true
        })
      ]);

      const distribution = await employeeSkillModel.getSkillProficiencyDistribution(testSkill.id);

      expect(distribution).toHaveLength(1);
      expect(distribution[0].skill_id).toBe(testSkill.id);
      expect(distribution[0].intermediate_count).toBe(1);
      expect(distribution[0].expert_count).toBe(1);
      expect(distribution[0].total_count).toBe(2);
      expect(distribution[0].certification_rate).toBe(50);
    });
  });

  describe('Capacity History Model', () => {
    beforeEach(async () => {
      testEmployee = await employeeModel.create({
        employee_number: 'EMP003001',
        first_name: 'Capacity',
        last_name: 'Test',
        email: 'capacity.test@example.com',
        hire_date: new Date(),
        position_title: 'Developer',
        employment_type: 'FULL_TIME',
        salary: 80000,
        weekly_capacity_hours: 40
      });
    });

    it('should create capacity history record', async () => {
      const capacityData = {
        employee_id: testEmployee.id,
        effective_date: new Date('2023-01-01'),
        weekly_capacity_hours: 32,
        reason: 'Reduced hours request',
        notes: 'Employee requested reduced hours'
      };

      testCapacityHistory = await capacityHistoryModel.create(capacityData);

      expect(testCapacityHistory.employee_id).toBe(testEmployee.id);
      expect(testCapacityHistory.weekly_capacity_hours).toBe(32);
      expect(testCapacityHistory.reason).toBe('Reduced hours request');
      expect(testCapacityHistory.is_temporary).toBe(false);
    });

    it('should find current capacity for employee', async () => {
      const oldCapacity = await capacityHistoryModel.create({
        employee_id: testEmployee.id,
        effective_date: new Date('2023-01-01'),
        weekly_capacity_hours: 40,
        reason: 'Initial capacity'
      });

      const currentCapacity = await capacityHistoryModel.create({
        employee_id: testEmployee.id,
        effective_date: new Date('2023-06-01'),
        weekly_capacity_hours: 30,
        reason: 'Capacity reduction'
      });

      const current = await capacityHistoryModel.findCurrentCapacity(testEmployee.id);

      expect(current).toBeTruthy();
      expect(current!.id).toBe(currentCapacity.id);
      expect(current!.weekly_capacity_hours).toBe(30);
    });

    it('should handle temporary capacity changes', async () => {
      const tempChange = await capacityHistoryModel.createCapacityChange(
        testEmployee.id,
        new Date('2023-07-01'),
        20,
        'Vacation period',
        'Reduced capacity during vacation',
        true,
        new Date('2023-07-15')
      );

      expect(tempChange.is_temporary).toBe(true);
      expect(tempChange.end_date).toEqual(new Date('2023-07-15'));

      const activeTemp = await capacityHistoryModel.findActiveTemporaryChanges(new Date('2023-07-10'));
      expect(activeTemp).toHaveLength(1);
      expect(activeTemp[0].id).toBe(tempChange.id);

      const expiredTemp = await capacityHistoryModel.findActiveTemporaryChanges(new Date('2023-07-20'));
      expect(expiredTemp).toHaveLength(0);
    });

    it('should get capacity trends', async () => {
      await Promise.all([
        capacityHistoryModel.create({
          employee_id: testEmployee.id,
          effective_date: new Date('2023-01-01'),
          weekly_capacity_hours: 40,
          reason: 'Initial'
        }),
        capacityHistoryModel.create({
          employee_id: testEmployee.id,
          effective_date: new Date('2023-03-01'),
          weekly_capacity_hours: 35,
          reason: 'Reduction'
        }),
        capacityHistoryModel.create({
          employee_id: testEmployee.id,
          effective_date: new Date('2023-06-01'),
          weekly_capacity_hours: 40,
          reason: 'Restoration'
        })
      ]);

      const trends = await capacityHistoryModel.getCapacityTrends([testEmployee.id]);

      expect(trends).toHaveLength(3);
      expect(trends[0].change_from_previous).toBe(0); // First record
      expect(trends[1].change_from_previous).toBe(-5); // 35 - 40
      expect(trends[2].change_from_previous).toBe(5); // 40 - 35
    });

    it('should get employee capacity statistics', async () => {
      await Promise.all([
        capacityHistoryModel.create({
          employee_id: testEmployee.id,
          effective_date: new Date('2023-01-01'),
          weekly_capacity_hours: 40
        }),
        capacityHistoryModel.create({
          employee_id: testEmployee.id,
          effective_date: new Date('2023-03-01'),
          weekly_capacity_hours: 30
        }),
        capacityHistoryModel.create({
          employee_id: testEmployee.id,
          effective_date: new Date('2023-06-01'),
          weekly_capacity_hours: 35,
          is_temporary: true,
          end_date: new Date('2023-06-15')
        })
      ]);

      const stats = await capacityHistoryModel.getEmployeeCapacityStats(testEmployee.id);

      expect(stats.current_capacity).toBe(30); // Latest non-expired capacity
      expect(stats.average_capacity).toBe(35); // (40 + 30 + 35) / 3
      expect(stats.min_capacity).toBe(30);
      expect(stats.max_capacity).toBe(40);
      expect(stats.total_changes).toBe(3);
      expect(stats.temporary_changes).toBe(1);
    });

    it('should cleanup expired temporary changes', async () => {
      const expiredChange = await capacityHistoryModel.create({
        employee_id: testEmployee.id,
        effective_date: new Date('2023-01-01'),
        weekly_capacity_hours: 20,
        is_temporary: true,
        end_date: new Date('2023-01-15')
      });

      const activeChange = await capacityHistoryModel.create({
        employee_id: testEmployee.id,
        effective_date: new Date('2023-06-01'),
        weekly_capacity_hours: 30,
        is_temporary: true,
        end_date: new Date('2024-12-31')
      });

      const cleanedUp = await capacityHistoryModel.cleanupExpiredTemporaryChanges();
      expect(cleanedUp).toBe(1);

      const found = await capacityHistoryModel.findById(expiredChange.id);
      expect(found).toBeNull();

      const active = await capacityHistoryModel.findById(activeChange.id);
      expect(active).toBeTruthy();
    });
  });
});