/**
 * Writeoff service — handles HTTP communication with the write-off API.
 */

const BASE_URL = (import.meta.env.VITE_API_URL as string | undefined) ?? 'http://localhost:3000/api'

export type WriteoffType = 'used' | 'lost'

export interface WriteoffInput {
  itemId: string
  quantity: number
  type: WriteoffType
  reason?: string
  donorId?: string
}

export interface WriteoffResponse {
  status: 'success'
  data: {
    id: string
    type: string
    itemId: string
    quantity: number
    reason: string | null
    donorId: string | null
    createdAt: string
  }
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

export const writeoffService = {
  async createWriteoff(token: string, input: WriteoffInput): Promise<WriteoffResponse> {
    return request<WriteoffResponse>('/operations/writeoff', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify(input)
    })
  }
}
