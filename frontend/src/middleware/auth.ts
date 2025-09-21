import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { User, AuthRequest } from '../types';
import { AppError, catchAsync } from './errorHandler';
import { logger } from '../utils/logger';

const API_BASE_URL = 'http://localhost:3001/api';

// Connect to real backend for user data
const fetchUserById = async (id: string): Promise<User | null> => {
  try {
    const response = await fetch(`${API_BASE_URL}/auth/user/${id}`);
    if (!response.ok) return null;
    const data = await response.json();
    return data.data;
  } catch (error) {
    logger.error('Failed to fetch user by ID:', error);
    return null;
  }
};

const fetchUserByEmail = async (email: string): Promise<User | null> => {
  try {
    const response = await fetch(`${API_BASE_URL}/auth/user/email/${encodeURIComponent(email)}`);
    if (!response.ok) return null;
    const data = await response.json();
    return data.data;
  } catch (error) {
    logger.error('Failed to fetch user by email:', error);
    return null;
  }
};

const createUser = async (userData: Omit<User, 'id' | 'createdAt' | 'updatedAt'>): Promise<User | null> => {
  try {
    const response = await fetch(`${API_BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userData)
    });
    if (!response.ok) return null;
    const data = await response.json();
    return data.data;
  } catch (error) {
    logger.error('Failed to create user:', error);
    return null;
  }
};

export const signToken = (id: string): string => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET environment variable is required');
  }
  return jwt.sign({ id }, secret, {
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
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    return next(new AppError('Server configuration error', 500));
  }
  const decoded = jwt.verify(token, secret) as { id: string; iat: number };

  // Check if user still exists in backend
  const currentUser = await fetchUserById(decoded.id);
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

  // Check if user exists && password is correct via backend
  const user = await fetchUserByEmail(email);
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

  // Check if user already exists in backend
  const existingUser = await fetchUserByEmail(email);
  if (existingUser) {
    return next(new AppError('User with this email already exists', 400));
  }

  // Hash password
  const hashedPassword = await hashPassword(password);

  // Create new user via backend
  const newUser = await createUser({
    email,
    password: hashedPassword,
    role: role as 'admin' | 'hr' | 'manager' | 'employee'
  });

  if (!newUser) {
    return next(new AppError('Failed to create user', 500));
  }

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
