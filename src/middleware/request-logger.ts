import { Request, Response, NextFunction } from 'express';

export const requestLogger = (req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  
  // Skip logging in test environment
  if (process.env.NODE_ENV === 'test') {
    return next();
  }

  // Log the incoming request
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url} - IP: ${req.ip}`);

  // Log response when finished
  res.on('finish', () => {
    const duration = Date.now() - start;
    const size = res.get('content-length') || 0;
    
    console.log(
      `${new Date().toISOString()} - ${req.method} ${req.url} - ` +
      `Status: ${res.statusCode} - ${duration}ms - ${size} bytes`
    );
  });

  next();
};