import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken, isTokenRevoked } from '../utils/jwt';
import { AuthUser } from './auth';
import { UserRole } from '../entities/User';

export interface AuthenticatedRequest extends Request {
  user: AuthUser;
}

export function authMiddleware(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers['authorization'];

  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing or invalid authorization header' });
    return;
  }

  const token = authHeader.slice(7);

  if (isTokenRevoked(token)) {
    res.status(401).json({ error: 'Token has been revoked' });
    return;
  }

  try {
    const payload = verifyAccessToken(token);
    (req as AuthenticatedRequest).user = {
      userId: payload.userId,
      username: payload.username,
      role: payload.role as UserRole,
    };
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}

export function requireRole(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const user = (req as AuthenticatedRequest).user;
    if (!user || !roles.includes(user.role)) {
      res.status(403).json({ error: 'Insufficient permissions' });
      return;
    }
    next();
  };
}
