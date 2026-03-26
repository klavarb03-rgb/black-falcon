import { Request, Response, NextFunction } from 'express';
import { getDataSource } from '../database';
import { Item, Kit, KitItemEntry } from '../entities';
import { KitRepository } from '../repositories';
import { AppError } from '../middleware/errorHandler';

function notFound(next: NextFunction, msg = 'Kit not found'): void {
  const err: AppError = new Error(msg);
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

function badRequest(next: NextFunction, message: string): void {
  const err: AppError = new Error(message);
  err.statusCode = 400;
  err.isOperational = true;
  next(err);
}

function validateItems(items: unknown, next: NextFunction): KitItemEntry[] | null {
  if (!Array.isArray(items) || items.length === 0) {
    badRequest(next, 'items must be a non-empty array');
    return null;
  }
  for (const entry of items) {
    if (typeof entry.itemId !== 'string' || !entry.itemId) {
      badRequest(next, 'Each item must have a valid itemId');
      return null;
    }
    if (typeof entry.quantity !== 'number' || entry.quantity < 1) {
      badRequest(next, 'Each item must have a quantity >= 1');
      return null;
    }
  }
  return items as KitItemEntry[];
}

// ── Templates ────────────────────────────────────────────────────────────────

export async function getTemplates(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const ds = await getDataSource();
    const kitRepo = new KitRepository(ds);
    const templates = await kitRepo.findAllTemplates();
    res.json({ status: 'success', data: templates });
  } catch (err) {
    next(err);
  }
}

export async function getTemplateById(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const ds = await getDataSource();
    const kitRepo = new KitRepository(ds);
    const template = await kitRepo.findTemplateById(req.params['id'] as string);
    if (!template) return notFound(next, 'Template not found');
    res.json({ status: 'success', data: template });
  } catch (err) {
    next(err);
  }
}

export async function createTemplate(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { name, description, items, metadata } = req.body;

    if (!name || typeof name !== 'string' || !name.trim()) {
      return badRequest(next, 'Template name is required');
    }

    const validatedItems = validateItems(items, next);
    if (!validatedItems) return;

    const ds = await getDataSource();
    const kitRepo = new KitRepository(ds);
    const template = await kitRepo.saveTemplate({
      name: (name as string).trim(),
      description: description ?? null,
      items: validatedItems,
      metadata: metadata ?? null,
      isDeleted: false,
    });

    res.status(201).json({ status: 'success', data: template });
  } catch (err) {
    next(err);
  }
}

export async function deleteTemplate(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const ds = await getDataSource();
    const kitRepo = new KitRepository(ds);
    const template = await kitRepo.findTemplateById(req.params['id'] as string);
    if (!template) return notFound(next, 'Template not found');

    await kitRepo.softDeleteTemplate(template.id);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

// ── Available kits ────────────────────────────────────────────────────────────

export async function getAvailableKits(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const templateId = req.query['templateId'] as string | undefined;

    if (!templateId) {
      return badRequest(next, 'templateId query parameter is required');
    }

    const ds = await getDataSource();
    const kitRepo = new KitRepository(ds);
    const template = await kitRepo.findTemplateById(templateId);

    if (!template) return notFound(next, 'Template not found');

    if (!template.items || template.items.length === 0) {
      res.json({
        status: 'success',
        data: { templateId, name: template.name, availableCount: 0, bottleneck: null },
      });
      return;
    }

    const itemRepo = ds.getRepository(Item);
    let availableCount = Infinity;
    let bottleneck: { itemId: string; name: string; available: number; required: number } | null = null;

    for (const entry of template.items) {
      const item = await itemRepo.findOne({ where: { id: entry.itemId, isDeleted: false } });
      const available = item ? item.quantity : 0;
      const canMake = Math.floor(available / entry.quantity);

      if (canMake < availableCount) {
        availableCount = canMake;
        bottleneck = {
          itemId: entry.itemId,
          name: item?.name ?? entry.itemId,
          available,
          required: entry.quantity,
        };
      }
    }

    res.json({
      status: 'success',
      data: {
        templateId,
        name: template.name,
        availableCount: isFinite(availableCount) ? availableCount : 0,
        bottleneck,
      },
    });
  } catch (err) {
    next(err);
  }
}

// ── Kit instances ─────────────────────────────────────────────────────────────

export async function getKits(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const ds = await getDataSource();
    const { role, userId } = _req.user!;
    const kitRepo = new KitRepository(ds);

    let kits;
    if (role === 'manager') {
      kits = await kitRepo.findKitsByOwner(userId);
    } else {
      kits = await ds.getRepository(Kit).find({
        where: { isDeleted: false },
        relations: ['template', 'owner'],
        order: { createdAt: 'DESC' },
      });
    }

    res.json({ status: 'success', data: kits });
  } catch (err) {
    next(err);
  }
}

export async function getKitById(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const ds = await getDataSource();
    const kitRepo = new KitRepository(ds);
    const kit = await kitRepo.findKitById(req.params['id'] as string);

    if (!kit) return notFound(next);

    const { role, userId } = req.user!;
    if (role === 'manager' && kit.ownerId !== userId) return forbidden(next);

    res.json({ status: 'success', data: kit });
  } catch (err) {
    next(err);
  }
}

// ── Assemble ──────────────────────────────────────────────────────────────────

export async function assembleKit(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { name, templateId, items, metadata } = req.body;
    const ownerId = req.user!.userId;

    const validatedItems = validateItems(items, next);
    if (!validatedItems) return;

    const ds = await getDataSource();

    let kit: Kit | undefined;

    await ds.transaction(async (manager) => {
      const itemRepo = manager.getRepository(Item);

      // Lock rows and check availability
      const shortfalls: string[] = [];
      for (const entry of validatedItems) {
        const item = await itemRepo
          .createQueryBuilder('item')
          .setLock('pessimistic_write')
          .where('item.id = :id AND item."isDeleted" = false', { id: entry.itemId })
          .getOne();

        if (!item) {
          shortfalls.push(`Item ${entry.itemId} not found`);
        } else if (item.quantity < entry.quantity) {
          shortfalls.push(`"${item.name}": need ${entry.quantity}, have ${item.quantity}`);
        }
      }

      if (shortfalls.length > 0) {
        const err: AppError = new Error(`Insufficient inventory: ${shortfalls.join('; ')}`);
        err.statusCode = 409;
        err.isOperational = true;
        throw err;
      }

      // Deduct inventory
      for (const entry of validatedItems) {
        await itemRepo
          .createQueryBuilder()
          .update(Item)
          .set({ quantity: () => `quantity - ${entry.quantity}` })
          .where('id = :id', { id: entry.itemId })
          .execute();
      }

      // Resolve name from template if not provided
      let resolvedName: string | null = name ?? null;
      if (templateId) {
        const kitRepo = new KitRepository(ds);
        const template = await kitRepo.findTemplateById(templateId as string);
        if (!template) {
          const err: AppError = new Error('Template not found');
          err.statusCode = 404;
          err.isOperational = true;
          throw err;
        }
        if (!resolvedName) resolvedName = template.name;
      }

      // Create the kit record
      const kitRepo = manager.getRepository(Kit);
      kit = await kitRepo.save(
        kitRepo.create({
          name: resolvedName,
          templateId: templateId ?? null,
          ownerId,
          items: validatedItems,
          metadata: metadata ?? null,
          isDeleted: false,
          version: 1,
        }),
      );
    });

    res.status(201).json({ status: 'success', data: kit });
  } catch (err) {
    next(err);
  }
}

// ── Disassemble ───────────────────────────────────────────────────────────────

export async function disassembleKit(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { kitId } = req.body;

    if (!kitId || typeof kitId !== 'string') {
      return badRequest(next, 'kitId is required');
    }

    const ds = await getDataSource();
    const kitRepo = new KitRepository(ds);
    const kit = await kitRepo.findKitById(kitId);

    if (!kit) return notFound(next);

    const { role, userId } = req.user!;
    if (role === 'manager' && kit.ownerId !== userId) return forbidden(next);

    await ds.transaction(async (manager) => {
      const itemRepo = manager.getRepository(Item);

      // Return components to inventory (skip items that no longer exist)
      for (const entry of kit.items) {
        const exists = await itemRepo.findOne({ where: { id: entry.itemId, isDeleted: false } });
        if (exists) {
          await itemRepo
            .createQueryBuilder()
            .update(Item)
            .set({ quantity: () => `quantity + ${entry.quantity}` })
            .where('id = :id', { id: entry.itemId })
            .execute();
        }
      }

      await manager.getRepository(Kit).update(kitId, { isDeleted: true });
    });

    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

export async function deleteKit(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const ds = await getDataSource();
    const kitRepo = new KitRepository(ds);
    const kit = await kitRepo.findKitById(req.params['id'] as string);

    if (!kit) return notFound(next);

    const { role, userId } = req.user!;
    if (role === 'manager' && kit.ownerId !== userId) return forbidden(next);

    await kitRepo.softDeleteKit(kit.id);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}
