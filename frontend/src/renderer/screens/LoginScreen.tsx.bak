import React from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Eye, EyeOff, Loader2, LogIn } from 'lucide-react'

import { useAuthStore } from '@renderer/store/authStore'
import { Button } from '@components/ui/button'
import { Input } from '@components/ui/input'
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from '@components/ui/form'
import { cn } from '@lib/utils'

// ── Validation schema ────────────────────────────────────────────────────────

const loginSchema = z.object({
  email: z
    .string()
    .min(1, 'Електронна пошта обовʼязкова')
    .email('Введіть коректну електронну адресу'),
  password: z
    .string()
    .min(1, 'Пароль обовʼязковий')
    .min(6, 'Пароль має містити мінімум 6 символів')
})

type LoginFormValues = z.infer<typeof loginSchema>

// ── Component ────────────────────────────────────────────────────────────────

export function LoginScreen(): React.JSX.Element {
  const { login, isLoading, error, clearError } = useAuthStore()
  const [showPassword, setShowPassword] = React.useState(false)

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' }
  })

  const onSubmit = async (values: LoginFormValues): Promise<void> => {
    clearError()
    try {
      await login(values.email, values.password)
    } catch {
      // Error is stored in the auth store
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="w-full max-w-sm space-y-8 px-4">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Black Falcon</h1>
          <p className="mt-2 text-sm text-muted-foreground">МЦ Система обліку майна</p>
        </div>

        {/* Card */}
        <div className="rounded-lg border bg-card p-6 shadow-sm">
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-card-foreground">Вхід до системи</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Введіть свої облікові дані для доступу
            </p>
          </div>

          {/* Global API error banner */}
          {error && (
            <div
              role="alert"
              className={cn(
                'mb-4 rounded-md border border-destructive/30',
                'bg-destructive/10 px-4 py-3',
                'text-sm text-destructive'
              )}
            >
              {error}
            </div>
          )}

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="space-y-5">
              {/* Email */}
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Електронна пошта</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="email"
                        placeholder="ваша@пошта.ua"
                        autoComplete="email"
                        autoFocus
                        disabled={isLoading}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Password */}
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Пароль</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          {...field}
                          type={showPassword ? 'text' : 'password'}
                          placeholder="••••••••"
                          autoComplete="current-password"
                          disabled={isLoading}
                          className="pr-10"
                        />
                        <button
                          type="button"
                          tabIndex={-1}
                          onClick={() => setShowPassword((v) => !v)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground focus-visible:outline-none"
                          aria-label={showPassword ? 'Приховати пароль' : 'Показати пароль'}
                        >
                          {showPassword ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Submit */}
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Вхід…
                  </>
                ) : (
                  <>
                    <LogIn className="h-4 w-4" />
                    Увійти
                  </>
                )}
              </Button>
            </form>
          </Form>
        </div>

        <p className="text-center text-xs text-muted-foreground">
          Якщо виникли проблеми з входом — зверніться до адміністратора.
        </p>
      </div>
    </div>
  )
}
