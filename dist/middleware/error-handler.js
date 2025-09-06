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
    let statusCode = 500;
    let message = 'Internal server error';
    let details = undefined;
    if (error instanceof api_error_1.ApiError) {
        statusCode = error.statusCode;
        message = error.message;
        details = error.details;
    }
    else if (isDatabaseConnectionError(error)) {
        statusCode = 503;
        message = 'Database service temporarily unavailable';
        console.error('Database connection error:', error.message);
    }
    else if (isDatabaseConstraintError(error)) {
        statusCode = 400;
        message = getDatabaseConstraintMessage(error);
    }
    else if (error.name === 'ValidationError') {
        statusCode = 400;
        message = 'Validation failed';
        details = error.message;
    }
    else if (error.message.includes('duplicate key value')) {
        statusCode = 409;
        message = 'Duplicate entry found';
        details = 'A record with this data already exists';
    }
    else if (error.message.includes('connection')) {
        statusCode = 503;
        message = 'Database connection error';
        details = 'Unable to connect to the database';
    }
    else if (error instanceof SyntaxError && 'body' in error) {
        statusCode = 400;
        message = 'Invalid JSON format';
        details = 'Request body contains invalid JSON';
    }
    else if (error.message.includes('File too large')) {
        statusCode = 413;
        message = 'File too large';
        details = 'The uploaded file exceeds the size limit';
    }
    else if (error.message.includes('Too many requests')) {
        statusCode = 429;
        message = 'Rate limit exceeded';
        details = 'Too many requests from this IP address';
    }
    const errorResponse = {
        error: message,
        timestamp: new Date().toISOString(),
        path: req.path
    };
    if (process.env.NODE_ENV === 'development') {
        errorResponse.details = details || error.stack;
        errorResponse.message = error.message;
    }
    if (statusCode >= 400 && statusCode < 500 && details) {
        errorResponse.details = details;
    }
    res.status(statusCode).json(errorResponse);
};
exports.errorHandler = errorHandler;
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
        '08000',
        '08003',
        '08006',
        '08001',
        '08004',
    ];
    return connectionErrorCodes.includes(error.code) ||
        pgConnectionErrorCodes.includes(error.code) ||
        error.message?.includes('Connection terminated') ||
        error.message?.includes('Client has encountered a connection error') ||
        error.message?.includes('Database not connected');
}
function isDatabaseConstraintError(error) {
    if (!error)
        return false;
    const constraintErrorCodes = [
        '23502',
        '23503',
        '23505',
        '23514',
    ];
    return constraintErrorCodes.includes(error.code);
}
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
//# sourceMappingURL=error-handler.js.map