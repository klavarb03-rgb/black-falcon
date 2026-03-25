/**
 * Item service — handles HTTP communication with the items API.
 */

const BASE_URL = (import.meta.env.VITE_API_URL as string | undefined) ?? 'http://localhost:3000/api'

export type ItemStatus = 'government' | 'volunteer'

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

export const itemService = {
  /**
   * Fetch a page of items. Defaults to a large limit so all items
   * are available for client-side filtering and pagination.
   */
  async getItems(token: string, page = 1, limit = 500): Promise<ItemsResponse> {
    return request<ItemsResponse>(`/items/?page=${page}&limit=${limit}`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` }
    })
  }
}
