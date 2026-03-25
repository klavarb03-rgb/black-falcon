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
    return window.authAPI.setToken(token)
  },

  /** Decrypt and return the stored JWT token, or null if absent. */
  getToken(): Promise<string | null> {
    return window.authAPI.getToken()
  },

  /** Remove the stored JWT token from disk. */
  clearToken(): Promise<void> {
    return window.authAPI.clearToken()
  }
}
