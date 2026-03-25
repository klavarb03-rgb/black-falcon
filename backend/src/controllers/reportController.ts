import { Request, Response, NextFunction } from 'express';
import { getDataSource } from '../database';

// GET /api/reports/inventory
// Inventory by user: item counts and quantities grouped by owner
export async function getInventoryReport(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const ds = await getDataSource();
    const { role, userId } = req.user!;
    const isManager = role === 'manager';

    const ownerFilter = isManager ? 'AND i.owner_id = $1' : '';
    const params: string[] = isManager ? [userId] : [];

    const rows = await ds.query<{
      user_id: string;
      username: string;
      full_name: string | null;
      item_count: string;
      total_quantity: string;
      government_quantity: string;
      volunteer_quantity: string;
    }[]>(
      `SELECT
         u.id                                                        AS user_id,
         u.username,
         u.full_name,
         COUNT(i.id)::int                                           AS item_count,
         COALESCE(SUM(i.quantity), 0)::int                          AS total_quantity,
         COALESCE(SUM(CASE WHEN i.status = 'government' THEN i.quantity ELSE 0 END), 0)::int AS government_quantity,
         COALESCE(SUM(CASE WHEN i.status = 'volunteer'  THEN i.quantity ELSE 0 END), 0)::int AS volunteer_quantity
       FROM users u
       LEFT JOIN items i ON i.owner_id = u.id AND i.is_deleted = false
       WHERE u.is_active = true
       ${ownerFilter}
       GROUP BY u.id, u.username, u.full_name
       ORDER BY u.username`,
      params,
    );

    const data = rows.map((r) => ({
      userId: r.user_id,
      username: r.username,
      fullName: r.full_name,
      itemCount: r.item_count,
      totalQuantity: r.total_quantity,
      byStatus: {
        government: r.government_quantity,
        volunteer: r.volunteer_quantity,
      },
    }));

    res.json({ status: 'success', data });
  } catch (err) {
    next(err);
  }
}

// GET /api/reports/operations
// Operations history with optional date range filter: ?from=YYYY-MM-DD&to=YYYY-MM-DD
export async function getOperationsReport(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const ds = await getDataSource();
    const { role, userId } = req.user!;
    const isManager = role === 'manager';

    const from = req.query['from'] as string | undefined;
    const to = req.query['to'] as string | undefined;
    const page = Math.max(1, parseInt((req.query['page'] as string) || '1', 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt((req.query['limit'] as string) || '50', 10) || 50));
    const offset = (page - 1) * limit;

    const params: (string | number)[] = [];
    const conditions: string[] = [];

    if (from) {
      params.push(from);
      conditions.push(`o.created_at >= $${params.length}::timestamptz`);
    }
    if (to) {
      params.push(to);
      conditions.push(`o.created_at < ($${params.length}::date + INTERVAL '1 day')`);
    }
    if (isManager) {
      params.push(userId);
      const p = `$${params.length}`;
      conditions.push(`(i.owner_id = ${p} OR o.from_user_id = ${p} OR o.to_user_id = ${p})`);
    }

    const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    // Count query
    const countRows = await ds.query<{ total: string }[]>(
      `SELECT COUNT(*)::int AS total
       FROM operations o
       LEFT JOIN items i ON o.item_id = i.id
       ${whereClause}`,
      params,
    );
    const total = parseInt(countRows[0]?.total ?? '0', 10);

    // Data query
    params.push(limit, offset);
    const rows = await ds.query<{
      id: string;
      type: string;
      quantity_delta: number;
      notes: string | null;
      created_at: string;
      item_id: string;
      item_name: string;
      from_user_id: string | null;
      from_username: string | null;
      to_user_id: string | null;
      to_username: string | null;
      created_by_id: string;
      created_by_username: string;
    }[]>(
      `SELECT
         o.id,
         o.type,
         o.quantity_delta,
         o.notes,
         o.created_at,
         i.id          AS item_id,
         i.name        AS item_name,
         fu.id         AS from_user_id,
         fu.username   AS from_username,
         tu.id         AS to_user_id,
         tu.username   AS to_username,
         cu.id         AS created_by_id,
         cu.username   AS created_by_username
       FROM operations o
       LEFT JOIN items i  ON o.item_id       = i.id
       LEFT JOIN users fu ON o.from_user_id  = fu.id
       LEFT JOIN users tu ON o.to_user_id    = tu.id
       LEFT JOIN users cu ON o.created_by_id = cu.id
       ${whereClause}
       ORDER BY o.created_at DESC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params,
    );

    const data = rows.map((r) => ({
      id: r.id,
      type: r.type,
      quantityDelta: r.quantity_delta,
      notes: r.notes,
      createdAt: r.created_at,
      item: { id: r.item_id, name: r.item_name },
      fromUser: r.from_user_id ? { id: r.from_user_id, username: r.from_username } : null,
      toUser: r.to_user_id ? { id: r.to_user_id, username: r.to_username } : null,
      createdBy: { id: r.created_by_id, username: r.created_by_username },
    }));

    res.json({
      status: 'success',
      data,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    next(err);
  }
}

// GET /api/reports/summary
// Aggregated totals: overall, by status, by group/category
export async function getSummaryReport(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const ds = await getDataSource();
    const { role, userId } = req.user!;
    const isManager = role === 'manager';

    const ownerParam = isManager ? [userId] : [];
    const ownerCondition = isManager ? 'AND owner_id = $1' : '';
    const joinOwnerCondition = isManager ? `AND i.owner_id = $1` : '';

    // Overall totals
    const [totalsRow] = await ds.query<{
      total_items: string;
      total_quantity: string;
      government_items: string;
      government_quantity: string;
      volunteer_items: string;
      volunteer_quantity: string;
    }[]>(
      `SELECT
         COUNT(*)::int                                                                   AS total_items,
         COALESCE(SUM(quantity), 0)::int                                                AS total_quantity,
         COUNT(*) FILTER (WHERE status = 'government')::int                             AS government_items,
         COALESCE(SUM(quantity) FILTER (WHERE status = 'government'), 0)::int           AS government_quantity,
         COUNT(*) FILTER (WHERE status = 'volunteer')::int                              AS volunteer_items,
         COALESCE(SUM(quantity) FILTER (WHERE status = 'volunteer'), 0)::int            AS volunteer_quantity
       FROM items
       WHERE is_deleted = false
       ${ownerCondition}`,
      ownerParam,
    );

    // By category (item_groups)
    const byCategory = await ds.query<{
      group_id: string | null;
      group_name: string | null;
      item_count: string;
      total_quantity: string;
    }[]>(
      `SELECT
         g.id   AS group_id,
         g.name AS group_name,
         COUNT(i.id)::int                      AS item_count,
         COALESCE(SUM(i.quantity), 0)::int     AS total_quantity
       FROM item_groups g
       LEFT JOIN items i ON i.group_id = g.id AND i.is_deleted = false ${joinOwnerCondition}
       GROUP BY g.id, g.name
       UNION ALL
       SELECT
         NULL  AS group_id,
         NULL  AS group_name,
         COUNT(*)::int                         AS item_count,
         COALESCE(SUM(quantity), 0)::int       AS total_quantity
       FROM items
       WHERE is_deleted = false AND group_id IS NULL
       ${ownerCondition}
       ORDER BY group_name NULLS LAST`,
      ownerParam,
    );

    res.json({
      status: 'success',
      data: {
        totals: {
          items: totalsRow?.total_items ?? 0,
          quantity: totalsRow?.total_quantity ?? 0,
        },
        byStatus: {
          government: {
            items: totalsRow?.government_items ?? 0,
            quantity: totalsRow?.government_quantity ?? 0,
          },
          volunteer: {
            items: totalsRow?.volunteer_items ?? 0,
            quantity: totalsRow?.volunteer_quantity ?? 0,
          },
        },
        byCategory: byCategory.map((r) => ({
          groupId: r.group_id,
          groupName: r.group_name ?? '(ungrouped)',
          itemCount: r.item_count,
          totalQuantity: r.total_quantity,
        })),
      },
    });
  } catch (err) {
    next(err);
  }
}
