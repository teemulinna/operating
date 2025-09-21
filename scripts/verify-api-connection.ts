#!/usr/bin/env npx tsx

import { DatabaseService } from '../src/database/database.service';

interface APITestResult {
  endpoint: string;
  method: string;
  status: 'PASS' | 'FAIL';
  response?: any;
  error?: string;
}

class APIConnectionVerifier {
  private db: DatabaseService;
  private results: APITestResult[] = [];

  constructor() {
    this.db = DatabaseService.getInstance();
  }

  async testDatabaseIntegration(): Promise<void> {
    console.log('🔗 Testing API-Database Integration...\n');

    try {
      // Connect to database
      await this.db.connect();
      console.log('✅ Database connection established');

      // Test key database operations that the API would use
      await this.testEmployeeOperations();
      await this.testDepartmentOperations();
      await this.testProjectOperations();
      await this.testSkillOperations();

      console.log('\n📊 Database Integration Test Results:');
      console.log('=' .repeat(50));
      
      const passed = this.results.filter(r => r.status === 'PASS').length;
      const total = this.results.length;
      
      for (const result of this.results) {
        const icon = result.status === 'PASS' ? '✅' : '❌';
        console.log(`${icon} ${result.endpoint} (${result.method}): ${result.status}`);
        if (result.error) {
          console.log(`   Error: ${result.error}`);
        }
      }
      
      console.log('=' .repeat(50));
      console.log(`📊 Results: ${passed}/${total} tests passed`);
      
      if (passed === total) {
        console.log('🎉 All database integration tests passed!');
        console.log('✅ Database is ready for API operations');
      } else {
        console.log('⚠️  Some database integration issues detected');
      }

    } catch (error: any) {
      console.error('❌ Database integration test failed:', error.message);
    } finally {
      await DatabaseService.disconnect();
      console.log('🔌 Database connection closed');
    }
  }

  private async testEmployeeOperations(): Promise<void> {
    // Test getting employees (GET /api/employees)
    try {
      const result = await this.db.query(`
        SELECT e.*, d.name as department_name 
        FROM employees e 
        LEFT JOIN departments d ON e.department_id = d.id 
        LIMIT 5
      `);
      
      this.results.push({
        endpoint: '/api/employees',
        method: 'GET',
        status: 'PASS',
        response: `Found ${result.rowCount} employees`
      });
    } catch (error: any) {
      this.results.push({
        endpoint: '/api/employees',
        method: 'GET',
        status: 'FAIL',
        error: error.message
      });
    }

    // Test employee creation structure (POST /api/employees)
    try {
      const result = await this.db.query(`
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns 
        WHERE table_name = 'employees' AND table_schema = 'public'
        ORDER BY ordinal_position
      `);
      
      const requiredFields = ['first_name', 'last_name', 'email', 'position'];
      const availableFields = result.rows.map(row => row.column_name);
      const hasAllRequired = requiredFields.every(field => availableFields.includes(field));
      
      this.results.push({
        endpoint: '/api/employees',
        method: 'POST',
        status: hasAllRequired ? 'PASS' : 'FAIL',
        response: hasAllRequired ? 'All required fields present' : 'Missing required fields'
      });
    } catch (error: any) {
      this.results.push({
        endpoint: '/api/employees',
        method: 'POST',
        status: 'FAIL',
        error: error.message
      });
    }
  }

  private async testDepartmentOperations(): Promise<void> {
    try {
      const result = await this.db.query('SELECT id, name FROM departments ORDER BY name');
      
      this.results.push({
        endpoint: '/api/departments',
        method: 'GET',
        status: 'PASS',
        response: `Found ${result.rowCount} departments`
      });
    } catch (error: any) {
      this.results.push({
        endpoint: '/api/departments',
        method: 'GET',
        status: 'FAIL',
        error: error.message
      });
    }
  }

  private async testProjectOperations(): Promise<void> {
    try {
      const result = await this.db.query(`
        SELECT p.*, 
               COUNT(ra.id) as resource_count
        FROM projects p
        LEFT JOIN resource_assignments ra ON ra.project_id = p.id
        GROUP BY p.id
        ORDER BY p.created_at DESC
        LIMIT 5
      `);
      
      this.results.push({
        endpoint: '/api/projects',
        method: 'GET',
        status: 'PASS',
        response: `Found ${result.rowCount} projects`
      });
    } catch (error: any) {
      this.results.push({
        endpoint: '/api/projects',
        method: 'GET',
        status: 'FAIL',
        error: error.message
      });
    }
  }

  private async testSkillOperations(): Promise<void> {
    try {
      const result = await this.db.query(`
        SELECT s.*, 
               COUNT(es.employee_id) as employee_count
        FROM skills s
        LEFT JOIN employee_skills es ON es.skill_id = s.id
        GROUP BY s.id
        ORDER BY s.name
        LIMIT 10
      `);
      
      this.results.push({
        endpoint: '/api/skills',
        method: 'GET',
        status: 'PASS',
        response: `Found ${result.rowCount} skills`
      });
    } catch (error: any) {
      this.results.push({
        endpoint: '/api/skills',
        method: 'GET',
        status: 'FAIL',
        error: error.message
      });
    }
  }
}

// Main execution
async function main(): Promise<void> {
  const verifier = new APIConnectionVerifier();
  await verifier.testDatabaseIntegration();
}

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}

export { APIConnectionVerifier };