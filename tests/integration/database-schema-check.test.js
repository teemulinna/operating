"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const pg_1 = require("pg");
const database_service_1 = require("../../src/database/database.service");
(0, globals_1.describe)('Database Schema Check', () => {
    let testDb;
    let directDbPool;
    const createDirectDbConnection = () => {
        const config = {
            host: process.env.DB_HOST || 'localhost',
            port: parseInt(process.env.DB_PORT || '5432'),
            database: process.env.DB_NAME || 'employee_management',
            user: process.env.DB_USER || 'teemulinna',
            password: process.env.DB_PASSWORD || '',
            max: 5,
        };
        return new pg_1.Pool(config);
    };
    (0, globals_1.beforeAll)(async () => {
        process.env.NODE_ENV = 'test';
        testDb = database_service_1.DatabaseService.getInstance();
        await testDb.connect();
        directDbPool = createDirectDbConnection();
    });
    (0, globals_1.afterAll)(async () => {
        await directDbPool.end();
        await database_service_1.DatabaseService.disconnect();
    });
    (0, globals_1.it)('should show current database name and schema', async () => {
        const client = await directDbPool.connect();
        try {
            const dbResult = await client.query('SELECT current_database()');
            console.log('Connected to database:', dbResult.rows[0].current_database);
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
            const tableCheck = await client.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_name = 'employees'
        )
      `);
            console.log('Employees table exists:', tableCheck.rows[0].exists);
            const salaryCheck = await client.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'employees' AND column_name = 'salary'
      `);
            (0, globals_1.expect)(tableCheck.rows[0].exists).toBe(true);
            (0, globals_1.expect)(empStructure.rows.length).toBeGreaterThan(0);
            const hasSalary = empStructure.rows.some(row => row.column_name === 'salary');
            if (!hasSalary) {
                throw new Error(`Salary column not found. Available columns: ${empStructure.rows.map(r => r.column_name).join(', ')}`);
            }
            (0, globals_1.expect)(salaryCheck.rows.length).toBe(1);
        }
        finally {
            client.release();
        }
    });
});
//# sourceMappingURL=database-schema-check.test.js.map