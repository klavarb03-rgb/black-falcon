import { Request, Response, NextFunction } from 'express';
import { UserRole } from '../entities/User';
import { verifyAccessToken, isTokenRevoked } from '../utils/jwt';
import { AppError } from './errorHandler';

export interface AuthUser {
  userId: string;
  username: string;
  role: UserRole;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export function authenticate(req: Request, _res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    const err: AppError = new Error('Authentication required');
    err.statusCode = 401;
    err.isOperational = true;
    return next(err);
  }

  const token = authHeader.slice(7);

  if (isTokenRevoked(token)) {
    const err: AppError = new Error('Token has been revoked');
    err.statusCode = 401;
    err.isOperational = true;
    return next(err);
  }

  try {
    const payload = verifyAccessToken(token);
    req.user = {
      userId: payload.userId,
      username: payload.username,
      role: payload.role as UserRole,
    };
    next();
  } catch {
    const err: AppError = new Error('Invalid or expired token');
    err.statusCode = 401;
    err.isOperational = true;
    next(err);
  }
}

export function authorize(...roles: UserRole[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      const err: AppError = new Error('Authentication required');
      err.statusCode = 401;
      err.isOperational = true;
      return next(err);
    }
    if (!roles.includes(req.user.role)) {
      const err: AppError = new Error('Insufficient permissions');
      err.statusCode = 403;
      err.isOperational = true;
      return next(err);
    }
    next();
  };
}
