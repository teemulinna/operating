import { Request, Response, NextFunction } from 'express';
interface AuthenticatedRequest extends Request {
    user?: {
        id: string;
        email: string;
        role: string;
    };
}
export declare const authMiddleware: (req: AuthenticatedRequest, _res: Response, next: NextFunction) => void;
export declare const requireRole: (roles: string[]) => (req: AuthenticatedRequest, _res: Response, next: NextFunction) => void;
export declare const generateToken: (user: {
    id: string;
    email: string;
    role: string;
}) => string;
export {};
//# sourceMappingURL=auth.middleware.d.ts.map