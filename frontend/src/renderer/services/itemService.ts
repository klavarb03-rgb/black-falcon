/**
 * Item service — handles HTTP communication with the items API.
 */

const BASE_URL = (import.meta.env.VITE_API_URL as string | undefined) ?? 'http://localhost:3000/api'

export type ItemStatus = 'government' | 'volunteer'
export type BalanceStatus = 'off_balance' | 'on_balance'

export interface Item {
  id: string
  name: string
  description: string | null
  status: ItemStatus
  quantity: number
  unit: string | null
  ownerId: string
  groupId: string | null
  donorId: string | null
  createdAt: string
  updatedAt: string
  balance_status?: BalanceStatus
  document_number?: string
  document_date?: string
  supplier_name?: string
}

export interface Pagination {
  page: number
  limit: number
  total: number
  pages: number
}

export interface ItemsResponse {
  status: 'success'
  data: Item[]
  pagination: Pagination
}

async function request<T>(path: string, init: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json', ...init.headers },
    ...init
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

export interface TransferToBalanceInput {
  document_number: string
  document_date: string
  supplier_name: string
}

export const itemService = {
  /**
   * Fetch a page of items. Defaults to a large limit so all items
   * are available for client-side filtering and pagination.
   * Optionally filter by balance_status on the server if supported,
   * otherwise filtering is handled client-side.
   */
  async getItems(
    token: string,
    page = 1,
    limit = 500,
    balanceStatus?: 'off_balance' | 'on_balance' | 'all'
  ): Promise<ItemsResponse> {
    const params = new URLSearchParams({ page: String(page), limit: String(limit) })
    if (balanceStatus && balanceStatus !== 'all') {
      params.set('balance_status', balanceStatus)
    }
    return request<ItemsResponse>(`/items/?${params.toString()}`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` }
    })
  },

  /**
   * Transfer an off-balance item to on-balance by providing document details.
   * Calls PATCH /items/:id/transfer-to-balance
   */
  async transferToBalance(
    token: string,
    itemId: string,
    data: TransferToBalanceInput
  ): Promise<{ status: string; data: Item }> {
    return request<{ status: string; data: Item }>(
      `/items/${itemId}/transfer-to-balance`,
      {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify(data)
      }
    )
  }
}
