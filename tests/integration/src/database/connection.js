"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DatabaseConnection = void 0;
const pg_1 = require("pg");
class DatabaseConnection {
    constructor(config) {
        this.pool = null;
        this.config = config;
    }
    async connect() {
        try {
            const poolConfig = {
                host: this.config.host,
                port: this.config.port,
                database: this.config.database,
                user: this.config.user,
                password: this.config.password,
                ssl: this.config.ssl ? { rejectUnauthorized: false } : false,
                max: this.config.poolSize || 20,
                idleTimeoutMillis: this.config.idleTimeoutMillis || 30000,
                connectionTimeoutMillis: this.config.connectionTimeoutMillis || 10000,
                statement_timeout: 30000,
                query_timeout: 30000
            };
            this.pool = new pg_1.Pool(poolConfig);
            // Test the connection
            const client = await this.pool.connect();
            await client.query('SELECT NOW()');
            client.release();
            console.log('Database connection established successfully');
        }
        catch (error) {
            const dbError = new Error(`Database connection failed: ${error.message}`);
            dbError.code = error.code;
            dbError.detail = error.detail;
            throw dbError;
        }
    }
    async disconnect() {
        if (this.pool) {
            await this.pool.end();
            this.pool = null;
            console.log('Database connection closed');
        }
    }
    getPool() {
        if (!this.pool) {
            throw new Error('Database not connected. Call connect() first.');
        }
        return this.pool;
    }
    async isConnected() {
        if (!this.pool) {
            return false;
        }
        try {
            const client = await this.pool.connect();
            await client.query('SELECT 1');
            client.release();
            return true;
        }
        catch {
            return false;
        }
    }
    async executeTransaction(callback) {
        if (!this.pool) {
            throw new Error('Database not connected');
        }
        const client = await this.pool.connect();
        try {
            await client.query('BEGIN');
            const result = await callback(client);
            await client.query('COMMIT');
            return result;
        }
        catch (error) {
            await client.query('ROLLBACK');
            throw error;
        }
        finally {
            client.release();
        }
    }
    async query(text, params) {
        if (!this.pool) {
            throw new Error('Database not connected');
        }
        try {
            return await this.pool.query(text, params);
        }
        catch (error) {
            const dbError = new Error(`Query failed: ${error.message}`);
            dbError.code = error.code;
            dbError.constraint = error.constraint;
            dbError.table = error.table;
            dbError.detail = error.detail;
            throw dbError;
        }
    }
    async getClient() {
        if (!this.pool) {
            throw new Error('Database not connected');
        }
        return this.pool.connect();
    }
}
exports.DatabaseConnection = DatabaseConnection;
