import { DataSource } from 'typeorm';
import { SyncQueue, SyncOperation } from '../entities/SyncQueue';
import { Item, ItemStatus } from '../entities/Item';
import { Operation } from '../entities/Operation';
import { Group } from '../entities/Group';

export interface SyncItem {
  entityType: string;
  entityId: string;
  operation: SyncOperation;
  payload: Record<string, unknown>;
  clientVersion: number;
}

export interface ConflictResolution {
  hasConflict: boolean;
  serverVersion: number;
  clientVersion: number;
  resolvedPayload: Record<string, unknown>;
  strategy: 'no-conflict' | 'last-write-wins';
}

export interface SyncResult {
  id: string;
  entityType: string;
  entityId: string;
  operation: SyncOperation;
  status: 'completed' | 'failed';
  conflict?: Pick<ConflictResolution, 'hasConflict' | 'serverVersion' | 'clientVersion' | 'strategy'>;
  error?: string;
}

/**
 * Resolve conflicts using last-write-wins strategy.
 * The client's write always wins — it is the "last write" arriving at the server.
 * Returns conflict metadata for audit purposes.
 */
export function resolveConflicts(
  clientVersion: number,
  serverVersion: number,
  clientPayload: Record<string, unknown>,
): ConflictResolution {
  const hasConflict = clientVersion < serverVersion;
  return {
    hasConflict,
    serverVersion,
    clientVersion,
    resolvedPayload: clientPayload,
    strategy: hasConflict ? 'last-write-wins' : 'no-conflict',
  };
}

/**
 * Process all pending sync_queue entries for a user.
 * Applies each change to the target entity table using last-write-wins conflict resolution.
 */
export async function syncPendingItems(userId: string, ds: DataSource): Promise<SyncResult[]> {
  const syncRepo = ds.getRepository(SyncQueue);

  const pending = await syncRepo.find({
    where: { userId, status: 'pending' },
    order: { createdAt: 'ASC' },
    take: 100,
  });

  if (pending.length === 0) {
    return [];
  }

  // Mark all as processing in one update
  const pendingIds = pending.map((q) => q.id);
  await syncRepo
    .createQueryBuilder()
    .update()
    .set({ status: 'processing' })
    .whereInIds(pendingIds)
    .execute();

  const results: SyncResult[] = [];

  for (const queueItem of pending) {
    const result = await processSyncItem(queueItem, ds);
    results.push(result);

    await syncRepo.update(queueItem.id, {
      status: result.status,
      errorMessage: result.error ?? null,
      processedAt: new Date(),
      retryCount: result.status === 'failed' ? queueItem.retryCount + 1 : queueItem.retryCount,
    });
  }

  return results;
}

async function processSyncItem(queueItem: SyncQueue, ds: DataSource): Promise<SyncResult> {
  const base: Pick<SyncResult, 'id' | 'entityType' | 'entityId' | 'operation'> = {
    id: queueItem.id,
    entityType: queueItem.entityType,
    entityId: queueItem.entityId,
    operation: queueItem.operation,
  };

  try {
    switch (queueItem.entityType) {
      case 'item':
        return { ...base, ...(await applyItemChange(queueItem, ds)) };
      case 'operation':
        return { ...base, ...(await applyOperationChange(queueItem, ds)) };
      case 'group':
        return { ...base, ...(await applyGroupChange(queueItem, ds)) };
      default:
        return { ...base, status: 'failed', error: `Unknown entity type: ${queueItem.entityType}` };
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { ...base, status: 'failed', error: message };
  }
}

// Scalar-only update shapes (no relation objects) accepted by TypeORM update()
type ItemScalarUpdate = {
  name?: string;
  status?: ItemStatus;
  quantity?: number;
  unit?: string | null;
  description?: string | null;
  groupId?: string | null;
  donorId?: string | null;
  metadata?: Record<string, unknown> | null;
  isDeleted?: boolean;
};

type GroupScalarUpdate = {
  name?: string;
  parentId?: string | null;
};

async function applyItemChange(
  queueItem: SyncQueue,
  ds: DataSource,
): Promise<Pick<SyncResult, 'status' | 'conflict' | 'error'>> {
  const itemRepo = ds.getRepository(Item);

  if (queueItem.operation === 'insert') {
    const existing = await itemRepo.findOne({ where: { id: queueItem.entityId } });
    if (!existing) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await itemRepo.insert({ id: queueItem.entityId, ...(queueItem.payload as any) });
    }
    return { status: 'completed' };
  }

  const item = await itemRepo.findOne({ where: { id: queueItem.entityId } });
  if (!item) {
    return { status: 'failed', error: 'Item not found' };
  }

  if (queueItem.operation === 'delete') {
    await itemRepo.update(item.id, { isDeleted: true });
    return { status: 'completed' };
  }

  // update — apply last-write-wins
  const resolution = resolveConflicts(queueItem.clientVersion, item.version, queueItem.payload);
  const p = resolution.resolvedPayload;

  const updates: ItemScalarUpdate = {};
  if (p['name'] !== undefined) updates.name = p['name'] as string;
  if (p['status'] !== undefined) updates.status = p['status'] as ItemStatus;
  if (p['quantity'] !== undefined) updates.quantity = Number(p['quantity']);
  if (p['unit'] !== undefined) updates.unit = (p['unit'] as string | null) ?? null;
  if (p['description'] !== undefined) updates.description = (p['description'] as string | null) ?? null;
  if (p['groupId'] !== undefined) updates.groupId = (p['groupId'] as string | null) ?? null;
  if (p['donorId'] !== undefined) updates.donorId = (p['donorId'] as string | null) ?? null;
  if (p['metadata'] !== undefined) updates.metadata = (p['metadata'] as Record<string, unknown> | null) ?? null;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await itemRepo.update(item.id, updates as any);

  return {
    status: 'completed',
    conflict: {
      hasConflict: resolution.hasConflict,
      serverVersion: resolution.serverVersion,
      clientVersion: resolution.clientVersion,
      strategy: resolution.strategy,
    },
  };
}

async function applyOperationChange(
  queueItem: SyncQueue,
  ds: DataSource,
): Promise<Pick<SyncResult, 'status' | 'conflict' | 'error'>> {
  const opRepo = ds.getRepository(Operation);

  if (queueItem.operation !== 'insert') {
    return { status: 'failed', error: 'Operations are immutable — only insert is allowed' };
  }

  const existing = await opRepo.findOne({ where: { id: queueItem.entityId } });
  if (!existing) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await opRepo.insert({ id: queueItem.entityId, ...(queueItem.payload as any) });
  }

  return { status: 'completed' };
}

async function applyGroupChange(
  queueItem: SyncQueue,
  ds: DataSource,
): Promise<Pick<SyncResult, 'status' | 'conflict' | 'error'>> {
  const groupRepo = ds.getRepository(Group);

  if (queueItem.operation === 'insert') {
    const existing = await groupRepo.findOne({ where: { id: queueItem.entityId } });
    if (!existing) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await groupRepo.insert({ id: queueItem.entityId, ...(queueItem.payload as any) });
    }
    return { status: 'completed' };
  }

  const group = await groupRepo.findOne({ where: { id: queueItem.entityId } });
  if (!group) {
    return { status: 'failed', error: 'Group not found' };
  }

  if (queueItem.operation === 'delete') {
    await groupRepo.delete(group.id);
    return { status: 'completed' };
  }

  // Fetch version directly from DB since Group entity doesn't expose it
  const [row] = await ds.query<Array<{ version: number }>>(
    'SELECT version FROM item_groups WHERE id = $1',
    [queueItem.entityId],
  );
  const serverVersion: number = row?.version ?? 1;

  const resolution = resolveConflicts(queueItem.clientVersion, serverVersion, queueItem.payload);
  const p = resolution.resolvedPayload;

  const updates: GroupScalarUpdate = {};
  if (p['name'] !== undefined) updates.name = p['name'] as string;
  if (p['parentId'] !== undefined) updates.parentId = (p['parentId'] as string | null) ?? null;

  await groupRepo.update(group.id, updates);

  return {
    status: 'completed',
    conflict: {
      hasConflict: resolution.hasConflict,
      serverVersion: resolution.serverVersion,
      clientVersion: resolution.clientVersion,
      strategy: resolution.strategy,
    },
  };
}
