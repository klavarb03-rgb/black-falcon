import React, { useEffect, useState } from 'react'
import { Layout } from '@components/Layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@components/ui/card'
import { Button } from '@components/ui/button'
import { LoginScreen } from './screens/LoginScreen'
import { useAuthStore } from './store/authStore'
import { Loader2 } from 'lucide-react'

function App(): React.JSX.Element {
  const { isAuthenticated, isLoading, restoreSession } = useAuthStore()
  const [page, setPage] = useState('dashboard')

  // Attempt to restore session from encrypted token on startup
  useEffect(() => {
    restoreSession()
  }, [restoreSession])

  // Restoring session on startup
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

  // Not authenticated — show login screen
  if (!isAuthenticated) {
    return <LoginScreen />
  }

  // Authenticated — show main app
  return (
    <Layout activePage={page} onNavigate={setPage}>
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Всього позицій</CardDescription>
              <CardTitle className="text-3xl">—</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">Інвентар не ініціалізовано</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Операцій сьогодні</CardDescription>
              <CardTitle className="text-3xl">—</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">Немає даних</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Активних донорів</CardDescription>
              <CardTitle className="text-3xl">—</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">Немає даних</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Ласкаво просимо до Black Falcon</CardTitle>
            <CardDescription>
              Система обліку та інвентаризації. Ініціалізуйте базу даних для початку роботи.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button>Ініціалізувати базу даних</Button>
          </CardContent>
        </Card>
      </div>
    </Layout>
  )
}

export default App
