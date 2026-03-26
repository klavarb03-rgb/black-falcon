/**
 * Group service — handles HTTP communication with the groups API.
 */

const BASE_URL = (import.meta.env.VITE_API_URL as string | undefined) ?? 'http://localhost:3000/api'

export interface Group {
  id: string
  name: string
  parentId: string | null
  level: number
  children: Group[]
  createdAt: string
  updatedAt: string
}

export interface CreateGroupInput {
  name: string
  parentId?: string | null
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

  // 204 No Content
  if (res.status === 204) return undefined as unknown as T

  return res.json() as Promise<T>
}

/** Build a nested tree from a flat array using parentId links. */
function buildTree(flat: Group[]): Group[] {
  const map = new Map<string, Group>()
  flat.forEach((g) => map.set(g.id, { ...g, children: [] }))
  const roots: Group[] = []
  for (const g of map.values()) {
    if (g.parentId) {
      const parent = map.get(g.parentId)
      if (parent) parent.children.push(g)
    } else {
      roots.push(g)
    }
  }
  return roots
}

export const groupService = {
  /** Fetch all groups as a nested tree (up to 4 levels). */
  async getGroups(token: string): Promise<Group[]> {
    const data = await request<Group[] | { data: Group[] }>('/groups/', {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` },
    })
    // Support both flat array and {data:[]} envelope
    const flat = Array.isArray(data) ? data : (data as { data: Group[] }).data
    // If backend already sends nested children, use as-is; otherwise build tree
    const alreadyNested = flat.length > 0 && Array.isArray(flat[0].children)
    return alreadyNested ? flat : buildTree(flat)
  },

  /** Create a new group. parentId=null creates a root group. */
  async createGroup(token: string, input: CreateGroupInput): Promise<Group> {
    return request<Group>('/groups/', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify(input),
    })
  },

  /** Rename an existing group. */
  async renameGroup(token: string, id: string, name: string): Promise<Group> {
    return request<Group>(`/groups/${id}`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({ name }),
    })
  },

  /** Delete a group (and its subtree). */
  async deleteGroup(token: string, id: string): Promise<void> {
    return request<void>(`/groups/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    })
  },

  /** Move a group to a new parent (drag-drop). Pass null to make it a root group. */
  async moveGroup(token: string, id: string, parentId: string | null): Promise<Group> {
    return request<Group>(`/groups/${id}/move`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({ parentId }),
    })
  },
}
