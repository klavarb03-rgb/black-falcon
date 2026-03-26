import React, { useEffect, useState } from 'react'
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
  AlertTriangle,
} from 'lucide-react'
import {
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import { reportService } from '@renderer/services/reportService'
import { itemService } from '@renderer/services/itemService'

// ── Constants ─────────────────────────────────────────────────────────────────

const roleLabels: Record<string, string> = {
  superadmin: 'Суперадміністратор',
  admin: 'Адміністратор',
  manager: 'Менеджер',
}

const PIE_COLORS = ['#3b82f6', '#22c55e']

/** Return ISO date string for today minus N days */
function daysAgo(n: number): string {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d.toISOString().slice(0, 10)
}

/** Generate array of last N date strings (oldest first) */
function lastNDates(n: number): string[] {
  return Array.from({ length: n }, (_, i) => daysAgo(n - 1 - i))
}

/** Format ISO date as DD.MM */
function fmtDate(iso: string): string {
  const [, m, d] = iso.split('-')
  return `${d}.${m}`
}

// ── Types ─────────────────────────────────────────────────────────────────────

interface ChartData {
  statusPie: { name: string; value: number }[]
  activityLine: { date: string; операції: number }[]
  groupBar: { group: string; кількість: number }[]
  totalItems: number
  totalOperations: number
  todayOperations: number
}

// ── Component ─────────────────────────────────────────────────────────────────

interface DashboardScreenProps {
  onNavigate?: (page: string) => void
}

export function DashboardScreen({ onNavigate }: DashboardScreenProps) {
  const { user, token } = useAuthStore()
  const [chartData, setChartData] = useState<ChartData | null>(null)
  const [loading, setLoading] = useState(true)
  const [offBalanceCount, setOffBalanceCount] = useState<number | null>(null)

  useEffect(() => {
    if (!token) return

    const today = daysAgo(0)
    const sevenDaysAgo = daysAgo(6)
    const dates = lastNDates(7)

    // Fetch off-balance count in parallel
    itemService.getItems(token, 1, 1000).then((res) => {
      const count = res.data.filter(
        (item) => !item.balance_status || item.balance_status === 'off_balance'
      ).length
      setOffBalanceCount(count)
    }).catch(() => {
      // silently ignore
    })

    reportService.getSummaryReport(token, sevenDaysAgo, today)
      .then((summary) => {
        // Pie: items by status
        const statusPie = summary.itemsByStatus

        // Line: activity last 7 days — fill missing dates with 0
        const dayMap = new Map(summary.activityByDay.map((d) => [d.date, d.операції]))
        const activityLine = dates.map((date) => ({
          date: fmtDate(date),
          операції: dayMap.get(date) ?? 0,
        }))

        // Bar: items by group — use byCategory from summary report
        const groupBar = (summary.byCategory ?? [])
          .filter((g) => g.itemCount > 0)
          .map((g) => ({
            group: g.groupName === '(ungrouped)' ? 'Без групи' : g.groupName,
            кількість: g.itemCount,
          }))
          .sort((a, b) => b.кількість - a.кількість)
          .slice(0, 10)

        // Today's operations
        const todayOperations = dayMap.get(today) ?? 0

        setChartData({
          statusPie,
          activityLine,
          groupBar,
          totalItems: summary.totalItems,
          totalOperations: summary.totalOperations,
          todayOperations,
        })
      })
      .catch(() => {
        // Silently fail — charts will stay empty
      })
      .finally(() => setLoading(false))
  }, [token])

  const stats = [
    {
      label: 'Всього МЦ',
      value: loading ? '…' : (chartData?.totalItems ?? '—'),
      description: 'Позицій в інвентарі',
      icon: Package,
      highlight: false,
    },
    {
      label: 'Позабаланс',
      value: loading || offBalanceCount === null ? '…' : offBalanceCount,
      description: 'МЦ без документів',
      icon: AlertTriangle,
      highlight: true,
    },
    {
      label: 'Операцій сьогодні',
      value: loading ? '…' : (chartData?.todayOperations ?? '—'),
      description: 'Передачі та списання',
      icon: TrendingUp,
      highlight: false,
    },
    {
      label: 'Останні 7 днів',
      value: loading ? '…' : (chartData?.totalOperations ?? '—'),
      description: 'Загальна активність',
      icon: Clock,
      highlight: false,
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
            <Card
              key={stat.label}
              className={stat.highlight && typeof stat.value === 'number' && stat.value > 0
                ? 'border-amber-400/60 bg-amber-50/50 dark:bg-amber-950/20 dark:border-amber-700/50'
                : undefined}
            >
              <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
                <CardDescription
                  className={stat.highlight && typeof stat.value === 'number' && stat.value > 0
                    ? 'text-amber-700 dark:text-amber-400'
                    : undefined}
                >
                  {stat.label}
                </CardDescription>
                <Icon
                  className={`h-4 w-4 ${
                    stat.highlight && typeof stat.value === 'number' && stat.value > 0
                      ? 'text-amber-500'
                      : 'text-muted-foreground'
                  }`}
                />
              </CardHeader>
              <CardContent>
                <div
                  className={`text-2xl font-bold ${
                    stat.highlight && typeof stat.value === 'number' && stat.value > 0
                      ? 'text-amber-700 dark:text-amber-400'
                      : ''
                  }`}
                >
                  {String(stat.value)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">{stat.description}</p>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Charts row */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Pie — items by status */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">МЦ за статусом</CardTitle>
            <CardDescription>Державні vs волонтерські</CardDescription>
          </CardHeader>
          <CardContent>
            {!loading && chartData && chartData.statusPie.some((d) => d.value > 0) ? (
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={chartData.statusPie}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                    label={({ name, percent }) =>
                      `${name} ${(percent * 100).toFixed(0)}%`
                    }
                    labelLine={false}
                  >
                    {chartData.statusPie.map((_, idx) => (
                      <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v: number) => [`${v} поз.`, '']} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <EmptyChart loading={loading} />
            )}
          </CardContent>
        </Card>

        {/* Line — operations last 7 days */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Активність за 7 днів</CardTitle>
            <CardDescription>Кількість операцій по днях</CardDescription>
          </CardHeader>
          <CardContent>
            {!loading && chartData ? (
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={chartData.activityLine} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Line
                    type="monotone"
                    dataKey="операції"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    dot={{ r: 3 }}
                    activeDot={{ r: 5 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <EmptyChart loading={loading} />
            )}
          </CardContent>
        </Card>

        {/* Bar — items by group */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">МЦ за групами</CardTitle>
            <CardDescription>Топ-10 груп за кількістю позицій</CardDescription>
          </CardHeader>
          <CardContent>
            {!loading && chartData && chartData.groupBar.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart
                  data={chartData.groupBar}
                  layout="vertical"
                  margin={{ top: 4, right: 8, left: 4, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" horizontal={false} />
                  <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
                  <YAxis
                    type="category"
                    dataKey="group"
                    width={80}
                    tick={{ fontSize: 10 }}
                    tickFormatter={(v: string) => (v.length > 10 ? v.slice(0, 9) + '…' : v)}
                  />
                  <Tooltip />
                  <Bar dataKey="кількість" fill="#22c55e" radius={[0, 3, 3, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <EmptyChart loading={loading} />
            )}
          </CardContent>
        </Card>
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
    </div>
  )
}

// ── Helper ────────────────────────────────────────────────────────────────────

function EmptyChart({ loading }: { loading: boolean }) {
  return (
    <div className="flex items-center justify-center h-[200px] text-muted-foreground/50">
      <p className="text-sm">{loading ? 'Завантаження…' : 'Немає даних'}</p>
    </div>
  )
}
