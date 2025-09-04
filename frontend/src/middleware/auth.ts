import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { User, AuthRequest } from '../types';
import { AppError, catchAsync } from './errorHandler';
import { logger } from '../utils/logger';

// Mock user store (replace with actual database model)
const users: User[] = [
  {
    id: '1',
    email: 'admin@company.com',
    password: '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj31fK.1HQK6', // hashed: password123
    role: 'admin',
    createdAt: new Date(),
    updatedAt: new Date()
  }
];

export const signToken = (id: string): string => {
  return jwt.sign({ id }, process.env.JWT_SECRET || 'fallback-secret', {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
};

export const hashPassword = async (password: string): Promise<string> => {
  return await bcrypt.hash(password, 12);
};

export const comparePassword = async (candidatePassword: string, userPassword: string): Promise<boolean> => {
  return await bcrypt.compare(candidatePassword, userPassword);
};

export const authenticate = catchAsync(async (req: AuthRequest, res: Response, next: NextFunction) => {
  // Get token from header
  let token: string | undefined;
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return next(new AppError('You are not logged in! Please log in to get access.', 401));
  }

  // Verify token
  const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret') as { id: string; iat: number };

  // Check if user still exists
  const currentUser = users.find(user => user.id === decoded.id);
  if (!currentUser) {
    return next(new AppError('The user belonging to this token does no longer exist.', 401));
  }

  // Grant access to protected route
  req.user = currentUser;
  next();
});

export const authorize = (...roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return next(new AppError('You do not have permission to perform this action', 403));
    }
    next();
  };
};

export const login = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const { email, password } = req.body;

  // Check if email and password exist
  if (!email || !password) {
    return next(new AppError('Please provide email and password!', 400));
  }

  // Check if user exists && password is correct
  const user = users.find(u => u.email === email);
  if (!user || !(await comparePassword(password, user.password))) {
    return next(new AppError('Incorrect email or password', 401));
  }

  // Generate token
  const token = signToken(user.id);

  // Log successful login
  logger.info('User logged in', {
    userId: user.id,
    email: user.email,
    role: user.role
  });

  res.status(200).json({
    success: true,
    data: {
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role
      }
    }
  });
});

export const register = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const { email, password, role = 'employee' } = req.body;

  // Check if user already exists
  const existingUser = users.find(u => u.email === email);
  if (existingUser) {
    return next(new AppError('User with this email already exists', 400));
  }

  // Hash password
  const hashedPassword = await hashPassword(password);

  // Create new user
  const newUser: User = {
    id: String(users.length + 1),
    email,
    password: hashedPassword,
    role: role as 'admin' | 'hr' | 'manager' | 'employee',
    createdAt: new Date(),
    updatedAt: new Date()
  };

  users.push(newUser);

  // Generate token
  const token = signToken(newUser.id);

  // Log successful registration
  logger.info('User registered', {
    userId: newUser.id,
    email: newUser.email,
    role: newUser.role
  });

  res.status(201).json({
    success: true,
    data: {
      token,
      user: {
        id: newUser.id,
        email: newUser.email,
        role: newUser.role
      }
    }
  });
});