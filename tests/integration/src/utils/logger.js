"use strict";
/**
 * Logger utility with singleton pattern
 * Provides consistent logging across the application
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.logger = exports.ChildLogger = exports.Logger = exports.LogLevels = void 0;
exports.LogLevels = {
    ERROR: { name: 'ERROR', value: 0, color: '\x1b[31m' }, // red
    WARN: { name: 'WARN', value: 1, color: '\x1b[33m' }, // yellow
    INFO: { name: 'INFO', value: 2, color: '\x1b[36m' }, // cyan
    DEBUG: { name: 'DEBUG', value: 3, color: '\x1b[35m' } // magenta
};
class Logger {
    constructor() {
        // Set log level based on environment
        const envLogLevel = process.env.LOG_LEVEL?.toUpperCase() || 'INFO';
        this.logLevel = exports.LogLevels[envLogLevel] || exports.LogLevels.INFO;
    }
    static getInstance() {
        if (!Logger.instance) {
            Logger.instance = new Logger();
        }
        return Logger.instance;
    }
    shouldLog(level) {
        return level.value <= this.logLevel.value;
    }
    formatMessage(level, message, ...args) {
        const timestamp = new Date().toISOString();
        const reset = '\x1b[0m';
        const formattedArgs = args.length > 0 ? ` ${JSON.stringify(args)}` : '';
        return `${level.color}[${timestamp}] ${level.name}:${reset} ${message}${formattedArgs}`;
    }
    error(message, ...args) {
        if (this.shouldLog(exports.LogLevels.ERROR)) {
            console.error(this.formatMessage(exports.LogLevels.ERROR, message, ...args));
        }
    }
    warn(message, ...args) {
        if (this.shouldLog(exports.LogLevels.WARN)) {
            console.warn(this.formatMessage(exports.LogLevels.WARN, message, ...args));
        }
    }
    info(message, ...args) {
        if (this.shouldLog(exports.LogLevels.INFO)) {
            console.info(this.formatMessage(exports.LogLevels.INFO, message, ...args));
        }
    }
    debug(message, ...args) {
        if (this.shouldLog(exports.LogLevels.DEBUG)) {
            console.debug(this.formatMessage(exports.LogLevels.DEBUG, message, ...args));
        }
    }
    setLogLevel(level) {
        this.logLevel = level;
    }
    getLogLevel() {
        return this.logLevel;
    }
    // Convenience method for ML operations
    ml(message, ...args) {
        this.info(`[ML] ${message}`, ...args);
    }
    // Convenience method for performance logging
    perf(message, duration, ...args) {
        this.info(`[PERF] ${message} (${duration}ms)`, ...args);
    }
    // Method to create child logger with prefix
    child(prefix) {
        return new ChildLogger(this, prefix);
    }
}
exports.Logger = Logger;
class ChildLogger {
    constructor(parent, prefix) {
        this.parent = parent;
        this.prefix = prefix;
    }
    error(message, ...args) {
        this.parent.error(`[${this.prefix}] ${message}`, ...args);
    }
    warn(message, ...args) {
        this.parent.warn(`[${this.prefix}] ${message}`, ...args);
    }
    info(message, ...args) {
        this.parent.info(`[${this.prefix}] ${message}`, ...args);
    }
    debug(message, ...args) {
        this.parent.debug(`[${this.prefix}] ${message}`, ...args);
    }
    ml(message, ...args) {
        this.parent.ml(`[${this.prefix}] ${message}`, ...args);
    }
    perf(message, duration, ...args) {
        this.parent.perf(`[${this.prefix}] ${message}`, duration, ...args);
    }
}
exports.ChildLogger = ChildLogger;
// Export singleton instance
exports.logger = Logger.getInstance();
