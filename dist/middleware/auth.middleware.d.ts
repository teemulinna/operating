import { Request, Response, NextFunction } from 'express';
export declare const authMiddleware: (req: Request, _res: Response, next: NextFunction) => void;
export declare const requireRole: (roles: string[]) => (req: Request, _res: Response, next: NextFunction) => void;
export declare const generateToken: (user: {
    id: string;
    email: string;
    role: string;
}) => string;
//# sourceMappingURL=auth.middleware.d.ts.map