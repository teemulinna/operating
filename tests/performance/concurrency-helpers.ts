/**
 * Helper utilities for concurrency testing
 */

export interface ConcurrencyTestConfig {
  userCount: number;
  performanceThreshold: number;
  retryAttempts: number;
  loadTestIterations: number;
  operationTimeout: number;
}

export const DEFAULT_CONCURRENCY_CONFIG: ConcurrencyTestConfig = {
  userCount: 5,
  performanceThreshold: 5000, // 5 seconds
  retryAttempts: 3,
  loadTestIterations: 10,
  operationTimeout: 1000
};

export interface OperationResult<T = any> {
  result?: T;
  error?: Error;
  responseTime: number;
  timestamp: number;
}

export interface ConcurrencyMetrics {
  successCount: number;
  errorCount: number;
  averageResponseTime: number;
  maxResponseTime: number;
  minResponseTime: number;
  errors: Error[];
  successRate: number;
  throughput: number;
  operations: OperationResult[];
}

/**
 * Executes an operation concurrently and collects detailed metrics
 */
export async function executeConcurrentOperation<T>(
  operation: () => Promise<T>,
  config: Partial<ConcurrencyTestConfig> = {}
): Promise<ConcurrencyMetrics> {
  const finalConfig = { ...DEFAULT_CONCURRENCY_CONFIG, ...config };
  const startTime = Date.now();
  const promises: Promise<OperationResult<T>>[] = [];

  for (let i = 0; i < finalConfig.userCount; i++) {
    promises.push(
      (async () => {
        const operationStart = Date.now();
        const timestamp = operationStart;

        try {
          const result = await Promise.race([
            operation(),
            new Promise<never>((_, reject) =>
              setTimeout(() => reject(new Error('Operation timeout')), finalConfig.operationTimeout)
            )
          ]);

          return {
            result,
            responseTime: Date.now() - operationStart,
            timestamp
          };
        } catch (error) {
          return {
            error: error as Error,
            responseTime: Date.now() - operationStart,
            timestamp
          };
        }
      })()
    );
  }

  const results = await Promise.all(promises);
  const totalTime = Date.now() - startTime;

  const errors = results.filter(r => r.error).map(r => r.error!);
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
    throughput: (results.length / totalTime) * 1000, // operations per second
    operations: results
  };
}

/**
 * Simulates realistic user think time between operations
 */
export function simulateThinkTime(minMs: number = 100, maxMs: number = 500): Promise<void> {
  const thinkTime = Math.random() * (maxMs - minMs) + minMs;
  return new Promise(resolve => setTimeout(resolve, thinkTime));
}

/**
 * Creates a load test scenario with gradual ramp-up
 */
export async function executeLoadTest<T>(
  operation: () => Promise<T>,
  config: {
    startUsers: number;
    endUsers: number;
    rampUpTimeMs: number;
    testDurationMs: number;
    operationIntervalMs?: number;
  }
): Promise<{
  metrics: ConcurrencyMetrics[];
  summary: {
    totalOperations: number;
    totalErrors: number;
    averageThroughput: number;
    peakThroughput: number;
  };
}> {
  const metrics: ConcurrencyMetrics[] = [];
  const startTime = Date.now();
  const endTime = startTime + config.testDurationMs;

  let currentUsers = config.startUsers;
  const userIncrement = (config.endUsers - config.startUsers) / (config.rampUpTimeMs / 1000);

  while (Date.now() < endTime) {
    // Gradually increase user count during ramp-up period
    if (Date.now() - startTime < config.rampUpTimeMs) {
      currentUsers = Math.min(
        config.endUsers,
        config.startUsers + ((Date.now() - startTime) / 1000) * userIncrement
      );
    } else {
      currentUsers = config.endUsers;
    }

    const iterationMetrics = await executeConcurrentOperation(operation, {
      userCount: Math.ceil(currentUsers)
    });

    metrics.push(iterationMetrics);

    // Wait between iterations if specified
    if (config.operationIntervalMs) {
      await new Promise(resolve => setTimeout(resolve, config.operationIntervalMs));
    }
  }

  // Calculate summary statistics
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

/**
 * Retry operation with exponential backoff
 */
export async function retryWithBackoff<T>(
  operation: () => Promise<T>,
  maxAttempts: number = 3,
  baseDelayMs: number = 100
): Promise<T> {
  let lastError: Error;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;

      if (attempt === maxAttempts - 1) {
        throw lastError;
      }

      // Exponential backoff with jitter
      const delay = baseDelayMs * Math.pow(2, attempt) * (0.5 + Math.random() * 0.5);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError!;
}

/**
 * Monitors resource usage during test execution
 */
export class ResourceMonitor {
  private metrics: Array<{
    timestamp: number;
    memoryUsage: NodeJS.MemoryUsage;
    cpuUsage?: NodeJS.CpuUsage;
  }> = [];

  private intervalId: NodeJS.Timeout | null = null;
  private startCpuUsage?: NodeJS.CpuUsage;

  start(intervalMs: number = 1000): void {
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

  stop(): {
    duration: number;
    samples: number;
    peakMemoryMB: number;
    averageMemoryMB: number;
    totalCpuMs: number;
  } {
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

/**
 * Database connection pool manager for testing
 */
export class TestConnectionPool {
  private connections: any[] = [];
  private activeConnections = 0;
  private maxConnections: number;

  constructor(private db: any, maxConnections: number = 10) {
    this.maxConnections = maxConnections;
  }

  async getConnection(): Promise<any> {
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

    // Wait for a connection to become available
    return new Promise((resolve) => {
      const checkForConnection = () => {
        if (this.connections.length > 0) {
          const connection = this.connections.pop();
          this.activeConnections++;
          resolve(connection);
        } else {
          setTimeout(checkForConnection, 10);
        }
      };
      checkForConnection();
    });
  }

  releaseConnection(connection: any): void {
    this.activeConnections--;
    this.connections.push(connection);
  }

  async closeAll(): Promise<void> {
    // Close all pooled connections
    for (const connection of this.connections) {
      try {
        connection.release();
      } catch (error) {
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

/**
 * Test data generator for concurrency tests
 */
export class ConcurrencyTestDataGenerator {
  static generateUsers(count: number): Array<{
    id: string;
    name: string;
    email: string;
    role: 'manager' | 'admin' | 'employee';
  }> {
    return Array.from({ length: count }, (_, i) => ({
      id: `user_${i + 1}`,
      name: `Test User ${i + 1}`,
      email: `user${i + 1}@concurrency-test.com`,
      role: (i % 3 === 0 ? 'manager' : i % 3 === 1 ? 'admin' : 'employee') as 'manager' | 'admin' | 'employee'
    }));
  }

  static generateProjects(count: number): Array<{
    name: string;
    description: string;
    startDate: string;
    endDate: string;
    budget: number;
    status: string;
  }> {
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

  static generateEmployees(count: number, departmentId: string): Array<{
    name: string;
    email: string;
    departmentId: string;
    capacity: number;
    skills?: string[];
  }> {
    const skills = ['JavaScript', 'TypeScript', 'React', 'Node.js', 'Python', 'Java', 'C#', 'SQL'];

    return Array.from({ length: count }, (_, i) => ({
      name: `Test Employee ${i + 1}`,
      email: `employee${i + 1}@concurrency-test.com`,
      departmentId,
      capacity: 35 + Math.floor(Math.random() * 10), // 35-44 hours per week
      skills: skills.slice(0, Math.floor(Math.random() * 4) + 2) // 2-5 skills
    }));
  }

  static generateResourceAllocations(
    employees: Array<{ id: string }>,
    projects: Array<{ id: string }>,
    count: number
  ): Array<{
    employeeId: string;
    projectId: string;
    startDate: string;
    endDate: string;
    hoursPerWeek: number;
    role: string;
  }> {
    const roles = ['Developer', 'Senior Developer', 'Tech Lead', 'Architect', 'Tester', 'Designer'];
    const currentYear = new Date().getFullYear();

    return Array.from({ length: count }, (_, i) => {
      const employee = employees[Math.floor(Math.random() * employees.length)];
      const project = projects[Math.floor(Math.random() * projects.length)];
      const startMonth = Math.floor(Math.random() * 12) + 1;
      const duration = Math.floor(Math.random() * 3) + 1; // 1-3 months
      const endMonth = Math.min(startMonth + duration, 12);

      return {
        employeeId: employee.id,
        projectId: project.id,
        startDate: `${currentYear}-${startMonth.toString().padStart(2, '0')}-01`,
        endDate: `${currentYear}-${endMonth.toString().padStart(2, '0')}-28`,
        hoursPerWeek: Math.floor(Math.random() * 30) + 10, // 10-39 hours
        role: roles[Math.floor(Math.random() * roles.length)]
      };
    });
  }
}

/**
 * Performance assertion helpers
 */
export class PerformanceAssertions {
  static assertResponseTime(
    metrics: ConcurrencyMetrics,
    maxMs: number,
    message?: string
  ): void {
    if (metrics.maxResponseTime > maxMs) {
      throw new Error(
        message || `Maximum response time ${metrics.maxResponseTime}ms exceeds threshold ${maxMs}ms`
      );
    }
  }

  static assertSuccessRate(
    metrics: ConcurrencyMetrics,
    minRate: number,
    message?: string
  ): void {
    if (metrics.successRate < minRate) {
      throw new Error(
        message || `Success rate ${metrics.successRate.toFixed(2)}% is below threshold ${minRate}%`
      );
    }
  }

  static assertThroughput(
    metrics: ConcurrencyMetrics,
    minOpsPerSecond: number,
    message?: string
  ): void {
    if (metrics.throughput < minOpsPerSecond) {
      throw new Error(
        message || `Throughput ${metrics.throughput.toFixed(2)} ops/sec is below threshold ${minOpsPerSecond} ops/sec`
      );
    }
  }

  static assertNoDeadlocks(metrics: ConcurrencyMetrics): void {
    const deadlockErrors = metrics.errors.filter(error =>
      error.message.includes('deadlock') ||
      error.message.includes('40P01')
    );

    if (deadlockErrors.length > 0) {
      throw new Error(`Found ${deadlockErrors.length} deadlock errors`);
    }
  }

  static assertDataConsistency<T>(
    beforeState: T,
    afterState: T,
    validator: (before: T, after: T) => boolean,
    message?: string
  ): void {
    if (!validator(beforeState, afterState)) {
      throw new Error(
        message || 'Data consistency check failed'
      );
    }
  }
}