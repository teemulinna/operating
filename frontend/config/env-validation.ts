/**
 * Environment Variable Validation
 * Validates required environment variables and provides type-safe access
 */

interface EnvironmentConfig {
  // API Configuration
  API_URL: string;
  
  // Server Configuration
  PORT: number;
  HOST: string;
  
  // Environment
  NODE_ENV: 'development' | 'production' | 'test';
  
  // Development Tools
  ENABLE_QUERY_DEVTOOLS: boolean;
  
  // Security
  ENABLE_HTTPS: boolean;
  
  // Optional Configuration
  HMR_PORT?: number;
  SENTRY_DSN?: string;
  LOG_LEVEL?: 'debug' | 'info' | 'warn' | 'error';
  ENABLE_PERFORMANCE_MONITORING?: boolean;
  CDN_URL?: string;
  CSP_REPORT_URI?: string;
}

/**
 * Validates and parses environment variables
 */
export function validateEnvironment(): EnvironmentConfig {
  const requiredVars = [
    'VITE_API_URL',
    'VITE_PORT',
    'VITE_HOST',
    'NODE_ENV',
    'VITE_ENABLE_QUERY_DEVTOOLS',
    'VITE_ENABLE_HTTPS'
  ];

  // Check for required variables
  const missing = requiredVars.filter(varName => !import.meta.env[varName]);
  
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }

  // Validate NODE_ENV
  const nodeEnv = import.meta.env.NODE_ENV;
  if (!['development', 'production', 'test'].includes(nodeEnv)) {
    throw new Error(`Invalid NODE_ENV: ${nodeEnv}. Must be 'development', 'production', or 'test'`);
  }

  // Validate API URL format
  const apiUrl = import.meta.env.VITE_API_URL;
  try {
    new URL(apiUrl);
  } catch {
    throw new Error(`Invalid VITE_API_URL format: ${apiUrl}`);
  }

  // Parse and validate port
  const port = parseInt(import.meta.env.VITE_PORT);
  if (isNaN(port) || port < 1 || port > 65535) {
    throw new Error(`Invalid VITE_PORT: ${import.meta.env.VITE_PORT}. Must be a number between 1-65535`);
  }

  return {
    API_URL: apiUrl,
    PORT: port,
    HOST: import.meta.env.VITE_HOST,
    NODE_ENV: nodeEnv as 'development' | 'production' | 'test',
    ENABLE_QUERY_DEVTOOLS: import.meta.env.VITE_ENABLE_QUERY_DEVTOOLS === 'true',
    ENABLE_HTTPS: import.meta.env.VITE_ENABLE_HTTPS === 'true',
    HMR_PORT: import.meta.env.VITE_HMR_PORT ? parseInt(import.meta.env.VITE_HMR_PORT) : undefined,
    SENTRY_DSN: import.meta.env.VITE_SENTRY_DSN,
    LOG_LEVEL: import.meta.env.VITE_LOG_LEVEL as 'debug' | 'info' | 'warn' | 'error' || 'info',
    ENABLE_PERFORMANCE_MONITORING: import.meta.env.VITE_ENABLE_PERFORMANCE_MONITORING === 'true',
    CDN_URL: import.meta.env.VITE_CDN_URL,
    CSP_REPORT_URI: import.meta.env.VITE_CSP_REPORT_URI,
  };
}

/**
 * Get validated environment configuration
 * This should be called once at application startup
 */
let envConfig: EnvironmentConfig | null = null;

export function getEnvironmentConfig(): EnvironmentConfig {
  if (!envConfig) {
    envConfig = validateEnvironment();
  }
  return envConfig;
}

/**
 * Check if we're in development mode
 */
export function isDevelopment(): boolean {
  return getEnvironmentConfig().NODE_ENV === 'development';
}

/**
 * Check if we're in production mode
 */
export function isProduction(): boolean {
  return getEnvironmentConfig().NODE_ENV === 'production';
}

/**
 * Check if we're in test mode
 */
export function isTest(): boolean {
  return getEnvironmentConfig().NODE_ENV === 'test';
}

/**
 * Get API base URL for making requests
 */
export function getApiUrl(): string {
  return getEnvironmentConfig().API_URL;
}

/**
 * Environment validation errors
 */
export class EnvironmentValidationError extends Error {
  constructor(message: string) {
    super(`Environment Validation Error: ${message}`);
    this.name = 'EnvironmentValidationError';
  }
}