import { Request, Response, NextFunction } from 'express';
import { AppError } from './errorHandler';

export const notFoundHandler = (req: Request, res: Response, next: NextFunction) => {
  const err = new AppError(`Not found - ${req.originalUrl}`, 404);
  next(err);
};