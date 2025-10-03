export const __esModule: boolean;
export class ApiError extends Error {
    static badRequest(message: any, details: any): ApiError;
    static unauthorized(message?: string): ApiError;
    static forbidden(message?: string): ApiError;
    static notFound(resource?: string): ApiError;
    static conflict(message: any, details: any): ApiError;
    static unprocessableEntity(message: any, details: any): ApiError;
    static tooManyRequests(message?: string): ApiError;
    static internal(message: string | undefined, details: any): ApiError;
    static serviceUnavailable(message?: string): ApiError;
    constructor(statusCode: any, message: any, details: any);
    statusCode: any;
    details: any;
}
//# sourceMappingURL=api-error.d.ts.map