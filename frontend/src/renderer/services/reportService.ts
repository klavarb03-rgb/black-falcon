/**
 * Report service — fetches data for inventory, operations and summary reports.
 */

const BASE_URL = (import.meta.env.VITE_API_URL as string | undefined) ?? 'http://localhost:3000/api'

// ── Types ──────────────────────────────────────────────────────────────────────

export type ReportType = 'inventory' | 'operations' | 'summary'

export interface InventoryItem {
  id: string
  name: string
  status: 'government' | 'volunteer'
  quantity: number
  unit: string | null
  createdAt: string
  updatedAt: string
}

export interface Operation {
  id: string
  type: string
  itemId: string
  itemName?: string
  quantity: number
  reason: string | null
  createdAt: string
  performedBy?: string
}

export interface InventoryReport {
  items: InventoryItem[]
  total: number
  byStatus: { status: string; count: number; quantity: number }[]
}

export interface OperationsReport {
  operations: { id: string; type: string; createdAt: string }[]
  total: number
  byType: { type: string; count: number }[]
  byDay: { date: string; count: number }[]
}

export interface CategoryStat {
  groupId: string | null
  groupName: string
  itemCount: number
  totalQuantity: number
}

export interface SummaryReport {
  totalItems: number
  totalQuantity: number
  governmentItems: number
  volunteerItems: number
  totalOperations: number
  operationsByType: { type: string; count: number }[]
  itemsByStatus: { name: string; value: number }[]
  activityByDay: { date: string; операції: number }[]
  byCategory: CategoryStat[]
}

// ── HTTP helper ────────────────────────────────────────────────────────────────

async function request<T>(path: string, token: string): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  })

  if (!res.ok) {
    let message = `HTTP ${res.status}`
    try {
      const body = (await res.json()) as { message?: string }
      if (body.message) message = body.message
    } catch {
      // ignore JSON parse errors
    }
    throw new Error(message)
  }

  return res.json() as Promise<T>
}

// ── Service ────────────────────────────────────────────────────────────────────

export const reportService = {
  async getInventoryReport(token: string): Promise<InventoryReport> {
    const res = await request<{ status: string; data: InventoryItem[]; pagination: { total: number } }>(
      '/items/?page=1&limit=1000',
      token
    )
    const items = res.data
    const map = new Map<string, { count: number; quantity: number }>()
    for (const item of items) {
      const existing = map.get(item.status) ?? { count: 0, quantity: 0 }
      map.set(item.status, { count: existing.count + 1, quantity: existing.quantity + item.quantity })
    }
    return {
      items,
      total: res.pagination.total,
      byStatus: Array.from(map.entries()).map(([status, v]) => ({ status, ...v })),
    }
  },

  async getOperationsReport(
    token: string,
    dateFrom: string,
    dateTo: string
  ): Promise<OperationsReport> {
    const params = new URLSearchParams({ from: dateFrom, to: dateTo, limit: '500' })
    let rows: { id: string; type: string; createdAt: string }[] = []
    let total = 0
    try {
      const res = await request<{
        status: string
        data: { id: string; type: string; createdAt: string }[]
        pagination: { total: number }
      }>(`/reports/operations?${params.toString()}`, token)
      rows = res.data ?? []
      total = res.pagination?.total ?? rows.length
    } catch {
      rows = []
      total = 0
    }

    // group by type
    const typeMap = new Map<string, number>()
    for (const op of rows) typeMap.set(op.type, (typeMap.get(op.type) ?? 0) + 1)
    const byType = Array.from(typeMap.entries()).map(([type, count]) => ({ type, count }))

    // group by day
    const dayMap = new Map<string, number>()
    for (const op of rows) {
      const date = op.createdAt.slice(0, 10)
      dayMap.set(date, (dayMap.get(date) ?? 0) + 1)
    }
    const byDay = Array.from(dayMap.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([date, count]) => ({ date, count }))

    return { operations: rows, total, byType, byDay }
  },

  async getSummaryReport(token: string, dateFrom: string, dateTo: string): Promise<SummaryReport> {
    // Fetch summary totals and operations activity in parallel
    const [summaryRes, ops] = await Promise.all([
      request<{
        status: string
        data: {
          totals: { items: number; quantity: number }
          byStatus: {
            government: { items: number; quantity: number }
            volunteer: { items: number; quantity: number }
          }
          byCategory: { groupId: string | null; groupName: string; itemCount: number; totalQuantity: number }[]
        }
      }>('/reports/summary', token),
      reportService.getOperationsReport(token, dateFrom, dateTo),
    ])

    const { totals, byStatus, byCategory } = summaryRes.data

    return {
      totalItems: totals.items,
      totalQuantity: totals.quantity,
      governmentItems: byStatus.government.items,
      volunteerItems: byStatus.volunteer.items,
      totalOperations: ops.total,
      operationsByType: ops.byType,
      itemsByStatus: [
        { name: 'Держ.', value: byStatus.government.items },
        { name: 'Волонт.', value: byStatus.volunteer.items },
      ],
      activityByDay: ops.byDay.map((d) => ({ date: d.date, операції: d.count })),
      byCategory,
    }
  },
}
