export declare class ApiError extends Error {
    statusCode: number;
    details?: any;
    constructor(statusCode: number, message: string, details?: any);
    static badRequest(message: string, details?: any): ApiError;
    static unauthorized(message?: string): ApiError;
    static forbidden(message?: string): ApiError;
    static notFound(resource?: string): ApiError;
    static conflict(message: string, details?: any): ApiError;
    static unprocessableEntity(message: string, details?: any): ApiError;
    static tooManyRequests(message?: string): ApiError;
    static internal(message?: string, details?: any): ApiError;
    static serviceUnavailable(message?: string): ApiError;
}
//# sourceMappingURL=api-error.d.ts.map