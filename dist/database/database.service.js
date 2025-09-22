"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DatabaseService = void 0;
const pg_1 = require("pg");
class DatabaseService {
    constructor() {
        this.pool = null;
        this.connecting = null;
    }
    static getInstance() {
        if (!DatabaseService.instance) {
            DatabaseService.instance = new DatabaseService();
        }
        return DatabaseService.instance;
    }
    static resetInstance() {
        if (DatabaseService.instance && DatabaseService.instance.pool) {
            DatabaseService.instance.pool.end().catch(() => { });
            DatabaseService.instance.pool = null;
        }
        DatabaseService.instance = null;
    }
    static async disconnect() {
        if (DatabaseService.instance) {
            await DatabaseService.instance.disconnect();
            DatabaseService.instance = null;
        }
    }
    async connect() {
        if (this.pool)
            return;
        if (this.connecting) {
            return this.connecting;
        }
        this.connecting = this.createConnection();
        try {
            await this.connecting;
        }
        finally {
            this.connecting = null;
        }
    }
    async createConnection() {
        const isTestEnv = process.env.NODE_ENV === 'test';
        const defaultDatabase = isTestEnv ? 'employee_test' : 'employee_management';
        const config = process.env.DATABASE_URL ? {
            connectionString: process.env.DATABASE_URL,
            max: isTestEnv ? 5 : 20,
            idleTimeoutMillis: isTestEnv ? 1000 : 30000,
            connectionTimeoutMillis: isTestEnv ? 5000 : 2000,
            ssl: false
        } : {
            host: process.env.DB_HOST || 'localhost',
            port: parseInt(process.env.DB_PORT || '5432'),
            database: process.env.DB_NAME || defaultDatabase,
            user: process.env.DB_USER || 'teemulinna',
            password: process.env.DB_PASSWORD || '',
            max: isTestEnv ? 5 : 20,
            idleTimeoutMillis: isTestEnv ? 1000 : 30000,
            connectionTimeoutMillis: isTestEnv ? 5000 : 2000,
            ssl: false
        };
        console.log(`🔗 Connecting to database: ${config.database || 'from URL'} (${process.env.NODE_ENV} environment)`);
        console.log(`🔗 Database config:`, {
            host: config.host,
            port: config.port,
            database: config.database || 'from_url',
            user: config.user
        });
        this.pool = this.createPool(config);
        try {
            const client = await this.pool.connect();
            if (process.env.NODE_ENV === 'test') {
                const userResult = await client.query('SELECT current_user, session_user');
                const dbResult = await client.query('SELECT current_database()');
                console.log('🔗 Connected as user:', userResult.rows[0]);
                console.log('🔗 Connected to database:', dbResult.rows[0]);
            }
            client.release();
            console.log('Database connected successfully');
        }
        catch (error) {
            console.error('Database connection failed:', error);
            if (this.pool) {
                await this.pool.end().catch(() => { });
                this.pool = null;
            }
            throw error;
        }
    }
    createPool(config) {
        return new pg_1.Pool(config);
    }
    async disconnect() {
        if (this.pool) {
            await this.pool.end();
            this.pool = null;
            console.log('Database disconnected');
        }
    }
    isConnected() {
        return this.pool !== null;
    }
    getPool() {
        if (!this.pool) {
            throw new Error('Database not connected. Call connect() first.');
        }
        return this.pool;
    }
    async closePool() {
        await this.disconnect();
    }
    async checkHealth() {
        if (!this.pool) {
            return false;
        }
        try {
            const client = await this.pool.connect();
            try {
                await client.query('SELECT 1');
                return true;
            }
            finally {
                client.release();
            }
        }
        catch (error) {
            console.error('Database health check failed:', error);
            return false;
        }
    }
    async reconnect() {
        console.log('Attempting to reconnect to database...');
        if (this.pool) {
            try {
                await this.pool.end();
            }
            catch (error) {
                console.error('Error closing existing connection:', error);
            }
            this.pool = null;
        }
        this.connecting = null;
        await this.connect();
    }
    async queryWithReconnect(text, params, maxRetries = 1) {
        try {
            return await this.query(text, params);
        }
        catch (error) {
            if (maxRetries > 0 && this.isConnectionError(error)) {
                console.warn('Connection error detected, attempting reconnection...');
                try {
                    await this.reconnect();
                    return await this.query(text, params);
                }
                catch (reconnectError) {
                    console.error('Reconnection failed:', reconnectError);
                    throw error;
                }
            }
            throw error;
        }
    }
    isConnectionError(error) {
        if (!error)
            return false;
        const connectionErrorCodes = [
            'ECONNREFUSED',
            'ENOTFOUND',
            'ECONNRESET',
            'EPIPE',
            'ETIMEDOUT'
        ];
        const pgConnectionErrorCodes = [
            '08000',
            '08003',
            '08006',
            '08001',
            '08004',
        ];
        return connectionErrorCodes.includes(error.code) ||
            pgConnectionErrorCodes.includes(error.code) ||
            error.message?.includes('Connection terminated') ||
            error.message?.includes('Client has encountered a connection error');
    }
    async query(text, params) {
        if (!this.pool) {
            throw new Error('Database not connected');
        }
        try {
            const start = Date.now();
            const result = await this.pool.query(text, params);
            const duration = Date.now() - start;
            if (process.env.NODE_ENV === 'development') {
                console.log('Query executed:', { text, duration, rows: result.rowCount });
            }
            return result;
        }
        catch (error) {
            console.error('Database query error:', error);
            throw error;
        }
    }
    async getClient() {
        if (!this.pool) {
            throw new Error('Database not connected');
        }
        return await this.pool.connect();
    }
    async runMigrations() {
        console.warn('runMigrations() is deprecated. Use DatabaseMigrator class instead.');
        console.log('Basic table creation skipped - use proper migrations.');
    }
    async clearTestData() {
        if (process.env.NODE_ENV !== 'test') {
            throw new Error('clearTestData can only be called in test environment');
        }
        await this.query('DELETE FROM employees');
        await this.query('DELETE FROM departments');
        await this.query('ALTER SEQUENCE IF EXISTS employees_id_seq RESTART WITH 1');
        await this.query('ALTER SEQUENCE IF EXISTS departments_id_seq RESTART WITH 1');
    }
    async seedTestData(data) {
        if (process.env.NODE_ENV !== 'test') {
            throw new Error('seedTestData can only be called in test environment');
        }
        for (const dept of data.departments) {
            await this.query('INSERT INTO departments (id, name, description) VALUES ($1, $2, $3)', [dept.id, dept.name, dept.description]);
        }
        for (const emp of data.employees) {
            await this.query(`INSERT INTO employees (id, first_name, last_name, email, position, department_id, salary, hire_date, skills) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`, [
                emp.id,
                emp.firstName,
                emp.lastName,
                emp.email,
                emp.position,
                emp.departmentId,
                emp.salary,
                emp.hireDate,
                emp.skills
            ]);
        }
    }
}
exports.DatabaseService = DatabaseService;
DatabaseService.instance = null;
//# sourceMappingURL=database.service.js.map