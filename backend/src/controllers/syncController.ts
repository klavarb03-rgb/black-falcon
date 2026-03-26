import { Request, Response, NextFunction } from 'express';
import { getDataSource } from '../database';
import { SyncQueue, SyncOperation } from '../entities/SyncQueue';
import { Item } from '../entities/Item';
import { Operation } from '../entities/Operation';
import { Group } from '../entities/Group';
import { AppError } from '../middleware/errorHandler';
import { syncPendingItems, SyncItem } from '../services/syncService';

// GET /api/sync/status
export async function getSyncStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const ds = await getDataSource();
    const syncRepo = ds.getRepository(SyncQueue);
    const userId = req.user!.userId;

    const counts = await syncRepo
      .createQueryBuilder('sq')
      .select('sq.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .where('sq.userId = :userId', { userId })
      .groupBy('sq.status')
      .getRawMany<{ status: string; count: string }>();

    const statusMap: Record<string, number> = {
      pending: 0,
      processing: 0,
      completed: 0,
      failed: 0,
    };
    for (const row of counts) {
      statusMap[row.status] = parseInt(row.count, 10);
    }

    const oldestPending = await syncRepo.findOne({
      where: { userId, status: 'pending' },
      order: { createdAt: 'ASC' },
      select: ['id', 'createdAt'],
    });

    res.json({
      status: 'success',
      data: {
        queue: statusMap,
        total: Object.values(statusMap).reduce((a, b) => a + b, 0),
        oldestPendingAt: oldestPending?.createdAt ?? null,
      },
    });
  } catch (err) {
    next(err);
  }
}

// POST /api/sync/push
export async function pushSync(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const ds = await getDataSource();
    const syncRepo = ds.getRepository(SyncQueue);
    const userId = req.user!.userId;

    const items: SyncItem[] = req.body.items;
    if (!Array.isArray(items) || items.length === 0) {
      const err: AppError = new Error('items must be a non-empty array');
      err.statusCode = 400;
      err.isOperational = true;
      return next(err);
    }

    if (items.length > 100) {
      const err: AppError = new Error('Batch size exceeds maximum of 100 items');
      err.statusCode = 400;
      err.isOperational = true;
      return next(err);
    }

    // Insert all items into sync_queue
    const queued = syncRepo.create(
      items.map((item) => ({
        userId,
        entityType: item.entityType,
        entityId: item.entityId,
        operation: item.operation as SyncOperation,
        payload: item.payload,
        clientVersion: item.clientVersion ?? 1,
        status: 'pending' as const,
        retryCount: 0,
        errorMessage: null,
        processedAt: null,
      })),
    );
    await syncRepo.save(queued);

    // Process immediately
    const results = await syncPendingItems(userId, ds);

    const succeeded = results.filter((r) => r.status === 'completed').length;
    const failed = results.filter((r) => r.status === 'failed').length;
    const conflicts = results.filter((r) => r.conflict?.hasConflict).length;

    res.status(200).json({
      status: 'success',
      data: {
        processed: results.length,
        succeeded,
        failed,
        conflicts,
        results,
      },
    });
  } catch (err) {
    next(err);
  }
}

// GET /api/sync/pull
export async function pullSync(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const ds = await getDataSource();
    const userId = req.user!.userId;
    const { role } = req.user!;

    const sinceParam = req.query['since'] as string | undefined;
    let since: Date;

    if (sinceParam) {
      since = new Date(sinceParam);
      if (isNaN(since.getTime())) {
        const err: AppError = new Error('Invalid "since" timestamp — must be ISO 8601');
        err.statusCode = 400;
        err.isOperational = true;
        return next(err);
      }
    } else {
      // Default: last 24 hours
      since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    }

    const itemRepo = ds.getRepository(Item);
    const opRepo = ds.getRepository(Operation);
    const groupRepo = ds.getRepository(Group);

    // Scope queries by role: managers see only their own data
    const itemsQuery = itemRepo
      .createQueryBuilder('item')
      .where('item.updatedAt > :since', { since })
      .andWhere('item.isDeleted = false')
      .orderBy('item.updatedAt', 'ASC');

    if (role === 'manager') {
      itemsQuery.andWhere('item.ownerId = :userId', { userId });
    }

    const opsQuery = opRepo
      .createQueryBuilder('op')
      .where('op.updatedAt > :since', { since })
      .orderBy('op.updatedAt', 'ASC');

    if (role === 'manager') {
      opsQuery.andWhere(
        '(op.fromUserId = :userId OR op.toUserId = :userId OR op.createdById = :userId)',
        { userId },
      );
    }

    const groupsQuery = groupRepo
      .createQueryBuilder('grp')
      .where('grp.updatedAt > :since', { since })
      .orderBy('grp.updatedAt', 'ASC');

    if (role === 'manager') {
      groupsQuery.andWhere('grp.ownerId = :userId', { userId });
    }

    const [items, operations, groups] = await Promise.all([
      itemsQuery.getMany(),
      opsQuery.getMany(),
      groupsQuery.getMany(),
    ]);

    res.json({
      status: 'success',
      data: {
        since: since.toISOString(),
        serverTime: new Date().toISOString(),
        items,
        operations,
        groups,
        counts: {
          items: items.length,
          operations: operations.length,
          groups: groups.length,
        },
      },
    });
  } catch (err) {
    next(err);
  }
}
