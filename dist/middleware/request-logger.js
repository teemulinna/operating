"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requestLogger = void 0;
const requestLogger = (req, res, next) => {
    const start = Date.now();
    if (process.env.NODE_ENV === 'test') {
        return next();
    }
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url} - IP: ${req.ip}`);
    res.on('finish', () => {
        const duration = Date.now() - start;
        const size = res.get('content-length') || 0;
        console.log(`${new Date().toISOString()} - ${req.method} ${req.url} - ` +
            `Status: ${res.statusCode} - ${duration}ms - ${size} bytes`);
    });
    next();
};
exports.requestLogger = requestLogger;
//# sourceMappingURL=request-logger.js.map