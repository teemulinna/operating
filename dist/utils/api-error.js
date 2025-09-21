"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ApiError = void 0;
class ApiError extends Error {
    constructor(statusCode, message, details) {
        super(message);
        this.statusCode = statusCode;
        this.details = details;
        this.name = 'ApiError';
        // Maintains proper stack trace for where error was thrown
        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, ApiError);
        }
    }
    static badRequest(message, details) {
        return new ApiError(400, message, details);
    }
    static unauthorized(message = 'Unauthorized') {
        return new ApiError(401, message);
    }
    static forbidden(message = 'Forbidden') {
        return new ApiError(403, message);
    }
    static notFound(resource = 'Resource') {
        return new ApiError(404, `${resource} not found`);
    }
    static conflict(message, details) {
        return new ApiError(409, message, details);
    }
    static unprocessableEntity(message, details) {
        return new ApiError(422, message, details);
    }
    static tooManyRequests(message = 'Too many requests') {
        return new ApiError(429, message);
    }
    static internal(message = 'Internal server error', details) {
        return new ApiError(500, message, details);
    }
    static serviceUnavailable(message = 'Service unavailable') {
        return new ApiError(503, message);
    }
}
exports.ApiError = ApiError;
