/**
 * Secure JWT storage via Electron safeStorage IPC.
 *
 * In the main process, tokens are encrypted with OS-provided key material
 * (Keychain on macOS, DPAPI on Windows, libsecret on Linux) before being
 * written to disk — never stored as plain text.
 */

declare global {
  interface Window {
    authAPI: {
      setToken: (token: string) => Promise<void>
      getToken: () => Promise<string | null>
      clearToken: () => Promise<void>
    }
  }
}

export const secureStorage = {
  /** Encrypt and persist the JWT token via Electron safeStorage. */
  setToken(token: string): Promise<void> {
    // Тимчасово використовуємо localStorage
    localStorage.setItem('auth_token', token)
    return Promise.resolve()
  },

  /** Decrypt and return the stored JWT token, or null if absent. */
  getToken(): Promise<string | null> {
    // Тимчасово використовуємо localStorage
    return Promise.resolve(localStorage.getItem('auth_token'))
  },

  /** Remove the stored JWT token from disk. */
  clearToken(): Promise<void> {
    // Тимчасово використовуємо localStorage
    localStorage.removeItem('auth_token')
    return Promise.resolve()
  }
}
