#!/usr/bin/env ts-node
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const connection_1 = require("../src/database/connection");
const migrator_1 = require("../src/database/migrator");
const database_1 = require("../config/database");
async function runMigrations() {
    const config = (0, database_1.getDatabaseConfig)();
    const connection = new connection_1.DatabaseConnection(config);
    try {
        console.log('Connecting to database...');
        await connection.connect();
        const migrator = new migrator_1.DatabaseMigrator(connection.getPool());
        const command = process.argv[2];
        switch (command) {
            case 'status':
                await migrator.getStatus();
                break;
            case 'up':
            case 'migrate':
            default:
                await migrator.migrate();
                break;
            case 'rollback':
                const target = process.argv[3];
                await migrator.rollback(target);
                break;
        }
    }
    catch (error) {
        console.error('Migration error:', error);
        process.exit(1);
    }
    finally {
        await connection.disconnect();
    }
}
if (require.main === module) {
    runMigrations();
}
//# sourceMappingURL=migrate.js.map