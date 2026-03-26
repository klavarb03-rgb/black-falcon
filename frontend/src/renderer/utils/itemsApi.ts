/**
 * Typed wrapper for the Electron itemsAPI exposed via preload context bridge.
 */

export type ItemStatusType = 'government' | 'volunteer'
export type ItemUnitType = 'шт' | 'кг' | 'л' | 'компл'

export interface CreateItemInput {
  name: string
  status: ItemStatusType
  quantity: number
  unit: ItemUnitType
  description?: string
  metadata?: string
  ownerId: string
  token: string
  balance_status?: 'off_balance' | 'on_balance'
  document_number?: string
  document_date?: string
  supplier_name?: string
}

export interface CreatedItem {
  id: string
  name: string
  status: ItemStatusType
  quantity: number
  unit: string
  description: string | null
  metadata: string | null
  ownerId: string
  version: number
  createdAt: string
  updatedAt: string
}

export interface CreateItemResult {
  item: CreatedItem
  synced: boolean
}

declare global {
  interface Window {
    itemsAPI: {
      createItem: (input: CreateItemInput) => Promise<CreateItemResult>
    }
  }
}

export const itemsApi = {
  createItem(input: CreateItemInput): Promise<CreateItemResult> {
    return window.itemsAPI.createItem(input)
  }
}
