#!/usr/bin/env ts-node
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const connection_1 = require("../src/database/connection");
const seeder_1 = require("../src/database/seeder");
const database_1 = require("../config/database");
async function runSeeding() {
    const config = (0, database_1.getDatabaseConfig)();
    const connection = new connection_1.DatabaseConnection(config);
    try {
        console.log('Connecting to database...');
        await connection.connect();
        const seeder = new seeder_1.DatabaseSeeder(connection.getPool());
        const command = process.argv[2];
        switch (command) {
            case 'clear':
                await seeder.clearData();
                break;
            case 'departments':
                await seeder.seedDepartments();
                break;
            case 'skills':
                await seeder.seedSkills();
                break;
            case 'all':
            default:
                await seeder.seedAll();
                break;
        }
    }
    catch (error) {
        console.error('Seeding error:', error);
        process.exit(1);
    }
    finally {
        await connection.disconnect();
    }
}
if (require.main === module) {
    runSeeding();
}
//# sourceMappingURL=seed.js.map