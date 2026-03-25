import { Request, Response, NextFunction } from 'express';

export interface AppError extends Error {
  statusCode?: number;
  isOperational?: boolean;
}

export function errorHandler(
  err: AppError,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  const statusCode = err.statusCode ?? 500;
  const isProduction = process.env['NODE_ENV'] === 'production';

  if (!isProduction || !err.isOperational) {
    console.error('[Error]', err);
  }

  res.status(statusCode).json({
    status: 'error',
    message: isProduction && statusCode === 500 ? 'Internal server error' : err.message,
    ...(isProduction ? {} : { stack: err.stack }),
  });
}

export function notFoundHandler(_req: Request, _res: Response, next: NextFunction): void {
  const error: AppError = new Error('Route not found');
  error.statusCode = 404;
  error.isOperational = true;
  next(error);
}
