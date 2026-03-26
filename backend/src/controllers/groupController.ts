import { IsNull } from 'typeorm';
import { Request, Response, NextFunction } from 'express';
import { getDataSource } from '../database';
import { Group, Item } from '../entities';
import { GroupRepository } from '../repositories';
import { AppError } from '../middleware/errorHandler';

function notFound(next: NextFunction): void {
  const err: AppError = new Error('Group not found');
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

interface TreeNode extends Group {
  children: TreeNode[];
}

function buildTree(groups: Group[]): TreeNode[] {
  const map = new Map<string, TreeNode>();
  const roots: TreeNode[] = [];

  for (const g of groups) {
    map.set(g.id, { ...g, children: [] });
  }

  for (const g of groups) {
    const node = map.get(g.id)!;
    if (g.parentId && map.has(g.parentId)) {
      map.get(g.parentId)!.children.push(node);
    } else {
      roots.push(node);
    }
  }

  return roots;
}

export async function getGroups(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const ds = await getDataSource();
    const groupRepo = new GroupRepository(ds);
    const ownerId = req.user!.userId;

    const allGroups = await groupRepo.findByOwner(ownerId);
    const tree = buildTree(allGroups);

    res.json({ status: 'success', data: tree });
  } catch (err) {
    next(err);
  }
}

export async function createGroup(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const ds = await getDataSource();
    const groupRepo = new GroupRepository(ds);
    const ownerId = req.user!.userId;
    const { name, parentId } = req.body;

    if (!name || typeof name !== 'string' || !name.trim()) {
      return badRequest(next, 'Group name is required');
    }

    let level = 1;
    if (parentId) {
      const parent = await groupRepo.findById(parentId as string);
      if (!parent) {
        const err: AppError = new Error('Parent group not found');
        err.statusCode = 404;
        err.isOperational = true;
        return next(err);
      }
      if (parent.ownerId !== ownerId) {
        return forbidden(next);
      }
      level = parent.level + 1;
      if (level > 4) {
        return badRequest(next, 'Maximum group depth of 4 levels exceeded');
      }
    }

    const group = await groupRepo.save({
      name: name.trim(),
      level,
      parentId: parentId ?? null,
      ownerId,
    });

    res.status(201).json({ status: 'success', data: group });
  } catch (err) {
    next(err);
  }
}

export async function updateGroup(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const ds = await getDataSource();
    const groupRepo = new GroupRepository(ds);
    const ownerId = req.user!.userId;
    const group = await groupRepo.findById(req.params['id'] as string);

    if (!group) return notFound(next);
    if (group.ownerId !== ownerId) return forbidden(next);

    const { name } = req.body;
    if (!name || typeof name !== 'string' || !name.trim()) {
      return badRequest(next, 'Group name is required');
    }

    const updated = await groupRepo.update(group.id, { name: name.trim() });
    res.json({ status: 'success', data: updated });
  } catch (err) {
    next(err);
  }
}

export async function deleteGroup(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const ds = await getDataSource();
    const groupRepo = new GroupRepository(ds);
    const ownerId = req.user!.userId;
    const group = await groupRepo.findById(req.params['id'] as string);

    if (!group) return notFound(next);
    if (group.ownerId !== ownerId) return forbidden(next);

    // Unassign items from this group before deleting
    await ds.getRepository(Item).update({ groupId: group.id }, { groupId: null as unknown as string });

    await groupRepo.delete(group.id);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

// PUT /api/groups/:id/move — bulk-move items from this group to a target group
export async function moveItems(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const ds = await getDataSource();
    const groupRepo = new GroupRepository(ds);
    const ownerId = req.user!.userId;
    const group = await groupRepo.findById(req.params['id'] as string);

    if (!group) return notFound(next);
    if (group.ownerId !== ownerId) return forbidden(next);

    const { targetGroupId } = req.body;

    // Validate target group if provided
    if (targetGroupId !== undefined && targetGroupId !== null) {
      const target = await groupRepo.findById(targetGroupId as string);
      if (!target) {
        const err: AppError = new Error('Target group not found');
        err.statusCode = 404;
        err.isOperational = true;
        return next(err);
      }
      if (target.ownerId !== ownerId) return forbidden(next);
    }

    const itemRepo = ds.getRepository(Item);
    const result = await itemRepo.update(
      { groupId: group.id, deletedAt: IsNull() },
      { groupId: (targetGroupId ?? null) as unknown as string },
    );

    res.json({
      status: 'success',
      data: { moved: result.affected ?? 0, targetGroupId: targetGroupId ?? null },
    });
  } catch (err) {
    next(err);
  }
}
