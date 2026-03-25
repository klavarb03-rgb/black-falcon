import { Request, Response, NextFunction } from 'express';
import { FindOptionsWhere } from 'typeorm';
import { getDataSource } from '../database';
import { Item } from '../entities';
import { ItemRepository } from '../repositories';
import { AppError } from '../middleware/errorHandler';

function notFound(next: NextFunction): void {
  const err: AppError = new Error('Item not found');
  err.statusCode = 404;
  err.isOperational = true;
  next(err);
}

function forbidden(next: NextFunction): void {
  const err: AppError = new Error('Access denied');
  err.statusCode = 403;
  err.isOperational = true;
  next(err);
}

export async function createItem(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const ds = await getDataSource();
    const itemRepo = new ItemRepository(ds);
    const { name, status, quantity, unit, description, groupId, donorId, metadata } = req.body;
    const ownerId = req.user!.userId;

    const item = await itemRepo.save({
      name: (name as string).trim(),
      status,
      quantity: quantity ?? 1,
      unit: unit ?? null,
      description: description ?? null,
      groupId: groupId ?? null,
      donorId: donorId ?? null,
      ownerId,
      metadata: metadata ?? null,
      isDeleted: false,
    });

    res.status(201).json({ status: 'success', data: item });
  } catch (err) {
    next(err);
  }
}

export async function getItems(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const ds = await getDataSource();
    const repo = ds.getRepository(Item);
    const { role, userId } = req.user!;

    const page = Math.max(1, parseInt((req.query['page'] as string) || '1', 10) || 1);
    const limit = Math.min(
      100,
      Math.max(1, parseInt((req.query['limit'] as string) || '20', 10) || 20),
    );
    const skip = (page - 1) * limit;

    const where: FindOptionsWhere<Item> = { isDeleted: false };
    if (role === 'manager') {
      where.ownerId = userId;
    }

    const [items, total] = await repo.findAndCount({
      where,
      relations: ['owner', 'group', 'donor'],
      order: { createdAt: 'DESC' },
      skip,
      take: limit,
    });

    res.json({
      status: 'success',
      data: items,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function getItemById(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const ds = await getDataSource();
    const itemRepo = new ItemRepository(ds);
    const item = await itemRepo.findById(req.params['id'] as string);

    if (!item) {
      return notFound(next);
    }

    const { role, userId } = req.user!;
    if (role === 'manager' && item.ownerId !== userId) {
      return forbidden(next);
    }

    res.json({ status: 'success', data: item });
  } catch (err) {
    next(err);
  }
}

export async function updateItem(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const ds = await getDataSource();
    const itemRepo = new ItemRepository(ds);
    const item = await itemRepo.findById(req.params['id'] as string);

    if (!item) {
      return notFound(next);
    }

    const { role, userId } = req.user!;
    if (role === 'manager' && item.ownerId !== userId) {
      return forbidden(next);
    }

    const { name, status, quantity, unit, description, groupId, donorId, metadata } = req.body;
    const updates: Partial<Item> = {};
    if (name !== undefined) updates.name = (name as string).trim();
    if (status !== undefined) updates.status = status;
    if (quantity !== undefined) updates.quantity = Number(quantity);
    if (unit !== undefined) updates.unit = unit;
    if (description !== undefined) updates.description = description;
    if (groupId !== undefined) updates.groupId = groupId;
    if (donorId !== undefined) updates.donorId = donorId;
    if (metadata !== undefined) updates.metadata = metadata;

    const updated = await itemRepo.update(item.id, updates);
    res.json({ status: 'success', data: updated });
  } catch (err) {
    next(err);
  }
}

export async function deleteItem(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const ds = await getDataSource();
    const itemRepo = new ItemRepository(ds);
    const item = await itemRepo.findById(req.params['id'] as string);

    if (!item) {
      return notFound(next);
    }

    const { role, userId } = req.user!;
    if (role === 'manager' && item.ownerId !== userId) {
      return forbidden(next);
    }

    await itemRepo.softDelete(item.id);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}
