"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandler = void 0;
const api_error_1 = require("../utils/api-error");
const errorHandler = (error, req, res, _next) => {
    console.error('Error occurred:', {
        message: error.message,
        stack: error.stack,
        url: req.url,
        method: req.method,
        timestamp: new Date().toISOString()
    });
    // Default error values
    let statusCode = 500;
    let message = 'Internal server error';
    let details = undefined;
    // Handle known ApiError instances
    if (error instanceof api_error_1.ApiError) {
        statusCode = error.statusCode;
        message = error.message;
        details = error.details;
    }
    // Handle database connection errors
    else if (isDatabaseConnectionError(error)) {
        statusCode = 503; // Service Unavailable
        message = 'Database service temporarily unavailable';
        console.error('Database connection error:', error.message);
    }
    // Handle database constraint errors
    else if (isDatabaseConstraintError(error)) {
        statusCode = 400; // Bad Request
        message = getDatabaseConstraintMessage(error);
    }
    // Handle validation errors (from express-validator or similar)
    else if (error.name === 'ValidationError') {
        statusCode = 400;
        message = 'Validation failed';
        details = error.message;
    }
    // Handle database constraint errors
    else if (error.message.includes('duplicate key value')) {
        statusCode = 409;
        message = 'Duplicate entry found';
        details = 'A record with this data already exists';
    }
    // Handle database connection errors
    else if (error.message.includes('connection')) {
        statusCode = 503;
        message = 'Database connection error';
        details = 'Unable to connect to the database';
    }
    // Handle JSON parsing errors
    else if (error instanceof SyntaxError && 'body' in error) {
        statusCode = 400;
        message = 'Invalid JSON format';
        details = 'Request body contains invalid JSON';
    }
    // Handle file upload errors
    else if (error.message.includes('File too large')) {
        statusCode = 413;
        message = 'File too large';
        details = 'The uploaded file exceeds the size limit';
    }
    // Handle rate limiting errors
    else if (error.message.includes('Too many requests')) {
        statusCode = 429;
        message = 'Rate limit exceeded';
        details = 'Too many requests from this IP address';
    }
    // Create error response
    const errorResponse = {
        error: message,
        timestamp: new Date().toISOString(),
        path: req.path
    };
    // Add details in development mode
    if (process.env.NODE_ENV === 'development') {
        errorResponse.details = details || error.stack;
        errorResponse.message = error.message;
    }
    // Add details for client errors (4xx)
    if (statusCode >= 400 && statusCode < 500 && details) {
        errorResponse.details = details;
    }
    res.status(statusCode).json(errorResponse);
};
exports.errorHandler = errorHandler;
/**
 * Check if an error is a database connection error
 */
function isDatabaseConnectionError(error) {
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
        '08000', // connection_exception
        '08003', // connection_does_not_exist
        '08006', // connection_failure
        '08001', // sqlclient_unable_to_establish_sqlconnection
        '08004', // sqlserver_rejected_establishment_of_sqlconnection
    ];
    return connectionErrorCodes.includes(error.code) ||
        pgConnectionErrorCodes.includes(error.code) ||
        error.message?.includes('Connection terminated') ||
        error.message?.includes('Client has encountered a connection error') ||
        error.message?.includes('Database not connected');
}
/**
 * Check if an error is a database constraint error
 */
function isDatabaseConstraintError(error) {
    if (!error)
        return false;
    const constraintErrorCodes = [
        '23502', // not_null_violation
        '23503', // foreign_key_violation
        '23505', // unique_violation
        '23514', // check_violation
    ];
    return constraintErrorCodes.includes(error.code);
}
/**
 * Get user-friendly message for database constraint errors
 */
function getDatabaseConstraintMessage(error) {
    switch (error.code) {
        case '23502':
            return 'Required field is missing';
        case '23503':
            return 'Referenced record does not exist';
        case '23505':
            return 'A record with this data already exists';
        case '23514':
            return 'Data does not meet validation requirements';
        default:
            return 'Database constraint violation';
    }
}
