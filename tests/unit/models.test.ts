import { EmployeeModel } from '../../src/models/Employee';
import { DepartmentModel } from '../../src/models/Department';
import { SkillModel } from '../../src/models/Skill';
import { EmployeeSkillModel } from '../../src/models/EmployeeSkill';
import { CapacityHistoryModel } from '../../src/models/CapacityHistory';
import {
  CreateEmployeeInput,
  CreateDepartmentInput,
  CreateSkillInput,
  CreateEmployeeSkillInput,
  CreateCapacityHistoryInput,
  SkillCategory,
  ProficiencyLevel
} from '../../src/types';
import { createTestDepartment, createTestSkill, createTestEmployee } from '../setup-unit';

describe('Database Models', () => {
  describe('DepartmentModel', () => {
    it('should create a new department', async () => {
      const input: CreateDepartmentInput = {
        name: 'Engineering',
        description: 'Software engineering department'
      };

      const department = await DepartmentModel.create(input);

      expect(department).toMatchObject({
        name: 'Engineering',
        description: 'Software engineering department',
        isActive: true
      });
      expect(department.id).toBeDefined();
      expect(department.createdAt).toBeInstanceOf(Date);
      expect(department.updatedAt).toBeInstanceOf(Date);
    });

    it('should find department by id', async () => {
      const created = await createTestDepartment({ name: 'HR' });
      const found = await DepartmentModel.findById(created.id);

      expect(found).toMatchObject({
        id: created.id,
        name: 'HR'
      });
    });

    it('should update department', async () => {
      const created = await createTestDepartment({ name: 'Marketing' });
      const updated = await DepartmentModel.update(created.id, {
        name: 'Digital Marketing',
        description: 'Updated description'
      });

      expect(updated).toMatchObject({
        id: created.id,
        name: 'Digital Marketing',
        description: 'Updated description'
      });
    });

    it('should delete department (soft delete)', async () => {
      const created = await createTestDepartment();
      const deleted = await DepartmentModel.delete(created.id);

      expect(deleted.isActive).toBe(false);
    });

    it('should find all active departments', async () => {
      await createTestDepartment({ name: 'Dept 1' });
      await createTestDepartment({ name: 'Dept 2' });
      const dept3 = await createTestDepartment({ name: 'Dept 3' });
      // Soft delete the third department
      await DepartmentModel.delete(dept3.id);

      const departments = await DepartmentModel.findAll({ isActive: true });

      expect(departments).toHaveLength(2);
      expect(departments.every(dept => dept.isActive)).toBe(true);
    });
  });

  describe('SkillModel', () => {
    it('should create a new skill', async () => {
      const input: CreateSkillInput = {
        name: 'TypeScript',
        description: 'TypeScript programming language',
        category: SkillCategory.TECHNICAL
      };

      const skill = await SkillModel.create(input);

      expect(skill).toMatchObject({
        name: 'TypeScript',
        description: 'TypeScript programming language',
        category: 'technical',
        isActive: true
      });
      expect(skill.id).toBeDefined();
    });

    it('should find skills by category', async () => {
      await createTestSkill({ name: 'JavaScript', category: SkillCategory.TECHNICAL });
      await createTestSkill({ name: 'Leadership', category: SkillCategory.SOFT });
      await createTestSkill({ name: 'Python', category: SkillCategory.TECHNICAL });

      const technicalSkills = await SkillModel.findAll({ category: SkillCategory.TECHNICAL });

      expect(technicalSkills).toHaveLength(2);
      expect(technicalSkills.every(skill => skill.category === 'technical')).toBe(true);
    });

    it('should update skill', async () => {
      const created = await createTestSkill({ name: 'React' });
      const updated = await SkillModel.update(created.id, {
        description: 'React.js library for building UIs'
      });

      expect(updated.description).toBe('React.js library for building UIs');
    });
  });

  describe('EmployeeModel', () => {
    it('should create a new employee', async () => {
      const department = await createTestDepartment();
      const input: CreateEmployeeInput = {
        firstName: 'Jane',
        lastName: 'Smith',
        email: 'jane.smith@company.com',
        departmentId: department.id,
        position: 'Senior Developer',
        hireDate: new Date('2023-01-15')
      };

      const employee = await EmployeeModel.create(input);

      expect(employee).toMatchObject({
        firstName: 'Jane',
        lastName: 'Smith',
        email: 'jane.smith@company.com',
        departmentId: department.id,
        position: 'Senior Developer',
        isActive: true
      });
      expect(employee.id).toBeDefined();
    });

    it('should prevent duplicate email addresses', async () => {
      const department = await createTestDepartment();
      const email = 'duplicate@company.com';

      await EmployeeModel.create({
        firstName: 'First',
        lastName: 'User',
        email,
        departmentId: department.id,
        position: 'Developer',
        hireDate: new Date()
      });

      await expect(EmployeeModel.create({
        firstName: 'Second',
        lastName: 'User',
        email,
        departmentId: department.id,
        position: 'Developer',
        hireDate: new Date()
      })).rejects.toThrow();
    });

    it('should find employees by department', async () => {
      const dept1 = await createTestDepartment({ name: 'Engineering' });
      const dept2 = await createTestDepartment({ name: 'Marketing' });

      await createTestEmployee(dept1.id, { firstName: 'John', lastName: 'Engineer' });
      await createTestEmployee(dept1.id, { firstName: 'Jane', lastName: 'Developer' });
      await createTestEmployee(dept2.id, { firstName: 'Bob', lastName: 'Marketer' });

      const engineers = await EmployeeModel.findAll({ departmentId: dept1.id });

      expect(engineers.data).toHaveLength(2);
      expect(engineers.data.every(emp => emp.departmentId === dept1.id)).toBe(true);
    });

    it('should find employee with skills and department', async () => {
      const department = await createTestDepartment({ name: 'Tech' });
      const skill = await createTestSkill({ name: 'Node.js' });
      const employee = await createTestEmployee(department.id);

      await EmployeeSkillModel.create({
        employeeId: employee.id,
        skillId: skill.id,
        proficiencyLevel: ProficiencyLevel.ADVANCED,
        yearsOfExperience: 3
      });

      const employeeWithDetails = await EmployeeModel.findByIdWithDetails(employee.id);

      expect(employeeWithDetails).toMatchObject({
        id: employee.id,
        department: { name: 'Tech' }
      });
      expect(employeeWithDetails.skills).toHaveLength(1);
      expect(employeeWithDetails.skills[0]).toMatchObject({
        skill: { name: 'Node.js' },
        proficiencyLevel: ProficiencyLevel.ADVANCED
      });
    });
  });

  describe('EmployeeSkillModel', () => {
    it('should create employee skill mapping', async () => {
      const department = await createTestDepartment();
      const employee = await createTestEmployee(department.id);
      const skill = await createTestSkill();

      const input: CreateEmployeeSkillInput = {
        employeeId: employee.id,
        skillId: skill.id,
        proficiencyLevel: ProficiencyLevel.INTERMEDIATE,
        yearsOfExperience: 2
      };

      const employeeSkill = await EmployeeSkillModel.create(input);

      expect(employeeSkill).toMatchObject({
        employeeId: employee.id,
        skillId: skill.id,
        proficiencyLevel: ProficiencyLevel.INTERMEDIATE,
        yearsOfExperience: 2,
        isActive: true
      });
    });

    it('should prevent duplicate employee-skill mappings', async () => {
      const department = await createTestDepartment();
      const employee = await createTestEmployee(department.id);
      const skill = await createTestSkill();

      const input: CreateEmployeeSkillInput = {
        employeeId: employee.id,
        skillId: skill.id,
        proficiencyLevel: ProficiencyLevel.BEGINNER,
        yearsOfExperience: 1
      };

      await EmployeeSkillModel.create(input);

      await expect(EmployeeSkillModel.create(input))
        .rejects.toThrow();
    });

    it('should find skills by employee', async () => {
      const department = await createTestDepartment();
      const employee = await createTestEmployee(department.id);
      const skill1 = await createTestSkill({ name: 'JavaScript' });
      const skill2 = await createTestSkill({ name: 'Python' });

      await EmployeeSkillModel.create({
        employeeId: employee.id,
        skillId: skill1.id,
        proficiencyLevel: ProficiencyLevel.ADVANCED,
        yearsOfExperience: 4
      });

      await EmployeeSkillModel.create({
        employeeId: employee.id,
        skillId: skill2.id,
        proficiencyLevel: ProficiencyLevel.INTERMEDIATE,
        yearsOfExperience: 2
      });

      const employeeSkills = await EmployeeSkillModel.findByEmployee(employee.id);

      expect(employeeSkills).toHaveLength(2);
      expect(employeeSkills.map(es => es.skill.name)).toContain('JavaScript');
      expect(employeeSkills.map(es => es.skill.name)).toContain('Python');
    });
  });

  describe('CapacityHistoryModel', () => {
    it('should create capacity history entry', async () => {
      const department = await createTestDepartment();
      const employee = await createTestEmployee(department.id);

      const input: CreateCapacityHistoryInput = {
        employeeId: employee.id,
        date: new Date('2023-08-01'),
        availableHours: 40,
        allocatedHours: 35,
        notes: 'Standard week'
      };

      const capacity = await CapacityHistoryModel.create(input);

      expect(capacity).toMatchObject({
        employeeId: employee.id,
        availableHours: 40,
        allocatedHours: 35,
        utilizationRate: 0.875, // 35/40
        notes: 'Standard week'
      });
    });

    it('should calculate utilization rate automatically', async () => {
      const department = await createTestDepartment();
      const employee = await createTestEmployee(department.id);

      const capacity = await CapacityHistoryModel.create({
        employeeId: employee.id,
        date: new Date(),
        availableHours: 40,
        allocatedHours: 32
      });

      expect(capacity.utilizationRate).toBe(0.8);
    });

    it('should find capacity history by date range', async () => {
      const department = await createTestDepartment();
      const employee = await createTestEmployee(department.id);

      await CapacityHistoryModel.create({
        employeeId: employee.id,
        date: new Date('2023-08-01'),
        availableHours: 40,
        allocatedHours: 30
      });

      await CapacityHistoryModel.create({
        employeeId: employee.id,
        date: new Date('2023-08-15'),
        availableHours: 40,
        allocatedHours: 35
      });

      await CapacityHistoryModel.create({
        employeeId: employee.id,
        date: new Date('2023-09-01'),
        availableHours: 40,
        allocatedHours: 38
      });

      const augustEntries = await CapacityHistoryModel.findAll({
        employeeId: employee.id,
        dateFrom: new Date('2023-08-01'),
        dateTo: new Date('2023-08-31')
      });

      expect(augustEntries).toHaveLength(2);
    });
  });
});