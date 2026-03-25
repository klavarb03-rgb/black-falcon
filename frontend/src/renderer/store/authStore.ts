import { create } from 'zustand'
import { authService, type AuthUser, type ApiError } from '@renderer/services/authService'
import { secureStorage } from '@renderer/utils/secureStorage'

interface AuthState {
  user: AuthUser | null
  token: string | null
  isAuthenticated: boolean
  isLoading: boolean
  error: string | null
}

interface AuthActions {
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  /** Attempt to restore session from the encrypted token on disk. */
  restoreSession: () => Promise<void>
  clearError: () => void
}

export const useAuthStore = create<AuthState & AuthActions>()((set) => ({
  // ── State ──────────────────────────────────────────────────────────────────
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,

  // ── Actions ────────────────────────────────────────────────────────────────

  login: async (email, password) => {
    set({ isLoading: true, error: null })
    try {
      const { token, user } = await authService.login({ email, password })
      await secureStorage.setToken(token)
      set({ user, token, isAuthenticated: true, isLoading: false })
    } catch (err) {
      const message =
        (err as ApiError).message ?? 'Сталася невідома помилка. Спробуйте ще раз.'
      set({ isLoading: false, error: message })
      throw err
    }
  },

  logout: async () => {
    await secureStorage.clearToken()
    set({ user: null, token: null, isAuthenticated: false, error: null })
  },

  restoreSession: async () => {
    set({ isLoading: true })
    try {
      const token = await secureStorage.getToken()
      if (!token) {
        set({ isLoading: false })
        return
      }
      const user = await authService.me(token)
      set({ user, token, isAuthenticated: true, isLoading: false })
    } catch {
      // Token expired or invalid — clear it silently
      await secureStorage.clearToken()
      set({ user: null, token: null, isAuthenticated: false, isLoading: false })
    }
  },

  clearError: () => set({ error: null })
}))
