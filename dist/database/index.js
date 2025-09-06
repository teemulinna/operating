"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DatabaseSeeder = exports.DatabaseMigrator = exports.DatabaseConnection = void 0;
exports.initializeDatabase = initializeDatabase;
exports.runMigrations = runMigrations;
exports.seedDatabase = seedDatabase;
exports.closeDatabase = closeDatabase;
exports.getDatabase = getDatabase;
const connection_1 = require("./connection");
Object.defineProperty(exports, "DatabaseConnection", { enumerable: true, get: function () { return connection_1.DatabaseConnection; } });
const migrator_1 = require("./migrator");
Object.defineProperty(exports, "DatabaseMigrator", { enumerable: true, get: function () { return migrator_1.DatabaseMigrator; } });
const seeder_1 = require("./seeder");
Object.defineProperty(exports, "DatabaseSeeder", { enumerable: true, get: function () { return seeder_1.DatabaseSeeder; } });
const models_1 = require("../models");
const database_1 = require("../../config/database");
let dbConnection = null;
async function initializeDatabase() {
    if (dbConnection) {
        return dbConnection;
    }
    const config = (0, database_1.getDatabaseConfig)();
    dbConnection = new connection_1.DatabaseConnection(config);
    try {
        await dbConnection.connect();
        (0, models_1.initializeModels)(dbConnection.getPool());
        console.log('Database initialized successfully');
        return dbConnection;
    }
    catch (error) {
        console.error('Failed to initialize database:', error);
        throw error;
    }
}
async function runMigrations() {
    if (!dbConnection) {
        throw new Error('Database not initialized. Call initializeDatabase() first.');
    }
    const migrator = new migrator_1.DatabaseMigrator(dbConnection.getPool());
    await migrator.migrate();
}
async function seedDatabase() {
    if (!dbConnection) {
        throw new Error('Database not initialized. Call initializeDatabase() first.');
    }
    const seeder = new seeder_1.DatabaseSeeder(dbConnection.getPool());
    await seeder.seedAll();
}
async function closeDatabase() {
    if (dbConnection) {
        await dbConnection.disconnect();
        dbConnection = null;
    }
}
function getDatabase() {
    if (!dbConnection) {
        throw new Error('Database not initialized. Call initializeDatabase() first.');
    }
    return dbConnection;
}
__exportStar(require("../models"), exports);
__exportStar(require("../types"), exports);
//# sourceMappingURL=index.js.map