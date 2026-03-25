import { Request, Response, NextFunction } from 'express';
import { AppError } from '../middleware/errorHandler';

function isUUID(value: unknown): boolean {
  return (
    typeof value === 'string' &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)
  );
}

function fail(next: NextFunction, message: string, statusCode = 422): void {
  const err: AppError = new Error(message);
  err.statusCode = statusCode;
  err.isOperational = true;
  next(err);
}

export function validateWriteoffOperation(
  req: Request,
  _res: Response,
  next: NextFunction
): void {
  const { itemId, quantity, type, reason, donorId } = req.body;
  const errors: string[] = [];

  if (!itemId || !isUUID(itemId)) {
    errors.push('itemId is required and must be a valid UUID');
  }

  const qty = Number(quantity);
  if (quantity === undefined || quantity === null || !Number.isInteger(qty) || qty < 1) {
    errors.push('quantity must be a positive integer');
  }

  if (type !== 'used' && type !== 'lost') {
    errors.push('type must be either "used" or "lost"');
  }

  if (type === 'lost' && (!reason || typeof reason !== 'string' || reason.trim() === '')) {
    errors.push('reason is required when type is "lost"');
  }

  if (reason !== undefined && reason !== null && typeof reason !== 'string') {
    errors.push('reason must be a string');
  }

  if (donorId !== undefined && donorId !== null && !isUUID(donorId)) {
    errors.push('donorId must be a valid UUID');
  }

  if (errors.length > 0) {
    return fail(next, errors.join('; '));
  }

  next();
}

export function validateTransferOperation(
  req: Request,
  _res: Response,
  next: NextFunction
): void {
  const { itemId, toUserId, quantity, notes } = req.body;
  const errors: string[] = [];

  if (!itemId || !isUUID(itemId)) {
    errors.push('itemId is required and must be a valid UUID');
  }

  if (!toUserId || !isUUID(toUserId)) {
    errors.push('toUserId is required and must be a valid UUID');
  }

  const qty = Number(quantity);
  if (quantity === undefined || quantity === null || !Number.isInteger(qty) || qty < 1) {
    errors.push('quantity must be a positive integer');
  }

  if (notes !== undefined && notes !== null && typeof notes !== 'string') {
    errors.push('notes must be a string');
  }

  if (errors.length > 0) {
    return fail(next, errors.join('; '));
  }

  next();
}
