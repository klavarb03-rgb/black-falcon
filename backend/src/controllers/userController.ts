import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import { getDataSource } from '../database';
import { UserRepository } from '../repositories/UserRepository';
import { User } from '../entities/User';
import { AppError } from '../middleware/errorHandler';
import { validateCreateUser, validateUpdateUser } from '../validators/user.validator';

// Relies on the global Express.Request augmentation in auth.ts (req.user?: AuthUser)

type SafeUser = Omit<User, 'passwordHash'>;

function sanitizeUser(user: User): SafeUser {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { passwordHash: _passwordHash, ...safe } = user;
  return safe;
}

export async function getUsers(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const includeInactive = req.query['includeInactive'] === 'true';
    const ds = await getDataSource();
    const repo = new UserRepository(ds);
    const users = await repo.findAll(includeInactive);
    res.json({ status: 'ok', data: users.map(sanitizeUser) });
  } catch (err) {
    next(err);
  }
}

export async function getUserById(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { id } = req.params as { id: string };
    const ds = await getDataSource();
    const repo = new UserRepository(ds);
    const user = await repo.findById(id);

    if (!user) {
      const error: AppError = new Error('User not found');
      error.statusCode = 404;
      error.isOperational = true;
      next(error);
      return;
    }

    res.json({ status: 'ok', data: sanitizeUser(user) });
  } catch (err) {
    next(err);
  }
}

export async function createUser(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { data, errors } = validateCreateUser(req.body);

    if (errors.length > 0) {
      res.status(422).json({ status: 'error', message: 'Validation failed', errors });
      return;
    }

    const ds = await getDataSource();
    const repo = new UserRepository(ds);

    const existing = await repo.findByUsername(data.username);
    if (existing) {
      const error: AppError = new Error('Username already taken');
      error.statusCode = 409;
      error.isOperational = true;
      next(error);
      return;
    }

    const passwordHash = await bcrypt.hash(data.password, 12);
    const user = await repo.save({
      username: data.username,
      passwordHash,
      fullName: data.fullName ?? null,
      role: data.role ?? 'manager',
      isActive: true,
    });

    res.status(201).json({ status: 'ok', data: sanitizeUser(user) });
  } catch (err) {
    next(err);
  }
}

export async function updateUser(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params as { id: string };
    const { data, errors } = validateUpdateUser(req.body);

    if (errors.length > 0) {
      res.status(422).json({ status: 'error', message: 'Validation failed', errors });
      return;
    }

    if (Object.keys(data).length === 0) {
      res.status(400).json({ status: 'error', message: 'No fields to update' });
      return;
    }

    // Leaders cannot assign the admin role
    if (req.user?.role === 'leader' && data.role === 'admin') {
      res.status(403).json({ status: 'error', message: 'Leaders cannot assign the admin role' });
      return;
    }

    const ds = await getDataSource();
    const repo = new UserRepository(ds);

    const existing = await repo.findById(id);
    if (!existing) {
      const error: AppError = new Error('User not found');
      error.statusCode = 404;
      error.isOperational = true;
      next(error);
      return;
    }

    const updated = await repo.update(id, data);
    res.json({ status: 'ok', data: sanitizeUser(updated!) });
  } catch (err) {
    next(err);
  }
}
