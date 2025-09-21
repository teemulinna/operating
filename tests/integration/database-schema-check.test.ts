/**
 * Database Schema Check - Debug Test
 * Check what schema the test database actually has
 */

import { describe, beforeAll, afterAll, it, expect } from '@jest/globals';
import { Pool } from 'pg';
import { DatabaseService } from '../../src/database/database.service';

describe('Database Schema Check', () => {
  let testDb: DatabaseService;
  let directDbPool: Pool;
  
  const createDirectDbConnection = (): Pool => {
    const config = {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      database: process.env.DB_NAME || 'employee_management',
      user: process.env.DB_USER || 'teemulinna',
      password: process.env.DB_PASSWORD || '',
      max: 5,
    };
    
    return new Pool(config);
  };

  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    testDb = DatabaseService.getInstance();
    await testDb.connect();
    directDbPool = createDirectDbConnection();
  });

  afterAll(async () => {
    await directDbPool.end();
    await DatabaseService.disconnect();
  });

  it('should show current database name and schema', async () => {
    const client = await directDbPool.connect();
    
    try {
      // Check current database
      const dbResult = await client.query('SELECT current_database()');
      console.log('Connected to database:', dbResult.rows[0].current_database);

      // Check employees table structure
      const empStructure = await client.query(`
        SELECT column_name, data_type, is_nullable 
        FROM information_schema.columns 
        WHERE table_name = 'employees' 
        ORDER BY ordinal_position
      `);
      
      console.log('Employees table structure:');
      empStructure.rows.forEach(row => {
        console.log(`  ${row.column_name}: ${row.data_type} (nullable: ${row.is_nullable})`);
      });

      // Check if employees table exists
      const tableCheck = await client.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_name = 'employees'
        )
      `);
      
      console.log('Employees table exists:', tableCheck.rows[0].exists);

      // Check if salary column exists specifically
      const salaryCheck = await client.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'employees' AND column_name = 'salary'
      `);

      expect(tableCheck.rows[0].exists).toBe(true);
      expect(empStructure.rows.length).toBeGreaterThan(0);
      
      // Check for salary column
      const hasSalary = empStructure.rows.some(row => row.column_name === 'salary');
      if (!hasSalary) {
        throw new Error(`Salary column not found. Available columns: ${empStructure.rows.map(r => r.column_name).join(', ')}`);
      }

      expect(salaryCheck.rows.length).toBe(1);
      
    } finally {
      client.release();
    }
  });
});