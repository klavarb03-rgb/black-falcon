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
  operations: Operation[]
  total: number
  byType: { type: string; count: number }[]
  byDay: { date: string; count: number }[]
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

// ── Helpers ────────────────────────────────────────────────────────────────────

function groupByStatus(items: InventoryItem[]) {
  const map = new Map<string, { count: number; quantity: number }>()
  for (const item of items) {
    const key = item.status
    const existing = map.get(key) ?? { count: 0, quantity: 0 }
    map.set(key, { count: existing.count + 1, quantity: existing.quantity + item.quantity })
  }
  return Array.from(map.entries()).map(([status, v]) => ({ status, ...v }))
}

function groupByType(ops: Operation[]) {
  const map = new Map<string, number>()
  for (const op of ops) {
    map.set(op.type, (map.get(op.type) ?? 0) + 1)
  }
  return Array.from(map.entries()).map(([type, count]) => ({ type, count }))
}

function groupByDay(ops: Operation[]): { date: string; count: number }[] {
  const map = new Map<string, number>()
  for (const op of ops) {
    const date = op.createdAt.slice(0, 10)
    map.set(date, (map.get(date) ?? 0) + 1)
  }
  return Array.from(map.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([date, count]) => ({ date, count }))
}

// ── Service ────────────────────────────────────────────────────────────────────

export const reportService = {
  async getInventoryReport(token: string): Promise<InventoryReport> {
    const res = await request<{ status: string; data: InventoryItem[]; pagination: { total: number } }>(
      '/items/?page=1&limit=1000',
      token
    )
    const items = res.data
    return {
      items,
      total: res.pagination.total,
      byStatus: groupByStatus(items),
    }
  },

  async getOperationsReport(
    token: string,
    dateFrom: string,
    dateTo: string
  ): Promise<OperationsReport> {
    const params = new URLSearchParams({ dateFrom, dateTo, limit: '500' })
    let operations: Operation[] = []
    try {
      const res = await request<{ status: string; data: Operation[] }>(
        `/operations?${params.toString()}`,
        token
      )
      operations = res.data ?? []
    } catch {
      // endpoint may not be implemented yet — return empty
      operations = []
    }
    return {
      operations,
      total: operations.length,
      byType: groupByType(operations),
      byDay: groupByDay(operations),
    }
  },

  async getSummaryReport(token: string, dateFrom: string, dateTo: string): Promise<SummaryReport> {
    const [inv, ops] = await Promise.all([
      reportService.getInventoryReport(token),
      reportService.getOperationsReport(token, dateFrom, dateTo),
    ])

    const govCount = inv.items.filter((i) => i.status === 'government').length
    const volCount = inv.items.filter((i) => i.status === 'volunteer').length
    const totalQty = inv.items.reduce((s, i) => s + i.quantity, 0)

    return {
      totalItems: inv.total,
      totalQuantity: totalQty,
      governmentItems: govCount,
      volunteerItems: volCount,
      totalOperations: ops.total,
      operationsByType: ops.byType,
      itemsByStatus: [
        { name: 'Держ.', value: govCount },
        { name: 'Волонт.', value: volCount },
      ],
      activityByDay: ops.byDay.map((d) => ({ date: d.date, операції: d.count })),
    }
  },
}
