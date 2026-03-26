import { useState, useEffect, useCallback } from 'react'
import { itemService, type Item, type ItemStatus, type BalanceStatus } from '@renderer/services/itemService'
import { useAuthStore } from '@renderer/store/authStore'

const PAGE_SIZE = 50

export type BalanceFilter = 'all' | 'off_balance' | 'on_balance'

export interface UseItemsResult {
  allItems: Item[]
  filteredItems: Item[]
  paginatedItems: Item[]
  isLoading: boolean
  error: string | null
  search: string
  statusFilter: ItemStatus | ''
  balanceFilter: BalanceFilter
  page: number
  totalPages: number
  offBalanceCount: number
  setSearch: (value: string) => void
  setStatusFilter: (value: ItemStatus | '') => void
  setBalanceFilter: (value: BalanceFilter) => void
  setPage: (page: number) => void
  refresh: () => void
}

export function useItems(): UseItemsResult {
  const { token } = useAuthStore()
  const [allItems, setAllItems] = useState<Item[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearchState] = useState('')
  const [statusFilter, setStatusFilterState] = useState<ItemStatus | ''>('')
  const [balanceFilter, setBalanceFilterState] = useState<BalanceFilter>('all')
  const [page, setPageState] = useState(1)

  const fetchItems = useCallback(async () => {
    if (!token) return
    setIsLoading(true)
    setError(null)
    try {
      const response = await itemService.getItems(token)
      setAllItems(response.data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Помилка завантаження даних')
    } finally {
      setIsLoading(false)
    }
  }, [token])

  useEffect(() => {
    fetchItems()
  }, [fetchItems])

  const setSearch = (value: string) => {
    setSearchState(value)
    setPageState(1)
  }

  const setStatusFilter = (value: ItemStatus | '') => {
    setStatusFilterState(value)
    setPageState(1)
  }

  const setBalanceFilter = (value: BalanceFilter) => {
    setBalanceFilterState(value)
    setPageState(1)
  }

  // Count all off-balance items (regardless of other filters)
  const offBalanceCount = allItems.filter(
    (item) => !item.balance_status || item.balance_status === 'off_balance'
  ).length

  const filteredItems = allItems.filter((item) => {
    const matchesSearch = search === '' || item.name.toLowerCase().includes(search.toLowerCase())
    const matchesStatus = statusFilter === '' || item.status === statusFilter
    const itemBalanceStatus: BalanceStatus = item.balance_status ?? 'off_balance'
    const matchesBalance =
      balanceFilter === 'all' ||
      (balanceFilter === 'off_balance' && itemBalanceStatus === 'off_balance') ||
      (balanceFilter === 'on_balance' && itemBalanceStatus === 'on_balance')
    return matchesSearch && matchesStatus && matchesBalance
  })

  const totalPages = Math.max(1, Math.ceil(filteredItems.length / PAGE_SIZE))
  const safePage = Math.min(page, totalPages)
  const paginatedItems = filteredItems.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)

  return {
    allItems,
    filteredItems,
    paginatedItems,
    isLoading,
    error,
    search,
    statusFilter,
    balanceFilter,
    page: safePage,
    totalPages,
    offBalanceCount,
    setSearch,
    setStatusFilter,
    setBalanceFilter,
    setPage: setPageState,
    refresh: fetchItems
  }
}
