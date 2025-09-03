// Production Environment Configuration
module.exports = {
  // Server Configuration
  port: process.env.PORT || 3000,
  host: process.env.HOST || '0.0.0.0',
  
  // Environment
  env: 'production',
  
  // Database Configuration
  database: {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 5432,
    name: process.env.DB_NAME,
    username: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    dialect: 'postgres',
    ssl: process.env.DB_SSL === 'true',
    logging: false,
    pool: {
      max: parseInt(process.env.DB_POOL_MAX) || 10,
      min: parseInt(process.env.DB_POOL_MIN) || 0,
      acquire: parseInt(process.env.DB_POOL_ACQUIRE) || 30000,
      idle: parseInt(process.env.DB_POOL_IDLE) || 10000
    },
    dialectOptions: {
      ssl: process.env.DB_SSL === 'true' ? {
        require: true,
        rejectUnauthorized: false
      } : false
    }
  },
  
  // Redis Configuration
  redis: {
    url: process.env.REDIS_URL,
    password: process.env.REDIS_PASSWORD,
    connectTimeout: 10000,
    retryDelayOnFailover: 100,
    enableOfflineQueue: false,
    maxRetriesPerRequest: 3
  },
  
  // JWT Configuration
  jwt: {
    secret: process.env.JWT_SECRET,
    expiresIn: process.env.JWT_EXPIRES_IN || '24h',
    algorithm: 'HS256',
    issuer: process.env.JWT_ISSUER || 'employee-management-system',
    audience: process.env.JWT_AUDIENCE || 'employee-management-client'
  },
  
  // Security Configuration
  security: {
    bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS) || 12,
    sessionSecret: process.env.SESSION_SECRET,
    corsOrigins: process.env.ALLOWED_ORIGINS ? 
      process.env.ALLOWED_ORIGINS.split(',') : [],
    trustProxy: process.env.TRUST_PROXY === 'true',
    forceHttps: process.env.FORCE_HTTPS === 'true',
    helmet: {
      enabled: process.env.HELMET_ENABLED !== 'false',
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", "data:", "https:"],
          connectSrc: ["'self'"],
          fontSrc: ["'self'"],
          objectSrc: ["'none'"],
          mediaSrc: ["'self'"],
          frameSrc: ["'none'"],
        }
      },
      hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true
      }
    }
  },
  
  // Rate Limiting
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: false,
    skipFailedRequests: false
  },
  
  // Auth Rate Limiting (stricter)
  authRateLimit: {
    windowMs: parseInt(process.env.AUTH_RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
    max: parseInt(process.env.AUTH_RATE_LIMIT_MAX_REQUESTS) || 5,
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: false,
    skipFailedRequests: false,
    message: {
      error: 'Too many authentication attempts, please try again later.'
    }
  },
  
  // Logging Configuration
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    format: 'combined',
    file: {
      enabled: true,
      filename: process.env.LOG_FILE_PATH || 'logs/app.log',
      maxsize: parseInt(process.env.LOG_MAX_SIZE) || 10485760, // 10MB
      maxFiles: parseInt(process.env.LOG_MAX_FILES) || 5,
      colorize: false
    },
    console: {
      enabled: process.env.LOG_CONSOLE === 'true',
      colorize: false
    },
    error: {
      filename: 'logs/error.log'
    },
    exceptions: {
      filename: 'logs/exceptions.log'
    }
  },
  
  // File Upload Configuration
  upload: {
    directory: process.env.UPLOAD_DIR || 'uploads',
    maxSize: parseInt(process.env.MAX_FILE_SIZE) || 5 * 1024 * 1024, // 5MB
    allowedTypes: ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'],
    tempDirectory: process.env.TEMP_DIR || 'temp'
  },
  
  // Email Configuration
  email: {
    smtp: {
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT) || 587,
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    },
    from: process.env.EMAIL_FROM || 'noreply@company.com',
    templates: {
      passwordReset: 'password-reset',
      welcome: 'welcome',
      accountVerification: 'account-verification'
    }
  },
  
  // Monitoring & Metrics
  monitoring: {
    enabled: process.env.ENABLE_METRICS !== 'false',
    metricsPath: '/api/metrics',
    collectDefaultMetrics: true,
    collectHttpMetrics: true,
    collectDatabaseMetrics: true
  },
  
  // Health Check Configuration
  healthCheck: {
    enabled: true,
    path: '/api/health',
    readinessPath: '/api/ready',
    livenessPath: '/api/alive',
    timeout: 5000
  },
  
  // API Documentation
  swagger: {
    enabled: process.env.ENABLE_SWAGGER !== 'false',
    path: '/api/docs',
    title: 'Employee Management System API',
    version: process.env.npm_package_version || '1.0.0',
    description: 'API documentation for Employee Management System'
  },
  
  // Pagination
  pagination: {
    defaultLimit: 10,
    maxLimit: 100
  },
  
  // Cache Configuration
  cache: {
    enabled: process.env.CACHE_ENABLED !== 'false',
    defaultTTL: parseInt(process.env.CACHE_DEFAULT_TTL) || 300, // 5 minutes
    maxKeys: parseInt(process.env.CACHE_MAX_KEYS) || 1000
  },
  
  // Background Jobs (if implemented)
  jobs: {
    enabled: process.env.JOBS_ENABLED === 'true',
    concurrency: parseInt(process.env.JOBS_CONCURRENCY) || 1,
    maxAttempts: parseInt(process.env.JOBS_MAX_ATTEMPTS) || 3
  },
  
  // Audit Logging
  audit: {
    enabled: process.env.ENABLE_AUDIT_LOG !== 'false',
    logFile: 'logs/audit.log',
    excludeRoutes: ['/api/health', '/api/ready', '/api/alive', '/api/metrics']
  },
  
  // Performance
  performance: {
    compression: {
      enabled: true,
      level: 6,
      threshold: 1024
    },
    timeout: {
      server: parseInt(process.env.SERVER_TIMEOUT) || 30000,
      keepAlive: parseInt(process.env.KEEP_ALIVE_TIMEOUT) || 5000
    }
  },
  
  // Feature Flags
  features: {
    apiVersioning: process.env.FEATURE_API_VERSIONING === 'true',
    advancedSearch: process.env.FEATURE_ADVANCED_SEARCH !== 'false',
    fileUpload: process.env.FEATURE_FILE_UPLOAD === 'true',
    twoFactorAuth: process.env.FEATURE_2FA === 'true',
    auditLog: process.env.FEATURE_AUDIT_LOG !== 'false'
  },
  
  // External Services
  external: {
    // Add external service configurations here
    // e.g., third-party APIs, webhooks, etc.
  }
};