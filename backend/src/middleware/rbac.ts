import { Request, Response, NextFunction } from 'express';
import { UserRole } from '../entities/User';
import { AppError } from './errorHandler';

// Relies on the global Express.Request augmentation in auth.ts (req.user?: AuthUser)

/**
 * Middleware factory that restricts access to users with one of the specified roles.
 * Must be used after the authenticate middleware, which populates req.user.
 */
export function requireRoles(...roles: UserRole[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      const err: AppError = new Error('Authentication required');
      err.statusCode = 401;
      err.isOperational = true;
      next(err);
      return;
    }

    if (!(roles as string[]).includes(req.user.role)) {
      const err: AppError = new Error('Insufficient permissions');
      err.statusCode = 403;
      err.isOperational = true;
      next(err);
      return;
    }

    next();
  };
}
