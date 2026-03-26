import React, { useState, useCallback } from 'react'
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import { FileDown, RefreshCw, BarChart3, ListOrdered, LayoutGrid, Loader2, AlertCircle, Download, FileText } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@renderer/store/authStore'
import {
  reportService,
  type ReportType,
  type InventoryReport,
  type OperationsReport,
  type SummaryReport,
} from '@renderer/services/reportService'

// ── Helpers ────────────────────────────────────────────────────────────────────

function today(): string {
  return new Date().toISOString().slice(0, 10)
}

function thirtyDaysAgo(): string {
  const d = new Date()
  d.setDate(d.getDate() - 30)
  return d.toISOString().slice(0, 10)
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('uk-UA')
}

const STATUS_UA: Record<string, string> = {
  government: 'Держ.',
  volunteer: 'Волонт.',
}

const TYPE_UA: Record<string, string> = {
  writeoff: 'Списання',
  transfer: 'Передача',
  receipt: 'Надходження',
  issue: 'Видача',
}

const PIE_COLORS = ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444']

// ── Sub-components ─────────────────────────────────────────────────────────────

interface TabButtonProps {
  active: boolean
  onClick: () => void
  icon: React.ReactNode
  label: string
}

function TabButton({ active, onClick, icon, label }: TabButtonProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors',
        active
          ? 'bg-primary text-primary-foreground'
          : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
      )}
    >
      {icon}
      {label}
    </button>
  )
}

interface DateRangePickerProps {
  from: string
  to: string
  onFromChange: (v: string) => void
  onToChange: (v: string) => void
}

function DateRangePicker({ from, to, onFromChange, onToChange }: DateRangePickerProps) {
  return (
    <div className="flex items-center gap-3">
      <label className="text-sm text-muted-foreground">Від</label>
      <input
        type="date"
        value={from}
        max={to}
        onChange={(e) => onFromChange(e.target.value)}
        className="h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
      />
      <label className="text-sm text-muted-foreground">До</label>
      <input
        type="date"
        value={to}
        min={from}
        max={today()}
        onChange={(e) => onToChange(e.target.value)}
        className="h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
      />
    </div>
  )
}

// ── Export functions ───────────────────────────────────────────────────────────

async function downloadExcel(token: string | null) {
  if (!token) {
    alert('Помилка: не авторизований')
    return
  }
  
  try {
    const response = await fetch('http://localhost:3000/api/reports/export/excel', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }
    
    const blob = await response.blob()
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `mc-report-${new Date().toISOString().split('T')[0]}.xlsx`
    document.body.appendChild(link)
    link.click()
    link.remove()
    window.URL.revokeObjectURL(url)
  } catch (error) {
    console.error('Export Excel failed:', error)
    alert(`Помилка експорту Excel: ${error instanceof Error ? error.message : 'Невідома помилка'}`)
  }
}

async function downloadPDF(token: string | null) {
  if (!token) {
    alert('Помилка: не авторизований')
    return
  }
  
  try {
    const response = await fetch('http://localhost:3000/api/reports/export/pdf', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }
    
    const blob = await response.blob()
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `mc-report-${new Date().toISOString().split('T')[0]}.pdf`
    document.body.appendChild(link)
    link.click()
    link.remove()
    window.URL.revokeObjectURL(url)
  } catch (error) {
    console.error('Export PDF failed:', error)
    alert(`Помилка експорту PDF: ${error instanceof Error ? error.message : 'Невідома помилка'}`)
  }
}

interface ExportButtonsProps {
  token: string | null
}

function ExportButtons({ token }: ExportButtonsProps) {
  return (
    <div className="flex gap-2">
      <Button variant="outline" size="sm" onClick={() => downloadExcel(token)}>
        <Download className="w-4 h-4 mr-1.5" />
        Excel
      </Button>
      <Button variant="outline" size="sm" onClick={() => downloadPDF(token)}>
        <FileText className="w-4 h-4 mr-1.5" />
        PDF
      </Button>
    </div>
  )
}

// ── Inventory report ───────────────────────────────────────────────────────────

function InventoryReportView({ data }: { data: InventoryReport }) {
  return (
    <div className="space-y-6">
      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-1 pt-4 px-4">
            <CardTitle className="text-xs font-medium text-muted-foreground">Усього позицій</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <p className="text-2xl font-bold">{data.total}</p>
          </CardContent>
        </Card>
        {data.byStatus.map((s) => (
          <Card key={s.status}>
            <CardHeader className="pb-1 pt-4 px-4">
              <CardTitle className="text-xs font-medium text-muted-foreground">
                {STATUS_UA[s.status] ?? s.status}
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <p className="text-2xl font-bold">{s.count}</p>
              <p className="text-xs text-muted-foreground">кількість: {s.quantity}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Bar chart */}
      {data.byStatus.length > 0 && (
        <Card>
          <CardHeader className="px-6 py-4">
            <CardTitle className="text-sm">Розподіл за статусом</CardTitle>
          </CardHeader>
          <CardContent className="px-6 pb-6">
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={data.byStatus} margin={{ top: 4, right: 16, left: 0, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis
                  dataKey="status"
                  tickFormatter={(v) => STATUS_UA[v] ?? v}
                  tick={{ fontSize: 12 }}
                  className="fill-muted-foreground"
                />
                <YAxis tick={{ fontSize: 12 }} className="fill-muted-foreground" />
                <Tooltip
                  formatter={(value, name) => [value, name === 'count' ? 'Позицій' : 'Кількість']}
                  labelFormatter={(label) => STATUS_UA[label as string] ?? label}
                />
                <Legend formatter={(v) => (v === 'count' ? 'Позицій' : 'Кількість')} />
                <Bar dataKey="count" name="count" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="quantity" name="quantity" fill="#22c55e" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Table */}
      <Card>
        <CardHeader className="px-6 py-4">
          <CardTitle className="text-sm">Перелік ({data.items.length})</CardTitle>
        </CardHeader>
        <CardContent className="px-0 pb-0">
          <div className="overflow-auto max-h-96">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Назва</TableHead>
                  <TableHead>Статус</TableHead>
                  <TableHead className="text-right">Кількість</TableHead>
                  <TableHead>Одиниця</TableHead>
                  <TableHead>Оновлено</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.items.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                      Немає даних
                    </TableCell>
                  </TableRow>
                ) : (
                  data.items.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.name}</TableCell>
                      <TableCell>
                        <span
                          className={cn(
                            'inline-flex px-2 py-0.5 rounded text-xs font-medium',
                            item.status === 'government'
                              ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'
                              : 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300'
                          )}
                        >
                          {STATUS_UA[item.status] ?? item.status}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">{item.quantity}</TableCell>
                      <TableCell>{item.unit ?? '—'}</TableCell>
                      <TableCell className="text-muted-foreground">{formatDate(item.updatedAt)}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// ── Operations report ──────────────────────────────────────────────────────────

function OperationsReportView({ data }: { data: OperationsReport }) {
  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-1 pt-4 px-4">
            <CardTitle className="text-xs font-medium text-muted-foreground">Усього операцій</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <p className="text-2xl font-bold">{data.total}</p>
          </CardContent>
        </Card>
        {data.byType.map((t) => (
          <Card key={t.type}>
            <CardHeader className="pb-1 pt-4 px-4">
              <CardTitle className="text-xs font-medium text-muted-foreground">
                {TYPE_UA[t.type] ?? t.type}
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <p className="text-2xl font-bold">{t.count}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Line chart — activity by day */}
      {data.byDay.length > 0 && (
        <Card>
          <CardHeader className="px-6 py-4">
            <CardTitle className="text-sm">Активність по днях</CardTitle>
          </CardHeader>
          <CardContent className="px-6 pb-6">
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={data.byDay} margin={{ top: 4, right: 16, left: 0, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                <Tooltip labelFormatter={(v) => `Дата: ${v}`} formatter={(v) => [v, 'Операцій']} />
                <Line
                  type="monotone"
                  dataKey="count"
                  name="Операцій"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Table */}
      <Card>
        <CardHeader className="px-6 py-4">
          <CardTitle className="text-sm">Журнал операцій ({data.operations.length})</CardTitle>
        </CardHeader>
        <CardContent className="px-0 pb-0">
          <div className="overflow-auto max-h-96">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Дата</TableHead>
                  <TableHead>Тип</TableHead>
                  <TableHead>МЦ</TableHead>
                  <TableHead className="text-right">Кількість</TableHead>
                  <TableHead>Причина</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.operations.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                      Немає операцій за вибраний період
                    </TableCell>
                  </TableRow>
                ) : (
                  data.operations.map((op) => (
                    <TableRow key={op.id}>
                      <TableCell className="text-muted-foreground">{formatDate(op.createdAt)}</TableCell>
                      <TableCell>
                        <span className="inline-flex px-2 py-0.5 rounded text-xs font-medium bg-primary/10 text-primary">
                          {TYPE_UA[op.type] ?? op.type}
                        </span>
                      </TableCell>
                      <TableCell>{op.itemName ?? op.itemId}</TableCell>
                      <TableCell className="text-right">{op.quantity}</TableCell>
                      <TableCell className="text-muted-foreground">{op.reason ?? '—'}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// ── Summary report ─────────────────────────────────────────────────────────────

function SummaryReportView({ data }: { data: SummaryReport }) {
  return (
    <div className="space-y-6">
      {/* KPI cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {[
          { label: 'Позицій МЦ', value: data.totalItems },
          { label: 'Загальна кількість', value: data.totalQuantity },
          { label: 'Держ. позицій', value: data.governmentItems },
          { label: 'Волонт. позицій', value: data.volunteerItems },
          { label: 'Операцій', value: data.totalOperations },
        ].map((kpi) => (
          <Card key={kpi.label}>
            <CardHeader className="pb-1 pt-4 px-4">
              <CardTitle className="text-xs font-medium text-muted-foreground">{kpi.label}</CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <p className="text-2xl font-bold">{kpi.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pie chart — items by status */}
        <Card>
          <CardHeader className="px-6 py-4">
            <CardTitle className="text-sm">МЦ за статусом</CardTitle>
          </CardHeader>
          <CardContent className="px-6 pb-6">
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={data.itemsByStatus}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
                >
                  {data.itemsByStatus.map((_, idx) => (
                    <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v) => [v, 'Позицій']} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Bar chart — operations by type */}
        <Card>
          <CardHeader className="px-6 py-4">
            <CardTitle className="text-sm">Операції за типом</CardTitle>
          </CardHeader>
          <CardContent className="px-6 pb-6">
            {data.operationsByType.length === 0 ? (
              <div className="flex items-center justify-center h-[220px] text-sm text-muted-foreground">
                Немає операцій за вибраний період
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart
                  data={data.operationsByType}
                  margin={{ top: 4, right: 16, left: 0, bottom: 4 }}
                >
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis
                    dataKey="type"
                    tickFormatter={(v) => TYPE_UA[v] ?? v}
                    tick={{ fontSize: 12 }}
                  />
                  <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                  <Tooltip
                    labelFormatter={(v) => TYPE_UA[v as string] ?? v}
                    formatter={(v) => [v, 'Операцій']}
                  />
                  <Bar dataKey="count" name="Операцій" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Activity line chart */}
      {data.activityByDay.length > 0 && (
        <Card>
          <CardHeader className="px-6 py-4">
            <CardTitle className="text-sm">Активність по днях</CardTitle>
          </CardHeader>
          <CardContent className="px-6 pb-6">
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={data.activityByDay} margin={{ top: 4, right: 16, left: 0, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                <Tooltip labelFormatter={(v) => `Дата: ${v}`} />
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
          </CardContent>
        </Card>
      )}
    </div>
  )
}

// ── Main screen ────────────────────────────────────────────────────────────────

export function ReportsScreen() {
  const { token } = useAuthStore()

  const [reportType, setReportType] = useState<ReportType>('summary')
  const [dateFrom, setDateFrom] = useState(thirtyDaysAgo())
  const [dateTo, setDateTo] = useState(today())

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [inventoryData, setInventoryData] = useState<InventoryReport | null>(null)
  const [operationsData, setOperationsData] = useState<OperationsReport | null>(null)
  const [summaryData, setSummaryData] = useState<SummaryReport | null>(null)

  const fetchReport = useCallback(async () => {
    if (!token) return
    setLoading(true)
    setError(null)
    try {
      if (reportType === 'inventory') {
        const data = await reportService.getInventoryReport(token)
        setInventoryData(data)
      } else if (reportType === 'operations') {
        const data = await reportService.getOperationsReport(token, dateFrom, dateTo)
        setOperationsData(data)
      } else {
        const data = await reportService.getSummaryReport(token, dateFrom, dateTo)
        setSummaryData(data)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Помилка завантаження даних')
    } finally {
      setLoading(false)
    }
  }, [token, reportType, dateFrom, dateTo])

  const showDateRange = reportType === 'operations' || reportType === 'summary'

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Report type tabs */}
        <div className="flex gap-1 p-1 bg-muted rounded-lg">
          <TabButton
            active={reportType === 'summary'}
            onClick={() => setReportType('summary')}
            icon={<LayoutGrid className="w-4 h-4" />}
            label="Зведений"
          />
          <TabButton
            active={reportType === 'inventory'}
            onClick={() => setReportType('inventory')}
            icon={<BarChart3 className="w-4 h-4" />}
            label="Інвентар"
          />
          <TabButton
            active={reportType === 'operations'}
            onClick={() => setReportType('operations')}
            icon={<ListOrdered className="w-4 h-4" />}
            label="Операції"
          />
        </div>

        {/* Date range */}
        {showDateRange && (
          <DateRangePicker
            from={dateFrom}
            to={dateTo}
            onFromChange={setDateFrom}
            onToChange={setDateTo}
          />
        )}

        {/* Spacer */}
        <div className="flex-1" />

        {/* Actions */}
        <ExportButtons token={token} />
        <Button onClick={fetchReport} disabled={loading} size="sm">
          {loading ? (
            <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
          ) : (
            <RefreshCw className="w-4 h-4 mr-1.5" />
          )}
          Сформувати
        </Button>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Content */}
      {!loading && !error && reportType === 'inventory' && inventoryData && (
        <InventoryReportView data={inventoryData} />
      )}
      {!loading && !error && reportType === 'operations' && operationsData && (
        <OperationsReportView data={operationsData} />
      )}
      {!loading && !error && reportType === 'summary' && summaryData && (
        <SummaryReportView data={summaryData} />
      )}

      {/* Empty state */}
      {!loading && !error && (
        (reportType === 'inventory' && !inventoryData) ||
        (reportType === 'operations' && !operationsData) ||
        (reportType === 'summary' && !summaryData)
      ) && (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-3">
          <BarChart3 className="w-10 h-10 opacity-30" />
          <p className="text-sm">Натисніть «Сформувати» для отримання звіту</p>
        </div>
      )}
    </div>
  )
}
