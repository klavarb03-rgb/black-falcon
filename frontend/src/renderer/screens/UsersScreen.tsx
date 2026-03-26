import React, { useEffect, useState, useCallback } from 'react'
import { UserPlus, Loader2, AlertCircle, Pencil, Trash2, CheckCircle2 } from 'lucide-react'

import { Button } from '@components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@components/ui/dialog'
import { Input } from '@components/ui/input'
import { Label } from '@components/ui/label'
import { cn } from '@lib/utils'
import { useAuthStore } from '@renderer/store/authStore'

// ── Types ──────────────────────────────────────────────────────────────────────

interface User {
  id: string
  fullName: string
  email: string
  role: 'manager' | 'admin' | 'superadmin'
  location?: string | null
  telegramId?: string | null
}

interface UserFormData {
  fullName: string
  email: string
  password: string
  role: 'manager' | 'admin'
  location: string
  telegramId: string
}

type NotificationType = 'success' | 'error'

interface Notification {
  type: NotificationType
  message: string
}

// ── API helpers ────────────────────────────────────────────────────────────────

const BASE_URL = (import.meta.env.VITE_API_URL as string | undefined) ?? 'http://localhost:3000/api'

async function fetchUsers(token: string): Promise<User[]> {
  const res = await fetch(`${BASE_URL}/users`, {
    headers: { Authorization: `Bearer ${token}` }
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const json = await res.json() as { data: User[] }
  return json.data ?? []
}

async function createUser(token: string, data: UserFormData): Promise<User> {
  const res = await fetch(`${BASE_URL}/users`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({
      fullName: data.fullName,
      email: data.email,
      password: data.password,
      role: data.role,
      location: data.location || undefined,
      telegramId: data.telegramId || undefined
    })
  })
  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: 'Невідома помилка' }))
    throw new Error(error.message ?? `HTTP ${res.status}`)
  }
  const json = await res.json() as { data: User }
  return json.data
}

async function updateUser(token: string, userId: string, data: Partial<UserFormData>): Promise<User> {
  const res = await fetch(`${BASE_URL}/users/${userId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({
      fullName: data.fullName,
      email: data.email,
      role: data.role,
      location: data.location || undefined,
      telegramId: data.telegramId || undefined
    })
  })
  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: 'Невідома помилка' }))
    throw new Error(error.message ?? `HTTP ${res.status}`)
  }
  const json = await res.json() as { data: User }
  return json.data
}

async function deleteUser(token: string, userId: string): Promise<void> {
  const res = await fetch(`${BASE_URL}/users/${userId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` }
  })
  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: 'Невідома помилка' }))
    throw new Error(error.message ?? `HTTP ${res.status}`)
  }
}

// ── Validation ─────────────────────────────────────────────────────────────────

function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

function validatePassword(password: string): boolean {
  return password.length >= 8
}

// ── Component ──────────────────────────────────────────────────────────────────

const ROLE_UA: Record<string, string> = {
  manager: 'Менеджер',
  admin: 'Адмін',
  superadmin: 'Суперадмін'
}

export function UsersScreen(): React.JSX.Element {
  const { token, user: currentUser } = useAuthStore()

  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [notification, setNotification] = useState<Notification | null>(null)

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [formData, setFormData] = useState<UserFormData>({
    fullName: '',
    email: '',
    password: '',
    role: 'manager',
    location: '',
    telegramId: ''
  })
  const [submitting, setSubmitting] = useState(false)

  // Confirm delete dialog
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [userToDelete, setUserToDelete] = useState<User | null>(null)
  const [deleting, setDeleting] = useState(false)

  const loadUsers = useCallback(async () => {
    if (!token) return
    setLoading(true)
    try {
      const data = await fetchUsers(token)
      setUsers(data)
    } catch (err) {
      setNotification({
        type: 'error',
        message: err instanceof Error ? err.message : 'Помилка завантаження користувачів'
      })
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => {
    loadUsers()
  }, [loadUsers])

  const handleOpenCreateModal = () => {
    setEditingUser(null)
    setFormData({
      fullName: '',
      email: '',
      password: '',
      role: 'manager',
      location: '',
      telegramId: ''
    })
    setIsModalOpen(true)
  }

  const handleOpenEditModal = (user: User) => {
    setEditingUser(user)
    setFormData({
      fullName: user.fullName,
      email: user.email,
      password: '', // password not editable in edit mode
      role: user.role === 'superadmin' ? 'admin' : user.role,
      location: user.location ?? '',
      telegramId: user.telegramId ?? ''
    })
    setIsModalOpen(true)
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
    setEditingUser(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!token) return

    // Validation
    if (!formData.fullName.trim() || !formData.email.trim()) {
      setNotification({ type: 'error', message: "ПІБ та Email є обов'язковими" })
      return
    }
    if (!validateEmail(formData.email)) {
      setNotification({ type: 'error', message: 'Невірний формат Email' })
      return
    }
    if (!editingUser && !validatePassword(formData.password)) {
      setNotification({ type: 'error', message: 'Пароль має бути не менше 8 символів' })
      return
    }

    setSubmitting(true)
    setNotification(null)

    try {
      if (editingUser) {
        await updateUser(token, editingUser.id, formData)
        setNotification({ type: 'success', message: 'Користувача оновлено успішно' })
      } else {
        await createUser(token, formData)
        setNotification({ type: 'success', message: 'Користувача додано успішно' })
      }
      handleCloseModal()
      loadUsers()
    } catch (err) {
      setNotification({
        type: 'error',
        message: err instanceof Error ? err.message : 'Помилка збереження користувача'
      })
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeleteClick = (user: User) => {
    setUserToDelete(user)
    setDeleteDialogOpen(true)
  }

  const handleConfirmDelete = async () => {
    if (!token || !userToDelete) return

    setDeleting(true)
    try {
      await deleteUser(token, userToDelete.id)
      setNotification({ type: 'success', message: 'Користувача видалено' })
      setDeleteDialogOpen(false)
      setUserToDelete(null)
      loadUsers()
    } catch (err) {
      setNotification({
        type: 'error',
        message: err instanceof Error ? err.message : 'Помилка видалення користувача'
      })
    } finally {
      setDeleting(false)
    }
  }

  // Only admin/superadmin can see this screen
  if (currentUser?.role !== 'admin' && currentUser?.role !== 'superadmin') {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-3">
        <AlertCircle className="w-10 h-10 opacity-30" />
        <p className="text-sm">Доступ заборонено. Тільки адміністратори можуть переглядати цю сторінку.</p>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Управління користувачами</h1>
          <p className="text-sm text-muted-foreground">Додавання, редагування та видалення користувачів</p>
        </div>
        <Button onClick={handleOpenCreateModal}>
          <UserPlus className="w-4 h-4 mr-2" />
          Додати користувача
        </Button>
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
              'border-green-500/30 bg-green-500/10 text-green-700 dark:text-green-400'
          )}
        >
          {notification.type === 'error' && <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />}
          {notification.type === 'success' && <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />}
          <span>{notification.message}</span>
        </div>
      )}

      {/* Table */}
      <Card>
        <CardHeader className="px-6 py-4">
          <CardTitle className="text-sm">Користувачі ({users.length})</CardTitle>
        </CardHeader>
        <CardContent className="px-0 pb-0">
          <div className="overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ПІБ</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Роль</TableHead>
                  <TableHead>Місто</TableHead>
                  <TableHead>Telegram ID</TableHead>
                  <TableHead className="text-right">Дії</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                      Немає користувачів
                    </TableCell>
                  </TableRow>
                ) : (
                  users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">{user.fullName}</TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>
                        <span
                          className={cn(
                            'inline-flex px-2 py-0.5 rounded text-xs font-medium',
                            user.role === 'superadmin' &&
                              'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300',
                            user.role === 'admin' &&
                              'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
                            user.role === 'manager' &&
                              'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300'
                          )}
                        >
                          {ROLE_UA[user.role] ?? user.role}
                        </span>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{user.location ?? '—'}</TableCell>
                      <TableCell className="text-muted-foreground">{user.telegramId ?? '—'}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleOpenEditModal(user)}
                            aria-label="Редагувати"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteClick(user)}
                            disabled={user.id === currentUser?.id}
                            aria-label="Видалити"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Create/Edit Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{editingUser ? 'Редагувати користувача' : 'Додати користувача'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="fullName">
                ПІБ <span className="text-destructive">*</span>
              </Label>
              <Input
                id="fullName"
                value={formData.fullName}
                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">
                Email <span className="text-destructive">*</span>
              </Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
              />
            </div>

            {!editingUser && (
              <div className="space-y-2">
                <Label htmlFor="password">
                  Пароль <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="password"
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="Мінімум 8 символів"
                  required
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="role">
                Роль <span className="text-destructive">*</span>
              </Label>
              <select
                id="role"
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value as 'manager' | 'admin' })}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                required
              >
                <option value="manager">Менеджер</option>
                <option value="admin">Адмін</option>
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="location">Місто</Label>
              <Input
                id="location"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                placeholder="Опціонально"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="telegramId">Telegram ID</Label>
              <Input
                id="telegramId"
                value={formData.telegramId}
                onChange={(e) => setFormData({ ...formData, telegramId: e.target.value })}
                placeholder="Опціонально"
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleCloseModal}>
                Скасувати
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {editingUser ? 'Зберегти' : 'Додати'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Видалити користувача?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Ви впевнені, що хочете видалити користувача <strong>{userToDelete?.fullName}</strong>? Цю дію
            не можна скасувати.
          </p>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Скасувати
            </Button>
            <Button type="button" variant="destructive" onClick={handleConfirmDelete} disabled={deleting}>
              {deleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Видалити
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
