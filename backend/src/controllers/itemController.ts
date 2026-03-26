import { IsNull } from 'typeorm';
import { Request, Response, NextFunction } from 'express';
import { FindOptionsWhere } from 'typeorm';
import { getDataSource } from '../database';
import { Item, Operation } from '../entities';
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
    const {
      name,
      status,
      quantity,
      unit,
      description,
      groupId,
      donorId,
      metadata,
      balance_status,
      document_number,
      document_date,
      supplier_name,
    } = req.body;
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
      metadata: metadata ?? {},
      balance_status: balance_status ?? 'off_balance',
      document_number: document_number ?? null,
      document_date: document_date ?? null,
      supplier_name: supplier_name ?? null,
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

    const balanceStatusFilter = req.query['balance_status'] as string | undefined;
    const validBalanceStatuses = ['off_balance', 'on_balance', 'all'];
    const balanceStatus =
      balanceStatusFilter && validBalanceStatuses.includes(balanceStatusFilter)
        ? balanceStatusFilter
        : 'all';

    const where: FindOptionsWhere<Item> = { deletedAt: IsNull() };
    if (role === 'manager') {
      where.ownerId = userId;
    }
    if (balanceStatus !== 'all') {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (where as any).balance_status = balanceStatus;
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

    const {
      name,
      status,
      quantity,
      unit,
      description,
      groupId,
      donorId,
      metadata,
      balance_status,
      document_number,
      document_date,
      supplier_name,
    } = req.body;
    const updates: Partial<Item> = {};
    if (name !== undefined) updates.name = (name as string).trim();
    if (status !== undefined) updates.status = status;
    if (quantity !== undefined) updates.quantity = Number(quantity);
    if (unit !== undefined) updates.unit = unit;
    if (description !== undefined) updates.description = description;
    if (groupId !== undefined) updates.groupId = groupId;
    if (donorId !== undefined) updates.donorId = donorId;
    if (metadata !== undefined) updates.metadata = metadata;
    if (balance_status !== undefined) updates.balance_status = balance_status;
    if (document_number !== undefined) updates.document_number = document_number;
    if (document_date !== undefined) updates.document_date = document_date;
    if (supplier_name !== undefined) updates.supplier_name = supplier_name;

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

// PATCH /items/:id/transfer-to-balance  (leader or admin only)
export async function transferToBalance(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const ds = await getDataSource();
    const itemRepo = new ItemRepository(ds);
    const operationRepo = ds.getRepository(Operation);

    const item = await itemRepo.findById(req.params['id'] as string);
    if (!item) {
      return notFound(next);
    }

    if (item.balance_status === 'on_balance') {
      const err: AppError = new Error('Item is already on balance');
      err.statusCode = 409;
      err.isOperational = true;
      return next(err);
    }

    const { document_number, document_date, supplier_name } = req.body as {
      document_number: string;
      document_date: string;
      supplier_name: string;
    };

    if (!document_number || !document_date || !supplier_name) {
      const err: AppError = new Error(
        'document_number, document_date and supplier_name are required',
      );
      err.statusCode = 400;
      err.isOperational = true;
      return next(err);
    }

    // Update item to on_balance and store document data
    const updated = await itemRepo.transferToBalance(item.id, {
      document_number,
      document_date: new Date(document_date),
      supplier_name,
    });

    // Record an operation for audit trail
    await operationRepo.save(
      operationRepo.create({
        type: 'transfer_to_balance',
        itemId: item.id,
        quantity: item.quantity || 1,
        toUserId: item.ownerId, // Встановлюємо to_user_id щоб задовольнити constraint
        createdById: req.user!.userId,
        notes: `Transferred to balance. Document: ${document_number}, Supplier: ${supplier_name}`,
        metadata: {
          document_number,
          document_date,
          supplier_name,
          previous_balance_status: item.balance_status,
        },
      }),
    );

    res.json({ status: 'success', data: updated });
  } catch (err) {
    next(err);
  }
}
