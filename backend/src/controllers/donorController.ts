import { Request, Response, NextFunction } from 'express';
import { getDataSource } from '../database';
import { Item } from '../entities';
import { DonorRepository } from '../repositories';
import { AppError } from '../middleware/errorHandler';

function notFound(next: NextFunction, msg = 'Донора не знайдено'): void {
  const err: AppError = new Error(msg);
  err.statusCode = 404;
  err.isOperational = true;
  next(err);
}

function badRequest(next: NextFunction, message: string): void {
  const err: AppError = new Error(message);
  err.statusCode = 400;
  err.isOperational = true;
  next(err);
}

// GET /api/donors?page=1&limit=20
export async function getDonors(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const page = Math.max(1, parseInt(req.query['page'] as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query['limit'] as string) || 20));

    const ds = await getDataSource();
    const donorRepo = new DonorRepository(ds);
    const [donors, total] = await donorRepo.findPaginated(page, limit);

    res.json({
      status: 'success',
      data: donors,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    next(err);
  }
}

// POST /api/donors
export async function createDonor(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { name, description, contactInfo, metadata } = req.body;

    if (!name || typeof name !== 'string' || !name.trim()) {
      return badRequest(next, "Ім'я донора є обов'язковим");
    }

    const ds = await getDataSource();
    const donorRepo = new DonorRepository(ds);
    const donor = await donorRepo.save({
      name: (name as string).trim(),
      description: description ?? null,
      contactInfo: contactInfo ?? null,
      metadata: metadata ?? null,
      isDeleted: false,
    });

    res.status(201).json({ status: 'success', data: donor });
  } catch (err) {
    next(err);
  }
}

// PUT /api/donors/:id
export async function updateDonor(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const ds = await getDataSource();
    const donorRepo = new DonorRepository(ds);
    const donor = await donorRepo.findById(req.params['id'] as string);

    if (!donor) return notFound(next);

    const { name, description, contactInfo, metadata } = req.body;

    if (name !== undefined && (typeof name !== 'string' || !name.trim())) {
      return badRequest(next, "Ім'я донора не може бути порожнім");
    }

    const updated = await donorRepo.update(donor.id, {
      ...(name !== undefined && { name: (name as string).trim() }),
      ...(description !== undefined && { description }),
      ...(contactInfo !== undefined && { contactInfo }),
      ...(metadata !== undefined && { metadata }),
    });

    res.json({ status: 'success', data: updated });
  } catch (err) {
    next(err);
  }
}

// DELETE /api/donors/:id
export async function deleteDonor(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const ds = await getDataSource();
    const donorRepo = new DonorRepository(ds);
    const donor = await donorRepo.findById(req.params['id'] as string);

    if (!donor) return notFound(next);

    await donorRepo.softDelete(donor.id);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

// PUT /api/items/:id/donor — link item to donor (or unlink if donorId is null)
export async function linkItemToDonor(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const itemId = req.params['id'] as string;
    const { donorId } = req.body;

    const ds = await getDataSource();
    const itemRepo = ds.getRepository(Item);
    const item = await itemRepo.findOne({ where: { id: itemId, isDeleted: false } });

    if (!item) {
      const err: AppError = new Error('Предмет не знайдено');
      err.statusCode = 404;
      err.isOperational = true;
      return next(err);
    }

    // donorId can be null (to unlink) or a valid uuid string
    if (donorId !== null && donorId !== undefined) {
      if (typeof donorId !== 'string') {
        return badRequest(next, 'donorId має бути рядком або null');
      }
      const donorRepo = new DonorRepository(ds);
      const donor = await donorRepo.findById(donorId);
      if (!donor) return notFound(next);
    }

    await itemRepo.update(itemId, { donorId: donorId ?? null, version: item.version + 1 });
    const updated = await itemRepo.findOne({ where: { id: itemId }, relations: ['donor'] });

    res.json({ status: 'success', data: updated });
  } catch (err) {
    next(err);
  }
}

// GET /api/donors/:id/report
export async function getDonorReport(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const ds = await getDataSource();
    const donorRepo = new DonorRepository(ds);
    const donor = await donorRepo.findById(req.params['id'] as string);

    if (!donor) return notFound(next);

    const itemRepo = ds.getRepository(Item);
    const items = await itemRepo.find({
      where: { donorId: donor.id, isDeleted: false },
      order: { createdAt: 'DESC' },
    });

    const totalItems = items.length;
    const totalQuantity = items.reduce((sum, i) => sum + i.quantity, 0);

    const byStatus = items.reduce<Record<string, { count: number; quantity: number }>>((acc, i) => {
      if (!acc[i.status]) acc[i.status] = { count: 0, quantity: 0 };
      acc[i.status]!.count += 1;
      acc[i.status]!.quantity += i.quantity;
      return acc;
    }, {});

    res.json({
      status: 'success',
      data: {
        donor,
        summary: {
          totalItems,
          totalQuantity,
          byStatus,
        },
        items,
      },
    });
  } catch (err) {
    next(err);
  }
}
