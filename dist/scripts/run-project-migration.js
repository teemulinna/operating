#!/usr/bin/env ts-node
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runProjectMigration = runProjectMigration;
const database_service_1 = require("../database/database.service");
const _20250905235109_create_projects_table_1 = require("../migrations/20250905235109_create_projects_table");
async function runProjectMigration() {
    console.log('🚀 Running Project Management System Migration...\n');
    try {
        const dbService = database_service_1.DatabaseService.getInstance();
        await dbService.connect();
        console.log('✅ Database connected successfully');
        await _20250905235109_create_projects_table_1.migration.up(dbService.getPool());
        console.log('✅ Projects table created successfully');
        const result = await dbService.query(`
      SELECT column_name, data_type, is_nullable, column_default 
      FROM information_schema.columns 
      WHERE table_name = 'projects' 
      ORDER BY ordinal_position
    `);
        console.log('\n📊 Projects Table Schema:');
        console.log('┌─────────────────┬──────────────────┬───────────┬─────────────────┐');
        console.log('│ Column          │ Type             │ Nullable  │ Default         │');
        console.log('├─────────────────┼──────────────────┼───────────┼─────────────────┤');
        result.rows.forEach((row) => {
            const column = row.column_name.padEnd(15);
            const type = row.data_type.padEnd(16);
            const nullable = row.is_nullable.padEnd(9);
            const defaultVal = (row.column_default || 'null').padEnd(15);
            console.log(`│ ${column} │ ${type} │ ${nullable} │ ${defaultVal} │`);
        });
        console.log('└─────────────────┴──────────────────┴───────────┴─────────────────┘');
        const indexes = await dbService.query(`
      SELECT indexname, indexdef 
      FROM pg_indexes 
      WHERE tablename = 'projects'
    `);
        console.log('\n🗂️  Created Indexes:');
        indexes.rows.forEach((row) => {
            console.log(`  • ${row.indexname}`);
        });
        console.log('\n✨ Project Management System is ready!');
        console.log('\nNext steps:');
        console.log('1. Run tests: npm run test -- --testNamePattern="Project Management System"');
        console.log('2. Start the server: npm run dev');
        console.log('3. Test API endpoints at http://localhost:3001/api/projects');
    }
    catch (error) {
        console.error('❌ Migration failed:', error);
        process.exit(1);
    }
    finally {
        await database_service_1.DatabaseService.disconnect();
    }
}
if (require.main === module) {
    runProjectMigration();
}
//# sourceMappingURL=run-project-migration.js.map