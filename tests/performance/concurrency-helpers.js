"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PerformanceAssertions = exports.ConcurrencyTestDataGenerator = exports.TestConnectionPool = exports.ResourceMonitor = exports.DEFAULT_CONCURRENCY_CONFIG = void 0;
exports.executeConcurrentOperation = executeConcurrentOperation;
exports.simulateThinkTime = simulateThinkTime;
exports.executeLoadTest = executeLoadTest;
exports.retryWithBackoff = retryWithBackoff;
exports.DEFAULT_CONCURRENCY_CONFIG = {
    userCount: 5,
    performanceThreshold: 5000,
    retryAttempts: 3,
    loadTestIterations: 10,
    operationTimeout: 1000
};
async function executeConcurrentOperation(operation, config = {}) {
    const finalConfig = { ...exports.DEFAULT_CONCURRENCY_CONFIG, ...config };
    const startTime = Date.now();
    const promises = [];
    for (let i = 0; i < finalConfig.userCount; i++) {
        promises.push((async () => {
            const operationStart = Date.now();
            const timestamp = operationStart;
            try {
                const result = await Promise.race([
                    operation(),
                    new Promise((_, reject) => setTimeout(() => reject(new Error('Operation timeout')), finalConfig.operationTimeout))
                ]);
                return {
                    result,
                    responseTime: Date.now() - operationStart,
                    timestamp
                };
            }
            catch (error) {
                return {
                    error: error,
                    responseTime: Date.now() - operationStart,
                    timestamp
                };
            }
        })());
    }
    const results = await Promise.all(promises);
    const totalTime = Date.now() - startTime;
    const errors = results.filter(r => r.error).map(r => r.error);
    const responseTimes = results.map(r => r.responseTime);
    const successCount = results.length - errors.length;
    return {
        successCount,
        errorCount: errors.length,
        averageResponseTime: responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length,
        maxResponseTime: Math.max(...responseTimes),
        minResponseTime: Math.min(...responseTimes),
        errors,
        successRate: (successCount / results.length) * 100,
        throughput: (results.length / totalTime) * 1000,
        operations: results
    };
}
function simulateThinkTime(minMs = 100, maxMs = 500) {
    const thinkTime = Math.random() * (maxMs - minMs) + minMs;
    return new Promise(resolve => setTimeout(resolve, thinkTime));
}
async function executeLoadTest(operation, config) {
    const metrics = [];
    const startTime = Date.now();
    const endTime = startTime + config.testDurationMs;
    let currentUsers = config.startUsers;
    const userIncrement = (config.endUsers - config.startUsers) / (config.rampUpTimeMs / 1000);
    while (Date.now() < endTime) {
        if (Date.now() - startTime < config.rampUpTimeMs) {
            currentUsers = Math.min(config.endUsers, config.startUsers + ((Date.now() - startTime) / 1000) * userIncrement);
        }
        else {
            currentUsers = config.endUsers;
        }
        const iterationMetrics = await executeConcurrentOperation(operation, {
            userCount: Math.ceil(currentUsers)
        });
        metrics.push(iterationMetrics);
        if (config.operationIntervalMs) {
            await new Promise(resolve => setTimeout(resolve, config.operationIntervalMs));
        }
    }
    const totalOperations = metrics.reduce((sum, m) => sum + m.successCount + m.errorCount, 0);
    const totalErrors = metrics.reduce((sum, m) => sum + m.errorCount, 0);
    const throughputs = metrics.map(m => m.throughput);
    const averageThroughput = throughputs.reduce((sum, t) => sum + t, 0) / throughputs.length;
    const peakThroughput = Math.max(...throughputs);
    return {
        metrics,
        summary: {
            totalOperations,
            totalErrors,
            averageThroughput,
            peakThroughput
        }
    };
}
async function retryWithBackoff(operation, maxAttempts = 3, baseDelayMs = 100) {
    let lastError;
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
        try {
            return await operation();
        }
        catch (error) {
            lastError = error;
            if (attempt === maxAttempts - 1) {
                throw lastError;
            }
            const delay = baseDelayMs * Math.pow(2, attempt) * (0.5 + Math.random() * 0.5);
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }
    throw lastError;
}
class ResourceMonitor {
    constructor() {
        this.metrics = [];
        this.intervalId = null;
    }
    start(intervalMs = 1000) {
        this.startCpuUsage = process.cpuUsage();
        this.metrics = [];
        this.intervalId = setInterval(() => {
            this.metrics.push({
                timestamp: Date.now(),
                memoryUsage: process.memoryUsage(),
                cpuUsage: process.cpuUsage(this.startCpuUsage)
            });
        }, intervalMs);
    }
    stop() {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
        if (this.metrics.length === 0) {
            return {
                duration: 0,
                samples: 0,
                peakMemoryMB: 0,
                averageMemoryMB: 0,
                totalCpuMs: 0
            };
        }
        const duration = this.metrics[this.metrics.length - 1].timestamp - this.metrics[0].timestamp;
        const memoryUsages = this.metrics.map(m => m.memoryUsage.heapUsed / 1024 / 1024);
        const peakMemoryMB = Math.max(...memoryUsages);
        const averageMemoryMB = memoryUsages.reduce((sum, mem) => sum + mem, 0) / memoryUsages.length;
        const lastCpuUsage = this.metrics[this.metrics.length - 1].cpuUsage;
        const totalCpuMs = lastCpuUsage ? (lastCpuUsage.user + lastCpuUsage.system) / 1000 : 0;
        return {
            duration,
            samples: this.metrics.length,
            peakMemoryMB,
            averageMemoryMB,
            totalCpuMs
        };
    }
    getMetrics() {
        return [...this.metrics];
    }
}
exports.ResourceMonitor = ResourceMonitor;
class TestConnectionPool {
    constructor(db, maxConnections = 10) {
        this.db = db;
        this.connections = [];
        this.activeConnections = 0;
        this.maxConnections = maxConnections;
    }
    async getConnection() {
        if (this.connections.length > 0) {
            const connection = this.connections.pop();
            this.activeConnections++;
            return connection;
        }
        if (this.activeConnections < this.maxConnections) {
            const connection = await this.db.getClient();
            this.activeConnections++;
            return connection;
        }
        return new Promise((resolve) => {
            const checkForConnection = () => {
                if (this.connections.length > 0) {
                    const connection = this.connections.pop();
                    this.activeConnections++;
                    resolve(connection);
                }
                else {
                    setTimeout(checkForConnection, 10);
                }
            };
            checkForConnection();
        });
    }
    releaseConnection(connection) {
        this.activeConnections--;
        this.connections.push(connection);
    }
    async closeAll() {
        for (const connection of this.connections) {
            try {
                connection.release();
            }
            catch (error) {
                console.warn('Error releasing connection:', error);
            }
        }
        this.connections = [];
        this.activeConnections = 0;
    }
    getStats() {
        return {
            totalConnections: this.connections.length + this.activeConnections,
            activeConnections: this.activeConnections,
            pooledConnections: this.connections.length,
            maxConnections: this.maxConnections
        };
    }
}
exports.TestConnectionPool = TestConnectionPool;
class ConcurrencyTestDataGenerator {
    static generateUsers(count) {
        return Array.from({ length: count }, (_, i) => ({
            id: `user_${i + 1}`,
            name: `Test User ${i + 1}`,
            email: `user${i + 1}@concurrency-test.com`,
            role: (i % 3 === 0 ? 'manager' : i % 3 === 1 ? 'admin' : 'employee')
        }));
    }
    static generateProjects(count) {
        const statuses = ['active', 'planning', 'on_hold', 'completed'];
        const currentYear = new Date().getFullYear();
        return Array.from({ length: count }, (_, i) => {
            const startMonth = Math.floor(Math.random() * 12) + 1;
            const endMonth = Math.min(startMonth + Math.floor(Math.random() * 6) + 1, 12);
            return {
                name: `Concurrency Test Project ${i + 1}`,
                description: `Test project ${i + 1} for concurrency testing scenarios`,
                startDate: `${currentYear}-${startMonth.toString().padStart(2, '0')}-01`,
                endDate: `${currentYear}-${endMonth.toString().padStart(2, '0')}-28`,
                budget: 50000 + (Math.random() * 200000),
                status: statuses[Math.floor(Math.random() * statuses.length)]
            };
        });
    }
    static generateEmployees(count, departmentId) {
        const skills = ['JavaScript', 'TypeScript', 'React', 'Node.js', 'Python', 'Java', 'C#', 'SQL'];
        return Array.from({ length: count }, (_, i) => ({
            name: `Test Employee ${i + 1}`,
            email: `employee${i + 1}@concurrency-test.com`,
            departmentId,
            capacity: 35 + Math.floor(Math.random() * 10),
            skills: skills.slice(0, Math.floor(Math.random() * 4) + 2)
        }));
    }
    static generateResourceAllocations(employees, projects, count) {
        const roles = ['Developer', 'Senior Developer', 'Tech Lead', 'Architect', 'Tester', 'Designer'];
        const currentYear = new Date().getFullYear();
        return Array.from({ length: count }, (_, i) => {
            const employee = employees[Math.floor(Math.random() * employees.length)];
            const project = projects[Math.floor(Math.random() * projects.length)];
            const startMonth = Math.floor(Math.random() * 12) + 1;
            const duration = Math.floor(Math.random() * 3) + 1;
            const endMonth = Math.min(startMonth + duration, 12);
            return {
                employeeId: employee.id,
                projectId: project.id,
                startDate: `${currentYear}-${startMonth.toString().padStart(2, '0')}-01`,
                endDate: `${currentYear}-${endMonth.toString().padStart(2, '0')}-28`,
                hoursPerWeek: Math.floor(Math.random() * 30) + 10,
                role: roles[Math.floor(Math.random() * roles.length)]
            };
        });
    }
}
exports.ConcurrencyTestDataGenerator = ConcurrencyTestDataGenerator;
class PerformanceAssertions {
    static assertResponseTime(metrics, maxMs, message) {
        if (metrics.maxResponseTime > maxMs) {
            throw new Error(message || `Maximum response time ${metrics.maxResponseTime}ms exceeds threshold ${maxMs}ms`);
        }
    }
    static assertSuccessRate(metrics, minRate, message) {
        if (metrics.successRate < minRate) {
            throw new Error(message || `Success rate ${metrics.successRate.toFixed(2)}% is below threshold ${minRate}%`);
        }
    }
    static assertThroughput(metrics, minOpsPerSecond, message) {
        if (metrics.throughput < minOpsPerSecond) {
            throw new Error(message || `Throughput ${metrics.throughput.toFixed(2)} ops/sec is below threshold ${minOpsPerSecond} ops/sec`);
        }
    }
    static assertNoDeadlocks(metrics) {
        const deadlockErrors = metrics.errors.filter(error => error.message.includes('deadlock') ||
            error.message.includes('40P01'));
        if (deadlockErrors.length > 0) {
            throw new Error(`Found ${deadlockErrors.length} deadlock errors`);
        }
    }
    static assertDataConsistency(beforeState, afterState, validator, message) {
        if (!validator(beforeState, afterState)) {
            throw new Error(message || 'Data consistency check failed');
        }
    }
}
exports.PerformanceAssertions = PerformanceAssertions;
//# sourceMappingURL=concurrency-helpers.js.map