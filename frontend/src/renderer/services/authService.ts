/**
 * Auth service — handles all HTTP communication with the Black Falcon backend.
 *
 * Base URL is read from VITE_API_URL (set in .env / .env.local).
 * Falls back to http://localhost:3000/api for local development.
 */

const BASE_URL = (import.meta.env.VITE_API_URL as string | undefined) ?? 'http://localhost:3000/api'

export interface LoginCredentials {
  email: string
  password: string
}

export interface AuthUser {
  id: string
  email: string
  fullName: string
  role: 'superadmin' | 'admin' | 'manager'
}

export interface LoginResponse {
  token: string
  user: AuthUser
}

export interface ApiError {
  message: string
  statusCode: number
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
    const err: ApiError = { message, statusCode: res.status }
    throw err
  }

  return res.json() as Promise<T>
}

export const authService = {
  /**
   * Authenticate with email + password.
   * Returns a signed JWT and the authenticated user profile.
   */
  async login(credentials: LoginCredentials): Promise<LoginResponse> {
    return request<LoginResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        username: credentials.email, // Backend очікує username
        password: credentials.password
      })
    })
  },

  /**
   * Fetch the current user's profile using a bearer token.
   * Used on startup to restore session from stored JWT.
   */
  async me(token: string): Promise<AuthUser> {
    return request<AuthUser>('/auth/me', {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` }
    })
  }
}
