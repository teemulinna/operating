#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🔧 Fixing Service Initialization in Tests');
console.log('==========================================\n');

// Fix allocation service test
const allocationTestPath = 'tests/unit/services/allocation.service.test.ts';

if (fs.existsSync(allocationTestPath)) {
  let content = fs.readFileSync(allocationTestPath, 'utf-8');

  // Add proper database and model initialization
  const setupCode = `
// Initialize database connection
beforeAll(async () => {
  db = DatabaseService.getInstance();
  await db.connect();
  const pool = db.getPool();

  // Initialize all models with the pool
  DepartmentModel.initialize(pool);
  EmployeeModel.initialize(pool);
  ProjectModel.initialize(pool);
  WorkingAllocationModel.initialize(pool);

  // Create test data
  const deptResult = await pool.query(
    'INSERT INTO departments (name, description) VALUES ($1, $2) RETURNING id',
    ['Test Dept', 'Test Department']
  );
  testDepartmentId = deptResult.rows[0].id;

  const empResult = await pool.query(
    'INSERT INTO employees (name, email, department_id, role) VALUES ($1, $2, $3, $4) RETURNING id',
    ['Test Employee', 'test@example.com', testDepartmentId, 'Developer']
  );
  testEmployeeId = empResult.rows[0].id;

  const projResult = await pool.query(
    'INSERT INTO projects (name, start_date, end_date) VALUES ($1, $2, $3) RETURNING id',
    ['Test Project', '2024-01-01', '2024-12-31']
  );
  testProjectId = projResult.rows[0].id;
});

afterAll(async () => {
  try {
    const pool = db.getPool();
    // Clean up test data
    await pool.query('DELETE FROM resource_allocations WHERE employee_id = $1', [testEmployeeId]);
    await pool.query('DELETE FROM projects WHERE id = $1', [testProjectId]);
    await pool.query('DELETE FROM employees WHERE id = $1', [testEmployeeId]);
    await pool.query('DELETE FROM departments WHERE id = $1', [testDepartmentId]);
    await DatabaseService.disconnect();
  } catch (error) {
    // Ignore cleanup errors
  }
});
`;

  // Replace the existing beforeAll/afterAll or add if missing
  if (!content.includes('beforeAll')) {
    // Add after the variable declarations
    content = content.replace(
      /let testProjectId: string;/,
      `let testProjectId: string;\n${setupCode}`
    );
  }

  // Ensure service is initialized with real database
  content = content.replace(
    /const db = DatabaseService\.getInstance\(\);/,
    'db = DatabaseService.getInstance();'
  );

  fs.writeFileSync(allocationTestPath, content);
  console.log('✅ Fixed allocation service test initialization');
}

// Fix other service tests similarly
const serviceTests = [
  'tests/unit/services/capacity-engine.service.test.ts',
  'tests/unit/services/capacity-intelligence.service.test.ts',
  'tests/unit/services/over-allocation-warning.service.test.ts',
  'tests/unit/services/pipeline-management.service.test.ts',
  'tests/unit/services/resource-assignment.service.test.ts'
];

serviceTests.forEach(testPath => {
  if (fs.existsSync(testPath)) {
    let content = fs.readFileSync(testPath, 'utf-8');

    // Ensure models are initialized with pool
    if (!content.includes('initialize(pool)')) {
      content = content.replace(
        /beforeAll\(async \(\) => \{/,
        `beforeAll(async () => {
  db = DatabaseService.getInstance();
  await db.connect();
  const pool = db.getPool();

  // Initialize models with the pool
  if (typeof DepartmentModel !== 'undefined') DepartmentModel.initialize(pool);
  if (typeof EmployeeModel !== 'undefined') EmployeeModel.initialize(pool);
  if (typeof ProjectModel !== 'undefined') ProjectModel.initialize(pool);
  if (typeof WorkingAllocationModel !== 'undefined') WorkingAllocationModel.initialize(pool);`
      );
    }

    fs.writeFileSync(testPath, content);
    console.log(`✅ Fixed ${path.basename(testPath)} initialization`);
  }
});

console.log('\n✨ Service initialization fixes complete');