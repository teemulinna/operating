"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DatabaseFactory = void 0;
const database_service_1 = require("./database.service");
const connection_1 = require("./connection");
const database_1 = require("../config/database");
/**
 * Database Factory to ensure consistent database service creation
 * and resolve singleton pattern conflicts
 */
class DatabaseFactory {
    /**
     * Get the singleton DatabaseService instance
     */
    static async getDatabaseService() {
        if (!this.databaseService) {
            this.databaseService = database_service_1.DatabaseService.getInstance();
            await this.databaseService.connect();
        }
        return this.databaseService;
    }
    /**
     * Get the DatabaseConnection instance (for migrations)
     */
    static async getDatabaseConnection() {
        if (!this.databaseConnection) {
            const config = (0, database_1.getDatabaseConfig)();
            this.databaseConnection = new connection_1.DatabaseConnection(config);
            await this.databaseConnection.connect();
        }
        return this.databaseConnection;
    }
    /**
     * Get test database service
     */
    static async getTestDatabaseService() {
        if (process.env.NODE_ENV !== 'test') {
            throw new Error('Test database service can only be used in test environment');
        }
        // Reset singleton for test isolation
        database_service_1.DatabaseService.resetInstance();
        const testService = database_service_1.DatabaseService.getInstance();
        await testService.connect();
        return testService;
    }
    /**
     * Get test database connection
     */
    static async getTestDatabaseConnection() {
        if (process.env.NODE_ENV !== 'test') {
            throw new Error('Test database connection can only be used in test environment');
        }
        const config = (0, database_1.getTestDatabaseConfig)();
        const testConnection = new connection_1.DatabaseConnection(config);
        await testConnection.connect();
        return testConnection;
    }
    /**
     * Reset all instances (for testing)
     */
    static async reset() {
        if (this.databaseService) {
            await this.databaseService.disconnect();
            database_service_1.DatabaseService.resetInstance();
            this.databaseService = null;
        }
        if (this.databaseConnection) {
            await this.databaseConnection.disconnect();
            this.databaseConnection = null;
        }
    }
    /**
     * Close all connections
     */
    static async closeAll() {
        await this.reset();
    }
}
exports.DatabaseFactory = DatabaseFactory;
DatabaseFactory.databaseService = null;
DatabaseFactory.databaseConnection = null;
