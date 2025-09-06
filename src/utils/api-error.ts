export class ApiError extends Error {
  public statusCode: number;
  public details?: any;

  constructor(statusCode: number, message: string, details?: any) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
    this.name = 'ApiError';

    // Maintains proper stack trace for where error was thrown
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ApiError);
    }
  }

  static badRequest(message: string, details?: any) {
    return new ApiError(400, message, details);
  }

  static unauthorized(message: string = 'Unauthorized') {
    return new ApiError(401, message);
  }

  static forbidden(message: string = 'Forbidden') {
    return new ApiError(403, message);
  }

  static notFound(resource: string = 'Resource') {
    return new ApiError(404, `${resource} not found`);
  }

  static conflict(message: string, details?: any) {
    return new ApiError(409, message, details);
  }

  static unprocessableEntity(message: string, details?: any) {
    return new ApiError(422, message, details);
  }

  static tooManyRequests(message: string = 'Too many requests') {
    return new ApiError(429, message);
  }

  static internal(message: string = 'Internal server error', details?: any) {
    return new ApiError(500, message, details);
  }

  static serviceUnavailable(message: string = 'Service unavailable') {
    return new ApiError(503, message);
  }
}