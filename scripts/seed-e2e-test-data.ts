import { DatabaseService } from '../src/database/database.service';

/**
 * E2E Test Data Seeding Script
 * Creates realistic test data for end-to-end testing
 */
class E2ETestDataSeeder {
  private db: DatabaseService;

  constructor() {
    this.db = DatabaseService.getInstance();
  }

  async seedTestData() {
    console.log('🌱 Starting E2E Test Data Seeding...\n');

    try {
      await this.db.connect();
      console.log('✅ Database connected');

      // Clear existing test data
      await this.clearTestData();
      console.log('🧹 Cleared existing test data');

      // Seed departments
      const departments = await this.seedDepartments();
      console.log(`📂 Created ${departments.length} departments`);

      // Seed employees
      const employees = await this.seedEmployees(departments);
      console.log(`👥 Created ${employees.length} employees`);

      // Seed skills
      const skills = await this.seedSkills();
      console.log(`🎯 Created ${skills.length} skills`);

      // Seed projects
      const projects = await this.seedProjects();
      console.log(`📋 Created ${projects.length} projects`);

      // Seed resource allocations
      const allocations = await this.seedResourceAllocations(employees, projects);
      console.log(`📊 Created ${allocations.length} resource allocations`);

      console.log('\n🎉 E2E test data seeding completed successfully!');
      
      return {
        departments: departments.length,
        employees: employees.length,
        skills: skills.length,
        projects: projects.length,
        allocations: allocations.length
      };

    } catch (error) {
      console.error('❌ E2E test data seeding failed:', error);
      throw error;
    } finally {
      await this.db.disconnect();
    }
  }

  private async clearTestData() {
    // Clear in reverse dependency order
    await this.db.query('DELETE FROM resource_allocations WHERE TRUE');
    await this.db.query('DELETE FROM employee_skills WHERE TRUE');
    await this.db.query('DELETE FROM project_roles WHERE TRUE');
    await this.db.query('DELETE FROM projects WHERE name LIKE \'%Test%\' OR name LIKE \'%E2E%\'');
    await this.db.query('DELETE FROM employees WHERE email LIKE \'%@test.com\' OR email LIKE \'%@e2e.com\'');
    await this.db.query('DELETE FROM skills WHERE name LIKE \'%Test%\'');
    // Don't delete departments as they might be referenced elsewhere
  }

  private async seedDepartments() {
    const departments = [
      { name: 'Engineering', description: 'Software development and technical operations' },
      { name: 'Design', description: 'User experience and visual design' },
      { name: 'Product', description: 'Product management and strategy' },
      { name: 'Marketing', description: 'Marketing and growth initiatives' },
      { name: 'Operations', description: 'Business operations and support' }
    ];

    const created = [];
    for (const dept of departments) {
      try {
        const result = await this.db.query(
          'INSERT INTO departments (name, description) VALUES ($1, $2) ON CONFLICT (name) DO UPDATE SET description = EXCLUDED.description RETURNING *',
          [dept.name, dept.description]
        );
        created.push(result.rows[0]);
      } catch (error) {
        console.warn(`Department ${dept.name} already exists, skipping`);
      }
    }
    return created;
  }

  private async seedEmployees(departments: any[]) {
    const employees = [
      {
        firstName: 'Alice',
        lastName: 'Johnson',
        email: 'alice.johnson@test.com',
        position: 'Senior Frontend Developer',
        department: 'Engineering',
        salary: 95000,
        skills: ['React', 'TypeScript', 'CSS', 'JavaScript']
      },
      {
        firstName: 'Bob',
        lastName: 'Smith',
        email: 'bob.smith@test.com',
        position: 'Backend Engineer',
        department: 'Engineering',
        salary: 90000,
        skills: ['Node.js', 'PostgreSQL', 'API Development', 'Docker']
      },
      {
        firstName: 'Carol',
        lastName: 'Davis',
        email: 'carol.davis@test.com',
        position: 'UX Designer',
        department: 'Design',
        salary: 80000,
        skills: ['Figma', 'User Research', 'Prototyping', 'Design Systems']
      },
      {
        firstName: 'David',
        lastName: 'Wilson',
        email: 'david.wilson@test.com',
        position: 'Product Manager',
        department: 'Product',
        salary: 110000,
        skills: ['Product Strategy', 'Agile', 'Data Analysis', 'User Stories']
      },
      {
        firstName: 'Emma',
        lastName: 'Brown',
        email: 'emma.brown@test.com',
        position: 'Marketing Specialist',
        department: 'Marketing',
        salary: 70000,
        skills: ['Content Marketing', 'SEO', 'Analytics', 'Social Media']
      },
      {
        firstName: 'Frank',
        lastName: 'Garcia',
        email: 'frank.garcia@test.com',
        position: 'DevOps Engineer',
        department: 'Engineering',
        salary: 100000,
        skills: ['AWS', 'Kubernetes', 'CI/CD', 'Monitoring']
      },
      {
        firstName: 'Grace',
        lastName: 'Lee',
        email: 'grace.lee@test.com',
        position: 'Full Stack Developer',
        department: 'Engineering',
        salary: 85000,
        skills: ['React', 'Node.js', 'PostgreSQL', 'Docker']
      },
      {
        firstName: 'Henry',
        lastName: 'Taylor',
        email: 'henry.taylor@test.com',
        position: 'Operations Manager',
        department: 'Operations',
        salary: 95000,
        skills: ['Project Management', 'Process Improvement', 'Team Leadership']
      }
    ];

    const created = [];
    for (const emp of employees) {
      const dept = departments.find(d => d.name === emp.department);
      if (!dept) continue;

      const result = await this.db.query(
        `INSERT INTO employees (first_name, last_name, email, position, department_id, salary, skills, hire_date)
         VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_DATE - INTERVAL '${Math.floor(Math.random() * 365)} days')
         RETURNING *`,
        [
          emp.firstName,
          emp.lastName,
          emp.email,
          emp.position,
          dept.id,
          emp.salary,
          emp.skills
        ]
      );
      created.push(result.rows[0]);
    }
    return created;
  }

  private async seedSkills() {
    const skills = [
      { name: 'React', category: 'Frontend', description: 'JavaScript library for building user interfaces' },
      { name: 'Node.js', category: 'Backend', description: 'JavaScript runtime for server-side development' },
      { name: 'PostgreSQL', category: 'Database', description: 'Open source relational database' },
      { name: 'TypeScript', category: 'Programming', description: 'Typed superset of JavaScript' },
      { name: 'Figma', category: 'Design', description: 'Collaborative design and prototyping tool' },
      { name: 'AWS', category: 'Cloud', description: 'Amazon Web Services cloud platform' },
      { name: 'Docker', category: 'DevOps', description: 'Container platform for application deployment' },
      { name: 'Kubernetes', category: 'DevOps', description: 'Container orchestration platform' },
      { name: 'API Development', category: 'Backend', description: 'RESTful and GraphQL API development' },
      { name: 'User Research', category: 'Design', description: 'Methods for understanding user needs' },
      { name: 'Product Strategy', category: 'Product', description: 'Strategic product planning and roadmapping' },
      { name: 'Content Marketing', category: 'Marketing', description: 'Creating and distributing valuable content' },
      { name: 'Project Management', category: 'Management', description: 'Planning and executing projects effectively' }
    ];

    const created = [];
    for (const skill of skills) {
      const result = await this.db.query(
        'INSERT INTO skills (name, category, description) VALUES ($1, $2, $3) ON CONFLICT (name) DO UPDATE SET description = EXCLUDED.description RETURNING *',
        [skill.name, skill.category, skill.description]
      );
      created.push(result.rows[0]);
    }
    return created;
  }

  private async seedProjects() {
    const projects = [
      {
        name: 'E2E Test Project Alpha',
        description: 'Customer dashboard redesign with new analytics features',
        clientName: 'Test Client A',
        startDate: new Date('2024-01-15'),
        endDate: new Date('2024-04-15'),
        status: 'active',
        priority: 'high',
        budget: 150000,
        estimatedHours: 1200
      },
      {
        name: 'E2E Test Project Beta',
        description: 'Mobile app development for iOS and Android',
        clientName: 'Test Client B',
        startDate: new Date('2024-02-01'),
        endDate: new Date('2024-06-30'),
        status: 'planning',
        priority: 'medium',
        budget: 200000,
        estimatedHours: 1600
      },
      {
        name: 'E2E Test Project Gamma',
        description: 'API integration and data migration project',
        clientName: 'Test Client C',
        startDate: new Date('2024-03-01'),
        endDate: new Date('2024-05-15'),
        status: 'active',
        priority: 'critical',
        budget: 100000,
        estimatedHours: 800
      },
      {
        name: 'E2E Test Project Delta',
        description: 'Marketing website overhaul with CMS integration',
        clientName: 'Test Client D',
        startDate: new Date('2024-04-01'),
        endDate: new Date('2024-07-31'),
        status: 'planning',
        priority: 'low',
        budget: 75000,
        estimatedHours: 600
      }
    ];

    const created = [];
    for (const project of projects) {
      const result = await this.db.query(
        `INSERT INTO projects (name, description, client_name, start_date, end_date, status, priority, budget, estimated_hours)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         RETURNING *`,
        [
          project.name,
          project.description,
          project.clientName,
          project.startDate,
          project.endDate,
          project.status,
          project.priority,
          project.budget,
          project.estimatedHours
        ]
      );
      created.push(result.rows[0]);
    }
    return created;
  }

  private async seedResourceAllocations(employees: any[], projects: any[]) {
    const allocations = [
      {
        employeeId: 0, // Alice - Frontend Developer
        projectId: 0, // Alpha project
        startDate: new Date('2024-01-15'),
        endDate: new Date('2024-04-15'),
        allocatedHours: 30, // 75% allocation
        roleOnProject: 'Frontend Developer',
        billableRate: 95
      },
      {
        employeeId: 1, // Bob - Backend Engineer  
        projectId: 0, // Alpha project
        startDate: new Date('2024-01-20'),
        endDate: new Date('2024-04-10'),
        allocatedHours: 32, // 80% allocation
        roleOnProject: 'Backend Developer',
        billableRate: 90
      },
      {
        employeeId: 2, // Carol - UX Designer
        projectId: 1, // Beta project
        startDate: new Date('2024-02-01'),
        endDate: new Date('2024-03-31'),
        allocatedHours: 25, // 62.5% allocation
        roleOnProject: 'UX Designer',
        billableRate: 85
      },
      {
        employeeId: 6, // Grace - Full Stack Developer
        projectId: 2, // Gamma project
        startDate: new Date('2024-03-01'),
        endDate: new Date('2024-05-15'),
        allocatedHours: 35, // 87.5% allocation
        roleOnProject: 'Full Stack Developer',
        billableRate: 88
      },
      {
        employeeId: 5, // Frank - DevOps Engineer
        projectId: 2, // Gamma project
        startDate: new Date('2024-03-15'),
        endDate: new Date('2024-05-15'),
        allocatedHours: 20, // 50% allocation
        roleOnProject: 'DevOps Engineer',
        billableRate: 100
      },
      {
        employeeId: 0, // Alice - overlapping allocation (test conflict detection)
        projectId: 1, // Beta project
        startDate: new Date('2024-03-15'),
        endDate: new Date('2024-06-30'),
        allocatedHours: 15, // 37.5% allocation
        roleOnProject: 'Frontend Consultant',
        billableRate: 110
      }
    ];

    const created = [];
    for (const allocation of allocations) {
      if (!employees[allocation.employeeId] || !projects[allocation.projectId]) {
        continue;
      }

      try {
        const result = await this.db.query(
          `INSERT INTO resource_allocations (
             employee_id, project_id, start_date, end_date, 
             allocated_hours, role_on_project, billable_rate, status
           )
           VALUES ($1, $2, $3, $4, $5, $6, $7, 'active')
           RETURNING *`,
          [
            employees[allocation.employeeId].id,
            projects[allocation.projectId].id,
            allocation.startDate,
            allocation.endDate,
            allocation.allocatedHours,
            allocation.roleOnProject,
            allocation.billableRate
          ]
        );
        created.push(result.rows[0]);
      } catch (error) {
        console.warn(`Allocation creation failed (may be intentional for testing):`, error.message);
      }
    }
    return created;
  }

  // Method to create specific test scenarios
  async createTestScenario(scenarioName: string) {
    console.log(`🎭 Creating test scenario: ${scenarioName}`);
    
    switch (scenarioName) {
      case 'over-allocation':
        return await this.createOverAllocationScenario();
      case 'conflict-detection':
        return await this.createConflictDetectionScenario();
      case 'capacity-planning':
        return await this.createCapacityPlanningScenario();
      default:
        throw new Error(`Unknown test scenario: ${scenarioName}`);
    }
  }

  private async createOverAllocationScenario() {
    // Create an employee with multiple overlapping high-hour allocations
    const employee = await this.db.query(
      `INSERT INTO employees (first_name, last_name, email, position, department_id, salary)
       VALUES ('Over', 'Allocated', 'over.allocated@e2e.com', 'Test Engineer', 
               (SELECT id FROM departments LIMIT 1), 75000)
       RETURNING *`
    );

    const projects = await this.db.query('SELECT id FROM projects LIMIT 3');
    
    // Create three overlapping allocations totaling more than 40 hours
    for (let i = 0; i < 3; i++) {
      await this.db.query(
        `INSERT INTO resource_allocations (
           employee_id, project_id, start_date, end_date, allocated_hours, 
           role_on_project, status
         )
         VALUES ($1, $2, CURRENT_DATE, CURRENT_DATE + INTERVAL '30 days', 20, 
                 'Test Role ${i + 1}', 'active')`,
        [employee.rows[0].id, projects.rows[i].id]
      );
    }

    return { employeeId: employee.rows[0].id, totalHours: 60 };
  }

  private async createConflictDetectionScenario() {
    // Create overlapping allocations for conflict detection testing
    const employee = await this.db.query(
      `SELECT id FROM employees WHERE email LIKE '%@test.com' LIMIT 1`
    );

    if (employee.rows.length === 0) {
      throw new Error('No test employees found for conflict scenario');
    }

    const projects = await this.db.query('SELECT id FROM projects LIMIT 2');
    
    // Create two overlapping allocations
    const allocations = [];
    for (let i = 0; i < 2; i++) {
      const result = await this.db.query(
        `INSERT INTO resource_allocations (
           employee_id, project_id, start_date, end_date, allocated_hours,
           role_on_project, status
         )
         VALUES ($1, $2, CURRENT_DATE + INTERVAL '${i} days', 
                 CURRENT_DATE + INTERVAL '${i + 14} days', 25, 
                 'Conflict Test Role ${i + 1}', 'active')
         RETURNING *`,
        [employee.rows[0].id, projects.rows[i].id]
      );
      allocations.push(result.rows[0]);
    }

    return { employeeId: employee.rows[0].id, allocations };
  }

  private async createCapacityPlanningScenario() {
    // Create various capacity scenarios for testing
    const employees = await this.db.query(
      'SELECT id FROM employees WHERE email LIKE \'%@test.com\' LIMIT 5'
    );

    const scenarios = [];
    for (const emp of employees.rows) {
      const capacity = Math.floor(Math.random() * 40) + 10; // 10-50 hours
      scenarios.push({ employeeId: emp.id, capacity });
    }

    return scenarios;
  }
}

// Self-executing seeder
if (require.main === module) {
  const seeder = new E2ETestDataSeeder();
  
  const args = process.argv.slice(2);
  const command = args[0] || 'seed';
  
  if (command === 'seed') {
    seeder.seedTestData()
      .then((result) => {
        console.log('\n📊 Seeding Summary:', result);
        process.exit(0);
      })
      .catch((error) => {
        console.error('Seeding failed:', error);
        process.exit(1);
      });
  } else if (command === 'scenario') {
    const scenarioName = args[1];
    if (!scenarioName) {
      console.error('Please provide a scenario name');
      process.exit(1);
    }
    
    seeder.createTestScenario(scenarioName)
      .then((result) => {
        console.log(`✅ Scenario "${scenarioName}" created:`, result);
        process.exit(0);
      })
      .catch((error) => {
        console.error(`Scenario creation failed:`, error);
        process.exit(1);
      });
  }
}

export { E2ETestDataSeeder };