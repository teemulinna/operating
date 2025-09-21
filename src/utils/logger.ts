/**
 * Logger utility with singleton pattern
 * Provides consistent logging across the application
 */

export interface LogLevel {
  name: string;
  value: number;
  color: string;
}

export const LogLevels = {
  ERROR: { name: 'ERROR', value: 0, color: '\x1b[31m' }, // red
  WARN: { name: 'WARN', value: 1, color: '\x1b[33m' },  // yellow
  INFO: { name: 'INFO', value: 2, color: '\x1b[36m' },  // cyan
  DEBUG: { name: 'DEBUG', value: 3, color: '\x1b[35m' } // magenta
};

export class Logger {
  private static instance: Logger;
  private logLevel: LogLevel;

  private constructor() {
    // Set log level based on environment
    const envLogLevel = process.env.LOG_LEVEL?.toUpperCase() || 'INFO';
    this.logLevel = LogLevels[envLogLevel as keyof typeof LogLevels] || LogLevels.INFO;
  }

  public static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  private shouldLog(level: LogLevel): boolean {
    return level.value <= this.logLevel.value;
  }

  private formatMessage(level: LogLevel, message: string, ...args: any[]): string {
    const timestamp = new Date().toISOString();
    const reset = '\x1b[0m';
    const formattedArgs = args.length > 0 ? ` ${JSON.stringify(args)}` : '';
    
    return `${level.color}[${timestamp}] ${level.name}:${reset} ${message}${formattedArgs}`;
  }

  public error(message: string, ...args: any[]): void {
    if (this.shouldLog(LogLevels.ERROR)) {
      console.error(this.formatMessage(LogLevels.ERROR, message, ...args));
    }
  }

  public warn(message: string, ...args: any[]): void {
    if (this.shouldLog(LogLevels.WARN)) {
      console.warn(this.formatMessage(LogLevels.WARN, message, ...args));
    }
  }

  public info(message: string, ...args: any[]): void {
    if (this.shouldLog(LogLevels.INFO)) {
      console.info(this.formatMessage(LogLevels.INFO, message, ...args));
    }
  }

  public debug(message: string, ...args: any[]): void {
    if (this.shouldLog(LogLevels.DEBUG)) {
      console.debug(this.formatMessage(LogLevels.DEBUG, message, ...args));
    }
  }

  public setLogLevel(level: LogLevel): void {
    this.logLevel = level;
  }

  public getLogLevel(): LogLevel {
    return this.logLevel;
  }

  // Convenience method for ML operations
  public ml(message: string, ...args: any[]): void {
    this.info(`[ML] ${message}`, ...args);
  }

  // Convenience method for performance logging
  public perf(message: string, duration: number, ...args: any[]): void {
    this.info(`[PERF] ${message} (${duration}ms)`, ...args);
  }

  // Method to create child logger with prefix
  public child(prefix: string): ChildLogger {
    return new ChildLogger(this, prefix);
  }
}

export class ChildLogger {
  constructor(private parent: Logger, private prefix: string) {}

  public error(message: string, ...args: any[]): void {
    this.parent.error(`[${this.prefix}] ${message}`, ...args);
  }

  public warn(message: string, ...args: any[]): void {
    this.parent.warn(`[${this.prefix}] ${message}`, ...args);
  }

  public info(message: string, ...args: any[]): void {
    this.parent.info(`[${this.prefix}] ${message}`, ...args);
  }

  public debug(message: string, ...args: any[]): void {
    this.parent.debug(`[${this.prefix}] ${message}`, ...args);
  }

  public ml(message: string, ...args: any[]): void {
    this.parent.ml(`[${this.prefix}] ${message}`, ...args);
  }

  public perf(message: string, duration: number, ...args: any[]): void {
    this.parent.perf(`[${this.prefix}] ${message}`, duration, ...args);
  }
}

// Export singleton instance
export const logger = Logger.getInstance();