import React, { useEffect, useState } from 'react'
import { Layout } from '@components/Layout'
import { LoginScreen } from './screens/LoginScreen'
import { DashboardScreen } from './screens/DashboardScreen'
import { ItemsListScreen } from './screens/ItemsListScreen'
import { AddItemScreen } from './screens/AddItemScreen'
import { WriteOffScreen } from './screens/WriteOffScreen'
import { ReportsScreen } from './screens/ReportsScreen'
import { useAuthStore } from './store/authStore'
import { Loader2 } from 'lucide-react'

function renderPage(page: string, onNavigate: (p: string) => void) {
  switch (page) {
    case 'dashboard':
      return <DashboardScreen onNavigate={onNavigate} />
    case 'inventory':
      return <ItemsListScreen onNavigate={onNavigate} />
    case 'add-item':
      return <AddItemScreen onBack={() => onNavigate('inventory')} />
    case 'writeoff':
      return <WriteOffScreen onBack={() => onNavigate('dashboard')} />
    case 'reports':
      return <ReportsScreen />
    default:
      return (
        <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
          Розділ у розробці
        </div>
      )
  }
}

function App(): React.JSX.Element {
  const { isAuthenticated, isLoading, restoreSession } = useAuthStore()
  const [page, setPage] = useState('dashboard')

  useEffect(() => {
    restoreSession()
  }, [restoreSession])

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Завантаження…</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <LoginScreen />
  }

  return (
    <Layout activePage={page} onNavigate={setPage}>
      {renderPage(page, setPage)}
    </Layout>
  )
}

export default App
