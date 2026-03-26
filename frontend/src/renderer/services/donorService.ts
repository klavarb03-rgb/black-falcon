/**
 * Donor service — handles HTTP communication with the donors API.
 */

const BASE_URL = (import.meta.env.VITE_API_URL as string | undefined) ?? 'http://localhost:3000/api'

export interface Donor {
  id: string
  name: string
  description: string | null
  contactInfo: string | null
  createdAt: string
  updatedAt: string
}

export interface CreateDonorInput {
  name: string
  description?: string | null
  contactInfo?: string | null
}

export interface UpdateDonorInput {
  name?: string
  description?: string | null
  contactInfo?: string | null
}

async function request<T>(path: string, init: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json', ...init.headers },
    ...init,
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

  if (res.status === 204) return undefined as unknown as T

  return res.json() as Promise<T>
}

export interface PaginatedDonorsResponse {
  data: Donor[]
  meta: {
    total: number
    page: number
    limit: number
    totalPages: number
  }
}

export const donorService = {
  async getDonors(token: string, page = 1, limit = 20): Promise<PaginatedDonorsResponse> {
    return request<PaginatedDonorsResponse>(`/donors?page=${page}&limit=${limit}`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` },
    })
  },

  async createDonor(token: string, input: CreateDonorInput): Promise<Donor> {
    return request<Donor>('/donors', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify(input),
    })
  },

  async updateDonor(token: string, id: string, input: UpdateDonorInput): Promise<Donor> {
    return request<Donor>(`/donors/${id}`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify(input),
    })
  },

  async deleteDonor(token: string, id: string): Promise<void> {
    return request<void>(`/donors/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    })
  },
}
