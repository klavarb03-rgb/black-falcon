import { Request, Response, NextFunction } from 'express';
import { AppError } from '../middleware/errorHandler';
import { ItemStatus } from '../entities/Item';

const VALID_STATUSES: ItemStatus[] = ['government', 'volunteer'];

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

export function validateCreateItem(req: Request, _res: Response, next: NextFunction): void {
  const { name, status, quantity, unit, description, groupId, donorId } = req.body;
  const errors: string[] = [];

  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    errors.push('name is required and must be a non-empty string');
  } else if (name.trim().length > 255) {
    errors.push('name must not exceed 255 characters');
  }

  if (!status || !VALID_STATUSES.includes(status as ItemStatus)) {
    errors.push(`status is required and must be one of: ${VALID_STATUSES.join(', ')}`);
  }

  if (quantity !== undefined) {
    const qty = Number(quantity);
    if (!Number.isInteger(qty) || qty < 1) {
      errors.push('quantity must be a positive integer');
    }
  }

  if (unit !== undefined && unit !== null && (typeof unit !== 'string' || unit.length > 100)) {
    errors.push('unit must be a string with max 100 characters');
  }

  if (description !== undefined && description !== null && typeof description !== 'string') {
    errors.push('description must be a string');
  }

  if (groupId !== undefined && groupId !== null && !isUUID(groupId)) {
    errors.push('groupId must be a valid UUID');
  }

  if (donorId !== undefined && donorId !== null && !isUUID(donorId)) {
    errors.push('donorId must be a valid UUID');
  }

  if (errors.length > 0) {
    return fail(next, errors.join('; '));
  }

  next();
}

export function validateUpdateItem(req: Request, _res: Response, next: NextFunction): void {
  const { name, status, quantity, unit, description, groupId, donorId } = req.body;
  const errors: string[] = [];

  if (name !== undefined) {
    if (typeof name !== 'string' || name.trim().length === 0) {
      errors.push('name must be a non-empty string');
    } else if (name.trim().length > 255) {
      errors.push('name must not exceed 255 characters');
    }
  }

  if (status !== undefined && !VALID_STATUSES.includes(status as ItemStatus)) {
    errors.push(`status must be one of: ${VALID_STATUSES.join(', ')}`);
  }

  if (quantity !== undefined) {
    const qty = Number(quantity);
    if (!Number.isInteger(qty) || qty < 1) {
      errors.push('quantity must be a positive integer');
    }
  }

  if (unit !== undefined && unit !== null && (typeof unit !== 'string' || unit.length > 100)) {
    errors.push('unit must be a string with max 100 characters');
  }

  if (description !== undefined && description !== null && typeof description !== 'string') {
    errors.push('description must be a string');
  }

  if (groupId !== undefined && groupId !== null && !isUUID(groupId)) {
    errors.push('groupId must be a valid UUID');
  }

  if (donorId !== undefined && donorId !== null && !isUUID(donorId)) {
    errors.push('donorId must be a valid UUID');
  }

  if (errors.length > 0) {
    return fail(next, errors.join('; '));
  }

  next();
}

export function validatePaginationParams(req: Request, _res: Response, next: NextFunction): void {
  const { page, limit } = req.query;

  if (page !== undefined) {
    const p = Number(page);
    if (!Number.isInteger(p) || p < 1) {
      return fail(next, 'page must be a positive integer', 400);
    }
  }

  if (limit !== undefined) {
    const l = Number(limit);
    if (!Number.isInteger(l) || l < 1 || l > 100) {
      return fail(next, 'limit must be an integer between 1 and 100', 400);
    }
  }

  next();
}
