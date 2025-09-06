"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateToken = exports.requireRole = exports.authMiddleware = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const api_error_1 = require("../utils/api-error");
const authMiddleware = (req, _res, next) => {
    try {
        if (process.env.NODE_ENV === 'test') {
            return next();
        }
        if (process.env.NODE_ENV === 'development' || !process.env.JWT_SECRET) {
            req.user = {
                id: 'dev-user',
                email: 'dev@company.com',
                role: 'admin'
            };
            return next();
        }
        const authHeader = req.headers.authorization;
        if (!authHeader) {
            throw new api_error_1.ApiError(401, 'Authorization header missing');
        }
        const token = authHeader.split(' ')[1];
        if (!token) {
            throw new api_error_1.ApiError(401, 'Access token missing');
        }
        const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
        try {
            const decoded = jsonwebtoken_1.default.verify(token, JWT_SECRET);
            req.user = {
                id: decoded.userId,
                email: decoded.email,
                role: decoded.role || 'user'
            };
            next();
        }
        catch (jwtError) {
            if (jwtError instanceof jsonwebtoken_1.default.TokenExpiredError) {
                throw new api_error_1.ApiError(401, 'Token expired');
            }
            else if (jwtError instanceof jsonwebtoken_1.default.JsonWebTokenError) {
                throw new api_error_1.ApiError(401, 'Invalid token');
            }
            else {
                throw new api_error_1.ApiError(401, 'Token validation failed');
            }
        }
    }
    catch (error) {
        next(error);
    }
};
exports.authMiddleware = authMiddleware;
const requireRole = (roles) => {
    return (req, _res, next) => {
        if (!req.user) {
            return next(new api_error_1.ApiError(401, 'User not authenticated'));
        }
        if (!roles.includes(req.user.role)) {
            return next(new api_error_1.ApiError(403, 'Insufficient permissions'));
        }
        next();
    };
};
exports.requireRole = requireRole;
const generateToken = (user) => {
    const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
    return jsonwebtoken_1.default.sign({
        userId: user.id,
        email: user.email,
        role: user.role,
        exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60)
    }, JWT_SECRET);
};
exports.generateToken = generateToken;
//# sourceMappingURL=auth.middleware.js.map