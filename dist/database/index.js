"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.database = exports.DatabaseService = void 0;
exports.initializeDatabase = initializeDatabase;
exports.getPool = getPool;
exports.pool = getPool;
const database_service_1 = require("./database.service");
const dbService = database_service_1.DatabaseService.getInstance();
exports.database = dbService;
let pool;
async function initializeDatabase() {
    await dbService.connect();
    pool = dbService.getPool();
}
function getPool() {
    if (!pool) {
        try {
            pool = dbService.getPool();
        }
        catch (error) {
            console.warn('Database not connected, attempting to connect...');
            throw new Error('Database not initialized. Call initializeDatabase() first.');
        }
    }
    return pool;
}
var database_service_2 = require("./database.service");
Object.defineProperty(exports, "DatabaseService", { enumerable: true, get: function () { return database_service_2.DatabaseService; } });
//# sourceMappingURL=index.js.map