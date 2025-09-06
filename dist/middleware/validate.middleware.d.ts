import { Request, Response, NextFunction } from 'express';
export declare const handleValidationErrors: (req: Request, _res: Response, next: NextFunction) => void;
export declare const validateRequest: (req: Request, _res: Response, next: NextFunction) => void;
export declare const actualHandleValidationErrors: (req: Request, _res: Response, next: NextFunction) => void;
export declare const validateCreateEmployee: (((req: Request, _res: Response, next: NextFunction) => void) | import("express-validator").ValidationChain)[];
export declare const validateUpdateEmployee: (((req: Request, _res: Response, next: NextFunction) => void) | import("express-validator").ValidationChain)[];
export declare const validateCreateDepartment: (((req: Request, _res: Response, next: NextFunction) => void) | import("express-validator").ValidationChain)[];
export declare const validateIdParam: (((req: Request, _res: Response, next: NextFunction) => void) | import("express-validator").ValidationChain)[];
export declare const validateEmployeeQuery: (((req: Request, _res: Response, next: NextFunction) => void) | import("express-validator").ValidationChain)[];
//# sourceMappingURL=validate.middleware.d.ts.map