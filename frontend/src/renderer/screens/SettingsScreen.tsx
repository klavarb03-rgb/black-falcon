import React, { useEffect, useState } from 'react'
import {
  Settings as SettingsIcon,
  User,
  Building2,
  RefreshCw,
  Database,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Save
} from 'lucide-react'

import { Button } from '@components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@components/ui/card'
import { Input } from '@components/ui/input'
import { Label } from '@components/ui/label'
import { cn } from '@lib/utils'
import { useAuthStore } from '@renderer/store/authStore'

// ── Types ──────────────────────────────────────────────────────────────────────

interface SystemSettings {
  organizationName?: string
  logoUrl?: string
  timezone?: string
  syncIntervalMinutes?: number
  offlineModeEnabled?: boolean
  lastBackupDate?: string | null
}

type NotificationType = 'success' | 'error' | 'info'

interface Notification {
  type: NotificationType
  message: string
}

// ── API helpers (TODO: implement backend endpoints) ────────────────────────────

const BASE_URL = (import.meta.env.VITE_API_URL as string | undefined) ?? 'http://localhost:3000/api'

async function changePassword(
  token: string,
  oldPassword: string,
  newPassword: string
): Promise<void> {
  // TODO: Implement backend endpoint
  const res = await fetch(`${BASE_URL}/users/me/password`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({ oldPassword, newPassword })
  })
  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: 'Невідома помилка' }))
    throw new Error(error.message ?? `HTTP ${res.status}`)
  }
}

async function fetchSettings(token: string): Promise<SystemSettings> {
  // TODO: Implement backend endpoint
  try {
    const res = await fetch(`${BASE_URL}/settings`, {
      headers: { Authorization: `Bearer ${token}` }
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const json = await res.json() as { data: SystemSettings }
    return json.data ?? {}
  } catch {
    // Return defaults if endpoint doesn't exist yet
    return {
      organizationName: 'Black Falcon',
      timezone: 'Europe/Kiev',
      syncIntervalMinutes: 15,
      offlineModeEnabled: true,
      lastBackupDate: null
    }
  }
}

async function updateSettings(token: string, settings: Partial<SystemSettings>): Promise<void> {
  // TODO: Implement backend endpoint
  const res = await fetch(`${BASE_URL}/settings`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(settings)
  })
  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: 'Невідома помилка' }))
    throw new Error(error.message ?? `HTTP ${res.status}`)
  }
}

async function createBackup(token: string): Promise<void> {
  // TODO: Implement backend endpoint
  const res = await fetch(`${BASE_URL}/settings/backup`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` }
  })
  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: 'Невідома помилка' }))
    throw new Error(error.message ?? `HTTP ${res.status}`)
  }
}

// ── Validation ─────────────────────────────────────────────────────────────────

function validatePassword(password: string): boolean {
  return password.length >= 8
}

// ── Component ──────────────────────────────────────────────────────────────────

type ActiveSection = 'profile' | 'system' | 'sync' | 'backup'

export function SettingsScreen(): React.JSX.Element {
  const { token, user } = useAuthStore()

  const [loading, setLoading] = useState(true)
  const [notification, setNotification] = useState<Notification | null>(null)
  const [activeSection, setActiveSection] = useState<ActiveSection>('profile')

  // Profile section
  const [oldPassword, setOldPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [changingPassword, setChangingPassword] = useState(false)

  // System settings
  const [settings, setSettings] = useState<SystemSettings>({})
  const [savingSettings, setSavingSettings] = useState(false)

  // Backup
  const [creatingBackup, setCreatingBackup] = useState(false)

  useEffect(() => {
    if (!token) return
    fetchSettings(token)
      .then(setSettings)
      .catch(() => {
        // Silently use defaults
      })
      .finally(() => setLoading(false))
  }, [token])

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!token) return

    if (!validatePassword(newPassword)) {
      setNotification({ type: 'error', message: 'Новий пароль має бути не менше 8 символів' })
      return
    }
    if (newPassword !== confirmPassword) {
      setNotification({ type: 'error', message: 'Паролі не співпадають' })
      return
    }

    setChangingPassword(true)
    setNotification(null)

    try {
      await changePassword(token, oldPassword, newPassword)
      setNotification({ type: 'success', message: 'Пароль успішно змінено' })
      setOldPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (err) {
      setNotification({
        type: 'error',
        message: err instanceof Error ? err.message : 'Помилка зміни паролю'
      })
    } finally {
      setChangingPassword(false)
    }
  }

  const handleSaveSettings = async () => {
    if (!token) return

    setSavingSettings(true)
    setNotification(null)

    try {
      await updateSettings(token, settings)
      setNotification({ type: 'success', message: 'Налаштування збережено' })
    } catch (err) {
      setNotification({
        type: 'error',
        message: err instanceof Error ? err.message : 'Помилка збереження налаштувань'
      })
    } finally {
      setSavingSettings(false)
    }
  }

  const handleCreateBackup = async () => {
    if (!token) return

    setCreatingBackup(true)
    setNotification(null)

    try {
      await createBackup(token)
      setNotification({ type: 'success', message: 'Резервну копію створено успішно' })
      // Reload settings to get updated lastBackupDate
      const updated = await fetchSettings(token)
      setSettings(updated)
    } catch (err) {
      setNotification({
        type: 'error',
        message: err instanceof Error ? err.message : 'Помилка створення backup'
      })
    } finally {
      setCreatingBackup(false)
    }
  }

  const isAdmin = user?.role === 'admin' || user?.role === 'superadmin'

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
          <SettingsIcon className="h-6 w-6" />
          Налаштування
        </h1>
        <p className="text-sm text-muted-foreground">Керування профілем та системними налаштуваннями</p>
      </div>

      {/* Notification */}
      {notification && (
        <div
          role="alert"
          className={cn(
            'flex items-start gap-3 rounded-md border px-4 py-3 text-sm',
            notification.type === 'error' &&
              'border-destructive/30 bg-destructive/10 text-destructive',
            notification.type === 'success' &&
              'border-green-500/30 bg-green-500/10 text-green-700 dark:text-green-400',
            notification.type === 'info' &&
              'border-blue-500/30 bg-blue-500/10 text-blue-700 dark:text-blue-400'
          )}
        >
          {notification.type === 'error' && <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />}
          {notification.type === 'success' && <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />}
          {notification.type === 'info' && <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />}
          <span>{notification.message}</span>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 border-b pb-2">
        <button
          onClick={() => setActiveSection('profile')}
          className={cn(
            'flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors',
            activeSection === 'profile'
              ? 'bg-primary text-primary-foreground'
              : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
          )}
        >
          <User className="w-4 h-4" />
          Профіль
        </button>
        {isAdmin && (
          <>
            <button
              onClick={() => setActiveSection('system')}
              className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors',
                activeSection === 'system'
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
              )}
            >
              <Building2 className="w-4 h-4" />
              Система
            </button>
            <button
              onClick={() => setActiveSection('sync')}
              className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors',
                activeSection === 'sync'
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
              )}
            >
              <RefreshCw className="w-4 h-4" />
              Синхронізація
            </button>
            <button
              onClick={() => setActiveSection('backup')}
              className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors',
                activeSection === 'backup'
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
              )}
            >
              <Database className="w-4 h-4" />
              Backup
            </button>
          </>
        )}
      </div>

      {/* Profile Section */}
      {activeSection === 'profile' && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Профіль користувача</CardTitle>
              <CardDescription>Інформація про ваш акаунт</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>ПІБ</Label>
                <Input value={user?.fullName ?? ''} disabled />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input value={user?.email ?? ''} disabled />
              </div>
              <div className="space-y-2">
                <Label>Роль</Label>
                <Input value={user?.role ?? ''} disabled />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Змінити пароль</CardTitle>
              <CardDescription>Введіть старий та новий пароль</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleChangePassword} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="oldPassword">
                    Старий пароль <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="oldPassword"
                    type="password"
                    value={oldPassword}
                    onChange={(e) => setOldPassword(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="newPassword">
                    Новий пароль <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="newPassword"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Мінімум 8 символів"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">
                    Підтвердити пароль <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                  />
                </div>
                <Button type="submit" disabled={changingPassword}>
                  {changingPassword && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Змінити пароль
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {/* System Section */}
      {activeSection === 'system' && isAdmin && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Системні налаштування</CardTitle>
            <CardDescription>Загальні параметри системи</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="orgName">Назва організації</Label>
              <Input
                id="orgName"
                value={settings.organizationName ?? ''}
                onChange={(e) => setSettings({ ...settings, organizationName: e.target.value })}
                placeholder="Black Falcon"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="logoUrl">Логотип (URL)</Label>
              <Input
                id="logoUrl"
                type="url"
                value={settings.logoUrl ?? ''}
                onChange={(e) => setSettings({ ...settings, logoUrl: e.target.value })}
                placeholder="https://example.com/logo.png"
              />
              <p className="text-xs text-muted-foreground">
                TODO: Додати функцію завантаження файлу
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="timezone">Часовий пояс</Label>
              <select
                id="timezone"
                value={settings.timezone ?? 'Europe/Kiev'}
                onChange={(e) => setSettings({ ...settings, timezone: e.target.value })}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="Europe/Kiev">Europe/Kiev (GMT+2)</option>
                <option value="Europe/London">Europe/London (GMT+0)</option>
                <option value="America/New_York">America/New_York (GMT-5)</option>
                <option value="Asia/Tokyo">Asia/Tokyo (GMT+9)</option>
              </select>
            </div>
            <Button onClick={handleSaveSettings} disabled={savingSettings}>
              {savingSettings && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              <Save className="mr-2 h-4 w-4" />
              Зберегти
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Sync Section */}
      {activeSection === 'sync' && isAdmin && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Синхронізація</CardTitle>
            <CardDescription>Налаштування автоматичної синхронізації</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="syncInterval">
                Інтервал автосинхронізації (хвилин): {settings.syncIntervalMinutes ?? 15}
              </Label>
              <input
                id="syncInterval"
                type="range"
                min={5}
                max={60}
                step={5}
                value={settings.syncIntervalMinutes ?? 15}
                onChange={(e) =>
                  setSettings({ ...settings, syncIntervalMinutes: Number(e.target.value) })
                }
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>5 хв</span>
                <span>60 хв</span>
              </div>
            </div>
            <div className="flex items-center justify-between p-4 border rounded-md">
              <div>
                <p className="font-medium">Увімкнути офлайн режим</p>
                <p className="text-sm text-muted-foreground">
                  Дозволити роботу без підключення до інтернету
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={settings.offlineModeEnabled ?? false}
                onClick={() =>
                  setSettings({ ...settings, offlineModeEnabled: !settings.offlineModeEnabled })
                }
                className={cn(
                  'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
                  settings.offlineModeEnabled ? 'bg-primary' : 'bg-gray-300 dark:bg-gray-600'
                )}
              >
                <span
                  className={cn(
                    'inline-block h-4 w-4 transform rounded-full bg-white transition-transform',
                    settings.offlineModeEnabled ? 'translate-x-6' : 'translate-x-1'
                  )}
                />
              </button>
            </div>
            <Button onClick={handleSaveSettings} disabled={savingSettings}>
              {savingSettings && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              <Save className="mr-2 h-4 w-4" />
              Зберегти
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Backup Section */}
      {activeSection === 'backup' && isAdmin && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Резервне копіювання</CardTitle>
            <CardDescription>Створення та відновлення backup</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 border rounded-md bg-muted/50">
              <p className="text-sm font-medium">Остання резервна копія</p>
              <p className="text-2xl font-bold mt-1">
                {settings.lastBackupDate
                  ? new Date(settings.lastBackupDate).toLocaleString('uk-UA')
                  : 'Ніколи'}
              </p>
            </div>
            <Button onClick={handleCreateBackup} disabled={creatingBackup}>
              {creatingBackup && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              <Database className="mr-2 h-4 w-4" />
              Створити backup зараз
            </Button>
            <p className="text-xs text-muted-foreground">
              TODO: Додати функцію завантаження/відновлення backup
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
