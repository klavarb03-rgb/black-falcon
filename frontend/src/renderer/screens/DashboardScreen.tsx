import React from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@components/ui/card'
import { useAuthStore } from '@renderer/store/authStore'
import {
  Package,
  ArrowLeftRight,
  Trash2,
  PlusCircle,
  Box,
  Clock,
  TrendingUp,
  Layers,
} from 'lucide-react'

const roleLabels: Record<string, string> = {
  superadmin: 'Суперадміністратор',
  admin: 'Адміністратор',
  manager: 'Менеджер',
}

interface DashboardScreenProps {
  onNavigate?: (page: string) => void
}

export function DashboardScreen({ onNavigate }: DashboardScreenProps) {
  const { user } = useAuthStore()

  const stats = [
    {
      label: 'Всього МЦ',
      value: '—',
      description: 'Позицій в інвентарі',
      icon: Package,
    },
    {
      label: 'Операцій сьогодні',
      value: '—',
      description: 'Передачі та списання',
      icon: TrendingUp,
    },
    {
      label: 'Останні 7 днів',
      value: '—',
      description: 'Загальна активність',
      icon: Clock,
    },
    {
      label: 'Комплекти',
      value: '—',
      description: 'Активних комплектів',
      icon: Box,
    },
  ]

  const quickActions = [
    {
      label: 'Передача МЦ',
      description: 'Передати майно між підрозділами',
      icon: ArrowLeftRight,
      page: 'transfer',
    },
    {
      label: 'Списання',
      description: 'Списати матеріальні цінності',
      icon: Trash2,
      page: 'writeoff',
    },
    {
      label: 'Додати МЦ',
      description: 'Зареєструвати нові позиції',
      icon: PlusCircle,
      page: 'items',
    },
    {
      label: 'Групи МЦ',
      description: 'Переглянути групи позицій',
      icon: Layers,
      page: 'groups',
    },
  ]

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <div>
        <h2 className="text-xl font-semibold">
          Вітаємо, {user?.fullName ?? 'Користувач'}
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          {roleLabels[user?.role ?? ''] ?? user?.role} · Огляд системи
        </p>
      </div>

      {/* Stats cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon
          return (
            <Card key={stat.label}>
              <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
                <CardDescription>{stat.label}</CardDescription>
                <Icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
                <p className="text-xs text-muted-foreground mt-1">{stat.description}</p>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Quick actions */}
      <div>
        <h3 className="text-sm font-medium text-muted-foreground mb-3">Швидкі дії</h3>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {quickActions.map((action) => {
            const Icon = action.icon
            return (
              <button
                key={action.label}
                onClick={() => onNavigate?.(action.page)}
                className="flex flex-col items-start gap-1.5 rounded-lg border border-border bg-card p-4 text-left transition-colors hover:bg-accent/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <div className="flex items-center gap-2">
                  <Icon className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium">{action.label}</span>
                </div>
                <p className="text-xs text-muted-foreground">{action.description}</p>
              </button>
            )
          })}
        </div>
      </div>

      {/* Recent operations */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Останні операції</CardTitle>
          <CardDescription>Нещодавні передачі та списання МЦ</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Clock className="h-8 w-8 text-muted-foreground/40 mb-3" />
            <p className="text-sm text-muted-foreground">Операцій ще немає</p>
            <p className="text-xs text-muted-foreground/60 mt-1">
              Почніть роботу з передачею або списанням МЦ
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
