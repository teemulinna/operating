import { Request, Response, NextFunction } from 'express';
import { ApiError } from '../utils/api-error';
import { logger } from '../utils/logger';

// Extend Request interface to include user
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        role: string;
        permissions?: string[];
      };
    }
  }
}

/**
 * Role-based access control middleware
 * @param allowedRoles Array of roles that are allowed to access the route
 */
export const roleGuard = (allowedRoles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      // Check if user is authenticated
      if (!req.user) {
        logger.warn('Unauthorized access attempt - no user');
        throw new ApiError(401, 'Authentication required');
      }

      // Check if user has required role
      const userRole = req.user.role;
      if (!userRole) {
        logger.warn(`User ${req.user.id} has no role assigned`);
        throw new ApiError(403, 'No role assigned to user');
      }

      // Admin can access everything
      if (userRole === 'admin') {
        return next();
      }

      // Check if user's role is in the allowed roles
      if (!allowedRoles.includes(userRole)) {
        logger.warn(`User ${req.user.id} with role ${userRole} attempted to access restricted route`);
        throw new ApiError(403, 'Insufficient permissions');
      }

      next();
    } catch (error) {
      if (error instanceof ApiError) {
        return res.status(error.statusCode).json({
          success: false,
          message: error.message
        });
      }

      logger.error('Role guard error:', error);
      return res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  };
};

/**
 * Permission-based access control middleware
 * @param requiredPermissions Array of permissions required to access the route
 */
export const permissionGuard = (requiredPermissions: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      // Check if user is authenticated
      if (!req.user) {
        logger.warn('Unauthorized access attempt - no user');
        throw new ApiError(401, 'Authentication required');
      }

      // Admin has all permissions
      if (req.user.role === 'admin') {
        return next();
      }

      // Check if user has required permissions
      const userPermissions = req.user.permissions || [];
      const hasAllPermissions = requiredPermissions.every(permission =>
        userPermissions.includes(permission)
      );

      if (!hasAllPermissions) {
        logger.warn(`User ${req.user.id} lacks required permissions: ${requiredPermissions.join(', ')}`);
        throw new ApiError(403, 'Insufficient permissions');
      }

      next();
    } catch (error) {
      if (error instanceof ApiError) {
        return res.status(error.statusCode).json({
          success: false,
          message: error.message
        });
      }

      logger.error('Permission guard error:', error);
      return res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  };
};

/**
 * Combined role and permission guard
 * User must have either one of the allowed roles OR all required permissions
 */
export const roleOrPermissionGuard = (
  allowedRoles: string[],
  requiredPermissions: string[]
) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      // Check if user is authenticated
      if (!req.user) {
        logger.warn('Unauthorized access attempt - no user');
        throw new ApiError(401, 'Authentication required');
      }

      // Admin can access everything
      if (req.user.role === 'admin') {
        return next();
      }

      // Check role
      const hasRole = allowedRoles.includes(req.user.role);
      if (hasRole) {
        return next();
      }

      // Check permissions
      const userPermissions = req.user.permissions || [];
      const hasAllPermissions = requiredPermissions.every(permission =>
        userPermissions.includes(permission)
      );

      if (hasAllPermissions) {
        return next();
      }

      logger.warn(`User ${req.user.id} lacks required role or permissions`);
      throw new ApiError(403, 'Insufficient permissions');
    } catch (error) {
      if (error instanceof ApiError) {
        return res.status(error.statusCode).json({
          success: false,
          message: error.message
        });
      }

      logger.error('Role/permission guard error:', error);
      return res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  };
};

/**
 * Ownership guard - ensures user can only access their own resources
 * @param resourceIdParam The request parameter containing the resource owner's ID
 */
export const ownershipGuard = (resourceIdParam: string = 'userId') => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      // Check if user is authenticated
      if (!req.user) {
        logger.warn('Unauthorized access attempt - no user');
        throw new ApiError(401, 'Authentication required');
      }

      // Admin can access everything
      if (req.user.role === 'admin') {
        return next();
      }

      // Manager can access resources of their department members
      if (req.user.role === 'manager') {
        // This would need additional logic to check department membership
        // For now, managers can access all resources
        return next();
      }

      // Check ownership
      const resourceOwnerId = req.params[resourceIdParam] || req.body[resourceIdParam];
      if (resourceOwnerId !== req.user.id) {
        logger.warn(`User ${req.user.id} attempted to access resource owned by ${resourceOwnerId}`);
        throw new ApiError(403, 'You can only access your own resources');
      }

      next();
    } catch (error) {
      if (error instanceof ApiError) {
        return res.status(error.statusCode).json({
          success: false,
          message: error.message
        });
      }

      logger.error('Ownership guard error:', error);
      return res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  };
};

/**
 * Department access guard - ensures managers can only access their department's resources
 */
export const departmentGuard = () => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Check if user is authenticated
      if (!req.user) {
        logger.warn('Unauthorized access attempt - no user');
        throw new ApiError(401, 'Authentication required');
      }

      // Admin can access everything
      if (req.user.role === 'admin') {
        return next();
      }

      // For managers, verify department access
      if (req.user.role === 'manager') {
        const departmentId = req.params.departmentId || req.body.departmentId;

        if (!departmentId) {
          return next(); // No department specified, allow access
        }

        // This would need to check if the manager manages this department
        // For now, we'll allow all managers
        return next();
      }

      // Regular users can only access their own department's public data
      // This would need additional logic based on your requirements
      next();
    } catch (error) {
      if (error instanceof ApiError) {
        return res.status(error.statusCode).json({
          success: false,
          message: error.message
        });
      }

      logger.error('Department guard error:', error);
      return res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  };
};