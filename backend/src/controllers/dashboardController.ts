import { Request, Response, NextFunction } from 'express';
import { IsNull } from 'typeorm';
import { getDataSource } from '../database';
import { Item } from '../entities';

export async function getDashboardStats(
  _req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const ds = await getDataSource();
    const itemRepo = ds.getRepository(Item);

    // Total items (not deleted)
    const total = await itemRepo.count({
      where: { deletedAt: IsNull() },
    });

    // On balance
    const onBalance = await itemRepo.count({
      where: {
        deletedAt: IsNull(),
        balance_status: 'on_balance',
      },
    });

    // Off balance
    const offBalance = await itemRepo.count({
      where: {
        deletedAt: IsNull(),
        balance_status: 'off_balance',
      },
    });

    res.json({
      status: 'success',
      data: {
        total,
        onBalance,
        offBalance,
      },
    });
  } catch (error) {
    next(error);
  }
}
