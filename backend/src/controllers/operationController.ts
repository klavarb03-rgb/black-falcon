import { IsNull } from 'typeorm';
import { Request, Response, NextFunction } from 'express';
import { getDataSource } from '../database';
import { ItemRepository } from '../repositories/ItemRepository';
import { OperationRepository } from '../repositories/OperationRepository';
import { UserRepository } from '../repositories/UserRepository';
import { Item } from '../entities/Item';
import { Operation } from '../entities/Operation';
import { AppError } from '../middleware/errorHandler';

export async function createTransfer(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const { itemId, toUserId, quantity, notes } = req.body as {
    itemId: string;
    toUserId: string;
    quantity: number;
    notes?: string;
  };
  const createdById = req.user!.userId;

  const ds = await getDataSource();
  const queryRunner = ds.createQueryRunner();
  await queryRunner.connect();
  await queryRunner.startTransaction();

  try {
    const itemRepo = new ItemRepository(ds);
    const userRepo = new UserRepository(ds);
    const operationRepo = new OperationRepository(ds);

    // Validate item exists
    const item = await itemRepo.findById(itemId);
    if (!item) {
      const err: AppError = new Error('Item not found');
      err.statusCode = 404;
      err.isOperational = true;
      return next(err);
    }

    // Validate sufficient quantity
    if (item.quantity < quantity) {
      const err: AppError = new Error(
        `Insufficient quantity: available ${item.quantity}, requested ${quantity}`
      );
      err.statusCode = 400;
      err.isOperational = true;
      return next(err);
    }

    // Validate receiver exists and is active
    const receiver = await userRepo.findById(toUserId);
    if (!receiver || !receiver.isActive) {
      const err: AppError = new Error('Receiver user not found or inactive');
      err.statusCode = 404;
      err.isOperational = true;
      return next(err);
    }

    const fromUserId = item.ownerId;

    // Prevent self-transfer
    if (fromUserId === toUserId) {
      const err: AppError = new Error('Sender and receiver must be different users');
      err.statusCode = 400;
      err.isOperational = true;
      return next(err);
    }

    // 1. Decrement sender's item quantity
    await queryRunner.manager.decrement(Item, { id: itemId }, 'quantity', quantity);
    await queryRunner.manager.increment(Item, { id: itemId }, 'version', 1);

    // 2. Find or create receiver's item with the same name
    const itemRepo2 = queryRunner.manager.getRepository(Item);
    let receiverItem = await itemRepo2.findOne({
      where: {
        name: item.name,
        ownerId: toUserId,
        status: item.status,
        deletedAt: IsNull(),
      },
    });

    if (receiverItem) {
      await queryRunner.manager.increment(
        Item,
        { id: receiverItem.id },
        'quantity',
        quantity
      );
      await queryRunner.manager.increment(
        Item,
        { id: receiverItem.id },
        'version',
        1
      );
    } else {
      receiverItem = itemRepo2.create({
        name: item.name,
        status: item.status,
        quantity,
        unit: item.unit,
        description: item.description,
        groupId: item.groupId,
        donorId: item.donorId,
        ownerId: toUserId,
        metadata: item.metadata,
      });
      receiverItem = await queryRunner.manager.save(Item, receiverItem);
    }

    // 3. Create operation record (quantityDelta is negative = outgoing from sender)
    const operation = await operationRepo.save({
      type: 'transfer',
      itemId,
      fromUserId,
      toUserId,
      quantity: -quantity,
      createdById,
      notes: notes ?? null,
      metadata: {
        receiverItemId: receiverItem.id,
        transferredQuantity: quantity,
      },
    });

    await queryRunner.commitTransaction();

    // Return full operation with relations
    const fullOperation = await operationRepo.findById(operation.id);
    res.status(201).json({ status: 'success', data: fullOperation });
  } catch (err) {
    await queryRunner.rollbackTransaction();
    next(err);
  } finally {
    await queryRunner.release();
  }
}

export async function createWriteoff(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const { itemId, quantity, type, reason, donorId } = req.body as {
    itemId: string;
    quantity: number;
    type: 'used' | 'lost';
    reason?: string;
    donorId?: string;
  };
  const createdById = req.user!.userId;

  const ds = await getDataSource();
  const queryRunner = ds.createQueryRunner();
  await queryRunner.connect();
  await queryRunner.startTransaction();

  try {
    const itemRepo = new ItemRepository(ds);
    const operationRepo = new OperationRepository(ds);

    const item = await itemRepo.findById(itemId);
    if (!item) {
      const err: AppError = new Error('Item not found');
      err.statusCode = 404;
      err.isOperational = true;
      return next(err);
    }

    if (item.quantity < quantity) {
      const err: AppError = new Error(
        `Insufficient quantity: available ${item.quantity}, requested ${quantity}`
      );
      err.statusCode = 400;
      err.isOperational = true;
      return next(err);
    }

    // Decrement quantity
    await queryRunner.manager.decrement(Item, { id: itemId }, 'quantity', quantity);
    await queryRunner.manager.increment(Item, { id: itemId }, 'version', 1);

    const metadata: Record<string, unknown> = { writeoffType: type };
    if (reason) metadata['reason'] = reason;
    if (donorId) metadata['donorId'] = donorId;

    const operation = await operationRepo.save({
      type: 'write_off',
      itemId,
      fromUserId: item.ownerId,
      toUserId: null,
      quantity: -quantity,
      createdById,
      notes: reason ?? null,
      metadata,
    });

    await queryRunner.commitTransaction();

    const fullOperation = await operationRepo.findById(operation.id);
    res.status(201).json({ status: 'success', data: fullOperation });
  } catch (err) {
    await queryRunner.rollbackTransaction();
    next(err);
  } finally {
    await queryRunner.release();
  }
}

export async function getOperations(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const ds = await getDataSource();
    const operationRepo = new OperationRepository(ds);
    const { role, userId } = req.user!;

    const { type, itemId } = req.query as { type?: string; itemId?: string };

    let operations;
    if (itemId) {
      operations = await operationRepo.findByItem(itemId);
    } else if (type === 'transfer' || type === 'write_off' || type === 'receive' || type === 'adjustment') {
      operations = await operationRepo.findByType(type);
    } else if (role === 'manager') {
      operations = await operationRepo.findByUser(userId);
    } else {
      // admin/leader see all
      const repo = ds.getRepository(Operation);
      operations = await repo.find({
        relations: ['item', 'createdBy', 'fromUser', 'toUser'],
        order: { createdAt: 'DESC' },
        take: 100,
      });
    }

    res.json({ status: 'success', data: operations });
  } catch (err) {
    next(err);
  }
}

export async function getOperationById(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const ds = await getDataSource();
    const operationRepo = new OperationRepository(ds);

    const operation = await operationRepo.findById(req.params['id'] as string);
    if (!operation) {
      const err: AppError = new Error('Operation not found');
      err.statusCode = 404;
      err.isOperational = true;
      return next(err);
    }

    res.json({ status: 'success', data: operation });
  } catch (err) {
    next(err);
  }
}
