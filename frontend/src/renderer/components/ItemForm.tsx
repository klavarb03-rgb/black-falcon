import React from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2, Save } from 'lucide-react'

import { Button } from '@components/ui/button'
import { Input } from '@components/ui/input'
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from '@components/ui/form'
import { cn } from '@lib/utils'
import type { ItemStatusType, ItemUnitType } from '@renderer/utils/itemsApi'
import type { Donor } from '@renderer/services/donorService'

// ── Validation schema ─────────────────────────────────────────────────────────
// All fields use clean types (no z.preprocess) to stay compatible with
// @hookform/resolvers v5 which distinguishes input/output generic types.

const itemSchema = z.object({
  name: z
    .string()
    .min(1, 'Назва обовʼязкова')
    .max(255, 'Назва не може перевищувати 255 символів'),
  status: z.enum(['government', 'volunteer']),
  quantity: z
    .number({ error: 'Введіть кількість' })
    .int('Кількість має бути цілим числом')
    .min(0, 'Кількість не може бути відʼємною'),
  unit: z.enum(['шт', 'кг', 'л', 'компл']),
  donorId: z.string().optional(),
  serialNumber: z.string().max(100, 'Серійний номер занадто довгий').optional(),
  price: z
    .number({ error: 'Введіть коректну ціну' })
    .min(0, 'Ціна не може бути відʼємною')
    .optional(),
  notes: z.string().max(1000, 'Нотатки не можуть перевищувати 1000 символів').optional(),
  balance_status: z.enum(['off_balance', 'on_balance']).default('off_balance'),
  document_number: z.string().max(50).optional(),
  document_date: z.string().optional(),
  supplier_name: z.string().max(255).optional(),
})

export type ItemFormValues = z.infer<typeof itemSchema>

export interface ItemFormOutput {
  name: string
  status: ItemStatusType
  quantity: number
  unit: ItemUnitType
  donorId?: string
  serialNumber?: string
  price?: number
  notes?: string
  balance_status: 'off_balance' | 'on_balance'
  document_number?: string
  document_date?: string
  supplier_name?: string
}

// ── Select / textarea styles (mirror Input component) ────────────────────────

const selectClass = cn(
  'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2',
  'text-sm ring-offset-background',
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
  'disabled:cursor-not-allowed disabled:opacity-50'
)

const textareaClass = cn(
  'flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2',
  'text-sm ring-offset-background placeholder:text-muted-foreground resize-none',
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
  'disabled:cursor-not-allowed disabled:opacity-50'
)

// ── Props ─────────────────────────────────────────────────────────────────────

interface ItemFormProps {
  onSubmit: (values: ItemFormOutput) => Promise<void>
  isSubmitting?: boolean
  donors?: Donor[]
}

// ── Component ─────────────────────────────────────────────────────────────────

export function ItemForm({ onSubmit, isSubmitting = false, donors }: ItemFormProps): React.JSX.Element {
  const form = useForm<ItemFormValues>({
    resolver: zodResolver(itemSchema),
    defaultValues: {
      name: '',
      status: 'government',
      quantity: 1,
      unit: 'шт',
      donorId: undefined,
      serialNumber: '',
      price: undefined,
      notes: '',
      balance_status: 'off_balance',
      document_number: '',
      document_date: '',
      supplier_name: '',
    }
  })

  const watchedBalanceStatus = form.watch('balance_status')

  const handleSubmit = async (values: ItemFormValues): Promise<void> => {
    await onSubmit({
      name: values.name,
      status: values.status as ItemStatusType,
      quantity: values.quantity,
      unit: values.unit as ItemUnitType,
      donorId: values.donorId || undefined,
      serialNumber: values.serialNumber || undefined,
      price: values.price,
      notes: values.notes || undefined,
      balance_status: values.balance_status,
      document_number: values.balance_status === 'on_balance' ? (values.document_number || undefined) : undefined,
      document_date: values.balance_status === 'on_balance' ? (values.document_date || undefined) : undefined,
      supplier_name: values.balance_status === 'on_balance' ? (values.supplier_name || undefined) : undefined,
    })
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} noValidate className="space-y-5">
        {/* Назва */}
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                Назва <span className="text-destructive">*</span>
              </FormLabel>
              <FormControl>
                <Input
                  {...field}
                  placeholder="Наприклад: Рація Baofeng UV-5R"
                  autoFocus
                  disabled={isSubmitting}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Статус + Одиниця виміру */}
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="status"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  Статус <span className="text-destructive">*</span>
                </FormLabel>
                <FormControl>
                  <select {...field} className={selectClass} disabled={isSubmitting}>
                    <option value="government">Державне</option>
                    <option value="volunteer">Волонтерське</option>
                  </select>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="unit"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  Одиниця <span className="text-destructive">*</span>
                </FormLabel>
                <FormControl>
                  <select {...field} className={selectClass} disabled={isSubmitting}>
                    <option value="шт">шт</option>
                    <option value="кг">кг</option>
                    <option value="л">л</option>
                    <option value="компл">компл</option>
                  </select>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Донор */}
        {donors && donors.length > 0 && (
          <FormField
            control={form.control}
            name="donorId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Донор</FormLabel>
                <FormControl>
                  <select
                    {...field}
                    value={field.value ?? ''}
                    onChange={(e) => field.onChange(e.target.value || undefined)}
                    className={selectClass}
                    disabled={isSubmitting}
                  >
                    <option value="">— Не вказано —</option>
                    {donors.map((d) => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        {/* Кількість + Ціна */}
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="quantity"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  Кількість <span className="text-destructive">*</span>
                </FormLabel>
                <FormControl>
                  <Input
                    value={field.value}
                    onChange={(e) => field.onChange(parseInt(e.target.value, 10) || 0)}
                    onBlur={field.onBlur}
                    name={field.name}
                    ref={field.ref}
                    type="number"
                    min={0}
                    step={1}
                    placeholder="0"
                    disabled={isSubmitting}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="price"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Ціна (грн)</FormLabel>
                <FormControl>
                  <Input
                    value={field.value ?? ''}
                    onChange={(e) =>
                      field.onChange(e.target.value === '' ? undefined : parseFloat(e.target.value))
                    }
                    onBlur={field.onBlur}
                    name={field.name}
                    ref={field.ref}
                    type="number"
                    min={0}
                    step={0.01}
                    placeholder="0.00"
                    disabled={isSubmitting}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Серійний номер */}
        <FormField
          control={form.control}
          name="serialNumber"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Серійний номер</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  value={field.value ?? ''}
                  placeholder="Наприклад: SN-2024-001"
                  disabled={isSubmitting}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Нотатки */}
        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Нотатки</FormLabel>
              <FormControl>
                <textarea
                  {...field}
                  value={field.value ?? ''}
                  className={textareaClass}
                  rows={3}
                  placeholder="Додаткова інформація про позицію…"
                  disabled={isSubmitting}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Статус балансу */}
        <FormField
          control={form.control}
          name="balance_status"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Статус балансу</FormLabel>
              <FormControl>
                <select {...field} className={selectClass} disabled={isSubmitting}>
                  <option value="off_balance">⚠️ Позабаланс (без документів)</option>
                  <option value="on_balance">📄 На балансі (з документами)</option>
                </select>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Поля документів — показуються тільки коли обрано "На балансі" */}
        {watchedBalanceStatus === 'on_balance' && (
          <div className="rounded-md border border-border bg-muted/30 p-4 space-y-4">
            <p className="text-sm font-medium text-muted-foreground">Дані накладної</p>

            {/* Номер накладної */}
            <FormField
              control={form.control}
              name="document_number"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Номер накладної</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      value={field.value ?? ''}
                      placeholder="Наприклад: НК-2024-001"
                      maxLength={50}
                      disabled={isSubmitting}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Дата накладної + Постачальник */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="document_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Дата накладної</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        value={field.value ?? ''}
                        type="date"
                        disabled={isSubmitting}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="supplier_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Постачальник</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        value={field.value ?? ''}
                        placeholder="Наприклад: ТОВ «Постачальник»"
                        maxLength={255}
                        disabled={isSubmitting}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>
        )}

        {/* Submit */}
        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Збереження…
            </>
          ) : (
            <>
              <Save className="h-4 w-4" />
              Зберегти позицію
            </>
          )}
        </Button>
      </form>
    </Form>
  )
}
