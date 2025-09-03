const express = require('express');
const { Pool } = require('pg');
const Redis = require('redis');
const promClient = require('prom-client');

// Metrics
const httpRequestDuration = new promClient.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.1, 0.5, 1, 2, 5]
});

const httpRequestsTotal = new promClient.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code']
});

const databaseConnectionsActive = new promClient.Gauge({
  name: 'database_connections_active',
  help: 'Number of active database connections'
});

const databaseQueryDuration = new promClient.Histogram({
  name: 'database_query_duration_seconds',
  help: 'Duration of database queries in seconds',
  buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5]
});

const redisConnectionsActive = new promClient.Gauge({
  name: 'redis_connections_active',
  help: 'Number of active Redis connections'
});

const applicationUptime = new promClient.Gauge({
  name: 'application_uptime_seconds',
  help: 'Application uptime in seconds'
});

const memoryUsage = new promClient.Gauge({
  name: 'nodejs_memory_usage_bytes',
  help: 'Node.js memory usage in bytes',
  labelNames: ['type']
});

// Database pool
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'employee_management',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Redis client
let redisClient;
if (process.env.REDIS_URL) {
  redisClient = Redis.createClient({
    url: process.env.REDIS_URL,
    retry_strategy: (options) => {
      if (options.error && options.error.code === 'ECONNREFUSED') {
        return new Error('Redis server connection refused');
      }
      if (options.total_retry_time > 1000 * 60 * 60) {
        return new Error('Redis retry time exhausted');
      }
      if (options.attempt > 10) {
        return undefined;
      }
      return Math.min(options.attempt * 100, 3000);
    }
  });
}

// Health check functions
const checkDatabase = async () => {
  const start = Date.now();
  try {
    const client = await pool.connect();
    const result = await client.query('SELECT 1 as healthy');
    client.release();
    
    const duration = (Date.now() - start) / 1000;
    databaseQueryDuration.observe(duration);
    databaseConnectionsActive.set(pool.totalCount - pool.idleCount);
    
    return {
      status: 'healthy',
      responseTime: duration,
      details: {
        totalConnections: pool.totalCount,
        idleConnections: pool.idleCount,
        activeConnections: pool.totalCount - pool.idleCount
      }
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      error: error.message,
      responseTime: (Date.now() - start) / 1000
    };
  }
};

const checkRedis = async () => {
  if (!redisClient) {
    return {
      status: 'disabled',
      message: 'Redis not configured'
    };
  }
  
  const start = Date.now();
  try {
    const pong = await redisClient.ping();
    const responseTime = (Date.now() - start) / 1000;
    
    redisConnectionsActive.set(1);
    
    return {
      status: pong === 'PONG' ? 'healthy' : 'unhealthy',
      responseTime,
      details: {
        response: pong
      }
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      error: error.message,
      responseTime: (Date.now() - start) / 1000
    };
  }
};

const checkMemoryUsage = () => {
  const usage = process.memoryUsage();
  
  memoryUsage.set({ type: 'rss' }, usage.rss);
  memoryUsage.set({ type: 'heapTotal' }, usage.heapTotal);
  memoryUsage.set({ type: 'heapUsed' }, usage.heapUsed);
  memoryUsage.set({ type: 'external' }, usage.external);
  
  return {
    status: 'healthy',
    details: {
      rss: usage.rss,
      heapTotal: usage.heapTotal,
      heapUsed: usage.heapUsed,
      external: usage.external,
      heapUsedPercentage: Math.round((usage.heapUsed / usage.heapTotal) * 100)
    }
  };
};

const checkDiskSpace = () => {
  const stats = require('fs').statSync('./');
  return {
    status: 'healthy',
    details: {
      // Basic disk info - in production, use a proper library
      available: 'N/A',
      used: 'N/A',
      total: 'N/A'
    }
  };
};

// Health check endpoint
const healthCheck = async () => {
  const startTime = Date.now();
  
  try {
    const [database, redis, memory, disk] = await Promise.all([
      checkDatabase(),
      checkRedis(),
      checkMemoryUsage(),
      checkDiskSpace()
    ]);
    
    const responseTime = Date.now() - startTime;
    
    // Update uptime metric
    applicationUptime.set(process.uptime());
    
    const overallStatus = [database, redis]
      .filter(check => check.status !== 'disabled')
      .every(check => check.status === 'healthy') ? 'healthy' : 'unhealthy';
    
    return {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      responseTime: responseTime / 1000,
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      services: {
        database,
        redis,
        memory,
        disk
      }
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error.message,
      uptime: process.uptime(),
      responseTime: (Date.now() - startTime) / 1000
    };
  }
};

// Readiness check (for Kubernetes)
const readinessCheck = async () => {
  try {
    const dbCheck = await checkDatabase();
    return {
      status: dbCheck.status === 'healthy' ? 'ready' : 'not ready',
      timestamp: new Date().toISOString(),
      services: {
        database: dbCheck
      }
    };
  } catch (error) {
    return {
      status: 'not ready',
      timestamp: new Date().toISOString(),
      error: error.message
    };
  }
};

// Liveness check (for Kubernetes)
const livenessCheck = () => {
  return {
    status: 'alive',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage()
  };
};

// Metrics middleware
const metricsMiddleware = (req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = (Date.now() - start) / 1000;
    const route = req.route?.path || req.path;
    
    httpRequestDuration
      .labels(req.method, route, res.statusCode.toString())
      .observe(duration);
    
    httpRequestsTotal
      .labels(req.method, route, res.statusCode.toString())
      .inc();
  });
  
  next();
};

// Graceful shutdown
const gracefulShutdown = async () => {
  console.log('Starting graceful shutdown...');
  
  try {
    // Close database connections
    await pool.end();
    console.log('Database connections closed');
    
    // Close Redis connection
    if (redisClient) {
      await redisClient.quit();
      console.log('Redis connection closed');
    }
    
    console.log('Graceful shutdown completed');
    process.exit(0);
  } catch (error) {
    console.error('Error during graceful shutdown:', error);
    process.exit(1);
  }
};

// Handle shutdown signals
process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

// Collect default metrics
promClient.collectDefaultMetrics();

module.exports = {
  healthCheck,
  readinessCheck,
  livenessCheck,
  metricsMiddleware,
  metrics: promClient.register,
  gracefulShutdown
};